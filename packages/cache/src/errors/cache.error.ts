/**
 * @fileoverview Base cache error class.
 */

/**
 * Cache error codes.
 */
export enum CacheErrorCode {
  /**
   * General cache error.
   */
  CACHE_ERROR = 'CACHE_ERROR',

  /**
   * Connection failed.
   */
  CONNECTION_FAILED = 'CONNECTION_FAILED',

  /**
   * Connection timeout.
   */
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',

  /**
   * Operation timeout.
   */
  OPERATION_TIMEOUT = 'OPERATION_TIMEOUT',

  /**
   * Serialization error.
   */
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',

  /**
   * Deserialization error.
   */
  DESERIALIZATION_ERROR = 'DESERIALIZATION_ERROR',

  /**
   * Cache not initialized.
   */
  NOT_INITIALIZED = 'NOT_INITIALIZED',

  /**
   * Maximum size exceeded.
   */
  MAX_SIZE_EXCEEDED = 'MAX_SIZE_EXCEEDED',

  /**
   * Invalid configuration.
   */
  INVALID_CONFIG = 'INVALID_CONFIG',

  /**
   * Lock acquisition failed.
   */
  LOCK_FAILED = 'LOCK_FAILED',

  /**
   * Cluster error.
   */
  CLUSTER_ERROR = 'CLUSTER_ERROR',
}

/**
 * Context information for cache errors.
 */
export interface CacheErrorContext {
  /**
   * Cache adapter name.
   */
  adapter?: string;

  /**
   * Operation that caused the error.
   */
  operation?: string;

  /**
   * Cache key involved.
   */
  key?: string;

  /**
   * Pattern involved (for pattern operations).
   */
  pattern?: string;

  /**
   * Original error message.
   */
  originalError?: string;

  /**
   * Additional context data.
   */
  [key: string]: unknown;
}

/**
 * Base error class for cache operations.
 */
export class CacheError extends Error {
  /**
   * Error code.
   */
  readonly code: CacheErrorCode;

  /**
   * Error context.
   */
  readonly context: CacheErrorContext;

  /**
   * Original error that caused this error.
   */
  readonly cause?: Error;

  constructor(
    code: CacheErrorCode,
    message: string,
    context: CacheErrorContext = {},
    cause?: Error
  ) {
    super(message);
    this.name = 'CacheError';
    this.code = code;
    this.context = context;
    this.cause = cause;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Create a string representation of the error.
   */
  toString(): string {
    const contextStr = Object.keys(this.context).length > 0
      ? ` Context: ${JSON.stringify(this.context)}`
      : '';
    return `${this.name} [${this.code}]: ${this.message}${contextStr}`;
  }

  /**
   * Convert error to a plain object for logging.
   */
  toJSON(): Record<string, unknown> {
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
