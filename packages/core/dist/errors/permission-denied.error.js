"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionDeniedError = void 0;
const rbac_error_1 = require("./rbac.error");
/**
 * Error thrown when a user lacks the required permission for an operation.
 * This is one of the most common RBAC errors in authorization flows.
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new PermissionDeniedError('posts:delete', 'user-123');
 *
 * // With resource context
 * throw new PermissionDeniedError('posts:delete', 'user-123', {
 *   resource: 'posts',
 *   resourceId: 'post-456'
 * });
 *
 * // Catching the error
 * try {
 *   await rbac.checkPermission(userId, 'admin:delete');
 * } catch (error) {
 *   if (error instanceof PermissionDeniedError) {
 *     res.status(403).json({
 *       error: 'Forbidden',
 *       permission: error.permission,
 *       message: error.message
 *     });
 *   }
 * }
 * ```
 */
class PermissionDeniedError extends rbac_error_1.RBACError {
    /** The permission that was denied */
    permission;
    /** The resource being accessed */
    resource;
    /** The action being attempted */
    action;
    /** The user ID who was denied */
    userId;
    /**
     * Creates a new PermissionDeniedError.
     *
     * @param permission - The permission that was denied (e.g., "users:delete")
     * @param userId - The user who was denied access
     * @param context - Additional context about the denial
     *
     * @example
     * ```typescript
     * // Simple permission denial
     * throw new PermissionDeniedError('admin:settings', 'user-123');
     *
     * // With full context
     * throw new PermissionDeniedError('posts:update:own', 'user-123', {
     *   resource: 'posts',
     *   resourceId: 'post-456',
     *   checkedRoles: ['viewer', 'commenter'],
     *   denialReason: 'User does not own this resource'
     * });
     * ```
     */
    constructor(permission, userId, context = {}) {
        const parsed = PermissionDeniedError.parsePermission(permission);
        const message = PermissionDeniedError.buildMessage(permission, userId, context);
        super(message, rbac_error_1.RBACErrorCode.PERMISSION_DENIED, {
            permission,
            userId,
            ...parsed,
            ...context,
        });
        this.permission = permission;
        this.resource = parsed.resource ?? context.resource;
        this.action = parsed.action ?? context.action;
        this.userId = userId;
    }
    /**
     * Parse a permission string into its components.
     *
     * @param permission - Permission string (e.g., "users:read:own")
     * @returns Parsed components
     */
    static parsePermission(permission) {
        const parts = permission.split(':');
        return {
            resource: parts[0],
            action: parts[1],
            scope: parts[2],
        };
    }
    /**
     * Build a human-readable error message.
     *
     * @param permission - The denied permission
     * @param userId - The user who was denied
     * @param context - Additional context
     * @returns Formatted error message
     */
    static buildMessage(permission, userId, context) {
        let message = `Permission denied: '${permission}'`;
        if (userId) {
            message += ` for user '${userId}'`;
        }
        if (context?.resource) {
            message += ` on resource '${context.resource}'`;
        }
        if (context?.denialReason) {
            message += `. Reason: ${context.denialReason}`;
        }
        return message;
    }
    /**
     * Check if an error is a PermissionDeniedError.
     *
     * @param error - Error to check
     * @returns True if the error is a PermissionDeniedError
     */
    static isPermissionDenied(error) {
        return error instanceof PermissionDeniedError;
    }
    /**
     * Create a PermissionDeniedError for a specific resource access attempt.
     *
     * @param permission - The permission required
     * @param userId - The user who was denied
     * @param resource - The resource being accessed
     * @param resourceId - The specific resource ID
     * @returns A new PermissionDeniedError
     *
     * @example
     * ```typescript
     * throw PermissionDeniedError.forResource(
     *   'posts:delete',
     *   'user-123',
     *   'posts',
     *   'post-456'
     * );
     * ```
     */
    static forResource(permission, userId, resource, resourceId) {
        return new PermissionDeniedError(permission, userId, {
            resource,
            metadata: resourceId ? { resourceId } : undefined,
        });
    }
    /**
     * Create a PermissionDeniedError for an ownership check failure.
     *
     * @param permission - The permission required
     * @param userId - The user who was denied
     * @param resourceOwnerId - The actual owner of the resource
     * @returns A new PermissionDeniedError
     *
     * @example
     * ```typescript
     * throw PermissionDeniedError.forOwnership(
     *   'posts:update:own',
     *   'user-123',
     *   'user-456' // actual owner
     * );
     * ```
     */
    static forOwnership(permission, userId, resourceOwnerId) {
        return new PermissionDeniedError(permission, userId, {
            denialReason: 'User does not own this resource',
            metadata: { resourceOwnerId },
        });
    }
    /**
     * Create a PermissionDeniedError when required roles are missing.
     *
     * @param permission - The permission required
     * @param userId - The user who was denied
     * @param requiredRoles - Roles that would grant the permission
     * @param userRoles - Roles the user actually has
     * @returns A new PermissionDeniedError
     */
    static forMissingRoles(permission, userId, requiredRoles, userRoles) {
        return new PermissionDeniedError(permission, userId, {
            checkedRoles: userRoles,
            denialReason: `Required one of roles: [${requiredRoles.join(', ')}], but user has: [${userRoles.join(', ')}]`,
        });
    }
    /**
     * Convert to a format suitable for HTTP error responses.
     *
     * @returns Object suitable for JSON response
     */
    toHttpResponse() {
        return {
            statusCode: 403,
            error: 'Forbidden',
            message: this.message,
            permission: this.permission,
            resource: this.resource,
        };
    }
}
exports.PermissionDeniedError = PermissionDeniedError;
//# sourceMappingURL=permission-denied.error.js.map