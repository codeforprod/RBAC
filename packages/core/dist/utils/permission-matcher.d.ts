import { IPermission, IPermissionMatcher, IPermissionCheckResult } from '../interfaces/permission.interface';
import { PermissionOptions } from '../types/options.types';
/**
 * Context for conditional permission evaluation.
 * Used for Attribute-Based Access Control (ABAC) scenarios.
 */
export interface PermissionMatchContext {
    /** The current user ID */
    userId?: string;
    /** The owner of the resource being accessed */
    resourceOwnerId?: string;
    /** The organization/tenant ID */
    organizationId?: string | null;
    /** Custom attributes for condition evaluation */
    attributes?: Record<string, unknown>;
    /** Current timestamp (for time-based conditions) */
    timestamp?: Date;
}
/**
 * Result of finding matching permissions.
 */
export interface PermissionMatcherResult {
    /** Whether any permission matched */
    matched: boolean;
    /** The permission that matched (if any) */
    matchedPermission?: IPermission;
    /** The pattern that matched (for wildcard matches) */
    matchedPattern?: string;
    /** Score indicating match quality (higher = better match) */
    matchScore: number;
    /** Reason for match or non-match */
    reason: string;
}
/**
 * Implementation of IPermissionMatcher that supports wildcards and conditions.
 *
 * This class provides comprehensive permission matching including:
 * - Exact matches
 * - Wildcard matches (*, **)
 * - Scope-based matching
 * - Condition evaluation (ABAC)
 *
 * @example
 * ```typescript
 * const matcher = new PermissionMatcher();
 *
 * // Create some permissions
 * const permissions: IPermission[] = [
 *   { id: '1', resource: 'users', action: 'read' },
 *   { id: '2', resource: 'posts', action: '*' },  // All post actions
 *   { id: '3', resource: '*', action: 'read' },   // Read anything
 * ];
 *
 * // Check permissions
 * matcher.matches('users:read', permissions);     // true (exact)
 * matcher.matches('posts:delete', permissions);   // true (wildcard action)
 * matcher.matches('settings:read', permissions);  // true (wildcard resource)
 * matcher.matches('settings:write', permissions); // false
 * ```
 */
export declare class PermissionMatcher implements IPermissionMatcher {
    private readonly parser;
    private readonly options;
    /**
     * Creates a new PermissionMatcher.
     *
     * @param options - Permission options
     */
    constructor(options?: Partial<PermissionOptions>);
    /**
     * Check if any of the available permissions match the required permission(s).
     *
     * @param required - Required permission string or array of permission strings
     * @param available - Available permissions to check against
     * @param context - Optional context for conditional evaluation
     * @returns True if any required permission is satisfied
     *
     * @example
     * ```typescript
     * // Check single permission
     * const canRead = matcher.matches('users:read', userPermissions);
     *
     * // Check multiple permissions (OR logic - any match)
     * const canAccess = matcher.matches(['users:read', 'admin:*'], userPermissions);
     *
     * // With context for ABAC
     * const canEdit = matcher.matches('posts:update:own', userPermissions, {
     *   userId: 'user-123',
     *   resourceOwnerId: 'user-123'  // User owns the resource
     * });
     * ```
     */
    matches(required: string | string[], available: IPermission[], context?: Record<string, unknown>): boolean;
    /**
     * Check if all required permissions are satisfied.
     *
     * @param required - Array of required permissions
     * @param available - Available permissions
     * @param context - Optional context
     * @returns True if ALL required permissions are satisfied
     *
     * @example
     * ```typescript
     * // All must match
     * const canManage = matcher.matchesAll(
     *   ['users:read', 'users:write', 'users:delete'],
     *   userPermissions
     * );
     * ```
     */
    matchesAll(required: string[], available: IPermission[], context?: Record<string, unknown>): boolean;
    /**
     * Check if a wildcard pattern matches any available permissions.
     *
     * @param pattern - Wildcard pattern
     * @param permissions - Permissions to check against
     * @returns True if pattern matches any permission
     *
     * @example
     * ```typescript
     * // Check if user has any user-related permission
     * matcher.matchesWithWildcard('users:*', permissions);
     *
     * // Check if user can read anything
     * matcher.matchesWithWildcard('*:read', permissions);
     *
     * // Superadmin check
     * matcher.matchesWithWildcard('**', permissions);
     * ```
     */
    matchesWithWildcard(pattern: string, permissions: IPermission[]): boolean;
    /**
     * Parse a permission string into its components.
     *
     * @param permission - Permission string
     * @returns Parsed permission object
     */
    parse(permission: string): {
        resource: string;
        action: string;
        scope?: string;
    };
    /**
     * Normalize a permission to a standard format.
     *
     * @param permission - Permission string or partial object
     * @returns Normalized permission object
     */
    normalize(permission: string | Partial<IPermission>): IPermission;
    /**
     * Find the best matching permission from available permissions.
     *
     * @param required - Required permission string
     * @param available - Available permissions
     * @param context - Optional context
     * @returns Match result with details
     *
     * @example
     * ```typescript
     * const result = matcher.findBestMatch('users:read', permissions);
     * if (result.matched) {
     *   console.log(`Matched by: ${result.matchedPermission?.id}`);
     *   console.log(`Score: ${result.matchScore}`);
     * }
     * ```
     */
    findBestMatch(required: string, available: IPermission[], context?: PermissionMatchContext): PermissionMatcherResult;
    /**
     * Check a permission and return detailed result.
     *
     * @param required - Required permission string
     * @param available - Available permissions
     * @param context - Optional context
     * @returns Detailed check result
     */
    check(required: string, available: IPermission[], context?: PermissionMatchContext): IPermissionCheckResult;
    /**
     * Get all permissions that match a pattern.
     *
     * @param pattern - Pattern to match against
     * @param available - Available permissions
     * @returns Array of matching permissions
     */
    findAllMatches(pattern: string, available: IPermission[]): IPermission[];
    /**
     * Check if a permission satisfies a scope requirement.
     *
     * @param permission - Permission with scope
     * @param requiredScope - Required scope
     * @param context - Context for scope evaluation
     * @returns True if scope is satisfied
     */
    private checkScope;
    /**
     * Evaluate conditions on a permission.
     *
     * @param permission - Permission with conditions
     * @param context - Context for condition evaluation
     * @returns True if conditions are satisfied
     */
    private evaluateConditions;
    /**
     * Match a single required permission against available permissions.
     */
    private matchSingle;
    /**
     * Check if an available permission satisfies a required permission.
     */
    private permissionMatches;
    /**
     * Evaluate a match and return detailed result.
     */
    private evaluateMatch;
    /**
     * Convert a permission object to a string representation.
     */
    private permissionToString;
}
/**
 * Singleton instance of PermissionMatcher with default options.
 */
export declare const permissionMatcher: PermissionMatcher;
//# sourceMappingURL=permission-matcher.d.ts.map