"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hierarchyUtils = exports.RoleHierarchyResolver = void 0;
const circular_hierarchy_error_1 = require("../errors/circular-hierarchy.error");
const role_not_found_error_1 = require("../errors/role-not-found.error");
const options_types_1 = require("../types/options.types");
/**
 * Role hierarchy resolver that handles parent-child relationships.
 *
 * This class provides:
 * - Recursive parent role resolution
 * - Circular dependency detection
 * - Permission inheritance aggregation
 * - Hierarchy tree generation
 * - Caching integration
 *
 * @example
 * ```typescript
 * const hierarchy = new RoleHierarchyResolver(adapter, cache);
 *
 * // Get all inherited permissions for a role
 * const permissions = await hierarchy.getInheritedPermissions('editor-role-id');
 *
 * // Get all parent roles
 * const parents = await hierarchy.getParentRoles('editor-role-id');
 *
 * // Check for circular dependency before adding parent
 * const isValid = await hierarchy.validateHierarchy('child-role', 'parent-role');
 * ```
 */
class RoleHierarchyResolver {
    adapter;
    cache;
    options;
    /**
     * Creates a new RoleHierarchyResolver.
     *
     * @param adapter - Database adapter
     * @param cache - Optional cache implementation
     * @param options - Hierarchy options
     */
    constructor(adapter, cache, options = {}) {
        this.adapter = adapter;
        this.cache = cache;
        this.options = { ...options_types_1.DEFAULT_HIERARCHY_OPTIONS, ...options };
    }
    /**
     * Get all permissions for a role, including inherited permissions from parent roles.
     *
     * @param roleId - The role ID
     * @returns Array of all permissions (direct + inherited)
     *
     * @example
     * ```typescript
     * // Get all permissions including inherited ones
     * const permissions = await hierarchy.getInheritedPermissions('editor');
     * console.log(`Editor has ${permissions.length} total permissions`);
     * ```
     */
    async getInheritedPermissions(roleId) {
        // Check cache first
        if (this.cache && this.options.cacheHierarchy) {
            const cacheKey = `rbac:role-permissions:${roleId}`;
            const cached = await this.cache.get(cacheKey);
            if (cached !== null) {
                return cached;
            }
        }
        const result = await this.resolveHierarchy(roleId);
        // Cache the result
        if (this.cache && this.options.cacheHierarchy) {
            const cacheKey = `rbac:role-permissions:${roleId}`;
            await this.cache.set(cacheKey, result.permissions, { ttl: 1800 }); // 30 minutes
        }
        return result.permissions;
    }
    /**
     * Get all parent roles for a given role, recursively.
     *
     * @param roleId - The role ID
     * @param maxDepth - Maximum depth to traverse
     * @returns Array of parent roles in hierarchy order (closest first)
     *
     * @example
     * ```typescript
     * const parents = await hierarchy.getParentRoles('junior-editor', 5);
     * for (const parent of parents) {
     *   console.log(`Parent: ${parent.name}`);
     * }
     * ```
     */
    async getParentRoles(roleId, maxDepth) {
        const depth = maxDepth ?? this.options.maxDepth;
        // Check cache first
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
        // Cache the result
        if (this.cache && this.options.cacheHierarchy) {
            const cacheKey = `rbac:role-hierarchy:${roleId}`;
            await this.cache.set(cacheKey, parentRoles, { ttl: 3600 }); // 1 hour
        }
        return parentRoles;
    }
    /**
     * Get all child roles for a given role.
     *
     * @param roleId - The role ID
     * @returns Array of child roles
     */
    async getChildRoles(roleId) {
        return this.adapter.findChildRoles(roleId);
    }
    /**
     * Check if a role hierarchy contains circular dependencies.
     *
     * @param roleId - The role ID to check
     * @returns True if circular dependency exists
     */
    async hasCircularDependency(roleId) {
        const role = await this.adapter.findRoleById(roleId);
        if (!role) {
            return false;
        }
        const visited = new Set();
        return this.detectCircle(role, visited);
    }
    /**
     * Validate that a new parent relationship won't create a circular dependency.
     *
     * @param childRoleId - The child role ID
     * @param parentRoleId - The proposed parent role ID
     * @returns True if the relationship is valid
     *
     * @example
     * ```typescript
     * const canAdd = await hierarchy.validateHierarchy('editor', 'admin');
     * if (!canAdd) {
     *   throw new Error('Adding this parent would create a circular dependency');
     * }
     * ```
     */
    async validateHierarchy(childRoleId, parentRoleId) {
        // Self-reference check
        if (childRoleId === parentRoleId) {
            return false;
        }
        // Check if parent role exists
        const parentRole = await this.adapter.findRoleById(parentRoleId);
        if (!parentRole) {
            return false;
        }
        // Get all ancestors of the proposed parent
        const parentAncestors = await this.getAncestorIds(parentRoleId);
        // If the child is an ancestor of the parent, adding this relationship
        // would create a circle
        return !parentAncestors.has(childRoleId);
    }
    /**
     * Get the depth of a role in the hierarchy.
     *
     * @param roleId - The role ID
     * @returns Depth level (0 for root roles)
     */
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
    /**
     * Get all roles in a hierarchy tree starting from a root role.
     *
     * @param rootRoleId - The root role ID
     * @returns Tree structure of roles
     */
    async getHierarchyTree(rootRoleId) {
        const role = await this.adapter.findRoleById(rootRoleId);
        if (!role) {
            throw role_not_found_error_1.RoleNotFoundError.byId(rootRoleId);
        }
        return this.buildTree(role, 0, new Set([rootRoleId]));
    }
    /**
     * Resolve the complete hierarchy for a role.
     *
     * @param roleId - The role ID
     * @returns Complete hierarchy resolution result
     */
    async resolveHierarchy(roleId) {
        const role = await this.adapter.findRoleById(roleId);
        if (!role) {
            throw role_not_found_error_1.RoleNotFoundError.byId(roleId);
        }
        const parentRoles = await this.getParentRoles(roleId);
        const ancestorChain = [roleId, ...parentRoles.map(r => r.id)];
        // Collect all unique permissions
        const permissionMap = new Map();
        // Add role's direct permissions
        for (const permission of role.permissions) {
            permissionMap.set(permission.id, permission);
        }
        // Add inherited permissions from parents
        for (const parent of parentRoles) {
            for (const permission of parent.permissions) {
                // Don't overwrite - child permissions take precedence
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
    /**
     * Invalidate cached hierarchy data for a role.
     *
     * @param roleId - The role ID
     */
    async invalidateCache(roleId) {
        if (!this.cache) {
            return;
        }
        // Invalidate role's hierarchy cache
        await this.cache.delete(`rbac:role-hierarchy:${roleId}`);
        await this.cache.delete(`rbac:role-permissions:${roleId}`);
        // Also invalidate child roles' caches since they inherit from this role
        const children = await this.getChildRoles(roleId);
        for (const child of children) {
            await this.invalidateCache(child.id);
        }
    }
    /**
     * Get all ancestor IDs (parent, grandparent, etc.) for a role.
     *
     * @param roleId - The role ID
     * @returns Set of ancestor role IDs
     */
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
    /**
     * Recursively collect parent roles.
     */
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
            // Recursively get grandparents
            await this.collectParentRoles(parent, collected, visited, depth + 1, maxDepth);
        }
    }
    /**
     * Detect circular dependency using DFS.
     */
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
    /**
     * Build a hierarchy tree recursively.
     */
    async buildTree(role, depth, visitedInPath) {
        const children = [];
        const childRoles = await this.getChildRoles(role.id);
        for (const child of childRoles) {
            // Skip if we've already seen this role in the current path
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
/**
 * Utility functions for role hierarchy operations.
 */
exports.hierarchyUtils = {
    /**
     * Flatten a hierarchy tree into an array of roles.
     *
     * @param tree - Hierarchy tree
     * @returns Flat array of roles
     */
    flattenTree(tree) {
        const roles = [tree.role];
        for (const child of tree.children) {
            roles.push(...this.flattenTree(child));
        }
        return roles;
    },
    /**
     * Get the maximum depth of a hierarchy tree.
     *
     * @param tree - Hierarchy tree
     * @returns Maximum depth
     */
    getMaxDepth(tree) {
        if (tree.children.length === 0) {
            return tree.depth;
        }
        return Math.max(...tree.children.map(child => this.getMaxDepth(child)));
    },
    /**
     * Find a role in a hierarchy tree.
     *
     * @param tree - Hierarchy tree
     * @param roleId - Role ID to find
     * @returns The tree node or undefined
     */
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
    /**
     * Get path from root to a specific role in the tree.
     *
     * @param tree - Hierarchy tree
     * @param roleId - Target role ID
     * @returns Array of roles from root to target
     */
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