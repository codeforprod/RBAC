"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryCache = exports.DefaultCacheKeyGenerator = void 0;
class DefaultCacheKeyGenerator {
    prefix;
    separator;
    constructor(config) {
        this.prefix = config?.prefix ?? 'rbac';
        this.separator = config?.separator ?? ':';
    }
    forRole(roleId) {
        return this.buildKey('role', roleId);
    }
    forPermission(permissionId) {
        return this.buildKey('permission', permissionId);
    }
    forUserPermissions(userId, organizationId) {
        const base = this.buildKey('user-permissions', userId);
        return organizationId ? `${base}${this.separator}${organizationId}` : base;
    }
    forUserRoles(userId, organizationId) {
        const base = this.buildKey('user-roles', userId);
        return organizationId ? `${base}${this.separator}${organizationId}` : base;
    }
    forRoleHierarchy(roleId) {
        return this.buildKey('role-hierarchy', roleId);
    }
    forRolePermissions(roleId) {
        return this.buildKey('role-permissions', roleId);
    }
    patternForUser(userId) {
        return `${this.prefix}${this.separator}user-*${this.separator}${userId}*`;
    }
    patternForRole(roleId) {
        return `${this.prefix}${this.separator}*role*${this.separator}${roleId}*`;
    }
    buildKey(...parts) {
        return [this.prefix, ...parts].join(this.separator);
    }
}
exports.DefaultCacheKeyGenerator = DefaultCacheKeyGenerator;
class InMemoryCache {
    cache;
    stats;
    constructor() {
        this.cache = new Map();
        this.stats = { hits: 0, misses: 0 };
    }
    async get(key, options) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.stats.misses++;
            return null;
        }
        if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }
        if (options?.refreshTtl && entry.expiresAt !== null) {
            const ttl = entry.expiresAt - Date.now();
            entry.expiresAt = Date.now() + ttl;
        }
        this.stats.hits++;
        return entry.value;
    }
    async set(key, value, options) {
        const expiresAt = options?.ttl ? Date.now() + options.ttl * 1000 : null;
        const tags = options?.tags ?? [];
        this.cache.set(key, { value, expiresAt, tags });
    }
    async delete(key) {
        return this.cache.delete(key);
    }
    async exists(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    async deletePattern(pattern) {
        const regex = this.patternToRegex(pattern);
        let count = 0;
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }
    async deleteByTag(tag) {
        return this.deleteByTags([tag]);
    }
    async deleteByTags(tags) {
        const tagSet = new Set(tags);
        let count = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (entry.tags.some(t => tagSet.has(t))) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }
    async getMany(keys) {
        const result = new Map();
        for (const key of keys) {
            result.set(key, await this.get(key));
        }
        return result;
    }
    async setMany(entries, options) {
        for (const [key, value] of entries) {
            await this.set(key, value, options);
        }
    }
    async clear() {
        const count = this.cache.size;
        this.cache.clear();
        return count;
    }
    async getStats() {
        const total = this.stats.hits + this.stats.misses;
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate: total > 0 ? this.stats.hits / total : 0,
            size: this.cache.size,
        };
    }
    async resetStats() {
        this.stats = { hits: 0, misses: 0 };
    }
    async getOrSet(key, factory, options) {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }
        const value = await factory();
        await this.set(key, value, options);
        return value;
    }
    async healthCheck() {
        return true;
    }
    async shutdown() {
        this.cache.clear();
    }
    patternToRegex(pattern) {
        const escaped = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        return new RegExp(`^${escaped}$`);
    }
}
exports.InMemoryCache = InMemoryCache;
//# sourceMappingURL=cache.interface.js.map