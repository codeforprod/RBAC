import { IPermission, IPermissionCheckResult } from '../interfaces/permission.interface';
import { IRole } from '../interfaces/role.interface';
import { IRBACAdapter } from '../interfaces/adapter.interface';
import {
  IRBACCache,
  DefaultCacheKeyGenerator,
  ICacheKeyGenerator,
} from '../interfaces/cache.interface';
import {
  IUserAuthorizationContext,
  IDetailedPermissionCheckResult,
  ICheckPermissionOptions,
} from '../interfaces/user.interface';
import { PermissionMatcher, PermissionMatchContext } from '../utils/permission-matcher';
import { RoleHierarchyResolver } from '../utils/role-hierarchy';
import { PermissionDeniedError } from '../errors/permission-denied.error';
import {
  PermissionOptions,
  CacheOptions,
  DEFAULT_PERMISSION_OPTIONS,
  DEFAULT_CACHE_OPTIONS,
} from '../types/options.types';

/**
 * Options for the PermissionChecker service.
 */
export interface PermissionCheckerOptions {
  /** Permission matching options */
  permissionOptions?: Partial<PermissionOptions>;

  /** Cache options */
  cacheOptions?: Partial<CacheOptions>;

  /** Whether to throw on permission denied (default: false) */
  throwOnDenied?: boolean;

  /** Cache key generator */
  cacheKeyGenerator?: ICacheKeyGenerator;
}

/**
 * Service for checking permissions against user roles.
 *
 * This service provides the core permission checking functionality:
 * - Checks if a user has specific permissions
 * - Resolves permissions through role hierarchy
 * - Supports wildcard matching
 * - Integrates with caching for performance
 *
 * @example
 * ```typescript
 * const checker = new PermissionChecker(adapter, hierarchyResolver, cache);
 *
 * // Simple check
 * const canRead = await checker.hasPermission('user-123', 'users:read');
 *
 * // Check with context
 * const canEdit = await checker.hasPermission('user-123', 'posts:update:own', {
 *   resourceOwnerId: 'user-123'
 * });
 *
 * // Detailed check
 * const result = await checker.checkPermissionDetailed({
 *   userId: 'user-123',
 *   permission: 'admin:delete',
 *   detailed: true
 * });
 * console.log(result.allowed, result.grantedByRole?.name);
 * ```
 */
export class PermissionChecker {
  private readonly adapter: IRBACAdapter;
  private readonly hierarchyResolver: RoleHierarchyResolver;
  private readonly cache?: IRBACCache;
  private readonly matcher: PermissionMatcher;
  private readonly keyGenerator: ICacheKeyGenerator;
  private readonly options: Required<PermissionCheckerOptions>;
  private readonly cacheOptions: CacheOptions;

