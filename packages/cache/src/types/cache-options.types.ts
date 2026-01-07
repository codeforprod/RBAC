/**
 * @fileoverview Cache configuration options types.
 */

/**
 * Configuration options for memory cache adapter.
 */
export interface MemoryCacheOptions {
  /**
   * Maximum number of entries in the cache.
   * When exceeded, LRU entries are evicted.
   * @default 1000
   */
  maxSize: number;

  /**
   * Default TTL in seconds for cache entries.
   * Can be overridden per-entry.
   * @default 300 (5 minutes)
   */
  defaultTtl: number;

  /**
   * Interval in milliseconds for automatic cleanup of expired entries.
   * Set to 0 to disable automatic cleanup.
   * @default 60000 (1 minute)
   */
  cleanupInterval: number;

  /**
   * Whether to use LRU eviction strategy.
   * If false, uses FIFO.
   * @default true
   */
  useLru: boolean;

  /**
   * Whether to track memory usage.
   * Enabling this adds overhead but provides memory stats.
   * @default false
   */
  trackMemoryUsage: boolean;
}

/**
 * Configuration options for Redis cache adapter.
 */
export interface RedisCacheOptions {
  /**
   * Redis connection host.
   * @default 'localhost'
   */
  host: string;

  /**
   * Redis connection port.
   * @default 6379
   */
  port: number;

  /**
   * Redis password for authentication.
   */
  password?: string;

  /**
   * Redis database number.
   * @default 0
   */
  db: number;

  /**
   * Connection timeout in milliseconds.
   * @default 10000
   */
  connectTimeout: number;

  /**
   * Command timeout in milliseconds.
   * @default 5000
   */
  commandTimeout: number;

  /**
   * Default TTL in seconds for cache entries.
   * @default 300
   */
  defaultTtl: number;

  /**
   * Key prefix for all cache keys.
   * Useful for namespacing in shared Redis instances.
   * @default 'rbac:'
   */
  keyPrefix: string;

  /**
   * Whether to enable TLS/SSL connection.
   * @default false
   */
  tls: boolean;

  /**
   * Maximum number of retries for failed commands.
   * @default 3
   */
  maxRetries: number;

  /**
   * Retry delay in milliseconds.
   * @default 100
   */
  retryDelay: number;

  /**
   * Enable cluster mode.
   * @default false
   */
  cluster: boolean;

  /**
   * Cluster nodes when cluster mode is enabled.
   */
  clusterNodes?: RedisClusterNode[];

  /**
   * Scan count for pattern deletion operations.
   * Higher values reduce round trips but increase memory usage.
   * @default 100
   */
  scanCount: number;

  /**
   * Enable pub/sub for cache invalidation across instances.
   * @default false
   */
  enablePubSub: boolean;

  /**
   * Pub/sub channel name for cache invalidation.
   * @default 'rbac:cache:invalidation'
   */
  pubSubChannel: string;
}

/**
 * Redis cluster node configuration.
 */
export interface RedisClusterNode {
  /**
   * Node host.
   */
  host: string;

  /**
   * Node port.
   */
  port: number;
}

/**
 * Configuration options for cache manager service.
 */
export interface CacheManagerOptions {
  /**
   * L1 (local memory) cache options.
   * Set to null to disable L1 cache.
   */
  l1?: MemoryCacheOptions | null;

  /**
   * L2 (distributed) cache options.
   * Set to null to disable L2 cache.
   */
  l2?: RedisCacheOptions | null;

  /**
   * Whether to enable multi-level caching.
   * When enabled, reads check L1 first, then L2.
   * Writes go to both levels.
   * @default true
   */
  multiLevel: boolean;

  /**
   * Whether to warm L1 cache from L2 on startup.
   * @default false
   */
  warmOnStartup: boolean;

  /**
   * Keys to warm on startup.
   * Only used if warmOnStartup is true.
   */
  warmupKeys?: string[];

  /**
   * Whether to collect metrics.
   * @default true
   */
  collectMetrics: boolean;

  /**
   * Metrics collection interval in milliseconds.
   * @default 60000
   */
  metricsInterval: number;
}

/**
 * Default memory cache options.
 */
export const DEFAULT_MEMORY_CACHE_OPTIONS: MemoryCacheOptions = {
  maxSize: 1000,
  defaultTtl: 300,
  cleanupInterval: 60000,
  useLru: true,
  trackMemoryUsage: false,
};

/**
 * Default Redis cache options.
 */
export const DEFAULT_REDIS_CACHE_OPTIONS: RedisCacheOptions = {
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

/**
 * Default cache manager options.
 */
export const DEFAULT_CACHE_MANAGER_OPTIONS: CacheManagerOptions = {
  l1: DEFAULT_MEMORY_CACHE_OPTIONS,
  l2: null,
  multiLevel: true,
  warmOnStartup: false,
  collectMetrics: true,
  metricsInterval: 60000,
};
