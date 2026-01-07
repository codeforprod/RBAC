"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogSchema = exports.AuditSeverityLevel = void 0;
exports.createAuditLogModel = createAuditLogModel;
exports.configureTTL = configureTTL;
const mongoose_1 = require("mongoose");
var AuditSeverityLevel;
(function (AuditSeverityLevel) {
    AuditSeverityLevel["INFO"] = "info";
    AuditSeverityLevel["WARNING"] = "warning";
    AuditSeverityLevel["ERROR"] = "error";
    AuditSeverityLevel["CRITICAL"] = "critical";
})(AuditSeverityLevel || (exports.AuditSeverityLevel = AuditSeverityLevel = {}));
exports.AuditLogSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.Mixed,
        default: undefined,
    },
    previousState: {
        type: mongoose_1.Schema.Types.Mixed,
        default: undefined,
    },
    newState: {
        type: mongoose_1.Schema.Types.Mixed,
        default: undefined,
    },
}, {
    timestamps: false,
    collection: 'rbac_audit_logs',
});
exports.AuditLogSchema.index({ action: 1, timestamp: -1 }, { name: 'audit_action_timestamp_idx' });
exports.AuditLogSchema.index({ actorId: 1, timestamp: -1 }, { name: 'audit_actor_timestamp_idx' });
exports.AuditLogSchema.index({ targetId: 1, targetType: 1, timestamp: -1 }, { name: 'audit_target_timestamp_idx' });
exports.AuditLogSchema.index({ organizationId: 1, timestamp: -1 }, { name: 'audit_org_timestamp_idx' });
exports.AuditLogSchema.index({ actorId: 1, permission: 1, success: 1, timestamp: -1 }, { name: 'audit_permission_check_idx' });
exports.AuditLogSchema.index({ severity: 1, timestamp: -1 }, { name: 'audit_severity_timestamp_idx' });
exports.AuditLogSchema.index({ success: 1, action: 1, timestamp: -1 }, {
    name: 'audit_failures_idx',
    partialFilterExpression: { success: false },
});
exports.AuditLogSchema.index({ timestamp: 1 }, {
    name: 'audit_ttl_idx',
    expireAfterSeconds: 0,
});
exports.AuditLogSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});
exports.AuditLogSchema.set('toObject', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});
function createAuditLogModel(connection) {
    const mongoose = connection ?? require('mongoose');
    if (mongoose.models.AuditLog) {
        return mongoose.models.AuditLog;
    }
    return (0, mongoose_1.model)('AuditLog', exports.AuditLogSchema);
}
async function configureTTL(model, ttlSeconds = 90 * 24 * 60 * 60) {
    const collection = model.collection;
    const indexName = 'audit_ttl_idx';
    try {
        await collection.dropIndex(indexName);
    }
    catch {
    }
    await collection.createIndex({ timestamp: 1 }, {
        name: indexName,
        expireAfterSeconds: ttlSeconds,
    });
}
//# sourceMappingURL=audit-log.schema.js.map