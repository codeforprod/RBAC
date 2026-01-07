import type { IRBACCache, ICacheSetOptions, ICacheGetOptions, ICacheStats } from '@holocron/rbac-core';
export type { ICacheSetOptions, ICacheGetOptions, ICacheStats };
import { ICacheMetrics, ICacheHealthStatus } from './cache-metrics.interface';
export interface ICacheAdapter extends IRBACCache {
    readonly name: string;
    initialize(): Promise<void>;
    getMetrics(): Promise<ICacheMetrics>;
    getHealthStatus(): Promise<ICacheHealthStatus>;
    isReady(): boolean;
    onInvalidation?(callback: (key: string) => void): () => void;
    publishInvalidation?(key: string): Promise<void>;
    getTtl(key: string): Promise<number>;
    updateTtl(key: string, ttl: number): Promise<boolean>;
    keys(pattern: string): Promise<string[]>;
    touch(key: string): Promise<boolean>;
}
export interface ICacheEntry<T = unknown> {
    value: T;
    createdAt: number;
    accessedAt: number;
    expiresAt: number | null;
    tags: string[];
    accessCount: number;
    size?: number;
}
export interface ICacheEvictionEvent {
    key: string;
    reason: CacheEvictionReason;
    timestamp: number;
}
export type CacheEvictionReason = 'expired' | 'lru' | 'manual' | 'pattern_delete' | 'tag_delete' | 'clear';
export interface ICacheAdapterFactory<TOptions, TAdapter extends ICacheAdapter> {
    create(options: TOptions): TAdapter;
}
//# sourceMappingURL=cache-adapter.interface.d.ts.map