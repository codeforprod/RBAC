import { RoleEntity } from './role.entity';
import { RolePermissionEntity } from './role-permission.entity';
/**
 * TypeORM entity representing a permission in the RBAC system.
 * Permissions follow the format: resource:action or resource:action:scope
 */
export declare class PermissionEntity {
    id: string;
    resource: string;
    action: string;
    scope?: string;
    description?: string;
    conditions?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    /**
     * Roles that have this permission assigned.
     */
    roles?: RoleEntity[];
    /**
     * Role-permission junction table entries.
     */
    rolePermissions?: RolePermissionEntity[];
    /**
     * Returns the permission string in format: resource:action[:scope]
     */
    toPermissionString(): string;
}
//# sourceMappingURL=permission.entity.d.ts.map