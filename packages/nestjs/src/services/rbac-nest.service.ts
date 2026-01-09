import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import {
  RBACEngine,
  IRole,
  IPermission,
  IUserRoleAssignment,
  ICreateRoleOptions,
  IUpdateRoleOptions,
  ICreateUserRoleOptions,
  IUserAuthorizationContext,
  IDetailedPermissionCheckResult,
} from '@prodforcode/rbac-core';
import type { RbacModuleOptions } from '../types/module-options.types';
import { RBAC_OPTIONS_TOKEN } from '../providers';

/**
 * NestJS service wrapper for the RBAC engine.
 *
 * This service provides dependency injection support and integrates with
 * NestJS lifecycle hooks (OnModuleInit, OnModuleDestroy).
 *
 * @example Injection in a service
 * ```typescript
 * @Injectable()
 * export class UsersService {
 *   constructor(private readonly rbac: RBACNestService) {}
 *
 *   async canUserEditPost(userId: string, postId: string, authorId: string): Promise<boolean> {
 *     // Check if user can edit any post
 *     const canEditAny = await this.rbac.can(userId, 'posts:update');
 *     if (canEditAny) return true;
 *
 *     // Check if user can edit their own post
 *     return this.rbac.can(userId, 'posts:update:own', {
 *       resourceOwnerId: authorId,
 *       userId,
 *     });
 *   }
 * }
 * ```
 *
 * @example Direct permission checks
 * ```typescript
 * const canRead = await rbac.can('user-123', 'posts:read');
 * const canEdit = await rbac.canAll('user-123', ['posts:read', 'posts:update']);
 * const canViewAny = await rbac.canAny('user-123', ['posts:read', 'admin:**']);
 * ```
 */
