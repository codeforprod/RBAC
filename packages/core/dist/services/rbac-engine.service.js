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
/**
 * The main RBAC engine that orchestrates all authorization operations.
 *
 * This is the primary entry point for all RBAC functionality:
 * - Permission checking
 * - Role management
 * - User-role assignments
 * - Audit logging
 * - Cache management
 *
 * @example
 * ```typescript
 * // Create the engine
 * const rbac = await RBACEngine.create({
 *   adapter: new TypeORMAdapter(dataSource),
 *   cache: new RedisCache(redisClient),
 *   auditLogger: new DatabaseAuditLogger(db)
 * });
 *
 * // Check permissions
 * const canEdit = await rbac.can('user-123', 'posts:update');
 *
 * // Assign roles
 * await rbac.assignRole({
 *   userId: 'user-123',
 *   roleId: 'editor-role-id',
 *   assignedBy: 'admin-user-id'
 * });
 *
 * // Create roles
 * const role = await rbac.createRole({
 *   name: 'moderator',
 *   displayName: 'Content Moderator',
 *   parentRoles: ['viewer-role-id']
 * });
 * ```
 */
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
    /**
     * Private constructor - use RBACEngine.create() instead.
     */
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
    /**
     * Create and initialize an RBAC engine.
     *
     * @param options - Engine options
     * @returns Initialized RBAC engine
     *
     * @example
     * ```typescript
     * const rbac = await RBACEngine.create({
     *   adapter: new TypeORMAdapter(dataSource),
     *   cacheOptions: { defaultTtl: 3600 },
     *   auditOptions: { logSuccessfulChecks: false }
     * });
     * ```
     */
    static async create(options) {
        const resolvedOptions = (0, options_types_1.mergeOptions)(options);
        // Create or use provided cache
        const cache = options.cache ?? new cache_interface_1.InMemoryCache();
        // Create or use provided audit logger
        const auditLogger = options.auditLogger ?? (resolvedOptions.auditOptions.enabled
            ? new audit_logger_service_1.InMemoryAuditLogger({ auditOptions: resolvedOptions.auditOptions })
            : new audit_interface_1.NoOpAuditLogger());
        const engine = new RBACEngine(options.adapter, cache, auditLogger, resolvedOptions);
        // Auto-initialize if configured
        if (resolvedOptions.autoInitialize) {
            await engine.initialize();
        }
        return engine;
    }
    /**
     * Initialize the RBAC engine and adapter.
     * Called automatically if autoInitialize is true.
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        if (this.adapter.initialize) {
            await this.adapter.initialize();
        }
        this.initialized = true;
    }
    /**
     * Shutdown the RBAC engine and release resources.
     */
    async shutdown() {
        if (this.adapter.shutdown) {
            await this.adapter.shutdown();
        }
        if (this.cache.shutdown) {
            await this.cache.shutdown();
        }
        this.initialized = false;
    }
    // ==========================================================================
    // PERMISSION CHECKING
    // ==========================================================================
    /**
     * Check if a user has a specific permission.
     * This is the main method for authorization checks.
     *
     * @param userId - User ID
     * @param permission - Permission string (e.g., "users:read", "posts:update:own")
     * @param context - Optional authorization context
     * @returns True if user has the permission
     *
     * @example
     * ```typescript
     * // Basic check
     * if (await rbac.can('user-123', 'posts:create')) {
     *   // User can create posts
     * }
     *
     * // With ownership check
     * if (await rbac.can('user-123', 'posts:delete:own', {
     *   resourceOwnerId: post.authorId
     * })) {
     *   // User can delete their own post
     * }
     *
     * // With organization context
     * if (await rbac.can('user-123', 'teams:manage', {
     *   organizationId: 'org-456'
     * })) {
     *   // User can manage teams in this org
     * }
     * ```
     */
    async can(userId, permission, context) {
        await this.eventHooks.beforePermissionCheck?.(userId, permission);
        const result = await this.permissionChecker.hasPermission(userId, permission, context);
        // Audit logging
        await this.auditLogger.logPermissionCheck(userId, permission, result, {
            resource: context?.resource,
            ipAddress: context?.ipAddress,
            requestId: context?.requestId,
            organizationId: context?.organizationId,
        });
        await this.eventHooks.afterPermissionCheck?.(userId, permission, result, context);
        return result;
    }
    /**
     * Check if a user has a permission and throw if not.
     *
     * @param userId - User ID
     * @param permission - Permission string
     * @param context - Optional authorization context
     * @throws {PermissionDeniedError} If permission is denied
     *
     * @example
     * ```typescript
     * try {
     *   await rbac.authorize('user-123', 'admin:settings');
     *   // Proceed with admin operation
     * } catch (error) {
     *   if (error instanceof PermissionDeniedError) {
     *     res.status(403).json({ error: 'Forbidden' });
     *   }
     * }
     * ```
     */
    async authorize(userId, permission, context) {
        const allowed = await this.can(userId, permission, context);
        if (!allowed) {
            throw new permission_denied_error_1.PermissionDeniedError(permission, userId, {
                resource: context?.resource,
                organizationId: context?.organizationId,
            });
        }
    }
    /**
     * Check if a user has any of the specified permissions.
     *
     * @param userId - User ID
     * @param permissions - Array of permission strings
     * @param context - Optional context
     * @returns True if user has ANY of the permissions
     */
    async canAny(userId, permissions, context) {
        return this.permissionChecker.hasAnyPermission(userId, permissions, context);
    }
    /**
     * Check if a user has all of the specified permissions.
     *
     * @param userId - User ID
     * @param permissions - Array of permission strings
     * @param context - Optional context
     * @returns True if user has ALL of the permissions
     */
    async canAll(userId, permissions, context) {
        return this.permissionChecker.hasAllPermissions(userId, permissions, context);
    }
    /**
     * Check a permission with detailed results.
     *
     * @param userId - User ID
     * @param permission - Permission string
     * @param context - Optional context
     * @returns Detailed check result
     */
    async checkDetailed(userId, permission, context) {
        return this.permissionChecker.checkPermissionDetailed({
            userId,
            permission,
            context,
            detailed: true,
        });
    }
    /**
     * Get all effective permissions for a user.
     *
     * @param userId - User ID
     * @param organizationId - Optional organization ID
     * @returns Array of effective permissions
     */
    async getEffectivePermissions(userId, organizationId) {
        const result = await this.permissionChecker.getUserEffectivePermissions(userId, organizationId);
        return result.permissions;
    }
    // ==========================================================================
    // ROLE MANAGEMENT
    // ==========================================================================
    /**
     * Create a new role.
     *
     * @param options - Role creation options
     * @param actorId - ID of the user creating the role
     * @returns Created role
     *
     * @example
     * ```typescript
     * const role = await rbac.createRole({
     *   name: 'editor',
     *   displayName: 'Content Editor',
     *   description: 'Can create and edit content',
     *   parentRoles: ['viewer-role-id']
     * }, 'admin-user-id');
     * ```
     */
    async createRole(options, actorId) {
        // Validate parent roles for circular dependencies
        if (options.parentRoles && options.parentRoles.length > 0) {
            for (const parentId of options.parentRoles) {
                const exists = await this.adapter.findRoleById(parentId);
                if (!exists) {
                    throw role_not_found_error_1.RoleNotFoundError.parentRole(parentId, 'new-role');
                }
            }
        }
        const role = await this.adapter.createRole(options);
        // Audit log
        await this.auditLogger.logRoleCreation(role.id, actorId ?? 'system', {
            name: role.name,
            displayName: role.displayName,
            parentRoles: role.parentRoles,
        });
        // Invalidate related caches
        if (options.parentRoles) {
            for (const parentId of options.parentRoles) {
                await this.hierarchyResolver.invalidateCache(parentId);
            }
        }
        return role;
    }
    /**
     * Update an existing role.
     *
     * @param roleId - Role ID to update
     * @param options - Update options
     * @param actorId - ID of the user making the update
     * @returns Updated role
     */
    async updateRole(roleId, options, actorId) {
        const existingRole = await this.adapter.findRoleById(roleId);
        if (!existingRole) {
            throw role_not_found_error_1.RoleNotFoundError.byId(roleId);
        }
        // Validate parent roles for circular dependencies
        if (options.parentRoles) {
            for (const parentId of options.parentRoles) {
                if (parentId === roleId) {
                    throw circular_hierarchy_error_1.CircularHierarchyError.selfReference(roleId);
                }
                const isValid = await this.hierarchyResolver.validateHierarchy(roleId, parentId);
                if (!isValid) {
                    const chain = [roleId, parentId, roleId]; // Simplified chain
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
        // Audit log
        await this.auditLogger.logRoleUpdate(roleId, actorId ?? 'system', previousState, {
            displayName: updatedRole.displayName,
            description: updatedRole.description,
            parentRoles: updatedRole.parentRoles,
            isActive: updatedRole.isActive,
        });
        // Invalidate hierarchy cache
        await this.hierarchyResolver.invalidateCache(roleId);
        return updatedRole;
    }
    /**
     * Delete a role.
     *
     * @param roleId - Role ID to delete
     * @param actorId - ID of the user deleting the role
     * @returns True if deleted
     */
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
            // Audit log
            await this.auditLogger.logRoleDeletion(roleId, actorId ?? 'system', {
                name: role.name,
                displayName: role.displayName,
            });
            // Invalidate caches
            await this.hierarchyResolver.invalidateCache(roleId);
            await this.cache.deletePattern(this.keyGenerator.patternForRole(roleId));
        }
        return deleted;
    }
    /**
     * Get a role by ID.
     *
     * @param roleId - Role ID
     * @returns Role or null
     */
    async getRole(roleId) {
        return this.adapter.findRoleById(roleId);
    }
    /**
     * Get a role by name.
     *
     * @param name - Role name
     * @param organizationId - Optional organization ID
     * @returns Role or null
     */
    async getRoleByName(name, organizationId) {
        return this.adapter.findRoleByName(name, organizationId);
    }
    /**
     * Add permissions to a role.
     *
     * @param roleId - Role ID
     * @param permissionIds - Permission IDs to add
     * @param actorId - ID of the user making the change
     */
    async addPermissionsToRole(roleId, permissionIds, actorId) {
        const role = await this.adapter.findRoleById(roleId);
        if (!role) {
            throw role_not_found_error_1.RoleNotFoundError.byId(roleId);
        }
        await this.adapter.assignPermissionsToRole(roleId, permissionIds);
        // Audit log
        await this.auditLogger.log({
            action: audit_interface_1.AuditAction.ROLE_PERMISSION_ASSIGNED,
            actorId: actorId ?? null,
            targetId: roleId,
            targetType: 'role',
            success: true,
            metadata: { permissionIds },
        });
        // Invalidate caches
        await this.hierarchyResolver.invalidateCache(roleId);
    }
    /**
     * Remove permissions from a role.
     *
     * @param roleId - Role ID
     * @param permissionIds - Permission IDs to remove
     * @param actorId - ID of the user making the change
     */
    async removePermissionsFromRole(roleId, permissionIds, actorId) {
        const role = await this.adapter.findRoleById(roleId);
        if (!role) {
            throw role_not_found_error_1.RoleNotFoundError.byId(roleId);
        }
        await this.adapter.removePermissionsFromRole(roleId, permissionIds);
        // Audit log
        await this.auditLogger.log({
            action: audit_interface_1.AuditAction.ROLE_PERMISSION_REMOVED,
            actorId: actorId ?? null,
            targetId: roleId,
            targetType: 'role',
            success: true,
            metadata: { permissionIds },
        });
        // Invalidate caches
        await this.hierarchyResolver.invalidateCache(roleId);
    }
    // ==========================================================================
    // USER-ROLE ASSIGNMENTS
    // ==========================================================================
    /**
     * Assign a role to a user.
     *
     * @param options - Assignment options
     * @returns Created assignment
     *
     * @example
     * ```typescript
     * // Permanent assignment
     * await rbac.assignRole({
     *   userId: 'user-123',
     *   roleId: 'editor-role-id',
     *   assignedBy: 'admin-user-id'
     * });
     *
     * // Temporary assignment
     * await rbac.assignRole({
     *   userId: 'user-123',
     *   roleId: 'premium-role-id',
     *   assignedBy: 'system',
     *   expiresAt: new Date('2025-12-31')
     * });
     * ```
     */
    async assignRole(options) {
        const role = await this.adapter.findRoleById(options.roleId);
        if (!role) {
            throw role_not_found_error_1.RoleNotFoundError.forAssignment(options.roleId, options.userId);
        }
        const assignment = await this.adapter.assignRoleToUser(options);
        // Audit log
        await this.auditLogger.logRoleAssignment(options.userId, options.roleId, options.assignedBy ?? 'system', {
            organizationId: options.organizationId,
            expiresAt: options.expiresAt ?? undefined,
        });
        // Invalidate user cache
        await this.permissionChecker.invalidateUserCache(options.userId, options.organizationId);
        // Fire event hook
        await this.eventHooks.onRoleAssigned?.('assigned', options.userId, options.roleId);
        return assignment;
    }
    /**
     * Remove a role from a user.
     *
     * @param userId - User ID
     * @param roleId - Role ID
     * @param actorId - ID of the user making the removal
     * @param organizationId - Optional organization ID
     * @returns True if removed
     */
    async removeRole(userId, roleId, actorId, organizationId) {
        const removed = await this.adapter.removeRoleFromUser(userId, roleId, organizationId);
        if (removed) {
            // Audit log
            await this.auditLogger.logRoleRemoval(userId, roleId, actorId ?? 'system', {
                organizationId,
            });
            // Invalidate user cache
            await this.permissionChecker.invalidateUserCache(userId, organizationId);
            // Fire event hook
            await this.eventHooks.onRoleRemoved?.('removed', userId, roleId);
        }
        return removed;
    }
    /**
     * Get all roles assigned to a user.
     *
     * @param userId - User ID
     * @param organizationId - Optional organization ID
     * @returns Array of role assignments
     */
    async getUserRoles(userId, organizationId) {
        return this.adapter.findUserRoleAssignments(userId, organizationId);
    }
    /**
     * Check if a user has a specific role.
     *
     * @param userId - User ID
     * @param roleId - Role ID
     * @param organizationId - Optional organization ID
     * @returns True if user has the role
     */
    async hasRole(userId, roleId, organizationId) {
        return this.adapter.userHasRole(userId, roleId, organizationId);
    }
    // ==========================================================================
    // CACHE MANAGEMENT
    // ==========================================================================
    /**
     * Invalidate all caches for a user.
     *
     * @param userId - User ID
     * @param organizationId - Optional organization ID
     */
    async invalidateUserCache(userId, organizationId) {
        await this.permissionChecker.invalidateUserCache(userId, organizationId);
    }
    /**
     * Invalidate all caches for a role.
     *
     * @param roleId - Role ID
     */
    async invalidateRoleCache(roleId) {
        await this.hierarchyResolver.invalidateCache(roleId);
    }
    /**
     * Clear all RBAC caches.
     */
    async clearAllCaches() {
        await this.cache.clear();
        // Fire event hook
        await this.eventHooks.onCacheInvalidated?.(['all']);
    }
    // ==========================================================================
    // EVENT HOOKS
    // ==========================================================================
    /**
     * Register event hooks for RBAC operations.
     *
     * @param hooks - Event hooks to register
     *
     * @example
     * ```typescript
     * rbac.registerHooks({
     *   afterPermissionCheck: async (userId, permission, allowed) => {
     *     metrics.recordPermissionCheck(permission, allowed);
     *   },
     *   onRoleAssigned: async (event, userId, roleId) => {
     *     await notificationService.notify(userId, 'Role assigned');
     *   },
     *   onError: async (error) => {
     *     await errorTracker.capture(error);
     *   }
     * });
     * ```
     */
    registerHooks(hooks) {
        this.eventHooks = { ...this.eventHooks, ...hooks };
    }
    // ==========================================================================
    // HEALTH & DIAGNOSTICS
    // ==========================================================================
    /**
     * Check if the RBAC engine is healthy.
     *
     * @returns Health check result
     */
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
    /**
     * Get the underlying adapter.
     * Use with caution - direct adapter access bypasses caching and auditing.
     */
    getAdapter() {
        return this.adapter;
    }
    /**
     * Get the underlying cache.
     */
    getCache() {
        return this.cache;
    }
    /**
     * Get the audit logger.
     */
    getAuditLogger() {
        return this.auditLogger;
    }
    /**
     * Get the role hierarchy resolver.
     */
    getHierarchyResolver() {
        return this.hierarchyResolver;
    }
    /**
     * Check if engine is initialized.
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Get the resolved engine options.
     * This returns the merged configuration with all defaults applied.
     */
    getOptions() {
        return this.options;
    }
}
exports.RBACEngine = RBACEngine;
//# sourceMappingURL=rbac-engine.service.js.map