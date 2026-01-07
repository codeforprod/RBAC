export declare enum RBACErrorCode {
    PERMISSION_DENIED = "RBAC_1001",
    PERMISSION_NOT_FOUND = "RBAC_1002",
    INVALID_PERMISSION_FORMAT = "RBAC_1003",
    PERMISSION_ALREADY_EXISTS = "RBAC_1004",
    ROLE_NOT_FOUND = "RBAC_2001",
    ROLE_ALREADY_EXISTS = "RBAC_2002",
    ROLE_IN_USE = "RBAC_2003",
    INVALID_ROLE_NAME = "RBAC_2004",
    SYSTEM_ROLE_MODIFICATION = "RBAC_2005",
    CIRCULAR_HIERARCHY = "RBAC_3001",
    MAX_HIERARCHY_DEPTH = "RBAC_3002",
    INVALID_PARENT_ROLE = "RBAC_3003",
    CROSS_TENANT_INHERITANCE = "RBAC_3004",
    USER_NOT_FOUND = "RBAC_4001",
    ROLE_ALREADY_ASSIGNED = "RBAC_4002",
    ROLE_NOT_ASSIGNED = "RBAC_4003",
    ASSIGNMENT_EXPIRED = "RBAC_4004",
    INVALID_CONFIGURATION = "RBAC_5001",
    ADAPTER_NOT_INITIALIZED = "RBAC_5002",
    CACHE_ERROR = "RBAC_5003",
    ADAPTER_ERROR = "RBAC_5004",
    VALIDATION_ERROR = "RBAC_6001",
    INVALID_INPUT = "RBAC_6002",
    MISSING_REQUIRED_FIELD = "RBAC_6003",
    UNKNOWN_ERROR = "RBAC_9001",
    OPERATION_FAILED = "RBAC_9002",
    TIMEOUT = "RBAC_9003"
}
export interface RBACErrorContext {
    code: RBACErrorCode;
    userId?: string;
    roleId?: string;
    permission?: string;
    resource?: string;
    organizationId?: string | null;
    metadata?: Record<string, unknown>;
    cause?: Error;
}
export declare class RBACError extends Error {
    readonly code: RBACErrorCode;
    readonly context: RBACErrorContext;
    readonly timestamp: Date;
    readonly isOperational: boolean;
    constructor(message: string, code?: RBACErrorCode, context?: Partial<RBACErrorContext>, isOperational?: boolean);
    toString(): string;
    toJSON(): Record<string, unknown>;
    static isRBACError(error: unknown): error is RBACError;
    static hasCode(error: unknown, code: RBACErrorCode): boolean;
    static wrap(error: unknown, code?: RBACErrorCode, context?: Partial<RBACErrorContext>): RBACError;
}
//# sourceMappingURL=rbac.error.d.ts.map