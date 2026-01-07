/**
 * Serialized data format for cache storage.
 */
export type CacheSerializedValue = string | Buffer;
/**
 * Options for cache set operations.
 */
export interface ICacheSetOptions {
    /** Time-to-live in seconds */
    ttl?: number;
    /** Tags for cache invalidation grouping */
    tags?: string[];
}
/**
 * Options for cache get operations.
 */
export interface ICacheGetOptions {
    /** Whether to refresh TTL on access (sliding expiration) */
    refreshTtl?: boolean;
}
/**
 * Cache statistics for monitoring and debugging.
 */
export interface ICacheStats {
    /** Total number of cache hits */
    hits: number;
    /** Total number of cache misses */
    misses: number;
    /** Hit rate (hits / (hits + misses)) */
    hitRate: number;
    /** Current number of cached entries */
    size: number;
    /** Total memory used (if available) */
    memoryUsage?: number;
}
/**
 * Cache interface for RBAC data caching.
 * Implement this interface to integrate with any caching solution (Redis, Memcached, in-memory, etc.)
 *
 * Cache keys follow the convention: `rbac:{entity}:{identifier}`
 * Examples:
 * - `rbac:role:admin-role-id`
 * - `rbac:user-permissions:user-123`
 * - `rbac:role-hierarchy:admin-role-id`
 *
 * @example
 * ```typescript
 * class RedisCache implements IRBACCache {
 *   private client: Redis;
 *
 *   async get<T>(key: string): Promise<T | null> {
 *     const data = await this.client.get(key);
 *     return data ? JSON.parse(data) : null;
 *   }
 *
 *   async set<T>(key: string, value: T, options?: ICacheSetOptions): Promise<void> {
 *     const serialized = JSON.stringify(value);
 *     if (options?.ttl) {
 *       await this.client.setex(key, options.ttl, serialized);
 *     } else {
 *       await this.client.set(key, serialized);
 *     }
 *   }
 *   // ... implement other methods
 * }
 * ```
 */
export interface IRBACCache {
    /**
     * Get a value from the cache.
     *
     * @param key - Cache key
     * @param options - Get options
     * @returns Cached value or null if not found/expired
     *
     * @example
     * ```typescript
     * const permissions = await cache.get<IPermission[]>('rbac:user-permissions:user-123');
     * if (permissions) {
     *   console.log('Cache hit!');
     * }
     * ```
     */
    get<T>(key: string, options?: ICacheGetOptions): Promise<T | null>;
    /**
     * Set a value in the cache.
     *
     * @param key - Cache key
     * @param value - Value to cache
     * @param options - Set options including TTL and tags
     *
     * @example
     * ```typescript
     * await cache.set('rbac:role:admin', adminRole, {
     *   ttl: 3600, // 1 hour
     *   tags: ['role', 'admin']
     * });
     * ```
     */
    set<T>(key: string, value: T, options?: ICacheSetOptions): Promise<void>;
    /**
     * Delete a value from the cache.
     *
     * @param key - Cache key
     * @returns True if key existed and was deleted
     *
     * @example
     * ```typescript
     * await cache.delete('rbac:role:admin');
     * ```
     */
    delete(key: string): Promise<boolean>;
    /**
     * Check if a key exists in the cache.
     *
     * @param key - Cache key
     * @returns True if key exists and is not expired
     */
    exists(key: string): Promise<boolean>;
    /**
     * Delete multiple keys matching a pattern.
     * Pattern syntax depends on the cache implementation (e.g., Redis glob patterns).
     *
     * @param pattern - Key pattern (e.g., "rbac:user-permissions:*")
     * @returns Number of keys deleted
     *
     * @example
     * ```typescript
     * // Invalidate all user permission caches
     * const deleted = await cache.deletePattern('rbac:user-permissions:*');
     * console.log(`Invalidated ${deleted} user permission caches`);
     * ```
     */
    deletePattern(pattern: string): Promise<number>;
    /**
     * Delete all keys with a specific tag.
     *
     * @param tag - Tag to match
     * @returns Number of keys deleted
     *
     * @example
     * ```typescript
     * // Invalidate all caches tagged with 'role'
     * await cache.deleteByTag('role');
     * ```
     */
    deleteByTag(tag: string): Promise<number>;
    /**
     * Delete all keys with any of the specified tags.
     *
     * @param tags - Tags to match
     * @returns Number of keys deleted
     */
    deleteByTags(tags: string[]): Promise<number>;
    /**
     * Get multiple values from the cache.
     *
     * @param keys - Array of cache keys
     * @returns Map of key to value (missing keys have null values)
     *
     * @example
     * ```typescript
     * const values = await cache.getMany<IRole>([
     *   'rbac:role:admin',
     *   'rbac:role:editor',
     *   'rbac:role:viewer'
     * ]);
     * ```
     */
    getMany<T>(keys: string[]): Promise<Map<string, T | null>>;
    /**
     * Set multiple values in the cache.
     *
     * @param entries - Map of key to value
     * @param options - Set options (applied to all entries)
     *
     * @example
     * ```typescript
     * await cache.setMany(
     *   new Map([
     *     ['rbac:role:admin', adminRole],
     *     ['rbac:role:editor', editorRole]
     *   ]),
     *   { ttl: 3600 }
     * );
     * ```
     */
    setMany<T>(entries: Map<string, T>, options?: ICacheSetOptions): Promise<void>;
    /**
     * Clear all RBAC-related cache entries.
     * Use with caution - this invalidates all cached data.
     *
     * @returns Number of keys cleared
     */
    clear(): Promise<number>;
    /**
     * Get cache statistics.
     *
     * @returns Cache statistics
     */
    getStats(): Promise<ICacheStats>;
    /**
     * Reset cache statistics.
     */
    resetStats(): Promise<void>;
    /**
     * Get or set a value with a factory function.
     * If the key exists, returns the cached value.
     * If not, calls the factory function, caches the result, and returns it.
     *
     * @param key - Cache key
     * @param factory - Function to produce the value if not cached
     * @param options - Set options for the produced value
     * @returns The cached or newly produced value
     *
     * @example
     * ```typescript
     * const permissions = await cache.getOrSet(
     *   `rbac:user-permissions:${userId}`,
     *   async () => {
     *     // This only runs on cache miss
     *     return await adapter.findUserPermissions(userId);
     *   },
     *   { ttl: 3600 }
     * );
     * ```
     */
    getOrSet<T>(key: string, factory: () => Promise<T>, options?: ICacheSetOptions): Promise<T>;
    /**
     * Lock a key to prevent concurrent cache population (cache stampede protection).
     * Returns a release function if lock acquired, null if lock is held by another process.
     *
     * @param key - Key to lock
     * @param ttl - Lock TTL in seconds (default: 30)
     * @returns Release function or null if lock not acquired
     *
     * @example
     * ```typescript
     * const release = await cache.lock('rbac:computing:user-123', 30);
     * if (release) {
     *   try {
     *     // Compute and cache value
     *     await cache.set(key, computedValue);
     *   } finally {
     *     await release();
     *   }
     * }
     * ```
     */
    lock?(key: string, ttl?: number): Promise<(() => Promise<void>) | null>;
    /**
     * Health check for the cache.
     *
     * @returns True if cache is healthy and connected
     */
    healthCheck?(): Promise<boolean>;
    /**
     * Gracefully shutdown the cache connection.
     */
    shutdown?(): Promise<void>;
}
/**
 * Configuration for cache key generation.
 */
