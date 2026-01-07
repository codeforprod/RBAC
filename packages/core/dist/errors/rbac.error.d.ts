/**
 * Error codes for RBAC operations.
 * Use these codes for programmatic error handling.
 */
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
/**
 * Additional context for RBAC errors.
 */
export interface RBACErrorContext {
    /** The error code */
    code: RBACErrorCode;
    /** User ID involved in the operation (if applicable) */
    userId?: string;
    /** Role ID involved in the operation (if applicable) */
    roleId?: string;
    /** Permission involved in the operation (if applicable) */
    permission?: string;
    /** Resource being accessed (if applicable) */
    resource?: string;
    /** Organization ID (if applicable) */
    organizationId?: string | null;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
    /** The original error (if wrapping another error) */
    cause?: Error;
}
/**
 * Base error class for all RBAC-related errors.
 * All RBAC errors extend from this class for consistent error handling.
 *
 * @example
 * ```typescript
 * try {
 *   await rbac.checkPermission(userId, 'admin:delete');
 * } catch (error) {
 *   if (error instanceof RBACError) {
 *     console.error(`RBAC Error [${error.code}]: ${error.message}`);
 *     console.error('Context:', error.context);
 *   }
 * }
 * ```
 */
export declare class RBACError extends Error {
    /** Error code for programmatic handling */
    readonly code: RBACErrorCode;
    /** Additional context about the error */
    readonly context: RBACErrorContext;
    /** Timestamp when the error occurred */
    readonly timestamp: Date;
    /** Whether this error is operational (expected) vs programming error */
    readonly isOperational: boolean;
    /**
     * Creates a new RBACError.
     *
     * @param message - Human-readable error message
     * @param code - Error code from RBACErrorCode enum
     * @param context - Additional context (optional)
     * @param isOperational - Whether this is an operational error (default: true)
     *
     * @example
     * ```typescript
     * throw new RBACError(
     *   'Role not found',
     *   RBACErrorCode.ROLE_NOT_FOUND,
     *   { roleId: 'missing-role-id' }
     * );
     * ```
     */
    constructor(message: string, code?: RBACErrorCode, context?: Partial<RBACErrorContext>, isOperational?: boolean);
    /**
     * Create a string representation of the error for logging.
     *
     * @returns Formatted error string
     */
    toString(): string;
    /**
     * Convert error to a plain object for serialization.
     *
     * @returns Plain object representation
     */
    toJSON(): Record<string, unknown>;
    /**
     * Check if an error is an RBAC error.
     *
     * @param error - Error to check
     * @returns True if the error is an RBACError
     *
     * @example
     * ```typescript
     * if (RBACError.isRBACError(error)) {
     *   // Handle RBAC-specific error
     * }
     * ```
     */
    static isRBACError(error: unknown): error is RBACError;
    /**
     * Check if an error has a specific error code.
     *
     * @param error - Error to check
     * @param code - Error code to check for
     * @returns True if the error has the specified code
     *
     * @example
     * ```typescript
     * if (RBACError.hasCode(error, RBACErrorCode.PERMISSION_DENIED)) {
     *   // Handle permission denied specifically
     * }
     * ```
     */
    static hasCode(error: unknown, code: RBACErrorCode): boolean;
    /**
     * Wrap an unknown error in an RBACError.
     *
     * @param error - The error to wrap
     * @param code - Error code to use
     * @param context - Additional context
     * @returns An RBACError instance
     *
     * @example
     * ```typescript
     * try {
     *   await someOperation();
     * } catch (error) {
     *   throw RBACError.wrap(error, RBACErrorCode.ADAPTER_ERROR, { operation: 'findRole' });
     * }
     * ```
     */
    static wrap(error: unknown, code?: RBACErrorCode, context?: Partial<RBACErrorContext>): RBACError;
}
//# sourceMappingURL=rbac.error.d.ts.map