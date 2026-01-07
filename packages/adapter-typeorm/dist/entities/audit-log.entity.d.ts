/**
 * TypeORM entity representing an audit log entry in the RBAC system.
 * Stores all auditable actions for compliance and debugging purposes.
 */
export declare class AuditLogEntity {
    id: string;
    action: string;
    severity: string;
    timestamp: Date;
    actorId?: string | null;
    actorType: string;
    targetId?: string;
    targetType?: string;
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
//# sourceMappingURL=audit-log.entity.d.ts.map