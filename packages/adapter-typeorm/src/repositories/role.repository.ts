import { Repository, DataSource, In } from 'typeorm';
import { RoleEntity } from '../entities/role.entity';

/**
 * Repository for role entity CRUD operations.
 * Provides optimized queries for role management and hierarchy operations.
 */
export class RoleRepository {
  private readonly repository: Repository<RoleEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(RoleEntity);
  }

  /**
   * Find a role by its unique identifier.
   */
  async findById(id: string): Promise<RoleEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
  }

  /**
   * Find a role by its name within an organization.
   */
  async findByName(name: string, organizationId?: string | null): Promise<RoleEntity | null> {
    return this.repository.findOne({
      where: {
        name,
        organizationId: organizationId ?? undefined,
      },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
  }

  /**
   * Find multiple roles by their IDs.
   */
  async findByIds(ids: string[]): Promise<RoleEntity[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.repository.find({
      where: { id: In(ids) },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
  }

  /**
   * Find all roles with optional filtering.
   */
  async findAll(options?: {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    organizationId?: string | null;
    includeInactive?: boolean;
  }): Promise<{ data: RoleEntity[]; total: number }> {
    const queryBuilder = this.repository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.rolePermissions', 'rolePermission')
      .leftJoinAndSelect('rolePermission.permission', 'permission');

    if (options?.organizationId !== undefined) {
      queryBuilder.andWhere('role.organizationId = :orgId', {
        orgId: options.organizationId,
      });
    }

    if (!options?.includeInactive) {
      queryBuilder.andWhere('role.isActive = :isActive', { isActive: true });
    }

    // Whitelist allowed sort columns to prevent SQL injection
    const ALLOWED_SORT_COLUMNS = ['createdAt', 'updatedAt', 'name', 'priority', 'isActive'];
    const sortBy =
      options?.sortBy && ALLOWED_SORT_COLUMNS.includes(options.sortBy)
        ? options.sortBy
        : 'createdAt';
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
  async create(roleData: Partial<RoleEntity>): Promise<RoleEntity> {
    const role = this.repository.create(roleData);
    return this.repository.save(role);
  }

  /**
   * Update an existing role.
   */
  async update(id: string, updates: Partial<RoleEntity>): Promise<RoleEntity> {
    const { rolePermissions, userRoles, ...updateData } = updates;
    await this.repository.update(id, updateData as any);
    const role = await this.findById(id);

    if (!role) {
      throw new Error(`Role with id ${id} not found after update`);
    }

    return role;
  }

  /**
   * Delete a role by ID.
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Find roles that have a specific role as their parent.
   */
  async findChildRoles(parentRoleId: string): Promise<RoleEntity[]> {
    return this.repository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.rolePermissions', 'rolePermission')
      .leftJoinAndSelect('rolePermission.permission', 'permission')
      .where(':parentId = ANY(role.parentRoleIds)', { parentId: parentRoleId })
      .getMany();
  }

  /**
   * Check if a role name already exists within an organization.
   */
  async existsByName(
    name: string,
    organizationId?: string | null,
    excludeId?: string,
  ): Promise<boolean> {
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
  getRepository(): Repository<RoleEntity> {
    return this.repository;
  }
}
