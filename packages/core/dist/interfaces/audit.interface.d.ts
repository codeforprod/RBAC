/**
 * Types of auditable actions in the RBAC system.
 */
export declare enum AuditAction {
    PERMISSION_CHECK = "permission.check",
    PERMISSION_GRANTED = "permission.granted",
    PERMISSION_DENIED = "permission.denied",
    ROLE_CREATED = "role.created",
    ROLE_UPDATED = "role.updated",
    ROLE_DELETED = "role.deleted",
    ROLE_PERMISSION_ASSIGNED = "role.permission.assigned",
    ROLE_PERMISSION_REMOVED = "role.permission.removed",
    USER_ROLE_ASSIGNED = "user.role.assigned",
    USER_ROLE_REMOVED = "user.role.removed",
    USER_ROLE_EXPIRED = "user.role.expired",
    PERMISSION_CREATED = "permission.created",
    PERMISSION_UPDATED = "permission.updated",
    PERMISSION_DELETED = "permission.deleted",
    CACHE_INVALIDATED = "cache.invalidated",
    HIERARCHY_CHANGED = "hierarchy.changed",
    CIRCULAR_DEPENDENCY_DETECTED = "hierarchy.circular_dependency"
}
/**
 * Severity levels for audit events.
 */
export declare enum AuditSeverity {
    /** Informational events (e.g., successful permission checks) */
    INFO = "info",
    /** Warning events (e.g., near-expiry role assignments) */
    WARNING = "warning",
    /** Error events (e.g., permission denied) */
    ERROR = "error",
    /** Critical events (e.g., system configuration errors) */
    CRITICAL = "critical"
}
/**
 * Audit event entry representing a single auditable action.
 */
export interface IAuditEntry {
    /** Unique identifier for the audit entry */
    id: string;
    /** Type of action being audited */
    action: AuditAction | string;
    /** Severity level of the event */
    severity: AuditSeverity;
    /** Timestamp when the event occurred */
    timestamp: Date;
    /** ID of the user who performed the action (null for system actions) */
    actorId: string | null;
    /** Type of actor (user, system, api-key, etc.) */
    actorType: 'user' | 'system' | 'api-key' | 'service' | string;
    /** ID of the target entity (role, permission, user, etc.) */
    targetId?: string;
    /** Type of target entity */
    targetType?: 'role' | 'permission' | 'user' | 'assignment' | string;
    /** Resource being accessed (for permission checks) */
    resource?: string;
    /** Permission being checked */
    permission?: string;
    /** Whether the action was successful */
    success: boolean;
    /** Error message if action failed */
    errorMessage?: string;
    /** IP address of the actor (if available) */
    ipAddress?: string;
    /** User agent string (if available) */
    userAgent?: string;
    /** Organization ID for multi-tenant scenarios */
    organizationId?: string | null;
    /** Request ID for correlation */
    requestId?: string;
    /** Additional context data */
    metadata?: Record<string, unknown>;
    /** Previous state (for update operations) */
    previousState?: Record<string, unknown>;
    /** New state (for create/update operations) */
    newState?: Record<string, unknown>;
}
/**
 * Options for creating an audit entry.
 */
export interface ICreateAuditEntryOptions {
    /** Type of action being audited */
    action: AuditAction | string;
    /** Severity level (defaults to INFO for success, ERROR for failure) */
    severity?: AuditSeverity;
    /** ID of the user performing the action */
    actorId?: string | null;
    /** Type of actor */
    actorType?: 'user' | 'system' | 'api-key' | 'service' | string;
    /** ID of the target entity */
    targetId?: string;
    /** Type of target entity */
    targetType?: 'role' | 'permission' | 'user' | 'assignment' | string;
    /** Resource being accessed */
    resource?: string;
    /** Permission being checked */
    permission?: string;
    /** Whether the action was successful */
    success: boolean;
    /** Error message if action failed */
    errorMessage?: string;
    /** IP address */
    ipAddress?: string;
    /** User agent */
    userAgent?: string;
    /** Organization ID */
    organizationId?: string | null;
    /** Request ID for correlation */
    requestId?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
    /** Previous state */
    previousState?: Record<string, unknown>;
    /** New state */
    newState?: Record<string, unknown>;
}
/**
 * Options for querying audit entries.
 */
