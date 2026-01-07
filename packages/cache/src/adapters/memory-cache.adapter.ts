/**
 * @fileoverview In-memory cache adapter with LRU eviction and TTL support.
 *
 * This adapter provides a high-performance in-memory cache suitable for:
 * - Development and testing environments
 * - Single-instance deployments
 * - L1 cache in multi-level caching setups
 *
 * Features:
 * - LRU eviction with O(1) operations
 * - Per-entry TTL with automatic cleanup
 * - Tag-based invalidation
 * - Pattern-based key deletion
 * - Comprehensive metrics collection
 */

import { ICacheSetOptions, ICacheGetOptions, ICacheStats } from '@holocron/rbac-core';
import { ICacheAdapter, ICacheEntry, ICacheMetrics, ICacheHealthStatus } from '../interfaces';
import { LRUStrategy, LRUEvictionEvent } from '../strategies/lru-strategy';
import { TTLStrategy } from '../strategies/ttl-strategy';
import { MemoryCacheOptions, DEFAULT_MEMORY_CACHE_OPTIONS } from '../types';
import { CacheError, CacheErrorCode } from '../errors';

/**
 * Internal cache entry with full metadata.
 */
interface InternalCacheEntry<T = unknown> extends ICacheEntry<T> {
  /**
   * Serialized size estimate in bytes.
   */
  estimatedSize: number;
}

/**
 * In-memory cache adapter with LRU eviction strategy.
 *
 * Provides O(1) get/set operations with automatic TTL expiration
 * and LRU eviction when capacity is exceeded.
 *
 * @example
 * ```typescript
 * const cache = new MemoryCacheAdapter({
 *   maxSize: 1000,
 *   defaultTtl: 300,
 *   useLru: true,
 * });
 *
 * await cache.initialize();
 *
 * await cache.set('user:1', user, { ttl: 3600, tags: ['user'] });
 * const user = await cache.get<User>('user:1');
 *
 * // Pattern deletion
 * await cache.deletePattern('user:*');
 *
 * // Tag-based invalidation
 * await cache.deleteByTag('user');
 * ```
 */
export class MemoryCacheAdapter implements ICacheAdapter {
  /**
   * Adapter name.
   */
  readonly name = 'memory';

  /**
   * Configuration options.
   */
  private readonly options: MemoryCacheOptions;

  /**
   * LRU strategy for eviction.
   */
  private readonly lru: LRUStrategy<string, InternalCacheEntry>;

  /**
   * TTL strategy for expiration.
   */
  private readonly ttl: TTLStrategy;

  /**
   * Tag to keys mapping for tag-based invalidation.
   */
  private readonly tagIndex: Map<string, Set<string>> = new Map();

  /**
   * Whether the adapter is initialized.
   */
  private initialized = false;

  /**
   * Cache start time.
   */
  private startedAt: Date | null = null;

