export interface MemoryCacheOptions {
    maxSize: number;
    defaultTtl: number;
    cleanupInterval: number;
    useLru: boolean;
    trackMemoryUsage: boolean;
}
export interface RedisCacheOptions {
    host: string;
    port: number;
    password?: string;
    db: number;
    connectTimeout: number;
    commandTimeout: number;
    defaultTtl: number;
    keyPrefix: string;
    tls: boolean;
    maxRetries: number;
    retryDelay: number;
    cluster: boolean;
    clusterNodes?: RedisClusterNode[];
    scanCount: number;
    enablePubSub: boolean;
    pubSubChannel: string;
}
export interface RedisClusterNode {
    host: string;
    port: number;
}
export interface CacheManagerOptions {
    l1?: MemoryCacheOptions | null;
    l2?: RedisCacheOptions | null;
    multiLevel: boolean;
    warmOnStartup: boolean;
    warmupKeys?: string[];
    collectMetrics: boolean;
    metricsInterval: number;
}
export declare const DEFAULT_MEMORY_CACHE_OPTIONS: MemoryCacheOptions;
export declare const DEFAULT_REDIS_CACHE_OPTIONS: RedisCacheOptions;
export declare const DEFAULT_CACHE_MANAGER_OPTIONS: CacheManagerOptions;
//# sourceMappingURL=cache-options.types.d.ts.map