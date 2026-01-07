export declare enum CacheErrorCode {
    CACHE_ERROR = "CACHE_ERROR",
    CONNECTION_FAILED = "CONNECTION_FAILED",
    CONNECTION_TIMEOUT = "CONNECTION_TIMEOUT",
    OPERATION_TIMEOUT = "OPERATION_TIMEOUT",
    SERIALIZATION_ERROR = "SERIALIZATION_ERROR",
    DESERIALIZATION_ERROR = "DESERIALIZATION_ERROR",
    NOT_INITIALIZED = "NOT_INITIALIZED",
    MAX_SIZE_EXCEEDED = "MAX_SIZE_EXCEEDED",
    INVALID_CONFIG = "INVALID_CONFIG",
    LOCK_FAILED = "LOCK_FAILED",
    CLUSTER_ERROR = "CLUSTER_ERROR"
}
export interface CacheErrorContext {
    adapter?: string;
    operation?: string;
    key?: string;
    pattern?: string;
    originalError?: string;
    [key: string]: unknown;
}
export declare class CacheError extends Error {
    readonly code: CacheErrorCode;
    readonly context: CacheErrorContext;
    readonly cause?: Error;
    constructor(code: CacheErrorCode, message: string, context?: CacheErrorContext, cause?: Error);
    toString(): string;
    toJSON(): Record<string, unknown>;
}
//# sourceMappingURL=cache.error.d.ts.map