import { IPermission } from '../interfaces/permission.interface';
import { IRole, ICreateRoleOptions, IUpdateRoleOptions } from '../interfaces/role.interface';
import { IRBACAdapter } from '../interfaces/adapter.interface';
import { IRBACCache } from '../interfaces/cache.interface';
import { IAuditLogger } from '../interfaces/audit.interface';
import { IUserRoleAssignment, ICreateUserRoleOptions, IUserAuthorizationContext, IDetailedPermissionCheckResult } from '../interfaces/user.interface';
import { RoleHierarchyResolver } from '../utils/role-hierarchy';
import { RBACEngineOptions, ResolvedRBACEngineOptions, RBACEventHooks } from '../types/options.types';
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
export declare class RBACEngine {
    private readonly adapter;
    private readonly cache;
    private readonly auditLogger;
    private readonly options;
    private readonly keyGenerator;
    private readonly hierarchyResolver;
    private readonly permissionChecker;
    private eventHooks;
    private initialized;
    /**
     * Private constructor - use RBACEngine.create() instead.
     */
    private constructor();
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
    static create(options: RBACEngineOptions): Promise<RBACEngine>;
    /**
     * Initialize the RBAC engine and adapter.
     * Called automatically if autoInitialize is true.
     */
    initialize(): Promise<void>;
    /**
     * Shutdown the RBAC engine and release resources.
     */
    shutdown(): Promise<void>;
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
    can(userId: string, permission: string, context?: Partial<IUserAuthorizationContext>): Promise<boolean>;
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
    authorize(userId: string, permission: string, context?: Partial<IUserAuthorizationContext>): Promise<void>;
    /**
     * Check if a user has any of the specified permissions.
     *
     * @param userId - User ID
     * @param permissions - Array of permission strings
     * @param context - Optional context
     * @returns True if user has ANY of the permissions
     */
    canAny(userId: string, permissions: string[], context?: Partial<IUserAuthorizationContext>): Promise<boolean>;
    /**
     * Check if a user has all of the specified permissions.
     *
     * @param userId - User ID
     * @param permissions - Array of permission strings
     * @param context - Optional context
     * @returns True if user has ALL of the permissions
     */
    canAll(userId: string, permissions: string[], context?: Partial<IUserAuthorizationContext>): Promise<boolean>;
    /**
     * Check a permission with detailed results.
     *
     * @param userId - User ID
     * @param permission - Permission string
     * @param context - Optional context
     * @returns Detailed check result
     */
    checkDetailed(userId: string, permission: string, context?: Partial<IUserAuthorizationContext>): Promise<IDetailedPermissionCheckResult>;
    /**
     * Get all effective permissions for a user.
     *
     * @param userId - User ID
     * @param organizationId - Optional organization ID
     * @returns Array of effective permissions
     */
    getEffectivePermissions(userId: string, organizationId?: string | null): Promise<IPermission[]>;
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
    createRole(options: ICreateRoleOptions, actorId?: string): Promise<IRole>;
    /**
     * Update an existing role.
     *
     * @param roleId - Role ID to update
     * @param options - Update options
     * @param actorId - ID of the user making the update
     * @returns Updated role
     */
    updateRole(roleId: string, options: IUpdateRoleOptions, actorId?: string): Promise<IRole>;
    /**
     * Delete a role.
     *
     * @param roleId - Role ID to delete
     * @param actorId - ID of the user deleting the role
     * @returns True if deleted
     */
    deleteRole(roleId: string, actorId?: string): Promise<boolean>;
    /**
     * Get a role by ID.
     *
     * @param roleId - Role ID
     * @returns Role or null
     */
    getRole(roleId: string): Promise<IRole | null>;
    /**
     * Get a role by name.
     *
     * @param name - Role name
     * @param organizationId - Optional organization ID
     * @returns Role or null
     */
    getRoleByName(name: string, organizationId?: string | null): Promise<IRole | null>;
    /**
     * Add permissions to a role.
     *
     * @param roleId - Role ID
     * @param permissionIds - Permission IDs to add
     * @param actorId - ID of the user making the change
     */
    addPermissionsToRole(roleId: string, permissionIds: string[], actorId?: string): Promise<void>;
    /**
     * Remove permissions from a role.
     *
     * @param roleId - Role ID
     * @param permissionIds - Permission IDs to remove
     * @param actorId - ID of the user making the change
     */
    removePermissionsFromRole(roleId: string, permissionIds: string[], actorId?: string): Promise<void>;
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
    assignRole(options: ICreateUserRoleOptions): Promise<IUserRoleAssignment>;
    /**
     * Remove a role from a user.
     *
     * @param userId - User ID
     * @param roleId - Role ID
     * @param actorId - ID of the user making the removal
     * @param organizationId - Optional organization ID
     * @returns True if removed
     */
    removeRole(userId: string, roleId: string, actorId?: string, organizationId?: string | null): Promise<boolean>;
    /**
     * Get all roles assigned to a user.
     *
     * @param userId - User ID
     * @param organizationId - Optional organization ID
     * @returns Array of role assignments
     */
    getUserRoles(userId: string, organizationId?: string | null): Promise<IUserRoleAssignment[]>;
    /**
     * Check if a user has a specific role.
     *
     * @param userId - User ID
     * @param roleId - Role ID
     * @param organizationId - Optional organization ID
     * @returns True if user has the role
     */
    hasRole(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;
    /**
     * Invalidate all caches for a user.
     *
     * @param userId - User ID
     * @param organizationId - Optional organization ID
     */
    invalidateUserCache(userId: string, organizationId?: string | null): Promise<void>;
    /**
     * Invalidate all caches for a role.
     *
     * @param roleId - Role ID
     */
    invalidateRoleCache(roleId: string): Promise<void>;
    /**
     * Clear all RBAC caches.
     */
    clearAllCaches(): Promise<void>;
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
    registerHooks(hooks: RBACEventHooks): void;
    /**
     * Check if the RBAC engine is healthy.
     *
     * @returns Health check result
     */
    healthCheck(): Promise<{
        healthy: boolean;
        details: Record<string, boolean>;
    }>;
    /**
     * Get the underlying adapter.
     * Use with caution - direct adapter access bypasses caching and auditing.
     */
    getAdapter(): IRBACAdapter;
    /**
     * Get the underlying cache.
     */
    getCache(): IRBACCache;
    /**
     * Get the audit logger.
     */
    getAuditLogger(): IAuditLogger;
    /**
     * Get the role hierarchy resolver.
     */
    getHierarchyResolver(): RoleHierarchyResolver;
    /**
     * Check if engine is initialized.
     */
    isInitialized(): boolean;
    /**
     * Get the resolved engine options.
     * This returns the merged configuration with all defaults applied.
     */
    getOptions(): ResolvedRBACEngineOptions;
}
//# sourceMappingURL=rbac-engine.service.d.ts.map