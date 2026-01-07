"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextualAuditLogger = exports.InMemoryAuditLogger = void 0;
exports.createAuditLogger = createAuditLogger;
const audit_interface_1 = require("../interfaces/audit.interface");
const options_types_1 = require("../types/options.types");
/**
 * In-memory audit logger implementation for development and testing.
 * NOT recommended for production use - use a persistent storage implementation instead.
 *
 * @example
 * ```typescript
 * const auditLogger = new InMemoryAuditLogger({
 *   maxEntries: 10000,
 *   auditOptions: {
 *     logSuccessfulChecks: false,
 *     logDeniedChecks: true
 *   }
 * });
 *
 * // Log a permission check
 * await auditLogger.logPermissionCheck('user-123', 'posts:delete', false, {
 *   resource: 'posts',
 *   ipAddress: '192.168.1.1'
 * });
 *
 * // Query audit entries
 * const result = await auditLogger.query({
 *   action: AuditAction.PERMISSION_DENIED,
 *   limit: 100
 * });
 * ```
 */
class InMemoryAuditLogger {
    storage;
    options;
    idCounter = 0;
    /**
     * Creates a new InMemoryAuditLogger.
     *
     * @param config - Logger configuration
     */
    constructor(config = {}) {
        this.storage = {
            entries: [],
            maxEntries: config.maxEntries ?? 10000,
        };
        this.options = { ...options_types_1.DEFAULT_AUDIT_OPTIONS, ...config.auditOptions };
    }
    /**
     * Log an audit entry.
     */
    async log(options) {
        if (!this.options.enabled) {
            return this.createEntry(options);
        }
        const entry = this.createEntry(options);
        this.addEntry(entry);
        return entry;
    }
    /**
     * Log a permission check event.
     */
    async logPermissionCheck(userId, permission, granted, context) {
        // Check if we should log this type of check
        if (granted && !this.options.logSuccessfulChecks) {
            return this.createEntry({
                action: audit_interface_1.AuditAction.PERMISSION_GRANTED,
                actorId: userId,
                permission,
                success: granted,
            });
        }
        if (!granted && !this.options.logDeniedChecks) {
            return this.createEntry({
                action: audit_interface_1.AuditAction.PERMISSION_DENIED,
                actorId: userId,
                permission,
                success: granted,
            });
        }
        return this.log({
            action: granted ? audit_interface_1.AuditAction.PERMISSION_GRANTED : audit_interface_1.AuditAction.PERMISSION_DENIED,
            severity: granted ? audit_interface_1.AuditSeverity.INFO : audit_interface_1.AuditSeverity.ERROR,
            actorId: userId,
            permission,
            resource: context?.resource,
            success: granted,
            ipAddress: this.options.includeIpAddress ? context?.ipAddress : undefined,
            userAgent: this.options.includeUserAgent ? context?.userAgent : undefined,
            requestId: context?.requestId,
            organizationId: context?.organizationId,
            metadata: this.options.includeContext ? context?.metadata : undefined,
        });
    }
    /**
     * Log a role assignment event.
     */
    async logRoleAssignment(userId, roleId, assignedBy, context) {
        if (!this.options.logRoleChanges) {
            return this.createEntry({
                action: audit_interface_1.AuditAction.USER_ROLE_ASSIGNED,
                actorId: assignedBy,
                success: true,
            });
        }
        return this.log({
            action: audit_interface_1.AuditAction.USER_ROLE_ASSIGNED,
            severity: audit_interface_1.AuditSeverity.INFO,
            actorId: assignedBy,
            targetId: userId,
            targetType: 'user',
            success: true,
            organizationId: context?.organizationId,
            metadata: {
                roleId,
                expiresAt: context?.expiresAt?.toISOString(),
                ...context?.metadata,
            },
        });
    }
    /**
     * Log a role removal event.
     */
    async logRoleRemoval(userId, roleId, removedBy, context) {
        if (!this.options.logRoleChanges) {
            return this.createEntry({
                action: audit_interface_1.AuditAction.USER_ROLE_REMOVED,
                actorId: removedBy,
                success: true,
            });
        }
        return this.log({
            action: audit_interface_1.AuditAction.USER_ROLE_REMOVED,
            severity: audit_interface_1.AuditSeverity.INFO,
            actorId: removedBy,
            targetId: userId,
            targetType: 'user',
            success: true,
            organizationId: context?.organizationId,
            metadata: {
                roleId,
                reason: context?.reason,
                ...context?.metadata,
            },
        });
    }
    /**
     * Log a role creation event.
     */
    async logRoleCreation(roleId, createdBy, roleData) {
        if (!this.options.logRoleChanges) {
            return this.createEntry({
                action: audit_interface_1.AuditAction.ROLE_CREATED,
                actorId: createdBy,
                success: true,
            });
        }
        return this.log({
            action: audit_interface_1.AuditAction.ROLE_CREATED,
            severity: audit_interface_1.AuditSeverity.INFO,
            actorId: createdBy,
            targetId: roleId,
            targetType: 'role',
            success: true,
            newState: roleData,
        });
    }
    /**
     * Log a role update event.
     */
    async logRoleUpdate(roleId, updatedBy, previousState, newState) {
        if (!this.options.logRoleChanges) {
            return this.createEntry({
                action: audit_interface_1.AuditAction.ROLE_UPDATED,
                actorId: updatedBy,
                success: true,
            });
        }
        return this.log({
            action: audit_interface_1.AuditAction.ROLE_UPDATED,
            severity: audit_interface_1.AuditSeverity.INFO,
            actorId: updatedBy,
            targetId: roleId,
            targetType: 'role',
            success: true,
            previousState,
            newState,
        });
    }
    /**
     * Log a role deletion event.
     */
    async logRoleDeletion(roleId, deletedBy, roleData) {
        if (!this.options.logRoleChanges) {
            return this.createEntry({
                action: audit_interface_1.AuditAction.ROLE_DELETED,
                actorId: deletedBy,
                success: true,
            });
        }
        return this.log({
            action: audit_interface_1.AuditAction.ROLE_DELETED,
            severity: audit_interface_1.AuditSeverity.WARNING,
            actorId: deletedBy,
            targetId: roleId,
            targetType: 'role',
            success: true,
            previousState: roleData,
        });
    }
    /**
     * Query audit entries.
     */
    async query(options) {
        let filtered = [...this.storage.entries];
        // Apply filters
        if (options.action) {
            filtered = filtered.filter(e => e.action === options.action);
        }
        if (options.actions && options.actions.length > 0) {
            const actionSet = new Set(options.actions);
            filtered = filtered.filter(e => actionSet.has(e.action));
        }
        if (options.actorId) {
            filtered = filtered.filter(e => e.actorId === options.actorId);
        }
        if (options.targetId) {
            filtered = filtered.filter(e => e.targetId === options.targetId);
        }
        if (options.targetType) {
            filtered = filtered.filter(e => e.targetType === options.targetType);
        }
        if (options.success !== undefined) {
            filtered = filtered.filter(e => e.success === options.success);
        }
        if (options.organizationId !== undefined) {
            filtered = filtered.filter(e => e.organizationId === options.organizationId);
        }
        if (options.severity) {
            filtered = filtered.filter(e => e.severity === options.severity);
        }
        if (options.minSeverity) {
            const severityOrder = [
                audit_interface_1.AuditSeverity.INFO,
                audit_interface_1.AuditSeverity.WARNING,
                audit_interface_1.AuditSeverity.ERROR,
                audit_interface_1.AuditSeverity.CRITICAL,
            ];
            const minIndex = severityOrder.indexOf(options.minSeverity);
            filtered = filtered.filter(e => severityOrder.indexOf(e.severity) >= minIndex);
        }
        if (options.startDate) {
            filtered = filtered.filter(e => e.timestamp >= options.startDate);
        }
        if (options.endDate) {
            filtered = filtered.filter(e => e.timestamp <= options.endDate);
        }
        // Sort
        const sortOrder = options.sortOrder ?? 'desc';
        filtered.sort((a, b) => {
            const diff = a.timestamp.getTime() - b.timestamp.getTime();
            return sortOrder === 'asc' ? diff : -diff;
        });
        // Paginate
        const offset = options.offset ?? 0;
        const limit = options.limit ?? 50;
        const total = filtered.length;
        const paginated = filtered.slice(offset, offset + limit);
        // Remove metadata if not requested
        if (!options.includeMetadata) {
            for (const entry of paginated) {
                delete entry.metadata;
            }
        }
        return {
            entries: paginated,
            total,
            offset,
            hasMore: offset + paginated.length < total,
        };
    }
    /**
     * Get audit entries for a specific user.
     */
    async getByUser(userId, options) {
        return this.query({ ...options, actorId: userId });
    }
    /**
     * Get audit entries for a specific target.
     */
    async getByTarget(targetId, targetType, options) {
        return this.query({ ...options, targetId, targetType });
    }
    /**
     * Get a summary of audit activity.
     */
    async getSummary(options) {
        let filtered = [...this.storage.entries];
        if (options?.startDate) {
            filtered = filtered.filter(e => e.timestamp >= options.startDate);
        }
        if (options?.endDate) {
            filtered = filtered.filter(e => e.timestamp <= options.endDate);
        }
        if (options?.organizationId !== undefined) {
            filtered = filtered.filter(e => e.organizationId === options.organizationId);
        }
        const byAction = {};
        const bySeverity = {
            [audit_interface_1.AuditSeverity.INFO]: 0,
            [audit_interface_1.AuditSeverity.WARNING]: 0,
            [audit_interface_1.AuditSeverity.ERROR]: 0,
            [audit_interface_1.AuditSeverity.CRITICAL]: 0,
        };
        let successCount = 0;
        let failureCount = 0;
        for (const entry of filtered) {
            byAction[entry.action] = (byAction[entry.action] ?? 0) + 1;
            bySeverity[entry.severity]++;
            if (entry.success) {
                successCount++;
            }
            else {
                failureCount++;
            }
        }
        const timestamps = filtered.map(e => e.timestamp.getTime());
        const startDate = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : new Date();
        const endDate = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : new Date();
        return {
            totalEntries: filtered.length,
            byAction,
            bySeverity,
            successCount,
            failureCount,
            startDate,
            endDate,
        };
    }
    /**
     * Delete audit entries older than a specified date.
     */
    async purge(olderThan) {
        const originalLength = this.storage.entries.length;
        this.storage.entries = this.storage.entries.filter(e => e.timestamp >= olderThan);
        return originalLength - this.storage.entries.length;
    }
    /**
     * Export audit entries.
     */
    async export(options, format) {
        const result = await this.query({ ...options, limit: 100000 });
        if (format === 'json') {
            return JSON.stringify(result.entries, null, 2);
        }
        // CSV format
        if (result.entries.length === 0) {
            return '';
        }
        const headers = [
            'id',
            'timestamp',
            'action',
            'severity',
            'actorId',
            'actorType',
            'targetId',
            'targetType',
            'permission',
            'resource',
            'success',
            'errorMessage',
            'ipAddress',
            'organizationId',
        ];
        const rows = result.entries.map(entry => [
            entry.id,
            entry.timestamp.toISOString(),
            entry.action,
            entry.severity,
            entry.actorId ?? '',
            entry.actorType,
            entry.targetId ?? '',
            entry.targetType ?? '',
            entry.permission ?? '',
            entry.resource ?? '',
            String(entry.success),
            entry.errorMessage ?? '',
            entry.ipAddress ?? '',
            entry.organizationId ?? '',
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        return csvContent;
    }
    /**
     * Create an audit entry without storing it.
     */
    createEntry(options) {
        this.idCounter++;
        return {
            id: `audit_${this.idCounter}_${Date.now()}`,
            action: options.action,
            severity: options.severity ?? (options.success ? audit_interface_1.AuditSeverity.INFO : audit_interface_1.AuditSeverity.ERROR),
            timestamp: new Date(),
            actorId: options.actorId ?? null,
            actorType: options.actorType ?? 'user',
            targetId: options.targetId,
            targetType: options.targetType,
            resource: options.resource,
            permission: options.permission,
            success: options.success,
            errorMessage: options.errorMessage,
            ipAddress: options.ipAddress,
            userAgent: options.userAgent,
            organizationId: options.organizationId,
            requestId: options.requestId,
            metadata: options.metadata,
            previousState: options.previousState,
            newState: options.newState,
        };
    }
    /**
     * Add an entry to storage with size management.
     */
    addEntry(entry) {
        this.storage.entries.push(entry);
        // Remove oldest entries if we exceed max
        if (this.storage.entries.length > this.storage.maxEntries) {
            const excess = this.storage.entries.length - this.storage.maxEntries;
            this.storage.entries.splice(0, excess);
        }
    }
}
exports.InMemoryAuditLogger = InMemoryAuditLogger;
/**
 * Audit logger wrapper that provides context injection.
 * Useful for adding request-scoped context to all audit entries.
 *
 * @example
 * ```typescript
 * // In middleware
 * const contextualLogger = new ContextualAuditLogger(auditLogger, {
 *   userId: req.user.id,
 *   ipAddress: req.ip,
 *   userAgent: req.headers['user-agent'],
 *   requestId: req.id,
 *   organizationId: req.user.organizationId
 * });
 *
 * // Pass to services
 * const service = new SomeService(contextualLogger);
 * ```
 */
class ContextualAuditLogger {
    delegate;
    context;
    constructor(delegate, context) {
        this.delegate = delegate;
        this.context = context;
    }
    async log(options) {
        return this.delegate.log({
            ...options,
            actorId: options.actorId ?? this.context.userId,
            actorType: options.actorType ?? this.context.actorType,
            ipAddress: options.ipAddress ?? this.context.ipAddress,
            userAgent: options.userAgent ?? this.context.userAgent,
            requestId: options.requestId ?? this.context.requestId,
            organizationId: options.organizationId ?? this.context.organizationId,
            metadata: { ...this.context.metadata, ...options.metadata },
        });
    }
    async logPermissionCheck(userId, permission, granted, context) {
        return this.delegate.logPermissionCheck(userId, permission, granted, {
            ...context,
            ipAddress: context?.ipAddress ?? this.context.ipAddress,
            userAgent: context?.userAgent ?? this.context.userAgent,
            requestId: context?.requestId ?? this.context.requestId,
            organizationId: context?.organizationId ?? this.context.organizationId,
            metadata: { ...this.context.metadata, ...context?.metadata },
        });
    }
    async logRoleAssignment(userId, roleId, assignedBy, context) {
        return this.delegate.logRoleAssignment(userId, roleId, assignedBy, {
            ...context,
            organizationId: context?.organizationId ?? this.context.organizationId,
            metadata: { ...this.context.metadata, ...context?.metadata },
        });
    }
    async logRoleRemoval(userId, roleId, removedBy, context) {
        return this.delegate.logRoleRemoval(userId, roleId, removedBy, {
            ...context,
            organizationId: context?.organizationId ?? this.context.organizationId,
            metadata: { ...this.context.metadata, ...context?.metadata },
        });
    }
    async logRoleCreation(roleId, createdBy, roleData) {
        return this.delegate.logRoleCreation(roleId, createdBy, roleData);
    }
    async logRoleUpdate(roleId, updatedBy, previousState, newState) {
        return this.delegate.logRoleUpdate(roleId, updatedBy, previousState, newState);
    }
    async logRoleDeletion(roleId, deletedBy, roleData) {
        return this.delegate.logRoleDeletion(roleId, deletedBy, roleData);
    }
    query(options) {
        return this.delegate.query(options);
    }
    getByUser(userId, options) {
        return this.delegate.getByUser(userId, options);
    }
    getByTarget(targetId, targetType, options) {
        return this.delegate.getByTarget(targetId, targetType, options);
    }
    getSummary(options) {
        return this.delegate.getSummary(options);
    }
    purge(olderThan) {
        return this.delegate.purge(olderThan);
    }
}
exports.ContextualAuditLogger = ContextualAuditLogger;
/**
 * Factory function to create the appropriate audit logger.
 *
 * @param options - Options for creating the logger
 * @returns An IAuditLogger instance
 */
function createAuditLogger(options) {
    if (!options.enabled) {
        return new audit_interface_1.NoOpAuditLogger();
    }
    switch (options.type) {
        case 'no-op':
            return new audit_interface_1.NoOpAuditLogger();
        case 'in-memory':
        default:
            return new InMemoryAuditLogger({
                maxEntries: options.maxEntries,
                auditOptions: options.auditOptions,
            });
    }
}
//# sourceMappingURL=audit-logger.service.js.map