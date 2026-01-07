import { RoleEntity } from './role.entity';
/**
 * TypeORM entity representing a user-role assignment.
 * Supports both permanent and temporary (expiring) assignments.
 */
export declare class UserRoleEntity {
    id: string;
    userId: string;
    roleId: string;
    organizationId?: string | null;
    assignedBy?: string;
    assignedAt: Date;
    expiresAt?: Date | null;
    isActive: boolean;
    metadata?: Record<string, unknown>;
    /**
     * The role associated with this assignment.
     */
    role?: RoleEntity;
    /**
     * Check if the assignment has expired.
     */
    isExpired(): boolean;
    /**
     * Check if the assignment is currently valid (active and not expired).
     */
    isValid(): boolean;
}
//# sourceMappingURL=user-role.entity.d.ts.map