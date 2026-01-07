import { CacheError, CacheErrorCode, CacheErrorContext } from './cache.error';
export interface SerializationErrorContext extends CacheErrorContext {
    valueType?: string;
    valueSize?: number;
}
export declare class CacheSerializationError extends CacheError {
    constructor(code: CacheErrorCode.SERIALIZATION_ERROR | CacheErrorCode.DESERIALIZATION_ERROR, message: string, context?: SerializationErrorContext, cause?: Error);
    static serialize(key: string, valueType: string, cause?: Error): CacheSerializationError;
    static deserialize(key: string, cause?: Error): CacheSerializationError;
    static circularReference(key: string, cause?: Error): CacheSerializationError;
}
//# sourceMappingURL=serialization.error.d.ts.map