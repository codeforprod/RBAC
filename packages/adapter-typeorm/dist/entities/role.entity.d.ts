import { PermissionEntity } from './permission.entity';
import { UserRoleEntity } from './user-role.entity';
import { RolePermissionEntity } from './role-permission.entity';
/**
 * TypeORM entity representing a role in the RBAC system.
 * Supports hierarchical roles through parent-child relationships.
 */
export declare class RoleEntity {
    id: string;
    name: string;
    displayName?: string;
    description?: string;
    isSystem: boolean;
    isActive: boolean;
    organizationId?: string | null;
    metadata?: Record<string, unknown>;
    /**
     * Parent role IDs stored as JSON array.
     * This allows for multiple inheritance in the role hierarchy.
     */
    parentRoleIds: string[];
    createdAt: Date;
    updatedAt: Date;
    /**
     * User role assignments for this role.
     */
    userRoles?: UserRoleEntity[];
    /**
     * Role-permission junction table entries.
     */
    rolePermissions?: RolePermissionEntity[];
    /**
     * Direct permissions assigned to this role via many-to-many.
     * Populated through rolePermissions relationship.
     */
    permissions?: PermissionEntity[];
}
//# sourceMappingURL=role.entity.d.ts.map