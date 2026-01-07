"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheSerializationError = void 0;
const cache_error_1 = require("./cache.error");
class CacheSerializationError extends cache_error_1.CacheError {
    constructor(code, message, context = {}, cause) {
        super(code, message, context, cause);
        this.name = 'CacheSerializationError';
    }
    static serialize(key, valueType, cause) {
        return new CacheSerializationError(cache_error_1.CacheErrorCode.SERIALIZATION_ERROR, `Failed to serialize value for key "${key}" (type: ${valueType})`, {
            key,
            valueType,
            operation: 'serialize',
        }, cause);
    }
    static deserialize(key, cause) {
        return new CacheSerializationError(cache_error_1.CacheErrorCode.DESERIALIZATION_ERROR, `Failed to deserialize value for key "${key}"`, {
            key,
            operation: 'deserialize',
        }, cause);
    }
    static circularReference(key, cause) {
        return new CacheSerializationError(cache_error_1.CacheErrorCode.SERIALIZATION_ERROR, `Circular reference detected while serializing key "${key}"`, {
            key,
            operation: 'serialize',
        }, cause);
    }
}
exports.CacheSerializationError = CacheSerializationError;
//# sourceMappingURL=serialization.error.js.map