export interface IAuditQueryOptions {
    /** Filter by action type */
    action?: AuditAction | string;
    /** Filter by multiple action types */
    actions?: (AuditAction | string)[];
    /** Filter by actor ID */
    actorId?: string;
    /** Filter by target ID */
    targetId?: string;
    /** Filter by target type */
    targetType?: string;
    /** Filter by success/failure */
    success?: boolean;
    /** Filter by organization ID */
    organizationId?: string | null;
    /** Filter by severity */
    severity?: AuditSeverity;
    /** Filter by minimum severity */
    minSeverity?: AuditSeverity;
    /** Start date for time range */
    startDate?: Date;
    /** End date for time range */
    endDate?: Date;
    /** Maximum number of results */
    limit?: number;
    /** Offset for pagination */
    offset?: number;
    /** Sort order */
    sortOrder?: 'asc' | 'desc';
    /** Include metadata in results */
    includeMetadata?: boolean;
}
/**
 * Paginated audit query result.
 */
export interface IAuditQueryResult {
    /** Array of audit entries */
    entries: IAuditEntry[];
    /** Total count of matching entries */
    total: number;
    /** Current page offset */
    offset: number;
    /** Whether there are more results */
    hasMore: boolean;
}
/**
 * Audit summary statistics.
 */
export interface IAuditSummary {
    /** Total number of audit entries */
    totalEntries: number;
    /** Breakdown by action type */
    byAction: Record<string, number>;
    /** Breakdown by severity */
    bySeverity: Record<AuditSeverity, number>;
    /** Success vs failure counts */
    successCount: number;
    failureCount: number;
    /** Time range of the summary */
    startDate: Date;
    endDate: Date;
}
/**
 * Audit logger interface for recording RBAC events.
 * Implement this interface to integrate with any logging/audit system.
 *
 * @example
 * ```typescript
 * class DatabaseAuditLogger implements IAuditLogger {
 *   constructor(private readonly db: Database) {}
 *
 *   async log(options: ICreateAuditEntryOptions): Promise<IAuditEntry> {
 *     const entry: IAuditEntry = {
 *       id: generateId(),
 *       timestamp: new Date(),
 *       actorType: options.actorType ?? 'user',
 *       ...options,
 *     };
 *     await this.db.collection('audit').insertOne(entry);
 *     return entry;
 *   }
 *   // ... implement other methods
 * }
 * ```
 */
