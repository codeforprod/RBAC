import { RBACError, RBACErrorContext } from './rbac.error';
/**
 * Context specific to role not found errors.
 */
export interface RoleNotFoundContext extends Partial<RBACErrorContext> {
    /** The role ID that was not found */
    roleId?: string;
    /** The role name that was not found */
    roleName?: string;
    /** Organization ID where the search was performed */
    organizationId?: string | null;
    /** Whether the search was by ID or name */
    searchType?: 'id' | 'name';
    /** Operation that required the role */
    operation?: string;
}
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
export declare class RoleNotFoundError extends RBACError {
    /** The role ID that was not found */
    readonly roleId?: string;
    /** The role name that was not found */
    readonly roleName?: string;
    /** Organization ID where the search was performed */
    readonly organizationId?: string | null;
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
    constructor(roleIdOrName: string, context?: Partial<RoleNotFoundContext>);
    /**
     * Build a human-readable error message.
     *
     * @param roleIdOrName - The role identifier
     * @param context - Additional context
     * @returns Formatted error message
     */
    private static buildMessage;
    /**
     * Check if an error is a RoleNotFoundError.
     *
     * @param error - Error to check
     * @returns True if the error is a RoleNotFoundError
     */
    static isRoleNotFound(error: unknown): error is RoleNotFoundError;
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
    static byName(name: string, organizationId?: string | null): RoleNotFoundError;
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
    static byId(id: string, organizationId?: string | null): RoleNotFoundError;
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
    static parentRole(parentRoleId: string, childRoleId: string): RoleNotFoundError;
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
    static forAssignment(roleId: string, userId: string): RoleNotFoundError;
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
    static multiple(roleIds: string[]): RoleNotFoundError;
    /**
     * Convert to a format suitable for HTTP error responses.
     *
     * @returns Object suitable for JSON response
     */
    toHttpResponse(): {
        statusCode: number;
        error: string;
        message: string;
        roleId?: string;
        roleName?: string;
    };
}
//# sourceMappingURL=role-not-found.error.d.ts.map