import { Repository, DataSource } from 'typeorm';
import { UserRoleEntity } from '../entities/user-role.entity';
/**
 * Repository for user-role assignment operations.
 * Provides optimized queries for user role management.
 */
export declare class UserRoleRepository {
    private readonly repository;
    constructor(dataSource: DataSource);
    /**
     * Find a user-role assignment by its unique identifier.
     */
    findById(id: string): Promise<UserRoleEntity | null>;
    /**
     * Find all role assignments for a user.
     */
    findByUserId(userId: string, organizationId?: string | null): Promise<UserRoleEntity[]>;
    /**
     * Find all users assigned to a specific role.
     */
    findByRoleId(roleId: string, options?: {
        limit?: number;
        offset?: number;
    }): Promise<{
        data: UserRoleEntity[];
        total: number;
    }>;
    /**
     * Create a new user-role assignment.
     */
    create(assignmentData: Partial<UserRoleEntity>): Promise<UserRoleEntity>;
    /**
     * Remove a role from a user.
     */
    remove(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;
    /**
     * Deactivate a user-role assignment instead of deleting.
     */
    deactivate(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;
    /**
     * Check if a user has a specific role.
     */
    userHasRole(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;
    /**
     * Check if an assignment already exists.
     */
    exists(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;
    /**
     * Find expired assignments that are still active.
     */
    findExpiredAssignments(): Promise<UserRoleEntity[]>;
    /**
     * Deactivate all expired assignments.
     */
    deactivateExpired(): Promise<number>;
    /**
     * Get all role IDs for a user (for caching purposes).
     */
    getRoleIdsForUser(userId: string, organizationId?: string | null): Promise<string[]>;
    /**
     * Batch check if user has any of the specified roles.
     */
    userHasAnyRole(userId: string, roleIds: string[], organizationId?: string | null): Promise<boolean>;
    /**
     * Get repository for direct TypeORM operations.
     */
    getRepository(): Repository<UserRoleEntity>;
}
//# sourceMappingURL=user-role.repository.d.ts.map