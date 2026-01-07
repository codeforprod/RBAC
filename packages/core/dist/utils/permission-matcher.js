"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionMatcher = exports.PermissionMatcher = void 0;
const wildcard_parser_1 = require("./wildcard-parser");
const options_types_1 = require("../types/options.types");
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
class PermissionMatcher {
    parser;
    options;
    /**
     * Creates a new PermissionMatcher.
     *
     * @param options - Permission options
     */
    constructor(options = {}) {
        this.options = { ...options_types_1.DEFAULT_PERMISSION_OPTIONS, ...options };
        this.parser = new wildcard_parser_1.WildcardParser(this.options);
    }
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
    matches(required, available, context) {
        const requiredArray = Array.isArray(required) ? required : [required];
        // Any required permission matching is sufficient
        for (const permission of requiredArray) {
            if (this.matchSingle(permission, available, context)) {
                return true;
            }
        }
        return false;
    }
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
    matchesAll(required, available, context) {
        for (const permission of required) {
            if (!this.matchSingle(permission, available, context)) {
                return false;
            }
        }
        return true;
    }
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
    matchesWithWildcard(pattern, permissions) {
        const parsedPattern = this.parser.parse(pattern);
        for (const permission of permissions) {
            const permString = this.permissionToString(permission);
            const parsedPerm = this.parser.parse(permString);
            // If the available permission itself is a globstar, it matches anything
            if (parsedPerm.isGlobstar) {
                return true;
            }
            // If the pattern is a globstar, it matches any permission
            if (parsedPattern.isGlobstar) {
                return true;
            }
            // Check if pattern matches permission
            if (this.parser.matches(pattern, permString)) {
                return true;
            }
            // Also check if permission (as pattern) matches the pattern (reverse)
            // This handles cases where available permission is a wildcard
            if (parsedPerm.hasWildcard && this.parser.matches(permString, pattern)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Parse a permission string into its components.
     *
     * @param permission - Permission string
     * @returns Parsed permission object
     */
    parse(permission) {
        const parsed = this.parser.parse(permission);
        return {
            resource: parsed.resource,
            action: parsed.action,
            scope: parsed.scope,
        };
    }
    /**
     * Normalize a permission to a standard format.
     *
     * @param permission - Permission string or partial object
     * @returns Normalized permission object
     */
    normalize(permission) {
        if (typeof permission === 'string') {
            const parsed = this.parser.parse(permission);
            return {
                id: `perm_${parsed.resource}_${parsed.action}${parsed.scope ? `_${parsed.scope}` : ''}`,
                resource: parsed.resource,
                action: parsed.action,
                scope: parsed.scope,
            };
        }
        return {
            id: permission.id ?? `perm_${permission.resource ?? 'unknown'}_${permission.action ?? 'unknown'}`,
            resource: permission.resource ?? '*',
            action: permission.action ?? '*',
            scope: permission.scope,
            conditions: permission.conditions,
            metadata: permission.metadata,
            description: permission.description,
            createdAt: permission.createdAt,
        };
    }
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
    findBestMatch(required, available, context) {
        const parsedRequired = this.parser.parse(required);
        let bestMatch = {
            matched: false,
            matchScore: 0,
            reason: 'No matching permission found',
        };
        for (const permission of available) {
            const permString = this.permissionToString(permission);
            const parsedAvailable = this.parser.parse(permString);
            // Check if this permission matches
            const matchResult = this.evaluateMatch(parsedRequired, parsedAvailable, permission, context);
            if (matchResult.matched && matchResult.matchScore > bestMatch.matchScore) {
                bestMatch = matchResult;
            }
        }
        return bestMatch;
    }
    /**
     * Check a permission and return detailed result.
     *
     * @param required - Required permission string
     * @param available - Available permissions
     * @param context - Optional context
     * @returns Detailed check result
     */
    check(required, available, context) {
        const result = this.findBestMatch(required, available, context);
        return {
            allowed: result.matched,
            permission: required,
            reason: result.reason,
            matchedPermission: result.matchedPermission,
            context: context,
        };
    }
    /**
     * Get all permissions that match a pattern.
     *
     * @param pattern - Pattern to match against
     * @param available - Available permissions
     * @returns Array of matching permissions
     */
    findAllMatches(pattern, available) {
        return available.filter(permission => {
            const permString = this.permissionToString(permission);
            return this.parser.matches(pattern, permString) ||
                this.parser.matches(permString, pattern);
        });
    }
    /**
     * Check if a permission satisfies a scope requirement.
     *
     * @param permission - Permission with scope
     * @param requiredScope - Required scope
     * @param context - Context for scope evaluation
     * @returns True if scope is satisfied
     */
    checkScope(permission, requiredScope, context) {
        // No scope required
        if (!requiredScope) {
            return true;
        }
        // Permission has no scope but scope is required
        if (!permission.scope) {
            return false;
        }
        // Wildcard scope matches any scope
        if (permission.scope === '*') {
            return true;
        }
        // Check 'own' scope
        if (requiredScope === 'own' && permission.scope === 'own') {
            if (context?.userId && context?.resourceOwnerId) {
                return context.userId === context.resourceOwnerId;
            }
            // If we can't determine ownership, deny
            return false;
        }
        // Check 'all' scope - grants access to 'own' as well
        if (requiredScope === 'own' && permission.scope === 'all') {
            return true;
        }
        // Exact scope match
        return permission.scope === requiredScope;
    }
    /**
     * Evaluate conditions on a permission.
     *
     * @param permission - Permission with conditions
     * @param context - Context for condition evaluation
     * @returns True if conditions are satisfied
     */
    evaluateConditions(permission, context) {
        if (!permission.conditions || Object.keys(permission.conditions).length === 0) {
            return true;
        }
        const attributes = context?.attributes ?? {};
        for (const [key, value] of Object.entries(permission.conditions)) {
            const contextValue = attributes[key];
            // Simple equality check
            if (contextValue !== value) {
                return false;
            }
        }
        return true;
    }
    /**
     * Match a single required permission against available permissions.
     */
    matchSingle(required, available, context) {
        const parsedRequired = this.parser.parse(required);
        for (const permission of available) {
            const permString = this.permissionToString(permission);
            const parsedAvailable = this.parser.parse(permString);
            // Check if available permission matches required
            if (this.permissionMatches(parsedRequired, parsedAvailable, permission, context)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if an available permission satisfies a required permission.
     */
    permissionMatches(required, available, permission, context) {
        // Globstar matches everything
        if (available.isGlobstar) {
            return this.evaluateConditions(permission, context);
        }
        // Check resource
        if (!available.isResourceWildcard &&
            !required.isResourceWildcard &&
            available.resource !== required.resource) {
            return false;
        }
        // Check action
        if (!available.isActionWildcard &&
            !required.isActionWildcard &&
            available.action !== required.action) {
            return false;
        }
        // Check scope
        if (!this.checkScope(permission, required.scope, context)) {
            return false;
        }
        // Check conditions
        if (!this.evaluateConditions(permission, context)) {
            return false;
        }
        return true;
    }
    /**
     * Evaluate a match and return detailed result.
     */
    evaluateMatch(required, available, permission, context) {
        const permString = this.permissionToString(permission);
        // Check if matches
        if (!this.permissionMatches(required, available, permission, context)) {
            return {
                matched: false,
                matchScore: 0,
                reason: 'Permission does not match required',
            };
        }
        // Calculate match score (higher = more specific match)
        let score = 0;
        // Exact resource match is better than wildcard
        if (!available.isResourceWildcard) {
            score += 10;
        }
        // Exact action match is better than wildcard
        if (!available.isActionWildcard) {
            score += 10;
        }
        // Exact scope match is better than wildcard
        if (permission.scope && permission.scope !== '*') {
            score += 5;
        }
        // Having conditions adds specificity
        if (permission.conditions && Object.keys(permission.conditions).length > 0) {
            score += 3;
        }
        // Determine match reason
        let reason;
        if (available.isGlobstar) {
            reason = 'Matched by superadmin permission (**)';
        }
        else if (available.isResourceWildcard && available.isActionWildcard) {
            reason = `Matched by full wildcard (*:*)`;
        }
        else if (available.isResourceWildcard) {
            reason = `Matched by resource wildcard (*:${available.action})`;
        }
        else if (available.isActionWildcard) {
            reason = `Matched by action wildcard (${available.resource}:*)`;
        }
        else {
            reason = `Exact match: ${permString}`;
        }
        return {
            matched: true,
            matchedPermission: permission,
            matchedPattern: permString,
            matchScore: score,
            reason,
        };
    }
    /**
     * Convert a permission object to a string representation.
     */
    permissionToString(permission) {
        let str = `${permission.resource}${this.options.separator}${permission.action}`;
        if (permission.scope) {
            str += `${this.options.separator}${permission.scope}`;
        }
        return str;
    }
}
exports.PermissionMatcher = PermissionMatcher;
/**
 * Singleton instance of PermissionMatcher with default options.
 */
exports.permissionMatcher = new PermissionMatcher();
//# sourceMappingURL=permission-matcher.js.map