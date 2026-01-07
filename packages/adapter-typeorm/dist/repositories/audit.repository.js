"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditRepository = exports.AuditSeverity = void 0;
const typeorm_1 = require("typeorm");
const audit_log_entity_1 = require("../entities/audit-log.entity");
/**
 * Severity level enum matching core package.
 */
var AuditSeverity;
(function (AuditSeverity) {
    AuditSeverity["INFO"] = "info";
    AuditSeverity["WARNING"] = "warning";
    AuditSeverity["ERROR"] = "error";
    AuditSeverity["CRITICAL"] = "critical";
})(AuditSeverity || (exports.AuditSeverity = AuditSeverity = {}));
/**
 * Repository for audit log operations.
 * Provides optimized queries for audit logging and compliance reporting.
 */
class AuditRepository {
    repository;
    severityOrder = {
        [AuditSeverity.INFO]: 0,
        [AuditSeverity.WARNING]: 1,
        [AuditSeverity.ERROR]: 2,
        [AuditSeverity.CRITICAL]: 3,
    };
    constructor(dataSource) {
        this.repository = dataSource.getRepository(audit_log_entity_1.AuditLogEntity);
    }
    /**
     * Find an audit entry by its unique identifier.
     */
    async findById(id) {
        return this.repository.findOne({
            where: { id },
        });
    }
    /**
     * Create a new audit log entry.
     */
    async create(entryData) {
        const entry = this.repository.create(entryData);
        return this.repository.save(entry);
    }
    /**
     * Query audit entries with filtering and pagination.
     */
    async query(options) {
        const queryBuilder = this.repository.createQueryBuilder('audit');
        if (options.action) {
            queryBuilder.andWhere('audit.action = :action', { action: options.action });
        }
        if (options.actions && options.actions.length > 0) {
            queryBuilder.andWhere('audit.action IN (:...actions)', {
                actions: options.actions,
            });
        }
        if (options.actorId) {
            queryBuilder.andWhere('audit.actorId = :actorId', {
                actorId: options.actorId,
            });
        }
        if (options.targetId) {
            queryBuilder.andWhere('audit.targetId = :targetId', {
                targetId: options.targetId,
            });
        }
        if (options.targetType) {
            queryBuilder.andWhere('audit.targetType = :targetType', {
                targetType: options.targetType,
            });
        }
        if (options.success !== undefined) {
            queryBuilder.andWhere('audit.success = :success', {
                success: options.success,
            });
        }
        if (options.organizationId !== undefined) {
            queryBuilder.andWhere('audit.organizationId = :orgId', {
                orgId: options.organizationId,
            });
        }
        if (options.severity) {
            queryBuilder.andWhere('audit.severity = :severity', {
                severity: options.severity,
            });
        }
        if (options.minSeverity) {
            const minOrder = this.severityOrder[options.minSeverity];
            const severities = Object.entries(this.severityOrder)
                .filter(([_, order]) => order >= minOrder)
                .map(([severity]) => severity);
            queryBuilder.andWhere('audit.severity IN (:...severities)', {
                severities,
            });
        }
        if (options.startDate) {
            queryBuilder.andWhere('audit.timestamp >= :startDate', {
                startDate: options.startDate,
            });
        }
        if (options.endDate) {
            queryBuilder.andWhere('audit.timestamp <= :endDate', {
                endDate: options.endDate,
            });
        }
        const sortOrder = options.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        queryBuilder.orderBy('audit.timestamp', sortOrder);
        const total = await queryBuilder.getCount();
        if (options.offset !== undefined) {
            queryBuilder.skip(options.offset);
        }
        if (options.limit !== undefined) {
            queryBuilder.take(options.limit);
        }
        const entries = await queryBuilder.getMany();
        return { entries, total };
    }
    /**
     * Get audit entries for a specific user.
     */
    async getByUser(userId, options) {
        return this.query({
            ...options,
            actorId: userId,
        });
    }
    /**
     * Get audit entries for a specific target.
     */
    async getByTarget(targetId, targetType, options) {
        return this.query({
            ...options,
            targetId,
            targetType,
        });
    }
    /**
     * Get audit summary statistics.
     */
    async getSummary(options) {
        const startDate = options?.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = options?.endDate ?? new Date();
        const baseQueryBuilder = this.repository
            .createQueryBuilder('audit')
            .where('audit.timestamp >= :startDate', { startDate })
            .andWhere('audit.timestamp <= :endDate', { endDate });
        if (options?.organizationId !== undefined) {
            baseQueryBuilder.andWhere('audit.organizationId = :orgId', {
                orgId: options.organizationId,
            });
        }
        const totalEntries = await baseQueryBuilder.getCount();
        const actionCounts = await this.repository
            .createQueryBuilder('audit')
            .select('audit.action', 'action')
            .addSelect('COUNT(*)', 'count')
            .where('audit.timestamp >= :startDate', { startDate })
            .andWhere('audit.timestamp <= :endDate', { endDate })
            .groupBy('audit.action')
            .getRawMany();
        const byAction = {};
        for (const row of actionCounts) {
            byAction[row.action] = parseInt(row.count, 10);
        }
        const severityCounts = await this.repository
            .createQueryBuilder('audit')
            .select('audit.severity', 'severity')
            .addSelect('COUNT(*)', 'count')
            .where('audit.timestamp >= :startDate', { startDate })
            .andWhere('audit.timestamp <= :endDate', { endDate })
            .groupBy('audit.severity')
            .getRawMany();
        const bySeverity = {
            [AuditSeverity.INFO]: 0,
            [AuditSeverity.WARNING]: 0,
            [AuditSeverity.ERROR]: 0,
            [AuditSeverity.CRITICAL]: 0,
        };
        for (const row of severityCounts) {
            bySeverity[row.severity] = parseInt(row.count, 10);
        }
        const successCounts = await this.repository
            .createQueryBuilder('audit')
            .select('audit.success', 'success')
            .addSelect('COUNT(*)', 'count')
            .where('audit.timestamp >= :startDate', { startDate })
            .andWhere('audit.timestamp <= :endDate', { endDate })
            .groupBy('audit.success')
            .getRawMany();
        let successCount = 0;
        let failureCount = 0;
        for (const row of successCounts) {
            if (row.success === true || row.success === 'true') {
                successCount = parseInt(row.count, 10);
            }
            else {
                failureCount = parseInt(row.count, 10);
            }
        }
        return {
            totalEntries,
            byAction,
            bySeverity,
            successCount,
            failureCount,
            startDate,
            endDate,
        };
    }
    /**
     * Purge audit entries older than a specified date.
     */
    async purge(olderThan) {
        const result = await this.repository.delete({
            timestamp: (0, typeorm_1.LessThan)(olderThan),
        });
        return result.affected ?? 0;
    }
    /**
     * Export audit entries to JSON format.
     */
    async exportToJson(options) {
        const { entries } = await this.query({
            ...options,
            limit: options.limit ?? 10000,
        });
        return JSON.stringify(entries, null, 2);
    }
    /**
     * Export audit entries to CSV format.
     */
    async exportToCsv(options) {
        const { entries } = await this.query({
            ...options,
            limit: options.limit ?? 10000,
        });
        if (entries.length === 0) {
            return '';
        }
        const headers = [
            'id',
            'action',
            'severity',
            'timestamp',
            'actorId',
            'actorType',
            'targetId',
            'targetType',
            'resource',
            'permission',
            'success',
            'errorMessage',
            'ipAddress',
            'organizationId',
            'requestId',
        ];
        const rows = entries.map((entry) => {
            return headers
                .map((header) => {
                const value = entry[header];
                if (value === null || value === undefined) {
                    return '';
                }
                if (value instanceof Date) {
                    return value.toISOString();
                }
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return String(value);
            })
                .join(',');
        });
        return [headers.join(','), ...rows].join('\n');
    }
    /**
     * Get repository for direct TypeORM operations.
     */
    getRepository() {
        return this.repository;
    }
}
exports.AuditRepository = AuditRepository;
//# sourceMappingURL=audit.repository.js.map