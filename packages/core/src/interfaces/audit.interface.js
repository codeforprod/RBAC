"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoOpAuditLogger = exports.AuditSeverity = exports.AuditAction = void 0;
var AuditAction;
(function (AuditAction) {
    AuditAction["PERMISSION_CHECK"] = "permission.check";
    AuditAction["PERMISSION_GRANTED"] = "permission.granted";
    AuditAction["PERMISSION_DENIED"] = "permission.denied";
    AuditAction["ROLE_CREATED"] = "role.created";
    AuditAction["ROLE_UPDATED"] = "role.updated";
    AuditAction["ROLE_DELETED"] = "role.deleted";
    AuditAction["ROLE_PERMISSION_ASSIGNED"] = "role.permission.assigned";
    AuditAction["ROLE_PERMISSION_REMOVED"] = "role.permission.removed";
    AuditAction["USER_ROLE_ASSIGNED"] = "user.role.assigned";
    AuditAction["USER_ROLE_REMOVED"] = "user.role.removed";
    AuditAction["USER_ROLE_EXPIRED"] = "user.role.expired";
    AuditAction["PERMISSION_CREATED"] = "permission.created";
    AuditAction["PERMISSION_UPDATED"] = "permission.updated";
    AuditAction["PERMISSION_DELETED"] = "permission.deleted";
    AuditAction["CACHE_INVALIDATED"] = "cache.invalidated";
    AuditAction["HIERARCHY_CHANGED"] = "hierarchy.changed";
    AuditAction["CIRCULAR_DEPENDENCY_DETECTED"] = "hierarchy.circular_dependency";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var AuditSeverity;
(function (AuditSeverity) {
    AuditSeverity["INFO"] = "info";
    AuditSeverity["WARNING"] = "warning";
    AuditSeverity["ERROR"] = "error";
    AuditSeverity["CRITICAL"] = "critical";
})(AuditSeverity || (exports.AuditSeverity = AuditSeverity = {}));
class NoOpAuditLogger {
    emptyResult = {
        entries: [],
        total: 0,
        offset: 0,
        hasMore: false,
    };
    async log(options) {
        return this.createEmptyEntry(options);
    }
    async logPermissionCheck(userId, permission, granted, context) {
        return this.createEmptyEntry({
            action: granted ? AuditAction.PERMISSION_GRANTED : AuditAction.PERMISSION_DENIED,
            actorId: userId,
            permission,
            resource: context?.resource,
            success: granted,
        });
    }
    async logRoleAssignment(userId, roleId, assignedBy) {
        return this.createEmptyEntry({
            action: AuditAction.USER_ROLE_ASSIGNED,
            actorId: assignedBy,
            targetId: userId,
            targetType: 'user',
            success: true,
            metadata: { roleId },
        });
    }
    async logRoleRemoval(userId, roleId, removedBy) {
        return this.createEmptyEntry({
            action: AuditAction.USER_ROLE_REMOVED,
            actorId: removedBy,
            targetId: userId,
            targetType: 'user',
            success: true,
            metadata: { roleId },
        });
    }
    async logRoleCreation(roleId, createdBy, roleData) {
        return this.createEmptyEntry({
            action: AuditAction.ROLE_CREATED,
            actorId: createdBy,
            targetId: roleId,
            targetType: 'role',
            success: true,
            newState: roleData,
        });
    }
    async logRoleUpdate(roleId, updatedBy, previousState, newState) {
        return this.createEmptyEntry({
            action: AuditAction.ROLE_UPDATED,
            actorId: updatedBy,
            targetId: roleId,
            targetType: 'role',
            success: true,
            previousState,
            newState,
        });
    }
    async logRoleDeletion(roleId, deletedBy, roleData) {
        return this.createEmptyEntry({
            action: AuditAction.ROLE_DELETED,
            actorId: deletedBy,
            targetId: roleId,
            targetType: 'role',
            success: true,
            previousState: roleData,
        });
    }
    async query() {
        return this.emptyResult;
    }
    async getByUser() {
        return this.emptyResult;
    }
    async getByTarget() {
        return this.emptyResult;
    }
    async getSummary() {
        return {
            totalEntries: 0,
            byAction: {},
            bySeverity: {
                [AuditSeverity.INFO]: 0,
                [AuditSeverity.WARNING]: 0,
                [AuditSeverity.ERROR]: 0,
                [AuditSeverity.CRITICAL]: 0,
            },
            successCount: 0,
            failureCount: 0,
            startDate: new Date(),
            endDate: new Date(),
        };
    }
    async purge() {
        return 0;
    }
    createEmptyEntry(options) {
        return {
            id: '',
            action: options.action,
            severity: options.severity ?? (options.success ? AuditSeverity.INFO : AuditSeverity.ERROR),
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
}
exports.NoOpAuditLogger = NoOpAuditLogger;
//# sourceMappingURL=audit.interface.js.map