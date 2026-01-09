/**
 * @fileoverview Extended cache adapter interface with additional capabilities.
 */

import type {
  IRBACCache,
  ICacheSetOptions,
  ICacheGetOptions,
  ICacheStats,
} from '@prodforcode/rbac-core';

// Re-export types that are used elsewhere
export type { ICacheSetOptions, ICacheGetOptions, ICacheStats };
import { ICacheMetrics, ICacheHealthStatus } from './cache-metrics.interface';

/**
 * Extended cache adapter interface with lifecycle and metrics support.
 * Extends the core IRBACCache interface with additional functionality.
 */
export interface ICacheAdapter extends IRBACCache {
  /**
   * Adapter name for identification.
   */
  readonly name: string;

  /**
   * Initialize the cache adapter.
   * Should be called before any cache operations.
   */
  initialize(): Promise<void>;

  /**
   * Get detailed cache metrics.
   */
  getMetrics(): Promise<ICacheMetrics>;

  /**
   * Get cache health status.
   */
  getHealthStatus(): Promise<ICacheHealthStatus>;

  /**
   * Check if the adapter is initialized and ready.
   */
  isReady(): boolean;

  /**
   * Subscribe to cache invalidation events (for distributed caches).
   *
   * @param callback - Function to call when invalidation event is received
   * @returns Unsubscribe function
   */
  onInvalidation?(callback: (key: string) => void): () => void;

  /**
   * Publish cache invalidation event (for distributed caches).
   *
   * @param key - Key that was invalidated
   */
  publishInvalidation?(key: string): Promise<void>;

  /**
   * Get the remaining TTL for a key in seconds.
   *
   * @param key - Cache key
   * @returns TTL in seconds, -1 if no expiry, -2 if key doesn't exist
   */
  getTtl(key: string): Promise<number>;

  /**
   * Update the TTL for an existing key.
   *
   * @param key - Cache key
   * @param ttl - New TTL in seconds
   * @returns True if TTL was updated, false if key doesn't exist
   */
  updateTtl(key: string, ttl: number): Promise<boolean>;

  /**
   * Get all keys matching a pattern.
   *
   * @param pattern - Key pattern (glob syntax)
   * @returns Array of matching keys
   */
  keys(pattern: string): Promise<string[]>;

  /**
   * Touch a key to update its access time (for LRU).
   *
   * @param key - Cache key
   * @returns True if key was touched, false if key doesn't exist
   */
  touch(key: string): Promise<boolean>;
}

/**
 * Cache entry with metadata.
 */
export interface ICacheEntry<T = unknown> {
  /**
   * The cached value.
   */
  value: T;

  /**
   * When the entry was created.
   */
  createdAt: number;

  /**
   * When the entry was last accessed.
   */
  accessedAt: number;

  /**
   * When the entry expires (null if no expiry).
   */
  expiresAt: number | null;

  /**
   * Tags associated with this entry.
   */
  tags: string[];

  /**
   * Access count for statistics.
   */
  accessCount: number;

  /**
   * Approximate size in bytes (if tracking enabled).
   */
  size?: number;
}

/**
 * Cache eviction event data.
 */
export interface ICacheEvictionEvent {
  /**
   * The evicted key.
   */
  key: string;

  /**
   * Reason for eviction.
   */
  reason: CacheEvictionReason;

  /**
   * When the eviction occurred.
   */
  timestamp: number;
}

/**
 * Reasons for cache entry eviction.
 */
export type CacheEvictionReason =
  | 'expired'
  | 'lru'
  | 'manual'
  | 'pattern_delete'
  | 'tag_delete'
  | 'clear';

/**
 * Cache adapter factory interface.
 */
export interface ICacheAdapterFactory<TOptions, TAdapter extends ICacheAdapter> {
  /**
   * Create a cache adapter instance.
   *
   * @param options - Adapter configuration options
   * @returns Cache adapter instance
   */
  create(options: TOptions): TAdapter;
}
