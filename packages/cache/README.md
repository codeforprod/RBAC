# @prodforcode/rbac-cache

High-performance caching layer for @prodforcode/rbac-core with LRU memory cache and Redis support.

## Features

- **LRU Memory Cache** - In-memory cache with O(1) operations and automatic eviction
- **Redis Cache** - Production-ready Redis adapter with cluster support
- **TTL Management** - Per-entry and default TTL with automatic expiration
- **Pattern Deletion** - Wildcard-based cache invalidation
- **Tag Support** - Group-based cache invalidation
- **Metrics & Health** - Built-in statistics and health monitoring
- **Pub/Sub** - Distributed cache invalidation with Redis

## Installation

```bash
npm install @prodforcode/rbac-cache
# or
yarn add @prodforcode/rbac-cache
# or
pnpm add @prodforcode/rbac-cache
```

For Redis support:
```bash
npm install ioredis
```

## Quick Start

```typescript
import { RBACEngine } from '@prodforcode/rbac-core';
import { MemoryCacheAdapter } from '@prodforcode/rbac-cache';

const cache = new MemoryCacheAdapter({
  maxSize: 10000,
  defaultTtl: 300
});

await cache.initialize();

const rbac = await RBACEngine.create({
  adapter: yourAdapter,
  cache
});
```

## Memory Cache Adapter

The `MemoryCacheAdapter` provides a high-performance in-memory cache with LRU eviction.

### Configuration Options

```typescript
import { MemoryCacheAdapter } from '@prodforcode/rbac-cache';

const cache = new MemoryCacheAdapter({
  // Maximum number of entries (default: 1000)
  maxSize: 10000,

  // Default TTL in seconds (default: 300)
  defaultTtl: 600,

  // Enable LRU eviction (default: true)
  useLru: true,

  // Cleanup interval in ms (default: 60000)
  checkInterval: 30000,

  // Enable statistics tracking (default: true)
  enableStatistics: true
});
```

### Basic Usage

```typescript
// Initialize the cache
await cache.initialize();

// Set a value with TTL
await cache.set('user:123', { name: 'John' }, { ttl: 3600 });

// Get a value
const user = await cache.get('user:123');

// Check if key exists
const exists = await cache.has('user:123');

// Delete a key
await cache.delete('user:123');

// Delete by pattern
await cache.deletePattern('user:*');

// Clear all entries
await cache.clear();
```

### Tag-Based Invalidation

```typescript
// Set entries with tags
await cache.set('post:1', post1, { tags: ['posts', 'user:123'] });
await cache.set('post:2', post2, { tags: ['posts', 'user:123'] });

// Invalidate all entries with a tag
await cache.deleteByTags(['user:123']);
// Both post:1 and post:2 are now deleted
```

### Statistics and Monitoring

```typescript
// Get cache statistics
const stats = await cache.getStatistics();
console.log(stats);
// {
//   hits: 1523,
//   misses: 234,
//   hitRate: 0.867,
//   size: 856,
//   evictions: 12
// }

// Get health status
const health = await cache.healthCheck();
console.log(health);
// {
//   healthy: true,
//   metrics: { size: 856, maxSize: 10000, hitRate: 0.867 },
//   lastCheck: '2024-01-15T10:30:00Z'
// }

// Reset statistics
await cache.resetStatistics();
```

## Redis Cache Adapter

The `RedisCacheAdapter` provides production-ready Redis caching with cluster support.

### Configuration Options

```typescript
import { RedisCacheAdapter } from '@prodforcode/rbac-cache';
import Redis from 'ioredis';

// Create Redis client
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: 'your-password',
  db: 0
});

// Create cache adapter
const cache = new RedisCacheAdapter({
  redis,

  // Key prefix for namespacing (default: 'rbac:')
  keyPrefix: 'myapp:rbac:',

  // Default TTL in seconds (default: 300)
  defaultTtl: 3600,

  // Enable pub/sub for distributed invalidation (default: false)
  enablePubSub: true,

  // Pub/sub channel name (default: 'rbac:cache:invalidate')
  pubsubChannel: 'myapp:cache:invalidate',

  // Scan batch size for pattern deletion (default: 100)
  scanBatchSize: 500
});
```

### Redis Cluster Support

```typescript
import { Cluster } from 'ioredis';

const redis = new Cluster([
  { host: '127.0.0.1', port: 6379 },
  { host: '127.0.0.1', port: 6380 },
  { host: '127.0.0.1', port: 6381 }
]);

const cache = new RedisCacheAdapter({ redis });
```

### Basic Usage

```typescript
// Initialize the cache
await cache.initialize();

// Set with TTL
await cache.set('role:admin', roleData, { ttl: 7200 });

// Get value
const role = await cache.get('role:admin');

// Batch operations
await cache.mset([
  ['user:1', user1],
  ['user:2', user2]
]);

const users = await cache.mget(['user:1', 'user:2']);

// Pattern deletion (uses SCAN for safety)
await cache.deletePattern('user:*');
```

