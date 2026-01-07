import { IAuditLogger, IAuditEntry, IAuditContext, IAuditQueryOptions, IAuditQueryResult, IAuditSummary, ICreateAuditEntryOptions } from '../interfaces/audit.interface';
import { AuditOptions } from '../types/options.types';
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
export declare class InMemoryAuditLogger implements IAuditLogger {
    private readonly storage;
    private readonly options;
    private idCounter;
    /**
     * Creates a new InMemoryAuditLogger.
     *
     * @param config - Logger configuration
     */
    constructor(config?: {
        maxEntries?: number;
        auditOptions?: Partial<AuditOptions>;
    });
    /**
     * Log an audit entry.
     */
    log(options: ICreateAuditEntryOptions): Promise<IAuditEntry>;
    /**
     * Log a permission check event.
     */
    logPermissionCheck(userId: string, permission: string, granted: boolean, context?: {
        resource?: string;
        ipAddress?: string;
        userAgent?: string;
        requestId?: string;
        organizationId?: string | null;
        metadata?: Record<string, unknown>;
    }): Promise<IAuditEntry>;
    /**
     * Log a role assignment event.
     */
    logRoleAssignment(userId: string, roleId: string, assignedBy: string, context?: {
        organizationId?: string | null;
        expiresAt?: Date;
        metadata?: Record<string, unknown>;
    }): Promise<IAuditEntry>;
    /**
     * Log a role removal event.
     */
    logRoleRemoval(userId: string, roleId: string, removedBy: string, context?: {
        organizationId?: string | null;
        reason?: string;
        metadata?: Record<string, unknown>;
    }): Promise<IAuditEntry>;
    /**
     * Log a role creation event.
     */
    logRoleCreation(roleId: string, createdBy: string, roleData: Record<string, unknown>): Promise<IAuditEntry>;
    /**
     * Log a role update event.
     */
    logRoleUpdate(roleId: string, updatedBy: string, previousState: Record<string, unknown>, newState: Record<string, unknown>): Promise<IAuditEntry>;
    /**
     * Log a role deletion event.
     */
    logRoleDeletion(roleId: string, deletedBy: string, roleData: Record<string, unknown>): Promise<IAuditEntry>;
    /**
     * Query audit entries.
     */
    query(options: IAuditQueryOptions): Promise<IAuditQueryResult>;
    /**
     * Get audit entries for a specific user.
     */
    getByUser(userId: string, options?: Omit<IAuditQueryOptions, 'actorId'>): Promise<IAuditQueryResult>;
    /**
     * Get audit entries for a specific target.
     */
    getByTarget(targetId: string, targetType: string, options?: Omit<IAuditQueryOptions, 'targetId' | 'targetType'>): Promise<IAuditQueryResult>;
    /**
     * Get a summary of audit activity.
     */
    getSummary(options?: Pick<IAuditQueryOptions, 'startDate' | 'endDate' | 'organizationId'>): Promise<IAuditSummary>;
    /**
     * Delete audit entries older than a specified date.
     */
    purge(olderThan: Date): Promise<number>;
    /**
     * Export audit entries.
     */
    export(options: IAuditQueryOptions, format: 'json' | 'csv'): Promise<string>;
    /**
     * Create an audit entry without storing it.
     */
    private createEntry;
    /**
     * Add an entry to storage with size management.
     */
    private addEntry;
}
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
export declare class ContextualAuditLogger implements IAuditLogger {
    private readonly delegate;
    private readonly context;
    constructor(delegate: IAuditLogger, context: IAuditContext);
    log(options: ICreateAuditEntryOptions): Promise<IAuditEntry>;
    logPermissionCheck(userId: string, permission: string, granted: boolean, context?: {
        resource?: string;
        ipAddress?: string;
        userAgent?: string;
        requestId?: string;
        organizationId?: string | null;
        metadata?: Record<string, unknown>;
    }): Promise<IAuditEntry>;
    logRoleAssignment(userId: string, roleId: string, assignedBy: string, context?: {
        organizationId?: string | null;
        expiresAt?: Date;
        metadata?: Record<string, unknown>;
    }): Promise<IAuditEntry>;
    logRoleRemoval(userId: string, roleId: string, removedBy: string, context?: {
        organizationId?: string | null;
        reason?: string;
        metadata?: Record<string, unknown>;
    }): Promise<IAuditEntry>;
    logRoleCreation(roleId: string, createdBy: string, roleData: Record<string, unknown>): Promise<IAuditEntry>;
    logRoleUpdate(roleId: string, updatedBy: string, previousState: Record<string, unknown>, newState: Record<string, unknown>): Promise<IAuditEntry>;
    logRoleDeletion(roleId: string, deletedBy: string, roleData: Record<string, unknown>): Promise<IAuditEntry>;
    query(options: IAuditQueryOptions): Promise<IAuditQueryResult>;
    getByUser(userId: string, options?: Omit<IAuditQueryOptions, 'actorId'>): Promise<IAuditQueryResult>;
    getByTarget(targetId: string, targetType: string, options?: Omit<IAuditQueryOptions, 'targetId' | 'targetType'>): Promise<IAuditQueryResult>;
    getSummary(options?: Pick<IAuditQueryOptions, 'startDate' | 'endDate' | 'organizationId'>): Promise<IAuditSummary>;
    purge(olderThan: Date): Promise<number>;
}
/**
 * Factory function to create the appropriate audit logger.
 *
 * @param options - Options for creating the logger
 * @returns An IAuditLogger instance
 */
export declare function createAuditLogger(options: {
    enabled: boolean;
    type?: 'in-memory' | 'no-op';
    maxEntries?: number;
    auditOptions?: Partial<AuditOptions>;
}): IAuditLogger;
//# sourceMappingURL=audit-logger.service.d.ts.map