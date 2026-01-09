/**
 * @fileoverview TTL (Time-To-Live) cache expiration strategy.
 *
 * Manages expiration tracking for cache entries with support for:
 * - Per-entry TTL configuration
 * - Automatic cleanup of expired entries
 * - Sliding expiration (refresh on access)
 * - Expiration callbacks
 */

/**
 * TTL entry metadata.
 */
interface TTLEntry {
  /**
   * Cache key.
   */
  key: string;

  /**
   * Expiration timestamp in milliseconds.
   */
  expiresAt: number;

  /**
   * Original TTL in milliseconds (for sliding expiration).
   */
  ttlMs: number;

  /**
   * Whether to use sliding expiration.
   */
  sliding: boolean;
}

/**
 * Event emitted when an entry expires.
 */
export interface TTLExpirationEvent {
  /**
   * Expired key.
   */
  key: string;

  /**
   * When the entry expired.
   */
  expiredAt: number;

  /**
   * Original TTL in milliseconds.
   */
  ttlMs: number;
}

/**
 * Configuration options for TTL strategy.
 */
export interface TTLStrategyOptions {
  /**
   * Default TTL in seconds.
   * @default 300
   */
  defaultTtl: number;

  /**
   * Cleanup interval in milliseconds.
   * Set to 0 to disable automatic cleanup.
   * @default 60000
   */
  cleanupInterval: number;

  /**
   * Maximum number of entries to cleanup per interval.
   * @default 100
   */
  cleanupBatchSize: number;

  /**
   * Whether to use sliding expiration by default.
   * @default false
   */
  defaultSliding: boolean;
}

/**
 * Default TTL strategy options.
 */
export const DEFAULT_TTL_OPTIONS: TTLStrategyOptions = {
  defaultTtl: 300,
  cleanupInterval: 60000,
  cleanupBatchSize: 100,
  defaultSliding: false,
};

/**
 * TTL expiration strategy for cache entries.
 *
 * @example
 * ```typescript
 * const ttl = new TTLStrategy({
 *   defaultTtl: 300, // 5 minutes
 *   cleanupInterval: 60000, // 1 minute
 * });
 *
 * ttl.onExpiration((event) => {
 *   console.log(`Key ${event.key} expired`);
 * });
 *
 * ttl.set('user:1', 3600); // Expires in 1 hour
 * ttl.set('session:abc', 1800, { sliding: true }); // 30 min sliding
 *
 * // Check and remove expired entries
 * const expired = ttl.cleanup();
 * ```
 */
export class TTLStrategy {
  /**
   * Map of key to TTL entry.
   */
  private readonly entries: Map<string, TTLEntry> = new Map();

  /**
   * Sorted set of expiration times for efficient cleanup.
   * Stored as [expiresAt, key] tuples.
   */
  private readonly expirationQueue: Array<[number, string]> = [];

  /**
   * Configuration options.
   */
  private readonly options: TTLStrategyOptions;

  /**
   * Cleanup interval handle.
   */
  private cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Expiration callbacks.
   */
  private expirationCallbacks: Array<(event: TTLExpirationEvent) => void> = [];

  /**
   * Number of entries expired.
   */
  private expiredCount = 0;

  /**
   * Create a new TTL strategy instance.
   *
   * @param options - Strategy configuration
   */
  constructor(options: Partial<TTLStrategyOptions> = {}) {
    this.options = { ...DEFAULT_TTL_OPTIONS, ...options };

    if (this.options.cleanupInterval > 0) {
      this.startCleanupTimer();
    }
  }

  /**
   * Set TTL for a key.
   *
   * @param key - Cache key
   * @param ttlSeconds - TTL in seconds (uses default if not provided)
   * @param options - Additional options
   */
  set(key: string, ttlSeconds?: number, options?: { sliding?: boolean }): void {
    const ttl = ttlSeconds ?? this.options.defaultTtl;
    const ttlMs = ttl * 1000;
    const expiresAt = Date.now() + ttlMs;
    const sliding = options?.sliding ?? this.options.defaultSliding;

    // Remove existing entry if present
    this.remove(key);

    const entry: TTLEntry = {
      key,
      expiresAt,
      ttlMs,
      sliding,
    };

    this.entries.set(key, entry);
    this.insertIntoQueue(expiresAt, key);
  }

  /**
   * Check if a key is expired.
   *
   * @param key - Cache key
   * @returns True if expired or not found
   */
  isExpired(key: string): boolean {
    const entry = this.entries.get(key);

    if (!entry) {
      return true;
    }

    return Date.now() > entry.expiresAt;
  }

  /**
   * Get the remaining TTL for a key in seconds.
   *
   * @param key - Cache key
   * @returns Remaining TTL in seconds, -1 if no expiry, -2 if not found
   */
  getTtl(key: string): number {
    const entry = this.entries.get(key);

    if (!entry) {
      return -2;
    }

    const remaining = entry.expiresAt - Date.now();

    if (remaining <= 0) {
      return -2;
    }

    return Math.ceil(remaining / 1000);
  }