export interface IAuditLogger {
    /**
     * Log an audit entry.
     *
     * @param options - Audit entry options
     * @returns The created audit entry
     *
     * @example
     * ```typescript
     * await auditLogger.log({
     *   action: AuditAction.PERMISSION_DENIED,
     *   actorId: 'user-123',
     *   permission: 'admin:delete',
     *   resource: 'users',
     *   success: false,
     *   errorMessage: 'Insufficient permissions',
     *   ipAddress: '192.168.1.1'
     * });
     * ```
     */
    log(options: ICreateAuditEntryOptions): Promise<IAuditEntry>;
    /**
     * Log a permission check event.
     * Convenience method for logging permission checks.
     *
     * @param userId - ID of the user being checked
     * @param permission - Permission being checked
     * @param granted - Whether permission was granted
     * @param context - Additional context
     * @returns The created audit entry
     *
     * @example
     * ```typescript
     * await auditLogger.logPermissionCheck('user-123', 'posts:create', true, {
     *   resource: 'posts',
     *   ipAddress: req.ip
     * });
     * ```
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
     *
     * @param userId - ID of the user being assigned the role
     * @param roleId - ID of the role being assigned
     * @param assignedBy - ID of the user making the assignment
     * @param context - Additional context
     * @returns The created audit entry
     */
    logRoleAssignment(userId: string, roleId: string, assignedBy: string, context?: {
        organizationId?: string | null;
        expiresAt?: Date;
        metadata?: Record<string, unknown>;
    }): Promise<IAuditEntry>;
    /**
     * Log a role removal event.
     *
     * @param userId - ID of the user having the role removed
     * @param roleId - ID of the role being removed
     * @param removedBy - ID of the user making the removal
     * @param context - Additional context
     * @returns The created audit entry
     */
    logRoleRemoval(userId: string, roleId: string, removedBy: string, context?: {
        organizationId?: string | null;
        reason?: string;
        metadata?: Record<string, unknown>;
    }): Promise<IAuditEntry>;
    /**
     * Log a role creation event.
     *
     * @param roleId - ID of the created role
     * @param createdBy - ID of the user who created the role
     * @param roleData - Role data
     * @returns The created audit entry
     */
    logRoleCreation(roleId: string, createdBy: string, roleData: Record<string, unknown>): Promise<IAuditEntry>;
    /**
     * Log a role update event.
     *
     * @param roleId - ID of the updated role
     * @param updatedBy - ID of the user who updated the role
     * @param previousState - Previous role state
     * @param newState - New role state
     * @returns The created audit entry
     */
    logRoleUpdate(roleId: string, updatedBy: string, previousState: Record<string, unknown>, newState: Record<string, unknown>): Promise<IAuditEntry>;
    /**
     * Log a role deletion event.
     *
     * @param roleId - ID of the deleted role
     * @param deletedBy - ID of the user who deleted the role
     * @param roleData - Role data before deletion
     * @returns The created audit entry
     */
    logRoleDeletion(roleId: string, deletedBy: string, roleData: Record<string, unknown>): Promise<IAuditEntry>;
    /**
     * Query audit entries.
     *
     * @param options - Query options
     * @returns Paginated audit entries
     *
     * @example
     * ```typescript
     * const result = await auditLogger.query({
     *   action: AuditAction.PERMISSION_DENIED,
     *   startDate: new Date('2024-01-01'),
     *   limit: 100
     * });
     * ```
     */
    query(options: IAuditQueryOptions): Promise<IAuditQueryResult>;
    /**
     * Get audit entries for a specific user.
     *
     * @param userId - User ID
     * @param options - Query options
     * @returns Paginated audit entries
     */
    getByUser(userId: string, options?: Omit<IAuditQueryOptions, 'actorId'>): Promise<IAuditQueryResult>;
    /**
     * Get audit entries for a specific target.
     *
     * @param targetId - Target entity ID
     * @param targetType - Target entity type
     * @param options - Query options
     * @returns Paginated audit entries
     */
    getByTarget(targetId: string, targetType: string, options?: Omit<IAuditQueryOptions, 'targetId' | 'targetType'>): Promise<IAuditQueryResult>;
    /**
     * Get a summary of audit activity.
     *
     * @param options - Query options for the summary period
     * @returns Audit summary statistics
     */
    getSummary(options?: Pick<IAuditQueryOptions, 'startDate' | 'endDate' | 'organizationId'>): Promise<IAuditSummary>;
    /**
     * Delete audit entries older than a specified date.
     * Use for compliance with data retention policies.
     *
     * @param olderThan - Delete entries older than this date
     * @returns Number of entries deleted
     *
     * @example
     * ```typescript
     * // Delete audit entries older than 90 days
     * const thirtyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
     * const deleted = await auditLogger.purge(thirtyDaysAgo);
     * ```
     */
    purge(olderThan: Date): Promise<number>;
    /**
     * Export audit entries to a format suitable for compliance reporting.
     *
     * @param options - Query options
     * @param format - Export format
     * @returns Exported data as string or buffer
     */
    export?(options: IAuditQueryOptions, format: 'json' | 'csv'): Promise<string>;
}
/**
 * Context object passed to audit loggers for request-scoped information.
 */
export interface IAuditContext {
    /** Current user ID */
    userId?: string;
    /** Actor type */
    actorType?: string;
    /** IP address */
    ipAddress?: string;
    /** User agent */
    userAgent?: string;
    /** Request ID for correlation */
    requestId?: string;
    /** Organization ID */
    organizationId?: string | null;
    /** Additional context data */
    metadata?: Record<string, unknown>;
}
/**
 * No-op audit logger for testing or when auditing is disabled.
 * All methods are implemented but do nothing.
 */
export declare class NoOpAuditLogger implements IAuditLogger {
    private readonly emptyResult;
    log(options: ICreateAuditEntryOptions): Promise<IAuditEntry>;
    logPermissionCheck(userId: string, permission: string, granted: boolean, context?: {
        resource?: string;
    }): Promise<IAuditEntry>;
    logRoleAssignment(userId: string, roleId: string, assignedBy: string): Promise<IAuditEntry>;
    logRoleRemoval(userId: string, roleId: string, removedBy: string): Promise<IAuditEntry>;
    logRoleCreation(roleId: string, createdBy: string, roleData: Record<string, unknown>): Promise<IAuditEntry>;
    logRoleUpdate(roleId: string, updatedBy: string, previousState: Record<string, unknown>, newState: Record<string, unknown>): Promise<IAuditEntry>;
    logRoleDeletion(roleId: string, deletedBy: string, roleData: Record<string, unknown>): Promise<IAuditEntry>;
    query(): Promise<IAuditQueryResult>;
    getByUser(): Promise<IAuditQueryResult>;
    getByTarget(): Promise<IAuditQueryResult>;
    getSummary(): Promise<IAuditSummary>;
    purge(): Promise<number>;
    private createEmptyEntry;
}
//# sourceMappingURL=audit.interface.d.ts.map