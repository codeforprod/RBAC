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
export declare enum AuditSeverity {
    INFO = "info",
    WARNING = "warning",
    ERROR = "error",
    CRITICAL = "critical"
}
export interface IAuditEntry {
    id: string;
    action: AuditAction | string;
    severity: AuditSeverity;
    timestamp: Date;
    actorId: string | null;
    actorType: 'user' | 'system' | 'api-key' | 'service' | string;
    targetId?: string;
    targetType?: 'role' | 'permission' | 'user' | 'assignment' | string;
    resource?: string;
    permission?: string;
    success: boolean;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
    organizationId?: string | null;
    requestId?: string;
    metadata?: Record<string, unknown>;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
}
export interface ICreateAuditEntryOptions {
    action: AuditAction | string;
    severity?: AuditSeverity;
    actorId?: string | null;
    actorType?: 'user' | 'system' | 'api-key' | 'service' | string;
    targetId?: string;
    targetType?: 'role' | 'permission' | 'user' | 'assignment' | string;
    resource?: string;
    permission?: string;
    success: boolean;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
    organizationId?: string | null;
    requestId?: string;
    metadata?: Record<string, unknown>;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
}
export interface IAuditQueryOptions {
    action?: AuditAction | string;
    actions?: (AuditAction | string)[];
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
    includeMetadata?: boolean;
}
export interface IAuditQueryResult {
    entries: IAuditEntry[];
    total: number;
    offset: number;
    hasMore: boolean;
}
export interface IAuditSummary {
    totalEntries: number;
    byAction: Record<string, number>;
    bySeverity: Record<AuditSeverity, number>;
    successCount: number;
    failureCount: number;
    startDate: Date;
    endDate: Date;
}
export interface IAuditLogger {
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
    export?(options: IAuditQueryOptions, format: 'json' | 'csv'): Promise<string>;
}
export interface IAuditContext {
    userId?: string;
    actorType?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    organizationId?: string | null;
    metadata?: Record<string, unknown>;
}
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