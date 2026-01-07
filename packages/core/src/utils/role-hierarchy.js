"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hierarchyUtils = exports.RoleHierarchyResolver = void 0;
const circular_hierarchy_error_1 = require("../errors/circular-hierarchy.error");
const role_not_found_error_1 = require("../errors/role-not-found.error");
const options_types_1 = require("../types/options.types");
class RoleHierarchyResolver {
    adapter;
    cache;
    options;
    constructor(adapter, cache, options = {}) {
        this.adapter = adapter;
        this.cache = cache;
        this.options = { ...options_types_1.DEFAULT_HIERARCHY_OPTIONS, ...options };
    }
    async getInheritedPermissions(roleId) {
        if (this.cache && this.options.cacheHierarchy) {
            const cacheKey = `rbac:role-permissions:${roleId}`;
            const cached = await this.cache.get(cacheKey);
            if (cached !== null) {
                return cached;
            }
        }
        const result = await this.resolveHierarchy(roleId);
        if (this.cache && this.options.cacheHierarchy) {
            const cacheKey = `rbac:role-permissions:${roleId}`;
            await this.cache.set(cacheKey, result.permissions, { ttl: 1800 });
        }
        return result.permissions;
    }
    async getParentRoles(roleId, maxDepth) {
        const depth = maxDepth ?? this.options.maxDepth;
        if (this.cache && this.options.cacheHierarchy) {
            const cacheKey = `rbac:role-hierarchy:${roleId}`;
            const cached = await this.cache.get(cacheKey);
            if (cached !== null) {
                return cached;
            }
        }
        const role = await this.adapter.findRoleById(roleId);
        if (!role) {
            throw role_not_found_error_1.RoleNotFoundError.byId(roleId);
        }
        const parentRoles = [];
        const visited = new Set();
        visited.add(roleId);
        await this.collectParentRoles(role, parentRoles, visited, 0, depth);
        if (this.cache && this.options.cacheHierarchy) {
            const cacheKey = `rbac:role-hierarchy:${roleId}`;
            await this.cache.set(cacheKey, parentRoles, { ttl: 3600 });
        }
        return parentRoles;
    }
    async getChildRoles(roleId) {
        return this.adapter.findChildRoles(roleId);
    }
    async hasCircularDependency(roleId) {
        const role = await this.adapter.findRoleById(roleId);
        if (!role) {
            return false;
        }
        const visited = new Set();
        return this.detectCircle(role, visited);
    }
    async validateHierarchy(childRoleId, parentRoleId) {
        if (childRoleId === parentRoleId) {
            return false;
        }
        const parentRole = await this.adapter.findRoleById(parentRoleId);
        if (!parentRole) {
            return false;
        }
        const parentAncestors = await this.getAncestorIds(parentRoleId);
        return !parentAncestors.has(childRoleId);
    }
    async getRoleDepth(roleId) {
        const role = await this.adapter.findRoleById(roleId);
        if (!role) {
            throw role_not_found_error_1.RoleNotFoundError.byId(roleId);
        }
        if (!role.parentRoles || role.parentRoles.length === 0) {
            return 0;
        }
        let maxParentDepth = 0;
        for (const parentId of role.parentRoles) {
            const parentDepth = await this.getRoleDepth(parentId);
            maxParentDepth = Math.max(maxParentDepth, parentDepth);
        }
        return maxParentDepth + 1;
    }
    async getHierarchyTree(rootRoleId) {
        const role = await this.adapter.findRoleById(rootRoleId);
        if (!role) {
            throw role_not_found_error_1.RoleNotFoundError.byId(rootRoleId);
        }
        return this.buildTree(role, 0, new Set([rootRoleId]));
    }
    async resolveHierarchy(roleId) {
        const role = await this.adapter.findRoleById(roleId);
        if (!role) {
            throw role_not_found_error_1.RoleNotFoundError.byId(roleId);
        }
        const parentRoles = await this.getParentRoles(roleId);
        const ancestorChain = [roleId, ...parentRoles.map(r => r.id)];
        const permissionMap = new Map();
        for (const permission of role.permissions) {
            permissionMap.set(permission.id, permission);
        }
        for (const parent of parentRoles) {
            for (const permission of parent.permissions) {
                if (!permissionMap.has(permission.id)) {
                    permissionMap.set(permission.id, permission);
                }
            }
        }
        return {
            role,
            parentRoles,
            permissions: Array.from(permissionMap.values()),
            depth: parentRoles.length,
            ancestorChain,
            fromCache: false,
        };
    }
    async invalidateCache(roleId) {
        if (!this.cache) {
            return;
        }
        await this.cache.delete(`rbac:role-hierarchy:${roleId}`);
        await this.cache.delete(`rbac:role-permissions:${roleId}`);
        const children = await this.getChildRoles(roleId);
        for (const child of children) {
            await this.invalidateCache(child.id);
        }
    }
    async getAncestorIds(roleId) {
        const ancestors = new Set();
        const queue = [roleId];
        const visited = new Set();
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId)) {
                continue;
            }
            visited.add(currentId);
            const role = await this.adapter.findRoleById(currentId);
            if (!role || !role.parentRoles) {
                continue;
            }
            for (const parentId of role.parentRoles) {
                ancestors.add(parentId);
                queue.push(parentId);
            }
        }
        return ancestors;
    }
    async collectParentRoles(role, collected, visited, depth, maxDepth) {
        if (depth >= maxDepth) {
            if (this.options.detectCircularDependencies) {
                throw circular_hierarchy_error_1.CircularHierarchyError.maxDepthExceeded(role.id, Array.from(visited), maxDepth);
            }
            return;
        }
        if (!role.parentRoles || role.parentRoles.length === 0) {
            return;
        }
        for (const parentId of role.parentRoles) {
            if (visited.has(parentId)) {
                if (this.options.detectCircularDependencies) {
                    throw new circular_hierarchy_error_1.CircularHierarchyError(role.id, parentId, [...Array.from(visited), parentId]);
                }
                continue;
            }
            const parent = await this.adapter.findRoleById(parentId);
            if (!parent) {
                continue;
            }
            visited.add(parentId);
            collected.push(parent);
            await this.collectParentRoles(parent, collected, visited, depth + 1, maxDepth);
        }
    }
    async detectCircle(role, visited) {
        if (visited.has(role.id)) {
            return true;
        }
        if (!role.parentRoles || role.parentRoles.length === 0) {
            return false;
        }
        visited.add(role.id);
        for (const parentId of role.parentRoles) {
            const parent = await this.adapter.findRoleById(parentId);
            if (!parent) {
                continue;
            }
            if (await this.detectCircle(parent, new Set(visited))) {
                return true;
            }
        }
        return false;
    }
    async buildTree(role, depth, visitedInPath) {
        const children = [];
        const childRoles = await this.getChildRoles(role.id);
        for (const child of childRoles) {
            if (visitedInPath.has(child.id)) {
                continue;
            }
            const newVisited = new Set(visitedInPath);
            newVisited.add(child.id);
            children.push(await this.buildTree(child, depth + 1, newVisited));
        }
        return {
            role,
            children,
            depth,
        };
    }
}
exports.RoleHierarchyResolver = RoleHierarchyResolver;
exports.hierarchyUtils = {
    flattenTree(tree) {
        const roles = [tree.role];
        for (const child of tree.children) {
            roles.push(...this.flattenTree(child));
        }
        return roles;
    },
    getMaxDepth(tree) {
        if (tree.children.length === 0) {
            return tree.depth;
        }
        return Math.max(...tree.children.map(child => this.getMaxDepth(child)));
    },
    findInTree(tree, roleId) {
        if (tree.role.id === roleId) {
            return tree;
        }
        for (const child of tree.children) {
            const found = this.findInTree(child, roleId);
            if (found) {
                return found;
            }
        }
        return undefined;
    },
    getPathToRole(tree, roleId) {
        if (tree.role.id === roleId) {
            return [tree.role];
        }
        for (const child of tree.children) {
            const path = this.getPathToRole(child, roleId);
            if (path.length > 0) {
                return [tree.role, ...path];
            }
        }
        return [];
    },
};
//# sourceMappingURL=role-hierarchy.js.map