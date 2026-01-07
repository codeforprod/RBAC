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
exports.UserRoleEntity = void 0;
const typeorm_1 = require("typeorm");
const role_entity_1 = require("./role.entity");
/**
 * TypeORM entity representing a user-role assignment.
 * Supports both permanent and temporary (expiring) assignments.
 */
let UserRoleEntity = class UserRoleEntity {
    id;
    userId;
    roleId;
    organizationId;
    assignedBy;
    assignedAt;
    expiresAt;
    isActive;
    metadata;
    /**
     * The role associated with this assignment.
     */
    role;
    /**
     * Check if the assignment has expired.
     */
    isExpired() {
        if (!this.expiresAt) {
            return false;
        }
        return this.expiresAt < new Date();
    }
    /**
     * Check if the assignment is currently valid (active and not expired).
     */
    isValid() {
        return this.isActive && !this.isExpired();
    }
};
exports.UserRoleEntity = UserRoleEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UserRoleEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], UserRoleEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], UserRoleEntity.prototype, "roleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], UserRoleEntity.prototype, "organizationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], UserRoleEntity.prototype, "assignedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamp with time zone' }),
    __metadata("design:type", Date)
], UserRoleEntity.prototype, "assignedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Object)
], UserRoleEntity.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], UserRoleEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], UserRoleEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => role_entity_1.RoleEntity, (role) => role.userRoles, {
        onDelete: 'CASCADE',
    }),
    (0, typeorm_1.JoinColumn)({ name: 'roleId' }),
    __metadata("design:type", role_entity_1.RoleEntity)
], UserRoleEntity.prototype, "role", void 0);
exports.UserRoleEntity = UserRoleEntity = __decorate([
    (0, typeorm_1.Entity)('rbac_user_roles'),
    (0, typeorm_1.Index)(['userId', 'roleId', 'organizationId'], { unique: true }),
    (0, typeorm_1.Index)(['userId', 'organizationId']),
    (0, typeorm_1.Index)(['roleId']),
    (0, typeorm_1.Index)(['expiresAt']),
    (0, typeorm_1.Index)(['isActive'])
], UserRoleEntity);
//# sourceMappingURL=user-role.entity.js.map