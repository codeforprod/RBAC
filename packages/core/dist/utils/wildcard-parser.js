"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wildcardParser = exports.WildcardParser = void 0;
const options_types_1 = require("../types/options.types");
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
class WildcardParser {
    separator;
    wildcardChar;
    globstarChar;
    caseSensitive;
    /**
     * Creates a new WildcardParser.
     *
     * @param options - Parser options
     */
    constructor(options = {}) {
        const merged = { ...options_types_1.DEFAULT_PERMISSION_OPTIONS, ...options };
        this.separator = merged.separator;
        this.wildcardChar = merged.wildcardChar;
        this.globstarChar = merged.globstarChar;
        this.caseSensitive = merged.caseSensitive;
    }
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
    parse(permission) {
        const normalized = this.caseSensitive ? permission : permission.toLowerCase();
        // Check for globstar first
        if (normalized === this.globstarChar) {
            return {
                resource: this.globstarChar,
                action: this.globstarChar,
                scope: undefined,
                isResourceWildcard: true,
                isActionWildcard: true,
                isGlobstar: true,
                isScopeWildcard: true,
                hasWildcard: true,
                original: permission,
            };
        }
        const parts = normalized.split(this.separator);
        const resource = parts[0] ?? this.wildcardChar;
        const action = parts[1] ?? this.wildcardChar;
        const scope = parts[2];
        const isResourceWildcard = resource === this.wildcardChar;
        const isActionWildcard = action === this.wildcardChar;
        const isScopeWildcard = scope === this.wildcardChar;
        return {
            resource,
            action,
            scope,
            isResourceWildcard,
            isActionWildcard,
            isGlobstar: false,
            isScopeWildcard,
            hasWildcard: isResourceWildcard || isActionWildcard || isScopeWildcard,
            original: permission,
        };
    }
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
    matches(pattern, permission) {
        const parsedPattern = this.parse(pattern);
        const parsedPermission = this.parse(permission);
        // Globstar matches everything
        if (parsedPattern.isGlobstar) {
            return true;
        }
        // Check resource
        if (!parsedPattern.isResourceWildcard &&
            parsedPattern.resource !== parsedPermission.resource) {
            return false;
        }
        // Check action
        if (!parsedPattern.isActionWildcard &&
            parsedPattern.action !== parsedPermission.action) {
            return false;
        }
        // Check scope (if pattern has scope)
        if (parsedPattern.scope !== undefined && !parsedPattern.isScopeWildcard) {
            if (parsedPermission.scope === undefined ||
                parsedPattern.scope !== parsedPermission.scope) {
                return false;
            }
        }
        return true;
    }
    /**
     * Check if a pattern matches a permission with detailed results.
     *
     * @param pattern - Pattern with potential wildcards
     * @param permission - Permission to check against
     * @returns Detailed match result
     */
    matchesDetailed(pattern, permission) {
        const parsedPattern = this.parse(pattern);
        const parsedPermission = this.parse(permission);
        const matchedParts = {
            resource: parsedPattern.isGlobstar ||
                parsedPattern.isResourceWildcard ||
                parsedPattern.resource === parsedPermission.resource,
            action: parsedPattern.isGlobstar ||
                parsedPattern.isActionWildcard ||
                parsedPattern.action === parsedPermission.action,
            scope: parsedPattern.isGlobstar ||
                parsedPattern.isScopeWildcard ||
                parsedPattern.scope === undefined ||
                parsedPattern.scope === parsedPermission.scope,
        };
        return {
            matches: matchedParts.resource && matchedParts.action && matchedParts.scope,
            pattern,
            permission,
            matchedParts,
        };
    }
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
    normalize(permission) {
        const normalized = this.caseSensitive ? permission : permission.toLowerCase();
        const parts = normalized.split(this.separator);
        // If only resource is provided, assume wildcard action
        if (parts.length === 1) {
            return `${parts[0]}${this.separator}${this.wildcardChar}`;
        }
        return normalized;
    }
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
    create(resource, action, scope) {
        const parts = [resource, action];
        if (scope !== undefined) {
            parts.push(scope);
        }
        return parts.join(this.separator);
    }
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
    createResourceWildcard(resource) {
        return `${resource}${this.separator}${this.wildcardChar}`;
    }
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
    createActionWildcard(action) {
        return `${this.wildcardChar}${this.separator}${action}`;
    }
    /**
     * Check if a permission string contains wildcards.
     *
     * @param permission - Permission string to check
     * @returns True if permission contains wildcards
     */
    hasWildcard(permission) {
        return permission.includes(this.wildcardChar) ||
            permission === this.globstarChar ||
            permission.includes(this.globstarChar);
    }
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
    expand(pattern, availablePermissions) {
        return availablePermissions.filter(permission => this.matches(pattern, permission));
    }
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
    getSpecificity(permission) {
        const parsed = this.parse(permission);
        if (parsed.isGlobstar) {
            return 0;
        }
        let specificity = 0;
        if (!parsed.isResourceWildcard) {
            specificity++;
        }
        if (!parsed.isActionWildcard) {
            specificity++;
        }
        if (parsed.scope !== undefined && !parsed.isScopeWildcard) {
            specificity++;
        }
        return specificity;
    }
    /**
     * Sort permissions by specificity (most specific first).
     *
     * @param permissions - Array of permission strings
     * @returns Sorted array (most specific first)
     */
    sortBySpecificity(permissions) {
        return [...permissions].sort((a, b) => {
            const specA = this.getSpecificity(a);
            const specB = this.getSpecificity(b);
            return specB - specA; // Higher specificity first
        });
    }
    /**
     * Validate a permission string format.
     *
     * @param permission - Permission string to validate
     * @returns Validation result
     */
    validate(permission) {
        if (!permission || permission.trim() === '') {
            return { valid: false, error: 'Permission cannot be empty' };
        }
        const parts = permission.split(this.separator);
        if (parts.length > 3) {
            return {
                valid: false,
                error: `Permission has too many parts (max 3): ${permission}`,
            };
        }
        if (parts.some(part => part === '')) {
            return {
                valid: false,
                error: `Permission contains empty parts: ${permission}`,
            };
        }
        // Check for invalid characters (basic alphanumeric + wildcards)
        const validPattern = /^[a-zA-Z0-9_-]+$|^\*$|^\*\*$/;
        for (const part of parts) {
            if (!validPattern.test(part)) {
                return {
                    valid: false,
                    error: `Invalid characters in permission part: ${part}`,
                };
            }
        }
        return { valid: true };
    }
}
exports.WildcardParser = WildcardParser;
/**
 * Singleton instance of WildcardParser with default options.
 * Use this for simple cases or create your own instance for custom options.
 */
exports.wildcardParser = new WildcardParser();
//# sourceMappingURL=wildcard-parser.js.map