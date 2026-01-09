/**
 * @fileoverview Cache connection error class.
 */

import { CacheError, CacheErrorCode, CacheErrorContext } from './cache.error';

/**
 * Context for connection errors.
 */
export interface ConnectionErrorContext extends CacheErrorContext {
  /**
   * Host that failed to connect.
   */
  host?: string;

  /**
   * Port that failed to connect.
   */
  port?: number;

  /**
   * Number of retry attempts made.
   */
  retryAttempts?: number;

  /**
   * Maximum retries configured.
   */
  maxRetries?: number;
}

/**
 * Error thrown when cache connection fails.
 */
export class CacheConnectionError extends CacheError {
  constructor(message: string, context: ConnectionErrorContext = {}, cause?: Error) {
    super(CacheErrorCode.CONNECTION_FAILED, message, context, cause);
    this.name = 'CacheConnectionError';
  }

  /**
   * Create a connection timeout error.
   */
  static timeout(
    host: string,
    port: number,
    timeoutMs: number,
    cause?: Error,
  ): CacheConnectionError {
    return new CacheConnectionError(
      `Connection to ${host}:${port} timed out after ${timeoutMs}ms`,
      {
        host,
        port,
        adapter: 'redis',
        operation: 'connect',
      },
      cause,
    );
  }

  /**
   * Create a connection refused error.
   */
  static refused(host: string, port: number, cause?: Error): CacheConnectionError {
    return new CacheConnectionError(
      `Connection to ${host}:${port} was refused`,
      {
        host,
        port,
        adapter: 'redis',
        operation: 'connect',
      },
      cause,
    );
  }

  /**
   * Create a max retries exceeded error.
   */
  static maxRetriesExceeded(
    host: string,
    port: number,
    retryAttempts: number,
    maxRetries: number,
    cause?: Error,
  ): CacheConnectionError {
    return new CacheConnectionError(
      `Failed to connect to ${host}:${port} after ${retryAttempts} attempts (max: ${maxRetries})`,
      {
        host,
        port,
        retryAttempts,
        maxRetries,
        adapter: 'redis',
        operation: 'connect',
      },
      cause,
    );
  }
}
