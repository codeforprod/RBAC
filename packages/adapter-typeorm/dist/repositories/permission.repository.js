"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionRepository = void 0;
const typeorm_1 = require("typeorm");
const permission_entity_1 = require("../entities/permission.entity");
const role_permission_entity_1 = require("../entities/role-permission.entity");
/**
 * Repository for permission entity CRUD operations.
 * Provides optimized queries for permission management.
 */
class PermissionRepository {
    repository;
    rolePermissionRepository;
    constructor(dataSource) {
        this.repository = dataSource.getRepository(permission_entity_1.PermissionEntity);
        this.rolePermissionRepository = dataSource.getRepository(role_permission_entity_1.RolePermissionEntity);
    }
    /**
     * Find a permission by its unique identifier.
     */
    async findById(id) {
        return this.repository.findOne({
            where: { id },
        });
    }
    /**
     * Find a permission by resource, action, and optional scope.
     */
    async findByResourceAction(resource, action, scope) {
        return this.repository.findOne({
            where: {
                resource,
                action,
                scope: scope ?? undefined,
            },
        });
    }
    /**
     * Find multiple permissions by their IDs.
     */
    async findByIds(ids) {
        if (ids.length === 0) {
            return [];
        }
        return this.repository.find({
            where: { id: (0, typeorm_1.In)(ids) },
        });
    }
    /**
     * Find all permissions with optional filtering.
     */
    async findAll(options) {
        const queryBuilder = this.repository.createQueryBuilder('permission');
        const sortBy = options?.sortBy ?? 'createdAt';
        const sortOrder = options?.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        queryBuilder.orderBy(`permission.${sortBy}`, sortOrder);
        const total = await queryBuilder.getCount();
        if (options?.offset !== undefined) {
            queryBuilder.skip(options.offset);
        }
        if (options?.limit !== undefined) {
            queryBuilder.take(options.limit);
        }
        const data = await queryBuilder.getMany();
        return { data, total };
    }
    /**
     * Create a new permission.
     */
    async create(permissionData) {
        const permission = this.repository.create(permissionData);
        return this.repository.save(permission);
    }
    /**
     * Update an existing permission.
     */
    async update(id, updates) {
        await this.repository.update(id, updates);
        const permission = await this.findById(id);
        if (!permission) {
            throw new Error(`Permission with id ${id} not found after update`);
        }
        return permission;
    }
    /**
     * Delete a permission by ID.
     */
    async delete(id) {
        const result = await this.repository.delete(id);
        return (result.affected ?? 0) > 0;
    }
    /**
     * Find all permissions assigned to a role.
     */
    async findByRoleId(roleId) {
        const rolePermissions = await this.rolePermissionRepository.find({
            where: { roleId },
            relations: ['permission'],
        });
        return rolePermissions
            .map((rp) => rp.permission)
            .filter((p) => p !== undefined);
    }
    /**
     * Find permissions for multiple roles (batch operation).
     */
    async findByRoleIds(roleIds) {
        if (roleIds.length === 0) {
            return new Map();
        }
        const rolePermissions = await this.rolePermissionRepository.find({
            where: { roleId: (0, typeorm_1.In)(roleIds) },
            relations: ['permission'],
        });
        const result = new Map();
        for (const roleId of roleIds) {
            result.set(roleId, []);
        }
        for (const rp of rolePermissions) {
            if (rp.permission) {
                const permissions = result.get(rp.roleId) ?? [];
                permissions.push(rp.permission);
                result.set(rp.roleId, permissions);
            }
        }
        return result;
    }
    /**
     * Assign permissions to a role.
     */
    async assignToRole(roleId, permissionIds, grantedBy) {
        if (permissionIds.length === 0) {
            return;
        }
        const existingAssignments = await this.rolePermissionRepository.find({
            where: {
                roleId,
                permissionId: (0, typeorm_1.In)(permissionIds),
            },
        });
        const existingPermissionIds = new Set(existingAssignments.map((a) => a.permissionId));
        const newPermissionIds = permissionIds.filter((id) => !existingPermissionIds.has(id));
        if (newPermissionIds.length === 0) {
            return;
        }
        const newAssignments = newPermissionIds.map((permissionId) => {
            return this.rolePermissionRepository.create({
                roleId,
                permissionId,
                grantedBy,
            });
        });
        await this.rolePermissionRepository.save(newAssignments);
    }
    /**
     * Remove permissions from a role.
     */
    async removeFromRole(roleId, permissionIds) {
        if (permissionIds.length === 0) {
            return;
        }
        await this.rolePermissionRepository.delete({
            roleId,
            permissionId: (0, typeorm_1.In)(permissionIds),
        });
    }
    /**
     * Check if a permission exists by resource, action, and scope.
     */
    async existsByResourceAction(resource, action, scope, excludeId) {
        const queryBuilder = this.repository
            .createQueryBuilder('permission')
            .where('permission.resource = :resource', { resource })
            .andWhere('permission.action = :action', { action });
        if (scope !== undefined) {
            queryBuilder.andWhere('permission.scope = :scope', { scope });
        }
        else {
            queryBuilder.andWhere('permission.scope IS NULL');
        }
        if (excludeId) {
            queryBuilder.andWhere('permission.id != :excludeId', { excludeId });
        }
        const count = await queryBuilder.getCount();
        return count > 0;
    }
    /**
     * Get repository for direct TypeORM operations.
     */
    getRepository() {
        return this.repository;
    }
}
exports.PermissionRepository = PermissionRepository;
//# sourceMappingURL=permission.repository.js.map