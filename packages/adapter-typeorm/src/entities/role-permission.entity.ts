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
import { PermissionEntity } from './permission.entity';

/**
 * TypeORM entity representing the junction table between roles and permissions.
 * This explicit junction table allows for additional metadata on the relationship.
 */
@Entity('rbac_role_permissions')
@Index(['roleId', 'permissionId'], { unique: true })
@Index(['roleId'])
@Index(['permissionId'])
export class RolePermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'role_id' })
  roleId!: string;

  @Column({ type: 'uuid', name: 'permission_id' })
  permissionId!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  grantedBy?: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  grantedAt!: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  /**
   * The role in this assignment.
   */
  @ManyToOne(() => RoleEntity, (role) => role.rolePermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role?: RoleEntity;

  /**
   * The permission in this assignment.
   */
  @ManyToOne(() => PermissionEntity, (permission) => permission.rolePermissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'permission_id' })
  permission?: PermissionEntity;
}
