import { IAuditLogger, IAuditEntry, IAuditContext, IAuditQueryOptions, IAuditQueryResult, IAuditSummary, ICreateAuditEntryOptions } from '../interfaces/audit.interface';
import { AuditOptions } from '../types/options.types';
export declare class InMemoryAuditLogger implements IAuditLogger {
    private readonly storage;
    private readonly options;
    private idCounter;
    constructor(config?: {
        maxEntries?: number;
        auditOptions?: Partial<AuditOptions>;
    });
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
    export(options: IAuditQueryOptions, format: 'json' | 'csv'): Promise<string>;
    private createEntry;
    private addEntry;
}
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
export declare function createAuditLogger(options: {
    enabled: boolean;
    type?: 'in-memory' | 'no-op';
    maxEntries?: number;
    auditOptions?: Partial<AuditOptions>;
}): IAuditLogger;
//# sourceMappingURL=audit-logger.service.d.ts.map