  /**
   * Creates a new PermissionChecker.
   *
   * @param adapter - Database adapter
   * @param hierarchyResolver - Role hierarchy resolver
   * @param cache - Optional cache implementation
   * @param options - Checker options
   */
  constructor(
    adapter: IRBACAdapter,
    hierarchyResolver: RoleHierarchyResolver,
    cache?: IRBACCache,
    options: PermissionCheckerOptions = {},
  ) {
    this.adapter = adapter;
    this.hierarchyResolver = hierarchyResolver;
    this.cache = cache;

    const permissionOptions = { ...DEFAULT_PERMISSION_OPTIONS, ...options.permissionOptions };
    this.cacheOptions = { ...DEFAULT_CACHE_OPTIONS, ...options.cacheOptions };

    this.matcher = new PermissionMatcher(permissionOptions);
    this.keyGenerator =
      options.cacheKeyGenerator ??
      new DefaultCacheKeyGenerator({
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
   * // Basic check
   * const canRead = await checker.hasPermission('user-123', 'users:read');
   *
   * // With ownership check
   * const canEdit = await checker.hasPermission('user-123', 'posts:update:own', {
   *   resourceOwnerId: 'user-123'
   * });
   *
   * // With organization context
   * const canManage = await checker.hasPermission('user-123', 'teams:manage', {
   *   organizationId: 'org-456'
   * });
   * ```
   */
  async hasPermission(
    userId: string,
    permission: string,
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<boolean> {
    const result = await this.check({
      userId,
      permission,
      context,
    });

    if (!result.allowed && this.options.throwOnDenied) {
      throw new PermissionDeniedError(permission, userId, {
        resource: context?.resource,
        organizationId: context?.organizationId,
      });
    }

    return result.allowed;
  }

  /**
   * Check if a user has any of the specified permissions.
   *
   * @param userId - User ID
   * @param permissions - Array of permission strings
   * @param context - Optional authorization context
   * @returns True if user has ANY of the permissions
   *
   * @example
   * ```typescript
   * const canAccess = await checker.hasAnyPermission('user-123', [
   *   'posts:read',
   *   'posts:write',
   *   'admin:*'
   * ]);
   * ```
   */
  async hasAnyPermission(
    userId: string,
    permissions: string[],
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<boolean> {
    for (const permission of permissions) {
      const result = await this.check({ userId, permission, context });
      if (result.allowed) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a user has all of the specified permissions.
   *
   * @param userId - User ID
   * @param permissions - Array of permission strings
   * @param context - Optional authorization context
   * @returns True if user has ALL of the permissions
   *
   * @example
   * ```typescript
   * const canManage = await checker.hasAllPermissions('user-123', [
   *   'users:read',
   *   'users:write',
   *   'users:delete'
   * ]);
   * ```
   */
  async hasAllPermissions(
    userId: string,
    permissions: string[],
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<boolean> {
    for (const permission of permissions) {
      const result = await this.check({ userId, permission, context });
      if (!result.allowed) {
        if (this.options.throwOnDenied) {
          throw new PermissionDeniedError(permission, userId);
        }
        return false;
      }
    }
    return true;
  }

  /**
   * Check a permission and return detailed result.
   *
   * @param options - Check options
   * @returns Detailed check result
   *
   * @example
   * ```typescript
   * const result = await checker.checkPermissionDetailed({
   *   userId: 'user-123',
   *   permission: 'posts:delete',
   *   detailed: true
   * });
   *
   * if (result.allowed) {
   *   console.log(`Granted by role: ${result.grantedByRole?.name}`);
   *   console.log(`Matched permission: ${result.matchedPermission}`);
   * } else {
   *   console.log(`Denied: ${result.deniedReason}`);
   * }
   * ```
   */
  async checkPermissionDetailed(
    options: ICheckPermissionOptions,
  ): Promise<IDetailedPermissionCheckResult> {
    const startTime = Date.now();
    const { userId, permission, context, skipCache } = options;

    // Get user's effective permissions
    const { permissions, roles, fromCache } = await this.getUserEffectivePermissions(
      userId,
      context?.organizationId,
      skipCache,
    );

    // Build match context
    const matchContext: PermissionMatchContext = {
      userId,
      organizationId: context?.organizationId,
      resourceOwnerId: context?.resourceOwnerId,
      attributes: context?.attributes,
    };

    // Find the best matching permission
    const matchResult = this.matcher.findBestMatch(permission, permissions, matchContext);
    const checkDuration = Date.now() - startTime;

    if (matchResult.matched && matchResult.matchedPermission) {
      // Find which role granted this permission
      const grantedByRole = this.findRoleWithPermission(roles, matchResult.matchedPermission.id);

      return {
        allowed: true,
        requestedPermission: permission,
        matchedPermission: matchResult.matchedPattern,
        grantedByRole,
        checkedRoles: roles,
        context: context as IUserAuthorizationContext,
        checkDuration,
        fromCache,
      };
    }

    return {
      allowed: false,
      requestedPermission: permission,
      deniedReason: matchResult.reason,
      checkedRoles: roles,
      context: context as IUserAuthorizationContext,
      checkDuration,
      fromCache,
    };
  }

  /**
   * Get all effective permissions for a user.
   *
   * @param userId - User ID
   * @param organizationId - Optional organization ID
   * @param skipCache - Whether to skip cache
   * @returns User's effective permissions and roles
   */
  async getUserEffectivePermissions(
    userId: string,
    organizationId?: string | null,
    skipCache?: boolean,
  ): Promise<{ permissions: IPermission[]; roles: IRole[]; fromCache: boolean }> {
    const cacheKey = this.keyGenerator.forUserPermissions(userId, organizationId);

    // Check cache
    if (this.cache && this.cacheOptions.enabled && !skipCache) {
      const cached = await this.cache.get<{ permissions: IPermission[]; roles: IRole[] }>(cacheKey);
      if (cached) {
        return { ...cached, fromCache: true };
      }
    }

    // Get user's role assignments
    const assignments = await this.adapter.findUserRoleAssignments(userId, organizationId);

    // Filter active, non-expired assignments
    const now = new Date();
    const activeAssignments = assignments.filter(
      (a) => a.isActive && (!a.expiresAt || a.expiresAt > now),
    );

    // Get all roles
    const roleIds = activeAssignments.map((a) => a.roleId);
    const roles = await this.adapter.findRolesByIds(roleIds);
    const activeRoles = roles.filter((r) => r.isActive);

    // Collect all permissions including inherited
    const permissionMap = new Map<string, IPermission>();
    const allRoles: IRole[] = [];

    for (const role of activeRoles) {
      allRoles.push(role);

      // Get inherited permissions for this role
      const inheritedPermissions = await this.hierarchyResolver.getInheritedPermissions(role.id);

      for (const permission of inheritedPermissions) {
        permissionMap.set(permission.id, permission);
      }

      // Get parent roles
      const parentRoles = await this.hierarchyResolver.getParentRoles(role.id);
      allRoles.push(...parentRoles);
    }

    const result = {
      permissions: Array.from(permissionMap.values()),
      roles: [...new Map(allRoles.map((r) => [r.id, r])).values()], // Deduplicate
    };

    // Cache the result
    if (this.cache && this.cacheOptions.enabled) {
      await this.cache.set(cacheKey, result, {
        ttl: this.cacheOptions.userPermissionsTtl,
        tags: ['user-permissions', `user:${userId}`],
      });
    }

    return { ...result, fromCache: false };
  }

  /**
   * Invalidate cached permissions for a user.
   *
   * @param userId - User ID
   * @param organizationId - Optional organization ID
   */
  async invalidateUserCache(userId: string, organizationId?: string | null): Promise<void> {
    if (!this.cache) {
      return;
    }

    const cacheKey = this.keyGenerator.forUserPermissions(userId, organizationId);
    await this.cache.delete(cacheKey);

    // Also delete by pattern for all organizations
    await this.cache.deletePattern(this.keyGenerator.patternForUser(userId));
  }

  /**
   * Check a permission (internal method).
   */
  private async check(options: {
    userId: string;
    permission: string;
    context?: Partial<IUserAuthorizationContext>;
    skipCache?: boolean;
  }): Promise<IPermissionCheckResult> {
    const { userId, permission, context, skipCache } = options;

    // Get user's effective permissions
    const { permissions } = await this.getUserEffectivePermissions(
      userId,
      context?.organizationId,
      skipCache,
    );

    // Build match context
    const matchContext: PermissionMatchContext = {
      userId,
      organizationId: context?.organizationId,
      resourceOwnerId: context?.resourceOwnerId,
      attributes: context?.attributes,
    };

    // Check if any permission matches
    const checkResult = this.matcher.check(permission, permissions, matchContext);

    return checkResult;
  }

  /**
   * Find which role contains a specific permission.
   */
  private findRoleWithPermission(roles: IRole[], permissionId: string): IRole | undefined {
    for (const role of roles) {
      if (role.permissions.some((p) => p.id === permissionId)) {
        return role;
      }
    }
    return undefined;
  }
}
