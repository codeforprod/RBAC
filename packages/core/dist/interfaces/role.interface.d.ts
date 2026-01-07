import { IPermission } from './permission.interface';
/**
 * Represents a role that can be assigned to users.
 * Roles group permissions together and can inherit from parent roles.
 */
export interface IRole {
    /** Unique identifier for the role */
    id: string;
    /** Role name (e.g., "admin", "editor", "viewer") */
    name: string;
    /** Human-readable display name */
    displayName?: string;
    /** Description of the role's purpose and responsibilities */
    description?: string;
    /** Permissions directly assigned to this role */
    permissions: IPermission[];
    /** Parent role IDs for role hierarchy (inheritance) */
    parentRoles?: string[];
    /** Whether this is a system role (non-deletable, built-in) */
    isSystem?: boolean;
    /** Whether this role is currently active */
    isActive: boolean;
    /** Organization ID for multi-tenant scenarios (null for global roles) */
    organizationId?: string | null;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
    /** Timestamp when the role was created */
    createdAt?: Date;
    /** Timestamp when the role was last updated */
    updatedAt?: Date;
}
/**
 * Service for resolving role hierarchies and inherited permissions.
 * Handles parent-child relationships between roles.
 */
export interface IRoleHierarchy {
    /**
     * Get all permissions for a role, including inherited permissions from parent roles.
     *
     * @param roleId - The role ID to get permissions for
     * @returns Array of all permissions (direct + inherited)
     *
     * @throws {RoleNotFoundError} If the role doesn't exist
     * @throws {CircularRoleHierarchyError} If circular dependency detected
     */
    getInheritedPermissions(roleId: string): Promise<IPermission[]>;
    /**
     * Get all parent roles for a given role, recursively.
     *
     * @param roleId - The role ID to get parents for
     * @param maxDepth - Maximum depth to traverse (default: 10)
     * @returns Array of parent roles in hierarchy order
     *
     * @throws {CircularRoleHierarchyError} If circular dependency detected
     */
    getParentRoles(roleId: string, maxDepth?: number): Promise<IRole[]>;
    /**
     * Get all child roles for a given role.
     *
     * @param roleId - The role ID to get children for
     * @returns Array of child roles
     */
    getChildRoles(roleId: string): Promise<IRole[]>;
    /**
     * Check if a role hierarchy contains circular dependencies.
     *
     * @param roleId - The role ID to check
     * @returns True if circular dependency exists
     */
    hasCircularDependency(roleId: string): Promise<boolean>;
    /**
     * Validate that a new parent relationship won't create a circular dependency.
     *
     * @param childRoleId - The child role ID
     * @param parentRoleId - The proposed parent role ID
     * @returns True if the relationship is valid (no circular dependency)
     */
    validateHierarchy(childRoleId: string, parentRoleId: string): Promise<boolean>;
    /**
     * Get the depth of a role in the hierarchy.
     *
     * @param roleId - The role ID to get depth for
     * @returns Depth level (0 for root roles)
     */
    getRoleDepth(roleId: string): Promise<number>;
    /**
     * Get all roles in a hierarchy tree starting from a root role.
     *
     * @param rootRoleId - The root role ID
     * @returns Tree structure of roles
     */
    getHierarchyTree(rootRoleId: string): Promise<IRoleHierarchyTree>;
}
/**
 * Tree structure representing role hierarchies.
 */
export interface IRoleHierarchyTree {
    role: IRole;
    children: IRoleHierarchyTree[];
    depth: number;
}
/**
 * Options for creating a new role.
 */
export interface ICreateRoleOptions {
    /** Role name (must be unique within organization) */
    name: string;
    /** Human-readable display name */
    displayName?: string;
    /** Role description */
    description?: string;
    /** Parent role IDs for inheritance */
    parentRoles?: string[];
    /** Initial permission IDs to assign */
    permissionIds?: string[];
    /** Whether this is a system role */
    isSystem?: boolean;
    /** Organization ID for multi-tenant scenarios */
    organizationId?: string | null;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Options for updating an existing role.
 */
export interface IUpdateRoleOptions {
    /** New display name */
    displayName?: string;
    /** New description */
    description?: string;
    /** Updated parent role IDs */
    parentRoles?: string[];
    /** Whether the role is active */
    isActive?: boolean;
    /** Updated metadata */
    metadata?: Record<string, unknown>;
}
//# sourceMappingURL=role.interface.d.ts.map