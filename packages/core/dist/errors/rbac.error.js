"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBACError = exports.RBACErrorCode = void 0;
/**
 * Error codes for RBAC operations.
 * Use these codes for programmatic error handling.
 */
var RBACErrorCode;
(function (RBACErrorCode) {
    // Permission errors (1xxx)
    RBACErrorCode["PERMISSION_DENIED"] = "RBAC_1001";
    RBACErrorCode["PERMISSION_NOT_FOUND"] = "RBAC_1002";
    RBACErrorCode["INVALID_PERMISSION_FORMAT"] = "RBAC_1003";
    RBACErrorCode["PERMISSION_ALREADY_EXISTS"] = "RBAC_1004";
    // Role errors (2xxx)
    RBACErrorCode["ROLE_NOT_FOUND"] = "RBAC_2001";
    RBACErrorCode["ROLE_ALREADY_EXISTS"] = "RBAC_2002";
    RBACErrorCode["ROLE_IN_USE"] = "RBAC_2003";
    RBACErrorCode["INVALID_ROLE_NAME"] = "RBAC_2004";
    RBACErrorCode["SYSTEM_ROLE_MODIFICATION"] = "RBAC_2005";
    // Hierarchy errors (3xxx)
    RBACErrorCode["CIRCULAR_HIERARCHY"] = "RBAC_3001";
    RBACErrorCode["MAX_HIERARCHY_DEPTH"] = "RBAC_3002";
    RBACErrorCode["INVALID_PARENT_ROLE"] = "RBAC_3003";
    RBACErrorCode["CROSS_TENANT_INHERITANCE"] = "RBAC_3004";
    // User errors (4xxx)
    RBACErrorCode["USER_NOT_FOUND"] = "RBAC_4001";
    RBACErrorCode["ROLE_ALREADY_ASSIGNED"] = "RBAC_4002";
    RBACErrorCode["ROLE_NOT_ASSIGNED"] = "RBAC_4003";
    RBACErrorCode["ASSIGNMENT_EXPIRED"] = "RBAC_4004";
    // Configuration errors (5xxx)
    RBACErrorCode["INVALID_CONFIGURATION"] = "RBAC_5001";
    RBACErrorCode["ADAPTER_NOT_INITIALIZED"] = "RBAC_5002";
    RBACErrorCode["CACHE_ERROR"] = "RBAC_5003";
    RBACErrorCode["ADAPTER_ERROR"] = "RBAC_5004";
    // Validation errors (6xxx)
    RBACErrorCode["VALIDATION_ERROR"] = "RBAC_6001";
    RBACErrorCode["INVALID_INPUT"] = "RBAC_6002";
    RBACErrorCode["MISSING_REQUIRED_FIELD"] = "RBAC_6003";
    // General errors (9xxx)
    RBACErrorCode["UNKNOWN_ERROR"] = "RBAC_9001";
    RBACErrorCode["OPERATION_FAILED"] = "RBAC_9002";
    RBACErrorCode["TIMEOUT"] = "RBAC_9003";
})(RBACErrorCode || (exports.RBACErrorCode = RBACErrorCode = {}));
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
class RBACError extends Error {
    /** Error code for programmatic handling */
    code;
    /** Additional context about the error */
    context;
    /** Timestamp when the error occurred */
    timestamp;
    /** Whether this error is operational (expected) vs programming error */
    isOperational;
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
    constructor(message, code = RBACErrorCode.UNKNOWN_ERROR, context = {}, isOperational = true) {
        super(message);
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
        this.name = this.constructor.name;
        this.code = code;
        this.context = { code, ...context };
        this.timestamp = new Date();
        this.isOperational = isOperational;
        // Ensure the prototype chain is correctly set up
        Object.setPrototypeOf(this, new.target.prototype);
    }
    /**
     * Create a string representation of the error for logging.
     *
     * @returns Formatted error string
     */
    toString() {
        const contextStr = Object.keys(this.context).length > 1
            ? ` Context: ${JSON.stringify(this.context)}`
            : '';
        return `[${this.code}] ${this.message}${contextStr}`;
    }
    /**
     * Convert error to a plain object for serialization.
     *
     * @returns Plain object representation
     */
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
    static isRBACError(error) {
        return error instanceof RBACError;
    }
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
    static hasCode(error, code) {
        return RBACError.isRBACError(error) && error.code === code;
    }
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