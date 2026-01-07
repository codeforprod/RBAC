import { Repository, DataSource } from 'typeorm';
import { PermissionEntity } from '../entities/permission.entity';
/**
 * Repository for permission entity CRUD operations.
 * Provides optimized queries for permission management.
 */
export declare class PermissionRepository {
    private readonly repository;
    private readonly rolePermissionRepository;
    constructor(dataSource: DataSource);
    /**
     * Find a permission by its unique identifier.
     */
    findById(id: string): Promise<PermissionEntity | null>;
    /**
     * Find a permission by resource, action, and optional scope.
     */
    findByResourceAction(resource: string, action: string, scope?: string): Promise<PermissionEntity | null>;
    /**
     * Find multiple permissions by their IDs.
     */
    findByIds(ids: string[]): Promise<PermissionEntity[]>;
    /**
     * Find all permissions with optional filtering.
     */
    findAll(options?: {
        limit?: number;
        offset?: number;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        data: PermissionEntity[];
        total: number;
    }>;
    /**
     * Create a new permission.
     */
    create(permissionData: Partial<PermissionEntity>): Promise<PermissionEntity>;
    /**
     * Update an existing permission.
     */
    update(id: string, updates: Partial<PermissionEntity>): Promise<PermissionEntity>;
    /**
     * Delete a permission by ID.
     */
    delete(id: string): Promise<boolean>;
    /**
     * Find all permissions assigned to a role.
     */
    findByRoleId(roleId: string): Promise<PermissionEntity[]>;
    /**
     * Find permissions for multiple roles (batch operation).
     */
    findByRoleIds(roleIds: string[]): Promise<Map<string, PermissionEntity[]>>;
    /**
     * Assign permissions to a role.
     */
    assignToRole(roleId: string, permissionIds: string[], grantedBy?: string): Promise<void>;
    /**
     * Remove permissions from a role.
     */
    removeFromRole(roleId: string, permissionIds: string[]): Promise<void>;
    /**
     * Check if a permission exists by resource, action, and scope.
     */
    existsByResourceAction(resource: string, action: string, scope?: string, excludeId?: string): Promise<boolean>;
    /**
     * Get repository for direct TypeORM operations.
     */
    getRepository(): Repository<PermissionEntity>;
}
//# sourceMappingURL=permission.repository.d.ts.map