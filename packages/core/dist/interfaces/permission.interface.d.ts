/**
 * Represents a permission that can be granted to roles.
 * Permissions follow the format: resource:action or resource:action:scope
 * Examples: "users:read", "posts:delete", "settings:update:system"
 */
export interface IPermission {
    /** Unique identifier for the permission */
    id: string;
    /** The resource this permission applies to (e.g., "users", "posts", "settings") */
    resource: string;
    /** The action that can be performed (e.g., "create", "read", "update", "delete") */
    action: string;
    /** Optional scope for fine-grained control (e.g., "own", "all", "system") */
    scope?: string;
    /** Optional conditions for attribute-based access control (ABAC) */
    conditions?: Record<string, unknown>;
    /** Additional metadata for the permission */
    metadata?: Record<string, unknown>;
    /** Human-readable description of the permission */
    description?: string;
    /** Timestamp when the permission was created */
    createdAt?: Date;
}
/**
 * Service for matching required permissions against available permissions.
 * Supports exact matches, wildcards, and pattern matching.
 */
export interface IPermissionMatcher {
    /**
     * Check if any of the available permissions match the required permission(s).
     *
     * @param required - Single permission string or array of permission strings
     * @param available - Array of available permissions to check against
     * @param context - Optional context for conditional permission evaluation
     * @returns True if any required permission is found in available permissions
     *
     * @example
     * matcher.matches('users:read', availablePermissions);
     * matcher.matches(['users:read', 'users:write'], availablePermissions);
     */
    matches(required: string | string[], available: IPermission[], context?: Record<string, unknown>): boolean;
    /**
     * Check if a wildcard pattern matches any available permissions.
     * Supports wildcards: * (any action) and ** (any resource and action)
     *
     * @param pattern - Wildcard pattern (e.g., "users:*", "*:read", "**")
     * @param permissions - Array of permissions to check against
     * @returns True if pattern matches any permission
     *
     * @example
     * matcher.matchesWithWildcard('users:*', permissions);  // Matches any user action
     * matcher.matchesWithWildcard('*:read', permissions);   // Matches read on any resource
     * matcher.matchesWithWildcard('**', permissions);       // Matches everything (superadmin)
     */
    matchesWithWildcard(pattern: string, permissions: IPermission[]): boolean;
    /**
     * Parse a permission string into its components.
     *
     * @param permission - Permission string in format "resource:action:scope"
     * @returns Parsed permission object
     *
     * @example
     * matcher.parse('users:read:own'); // { resource: 'users', action: 'read', scope: 'own' }
     */
    parse(permission: string): {
        resource: string;
        action: string;
        scope?: string;
    };
    /**
     * Normalize a permission to a standard format.
     *
     * @param permission - Permission string or object
     * @returns Normalized permission object
     */
    normalize(permission: string | Partial<IPermission>): IPermission;
}
/**
 * Result of a permission check operation.
 */
export interface IPermissionCheckResult {
    /** Whether the permission check passed */
    allowed: boolean;
    /** The permission that was checked */
    permission: string;
    /** Matched permission if allowed, or reason if denied */
    reason?: string;
    /** The matching permission from available permissions */
    matchedPermission?: IPermission;
    /** Context used for evaluation */
    context?: Record<string, unknown>;
}
//# sourceMappingURL=permission.interface.d.ts.map