"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionDeniedError = void 0;
const rbac_error_1 = require("./rbac.error");
class PermissionDeniedError extends rbac_error_1.RBACError {
    permission;
    resource;
    action;
    userId;
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
    static parsePermission(permission) {
        const parts = permission.split(':');
        return {
            resource: parts[0],
            action: parts[1],
            scope: parts[2],
        };
    }
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
    static isPermissionDenied(error) {
        return error instanceof PermissionDeniedError;
    }
    static forResource(permission, userId, resource, resourceId) {
        return new PermissionDeniedError(permission, userId, {
            resource,
            metadata: resourceId ? { resourceId } : undefined,
        });
    }
    static forOwnership(permission, userId, resourceOwnerId) {
        return new PermissionDeniedError(permission, userId, {
            denialReason: 'User does not own this resource',
            metadata: { resourceOwnerId },
        });
    }
    static forMissingRoles(permission, userId, requiredRoles, userRoles) {
        return new PermissionDeniedError(permission, userId, {
            checkedRoles: userRoles,
            denialReason: `Required one of roles: [${requiredRoles.join(', ')}], but user has: [${userRoles.join(', ')}]`,
        });
    }
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