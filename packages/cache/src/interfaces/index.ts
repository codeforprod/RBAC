/**
 * @fileoverview Cache interfaces barrel export.
 */

export {
  ICacheMetrics,
  IMultiLevelCacheMetrics,
  ICacheHealthStatus,
} from './cache-metrics.interface';

export {
  ICacheAdapter,
  ICacheEntry,
  ICacheEvictionEvent,
  CacheEvictionReason,
  ICacheAdapterFactory,
} from './cache-adapter.interface';
