"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCacheAdapter = void 0;
const types_1 = require("../types");
const errors_1 = require("../errors");
class RedisCacheAdapter {
    name = 'redis';
    options;
    client = null;
    subscriber = null;
    initialized = false;
    startedAt = null;
    lastError = null;
    consecutiveFailures = 0;
    lastSuccessfulOperation = null;
    invalidationCallbacks = [];
    metrics = {
        hits: 0,
        misses: 0,
        getOperations: 0,
        setOperations: 0,
        deleteOperations: 0,
        getTotalLatencyMs: 0,
        setTotalLatencyMs: 0,
        errors: 0,
    };
    tagPrefix;
    constructor(options = {}) {
        this.options = { ...types_1.DEFAULT_REDIS_CACHE_OPTIONS, ...options };
        this.tagPrefix = `${this.options.keyPrefix}__tag__:`;
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            const Redis = await this.loadRedis();
            if (this.options.cluster && this.options.clusterNodes) {
                this.client = new Redis.Cluster(this.options.clusterNodes.map(node => ({
                    host: node.host,
                    port: node.port,
                })), {
                    redisOptions: {
                        password: this.options.password,
                        connectTimeout: this.options.connectTimeout,
                        commandTimeout: this.options.commandTimeout,
                        maxRetriesPerRequest: this.options.maxRetries,
                        retryStrategy: (times) => {
                            if (times > this.options.maxRetries) {
                                return null;
                            }
                            return Math.min(times * this.options.retryDelay, 2000);
                        },
                        tls: this.options.tls ? {} : undefined,
                    },
                    keyPrefix: this.options.keyPrefix,
                });
            }
            else {
                this.client = new Redis({
                    host: this.options.host,
                    port: this.options.port,
                    password: this.options.password,
                    db: this.options.db,
                    connectTimeout: this.options.connectTimeout,
                    commandTimeout: this.options.commandTimeout,
                    maxRetriesPerRequest: this.options.maxRetries,
                    retryStrategy: (times) => {
                        if (times > this.options.maxRetries) {
                            return null;
                        }
                        return Math.min(times * this.options.retryDelay, 2000);
                    },
                    tls: this.options.tls ? {} : undefined,
                    keyPrefix: this.options.keyPrefix,
                });
            }
            this.client.on('error', (...args) => {
                const err = args[0];
                this.lastError = err;
                this.consecutiveFailures++;
                this.metrics.errors++;
            });
            this.client.on('connect', () => {
                this.consecutiveFailures = 0;
                this.lastSuccessfulOperation = new Date();
            });
            await this.waitForConnection();
            if (this.options.enablePubSub) {
                await this.setupPubSub();
            }
            this.startedAt = new Date();
            this.initialized = true;
        }
        catch (error) {
            const err = error;
            throw errors_1.CacheConnectionError.refused(this.options.host, this.options.port, err);
        }
    }
    isReady() {
        return this.initialized && this.client !== null && this.client.status === 'ready';
    }
    async get(key, options) {
        this.ensureInitialized();
        const startTime = performance.now();
        this.metrics.getOperations++;
        try {
            const data = await this.client.get(key);
            if (data === null) {
                this.metrics.misses++;
                return null;
            }
            if (options?.refreshTtl) {
                const currentTtl = await this.client.ttl(key);
                if (currentTtl > 0) {
                    await this.client.expire(key, currentTtl);
                }
            }
            this.metrics.hits++;
            this.lastSuccessfulOperation = new Date();
            this.consecutiveFailures = 0;
            return this.deserialize(key, data);
        }
        catch (error) {
            this.handleError(error);
            throw error;
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
            const serialized = this.serialize(key, value);
            const ttl = options?.ttl ?? this.options.defaultTtl;
            if (ttl > 0) {
                await this.client.setex(key, ttl, serialized);
            }
            else {
                await this.client.set(key, serialized);
            }
            if (options?.tags && options.tags.length > 0) {
                await this.addToTags(key, options.tags, ttl);
            }
            this.lastSuccessfulOperation = new Date();
            this.consecutiveFailures = 0;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
        finally {
            this.metrics.setTotalLatencyMs += performance.now() - startTime;
        }
    }
    async delete(key) {
        this.ensureInitialized();
        this.metrics.deleteOperations++;
        try {
            const result = await this.client.del(key);
            if (this.options.enablePubSub && result > 0) {
                await this.publishInvalidation(key);
            }
            this.lastSuccessfulOperation = new Date();
            this.consecutiveFailures = 0;
            return result > 0;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    async exists(key) {
        this.ensureInitialized();
        try {
            const result = await this.client.exists(key);
            this.lastSuccessfulOperation = new Date();
            return result > 0;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    async deletePattern(pattern) {
        this.ensureInitialized();
        this.metrics.deleteOperations++;
        try {
            let deletedCount = 0;
            let cursor = '0';
            const fullPattern = pattern;
            do {
                const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', fullPattern, 'COUNT', this.options.scanCount);
                cursor = nextCursor;
                if (keys.length > 0) {
                    const keysToDelete = keys.map(k => k.startsWith(this.options.keyPrefix)
                        ? k.slice(this.options.keyPrefix.length)
                        : k);
                    deletedCount += await this.client.del(...keysToDelete);
                }
            } while (cursor !== '0');
            this.lastSuccessfulOperation = new Date();
            return deletedCount;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    async deleteByTag(tag) {
        return this.deleteByTags([tag]);
    }
    async deleteByTags(tags) {
        this.ensureInitialized();
        this.metrics.deleteOperations++;
        try {
            const keysToDelete = new Set();
            for (const tag of tags) {
                const tagKey = `${this.tagPrefix}${tag}`;
                const members = await this.client.keys(`${tagKey}:*`);
                for (const member of members) {
                    const actualKey = member.replace(`${tagKey}:`, '');
                    keysToDelete.add(actualKey);
                }
            }
            if (keysToDelete.size === 0) {
                return 0;
            }
            const deletedCount = await this.client.del(...keysToDelete);
            for (const tag of tags) {
                const tagPattern = `${this.tagPrefix}${tag}:*`;
                await this.deletePattern(tagPattern);
            }
            this.lastSuccessfulOperation = new Date();
            return deletedCount;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    async getMany(keys) {
        this.ensureInitialized();
        if (keys.length === 0) {
            return new Map();
        }
        try {
            const values = await this.client.mget(...keys);
            const result = new Map();
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const value = values[i];
                if (key !== undefined) {
                    if (value === null || value === undefined) {
                        result.set(key, null);
                        this.metrics.misses++;
                    }
                    else {
                        result.set(key, this.deserialize(key, value));
                        this.metrics.hits++;
                    }
                }
            }
            this.metrics.getOperations++;
            this.lastSuccessfulOperation = new Date();
            return result;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    async setMany(entries, options) {
        this.ensureInitialized();
        if (entries.size === 0) {
            return;
        }
        try {
            const ttl = options?.ttl ?? this.options.defaultTtl;
            if (ttl > 0) {
                const promises = [];
                for (const [key, value] of entries) {
                    const serialized = this.serialize(key, value);
                    promises.push(this.client.setex(key, ttl, serialized));
                }
                await Promise.all(promises);
            }
            else {
                const keyValues = [];
                for (const [key, value] of entries) {
                    keyValues.push(key, this.serialize(key, value));
                }
                await this.client.mset(...keyValues);
            }
            this.metrics.setOperations++;
            this.lastSuccessfulOperation = new Date();
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    async clear() {
        this.ensureInitialized();
        try {
            const size = await this.client.dbsize();
            await this.client.flushdb();
            this.lastSuccessfulOperation = new Date();
            return size;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    async getStats() {
        this.ensureInitialized();
        const total = this.metrics.hits + this.metrics.misses;
        return {
            hits: this.metrics.hits,
            misses: this.metrics.misses,
            hitRate: total > 0 ? this.metrics.hits / total : 0,
            size: await this.client.dbsize(),
            memoryUsage: await this.getMemoryUsage(),
        };
    }
    async resetStats() {
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
        this.ensureInitialized();
        const lockKey = `__lock__:${key}`;
        const lockValue = `${Date.now()}-${Math.random()}`;
        try {
            const result = await this.client.set(lockKey, lockValue, 'EX', ttl, 'NX');
            if (result !== 'OK') {
                return null;
            }
            return async () => {
                const currentValue = await this.client.get(lockKey);
                if (currentValue === lockValue) {
                    await this.client.del(lockKey);
                }
            };
        }
        catch (error) {
            this.handleError(error);
            return null;
        }
    }
    async healthCheck() {
        if (!this.initialized || !this.client) {
            return false;
        }
        try {
            const response = await this.client.ping();
            return response === 'PONG';
        }
        catch {
            return false;
        }
    }
    async shutdown() {
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
    async getMetrics() {
        this.ensureInitialized();
        const total = this.metrics.hits + this.metrics.misses;
        const size = await this.client.dbsize();
        return {
            hits: this.metrics.hits,
            misses: this.metrics.misses,
            hitRate: total > 0 ? (this.metrics.hits / total) * 100 : 0,
            size,
            maxSize: 0,
            memoryUsage: await this.getMemoryUsage(),
            evictions: 0,
            expirations: 0,
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
    async getTtl(key) {
        this.ensureInitialized();
        try {
            return await this.client.ttl(key);
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    async updateTtl(key, ttl) {
        this.ensureInitialized();
        try {
            const result = await this.client.expire(key, ttl);
            return result === 1;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    async keys(pattern) {
        this.ensureInitialized();
        try {
            const keys = [];
            let cursor = '0';
            do {
                const [nextCursor, batch] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', this.options.scanCount);
                cursor = nextCursor;
                keys.push(...batch.map(k => k.startsWith(this.options.keyPrefix)
                    ? k.slice(this.options.keyPrefix.length)
                    : k));
            } while (cursor !== '0');
            return keys;
        }
        catch (error) {
            this.handleError(error);
            throw error;
        }
    }
    async touch(key) {
        return this.exists(key);
    }
    onInvalidation(callback) {
        this.invalidationCallbacks.push(callback);
        return () => {
            const index = this.invalidationCallbacks.indexOf(callback);
            if (index >= 0) {
                this.invalidationCallbacks.splice(index, 1);
            }
        };
    }
    async publishInvalidation(key) {
        if (!this.options.enablePubSub || !this.client) {
            return;
        }
        try {
            await this.client.publish(this.options.pubSubChannel, key);
        }
        catch (error) {
            this.lastError = error;
        }
    }
    async loadRedis() {
        try {
            const Redis = require('ioredis');
            return Redis;
        }
        catch {
            throw new errors_1.CacheError(errors_1.CacheErrorCode.INVALID_CONFIG, 'ioredis is required for RedisCacheAdapter. Install it with: npm install ioredis', { adapter: this.name });
        }
    }
    async waitForConnection() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(errors_1.CacheConnectionError.timeout(this.options.host, this.options.port, this.options.connectTimeout));
            }, this.options.connectTimeout);
            const checkConnection = () => {
                if (this.client?.status === 'ready') {
                    clearTimeout(timeout);
                    resolve();
                }
                else if (this.client?.status === 'end') {
                    clearTimeout(timeout);
                    reject(errors_1.CacheConnectionError.refused(this.options.host, this.options.port));
                }
                else {
                    setTimeout(checkConnection, 100);
                }
            };
            checkConnection();
        });
    }
    async setupPubSub() {
        if (!this.client) {
            return;
        }
        this.subscriber = this.client.duplicate();
        this.subscriber.subscribe(this.options.pubSubChannel, (channel, message) => {
            if (channel === this.options.pubSubChannel) {
                for (const callback of this.invalidationCallbacks) {
                    callback(message);
                }
            }
        });
    }
    async addToTags(key, tags, ttl) {
        const promises = [];
        for (const tag of tags) {
            const tagKey = `${this.tagPrefix}${tag}:${key}`;
            if (ttl > 0) {
                promises.push(this.client.setex(tagKey, ttl, '1'));
            }
            else {
                promises.push(this.client.set(tagKey, '1'));
            }
        }
        await Promise.all(promises);
    }
    serialize(key, value) {
        try {
            return JSON.stringify(value);
        }
        catch (error) {
            throw errors_1.CacheSerializationError.serialize(key, typeof value, error);
        }
    }
    deserialize(key, data) {
        try {
            return JSON.parse(data);
        }
        catch (error) {
            throw errors_1.CacheSerializationError.deserialize(key, error);
        }
    }
    async getMemoryUsage() {
        try {
            const info = await this.client.info('memory');
            const match = info.match(/used_memory:(\d+)/);
            return match ? parseInt(match[1] ?? '0', 10) : undefined;
        }
        catch {
            return undefined;
        }
    }
    handleError(error) {
        this.lastError = error;
        this.consecutiveFailures++;
        this.metrics.errors++;
    }
    ensureInitialized() {
        if (!this.initialized || !this.client) {
            throw new errors_1.CacheError(errors_1.CacheErrorCode.NOT_INITIALIZED, 'Redis cache adapter is not initialized. Call initialize() first.', { adapter: this.name });
        }
    }
}
exports.RedisCacheAdapter = RedisCacheAdapter;
//# sourceMappingURL=redis-cache.adapter.js.map