  /**
   * Metrics tracking.
   */
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    expirations: 0,
    getOperations: 0,
    setOperations: 0,
    deleteOperations: 0,
    getTotalLatencyMs: 0,
    setTotalLatencyMs: 0,
  };

  /**
   * Create a new memory cache adapter.
   *
   * @param options - Configuration options
   */
  constructor(options: Partial<MemoryCacheOptions> = {}) {
    this.options = { ...DEFAULT_MEMORY_CACHE_OPTIONS, ...options };

    // Initialize LRU strategy
    this.lru = new LRUStrategy<string, InternalCacheEntry>(
      this.options.maxSize,
      (event: LRUEvictionEvent<string, InternalCacheEntry>) => {
        this.handleEviction(event.key, event.value, 'lru');
      }
    );

    // Initialize TTL strategy
    this.ttl = new TTLStrategy({
      defaultTtl: this.options.defaultTtl,
      cleanupInterval: this.options.cleanupInterval,
    });

    // Subscribe to TTL expirations
    this.ttl.onExpiration((event) => {
      this.handleExpiration(event.key);
    });
  }

  /**
   * Initialize the cache adapter.
   */
  async initialize(): Promise<void> {
    this.startedAt = new Date();
    this.initialized = true;
  }

  /**
   * Check if the adapter is ready.
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get a value from the cache.
   *
   * @param key - Cache key
   * @param options - Get options
   * @returns Cached value or null
   */
  async get<T>(key: string, options?: ICacheGetOptions): Promise<T | null> {
    this.ensureInitialized();
    const startTime = performance.now();
    this.metrics.getOperations++;

    try {
      // Check TTL first
      if (this.ttl.isExpired(key)) {
        this.metrics.misses++;
        return null;
      }

      // Get from LRU (updates access order)
      const entry = this.lru.get(key);

      if (!entry) {
        this.metrics.misses++;
        return null;
      }

      // Update access metadata
      entry.accessedAt = Date.now();
      entry.accessCount++;

      // Handle sliding expiration
      if (options?.refreshTtl) {
        this.ttl.touch(key);
      }

      this.metrics.hits++;
      return entry.value as T;
    } finally {
      this.metrics.getTotalLatencyMs += performance.now() - startTime;
    }
  }

  /**
   * Set a value in the cache.
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Set options
   */
  async set<T>(key: string, value: T, options?: ICacheSetOptions): Promise<void> {
    this.ensureInitialized();
    const startTime = performance.now();
    this.metrics.setOperations++;

    try {
      const now = Date.now();
      const ttl = options?.ttl ?? this.options.defaultTtl;
      const tags = options?.tags ?? [];

      // Remove existing entry from tag index
      const existingEntry = this.lru.peek(key);
      if (existingEntry) {
        this.removeFromTagIndex(key, existingEntry.tags);
      }

      // Calculate size estimate
      const estimatedSize = this.options.trackMemoryUsage
        ? this.estimateSize(value)
        : 0;

      // Create entry
      const entry: InternalCacheEntry<T> = {
        value,
        createdAt: now,
        accessedAt: now,
        expiresAt: ttl > 0 ? now + ttl * 1000 : null,
        tags,
        accessCount: 0,
        estimatedSize,
        size: estimatedSize,
      };

      // Store in LRU
      this.lru.set(key, entry as InternalCacheEntry);

      // Set TTL
      if (ttl > 0) {
        this.ttl.set(key, ttl);
      }

      // Update tag index
      this.addToTagIndex(key, tags);
    } finally {
      this.metrics.setTotalLatencyMs += performance.now() - startTime;
    }
  }

  /**
   * Delete a value from the cache.
   *
   * @param key - Cache key
   * @returns True if key was deleted
   */
  async delete(key: string): Promise<boolean> {
    this.ensureInitialized();
    this.metrics.deleteOperations++;

    const entry = this.lru.peek(key);

    if (!entry) {
      return false;
    }

    // Remove from tag index
    this.removeFromTagIndex(key, entry.tags);

    // Remove from TTL tracking
    this.ttl.remove(key);

    // Remove from LRU
    return this.lru.delete(key);
  }

  /**
   * Check if a key exists.
   *
   * @param key - Cache key
   * @returns True if key exists and is not expired
   */
  async exists(key: string): Promise<boolean> {
    this.ensureInitialized();

    if (this.ttl.isExpired(key)) {
      return false;
    }

    return this.lru.has(key);
  }

  /**
   * Delete keys matching a pattern.
   *
   * @param pattern - Glob pattern
   * @returns Number of keys deleted
   */
  async deletePattern(pattern: string): Promise<number> {
    this.ensureInitialized();
    this.metrics.deleteOperations++;

    const regex = this.patternToRegex(pattern);
    const keysToDelete: string[] = [];

    for (const key of this.lru.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key);
    }

    return keysToDelete.length;
  }

  /**
   * Delete keys with a specific tag.
   *
   * @param tag - Tag to match
   * @returns Number of keys deleted
   */
  async deleteByTag(tag: string): Promise<number> {
    return this.deleteByTags([tag]);
  }

  /**
   * Delete keys with any of the specified tags.
   *
   * @param tags - Tags to match
   * @returns Number of keys deleted
   */
  async deleteByTags(tags: string[]): Promise<number> {
    this.ensureInitialized();
    this.metrics.deleteOperations++;

    const keysToDelete = new Set<string>();

    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        for (const key of keys) {
          keysToDelete.add(key);
        }
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key);
    }

    return keysToDelete.size;
  }

  /**
   * Get multiple values from the cache.
   *
   * @param keys - Array of keys
   * @returns Map of key to value
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T | null>> {
    this.ensureInitialized();

    const result = new Map<string, T | null>();

    for (const key of keys) {
      result.set(key, await this.get<T>(key));
    }

    return result;
  }

  /**
   * Set multiple values in the cache.
   *
   * @param entries - Map of key to value
   * @param options - Set options
   */
  async setMany<T>(entries: Map<string, T>, options?: ICacheSetOptions): Promise<void> {
    this.ensureInitialized();

    for (const [key, value] of entries) {
      await this.set(key, value, options);
    }
  }

  /**
   * Clear all cache entries.
   *
   * @returns Number of keys cleared
   */
  async clear(): Promise<number> {
    this.ensureInitialized();

    const count = this.lru.size;

    this.lru.clear();
    this.ttl.clear();
    this.tagIndex.clear();

    return count;
  }

  /**
   * Get cache statistics.
   */
  async getStats(): Promise<ICacheStats> {
    this.ensureInitialized();

    const total = this.metrics.hits + this.metrics.misses;

    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate: total > 0 ? this.metrics.hits / total : 0,
      size: this.lru.size,
      memoryUsage: this.options.trackMemoryUsage ? this.calculateMemoryUsage() : undefined,
    };
  }

  /**
   * Reset cache statistics.
   */
  async resetStats(): Promise<void> {
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0,
      getOperations: 0,
      setOperations: 0,
      deleteOperations: 0,
      getTotalLatencyMs: 0,
      setTotalLatencyMs: 0,
    };
  }

  /**
   * Get or set a value with a factory function.
   *
   * @param key - Cache key
   * @param factory - Factory function
   * @param options - Set options
   * @returns Cached or newly created value
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: ICacheSetOptions
  ): Promise<T> {
    this.ensureInitialized();

    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Lock a key for exclusive access.
   * In-memory implementation uses simple flag-based locking.
   *
   * @param key - Key to lock
   * @param ttl - Lock TTL in seconds
   * @returns Release function or null if lock not acquired
   */
  async lock(key: string, ttl: number = 30): Promise<(() => Promise<void>) | null> {
    const lockKey = `__lock__:${key}`;

    // Check if lock exists
    const existingLock = await this.get<boolean>(lockKey);
    if (existingLock) {
      return null;
    }

    // Acquire lock
    await this.set(lockKey, true, { ttl });

    // Return release function
    return async () => {
      await this.delete(lockKey);
    };
  }

  /**
   * Health check.
   */
  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }

  /**
   * Shutdown the cache.
   */
  async shutdown(): Promise<void> {
    this.ttl.stop();
    this.lru.clear();
    this.tagIndex.clear();
    this.initialized = false;
  }

  /**
   * Get detailed cache metrics.
   */
  async getMetrics(): Promise<ICacheMetrics> {
    this.ensureInitialized();

    const total = this.metrics.hits + this.metrics.misses;

    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate: total > 0 ? (this.metrics.hits / total) * 100 : 0,
      size: this.lru.size,
      maxSize: this.options.maxSize,
      memoryUsage: this.options.trackMemoryUsage ? this.calculateMemoryUsage() : undefined,
      evictions: this.metrics.evictions,
      expirations: this.metrics.expirations,
      getOperations: this.metrics.getOperations,
      setOperations: this.metrics.setOperations,
      deleteOperations: this.metrics.deleteOperations,
      avgGetLatencyMs: this.metrics.getOperations > 0
        ? this.metrics.getTotalLatencyMs / this.metrics.getOperations
        : 0,
      avgSetLatencyMs: this.metrics.setOperations > 0
        ? this.metrics.setTotalLatencyMs / this.metrics.setOperations
        : 0,
      startedAt: this.startedAt ?? new Date(),
      uptimeMs: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
    };
  }

  /**
   * Get cache health status.
   */
  async getHealthStatus(): Promise<ICacheHealthStatus> {
    return {
      healthy: this.initialized,
      adapter: this.name,
      connected: true, // Always connected for in-memory
      lastSuccessfulOperation: new Date(),
      lastError: null,
      consecutiveFailures: 0,
      responseTimeMs: 0,
    };
  }

  /**
   * Get remaining TTL for a key.
   *
   * @param key - Cache key
   * @returns TTL in seconds, -1 if no expiry, -2 if not found
   */
  async getTtl(key: string): Promise<number> {
    this.ensureInitialized();

    if (!this.lru.has(key)) {
      return -2;
    }

    return this.ttl.getTtl(key);
  }

  /**
   * Update TTL for a key.
   *
   * @param key - Cache key
   * @param ttl - New TTL in seconds
   * @returns True if TTL was updated
   */
  async updateTtl(key: string, ttl: number): Promise<boolean> {
    this.ensureInitialized();

    if (!this.lru.has(key)) {
      return false;
    }

    return this.ttl.updateTtl(key, ttl);
  }

  /**
   * Get all keys matching a pattern.
   *
   * @param pattern - Glob pattern
   * @returns Array of matching keys
   */
  async keys(pattern: string): Promise<string[]> {
    this.ensureInitialized();

    const regex = this.patternToRegex(pattern);
    const matchingKeys: string[] = [];

    for (const key of this.lru.keys()) {
      if (regex.test(key)) {
        matchingKeys.push(key);
      }
    }

    return matchingKeys;
  }

  /**
   * Touch a key to update its access time.
   *
   * @param key - Cache key
   * @returns True if key was touched
   */
  async touch(key: string): Promise<boolean> {
    this.ensureInitialized();

    const entry = this.lru.get(key); // This updates LRU order

    if (!entry) {
      return false;
    }

    entry.accessedAt = Date.now();
    entry.accessCount++;

    return true;
  }

  /**
   * Handle LRU eviction.
   */
  private handleEviction(key: string, entry: InternalCacheEntry, _reason: string): void {
    this.metrics.evictions++;

    // Remove from tag index
    this.removeFromTagIndex(key, entry.tags);

    // Remove from TTL tracking
    this.ttl.remove(key);
  }

  /**
   * Handle TTL expiration.
   */
  private handleExpiration(key: string): void {
    const entry = this.lru.peek(key);

    if (entry) {
      this.metrics.expirations++;

      // Remove from tag index
      this.removeFromTagIndex(key, entry.tags);

      // Remove from LRU
      this.lru.delete(key);
    }
  }

  /**
   * Add key to tag index.
   */
  private addToTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      let keys = this.tagIndex.get(tag);

      if (!keys) {
        keys = new Set();
        this.tagIndex.set(tag, keys);
      }

      keys.add(key);
    }
  }

  /**
   * Remove key from tag index.
   */
  private removeFromTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      const keys = this.tagIndex.get(tag);

      if (keys) {
        keys.delete(key);

        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
  }

  /**
   * Convert glob pattern to regex.
   */
  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '<<<DOUBLE_STAR>>>')
      .replace(/\*/g, '[^:]*')
      .replace(/<<<DOUBLE_STAR>>>/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${escaped}$`);
  }

  /**
   * Estimate size of a value in bytes.
   */
  private estimateSize(value: unknown): number {
    try {
      const str = JSON.stringify(value);
      return str.length * 2; // Rough estimate (2 bytes per char for UTF-16)
    } catch {
      return 0;
    }
  }

  /**
   * Calculate total memory usage.
   */
  private calculateMemoryUsage(): number {
    let total = 0;

    this.lru.forEach((entry) => {
      total += entry.estimatedSize;
    });

    return total;
  }

  /**
   * Ensure the adapter is initialized.
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new CacheError(
        CacheErrorCode.NOT_INITIALIZED,
        'Memory cache adapter is not initialized. Call initialize() first.',
        { adapter: this.name }
      );
    }
  }
}
