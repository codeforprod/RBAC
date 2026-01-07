import { CacheError, CacheErrorContext } from './cache.error';
export interface ConnectionErrorContext extends CacheErrorContext {
    host?: string;
    port?: number;
    retryAttempts?: number;
    maxRetries?: number;
}
export declare class CacheConnectionError extends CacheError {
    constructor(message: string, context?: ConnectionErrorContext, cause?: Error);
    static timeout(host: string, port: number, timeoutMs: number, cause?: Error): CacheConnectionError;
    static refused(host: string, port: number, cause?: Error): CacheConnectionError;
    static maxRetriesExceeded(host: string, port: number, retryAttempts: number, maxRetries: number, cause?: Error): CacheConnectionError;
}
//# sourceMappingURL=connection.error.d.ts.map