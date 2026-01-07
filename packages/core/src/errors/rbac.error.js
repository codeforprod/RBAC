"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBACError = exports.RBACErrorCode = void 0;
var RBACErrorCode;
(function (RBACErrorCode) {
    RBACErrorCode["PERMISSION_DENIED"] = "RBAC_1001";
    RBACErrorCode["PERMISSION_NOT_FOUND"] = "RBAC_1002";
    RBACErrorCode["INVALID_PERMISSION_FORMAT"] = "RBAC_1003";
    RBACErrorCode["PERMISSION_ALREADY_EXISTS"] = "RBAC_1004";
    RBACErrorCode["ROLE_NOT_FOUND"] = "RBAC_2001";
    RBACErrorCode["ROLE_ALREADY_EXISTS"] = "RBAC_2002";
    RBACErrorCode["ROLE_IN_USE"] = "RBAC_2003";
    RBACErrorCode["INVALID_ROLE_NAME"] = "RBAC_2004";
    RBACErrorCode["SYSTEM_ROLE_MODIFICATION"] = "RBAC_2005";
    RBACErrorCode["CIRCULAR_HIERARCHY"] = "RBAC_3001";
    RBACErrorCode["MAX_HIERARCHY_DEPTH"] = "RBAC_3002";
    RBACErrorCode["INVALID_PARENT_ROLE"] = "RBAC_3003";
    RBACErrorCode["CROSS_TENANT_INHERITANCE"] = "RBAC_3004";
    RBACErrorCode["USER_NOT_FOUND"] = "RBAC_4001";
    RBACErrorCode["ROLE_ALREADY_ASSIGNED"] = "RBAC_4002";
    RBACErrorCode["ROLE_NOT_ASSIGNED"] = "RBAC_4003";
    RBACErrorCode["ASSIGNMENT_EXPIRED"] = "RBAC_4004";
    RBACErrorCode["INVALID_CONFIGURATION"] = "RBAC_5001";
    RBACErrorCode["ADAPTER_NOT_INITIALIZED"] = "RBAC_5002";
    RBACErrorCode["CACHE_ERROR"] = "RBAC_5003";
    RBACErrorCode["ADAPTER_ERROR"] = "RBAC_5004";
    RBACErrorCode["VALIDATION_ERROR"] = "RBAC_6001";
    RBACErrorCode["INVALID_INPUT"] = "RBAC_6002";
    RBACErrorCode["MISSING_REQUIRED_FIELD"] = "RBAC_6003";
    RBACErrorCode["UNKNOWN_ERROR"] = "RBAC_9001";
    RBACErrorCode["OPERATION_FAILED"] = "RBAC_9002";
    RBACErrorCode["TIMEOUT"] = "RBAC_9003";
})(RBACErrorCode || (exports.RBACErrorCode = RBACErrorCode = {}));
class RBACError extends Error {
    code;
    context;
    timestamp;
    isOperational;
    constructor(message, code = RBACErrorCode.UNKNOWN_ERROR, context = {}, isOperational = true) {
        super(message);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
        this.name = this.constructor.name;
        this.code = code;
        this.context = { code, ...context };
        this.timestamp = new Date();
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, new.target.prototype);
    }
    toString() {
        const contextStr = Object.keys(this.context).length > 1
            ? ` Context: ${JSON.stringify(this.context)}`
            : '';
        return `[${this.code}] ${this.message}${contextStr}`;
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            context: this.context,
            timestamp: this.timestamp.toISOString(),
            isOperational: this.isOperational,
            stack: this.stack,
        };
    }
    static isRBACError(error) {
        return error instanceof RBACError;
    }
    static hasCode(error, code) {
        return RBACError.isRBACError(error) && error.code === code;
    }
    static wrap(error, code = RBACErrorCode.UNKNOWN_ERROR, context = {}) {
        if (RBACError.isRBACError(error)) {
            return error;
        }
        const message = error instanceof Error ? error.message : String(error);
        const cause = error instanceof Error ? error : undefined;
        return new RBACError(message, code, { ...context, cause }, true);
    }
}
exports.RBACError = RBACError;
//# sourceMappingURL=rbac.error.js.map