export interface ICacheKeyConfig {
    /** Prefix for all cache keys (default: 'rbac') */
    prefix: string;
    /** Separator between key parts (default: ':') */
    separator: string;
}
/**
 * Cache key generator for consistent key naming.
 */
export interface ICacheKeyGenerator {
    /**
     * Generate a cache key for a role.
     *
     * @param roleId - Role ID
     * @returns Cache key (e.g., 'rbac:role:abc-123')
     */
    forRole(roleId: string): string;
    /**
     * Generate a cache key for a permission.
     *
     * @param permissionId - Permission ID
     * @returns Cache key
     */
    forPermission(permissionId: string): string;
    /**
     * Generate a cache key for user permissions.
     *
     * @param userId - User ID
     * @param organizationId - Optional organization ID
     * @returns Cache key
     */
    forUserPermissions(userId: string, organizationId?: string | null): string;
    /**
     * Generate a cache key for user roles.
     *
     * @param userId - User ID
     * @param organizationId - Optional organization ID
     * @returns Cache key
     */
    forUserRoles(userId: string, organizationId?: string | null): string;
    /**
     * Generate a cache key for role hierarchy.
     *
     * @param roleId - Role ID
     * @returns Cache key
     */
    forRoleHierarchy(roleId: string): string;
    /**
     * Generate a cache key for role permissions (including inherited).
     *
     * @param roleId - Role ID
     * @returns Cache key
     */
    forRolePermissions(roleId: string): string;
    /**
     * Generate a pattern for invalidating user-related caches.
     *
     * @param userId - User ID
     * @returns Cache key pattern (e.g., 'rbac:user-*:abc-123')
     */
    patternForUser(userId: string): string;
    /**
     * Generate a pattern for invalidating role-related caches.
     *
     * @param roleId - Role ID
     * @returns Cache key pattern
     */
    patternForRole(roleId: string): string;
}
/**
 * Default cache key generator implementation.
 *
 * @example
 * ```typescript
 * const keyGen = new DefaultCacheKeyGenerator({ prefix: 'myapp:rbac' });
 * const roleKey = keyGen.forRole('admin-id'); // 'myapp:rbac:role:admin-id'
 * ```
 */
export declare class DefaultCacheKeyGenerator implements ICacheKeyGenerator {
    private readonly prefix;
    private readonly separator;
    constructor(config?: Partial<ICacheKeyConfig>);
    forRole(roleId: string): string;
    forPermission(permissionId: string): string;
    forUserPermissions(userId: string, organizationId?: string | null): string;
    forUserRoles(userId: string, organizationId?: string | null): string;
    forRoleHierarchy(roleId: string): string;
    forRolePermissions(roleId: string): string;
    patternForUser(userId: string): string;
    patternForRole(roleId: string): string;
    private buildKey;
}
/**
 * In-memory cache implementation for development and testing.
 * NOT recommended for production use in multi-instance deployments.
 */
export declare class InMemoryCache implements IRBACCache {
    private readonly cache;
    private stats;
    constructor();
    get<T>(key: string, options?: ICacheGetOptions): Promise<T | null>;
    set<T>(key: string, value: T, options?: ICacheSetOptions): Promise<void>;
    delete(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    deletePattern(pattern: string): Promise<number>;
    deleteByTag(tag: string): Promise<number>;
    deleteByTags(tags: string[]): Promise<number>;
    getMany<T>(keys: string[]): Promise<Map<string, T | null>>;
    setMany<T>(entries: Map<string, T>, options?: ICacheSetOptions): Promise<void>;
    clear(): Promise<number>;
    getStats(): Promise<ICacheStats>;
    resetStats(): Promise<void>;
    getOrSet<T>(key: string, factory: () => Promise<T>, options?: ICacheSetOptions): Promise<T>;
    healthCheck(): Promise<boolean>;
    shutdown(): Promise<void>;
    private patternToRegex;
}
//# sourceMappingURL=cache.interface.d.ts.map