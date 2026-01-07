import { Repository, DataSource } from 'typeorm';
import { RoleEntity } from '../entities/role.entity';
/**
 * Repository for role entity CRUD operations.
 * Provides optimized queries for role management and hierarchy operations.
 */
export declare class RoleRepository {
    private readonly repository;
    constructor(dataSource: DataSource);
    /**
     * Find a role by its unique identifier.
     */
    findById(id: string): Promise<RoleEntity | null>;
    /**
     * Find a role by its name within an organization.
     */
    findByName(name: string, organizationId?: string | null): Promise<RoleEntity | null>;
    /**
     * Find multiple roles by their IDs.
     */
    findByIds(ids: string[]): Promise<RoleEntity[]>;
    /**
     * Find all roles with optional filtering.
     */
    findAll(options?: {
        limit?: number;
        offset?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        organizationId?: string | null;
        includeInactive?: boolean;
    }): Promise<{
        data: RoleEntity[];
        total: number;
    }>;
    /**
     * Create a new role.
     */
    create(roleData: Partial<RoleEntity>): Promise<RoleEntity>;
    /**
     * Update an existing role.
     */
    update(id: string, updates: Partial<RoleEntity>): Promise<RoleEntity>;
    /**
     * Delete a role by ID.
     */
    delete(id: string): Promise<boolean>;
    /**
     * Find roles that have a specific role as their parent.
     */
    findChildRoles(parentRoleId: string): Promise<RoleEntity[]>;
    /**
     * Check if a role name already exists within an organization.
     */
    existsByName(name: string, organizationId?: string | null, excludeId?: string): Promise<boolean>;
    /**
     * Get repository for direct TypeORM operations.
     */
    getRepository(): Repository<RoleEntity>;
}
//# sourceMappingURL=role.repository.d.ts.map