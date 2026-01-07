import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
  Index,
  OneToMany,
} from 'typeorm';
import { RoleEntity } from './role.entity';
import { RolePermissionEntity } from './role-permission.entity';

/**
 * TypeORM entity representing a permission in the RBAC system.
 * Permissions follow the format: resource:action or resource:action:scope
 */
@Entity('rbac_permissions')
@Index(['resource', 'action', 'scope'], { unique: true })
@Index(['resource'])
@Index(['action'])
export class PermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  resource!: string;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  scope?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  conditions?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  /**
   * Roles that have this permission assigned.
   */
  @ManyToMany(() => RoleEntity, (role) => role.permissions)
  roles?: RoleEntity[];

  /**
   * Role-permission junction table entries.
   */
  @OneToMany(() => RolePermissionEntity, (rolePermission) => rolePermission.permission)
  rolePermissions?: RolePermissionEntity[];

  /**
   * Returns the permission string in format: resource:action[:scope]
   */
  toPermissionString(): string {
    if (this.scope) {
      return `${this.resource}:${this.action}:${this.scope}`;
    }
    return `${this.resource}:${this.action}`;
  }
}
