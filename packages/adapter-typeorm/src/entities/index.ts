import { RoleEntity } from './role.entity';
import { PermissionEntity } from './permission.entity';
import { UserRoleEntity } from './user-role.entity';
import { RolePermissionEntity } from './role-permission.entity';
import { AuditLogEntity } from './audit-log.entity';

export { RoleEntity, PermissionEntity, UserRoleEntity, RolePermissionEntity, AuditLogEntity };

/**
 * All RBAC entities for TypeORM DataSource configuration.
 */
export const RBACEntities = [
  RoleEntity,
  PermissionEntity,
  UserRoleEntity,
  RolePermissionEntity,
  AuditLogEntity,
];
