import { PermissionOptions, DEFAULT_PERMISSION_OPTIONS } from '../types/options.types';

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
export class WildcardParser {
  private readonly separator: string;
  private readonly wildcardChar: string;
  private readonly globstarChar: string;
  private readonly caseSensitive: boolean;

  /**
   * Creates a new WildcardParser.
   *
   * @param options - Parser options
   */
  constructor(options: Partial<PermissionOptions> = {}) {
    const merged = { ...DEFAULT_PERMISSION_OPTIONS, ...options };
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
  parse(permission: string): ParsedPermission {
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
  matches(pattern: string, permission: string): boolean {
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
  matchesDetailed(pattern: string, permission: string): WildcardMatchResult {
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
  normalize(permission: string): string {
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
  create(resource: string, action: string, scope?: string): string {
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
  createResourceWildcard(resource: string): string {
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
  createActionWildcard(action: string): string {
    return `${this.wildcardChar}${this.separator}${action}`;
  }

  /**
   * Check if a permission string contains wildcards.
   *
   * @param permission - Permission string to check
   * @returns True if permission contains wildcards
   */
  hasWildcard(permission: string): boolean {
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
  expand(pattern: string, availablePermissions: string[]): string[] {
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
  getSpecificity(permission: string): number {
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
  sortBySpecificity(permissions: string[]): string[] {
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
  validate(permission: string): { valid: boolean; error?: string } {
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

/**
 * Singleton instance of WildcardParser with default options.
 * Use this for simple cases or create your own instance for custom options.
 */
export const wildcardParser = new WildcardParser();
