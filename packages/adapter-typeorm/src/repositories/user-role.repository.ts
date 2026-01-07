import { Repository, DataSource, LessThan } from 'typeorm';
import { UserRoleEntity } from '../entities/user-role.entity';

/**
 * Repository for user-role assignment operations.
 * Provides optimized queries for user role management.
 */
export class UserRoleRepository {
  private readonly repository: Repository<UserRoleEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(UserRoleEntity);
  }

  /**
   * Find a user-role assignment by its unique identifier.
   */
  async findById(id: string): Promise<UserRoleEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['role', 'role.rolePermissions', 'role.rolePermissions.permission'],
    });
  }

  /**
   * Find all role assignments for a user.
   */
  async findByUserId(
    userId: string,
    organizationId?: string | null
  ): Promise<UserRoleEntity[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .leftJoinAndSelect('role.rolePermissions', 'rolePermission')
      .leftJoinAndSelect('rolePermission.permission', 'permission')
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
  async findByRoleId(
    roleId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{ data: UserRoleEntity[]; total: number }> {
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
  async create(assignmentData: Partial<UserRoleEntity>): Promise<UserRoleEntity> {
    const assignment = this.repository.create(assignmentData);
    const saved = await this.repository.save(assignment);

    return this.findById(saved.id) as Promise<UserRoleEntity>;
  }

  /**
   * Remove a role from a user.
   */
  async remove(
    userId: string,
    roleId: string,
    organizationId?: string | null
  ): Promise<boolean> {
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
  async deactivate(
    userId: string,
    roleId: string,
    organizationId?: string | null
  ): Promise<boolean> {
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
  async userHasRole(
    userId: string,
    roleId: string,
    organizationId?: string | null
  ): Promise<boolean> {
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
  async exists(
    userId: string,
    roleId: string,
    organizationId?: string | null
  ): Promise<boolean> {
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
  async findExpiredAssignments(): Promise<UserRoleEntity[]> {
    return this.repository.find({
      where: {
        isActive: true,
        expiresAt: LessThan(new Date()),
      },
    });
  }

  /**
   * Deactivate all expired assignments.
   */
  async deactivateExpired(): Promise<number> {
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
  async getRoleIdsForUser(
    userId: string,
    organizationId?: string | null
  ): Promise<string[]> {
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
  async userHasAnyRole(
    userId: string,
    roleIds: string[],
    organizationId?: string | null
  ): Promise<boolean> {
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
  getRepository(): Repository<UserRoleEntity> {
    return this.repository;
  }
}
