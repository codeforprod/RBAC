/**
 * @fileoverview Cache serialization error class.
 */

import { CacheError, CacheErrorCode, CacheErrorContext } from './cache.error';

/**
 * Context for serialization errors.
 */
export interface SerializationErrorContext extends CacheErrorContext {
  /**
   * Type of value that failed to serialize.
   */
  valueType?: string;

  /**
   * Size of the value (if known).
   */
  valueSize?: number;
}

/**
 * Error thrown when cache serialization/deserialization fails.
 */
export class CacheSerializationError extends CacheError {
  constructor(
    code: CacheErrorCode.SERIALIZATION_ERROR | CacheErrorCode.DESERIALIZATION_ERROR,
    message: string,
    context: SerializationErrorContext = {},
    cause?: Error,
  ) {
    super(code, message, context, cause);
    this.name = 'CacheSerializationError';
  }

  /**
   * Create a serialization error.
   */
  static serialize(key: string, valueType: string, cause?: Error): CacheSerializationError {
    return new CacheSerializationError(
      CacheErrorCode.SERIALIZATION_ERROR,
      `Failed to serialize value for key "${key}" (type: ${valueType})`,
      {
        key,
        valueType,
        operation: 'serialize',
      },
      cause,
    );
  }

  /**
   * Create a deserialization error.
   */
  static deserialize(key: string, cause?: Error): CacheSerializationError {
    return new CacheSerializationError(
      CacheErrorCode.DESERIALIZATION_ERROR,
      `Failed to deserialize value for key "${key}"`,
      {
        key,
        operation: 'deserialize',
      },
      cause,
    );
  }

  /**
   * Create a circular reference error.
   */
  static circularReference(key: string, cause?: Error): CacheSerializationError {
    return new CacheSerializationError(
      CacheErrorCode.SERIALIZATION_ERROR,
      `Circular reference detected while serializing key "${key}"`,
      {
        key,
        operation: 'serialize',
      },
      cause,
    );
  }
}
