"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoleRepository = void 0;
const typeorm_1 = require("typeorm");
const user_role_entity_1 = require("../entities/user-role.entity");
/**
 * Repository for user-role assignment operations.
 * Provides optimized queries for user role management.
 */
class UserRoleRepository {
    repository;
    constructor(dataSource) {
        this.repository = dataSource.getRepository(user_role_entity_1.UserRoleEntity);
    }
    /**
     * Find a user-role assignment by its unique identifier.
     */
    async findById(id) {
        return this.repository.findOne({
            where: { id },
            relations: ['role', 'role.permissions'],
        });
    }
    /**
     * Find all role assignments for a user.
     */
    async findByUserId(userId, organizationId) {
        const queryBuilder = this.repository
            .createQueryBuilder('userRole')
            .leftJoinAndSelect('userRole.role', 'role')
            .leftJoinAndSelect('role.permissions', 'permission')
            .where('userRole.userId = :userId', { userId })
            .andWhere('userRole.isActive = :isActive', { isActive: true })
            .andWhere('(userRole.expiresAt IS NULL OR userRole.expiresAt > :now)', {
            now: new Date(),
        });
        if (organizationId !== undefined) {
            queryBuilder.andWhere('userRole.organizationId = :orgId', {
                orgId: organizationId,
            });
        }
        return queryBuilder.getMany();
    }
    /**
     * Find all users assigned to a specific role.
     */
    async findByRoleId(roleId, options) {
        const queryBuilder = this.repository
            .createQueryBuilder('userRole')
            .leftJoinAndSelect('userRole.role', 'role')
            .where('userRole.roleId = :roleId', { roleId })
            .andWhere('userRole.isActive = :isActive', { isActive: true })
            .andWhere('(userRole.expiresAt IS NULL OR userRole.expiresAt > :now)', {
            now: new Date(),
        });
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
     * Create a new user-role assignment.
     */
    async create(assignmentData) {
        const assignment = this.repository.create(assignmentData);
        const saved = await this.repository.save(assignment);
        return this.findById(saved.id);
    }
    /**
     * Remove a role from a user.
     */
    async remove(userId, roleId, organizationId) {
        const queryBuilder = this.repository
            .createQueryBuilder()
            .delete()
            .where('userId = :userId', { userId })
            .andWhere('roleId = :roleId', { roleId });
        if (organizationId !== undefined) {
            queryBuilder.andWhere('organizationId = :orgId', { orgId: organizationId });
        }
        const result = await queryBuilder.execute();
        return (result.affected ?? 0) > 0;
    }
    /**
     * Deactivate a user-role assignment instead of deleting.
     */
    async deactivate(userId, roleId, organizationId) {
        const queryBuilder = this.repository
            .createQueryBuilder()
            .update()
            .set({ isActive: false })
            .where('userId = :userId', { userId })
            .andWhere('roleId = :roleId', { roleId });
        if (organizationId !== undefined) {
            queryBuilder.andWhere('organizationId = :orgId', { orgId: organizationId });
        }
        const result = await queryBuilder.execute();
        return (result.affected ?? 0) > 0;
    }
    /**
     * Check if a user has a specific role.
     */
    async userHasRole(userId, roleId, organizationId) {
        const queryBuilder = this.repository
            .createQueryBuilder('userRole')
            .where('userRole.userId = :userId', { userId })
            .andWhere('userRole.roleId = :roleId', { roleId })
            .andWhere('userRole.isActive = :isActive', { isActive: true })
            .andWhere('(userRole.expiresAt IS NULL OR userRole.expiresAt > :now)', {
            now: new Date(),
        });
        if (organizationId !== undefined) {
            queryBuilder.andWhere('userRole.organizationId = :orgId', {
                orgId: organizationId,
            });
        }
        const count = await queryBuilder.getCount();
        return count > 0;
    }
    /**
     * Check if an assignment already exists.
     */
    async exists(userId, roleId, organizationId) {
        const queryBuilder = this.repository
            .createQueryBuilder('userRole')
            .where('userRole.userId = :userId', { userId })
            .andWhere('userRole.roleId = :roleId', { roleId });
        if (organizationId !== undefined) {
            queryBuilder.andWhere('userRole.organizationId = :orgId', {
                orgId: organizationId,
            });
        }
        const count = await queryBuilder.getCount();
        return count > 0;
    }
    /**
     * Find expired assignments that are still active.
     */
    async findExpiredAssignments() {
        return this.repository.find({
            where: {
                isActive: true,
                expiresAt: (0, typeorm_1.LessThan)(new Date()),
            },
        });
    }
    /**
     * Deactivate all expired assignments.
     */
    async deactivateExpired() {
        const result = await this.repository
            .createQueryBuilder()
            .update()
            .set({ isActive: false })
            .where('isActive = :isActive', { isActive: true })
            .andWhere('expiresAt IS NOT NULL')
            .andWhere('expiresAt < :now', { now: new Date() })
            .execute();
        return result.affected ?? 0;
    }
    /**
     * Get all role IDs for a user (for caching purposes).
     */
    async getRoleIdsForUser(userId, organizationId) {
        const queryBuilder = this.repository
            .createQueryBuilder('userRole')
            .select('userRole.roleId')
            .where('userRole.userId = :userId', { userId })
            .andWhere('userRole.isActive = :isActive', { isActive: true })
            .andWhere('(userRole.expiresAt IS NULL OR userRole.expiresAt > :now)', {
            now: new Date(),
        });
        if (organizationId !== undefined) {
            queryBuilder.andWhere('userRole.organizationId = :orgId', {
                orgId: organizationId,
            });
        }
        const results = await queryBuilder.getRawMany();
        return results.map((r) => r.userRole_roleId);
    }
    /**
     * Batch check if user has any of the specified roles.
     */
    async userHasAnyRole(userId, roleIds, organizationId) {
        if (roleIds.length === 0) {
            return false;
        }
        const queryBuilder = this.repository
            .createQueryBuilder('userRole')
            .where('userRole.userId = :userId', { userId })
            .andWhere('userRole.roleId IN (:...roleIds)', { roleIds })
            .andWhere('userRole.isActive = :isActive', { isActive: true })
            .andWhere('(userRole.expiresAt IS NULL OR userRole.expiresAt > :now)', {
            now: new Date(),
        });
        if (organizationId !== undefined) {
            queryBuilder.andWhere('userRole.organizationId = :orgId', {
                orgId: organizationId,
            });
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
exports.UserRoleRepository = UserRoleRepository;
//# sourceMappingURL=user-role.repository.js.map