### Distributed Cache Invalidation

When `enablePubSub` is enabled, cache invalidation is broadcast to all connected instances:

```typescript
const cache = new RedisCacheAdapter({
  redis,
  enablePubSub: true
});

await cache.initialize();

// This deletion is broadcast to all connected instances
await cache.delete('user:123');
```

### Connection Management

```typescript
// Health check
const health = await cache.healthCheck();
if (health.healthy) {
  console.log('Redis connection healthy');
}

// Close connections gracefully
await cache.shutdown();
```

## Integration with RBACEngine

Configure cache TTLs for different data types:

```typescript
import { RBACEngine } from '@prodforcode/rbac-core';
import { RedisCacheAdapter } from '@prodforcode/rbac-cache';

const cache = new RedisCacheAdapter({ redis });

const rbac = await RBACEngine.create({
  adapter: yourAdapter,
  cache,
  cacheOptions: {
    enabled: true,

    // Cache roles for 1 hour
    rolesTtl: 3600,

    // Cache permissions for 30 minutes
    permissionsTtl: 1800,

    // Cache user permissions for 5 minutes
    userPermissionsTtl: 300
  }
});

// Invalidate specific user cache when roles change
await rbac.assignRole({ userId: 'user-123', roleId: 'editor' });
await cache.delete('user:user-123:permissions');
```

## Cache Strategies

### LRU Strategy

Least Recently Used eviction with O(1) operations:

```typescript
import { LRUStrategy } from '@prodforcode/rbac-cache';

const lru = new LRUStrategy<string, any>(1000);

// Listen to eviction events
lru.on('evict', (event) => {
  console.log(`Evicted: ${event.key} (reason: ${event.reason})`);
});

lru.set('key', value);
const val = lru.get('key'); // Marks as recently used
```

### TTL Strategy

Time-to-live management with automatic cleanup:

```typescript
import { TTLStrategy } from '@prodforcode/rbac-cache';

const ttl = new TTLStrategy({
  defaultTtl: 300,
  checkInterval: 60000
});

ttl.set('key', 3600); // TTL in seconds

if (ttl.isExpired('key')) {
  // Handle expiration
}
```

## Error Handling

```typescript
import { CacheError, CacheConnectionError, CacheSerializationError } from '@prodforcode/rbac-cache';

try {
  await cache.set('key', value);
} catch (error) {
  if (error instanceof CacheConnectionError) {
    console.error('Redis connection failed:', error.message);
  } else if (error instanceof CacheSerializationError) {
    console.error('Failed to serialize value:', error.message);
  } else if (error instanceof CacheError) {
    console.error('Cache error:', error.code, error.message);
  }
}
```

## API Reference

### MemoryCacheAdapter

```typescript
class MemoryCacheAdapter implements ICacheAdapter {
  constructor(options?: MemoryCacheOptions);

  async initialize(): Promise<void>;
  async shutdown(): Promise<void>;

  async get<T>(key: string, options?: ICacheGetOptions): Promise<T | null>;
  async set<T>(key: string, value: T, options?: ICacheSetOptions): Promise<void>;
  async mget<T>(keys: string[]): Promise<Array<T | null>>;
  async mset<T>(entries: Array<[string, T]>, options?: ICacheSetOptions): Promise<void>;

  async delete(key: string): Promise<boolean>;
  async deletePattern(pattern: string): Promise<number>;
  async deleteByTags(tags: string[]): Promise<number>;
  async clear(): Promise<void>;

  async has(key: string): Promise<boolean>;
  async getStatistics(): Promise<ICacheStats>;
  async resetStatistics(): Promise<void>;
  async healthCheck(): Promise<ICacheHealthStatus>;
}
```

### RedisCacheAdapter

```typescript
class RedisCacheAdapter implements ICacheAdapter {
  constructor(options: RedisCacheOptions);

  // Same methods as MemoryCacheAdapter
  // Plus Redis-specific features:

  async getTtl(key: string): Promise<number>;
  async expire(key: string, ttl: number): Promise<boolean>;
  async ping(): Promise<boolean>;
}
```

## Performance Considerations

### Memory Cache

- **Best for**: Development, testing, single-instance deployments
- **Capacity**: Limited by Node.js heap (typically ~1-2GB)
- **Operations**: O(1) get/set with LRU
- **Persistence**: None (data lost on restart)

### Redis Cache

- **Best for**: Production, multi-instance deployments
- **Capacity**: GBs to TBs (depends on Redis configuration)
- **Operations**: ~0.1-1ms latency per operation
- **Persistence**: Configurable (RDB snapshots, AOF logs)
- **Distributed**: Pub/sub for cache invalidation

## License

MIT
