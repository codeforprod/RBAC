"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTLStrategy = exports.DEFAULT_TTL_OPTIONS = void 0;
exports.DEFAULT_TTL_OPTIONS = {
    defaultTtl: 300,
    cleanupInterval: 60000,
    cleanupBatchSize: 100,
    defaultSliding: false,
};
class TTLStrategy {
    entries = new Map();
    expirationQueue = [];
    options;
    cleanupTimer = null;
    expirationCallbacks = [];
    expiredCount = 0;
    constructor(options = {}) {
        this.options = { ...exports.DEFAULT_TTL_OPTIONS, ...options };
        if (this.options.cleanupInterval > 0) {
            this.startCleanupTimer();
        }
    }
    set(key, ttlSeconds, options) {
        const ttl = ttlSeconds ?? this.options.defaultTtl;
        const ttlMs = ttl * 1000;
        const expiresAt = Date.now() + ttlMs;
        const sliding = options?.sliding ?? this.options.defaultSliding;
        this.remove(key);
        const entry = {
            key,
            expiresAt,
            ttlMs,
            sliding,
        };
        this.entries.set(key, entry);
        this.insertIntoQueue(expiresAt, key);
    }
    isExpired(key) {
        const entry = this.entries.get(key);
        if (!entry) {
            return true;
        }
        return Date.now() > entry.expiresAt;
    }
    getTtl(key) {
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
    getExpiresAt(key) {
        const entry = this.entries.get(key);
        return entry?.expiresAt ?? null;
    }
    updateTtl(key, ttlSeconds) {
        const entry = this.entries.get(key);
        if (!entry) {
            return false;
        }
        const ttlMs = ttlSeconds * 1000;
        const expiresAt = Date.now() + ttlMs;
        entry.expiresAt = expiresAt;
        entry.ttlMs = ttlMs;
        this.insertIntoQueue(expiresAt, key);
        return true;
    }
    touch(key) {
        const entry = this.entries.get(key);
        if (!entry) {
            return false;
        }
        if (!entry.sliding) {
            return true;
        }
        const expiresAt = Date.now() + entry.ttlMs;
        entry.expiresAt = expiresAt;
        this.insertIntoQueue(expiresAt, key);
        return true;
    }
    remove(key) {
        return this.entries.delete(key);
    }
    has(key) {
        return this.entries.has(key);
    }
    getExpiredKeys() {
        const now = Date.now();
        const expired = [];
        for (const [key, entry] of this.entries) {
            if (now > entry.expiresAt) {
                expired.push(key);
            }
        }
        return expired;
    }
    cleanup(maxCount) {
        const now = Date.now();
        const limit = maxCount ?? this.options.cleanupBatchSize;
        const expiredKeys = [];
        while (this.expirationQueue.length > 0 && expiredKeys.length < limit) {
            const firstEntry = this.expirationQueue[0];
            if (!firstEntry) {
                break;
            }
            const [expiresAt, key] = firstEntry;
            if (expiresAt > now) {
                break;
            }
            this.expirationQueue.shift();
            const entry = this.entries.get(key);
            if (!entry) {
                continue;
            }
            if (entry.expiresAt !== expiresAt) {
                continue;
            }
            expiredKeys.push(key);
            this.entries.delete(key);
            this.expiredCount++;
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
    onExpiration(callback) {
        this.expirationCallbacks.push(callback);
        return () => {
            const index = this.expirationCallbacks.indexOf(callback);
            if (index >= 0) {
                this.expirationCallbacks.splice(index, 1);
            }
        };
    }
    get size() {
        return this.entries.size;
    }
    get expirations() {
        return this.expiredCount;
    }
    clear() {
        this.entries.clear();
        this.expirationQueue.length = 0;
    }
    stop() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.options.cleanupInterval);
        if (this.cleanupTimer.unref) {
            this.cleanupTimer.unref();
        }
    }
    insertIntoQueue(expiresAt, key) {
        let left = 0;
        let right = this.expirationQueue.length;
        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            const midEntry = this.expirationQueue[mid];
            const midExpiresAt = midEntry?.[0] ?? 0;
            if (midExpiresAt < expiresAt) {
                left = mid + 1;
            }
            else {
                right = mid;
            }
        }
        this.expirationQueue.splice(left, 0, [expiresAt, key]);
    }
}
exports.TTLStrategy = TTLStrategy;
//# sourceMappingURL=ttl-strategy.js.map