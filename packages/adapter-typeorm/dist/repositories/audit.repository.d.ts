import { Repository, DataSource } from 'typeorm';
import { AuditLogEntity } from '../entities/audit-log.entity';
/**
 * Severity level enum matching core package.
 */
export declare enum AuditSeverity {
    INFO = "info",
    WARNING = "warning",
    ERROR = "error",
    CRITICAL = "critical"
}
/**
 * Options for querying audit entries.
 */
export interface AuditQueryOptions {
    action?: string;
    actions?: string[];
    actorId?: string;
    targetId?: string;
    targetType?: string;
    success?: boolean;
    organizationId?: string | null;
    severity?: AuditSeverity;
    minSeverity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    sortOrder?: 'asc' | 'desc';
}
/**
 * Repository for audit log operations.
 * Provides optimized queries for audit logging and compliance reporting.
 */
export declare class AuditRepository {
    private readonly repository;
    private readonly severityOrder;
    constructor(dataSource: DataSource);
    /**
     * Find an audit entry by its unique identifier.
     */
    findById(id: string): Promise<AuditLogEntity | null>;
    /**
     * Create a new audit log entry.
     */
    create(entryData: Partial<AuditLogEntity>): Promise<AuditLogEntity>;
    /**
     * Query audit entries with filtering and pagination.
     */
    query(options: AuditQueryOptions): Promise<{
        entries: AuditLogEntity[];
        total: number;
    }>;
    /**
     * Get audit entries for a specific user.
     */
    getByUser(userId: string, options?: Omit<AuditQueryOptions, 'actorId'>): Promise<{
        entries: AuditLogEntity[];
        total: number;
    }>;
    /**
     * Get audit entries for a specific target.
     */
    getByTarget(targetId: string, targetType: string, options?: Omit<AuditQueryOptions, 'targetId' | 'targetType'>): Promise<{
        entries: AuditLogEntity[];
        total: number;
    }>;
    /**
     * Get audit summary statistics.
     */
    getSummary(options?: {
        startDate?: Date;
        endDate?: Date;
        organizationId?: string | null;
    }): Promise<{
        totalEntries: number;
        byAction: Record<string, number>;
        bySeverity: Record<AuditSeverity, number>;
        successCount: number;
        failureCount: number;
        startDate: Date;
        endDate: Date;
    }>;
    /**
     * Purge audit entries older than a specified date.
     */
    purge(olderThan: Date): Promise<number>;
    /**
     * Export audit entries to JSON format.
     */
    exportToJson(options: AuditQueryOptions): Promise<string>;
    /**
     * Export audit entries to CSV format.
     */
    exportToCsv(options: AuditQueryOptions): Promise<string>;
    /**
     * Get repository for direct TypeORM operations.
     */
    getRepository(): Repository<AuditLogEntity>;
}
//# sourceMappingURL=audit.repository.d.ts.map