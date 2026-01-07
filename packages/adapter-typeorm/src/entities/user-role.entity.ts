import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { RoleEntity } from './role.entity';

/**
 * TypeORM entity representing a user-role assignment.
 * Supports both permanent and temporary (expiring) assignments.
 */
@Entity('rbac_user_roles')
@Index(['userId', 'roleId', 'organizationId'], { unique: true })
@Index(['userId', 'organizationId'])
@Index(['roleId'])
@Index(['expiresAt'])
@Index(['isActive'])
export class UserRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  userId!: string;

  @Column({ type: 'uuid' })
  roleId!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  organizationId?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  assignedBy?: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  assignedAt!: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expiresAt?: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  /**
   * The role associated with this assignment.
   */
  @ManyToOne(() => RoleEntity, (role) => role.userRoles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roleId' })
  role?: RoleEntity;

  /**
   * Check if the assignment has expired.
   */
  isExpired(): boolean {
    if (!this.expiresAt) {
      return false;
    }
    return this.expiresAt < new Date();
  }

  /**
   * Check if the assignment is currently valid (active and not expired).
   */
  isValid(): boolean {
    return this.isActive && !this.isExpired();
  }
}
