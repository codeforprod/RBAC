import { Schema, Document, Model, Types } from 'mongoose';
export declare enum AuditSeverityLevel {
    INFO = "info",
    WARNING = "warning",
    ERROR = "error",
    CRITICAL = "critical"
}
export interface AuditLogDocument extends Document {
    _id: Types.ObjectId;
    action: string;
    severity: AuditSeverityLevel;
    timestamp: Date;
    actorId: string | null;
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
export declare const AuditLogSchema: Schema<AuditLogDocument, Model<AuditLogDocument, any, any, any, Document<unknown, any, AuditLogDocument, any, {}> & AuditLogDocument & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AuditLogDocument, Document<unknown, {}, import("mongoose").FlatRecord<AuditLogDocument>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<AuditLogDocument> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
export type AuditLogModel = Model<AuditLogDocument>;
export declare function createAuditLogModel(connection?: typeof import('mongoose')): AuditLogModel;
export declare function configureTTL(model: AuditLogModel, ttlSeconds?: number): Promise<void>;
//# sourceMappingURL=audit-log.schema.d.ts.map