@Injectable()
export class RBACNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RBACNestService.name);
  private engine: RBACEngine | null = null;

  constructor(
    @Inject(RBAC_OPTIONS_TOKEN)
    private readonly options: RbacModuleOptions,
  ) {}

  /**
   * Initialize the RBAC engine on module startup.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing RBAC engine...');

    this.engine = await RBACEngine.create({
      adapter: this.options.adapter,
      cache: this.options.cache,
      auditLogger: this.options.auditLogger,
      cacheOptions: this.options.cacheOptions,
      auditOptions: this.options.auditOptions,
      hierarchyOptions: this.options.hierarchyOptions,
      permissionOptions: this.options.permissionOptions,
      multiTenancyOptions: this.options.multiTenancyOptions,
      performanceOptions: this.options.performanceOptions,
      validationOptions: this.options.validationOptions,
      autoInitialize: this.options.autoInitialize ?? true,
      debug: this.options.debug,
    });

    this.logger.log('RBAC engine initialized successfully');
  }

  /**
   * Shutdown the RBAC engine on module destruction.
   */
  async onModuleDestroy(): Promise<void> {
    if (this.engine) {
      this.logger.log('Shutting down RBAC engine...');
      await this.engine.shutdown();
      this.engine = null;
      this.logger.log('RBAC engine shutdown complete');
    }
  }

  /**
   * Get the underlying RBAC engine instance.
   *
   * @throws Error if engine is not initialized
   */
  getEngine(): RBACEngine {
    if (!this.engine) {
      throw new Error('RBAC engine is not initialized');
    }
    return this.engine;
  }

  // ==========================================================================
  // PERMISSION CHECKING
  // ==========================================================================

  /**
   * Check if a user has a specific permission.
   *
   * @param userId - User ID
   * @param permission - Permission string (e.g., "users:read")
   * @param context - Optional authorization context
   * @returns True if user has the permission
   *
   * @example
   * ```typescript
   * const canRead = await rbac.can('user-123', 'users:read');
   * const canEditOwn = await rbac.can('user-123', 'posts:update:own', {
   *   resourceOwnerId: 'user-123',
   * });
   * ```
   */
  async can(
    userId: string,
    permission: string,
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<boolean> {
    return this.getEngine().can(userId, permission, context);
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
   *     throw new ForbiddenException(error.message);
   *   }
   * }
   * ```
   */
  async authorize(
    userId: string,
    permission: string,
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<void> {
    return this.getEngine().authorize(userId, permission, context);
  }

  /**
   * Check if a user has ANY of the specified permissions.
   *
   * @param userId - User ID
   * @param permissions - Array of permission strings
   * @param context - Optional context
   * @returns True if user has at least one permission
   *
   * @example
   * ```typescript
   * const canView = await rbac.canAny('user-123', [
   *   'posts:read',
   *   'posts:admin',
   *   'content:view',
   * ]);
   * ```
   */
  async canAny(
    userId: string,
    permissions: string[],
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<boolean> {
    return this.getEngine().canAny(userId, permissions, context);
  }

  /**
   * Check if a user has ALL of the specified permissions.
   *
   * @param userId - User ID
   * @param permissions - Array of permission strings
   * @param context - Optional context
   * @returns True if user has all permissions
   *
   * @example
   * ```typescript
   * const canPublish = await rbac.canAll('user-123', [
   *   'posts:update',
   *   'posts:publish',
   * ]);
   * ```
   */
  async canAll(
    userId: string,
    permissions: string[],
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<boolean> {
    return this.getEngine().canAll(userId, permissions, context);
  }

  /**
   * Check a permission with detailed results.
   *
   * @param userId - User ID
   * @param permission - Permission string
   * @param context - Optional context
   * @returns Detailed check result including matched permission and granting role
   *
   * @example
   * ```typescript
   * const result = await rbac.checkDetailed('user-123', 'posts:update');
   * if (result.allowed) {
   *   console.log(`Permission granted by role: ${result.grantedByRole?.name}`);
   *   console.log(`Matched permission: ${result.matchedPermission}`);
   * } else {
   *   console.log(`Denied: ${result.deniedReason}`);
   * }
   * ```
   */
  async checkDetailed(
    userId: string,
    permission: string,
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<IDetailedPermissionCheckResult> {
    return this.getEngine().checkDetailed(userId, permission, context);
  }

  /**
   * Get all effective permissions for a user.
   *
   * @param userId - User ID
   * @param organizationId - Optional organization ID
   * @returns Array of effective permissions
   *
   * @example
   * ```typescript
   * const permissions = await rbac.getEffectivePermissions('user-123');
   * console.log(`User has ${permissions.length} permissions`);
   * ```
   */
  async getEffectivePermissions(
    userId: string,
    organizationId?: string | null,
  ): Promise<IPermission[]> {
    return this.getEngine().getEffectivePermissions(userId, organizationId);
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
   * }, adminUserId);
   * ```
   */
  async createRole(options: ICreateRoleOptions, actorId?: string): Promise<IRole> {
    return this.getEngine().createRole(options, actorId);
  }

  /**
   * Update an existing role.
   *
   * @param roleId - Role ID to update
   * @param options - Update options
   * @param actorId - ID of the user making the update
   * @returns Updated role
   */
  async updateRole(roleId: string, options: IUpdateRoleOptions, actorId?: string): Promise<IRole> {
    return this.getEngine().updateRole(roleId, options, actorId);
  }

  /**
   * Delete a role.
   *
   * @param roleId - Role ID to delete
   * @param actorId - ID of the user deleting the role
   * @returns True if deleted
   */
  async deleteRole(roleId: string, actorId?: string): Promise<boolean> {
    return this.getEngine().deleteRole(roleId, actorId);
  }

  /**
   * Get a role by ID.
   *
   * @param roleId - Role ID
   * @returns Role or null
   */
  async getRole(roleId: string): Promise<IRole | null> {
    return this.getEngine().getRole(roleId);
  }

  /**
   * Get a role by name.
   *
   * @param name - Role name
   * @param organizationId - Optional organization ID
   * @returns Role or null
   */
  async getRoleByName(name: string, organizationId?: string | null): Promise<IRole | null> {
    return this.getEngine().getRoleByName(name, organizationId);
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
    actorId?: string,
  ): Promise<void> {
    return this.getEngine().addPermissionsToRole(roleId, permissionIds, actorId);
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
    actorId?: string,
  ): Promise<void> {
    return this.getEngine().removePermissionsFromRole(roleId, permissionIds, actorId);
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
   *   assignedBy: 'admin-user-id',
   * });
   *
   * // Temporary assignment
   * await rbac.assignRole({
   *   userId: 'user-123',
   *   roleId: 'premium-role-id',
   *   assignedBy: 'system',
   *   expiresAt: new Date('2025-12-31'),
   * });
   * ```
   */
  async assignRole(options: ICreateUserRoleOptions): Promise<IUserRoleAssignment> {
    return this.getEngine().assignRole(options);
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
    organizationId?: string | null,
  ): Promise<boolean> {
    return this.getEngine().removeRole(userId, roleId, actorId, organizationId);
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
    organizationId?: string | null,
  ): Promise<IUserRoleAssignment[]> {
    return this.getEngine().getUserRoles(userId, organizationId);
  }

  /**
   * Check if a user has a specific role.
   *
   * @param userId - User ID
   * @param roleId - Role ID or role name
   * @param organizationId - Optional organization ID
   * @returns True if user has the role
   */
  async hasRole(userId: string, roleId: string, organizationId?: string | null): Promise<boolean> {
    return this.getEngine().hasRole(userId, roleId, organizationId);
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
    return this.getEngine().invalidateUserCache(userId, organizationId);
  }

  /**
   * Invalidate all caches for a role.
   *
   * @param roleId - Role ID
   */
  async invalidateRoleCache(roleId: string): Promise<void> {
    return this.getEngine().invalidateRoleCache(roleId);
  }

  /**
   * Clear all RBAC caches.
   */
  async clearAllCaches(): Promise<void> {
    return this.getEngine().clearAllCaches();
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
    return this.getEngine().healthCheck();
  }

  /**
   * Check if the engine is initialized.
   */
  isInitialized(): boolean {
    return this.engine?.isInitialized() ?? false;
  }
}
