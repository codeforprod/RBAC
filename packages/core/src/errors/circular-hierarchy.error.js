"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircularHierarchyError = void 0;
const rbac_error_1 = require("./rbac.error");
class CircularHierarchyError extends rbac_error_1.RBACError {
    roleId;
    targetRoleId;
    chain;
    depth;
    constructor(roleId, targetRoleId, chain, context = {}) {
        const message = CircularHierarchyError.buildMessage(roleId, targetRoleId, chain);
        super(message, rbac_error_1.RBACErrorCode.CIRCULAR_HIERARCHY, {
            roleId,
            ...context,
            metadata: {
                ...context.metadata,
                targetRoleId,
                chain,
                chainLength: chain.length,
                visualChain: chain.join(' -> '),
            },
        });
        this.roleId = roleId;
        this.targetRoleId = targetRoleId;
        this.chain = chain;
        this.depth = context.depth;
    }
    static buildMessage(roleId, targetRoleId, chain) {
        if (roleId === targetRoleId) {
            return `Circular hierarchy detected: Role '${roleId}' cannot inherit from itself`;
        }
        const chainStr = chain.join(' -> ');
        return `Circular hierarchy detected: Adding '${targetRoleId}' as parent of '${roleId}' would create cycle: ${chainStr}`;
    }
    static isCircularHierarchy(error) {
        return error instanceof CircularHierarchyError;
    }
    static selfReference(roleId) {
        return new CircularHierarchyError(roleId, roleId, [roleId, roleId]);
    }
    static direct(roleA, roleB) {
        return new CircularHierarchyError(roleA, roleB, [roleA, roleB, roleA]);
    }
    static maxDepthExceeded(roleId, chain, maxDepth) {
        const error = new CircularHierarchyError(roleId, chain[0] ?? roleId, chain, {
            depth: chain.length,
            maxDepth,
        });
        Object.defineProperty(error, 'message', {
            value: `Maximum hierarchy depth (${maxDepth}) exceeded for role '${roleId}'. ` +
                `Chain length: ${chain.length}. This may indicate a circular dependency or excessively deep hierarchy.`,
            writable: false,
        });
        return error;
    }
    getVisualChain() {
        const lastIndex = this.chain.length - 1;
        const parts = this.chain.map((role, index) => {
            if (index === lastIndex && this.chain[0] === role) {
                return `${role} (CYCLE!)`;
            }
            return role;
        });
        return parts.join(' -> ');
    }
    getInvolvedRoles() {
        return [...new Set(this.chain)];
    }
    toHttpResponse() {
        return {
            statusCode: 409,
            error: 'Conflict',
            message: this.message,
            roleId: this.roleId,
            targetRoleId: this.targetRoleId,
            chain: this.chain,
        };
    }
}
exports.CircularHierarchyError = CircularHierarchyError;
//# sourceMappingURL=circular-hierarchy.error.js.map