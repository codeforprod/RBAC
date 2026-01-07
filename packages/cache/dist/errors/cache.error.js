"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheError = exports.CacheErrorCode = void 0;
var CacheErrorCode;
(function (CacheErrorCode) {
    CacheErrorCode["CACHE_ERROR"] = "CACHE_ERROR";
    CacheErrorCode["CONNECTION_FAILED"] = "CONNECTION_FAILED";
    CacheErrorCode["CONNECTION_TIMEOUT"] = "CONNECTION_TIMEOUT";
    CacheErrorCode["OPERATION_TIMEOUT"] = "OPERATION_TIMEOUT";
    CacheErrorCode["SERIALIZATION_ERROR"] = "SERIALIZATION_ERROR";
    CacheErrorCode["DESERIALIZATION_ERROR"] = "DESERIALIZATION_ERROR";
    CacheErrorCode["NOT_INITIALIZED"] = "NOT_INITIALIZED";
    CacheErrorCode["MAX_SIZE_EXCEEDED"] = "MAX_SIZE_EXCEEDED";
    CacheErrorCode["INVALID_CONFIG"] = "INVALID_CONFIG";
    CacheErrorCode["LOCK_FAILED"] = "LOCK_FAILED";
    CacheErrorCode["CLUSTER_ERROR"] = "CLUSTER_ERROR";
})(CacheErrorCode || (exports.CacheErrorCode = CacheErrorCode = {}));
class CacheError extends Error {
    code;
    context;
    cause;
    constructor(code, message, context = {}, cause) {
        super(message);
        this.name = 'CacheError';
        this.code = code;
        this.context = context;
        this.cause = cause;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
    toString() {
        const contextStr = Object.keys(this.context).length > 0
            ? ` Context: ${JSON.stringify(this.context)}`
            : '';
        return `${this.name} [${this.code}]: ${this.message}${contextStr}`;
    }
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            context: this.context,
            stack: this.stack,
            cause: this.cause?.message,
        };
    }
}
exports.CacheError = CacheError;
//# sourceMappingURL=cache.error.js.map