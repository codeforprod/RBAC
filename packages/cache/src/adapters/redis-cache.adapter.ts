/**
 * @fileoverview Redis cache adapter with cluster and pub/sub support.
 *
 * This adapter provides a production-ready Redis cache implementation:
 * - Single node and cluster mode support
 * - Pub/sub for distributed cache invalidation
 * - Pattern-based key deletion using SCAN
 * - Connection pooling and retry logic
 * - Comprehensive error handling and metrics
 *
 * Requires `ioredis` as a peer dependency.
 */

import { ICacheSetOptions, ICacheGetOptions, ICacheStats } from '@callairis/rbac-core';
import { ICacheAdapter, ICacheMetrics, ICacheHealthStatus } from '../interfaces';
import { RedisCacheOptions, DEFAULT_REDIS_CACHE_OPTIONS } from '../types';
import { CacheError, CacheErrorCode, CacheConnectionError, CacheSerializationError } from '../errors';

/**
 * Type for ioredis Redis client.
 * We use a minimal type definition to avoid requiring ioredis at compile time.
 */
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: unknown[]): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  mget(...keys: string[]): Promise<Array<string | null>>;
  mset(...keyValues: string[]): Promise<string>;
  keys(pattern: string): Promise<string[]>;
  scan(cursor: string | number, ...args: unknown[]): Promise<[string, string[]]>;
  ttl(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  flushdb(): Promise<string>;
  dbsize(): Promise<number>;
  info(section?: string): Promise<string>;
  ping(): Promise<string>;
  quit(): Promise<string>;
  subscribe(...channels: string[]): Promise<number>;
  publish(channel: string, message: string): Promise<number>;
  duplicate(): RedisClient;
  on(event: string, callback: (...args: any[]) => void): void;
  status: string;
  connect?: () => Promise<void>;
}

/**
 * Type for ioredis Cluster client.
 */
interface RedisClusterClient extends RedisClient {
  nodes(role?: 'master' | 'slave' | 'all'): RedisClient[];
}

/**
 * Redis cache adapter with cluster and pub/sub support.
 *
 * @example
 * ```typescript
 * const cache = new RedisCacheAdapter({
 *   host: 'localhost',
 *   port: 6379,
 *   keyPrefix: 'rbac:',
 *   defaultTtl: 300,
 * });
 *
 * await cache.initialize();
 *
 * await cache.set('user:1', user, { ttl: 3600, tags: ['user'] });
 * const user = await cache.get<User>('user:1');
 *
 * // With cluster mode
 * const clusterCache = new RedisCacheAdapter({
 *   cluster: true,
 *   clusterNodes: [
 *     { host: '127.0.0.1', port: 7000 },
 *     { host: '127.0.0.1', port: 7001 },
 *   ],
 * });
 * ```
 */
export class RedisCacheAdapter implements ICacheAdapter {
  /**
   * Adapter name.
   */
  readonly name = 'redis';

  /**
   * Configuration options.
   */
  private readonly options: RedisCacheOptions;

  /**
   * Redis client instance.
   */
  private client: RedisClient | RedisClusterClient | null = null;

  /**
   * Redis subscriber client for pub/sub.
   */
  private subscriber: RedisClient | null = null;

  /**
   * Whether the adapter is initialized.
   */
  private initialized = false;

  /**
   * Cache start time.
   */
  private startedAt: Date | null = null;

  /**
   * Last error encountered.
   */
  private lastError: Error | null = null;

  /**
   * Consecutive failure count.
   */
  private consecutiveFailures = 0;

  /**
   * Last successful operation time.
   */
  private lastSuccessfulOperation: Date | null = null;

  /**
   * Invalidation callbacks.
   */
  private invalidationCallbacks: Array<(key: string) => void> = [];

  /**
   * Metrics tracking.
   */
  private metrics = {
    hits: 0,
    misses: 0,
    getOperations: 0,
    setOperations: 0,
    deleteOperations: 0,
    getTotalLatencyMs: 0,
    setTotalLatencyMs: 0,
    errors: 0,
  };

