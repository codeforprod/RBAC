import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * TypeORM entity representing an audit log entry in the RBAC system.
 * Stores all auditable actions for compliance and debugging purposes.
 */
@Entity('rbac_audit_logs')
@Index(['action'])
@Index(['actorId'])
@Index(['targetId', 'targetType'])
@Index(['organizationId'])
@Index(['timestamp'])
@Index(['success'])
@Index(['severity'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'varchar', length: 20 })
  severity!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  timestamp!: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  actorId?: string | null;

  @Column({ type: 'varchar', length: 50, default: 'user' })
  actorType!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  targetId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  targetType?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  resource?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  permission?: string;

  @Column({ type: 'boolean' })
  success!: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  organizationId?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  requestId?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  previousState?: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  newState?: Record<string, unknown>;
}
