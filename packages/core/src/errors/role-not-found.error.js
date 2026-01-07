"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleNotFoundError = void 0;
const rbac_error_1 = require("./rbac.error");
class RoleNotFoundError extends rbac_error_1.RBACError {
    roleId;
    roleName;
    organizationId;
    constructor(roleIdOrName, context = {}) {
        const message = RoleNotFoundError.buildMessage(roleIdOrName, context);
        super(message, rbac_error_1.RBACErrorCode.ROLE_NOT_FOUND, {
            roleId: context.searchType === 'name' ? undefined : roleIdOrName,
            roleName: context.searchType === 'name' ? roleIdOrName : undefined,
            ...context,
        });
        if (context.searchType === 'name') {
            this.roleName = roleIdOrName;
            this.roleId = context.roleId;
        }
        else {
            this.roleId = roleIdOrName;
            this.roleName = context.roleName;
        }
        this.organizationId = context.organizationId;
    }
    static buildMessage(roleIdOrName, context) {
        const searchType = context.searchType ?? 'id';
        let message = `Role not found: ${searchType === 'name' ? `name '${roleIdOrName}'` : `id '${roleIdOrName}'`}`;
        if (context.organizationId !== undefined) {
            message += context.organizationId
                ? ` in organization '${context.organizationId}'`
                : ' (global roles)';
        }
        if (context.operation) {
            message += `. Required for: ${context.operation}`;
        }
        return message;
    }
    static isRoleNotFound(error) {
        return error instanceof RoleNotFoundError;
    }
    static byName(name, organizationId) {
        return new RoleNotFoundError(name, {
            searchType: 'name',
            organizationId,
        });
    }
    static byId(id, organizationId) {
        return new RoleNotFoundError(id, {
            searchType: 'id',
            organizationId,
        });
    }
    static parentRole(parentRoleId, childRoleId) {
        return new RoleNotFoundError(parentRoleId, {
            searchType: 'id',
            operation: `parent role lookup for child role '${childRoleId}'`,
            metadata: { childRoleId },
        });
    }
    static forAssignment(roleId, userId) {
        return new RoleNotFoundError(roleId, {
            searchType: 'id',
            operation: `role assignment to user '${userId}'`,
            userId,
        });
    }
    static multiple(roleIds) {
        const id = roleIds.join(', ');
        return new RoleNotFoundError(id, {
            searchType: 'id',
            operation: 'multiple role lookup',
            metadata: { roleIds },
        });
    }
    toHttpResponse() {
        return {
            statusCode: 404,
            error: 'Not Found',
            message: this.message,
            roleId: this.roleId,
            roleName: this.roleName,
        };
    }
}
exports.RoleNotFoundError = RoleNotFoundError;
//# sourceMappingURL=role-not-found.error.js.map