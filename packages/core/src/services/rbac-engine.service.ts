import { IPermission } from '../interfaces/permission.interface';
import { IRole, ICreateRoleOptions, IUpdateRoleOptions } from '../interfaces/role.interface';
import { IRBACAdapter } from '../interfaces/adapter.interface';
import { IRBACCache, InMemoryCache, DefaultCacheKeyGenerator, ICacheKeyGenerator } from '../interfaces/cache.interface';
import { IAuditLogger, AuditAction, NoOpAuditLogger } from '../interfaces/audit.interface';
import {
  IUserRoleAssignment,
  ICreateUserRoleOptions,
  IUserAuthorizationContext,
  IDetailedPermissionCheckResult,
} from '../interfaces/user.interface';
import { RoleHierarchyResolver } from '../utils/role-hierarchy';
import { PermissionChecker } from './permission-checker.service';
import { InMemoryAuditLogger } from './audit-logger.service';
import { RBACError, RBACErrorCode } from '../errors/rbac.error';
import { PermissionDeniedError } from '../errors/permission-denied.error';
import { RoleNotFoundError } from '../errors/role-not-found.error';
import { CircularHierarchyError } from '../errors/circular-hierarchy.error';
import {
  RBACEngineOptions,
  ResolvedRBACEngineOptions,
  mergeOptions,
  RBACEventHooks,
} from '../types/options.types';

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
export class RBACEngine {
  private readonly adapter: IRBACAdapter;
  private readonly cache: IRBACCache;
  private readonly auditLogger: IAuditLogger;
  private readonly options: ResolvedRBACEngineOptions;
  private readonly keyGenerator: ICacheKeyGenerator;
  private readonly hierarchyResolver: RoleHierarchyResolver;
  private readonly permissionChecker: PermissionChecker;
  private eventHooks: RBACEventHooks = {};
  private initialized = false;

