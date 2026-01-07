import { IPermission } from '../interfaces/permission.interface';
import { IRole } from '../interfaces/role.interface';
import { IRBACAdapter } from '../interfaces/adapter.interface';
import { IRBACCache, ICacheKeyGenerator } from '../interfaces/cache.interface';
import { IUserAuthorizationContext, IDetailedPermissionCheckResult, ICheckPermissionOptions } from '../interfaces/user.interface';
import { RoleHierarchyResolver } from '../utils/role-hierarchy';
import { PermissionOptions, CacheOptions } from '../types/options.types';
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
export declare class PermissionChecker {
    private readonly adapter;
    private readonly hierarchyResolver;
    private readonly cache?;
    private readonly matcher;
    private readonly keyGenerator;
    private readonly options;
    private readonly cacheOptions;
    /**
     * Creates a new PermissionChecker.
     *
     * @param adapter - Database adapter
     * @param hierarchyResolver - Role hierarchy resolver
     * @param cache - Optional cache implementation
     * @param options - Checker options
     */
    constructor(adapter: IRBACAdapter, hierarchyResolver: RoleHierarchyResolver, cache?: IRBACCache, options?: PermissionCheckerOptions);
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
    hasPermission(userId: string, permission: string, context?: Partial<IUserAuthorizationContext>): Promise<boolean>;
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
    hasAnyPermission(userId: string, permissions: string[], context?: Partial<IUserAuthorizationContext>): Promise<boolean>;
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
    hasAllPermissions(userId: string, permissions: string[], context?: Partial<IUserAuthorizationContext>): Promise<boolean>;
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
    checkPermissionDetailed(options: ICheckPermissionOptions): Promise<IDetailedPermissionCheckResult>;
    /**
     * Get all effective permissions for a user.
     *
     * @param userId - User ID
     * @param organizationId - Optional organization ID
     * @param skipCache - Whether to skip cache
     * @returns User's effective permissions and roles
     */
    getUserEffectivePermissions(userId: string, organizationId?: string | null, skipCache?: boolean): Promise<{
        permissions: IPermission[];
        roles: IRole[];
        fromCache: boolean;
    }>;
    /**
     * Invalidate cached permissions for a user.
     *
     * @param userId - User ID
     * @param organizationId - Optional organization ID
     */
    invalidateUserCache(userId: string, organizationId?: string | null): Promise<void>;
    /**
     * Check a permission (internal method).
     */
    private check;
    /**
     * Find which role contains a specific permission.
     */
    private findRoleWithPermission;
}
//# sourceMappingURL=permission-checker.service.d.ts.map