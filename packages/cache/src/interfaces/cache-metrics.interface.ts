/**
 * @fileoverview Cache metrics interface for monitoring.
 */

/**
 * Detailed cache metrics for monitoring and observability.
 */
export interface ICacheMetrics {
  /**
   * Total number of cache hits.
   */
  hits: number;

  /**
   * Total number of cache misses.
   */
  misses: number;

  /**
   * Hit rate as a percentage (0-100).
   */
  hitRate: number;

  /**
   * Current number of entries in the cache.
   */
  size: number;

  /**
   * Maximum allowed size of the cache.
   */
  maxSize: number;

  /**
   * Estimated memory usage in bytes (if tracking is enabled).
   */
  memoryUsage?: number;

  /**
   * Number of evictions due to size limits.
   */
  evictions: number;

  /**
   * Number of entries expired and removed.
   */
  expirations: number;

  /**
   * Number of get operations.
   */
  getOperations: number;

  /**
   * Number of set operations.
   */
  setOperations: number;

  /**
   * Number of delete operations.
   */
  deleteOperations: number;

  /**
   * Average get operation latency in milliseconds.
   */
  avgGetLatencyMs: number;

  /**
   * Average set operation latency in milliseconds.
   */
  avgSetLatencyMs: number;

  /**
   * Cache start time.
   */
  startedAt: Date;

  /**
   * Cache uptime in milliseconds.
   */
  uptimeMs: number;
}

/**
 * L1/L2 specific metrics for multi-level cache.
 */
export interface IMultiLevelCacheMetrics {
  /**
   * L1 (local memory) cache metrics.
   */
  l1: ICacheMetrics | null;

  /**
   * L2 (distributed) cache metrics.
   */
  l2: ICacheMetrics | null;

  /**
   * Total hit rate across both levels.
   */
  combinedHitRate: number;

  /**
   * Number of times L1 served the request.
   */
  l1Hits: number;

  /**
   * Number of times L2 served the request (L1 miss).
   */
  l2Hits: number;

  /**
   * Number of times both levels missed.
   */
  totalMisses: number;
}

/**
 * Cache health status.
 */
export interface ICacheHealthStatus {
  /**
   * Whether the cache is healthy.
   */
  healthy: boolean;

  /**
   * Cache adapter name.
   */
  adapter: string;

  /**
   * Connection status (for remote caches).
   */
  connected: boolean;

  /**
   * Last successful operation timestamp.
   */
  lastSuccessfulOperation: Date | null;

  /**
   * Last error message (if any).
   */
  lastError: string | null;

  /**
   * Number of consecutive failures.
   */
  consecutiveFailures: number;

  /**
   * Response time of health check in milliseconds.
   */
  responseTimeMs: number;
}
