"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheConnectionError = void 0;
const cache_error_1 = require("./cache.error");
class CacheConnectionError extends cache_error_1.CacheError {
    constructor(message, context = {}, cause) {
        super(cache_error_1.CacheErrorCode.CONNECTION_FAILED, message, context, cause);
        this.name = 'CacheConnectionError';
    }
    static timeout(host, port, timeoutMs, cause) {
        return new CacheConnectionError(`Connection to ${host}:${port} timed out after ${timeoutMs}ms`, {
            host,
            port,
            adapter: 'redis',
            operation: 'connect',
        }, cause);
    }
    static refused(host, port, cause) {
        return new CacheConnectionError(`Connection to ${host}:${port} was refused`, {
            host,
            port,
            adapter: 'redis',
            operation: 'connect',
        }, cause);
    }
    static maxRetriesExceeded(host, port, retryAttempts, maxRetries, cause) {
        return new CacheConnectionError(`Failed to connect to ${host}:${port} after ${retryAttempts} attempts (max: ${maxRetries})`, {
            host,
            port,
            retryAttempts,
            maxRetries,
            adapter: 'redis',
            operation: 'connect',
        }, cause);
    }
}
exports.CacheConnectionError = CacheConnectionError;
//# sourceMappingURL=connection.error.js.map