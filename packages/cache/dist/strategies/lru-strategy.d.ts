export interface LRUEvictionEvent<K, V> {
    key: K;
    value: V;
    reason: 'capacity' | 'manual';
}
export declare class LRUStrategy<K, V> {
    private readonly maxSize;
    private readonly cache;
    private head;
    private tail;
    private onEvict?;
    private evictionCount;
    constructor(maxSize: number, onEvict?: (event: LRUEvictionEvent<K, V>) => void);
    get(key: K): V | undefined;
    has(key: K): boolean;
    peek(key: K): V | undefined;
    set(key: K, value: V): void;
    delete(key: K): boolean;
    touch(key: K): boolean;
    clear(): void;
    get size(): number;
    get capacity(): number;
    get evictions(): number;
    keys(): K[];
    entries(): Array<[K, V]>;
    forEach(callback: (value: V, key: K) => void): void;
    getLRUKey(): K | undefined;
    getMRUKey(): K | undefined;
    private addToHead;
    private removeNode;
    private moveToHead;
    private evictLRU;
}
//# sourceMappingURL=lru-strategy.d.ts.map