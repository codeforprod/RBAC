"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CACHE_MANAGER_OPTIONS = exports.DEFAULT_REDIS_CACHE_OPTIONS = exports.DEFAULT_MEMORY_CACHE_OPTIONS = void 0;
exports.DEFAULT_MEMORY_CACHE_OPTIONS = {
    maxSize: 1000,
    defaultTtl: 300,
    cleanupInterval: 60000,
    useLru: true,
    trackMemoryUsage: false,
};
exports.DEFAULT_REDIS_CACHE_OPTIONS = {
    host: 'localhost',
    port: 6379,
    db: 0,
    connectTimeout: 10000,
    commandTimeout: 5000,
    defaultTtl: 300,
    keyPrefix: 'rbac:',
    tls: false,
    maxRetries: 3,
    retryDelay: 100,
    cluster: false,
    scanCount: 100,
    enablePubSub: false,
    pubSubChannel: 'rbac:cache:invalidation',
};
exports.DEFAULT_CACHE_MANAGER_OPTIONS = {
    l1: exports.DEFAULT_MEMORY_CACHE_OPTIONS,
    l2: null,
    multiLevel: true,
    warmOnStartup: false,
    collectMetrics: true,
    metricsInterval: 60000,
};
//# sourceMappingURL=cache-options.types.js.map