  /**
   * Private constructor - use RBACEngine.create() instead.
   */
  private constructor(
    adapter: IRBACAdapter,
    cache: IRBACCache,
    auditLogger: IAuditLogger,
    options: ResolvedRBACEngineOptions
  ) {
    this.adapter = adapter;
    this.cache = cache;
    this.auditLogger = auditLogger;
    this.options = options;

    this.keyGenerator = new DefaultCacheKeyGenerator({
      prefix: options.cacheOptions.keyPrefix,
      separator: options.cacheOptions.keySeparator,
    });

    this.hierarchyResolver = new RoleHierarchyResolver(
      adapter,
      cache,
      options.hierarchyOptions
    );

    this.permissionChecker = new PermissionChecker(
      adapter,
      this.hierarchyResolver,
      cache,
      {
        permissionOptions: options.permissionOptions,
        cacheOptions: options.cacheOptions,
      }
    );
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
  static async create(options: RBACEngineOptions): Promise<RBACEngine> {
    const resolvedOptions = mergeOptions(options);

    // Create or use provided cache
    const cache = options.cache ?? new InMemoryCache();

    // Create or use provided audit logger
    const auditLogger = options.auditLogger ?? (
      resolvedOptions.auditOptions.enabled
        ? new InMemoryAuditLogger({ auditOptions: resolvedOptions.auditOptions })
        : new NoOpAuditLogger()
    );

    const engine = new RBACEngine(
      options.adapter,
      cache,
      auditLogger,
      resolvedOptions
    );

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
  async initialize(): Promise<void> {
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
  async shutdown(): Promise<void> {
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
  async can(
    userId: string,
    permission: string,
    context?: Partial<IUserAuthorizationContext>
  ): Promise<boolean> {
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
  async authorize(
    userId: string,
    permission: string,
    context?: Partial<IUserAuthorizationContext>
  ): Promise<void> {
    const allowed = await this.can(userId, permission, context);

    if (!allowed) {
      throw new PermissionDeniedError(permission, userId, {
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
  async canAny(
    userId: string,
    permissions: string[],
    context?: Partial<IUserAuthorizationContext>
  ): Promise<boolean> {
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
  async canAll(
    userId: string,
    permissions: string[],
    context?: Partial<IUserAuthorizationContext>
  ): Promise<boolean> {
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
  async checkDetailed(
    userId: string,
    permission: string,
    context?: Partial<IUserAuthorizationContext>
  ): Promise<IDetailedPermissionCheckResult> {
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
  async getEffectivePermissions(
    userId: string,
    organizationId?: string | null
  ): Promise<IPermission[]> {
    const result = await this.permissionChecker.getUserEffectivePermissions(
      userId,
      organizationId
    );
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
  async createRole(options: ICreateRoleOptions, actorId?: string): Promise<IRole> {
    // Validate parent roles for circular dependencies
    if (options.parentRoles && options.parentRoles.length > 0) {
      for (const parentId of options.parentRoles) {
        const exists = await this.adapter.findRoleById(parentId);
        if (!exists) {
          throw RoleNotFoundError.parentRole(parentId, 'new-role');
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
  async updateRole(
    roleId: string,
    options: IUpdateRoleOptions,
    actorId?: string
  ): Promise<IRole> {
    const existingRole = await this.adapter.findRoleById(roleId);
    if (!existingRole) {
      throw RoleNotFoundError.byId(roleId);
    }

    // Validate parent roles for circular dependencies
    if (options.parentRoles) {
      for (const parentId of options.parentRoles) {
        if (parentId === roleId) {
          throw CircularHierarchyError.selfReference(roleId);
        }

        const isValid = await this.hierarchyResolver.validateHierarchy(roleId, parentId);
        if (!isValid) {
          const chain = [roleId, parentId, roleId]; // Simplified chain
          throw new CircularHierarchyError(roleId, parentId, chain);
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
  async deleteRole(roleId: string, actorId?: string): Promise<boolean> {
    const role = await this.adapter.findRoleById(roleId);
    if (!role) {
      return false;
    }

    if (role.isSystem) {
      throw new RBACError(
        'Cannot delete system role',
        RBACErrorCode.SYSTEM_ROLE_MODIFICATION,
        { roleId }
      );
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
  async getRole(roleId: string): Promise<IRole | null> {
    return this.adapter.findRoleById(roleId);
  }

  /**
   * Get a role by name.
   *
   * @param name - Role name
   * @param organizationId - Optional organization ID
   * @returns Role or null
   */
  async getRoleByName(name: string, organizationId?: string | null): Promise<IRole | null> {
    return this.adapter.findRoleByName(name, organizationId);
  }

  /**
   * Add permissions to a role.
   *
   * @param roleId - Role ID
   * @param permissionIds - Permission IDs to add
   * @param actorId - ID of the user making the change
   */
  async addPermissionsToRole(
    roleId: string,
    permissionIds: string[],
    actorId?: string
  ): Promise<void> {
    const role = await this.adapter.findRoleById(roleId);
    if (!role) {
      throw RoleNotFoundError.byId(roleId);
    }

    await this.adapter.assignPermissionsToRole(roleId, permissionIds);

    // Audit log
    await this.auditLogger.log({
      action: AuditAction.ROLE_PERMISSION_ASSIGNED,
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
  async removePermissionsFromRole(
    roleId: string,
    permissionIds: string[],
    actorId?: string
  ): Promise<void> {
    const role = await this.adapter.findRoleById(roleId);
    if (!role) {
      throw RoleNotFoundError.byId(roleId);
    }

    await this.adapter.removePermissionsFromRole(roleId, permissionIds);

    // Audit log
    await this.auditLogger.log({
      action: AuditAction.ROLE_PERMISSION_REMOVED,
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
  async assignRole(options: ICreateUserRoleOptions): Promise<IUserRoleAssignment> {
    const role = await this.adapter.findRoleById(options.roleId);
    if (!role) {
      throw RoleNotFoundError.forAssignment(options.roleId, options.userId);
    }

    const assignment = await this.adapter.assignRoleToUser(options);

    // Audit log
    await this.auditLogger.logRoleAssignment(
      options.userId,
      options.roleId,
      options.assignedBy ?? 'system',
      {
        organizationId: options.organizationId,
        expiresAt: options.expiresAt ?? undefined,
      }
    );

    // Invalidate user cache
    await this.permissionChecker.invalidateUserCache(
      options.userId,
      options.organizationId
    );

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
  async removeRole(
    userId: string,
    roleId: string,
    actorId?: string,
    organizationId?: string | null
  ): Promise<boolean> {
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
  async getUserRoles(
    userId: string,
    organizationId?: string | null
  ): Promise<IUserRoleAssignment[]> {
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
  async hasRole(
    userId: string,
    roleId: string,
    organizationId?: string | null
  ): Promise<boolean> {
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
  async invalidateUserCache(userId: string, organizationId?: string | null): Promise<void> {
    await this.permissionChecker.invalidateUserCache(userId, organizationId);
  }

  /**
   * Invalidate all caches for a role.
   *
   * @param roleId - Role ID
   */
  async invalidateRoleCache(roleId: string): Promise<void> {
    await this.hierarchyResolver.invalidateCache(roleId);
  }

  /**
   * Clear all RBAC caches.
   */
  async clearAllCaches(): Promise<void> {
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
  registerHooks(hooks: RBACEventHooks): void {
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
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, boolean> }> {
    const details: Record<string, boolean> = {
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
  getAdapter(): IRBACAdapter {
    return this.adapter;
  }

  /**
   * Get the underlying cache.
   */
  getCache(): IRBACCache {
    return this.cache;
  }

  /**
   * Get the audit logger.
   */
  getAuditLogger(): IAuditLogger {
    return this.auditLogger;
  }

  /**
   * Get the role hierarchy resolver.
   */
  getHierarchyResolver(): RoleHierarchyResolver {
    return this.hierarchyResolver;
  }

  /**
   * Check if engine is initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the resolved engine options.
   * This returns the merged configuration with all defaults applied.
   */
  getOptions(): ResolvedRBACEngineOptions {
    return this.options;
  }
}
