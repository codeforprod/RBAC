import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  Index,
} from 'typeorm';
import { PermissionEntity } from './permission.entity';
import { UserRoleEntity } from './user-role.entity';
import { RolePermissionEntity } from './role-permission.entity';

/**
 * TypeORM entity representing a role in the RBAC system.
 * Supports hierarchical roles through parent-child relationships.
 */
@Entity('rbac_roles')
@Index(['name', 'organizationId'], { unique: true })
@Index(['organizationId'])
@Index(['isActive'])
export class RoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  displayName?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  organizationId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  /**
   * Parent role IDs stored as JSON array.
   * This allows for multiple inheritance in the role hierarchy.
   */
  @Column({ type: 'jsonb', default: [] })
  parentRoleIds!: string[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * User role assignments for this role.
   */
  @OneToMany(() => UserRoleEntity, (userRole) => userRole.role)
  userRoles?: UserRoleEntity[];

  /**
   * Role-permission junction table entries.
   */
  @OneToMany(() => RolePermissionEntity, (rolePermission) => rolePermission.role)
  rolePermissions?: RolePermissionEntity[];

  /**
   * Direct permissions assigned to this role via many-to-many.
   * Populated through rolePermissions relationship.
   */
  @ManyToMany(() => PermissionEntity, (permission) => permission.roles)
  @JoinTable({
    name: 'rbac_role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions?: PermissionEntity[];
}
