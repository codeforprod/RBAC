"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBACEntities = exports.AuditLogEntity = exports.RolePermissionEntity = exports.UserRoleEntity = exports.PermissionEntity = exports.RoleEntity = void 0;
var role_entity_1 = require("./role.entity");
Object.defineProperty(exports, "RoleEntity", { enumerable: true, get: function () { return role_entity_1.RoleEntity; } });
var permission_entity_1 = require("./permission.entity");
Object.defineProperty(exports, "PermissionEntity", { enumerable: true, get: function () { return permission_entity_1.PermissionEntity; } });
var user_role_entity_1 = require("./user-role.entity");
Object.defineProperty(exports, "UserRoleEntity", { enumerable: true, get: function () { return user_role_entity_1.UserRoleEntity; } });
var role_permission_entity_1 = require("./role-permission.entity");
Object.defineProperty(exports, "RolePermissionEntity", { enumerable: true, get: function () { return role_permission_entity_1.RolePermissionEntity; } });
var audit_log_entity_1 = require("./audit-log.entity");
Object.defineProperty(exports, "AuditLogEntity", { enumerable: true, get: function () { return audit_log_entity_1.AuditLogEntity; } });
/**
 * All RBAC entities for TypeORM DataSource configuration.
 */
exports.RBACEntities = [
    require('./role.entity').RoleEntity,
    require('./permission.entity').PermissionEntity,
    require('./user-role.entity').UserRoleEntity,
    require('./role-permission.entity').RolePermissionEntity,
    require('./audit-log.entity').AuditLogEntity,
];
//# sourceMappingURL=index.js.map