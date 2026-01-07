/**
 * @fileoverview Mongoose schemas for RBAC entities.
 *
 * This module exports all schema definitions and model factory functions
 * for the MongoDB/Mongoose RBAC adapter.
 *
 * @packageDocumentation
 */

// Permission schema
export {
  PermissionSchema,
  PermissionDocument,
  PermissionModel,
  createPermissionModel,
} from './permission.schema';

// Role schema
export {
  RoleSchema,
  RoleDocument,
  RoleModel,
  createRoleModel,
} from './role.schema';

// Role-Permission junction schema
export {
  RolePermissionSchema,
  RolePermissionDocument,
  RolePermissionModel,
  createRolePermissionModel,
} from './role-permission.schema';

// User-Role assignment schema
export {
  UserRoleSchema,
  UserRoleDocument,
  UserRoleModel,
  createUserRoleModel,
} from './user-role.schema';

// Audit log schema
export {
  AuditLogSchema,
  AuditLogDocument,
  AuditLogModel,
  AuditSeverityLevel,
  createAuditLogModel,
  configureTTL,
} from './audit-log.schema';
