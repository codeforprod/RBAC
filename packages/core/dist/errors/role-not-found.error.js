"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleNotFoundError = void 0;
const rbac_error_1 = require("./rbac.error");
/**
 * Error thrown when a role cannot be found in the system.
 * This error is commonly encountered during:
 * - Role assignment operations
 * - Permission inheritance resolution
 * - Role hierarchy operations
 * - Role management operations
 *
 * @example
 * ```typescript
 * // When role ID is not found
 * throw new RoleNotFoundError('missing-role-id');
 *
 * // When role name is not found
 * throw RoleNotFoundError.byName('admin', 'org-123');
 *
 * // Catching the error
 * try {
 *   const role = await rbac.getRole('role-id');
 * } catch (error) {
 *   if (error instanceof RoleNotFoundError) {
 *     res.status(404).json({
 *       error: 'Not Found',
 *       message: error.message
 *     });
 *   }
 * }
 * ```
 */
class RoleNotFoundError extends rbac_error_1.RBACError {
    /** The role ID that was not found */
    roleId;
    /** The role name that was not found */
    roleName;
    /** Organization ID where the search was performed */
    organizationId;
    /**
     * Creates a new RoleNotFoundError.
     *
     * @param roleIdOrName - The role ID or name that was not found
     * @param context - Additional context about the search
     *
     * @example
     * ```typescript
     * // Role not found by ID
     * throw new RoleNotFoundError('abc-123');
     *
     * // With organization context
     * throw new RoleNotFoundError('admin', {
     *   searchType: 'name',
     *   organizationId: 'org-456'
     * });
     * ```
     */
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
    /**
     * Build a human-readable error message.
     *
     * @param roleIdOrName - The role identifier
     * @param context - Additional context
     * @returns Formatted error message
     */
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
    /**
     * Check if an error is a RoleNotFoundError.
     *
     * @param error - Error to check
     * @returns True if the error is a RoleNotFoundError
     */
    static isRoleNotFound(error) {
        return error instanceof RoleNotFoundError;
    }
    /**
     * Create a RoleNotFoundError for a role searched by name.
     *
     * @param name - The role name that was not found
     * @param organizationId - The organization ID where the search was performed
     * @returns A new RoleNotFoundError
     *
     * @example
     * ```typescript
     * throw RoleNotFoundError.byName('admin', 'org-123');
     * ```
     */
    static byName(name, organizationId) {
        return new RoleNotFoundError(name, {
            searchType: 'name',
            organizationId,
        });
    }
    /**
     * Create a RoleNotFoundError for a role searched by ID.
     *
     * @param id - The role ID that was not found
     * @param organizationId - The organization ID where the search was performed
     * @returns A new RoleNotFoundError
     *
     * @example
     * ```typescript
     * throw RoleNotFoundError.byId('role-abc-123');
     * ```
     */
    static byId(id, organizationId) {
        return new RoleNotFoundError(id, {
            searchType: 'id',
            organizationId,
        });
    }
    /**
     * Create a RoleNotFoundError for a parent role in hierarchy.
     *
     * @param parentRoleId - The parent role ID that was not found
     * @param childRoleId - The child role that references the missing parent
     * @returns A new RoleNotFoundError
     *
     * @example
     * ```typescript
     * throw RoleNotFoundError.parentRole('parent-id', 'child-id');
     * ```
     */
    static parentRole(parentRoleId, childRoleId) {
        return new RoleNotFoundError(parentRoleId, {
            searchType: 'id',
            operation: `parent role lookup for child role '${childRoleId}'`,
            metadata: { childRoleId },
        });
    }
    /**
     * Create a RoleNotFoundError for role assignment.
     *
     * @param roleId - The role ID that was not found
     * @param userId - The user ID that was being assigned the role
     * @returns A new RoleNotFoundError
     *
     * @example
     * ```typescript
     * throw RoleNotFoundError.forAssignment('role-123', 'user-456');
     * ```
     */
    static forAssignment(roleId, userId) {
        return new RoleNotFoundError(roleId, {
            searchType: 'id',
            operation: `role assignment to user '${userId}'`,
            userId,
        });
    }
    /**
     * Create a RoleNotFoundError when multiple roles are not found.
     *
     * @param roleIds - The role IDs that were not found
     * @returns A new RoleNotFoundError
     *
     * @example
     * ```typescript
     * throw RoleNotFoundError.multiple(['role-1', 'role-2', 'role-3']);
     * ```
     */
    static multiple(roleIds) {
        const id = roleIds.join(', ');
        return new RoleNotFoundError(id, {
            searchType: 'id',
            operation: 'multiple role lookup',
            metadata: { roleIds },
        });
    }
    /**
     * Convert to a format suitable for HTTP error responses.
     *
     * @returns Object suitable for JSON response
     */
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