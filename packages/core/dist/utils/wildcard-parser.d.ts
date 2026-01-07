import { PermissionOptions } from '../types/options.types';
/**
 * Represents the components of a parsed permission string.
 */
export interface ParsedPermission {
    /** The resource part (e.g., "users", "posts") */
    resource: string;
    /** The action part (e.g., "read", "write", "delete") */
    action: string;
    /** The optional scope part (e.g., "own", "all") */
    scope?: string;
    /** Whether the resource is a wildcard (*) */
    isResourceWildcard: boolean;
    /** Whether the action is a wildcard (*) */
    isActionWildcard: boolean;
    /** Whether this is a globstar (**) - matches everything */
    isGlobstar: boolean;
    /** Whether the scope is a wildcard (*) */
    isScopeWildcard: boolean;
    /** Whether this permission contains any wildcards */
    hasWildcard: boolean;
    /** The original permission string */
    original: string;
}
/**
 * Result of a wildcard match operation.
 */
export interface WildcardMatchResult {
    /** Whether the pattern matched */
    matches: boolean;
    /** The pattern that was tested */
    pattern: string;
    /** The permission that was matched against */
    permission: string;
    /** Which parts matched */
    matchedParts: {
        resource: boolean;
        action: boolean;
        scope: boolean;
    };
}
/**
 * Utility class for parsing and matching permission strings with wildcard support.
 *
 * Permission Format:
 * - `resource:action` - Basic format (e.g., "users:read")
 * - `resource:action:scope` - With scope (e.g., "posts:update:own")
 * - `resource:*` - Wildcard action (e.g., "users:*" matches all user actions)
 * - `*:action` - Wildcard resource (e.g., "*:read" matches read on any resource)
 * - `**` - Globstar (matches everything - superadmin)
 *
 * @example
 * ```typescript
 * const parser = new WildcardParser();
 *
 * // Parse a permission
 * const parsed = parser.parse('users:read:own');
 * console.log(parsed.resource); // 'users'
 * console.log(parsed.action);   // 'read'
 * console.log(parsed.scope);    // 'own'
 *
 * // Check if a pattern matches a permission
 * parser.matches('users:*', 'users:read');     // true
 * parser.matches('*:read', 'posts:read');      // true
 * parser.matches('**', 'anything:here');       // true
 * parser.matches('users:read', 'users:write'); // false
 * ```
 */
export declare class WildcardParser {
    private readonly separator;
    private readonly wildcardChar;
    private readonly globstarChar;
    private readonly caseSensitive;
    /**
     * Creates a new WildcardParser.
     *
     * @param options - Parser options
     */
    constructor(options?: Partial<PermissionOptions>);
    /**
     * Parse a permission string into its components.
     *
     * @param permission - Permission string to parse
     * @returns Parsed permission object
     *
     * @example
     * ```typescript
     * const result = parser.parse('users:read:own');
     * // { resource: 'users', action: 'read', scope: 'own', ... }
     *
     * const wildcard = parser.parse('**');
     * // { isGlobstar: true, ... }
     * ```
     */
    parse(permission: string): ParsedPermission;
    /**
     * Check if a pattern matches a permission.
     *
     * @param pattern - Pattern with potential wildcards
     * @param permission - Permission to check against
     * @returns True if pattern matches permission
     *
     * @example
     * ```typescript
     * parser.matches('users:*', 'users:read');      // true
     * parser.matches('users:*', 'users:write');     // true
     * parser.matches('users:read', 'users:read');   // true
     * parser.matches('users:read', 'users:write');  // false
     * parser.matches('*:read', 'posts:read');       // true
     * parser.matches('**', 'anything:here:really'); // true
     * ```
     */
    matches(pattern: string, permission: string): boolean;
    /**
     * Check if a pattern matches a permission with detailed results.
     *
     * @param pattern - Pattern with potential wildcards
     * @param permission - Permission to check against
     * @returns Detailed match result
     */
    matchesDetailed(pattern: string, permission: string): WildcardMatchResult;
    /**
     * Normalize a permission string to a standard format.
     *
     * @param permission - Permission string to normalize
     * @returns Normalized permission string
     *
     * @example
     * ```typescript
     * parser.normalize('USERS:READ');  // 'users:read' (case-insensitive mode)
     * parser.normalize('users');       // 'users:*' (adds wildcard action)
     * ```
     */
    normalize(permission: string): string;
    /**
     * Create a permission string from components.
     *
     * @param resource - Resource name
     * @param action - Action name
     * @param scope - Optional scope
     * @returns Permission string
     *
     * @example
     * ```typescript
     * parser.create('users', 'read');        // 'users:read'
     * parser.create('posts', 'update', 'own'); // 'posts:update:own'
     * ```
     */
    create(resource: string, action: string, scope?: string): string;
    /**
     * Create a wildcard permission for all actions on a resource.
     *
     * @param resource - Resource name
     * @returns Wildcard permission string
     *
     * @example
     * ```typescript
     * parser.createResourceWildcard('users'); // 'users:*'
     * ```
     */
    createResourceWildcard(resource: string): string;
    /**
     * Create a wildcard permission for an action on all resources.
     *
     * @param action - Action name
     * @returns Wildcard permission string
     *
     * @example
     * ```typescript
     * parser.createActionWildcard('read'); // '*:read'
     * ```
     */
    createActionWildcard(action: string): string;
    /**
     * Check if a permission string contains wildcards.
     *
     * @param permission - Permission string to check
     * @returns True if permission contains wildcards
     */
    hasWildcard(permission: string): boolean;
    /**
     * Get all concrete permissions that a pattern could match.
     * Useful for expanding wildcard permissions into specific permissions.
     *
     * @param pattern - Pattern with wildcards
     * @param availablePermissions - List of available permissions to match against
     * @returns Array of matching permissions
     *
     * @example
     * ```typescript
     * const available = ['users:read', 'users:write', 'posts:read', 'posts:write'];
     * parser.expand('users:*', available);
     * // ['users:read', 'users:write']
     * ```
     */
    expand(pattern: string, availablePermissions: string[]): string[];
    /**
     * Calculate the specificity of a permission pattern.
     * Higher values mean more specific (less wildcard).
     * Useful for determining which permission takes precedence.
     *
     * @param permission - Permission string
     * @returns Specificity score (0-3)
     *
     * @example
     * ```typescript
     * parser.getSpecificity('**');           // 0 (matches everything)
     * parser.getSpecificity('*:*');          // 0
     * parser.getSpecificity('users:*');      // 1
     * parser.getSpecificity('*:read');       // 1
     * parser.getSpecificity('users:read');   // 2
     * parser.getSpecificity('users:read:own'); // 3
     * ```
     */
    getSpecificity(permission: string): number;
    /**
     * Sort permissions by specificity (most specific first).
     *
     * @param permissions - Array of permission strings
     * @returns Sorted array (most specific first)
     */
    sortBySpecificity(permissions: string[]): string[];
    /**
     * Validate a permission string format.
     *
     * @param permission - Permission string to validate
     * @returns Validation result
     */
    validate(permission: string): {
        valid: boolean;
        error?: string;
    };
}
/**
 * Singleton instance of WildcardParser with default options.
 * Use this for simple cases or create your own instance for custom options.
 */
export declare const wildcardParser: WildcardParser;
//# sourceMappingURL=wildcard-parser.d.ts.map