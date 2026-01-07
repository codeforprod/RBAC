"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBACEngine = void 0;
const cache_interface_1 = require("../interfaces/cache.interface");
const audit_interface_1 = require("../interfaces/audit.interface");
const role_hierarchy_1 = require("../utils/role-hierarchy");
const permission_checker_service_1 = require("./permission-checker.service");
const audit_logger_service_1 = require("./audit-logger.service");
const rbac_error_1 = require("../errors/rbac.error");
const permission_denied_error_1 = require("../errors/permission-denied.error");
const role_not_found_error_1 = require("../errors/role-not-found.error");
const circular_hierarchy_error_1 = require("../errors/circular-hierarchy.error");
const options_types_1 = require("../types/options.types");
class RBACEngine {
    adapter;
    cache;
    auditLogger;
    options;
    keyGenerator;
    hierarchyResolver;
    permissionChecker;
    eventHooks = {};
    initialized = false;
    constructor(adapter, cache, auditLogger, options) {
        this.adapter = adapter;
        this.cache = cache;
        this.auditLogger = auditLogger;
        this.options = options;
        this.keyGenerator = new cache_interface_1.DefaultCacheKeyGenerator({
            prefix: options.cacheOptions.keyPrefix,
            separator: options.cacheOptions.keySeparator,
        });
        this.hierarchyResolver = new role_hierarchy_1.RoleHierarchyResolver(adapter, cache, options.hierarchyOptions);
        this.permissionChecker = new permission_checker_service_1.PermissionChecker(adapter, this.hierarchyResolver, cache, {
            permissionOptions: options.permissionOptions,
            cacheOptions: options.cacheOptions,
        });
    }
    static async create(options) {
        const resolvedOptions = (0, options_types_1.mergeOptions)(options);
        const cache = options.cache ?? new cache_interface_1.InMemoryCache();
        const auditLogger = options.auditLogger ?? (resolvedOptions.auditOptions.enabled
            ? new audit_logger_service_1.InMemoryAuditLogger({ auditOptions: resolvedOptions.auditOptions })
            : new audit_interface_1.NoOpAuditLogger());
        const engine = new RBACEngine(options.adapter, cache, auditLogger, resolvedOptions);
        if (resolvedOptions.autoInitialize) {
            await engine.initialize();
        }
        return engine;
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        if (this.adapter.initialize) {
            await this.adapter.initialize();
        }
        this.initialized = true;
    }
    async shutdown() {
        if (this.adapter.shutdown) {
            await this.adapter.shutdown();
        }
        if (this.cache.shutdown) {
            await this.cache.shutdown();
        }
        this.initialized = false;
    }
    async can(userId, permission, context) {
        await this.eventHooks.beforePermissionCheck?.(userId, permission);
        const result = await this.permissionChecker.hasPermission(userId, permission, context);
        await this.auditLogger.logPermissionCheck(userId, permission, result, {
            resource: context?.resource,
            ipAddress: context?.ipAddress,
            requestId: context?.requestId,
            organizationId: context?.organizationId,
        });
        await this.eventHooks.afterPermissionCheck?.(userId, permission, result, context);
        return result;
    }
    async authorize(userId, permission, context) {
        const allowed = await this.can(userId, permission, context);
        if (!allowed) {
            throw new permission_denied_error_1.PermissionDeniedError(permission, userId, {
                resource: context?.resource,
                organizationId: context?.organizationId,
            });
        }
    }
    async canAny(userId, permissions, context) {
        return this.permissionChecker.hasAnyPermission(userId, permissions, context);
    }
    async canAll(userId, permissions, context) {
        return this.permissionChecker.hasAllPermissions(userId, permissions, context);
    }
    async checkDetailed(userId, permission, context) {
        return this.permissionChecker.checkPermissionDetailed({
            userId,
            permission,
            context,
            detailed: true,
        });
    }
    async getEffectivePermissions(userId, organizationId) {
        const result = await this.permissionChecker.getUserEffectivePermissions(userId, organizationId);
        return result.permissions;
    }
    async createRole(options, actorId) {
        if (options.parentRoles && options.parentRoles.length > 0) {
            for (const parentId of options.parentRoles) {
                const exists = await this.adapter.findRoleById(parentId);
                if (!exists) {
                    throw role_not_found_error_1.RoleNotFoundError.parentRole(parentId, 'new-role');
                }
            }
        }
        const role = await this.adapter.createRole(options);
        await this.auditLogger.logRoleCreation(role.id, actorId ?? 'system', {
            name: role.name,
            displayName: role.displayName,
            parentRoles: role.parentRoles,
        });
        if (options.parentRoles) {
            for (const parentId of options.parentRoles) {
                await this.hierarchyResolver.invalidateCache(parentId);
            }
        }
        return role;
    }
    async updateRole(roleId, options, actorId) {
        const existingRole = await this.adapter.findRoleById(roleId);
        if (!existingRole) {
            throw role_not_found_error_1.RoleNotFoundError.byId(roleId);
        }
        if (options.parentRoles) {
            for (const parentId of options.parentRoles) {
                if (parentId === roleId) {
                    throw circular_hierarchy_error_1.CircularHierarchyError.selfReference(roleId);
                }
                const isValid = await this.hierarchyResolver.validateHierarchy(roleId, parentId);
                if (!isValid) {
                    const chain = [roleId, parentId, roleId];
                    throw new circular_hierarchy_error_1.CircularHierarchyError(roleId, parentId, chain);
                }
            }
        }
        const previousState = {
            displayName: existingRole.displayName,
            description: existingRole.description,
            parentRoles: existingRole.parentRoles,
            isActive: existingRole.isActive,
        };
        const updatedRole = await this.adapter.updateRole(roleId, options);
        await this.auditLogger.logRoleUpdate(roleId, actorId ?? 'system', previousState, {
            displayName: updatedRole.displayName,
            description: updatedRole.description,
            parentRoles: updatedRole.parentRoles,
            isActive: updatedRole.isActive,
        });
        await this.hierarchyResolver.invalidateCache(roleId);
        return updatedRole;
    }
    async deleteRole(roleId, actorId) {
        const role = await this.adapter.findRoleById(roleId);
        if (!role) {
            return false;
        }
        if (role.isSystem) {
            throw new rbac_error_1.RBACError('Cannot delete system role', rbac_error_1.RBACErrorCode.SYSTEM_ROLE_MODIFICATION, { roleId });
        }
        const deleted = await this.adapter.deleteRole(roleId);
        if (deleted) {
            await this.auditLogger.logRoleDeletion(roleId, actorId ?? 'system', {
                name: role.name,
                displayName: role.displayName,
            });
            await this.hierarchyResolver.invalidateCache(roleId);
            await this.cache.deletePattern(this.keyGenerator.patternForRole(roleId));
        }
        return deleted;
    }
    async getRole(roleId) {
        return this.adapter.findRoleById(roleId);
    }
    async getRoleByName(name, organizationId) {
        return this.adapter.findRoleByName(name, organizationId);
    }
    async addPermissionsToRole(roleId, permissionIds, actorId) {
        const role = await this.adapter.findRoleById(roleId);
        if (!role) {
            throw role_not_found_error_1.RoleNotFoundError.byId(roleId);
        }
        await this.adapter.assignPermissionsToRole(roleId, permissionIds);
        await this.auditLogger.log({
            action: audit_interface_1.AuditAction.ROLE_PERMISSION_ASSIGNED,
            actorId: actorId ?? null,
            targetId: roleId,
            targetType: 'role',
            success: true,
            metadata: { permissionIds },
        });
        await this.hierarchyResolver.invalidateCache(roleId);
    }
    async removePermissionsFromRole(roleId, permissionIds, actorId) {
        const role = await this.adapter.findRoleById(roleId);
        if (!role) {
            throw role_not_found_error_1.RoleNotFoundError.byId(roleId);
        }
        await this.adapter.removePermissionsFromRole(roleId, permissionIds);
        await this.auditLogger.log({
            action: audit_interface_1.AuditAction.ROLE_PERMISSION_REMOVED,
            actorId: actorId ?? null,
            targetId: roleId,
            targetType: 'role',
            success: true,
            metadata: { permissionIds },
        });
        await this.hierarchyResolver.invalidateCache(roleId);
    }
    async assignRole(options) {
        const role = await this.adapter.findRoleById(options.roleId);
        if (!role) {
            throw role_not_found_error_1.RoleNotFoundError.forAssignment(options.roleId, options.userId);
        }
        const assignment = await this.adapter.assignRoleToUser(options);
        await this.auditLogger.logRoleAssignment(options.userId, options.roleId, options.assignedBy ?? 'system', {
            organizationId: options.organizationId,
            expiresAt: options.expiresAt ?? undefined,
        });
        await this.permissionChecker.invalidateUserCache(options.userId, options.organizationId);
        await this.eventHooks.onRoleAssigned?.('assigned', options.userId, options.roleId);
        return assignment;
    }
    async removeRole(userId, roleId, actorId, organizationId) {
        const removed = await this.adapter.removeRoleFromUser(userId, roleId, organizationId);
        if (removed) {
            await this.auditLogger.logRoleRemoval(userId, roleId, actorId ?? 'system', {
                organizationId,
            });
            await this.permissionChecker.invalidateUserCache(userId, organizationId);
            await this.eventHooks.onRoleRemoved?.('removed', userId, roleId);
        }
        return removed;
    }
    async getUserRoles(userId, organizationId) {
        return this.adapter.findUserRoleAssignments(userId, organizationId);
    }
    async hasRole(userId, roleId, organizationId) {
        return this.adapter.userHasRole(userId, roleId, organizationId);
    }
    async invalidateUserCache(userId, organizationId) {
        await this.permissionChecker.invalidateUserCache(userId, organizationId);
    }
    async invalidateRoleCache(roleId) {
        await this.hierarchyResolver.invalidateCache(roleId);
    }
    async clearAllCaches() {
        await this.cache.clear();
        await this.eventHooks.onCacheInvalidated?.(['all']);
    }
    registerHooks(hooks) {
        this.eventHooks = { ...this.eventHooks, ...hooks };
    }
    async healthCheck() {
        const details = {
            initialized: this.initialized,
        };
        if (this.adapter.healthCheck) {
            details.adapter = await this.adapter.healthCheck();
        }
        if (this.cache.healthCheck) {
            details.cache = await this.cache.healthCheck();
        }
        const healthy = Object.values(details).every(v => v);
        return { healthy, details };
    }
    getAdapter() {
        return this.adapter;
    }
    getCache() {
        return this.cache;
    }
    getAuditLogger() {
        return this.auditLogger;
    }
    getHierarchyResolver() {
        return this.hierarchyResolver;
    }
    isInitialized() {
        return this.initialized;
    }
    getOptions() {
        return this.options;
    }
}
exports.RBACEngine = RBACEngine;
//# sourceMappingURL=rbac-engine.service.js.map