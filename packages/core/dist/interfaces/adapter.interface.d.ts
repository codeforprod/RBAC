import { IPermission } from './permission.interface';
import { IRole, ICreateRoleOptions, IUpdateRoleOptions } from './role.interface';
import { IUserRoleAssignment, ICreateUserRoleOptions } from './user.interface';
/**
 * Query options for filtering and pagination.
 */
export interface IQueryOptions {
    /** Maximum number of results to return */
    limit?: number;
    /** Number of results to skip (for pagination) */
    offset?: number;
    /** Field to sort by */
    sortBy?: string;
    /** Sort direction */
    sortOrder?: 'asc' | 'desc';
    /** Filter by organization ID (for multi-tenant scenarios) */
    organizationId?: string | null;
    /** Include inactive records */
    includeInactive?: boolean;
}
/**
 * Paginated result wrapper.
 */
export interface IPaginatedResult<T> {
    /** Array of results */
    data: T[];
    /** Total count of matching records */
    total: number;
    /** Number of results returned */
    count: number;
    /** Current offset */
    offset: number;
    /** Whether there are more results */
    hasMore: boolean;
}
/**
 * Transaction context for database operations.
 * Adapters can use this to maintain transactional consistency.
 */
export interface ITransactionContext {
    /** Unique transaction identifier */
    id: string;
    /** Whether the transaction is active */
    isActive: boolean;
    /** Adapter-specific transaction handle */
    handle?: unknown;
}
/**
 * Database adapter interface for RBAC operations.
 * Implement this interface to integrate with any database (TypeORM, Mongoose, Prisma, etc.)
 *
 * @example
 * ```typescript
 * class TypeORMAdapter implements IRBACAdapter {
 *   async findRoleById(id: string): Promise<IRole | null> {
 *     return this.roleRepository.findOne({ where: { id } });
 *   }
 *   // ... implement other methods
 * }
 * ```
 */