  /**
   * Tag index key prefix.
   */
  private readonly tagPrefix: string;

  /**
   * Create a new Redis cache adapter.
   *
   * @param options - Configuration options
   */
  constructor(options: Partial<RedisCacheOptions> = {}) {
    this.options = { ...DEFAULT_REDIS_CACHE_OPTIONS, ...options };
    this.tagPrefix = `${this.options.keyPrefix}__tag__:`;
  }

  /**
   * Initialize the cache adapter.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import ioredis
      const Redis = await this.loadRedis();

      if (this.options.cluster && this.options.clusterNodes) {
        // Cluster mode
        this.client = new Redis.Cluster(
          this.options.clusterNodes.map(node => ({
            host: node.host,
            port: node.port,
          })),
          {
            redisOptions: {
              password: this.options.password,
              connectTimeout: this.options.connectTimeout,
              commandTimeout: this.options.commandTimeout,
              maxRetriesPerRequest: this.options.maxRetries,
              retryStrategy: (times: number) => {
                if (times > this.options.maxRetries) {
                  return null;
                }
                return Math.min(times * this.options.retryDelay, 2000);
              },
              tls: this.options.tls ? {} : undefined,
            },
            keyPrefix: this.options.keyPrefix,
          }
        ) as unknown as RedisClusterClient;
      } else {
        // Single node mode
        this.client = new Redis({
          host: this.options.host,
          port: this.options.port,
          password: this.options.password,
          db: this.options.db,
          connectTimeout: this.options.connectTimeout,
          commandTimeout: this.options.commandTimeout,
          maxRetriesPerRequest: this.options.maxRetries,
          retryStrategy: (times: number) => {
            if (times > this.options.maxRetries) {
              return null;
            }
            return Math.min(times * this.options.retryDelay, 2000);
          },
          tls: this.options.tls ? {} : undefined,
          keyPrefix: this.options.keyPrefix,
        }) as unknown as RedisClient;
      }

      // Set up error handlers
      this.client.on('error', (...args: unknown[]) => {
        const err = args[0] as Error;
        this.lastError = err;
        this.consecutiveFailures++;
        this.metrics.errors++;
      });

      this.client.on('connect', () => {
        this.consecutiveFailures = 0;
        this.lastSuccessfulOperation = new Date();
      });

      // Wait for connection
      await this.waitForConnection();

      // Set up pub/sub if enabled
      if (this.options.enablePubSub) {
        await this.setupPubSub();
      }

      this.startedAt = new Date();
      this.initialized = true;
    } catch (error) {
      const err = error as Error;
      throw CacheConnectionError.refused(
        this.options.host,
        this.options.port,
        err
      );
    }
  }

  /**
   * Check if the adapter is ready.
   */
  isReady(): boolean {
    return this.initialized && this.client !== null && this.client.status === 'ready';
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
      const data = await this.client!.get(key);

      if (data === null) {
        this.metrics.misses++;
        return null;
      }

      // Handle sliding expiration
      if (options?.refreshTtl) {
        const ttl = options.ttl ?? this.options.defaultTtl;
        await this.client!.expire(key, ttl);
      }

      this.metrics.hits++;
      this.lastSuccessfulOperation = new Date();
      this.consecutiveFailures = 0;

      return this.deserialize<T>(key, data);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
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
      const serialized = this.serialize(key, value);
      const ttl = options?.ttl ?? this.options.defaultTtl;

      if (ttl > 0) {
        await this.client!.setex(key, ttl, serialized);
      } else {
        await this.client!.set(key, serialized);
      }

      // Handle tags
      if (options?.tags && options.tags.length > 0) {
        await this.addToTags(key, options.tags, ttl);
      }

      this.lastSuccessfulOperation = new Date();
      this.consecutiveFailures = 0;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
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

    try {
      const result = await this.client!.del(key);

      // Publish invalidation event
      if (this.options.enablePubSub && result > 0) {
        await this.publishInvalidation(key);
      }

      this.lastSuccessfulOperation = new Date();
      this.consecutiveFailures = 0;

      return result > 0;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Check if a key exists.
   *
   * @param key - Cache key
   * @returns True if key exists
   */
  async exists(key: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const result = await this.client!.exists(key);
      this.lastSuccessfulOperation = new Date();
      return result > 0;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Delete keys matching a pattern.
   * Uses SCAN for efficient iteration without blocking.
   *
   * @param pattern - Glob pattern
   * @returns Number of keys deleted
   */
  async deletePattern(pattern: string): Promise<number> {
    this.ensureInitialized();
    this.metrics.deleteOperations++;

    try {
      let deletedCount = 0;
      let cursor = '0';
      const fullPattern = pattern; // Key prefix is handled by client

      do {
        const [nextCursor, keys] = await this.client!.scan(
          cursor,
          'MATCH',
          fullPattern,
          'COUNT',
          this.options.scanCount
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          // Remove keyPrefix from keys for deletion
          const keysToDelete = keys.map(k =>
            k.startsWith(this.options.keyPrefix)
              ? k.slice(this.options.keyPrefix.length)
              : k
          );
          deletedCount += await this.client!.del(...keysToDelete);
        }
      } while (cursor !== '0');

      this.lastSuccessfulOperation = new Date();
      return deletedCount;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
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

    try {
      const keysToDelete = new Set<string>();

      for (const tag of tags) {
        const tagPattern = `${this.tagPrefix}${tag}:*`;
        let cursor = '0';

        // Use SCAN instead of KEYS to avoid blocking
        do {
          const [nextCursor, members] = await this.client!.scan(
            cursor,
            'MATCH',
            tagPattern,
            'COUNT',
            this.options.scanCount
          );

          cursor = nextCursor;

          for (const member of members) {
            // Extract the actual key from the tag member
            const actualKey = member.replace(`${this.tagPrefix}${tag}:`, '');
            keysToDelete.add(actualKey);
          }
        } while (cursor !== '0');
      }

      if (keysToDelete.size === 0) {
        return 0;
      }

      const deletedCount = await this.client!.del(...keysToDelete);

      // Clean up tag keys
      for (const tag of tags) {
        const tagPattern = `${this.tagPrefix}${tag}:*`;
        await this.deletePattern(tagPattern);
      }

      this.lastSuccessfulOperation = new Date();
      return deletedCount;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Get multiple values from the cache.
   *
   * @param keys - Array of keys
   * @returns Map of key to value
   */
  async getMany<T>(keys: string[]): Promise<Map<string, T | null>> {
    this.ensureInitialized();

    if (keys.length === 0) {
      return new Map();
    }

    try {
      const values = await this.client!.mget(...keys);
      const result = new Map<string, T | null>();

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = values[i];

        if (key !== undefined) {
          if (value === null || value === undefined) {
            result.set(key, null);
            this.metrics.misses++;
          } else {
            result.set(key, this.deserialize<T>(key, value));
            this.metrics.hits++;
          }
        }
      }

      this.metrics.getOperations++;
      this.lastSuccessfulOperation = new Date();

      return result;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Set multiple values in the cache.
   *
   * @param entries - Map of key to value
   * @param options - Set options
   */
  async setMany<T>(entries: Map<string, T>, options?: ICacheSetOptions): Promise<void> {
    this.ensureInitialized();

    if (entries.size === 0) {
      return;
    }

    try {
      const ttl = options?.ttl ?? this.options.defaultTtl;

      // For entries with TTL, we need to use individual SETEX commands
      // MSET doesn't support TTL
      if (ttl > 0) {
        const promises: Promise<unknown>[] = [];

        for (const [key, value] of entries) {
          const serialized = this.serialize(key, value);
          promises.push(this.client!.setex(key, ttl, serialized));
        }

        await Promise.all(promises);
      } else {
        // Without TTL, use MSET
        const keyValues: string[] = [];

        for (const [key, value] of entries) {
          keyValues.push(key, this.serialize(key, value));
        }

        await this.client!.mset(...keyValues);
      }

      this.metrics.setOperations++;
      this.lastSuccessfulOperation = new Date();
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Clear all cache entries.
   *
   * @returns Number of keys cleared
   */
  async clear(): Promise<number> {
    this.ensureInitialized();

    try {
      const size = await this.client!.dbsize();
      await this.client!.flushdb();

      this.lastSuccessfulOperation = new Date();
      return size;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
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
      size: await this.client!.dbsize(),
      memoryUsage: await this.getMemoryUsage(),
    };
  }

  /**
   * Reset cache statistics.
   */
  async resetStats(): Promise<void> {
    this.metrics = {
      hits: 0,
      misses: 0,
      getOperations: 0,
      setOperations: 0,
      deleteOperations: 0,
      getTotalLatencyMs: 0,
      setTotalLatencyMs: 0,
      errors: 0,
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
   * Lock a key for exclusive access using Redis SET NX.
   *
   * @param key - Key to lock
   * @param ttl - Lock TTL in seconds
   * @returns Release function or null if lock not acquired
   */
  async lock(key: string, ttl: number = 30): Promise<(() => Promise<void>) | null> {
    this.ensureInitialized();

    const lockKey = `__lock__:${key}`;
    const lockValue = `${Date.now()}-${Math.random()}`;

    try {
      const result = await this.client!.set(lockKey, lockValue, 'EX', ttl, 'NX');

      if (result !== 'OK') {
        return null;
      }

      // Return release function
      return async () => {
        // Only delete if we still own the lock
        const currentValue = await this.client!.get(lockKey);
        if (currentValue === lockValue) {
          await this.client!.del(lockKey);
        }
      };
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  /**
   * Health check.
   */
  async healthCheck(): Promise<boolean> {
    if (!this.initialized || !this.client) {
      return false;
    }

    try {
      const response = await this.client.ping();
      return response === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Shutdown the cache.
   */
  async shutdown(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }

    if (this.client) {
      await this.client.quit();
      this.client = null;
    }

    this.initialized = false;
  }

  /**
   * Get detailed cache metrics.
   */
  async getMetrics(): Promise<ICacheMetrics> {
    this.ensureInitialized();

    const total = this.metrics.hits + this.metrics.misses;
    const size = await this.client!.dbsize();

    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate: total > 0 ? (this.metrics.hits / total) * 100 : 0,
      size,
      maxSize: 0, // Redis doesn't have a fixed max size
      memoryUsage: await this.getMemoryUsage(),
      evictions: 0, // Would need to parse Redis INFO
      expirations: 0, // Would need to parse Redis INFO
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
    const startTime = performance.now();
    const healthy = await this.healthCheck();

    return {
      healthy,
      adapter: this.name,
      connected: this.client?.status === 'ready',
      lastSuccessfulOperation: this.lastSuccessfulOperation,
      lastError: this.lastError?.message ?? null,
      consecutiveFailures: this.consecutiveFailures,
      responseTimeMs: performance.now() - startTime,
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

    try {
      return await this.client!.ttl(key);
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
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

    try {
      const result = await this.client!.expire(key, ttl);
      return result === 1;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Get all keys matching a pattern.
   *
   * @param pattern - Glob pattern
   * @returns Array of matching keys
   */
  async keys(pattern: string): Promise<string[]> {
    this.ensureInitialized();

    try {
      const keys: string[] = [];
      let cursor = '0';

      do {
        const [nextCursor, batch] = await this.client!.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          this.options.scanCount
        );

        cursor = nextCursor;
        keys.push(...batch.map(k =>
          k.startsWith(this.options.keyPrefix)
            ? k.slice(this.options.keyPrefix.length)
            : k
        ));
      } while (cursor !== '0');

      return keys;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Touch a key to refresh its access time.
   * For Redis, this just verifies the key exists.
   *
   * @param key - Cache key
   * @returns True if key exists
   */
  async touch(key: string): Promise<boolean> {
    return this.exists(key);
  }

  /**
   * Subscribe to cache invalidation events.
   *
   * @param callback - Function to call on invalidation
   * @returns Unsubscribe function
   */
  onInvalidation(callback: (key: string) => void): () => void {
    this.invalidationCallbacks.push(callback);

    return () => {
      const index = this.invalidationCallbacks.indexOf(callback);
      if (index >= 0) {
        this.invalidationCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Publish cache invalidation event.
   *
   * @param key - Key that was invalidated
   */
  async publishInvalidation(key: string): Promise<void> {
    if (!this.options.enablePubSub || !this.client) {
      return;
    }

    try {
      await this.client.publish(this.options.pubSubChannel, key);
    } catch (error) {
      // Log but don't throw - invalidation is best-effort
      this.lastError = error as Error;
    }
  }

  /**
   * Load ioredis dynamically.
   */
  private async loadRedis(): Promise<{ new (options?: unknown): RedisClient; Cluster: { new (...args: unknown[]): RedisClusterClient } }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Redis = require('ioredis');
      return Redis;
    } catch {
      throw new CacheError(
        CacheErrorCode.INVALID_CONFIG,
        'ioredis is required for RedisCacheAdapter. Install it with: npm install ioredis',
        { adapter: this.name }
      );
    }
  }

  /**
   * Wait for Redis connection.
   */
  private async waitForConnection(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(CacheConnectionError.timeout(
          this.options.host,
          this.options.port,
          this.options.connectTimeout
        ));
      }, this.options.connectTimeout);

      const checkConnection = () => {
        if (this.client?.status === 'ready') {
          clearTimeout(timeout);
          resolve();
        } else if (this.client?.status === 'end') {
          clearTimeout(timeout);
          reject(CacheConnectionError.refused(
            this.options.host,
            this.options.port
          ));
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  /**
   * Set up pub/sub for cache invalidation (ioredis v5 pattern).
   */
  private async setupPubSub(): Promise<void> {
    if (!this.client) {
      return;
    }

    // Create a duplicate connection for subscribing
    this.subscriber = this.client.duplicate();

    // Ensure subscriber is connected (ioredis v5 may require explicit connection)
    if (typeof (this.subscriber as any).connect === 'function') {
      await (this.subscriber as any).connect();
    }

    // Subscribe to the channel (ioredis v5 pattern)
    await this.subscriber.subscribe(this.options.pubSubChannel);

    // Attach message handler
    this.subscriber.on('message', (channel: string, message: string) => {
      if (channel === this.options.pubSubChannel) {
        // Notify all callbacks
        for (const callback of this.invalidationCallbacks) {
          callback(message);
        }
      }
    });
  }

  /**
   * Add key to tag index.
   */
  private async addToTags(key: string, tags: string[], ttl: number): Promise<void> {
    const promises: Promise<unknown>[] = [];

    for (const tag of tags) {
      const tagKey = `${this.tagPrefix}${tag}:${key}`;

      if (ttl > 0) {
        promises.push(this.client!.setex(tagKey, ttl, '1'));
      } else {
        promises.push(this.client!.set(tagKey, '1'));
      }
    }

    await Promise.all(promises);
  }

  /**
   * Serialize value for storage.
   */
  private serialize<T>(key: string, value: T): string {
    try {
      return JSON.stringify(value);
    } catch (error) {
      throw CacheSerializationError.serialize(
        key,
        typeof value,
        error as Error
      );
    }
  }

  /**
   * Deserialize value from storage.
   */
  private deserialize<T>(key: string, data: string): T {
    try {
      return JSON.parse(data) as T;
    } catch (error) {
      throw CacheSerializationError.deserialize(key, error as Error);
    }
  }

  /**
   * Get Redis memory usage.
   */
  private async getMemoryUsage(): Promise<number | undefined> {
    try {
      const info = await this.client!.info('memory');
      const match = info.match(/used_memory:(\d+)/);
      return match ? parseInt(match[1] ?? '0', 10) : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Handle errors.
   */
  private handleError(error: Error): void {
    this.lastError = error;
    this.consecutiveFailures++;
    this.metrics.errors++;
  }

  /**
   * Ensure the adapter is initialized.
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.client) {
      throw new CacheError(
        CacheErrorCode.NOT_INITIALIZED,
        'Redis cache adapter is not initialized. Call initialize() first.',
        { adapter: this.name }
      );
    }
  }
}
