export interface TTLExpirationEvent {
    key: string;
    expiredAt: number;
    ttlMs: number;
}
export interface TTLStrategyOptions {
    defaultTtl: number;
    cleanupInterval: number;
    cleanupBatchSize: number;
    defaultSliding: boolean;
}
export declare const DEFAULT_TTL_OPTIONS: TTLStrategyOptions;
export declare class TTLStrategy {
    private readonly entries;
    private readonly expirationQueue;
    private readonly options;
    private cleanupTimer;
    private expirationCallbacks;
    private expiredCount;
    constructor(options?: Partial<TTLStrategyOptions>);
    set(key: string, ttlSeconds?: number, options?: {
        sliding?: boolean;
    }): void;
    isExpired(key: string): boolean;
    getTtl(key: string): number;
    getExpiresAt(key: string): number | null;
    updateTtl(key: string, ttlSeconds: number): boolean;
    touch(key: string): boolean;
    remove(key: string): boolean;
    has(key: string): boolean;
    getExpiredKeys(): string[];
    cleanup(maxCount?: number): string[];
    onExpiration(callback: (event: TTLExpirationEvent) => void): () => void;
    get size(): number;
    get expirations(): number;
    clear(): void;
    stop(): void;
    private startCleanupTimer;
    private insertIntoQueue;
}
//# sourceMappingURL=ttl-strategy.d.ts.map