export interface IRBACAdapter {
    /**
     * Find a role by its unique identifier.
     *
     * @param id - The role ID
     * @returns The role or null if not found
     *
     * @example
     * ```typescript
     * const role = await adapter.findRoleById('admin-role-id');
     * if (role) {
     *   console.log(`Found role: ${role.name}`);
     * }
     * ```
     */
    findRoleById(id: string): Promise<IRole | null>;
    /**
     * Find a role by its name within an organization.
     *
     * @param name - The role name
     * @param organizationId - Optional organization ID for multi-tenant scenarios
     * @returns The role or null if not found
     *
     * @example
     * ```typescript
     * const adminRole = await adapter.findRoleByName('admin');
     * const orgAdminRole = await adapter.findRoleByName('admin', 'org-123');
     * ```
     */
    findRoleByName(name: string, organizationId?: string | null): Promise<IRole | null>;
    /**
     * Find multiple roles by their IDs.
     *
     * @param ids - Array of role IDs
     * @returns Array of found roles (may be fewer than requested if some don't exist)
     *
     * @example
     * ```typescript
     * const roles = await adapter.findRolesByIds(['role-1', 'role-2', 'role-3']);
     * ```
     */
    findRolesByIds(ids: string[]): Promise<IRole[]>;
    /**
     * Find all roles with optional filtering and pagination.
     *
     * @param options - Query options for filtering and pagination
     * @returns Paginated result of roles
     *
     * @example
     * ```typescript
     * const result = await adapter.findAllRoles({
     *   limit: 10,
     *   offset: 0,
     *   organizationId: 'org-123',
     *   includeInactive: false
     * });
     * console.log(`Found ${result.total} roles`);
     * ```
     */
    findAllRoles(options?: IQueryOptions): Promise<IPaginatedResult<IRole>>;
    /**
     * Create a new role.
     *
     * @param options - Role creation options
     * @returns The created role
     * @throws {Error} If role name already exists within organization
     *
     * @example
     * ```typescript
     * const role = await adapter.createRole({
     *   name: 'editor',
     *   displayName: 'Content Editor',
     *   description: 'Can edit and publish content',
     *   parentRoles: ['viewer-role-id']
     * });
     * ```
     */
    createRole(options: ICreateRoleOptions): Promise<IRole>;
    /**
     * Update an existing role.
     *
     * @param id - The role ID to update
     * @param options - Fields to update
     * @returns The updated role
     * @throws {Error} If role not found
     *
     * @example
     * ```typescript
     * const updated = await adapter.updateRole('role-id', {
     *   displayName: 'Senior Editor',
     *   description: 'Updated description'
     * });
     * ```
     */
    updateRole(id: string, options: IUpdateRoleOptions): Promise<IRole>;
    /**
     * Delete a role by ID.
     *
     * @param id - The role ID to delete
     * @returns True if deleted, false if not found
     * @throws {Error} If role is a system role and cannot be deleted
     *
     * @example
     * ```typescript
     * const deleted = await adapter.deleteRole('role-id');
     * if (deleted) {
     *   console.log('Role deleted successfully');
     * }
     * ```
     */
    deleteRole(id: string): Promise<boolean>;
    /**
     * Find roles that have a specific role as their parent.
     *
     * @param parentRoleId - The parent role ID
     * @returns Array of child roles
     *
     * @example
     * ```typescript
     * const childRoles = await adapter.findChildRoles('admin-role-id');
     * ```
     */
    findChildRoles(parentRoleId: string): Promise<IRole[]>;
    /**
     * Find a permission by its unique identifier.
     *
     * @param id - The permission ID
     * @returns The permission or null if not found
     */
    findPermissionById(id: string): Promise<IPermission | null>;
    /**
     * Find a permission by resource, action, and optional scope.
     *
     * @param resource - The resource name
     * @param action - The action name
     * @param scope - Optional scope
     * @returns The permission or null if not found
     *
     * @example
     * ```typescript
     * const permission = await adapter.findPermissionByResourceAction('users', 'read', 'own');
     * ```
     */
    findPermissionByResourceAction(resource: string, action: string, scope?: string): Promise<IPermission | null>;
    /**
     * Find multiple permissions by their IDs.
     *
     * @param ids - Array of permission IDs
     * @returns Array of found permissions
     */
    findPermissionsByIds(ids: string[]): Promise<IPermission[]>;
    /**
     * Find all permissions with optional filtering.
     *
     * @param options - Query options
     * @returns Paginated result of permissions
     */
    findAllPermissions(options?: IQueryOptions): Promise<IPaginatedResult<IPermission>>;
    /**
     * Create a new permission.
     *
     * @param permission - Permission data
     * @returns The created permission
     */
    createPermission(permission: Omit<IPermission, 'id' | 'createdAt'>): Promise<IPermission>;
    /**
     * Update an existing permission.
     *
     * @param id - Permission ID
     * @param updates - Fields to update
     * @returns The updated permission
     */
    updatePermission(id: string, updates: Partial<IPermission>): Promise<IPermission>;
    /**
     * Delete a permission.
     *
     * @param id - Permission ID
     * @returns True if deleted
     */
    deletePermission(id: string): Promise<boolean>;
    /**
     * Find all permissions assigned to a role (direct assignments only).
     *
     * @param roleId - The role ID
     * @returns Array of directly assigned permissions
     */
    findPermissionsByRoleId(roleId: string): Promise<IPermission[]>;
    /**
     * Assign permissions to a role.
     *
     * @param roleId - The role ID
     * @param permissionIds - Array of permission IDs to assign
     */
    assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void>;
    /**
     * Remove permissions from a role.
     *
     * @param roleId - The role ID
     * @param permissionIds - Array of permission IDs to remove
     */
    removePermissionsFromRole(roleId: string, permissionIds: string[]): Promise<void>;
    /**
     * Find all role assignments for a user.
     *
     * @param userId - The user ID
     * @param organizationId - Optional organization ID for multi-tenant scenarios
     * @returns Array of user-role assignments
     *
     * @example
     * ```typescript
     * const assignments = await adapter.findUserRoleAssignments('user-123');
     * const roles = assignments.map(a => a.role);
     * ```
     */
    findUserRoleAssignments(userId: string, organizationId?: string | null): Promise<IUserRoleAssignment[]>;
    /**
     * Find all users assigned to a specific role.
     *
     * @param roleId - The role ID
     * @param options - Query options
     * @returns Paginated result of user-role assignments
     */
    findUsersByRoleId(roleId: string, options?: IQueryOptions): Promise<IPaginatedResult<IUserRoleAssignment>>;
    /**
     * Assign a role to a user.
     *
     * @param options - Assignment options
     * @returns The created assignment
     *
     * @example
     * ```typescript
     * const assignment = await adapter.assignRoleToUser({
     *   userId: 'user-123',
     *   roleId: 'admin-role-id',
     *   assignedBy: 'admin-user-id',
     *   expiresAt: new Date('2025-12-31')
     * });
     * ```
     */
    assignRoleToUser(options: ICreateUserRoleOptions): Promise<IUserRoleAssignment>;
    /**
     * Remove a role from a user.
     *
     * @param userId - The user ID
     * @param roleId - The role ID
     * @param organizationId - Optional organization ID
     * @returns True if removed
     */
    removeRoleFromUser(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;
    /**
     * Check if a user has a specific role.
     *
     * @param userId - The user ID
     * @param roleId - The role ID
     * @param organizationId - Optional organization ID
     * @returns True if user has the role
     */
    userHasRole(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;
    /**
     * Begin a database transaction.
     * Implementing this is optional but recommended for complex operations.
     *
     * @returns Transaction context
     */
    beginTransaction?(): Promise<ITransactionContext>;
    /**
     * Commit a transaction.
     *
     * @param context - Transaction context from beginTransaction
     */
    commitTransaction?(context: ITransactionContext): Promise<void>;
    /**
     * Rollback a transaction.
     *
     * @param context - Transaction context from beginTransaction
     */
    rollbackTransaction?(context: ITransactionContext): Promise<void>;
    /**
     * Initialize the adapter (e.g., create tables, indexes).
     * Called once during RBAC engine initialization.
     */
    initialize?(): Promise<void>;
    /**
     * Gracefully shutdown the adapter.
     * Called when the application is shutting down.
     */
    shutdown?(): Promise<void>;
    /**
     * Health check for the adapter.
     *
     * @returns True if adapter is healthy and connected
     */
    healthCheck?(): Promise<boolean>;
}
/**
 * Factory function type for creating adapter instances.
 */
export type IRBACAdapterFactory = () => IRBACAdapter | Promise<IRBACAdapter>;
//# sourceMappingURL=adapter.interface.d.ts.map