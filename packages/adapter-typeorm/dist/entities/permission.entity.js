"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionEntity = void 0;
const typeorm_1 = require("typeorm");
const role_entity_1 = require("./role.entity");
const role_permission_entity_1 = require("./role-permission.entity");
/**
 * TypeORM entity representing a permission in the RBAC system.
 * Permissions follow the format: resource:action or resource:action:scope
 */
let PermissionEntity = class PermissionEntity {
    id;
    resource;
    action;
    scope;
    description;
    conditions;
    metadata;
    createdAt;
    /**
     * Roles that have this permission assigned.
     */
    roles;
    /**
     * Role-permission junction table entries.
     */
    rolePermissions;
    /**
     * Returns the permission string in format: resource:action[:scope]
     */
    toPermissionString() {
        if (this.scope) {
            return `${this.resource}:${this.action}:${this.scope}`;
        }
        return `${this.resource}:${this.action}`;
    }
};
exports.PermissionEntity = PermissionEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], PermissionEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], PermissionEntity.prototype, "resource", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], PermissionEntity.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], PermissionEntity.prototype, "scope", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PermissionEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], PermissionEntity.prototype, "conditions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], PermissionEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], PermissionEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToMany)(() => role_entity_1.RoleEntity, (role) => role.permissions),
    __metadata("design:type", Array)
], PermissionEntity.prototype, "roles", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => role_permission_entity_1.RolePermissionEntity, (rolePermission) => rolePermission.permission),
    __metadata("design:type", Array)
], PermissionEntity.prototype, "rolePermissions", void 0);
exports.PermissionEntity = PermissionEntity = __decorate([
    (0, typeorm_1.Entity)('rbac_permissions'),
    (0, typeorm_1.Index)(['resource', 'action', 'scope'], { unique: true }),
    (0, typeorm_1.Index)(['resource']),
    (0, typeorm_1.Index)(['action'])
], PermissionEntity);
//# sourceMappingURL=permission.entity.js.map