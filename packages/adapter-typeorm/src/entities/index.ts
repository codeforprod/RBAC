export { RoleEntity } from './role.entity';
export { PermissionEntity } from './permission.entity';
export { UserRoleEntity } from './user-role.entity';
export { RolePermissionEntity } from './role-permission.entity';
export { AuditLogEntity } from './audit-log.entity';

/**
 * All RBAC entities for TypeORM DataSource configuration.
 */
export const RBACEntities = [
  require('./role.entity').RoleEntity,
  require('./permission.entity').PermissionEntity,
  require('./user-role.entity').UserRoleEntity,
  require('./role-permission.entity').RolePermissionEntity,
  require('./audit-log.entity').AuditLogEntity,
];
