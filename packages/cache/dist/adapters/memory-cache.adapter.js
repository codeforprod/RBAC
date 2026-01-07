"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCacheAdapter = void 0;
const lru_strategy_1 = require("../strategies/lru-strategy");
const ttl_strategy_1 = require("../strategies/ttl-strategy");
const types_1 = require("../types");
const errors_1 = require("../errors");
class MemoryCacheAdapter {
    name = 'memory';
    options;
    lru;
    ttl;
    tagIndex = new Map();
    initialized = false;
    startedAt = null;
    metrics = {
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
    constructor(options = {}) {
        this.options = { ...types_1.DEFAULT_MEMORY_CACHE_OPTIONS, ...options };
        this.lru = new lru_strategy_1.LRUStrategy(this.options.maxSize, (event) => {
            this.handleEviction(event.key, event.value, 'lru');
        });
        this.ttl = new ttl_strategy_1.TTLStrategy({
            defaultTtl: this.options.defaultTtl,
            cleanupInterval: this.options.cleanupInterval,
        });
        this.ttl.onExpiration((event) => {
            this.handleExpiration(event.key);
        });
    }
    async initialize() {
        this.startedAt = new Date();
        this.initialized = true;
    }
    isReady() {
        return this.initialized;
    }
    async get(key, options) {
        this.ensureInitialized();
        const startTime = performance.now();
        this.metrics.getOperations++;
        try {
            if (this.ttl.isExpired(key)) {
                this.metrics.misses++;
                return null;
            }
            const entry = this.lru.get(key);
            if (!entry) {
                this.metrics.misses++;
                return null;
            }
            entry.accessedAt = Date.now();
            entry.accessCount++;
            if (options?.refreshTtl) {
                this.ttl.touch(key);
            }
            this.metrics.hits++;
            return entry.value;
        }
        finally {
            this.metrics.getTotalLatencyMs += performance.now() - startTime;
        }
    }
    async set(key, value, options) {
        this.ensureInitialized();
        const startTime = performance.now();
        this.metrics.setOperations++;
        try {
            const now = Date.now();
            const ttl = options?.ttl ?? this.options.defaultTtl;
            const tags = options?.tags ?? [];
            const existingEntry = this.lru.peek(key);
            if (existingEntry) {
                this.removeFromTagIndex(key, existingEntry.tags);
            }
            const estimatedSize = this.options.trackMemoryUsage
                ? this.estimateSize(value)
                : 0;
            const entry = {
                value,
                createdAt: now,
                accessedAt: now,
                expiresAt: ttl > 0 ? now + ttl * 1000 : null,
                tags,
                accessCount: 0,
                estimatedSize,
                size: estimatedSize,
            };
            this.lru.set(key, entry);
            if (ttl > 0) {
                this.ttl.set(key, ttl);
            }
            this.addToTagIndex(key, tags);
        }
        finally {
            this.metrics.setTotalLatencyMs += performance.now() - startTime;
        }
    }
    async delete(key) {
        this.ensureInitialized();
        this.metrics.deleteOperations++;
        const entry = this.lru.peek(key);
        if (!entry) {
            return false;
        }
        this.removeFromTagIndex(key, entry.tags);
        this.ttl.remove(key);
        return this.lru.delete(key);
    }
    async exists(key) {
        this.ensureInitialized();
        if (this.ttl.isExpired(key)) {
            return false;
        }
        return this.lru.has(key);
    }
    async deletePattern(pattern) {
        this.ensureInitialized();
        this.metrics.deleteOperations++;
        const regex = this.patternToRegex(pattern);
        const keysToDelete = [];
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
    async deleteByTag(tag) {
        return this.deleteByTags([tag]);
    }
    async deleteByTags(tags) {
        this.ensureInitialized();
        this.metrics.deleteOperations++;
        const keysToDelete = new Set();
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
    async getMany(keys) {
        this.ensureInitialized();
        const result = new Map();
        for (const key of keys) {
            result.set(key, await this.get(key));
        }
        return result;
    }
    async setMany(entries, options) {
        this.ensureInitialized();
        for (const [key, value] of entries) {
            await this.set(key, value, options);
        }
    }
    async clear() {
        this.ensureInitialized();
        const count = this.lru.size;
        this.lru.clear();
        this.ttl.clear();
        this.tagIndex.clear();
        return count;
    }
    async getStats() {
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
    async resetStats() {
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
    async getOrSet(key, factory, options) {
        this.ensureInitialized();
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        const value = await factory();
        await this.set(key, value, options);
        return value;
    }
    async lock(key, ttl = 30) {
        const lockKey = `__lock__:${key}`;
        const existingLock = await this.get(lockKey);
        if (existingLock) {
            return null;
        }
        await this.set(lockKey, true, { ttl });
        return async () => {
            await this.delete(lockKey);
        };
    }
    async healthCheck() {
        return this.initialized;
    }
    async shutdown() {
        this.ttl.stop();
        this.lru.clear();
        this.tagIndex.clear();
        this.initialized = false;
    }
    async getMetrics() {
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
    async getHealthStatus() {
        return {
            healthy: this.initialized,
            adapter: this.name,
            connected: true,
            lastSuccessfulOperation: new Date(),
            lastError: null,
            consecutiveFailures: 0,
            responseTimeMs: 0,
        };
    }
    async getTtl(key) {
        this.ensureInitialized();
        if (!this.lru.has(key)) {
            return -2;
        }
        return this.ttl.getTtl(key);
    }
    async updateTtl(key, ttl) {
        this.ensureInitialized();
        if (!this.lru.has(key)) {
            return false;
        }
        return this.ttl.updateTtl(key, ttl);
    }
    async keys(pattern) {
        this.ensureInitialized();
        const regex = this.patternToRegex(pattern);
        const matchingKeys = [];
        for (const key of this.lru.keys()) {
            if (regex.test(key)) {
                matchingKeys.push(key);
            }
        }
        return matchingKeys;
    }
    async touch(key) {
        this.ensureInitialized();
        const entry = this.lru.get(key);
        if (!entry) {
            return false;
        }
        entry.accessedAt = Date.now();
        entry.accessCount++;
        return true;
    }
    handleEviction(key, entry, _reason) {
        this.metrics.evictions++;
        this.removeFromTagIndex(key, entry.tags);
        this.ttl.remove(key);
    }
    handleExpiration(key) {
        const entry = this.lru.peek(key);
        if (entry) {
            this.metrics.expirations++;
            this.removeFromTagIndex(key, entry.tags);
            this.lru.delete(key);
        }
    }
    addToTagIndex(key, tags) {
        for (const tag of tags) {
            let keys = this.tagIndex.get(tag);
            if (!keys) {
                keys = new Set();
                this.tagIndex.set(tag, keys);
            }
            keys.add(key);
        }
    }
    removeFromTagIndex(key, tags) {
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
    patternToRegex(pattern) {
        const escaped = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*\*/g, '<<<DOUBLE_STAR>>>')
            .replace(/\*/g, '[^:]*')
            .replace(/<<<DOUBLE_STAR>>>/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp(`^${escaped}$`);
    }
    estimateSize(value) {
        try {
            const str = JSON.stringify(value);
            return str.length * 2;
        }
        catch {
            return 0;
        }
    }
    calculateMemoryUsage() {
        let total = 0;
        this.lru.forEach((entry) => {
            total += entry.estimatedSize;
        });
        return total;
    }
    ensureInitialized() {
        if (!this.initialized) {
            throw new errors_1.CacheError(errors_1.CacheErrorCode.NOT_INITIALIZED, 'Memory cache adapter is not initialized. Call initialize() first.', { adapter: this.name });
        }
    }
}
exports.MemoryCacheAdapter = MemoryCacheAdapter;
//# sourceMappingURL=memory-cache.adapter.js.map