  /**
   * Get expiration timestamp for a key.
   *
   * @param key - Cache key
   * @returns Expiration timestamp or null if not found
   */
  getExpiresAt(key: string): number | null {
    const entry = this.entries.get(key);
    return entry?.expiresAt ?? null;
  }

  /**
   * Update TTL for a key.
   *
   * @param key - Cache key
   * @param ttlSeconds - New TTL in seconds
   * @returns True if TTL was updated
   */
  updateTtl(key: string, ttlSeconds: number): boolean {
    const entry = this.entries.get(key);

    if (!entry) {
      return false;
    }

    const ttlMs = ttlSeconds * 1000;
    const expiresAt = Date.now() + ttlMs;

    // Update entry
    entry.expiresAt = expiresAt;
    entry.ttlMs = ttlMs;

    // Re-insert into queue (old entry will be ignored during cleanup)
    this.insertIntoQueue(expiresAt, key);

    return true;
  }

  /**
   * Touch a key to refresh its TTL (for sliding expiration).
   *
   * @param key - Cache key
   * @returns True if key was touched
   */
  touch(key: string): boolean {
    const entry = this.entries.get(key);

    if (!entry) {
      return false;
    }

    if (!entry.sliding) {
      return true; // Key exists but doesn't use sliding expiration
    }

    const expiresAt = Date.now() + entry.ttlMs;
    entry.expiresAt = expiresAt;

    // Re-insert into queue
    this.insertIntoQueue(expiresAt, key);

    return true;
  }

  /**
   * Remove TTL tracking for a key.
   *
   * @param key - Cache key
   * @returns True if key was removed
   */
  remove(key: string): boolean {
    return this.entries.delete(key);
  }

  /**
   * Check if a key has TTL set.
   *
   * @param key - Cache key
   */
  has(key: string): boolean {
    return this.entries.has(key);
  }

  /**
   * Get all expired keys.
   *
   * @returns Array of expired keys
   */
  getExpiredKeys(): string[] {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, entry] of this.entries) {
      if (now > entry.expiresAt) {
        expired.push(key);
      }
    }

    return expired;
  }

  /**
   * Cleanup expired entries.
   *
   * @param maxCount - Maximum entries to cleanup (default: cleanupBatchSize)
   * @returns Array of expired keys that were cleaned up
   */
  cleanup(maxCount?: number): string[] {
    const now = Date.now();
    const limit = maxCount ?? this.options.cleanupBatchSize;
    const expiredKeys: string[] = [];

    // Process expiration queue
    while (this.expirationQueue.length > 0 && expiredKeys.length < limit) {
      const firstEntry = this.expirationQueue[0];
      if (!firstEntry) {
        break;
      }

      const [expiresAt, key] = firstEntry;

      if (expiresAt > now) {
        break; // No more expired entries
      }

      // Remove from queue
      this.expirationQueue.shift();

      // Check if this is still the current expiration for this key
      const entry = this.entries.get(key);

      if (!entry) {
        continue; // Already removed
      }

      if (entry.expiresAt !== expiresAt) {
        continue; // Expiration was updated, skip stale queue entry
      }

      // Entry is expired
      expiredKeys.push(key);
      this.entries.delete(key);
      this.expiredCount++;

      // Notify callbacks
      for (const callback of this.expirationCallbacks) {
        callback({
          key,
          expiredAt: expiresAt,
          ttlMs: entry.ttlMs,
        });
      }
    }

    return expiredKeys;
  }

  /**
   * Register a callback for expiration events.
   *
   * @param callback - Function to call when entries expire
   * @returns Unsubscribe function
   */
  onExpiration(callback: (event: TTLExpirationEvent) => void): () => void {
    this.expirationCallbacks.push(callback);

    return () => {
      const index = this.expirationCallbacks.indexOf(callback);
      if (index >= 0) {
        this.expirationCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get the number of tracked entries.
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Get the number of entries that have expired.
   */
  get expirations(): number {
    return this.expiredCount;
  }

  /**
   * Clear all TTL entries and stop the cleanup timer.
   */
  clear(): void {
    this.entries.clear();
    this.expirationQueue.length = 0;
  }

  /**
   * Stop the cleanup timer.
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Start the cleanup timer.
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);

    // Allow the process to exit even if the timer is running
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Insert an entry into the expiration queue (sorted by expiration time).
   */
  private insertIntoQueue(expiresAt: number, key: string): void {
    // Binary search for insertion point
    let left = 0;
    let right = this.expirationQueue.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const midEntry = this.expirationQueue[mid];
      const midExpiresAt = midEntry?.[0] ?? 0;

      if (midExpiresAt < expiresAt) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    this.expirationQueue.splice(left, 0, [expiresAt, key]);
  }
}
