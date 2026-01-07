import { Schema, Document, Model, Types } from 'mongoose';

/**
 * Audit severity levels matching core interface.
 */
export enum AuditSeverityLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Mongoose document interface for AuditLog.
 */
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

/**
 * AuditLog schema for MongoDB.
 * Records all auditable actions in the RBAC system.
 *
 * This schema is designed for:
 * - High write throughput
 * - Efficient time-range queries
 * - Compliance reporting
 * - Optional TTL-based expiration
 */
export const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: Object.values(AuditSeverityLevel),
      default: AuditSeverityLevel.INFO,
      index: true,
    },
    timestamp: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    actorId: {
      type: String,
      default: null,
      index: true,
    },
    actorType: {
      type: String,
      default: 'user',
      index: true,
    },
    targetId: {
      type: String,
      index: true,
    },
    targetType: {
      type: String,
      index: true,
    },
    resource: {
      type: String,
      index: true,
    },
    permission: {
      type: String,
      index: true,
    },
    success: {
      type: Boolean,
      required: true,
      index: true,
    },
    errorMessage: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    organizationId: {
      type: String,
      default: null,
      index: true,
    },
    requestId: {
      type: String,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    previousState: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    newState: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    timestamps: false,
    collection: 'rbac_audit_logs',
  }
);

/**
 * Compound index for time-range queries by action type.
 */
AuditLogSchema.index(
  { action: 1, timestamp: -1 },
  { name: 'audit_action_timestamp_idx' }
);

/**
 * Compound index for user activity queries.
 */
AuditLogSchema.index(
  { actorId: 1, timestamp: -1 },
  { name: 'audit_actor_timestamp_idx' }
);

/**
 * Compound index for target entity queries.
 */
AuditLogSchema.index(
  { targetId: 1, targetType: 1, timestamp: -1 },
  { name: 'audit_target_timestamp_idx' }
);

/**
 * Compound index for organization queries.
 */
AuditLogSchema.index(
  { organizationId: 1, timestamp: -1 },
  { name: 'audit_org_timestamp_idx' }
);

/**
 * Compound index for permission check auditing.
 */
AuditLogSchema.index(
  { actorId: 1, permission: 1, success: 1, timestamp: -1 },
  { name: 'audit_permission_check_idx' }
);

/**
 * Index for severity-based queries.
 */
AuditLogSchema.index(
  { severity: 1, timestamp: -1 },
  { name: 'audit_severity_timestamp_idx' }
);

/**
 * Index for error analysis.
 */
AuditLogSchema.index(
  { success: 1, action: 1, timestamp: -1 },
  {
    name: 'audit_failures_idx',
    partialFilterExpression: { success: false },
  }
);

/**
 * TTL index for automatic expiration of old audit logs.
 * Default: 90 days. Disabled by default (set expireAfterSeconds to 0).
 * Enable by setting TTL_SECONDS environment variable or calling createTTLIndex().
 */
AuditLogSchema.index(
  { timestamp: 1 },
  {
    name: 'audit_ttl_idx',
    expireAfterSeconds: 0, // Disabled by default
  }
);

/**
 * Transform for JSON serialization.
 */
AuditLogSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

/**
 * Transform for object serialization.
 */
AuditLogSchema.set('toObject', {
  virtuals: true,
  transform: (_doc, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

/**
 * AuditLog model type.
 */
export type AuditLogModel = Model<AuditLogDocument>;

/**
 * Create AuditLog model.
 * This function creates the model lazily to support different connection instances.
 */
export function createAuditLogModel(
  connection?: typeof import('mongoose')
): AuditLogModel {
  const mongoose = connection ?? require('mongoose');
  if (mongoose.models.AuditLog) {
    return mongoose.models.AuditLog as AuditLogModel;
  }
  return mongoose.model('AuditLog', AuditLogSchema) as AuditLogModel;
}

/**
 * Configure TTL for audit logs.
 * Call this during application initialization to enable automatic cleanup.
 *
 * @param model - The AuditLog model
 * @param ttlSeconds - Time-to-live in seconds (default: 90 days)
 *
 * @example
 * ```typescript
 * const AuditLog = createAuditLogModel();
 * await configureTTL(AuditLog, 90 * 24 * 60 * 60); // 90 days
 * ```
 */
export async function configureTTL(
  model: AuditLogModel,
  ttlSeconds: number = 90 * 24 * 60 * 60
): Promise<void> {
  const collection = model.collection;
  const indexName = 'audit_ttl_idx';

  // Drop existing TTL index if it exists
  try {
    await collection.dropIndex(indexName);
  } catch {
    // Index might not exist, ignore error
  }

  // Create new TTL index with specified expiration
  await collection.createIndex(
    { timestamp: 1 },
    {
      name: indexName,
      expireAfterSeconds: ttlSeconds,
    }
  );
}
