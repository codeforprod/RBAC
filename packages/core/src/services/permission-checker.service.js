"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionChecker = void 0;
const cache_interface_1 = require("../interfaces/cache.interface");
const permission_matcher_1 = require("../utils/permission-matcher");
const permission_denied_error_1 = require("../errors/permission-denied.error");
const options_types_1 = require("../types/options.types");
class PermissionChecker {
    adapter;
    hierarchyResolver;
    cache;
    matcher;
    keyGenerator;
    options;
    cacheOptions;
    constructor(adapter, hierarchyResolver, cache, options = {}) {
        this.adapter = adapter;
        this.hierarchyResolver = hierarchyResolver;
        this.cache = cache;
        const permissionOptions = { ...options_types_1.DEFAULT_PERMISSION_OPTIONS, ...options.permissionOptions };
        this.cacheOptions = { ...options_types_1.DEFAULT_CACHE_OPTIONS, ...options.cacheOptions };
        this.matcher = new permission_matcher_1.PermissionMatcher(permissionOptions);
        this.keyGenerator = options.cacheKeyGenerator ?? new cache_interface_1.DefaultCacheKeyGenerator({
            prefix: this.cacheOptions.keyPrefix,
            separator: this.cacheOptions.keySeparator,
        });
        this.options = {
            permissionOptions,
            cacheOptions: this.cacheOptions,
            throwOnDenied: options.throwOnDenied ?? false,
            cacheKeyGenerator: this.keyGenerator,
        };
    }
    async hasPermission(userId, permission, context) {
        const result = await this.check({
            userId,
            permission,
            context,
        });
        if (!result.allowed && this.options.throwOnDenied) {
            throw new permission_denied_error_1.PermissionDeniedError(permission, userId, {
                resource: context?.resource,
                organizationId: context?.organizationId,
            });
        }
        return result.allowed;
    }
    async hasAnyPermission(userId, permissions, context) {
        for (const permission of permissions) {
            const result = await this.check({ userId, permission, context });
            if (result.allowed) {
                return true;
            }
        }
        return false;
    }
    async hasAllPermissions(userId, permissions, context) {
        for (const permission of permissions) {
            const result = await this.check({ userId, permission, context });
            if (!result.allowed) {
                if (this.options.throwOnDenied) {
                    throw new permission_denied_error_1.PermissionDeniedError(permission, userId);
                }
                return false;
            }
        }
        return true;
    }
    async checkPermissionDetailed(options) {
        const startTime = Date.now();
        const { userId, permission, context, skipCache } = options;
        const { permissions, roles, fromCache } = await this.getUserEffectivePermissions(userId, context?.organizationId, skipCache);
        const matchContext = {
            userId,
            organizationId: context?.organizationId,
            resourceOwnerId: context?.resourceOwnerId,
            attributes: context?.attributes,
        };
        const matchResult = this.matcher.findBestMatch(permission, permissions, matchContext);
        const checkDuration = Date.now() - startTime;
        if (matchResult.matched && matchResult.matchedPermission) {
            const grantedByRole = this.findRoleWithPermission(roles, matchResult.matchedPermission.id);
            return {
                allowed: true,
                requestedPermission: permission,
                matchedPermission: matchResult.matchedPattern,
                grantedByRole,
                checkedRoles: roles,
                context: context,
                checkDuration,
                fromCache,
            };
        }
        return {
            allowed: false,
            requestedPermission: permission,
            deniedReason: matchResult.reason,
            checkedRoles: roles,
            context: context,
            checkDuration,
            fromCache,
        };
    }
    async getUserEffectivePermissions(userId, organizationId, skipCache) {
        const cacheKey = this.keyGenerator.forUserPermissions(userId, organizationId);
        if (this.cache && this.cacheOptions.enabled && !skipCache) {
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return { ...cached, fromCache: true };
            }
        }
        const assignments = await this.adapter.findUserRoleAssignments(userId, organizationId);
        const now = new Date();
        const activeAssignments = assignments.filter(a => a.isActive && (!a.expiresAt || a.expiresAt > now));
        const roleIds = activeAssignments.map(a => a.roleId);
        const roles = await this.adapter.findRolesByIds(roleIds);
        const activeRoles = roles.filter(r => r.isActive);
        const permissionMap = new Map();
        const allRoles = [];
        for (const role of activeRoles) {
            allRoles.push(role);
            const inheritedPermissions = await this.hierarchyResolver.getInheritedPermissions(role.id);
            for (const permission of inheritedPermissions) {
                permissionMap.set(permission.id, permission);
            }
            const parentRoles = await this.hierarchyResolver.getParentRoles(role.id);
            allRoles.push(...parentRoles);
        }
        const result = {
            permissions: Array.from(permissionMap.values()),
            roles: [...new Map(allRoles.map(r => [r.id, r])).values()],
        };
        if (this.cache && this.cacheOptions.enabled) {
            await this.cache.set(cacheKey, result, {
                ttl: this.cacheOptions.userPermissionsTtl,
                tags: ['user-permissions', `user:${userId}`],
            });
        }
        return { ...result, fromCache: false };
    }
    async invalidateUserCache(userId, organizationId) {
        if (!this.cache) {
            return;
        }
        const cacheKey = this.keyGenerator.forUserPermissions(userId, organizationId);
        await this.cache.delete(cacheKey);
        await this.cache.deletePattern(this.keyGenerator.patternForUser(userId));
    }
    async check(options) {
        const { userId, permission, context, skipCache } = options;
        const { permissions } = await this.getUserEffectivePermissions(userId, context?.organizationId, skipCache);
        const matchContext = {
            userId,
            organizationId: context?.organizationId,
            resourceOwnerId: context?.resourceOwnerId,
            attributes: context?.attributes,
        };
        const checkResult = this.matcher.check(permission, permissions, matchContext);
        return checkResult;
    }
    findRoleWithPermission(roles, permissionId) {
        for (const role of roles) {
            if (role.permissions.some(p => p.id === permissionId)) {
                return role;
            }
        }
        return undefined;
    }
}
exports.PermissionChecker = PermissionChecker;
//# sourceMappingURL=permission-checker.service.js.map