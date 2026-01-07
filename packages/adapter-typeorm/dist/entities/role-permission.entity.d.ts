import { RoleEntity } from './role.entity';
import { PermissionEntity } from './permission.entity';
/**
 * TypeORM entity representing the junction table between roles and permissions.
 * This explicit junction table allows for additional metadata on the relationship.
 */
export declare class RolePermissionEntity {
    id: string;
    roleId: string;
    permissionId: string;
    grantedBy?: string;
    grantedAt: Date;
    metadata?: Record<string, unknown>;
    /**
     * The role in this assignment.
     */
    role?: RoleEntity;
    /**
     * The permission in this assignment.
     */
    permission?: PermissionEntity;
}
//# sourceMappingURL=role-permission.entity.d.ts.map