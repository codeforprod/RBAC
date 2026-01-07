"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LRUStrategy = void 0;
class LRUStrategy {
    maxSize;
    cache;
    head = null;
    tail = null;
    onEvict;
    evictionCount = 0;
    constructor(maxSize, onEvict) {
        if (maxSize < 1) {
            throw new Error('LRU cache maxSize must be at least 1');
        }
        this.maxSize = maxSize;
        this.cache = new Map();
        this.onEvict = onEvict;
    }
    get(key) {
        const node = this.cache.get(key);
        if (!node) {
            return undefined;
        }
        this.moveToHead(node);
        return node.value;
    }
    has(key) {
        return this.cache.has(key);
    }
    peek(key) {
        const node = this.cache.get(key);
        return node?.value;
    }
    set(key, value) {
        const existingNode = this.cache.get(key);
        if (existingNode) {
            existingNode.value = value;
            this.moveToHead(existingNode);
            return;
        }
        const newNode = {
            key,
            value,
            prev: null,
            next: null,
        };
        this.cache.set(key, newNode);
        this.addToHead(newNode);
        if (this.cache.size > this.maxSize) {
            this.evictLRU();
        }
    }
    delete(key) {
        const node = this.cache.get(key);
        if (!node) {
            return false;
        }
        this.removeNode(node);
        this.cache.delete(key);
        return true;
    }
    touch(key) {
        const node = this.cache.get(key);
        if (!node) {
            return false;
        }
        this.moveToHead(node);
        return true;
    }
    clear() {
        this.cache.clear();
        this.head = null;
        this.tail = null;
    }
    get size() {
        return this.cache.size;
    }
    get capacity() {
        return this.maxSize;
    }
    get evictions() {
        return this.evictionCount;
    }
    keys() {
        const keys = [];
        let current = this.head;
        while (current) {
            keys.push(current.key);
            current = current.next;
        }
        return keys;
    }
    entries() {
        const entries = [];
        let current = this.head;
        while (current) {
            entries.push([current.key, current.value]);
            current = current.next;
        }
        return entries;
    }
    forEach(callback) {
        let current = this.head;
        while (current) {
            callback(current.value, current.key);
            current = current.next;
        }
    }
    getLRUKey() {
        return this.tail?.key;
    }
    getMRUKey() {
        return this.head?.key;
    }
    addToHead(node) {
        node.prev = null;
        node.next = this.head;
        if (this.head) {
            this.head.prev = node;
        }
        this.head = node;
        if (!this.tail) {
            this.tail = node;
        }
    }
    removeNode(node) {
        if (node.prev) {
            node.prev.next = node.next;
        }
        else {
            this.head = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        }
        else {
            this.tail = node.prev;
        }
    }
    moveToHead(node) {
        if (node === this.head) {
            return;
        }
        this.removeNode(node);
        this.addToHead(node);
    }
    evictLRU() {
        if (!this.tail) {
            return;
        }
        const evictedKey = this.tail.key;
        const evictedValue = this.tail.value;
        this.removeNode(this.tail);
        this.cache.delete(evictedKey);
        this.evictionCount++;
        if (this.onEvict) {
            this.onEvict({
                key: evictedKey,
                value: evictedValue,
                reason: 'capacity',
            });
        }
    }
}
exports.LRUStrategy = LRUStrategy;
//# sourceMappingURL=lru-strategy.js.map