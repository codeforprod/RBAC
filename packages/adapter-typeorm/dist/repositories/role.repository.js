"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleRepository = void 0;
const typeorm_1 = require("typeorm");
const role_entity_1 = require("../entities/role.entity");
/**
 * Repository for role entity CRUD operations.
 * Provides optimized queries for role management and hierarchy operations.
 */
class RoleRepository {
    repository;
    constructor(dataSource) {
        this.repository = dataSource.getRepository(role_entity_1.RoleEntity);
    }
    /**
     * Find a role by its unique identifier.
     */
    async findById(id) {
        return this.repository.findOne({
            where: { id },
            relations: ['permissions'],
        });
    }
    /**
     * Find a role by its name within an organization.
     */
    async findByName(name, organizationId) {
        return this.repository.findOne({
            where: {
                name,
                organizationId: organizationId ?? undefined,
            },
            relations: ['permissions'],
        });
    }
    /**
     * Find multiple roles by their IDs.
     */
    async findByIds(ids) {
        if (ids.length === 0) {
            return [];
        }
        return this.repository.find({
            where: { id: (0, typeorm_1.In)(ids) },
            relations: ['permissions'],
        });
    }
    /**
     * Find all roles with optional filtering.
     */
    async findAll(options) {
        const queryBuilder = this.repository
            .createQueryBuilder('role')
            .leftJoinAndSelect('role.permissions', 'permission');
        if (options?.organizationId !== undefined) {
            queryBuilder.andWhere('role.organizationId = :orgId', {
                orgId: options.organizationId,
            });
        }
        if (!options?.includeInactive) {
            queryBuilder.andWhere('role.isActive = :isActive', { isActive: true });
        }
        const sortBy = options?.sortBy ?? 'createdAt';
        const sortOrder = options?.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        queryBuilder.orderBy(`role.${sortBy}`, sortOrder);
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
     * Create a new role.
     */
    async create(roleData) {
        const role = this.repository.create(roleData);
        return this.repository.save(role);
    }
    /**
     * Update an existing role.
     */
    async update(id, updates) {
        await this.repository.update(id, updates);
        const role = await this.findById(id);
        if (!role) {
            throw new Error(`Role with id ${id} not found after update`);
        }
        return role;
    }
    /**
     * Delete a role by ID.
     */
    async delete(id) {
        const result = await this.repository.delete(id);
        return (result.affected ?? 0) > 0;
    }
    /**
     * Find roles that have a specific role as their parent.
     */
    async findChildRoles(parentRoleId) {
        return this.repository
            .createQueryBuilder('role')
            .leftJoinAndSelect('role.permissions', 'permission')
            .where(':parentId = ANY(role.parentRoleIds)', { parentId: parentRoleId })
            .getMany();
    }
    /**
     * Check if a role name already exists within an organization.
     */
    async existsByName(name, organizationId, excludeId) {
        const queryBuilder = this.repository
            .createQueryBuilder('role')
            .where('role.name = :name', { name });
        if (organizationId !== undefined) {
            queryBuilder.andWhere('role.organizationId = :orgId', { orgId: organizationId });
        }
        if (excludeId) {
            queryBuilder.andWhere('role.id != :excludeId', { excludeId });
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
exports.RoleRepository = RoleRepository;
//# sourceMappingURL=role.repository.js.map