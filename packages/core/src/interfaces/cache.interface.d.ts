export type CacheSerializedValue = string | Buffer;
export interface ICacheSetOptions {
    ttl?: number;
    tags?: string[];
}
export interface ICacheGetOptions {
    refreshTtl?: boolean;
}
export interface ICacheStats {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    memoryUsage?: number;
}
export interface IRBACCache {
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
    lock?(key: string, ttl?: number): Promise<(() => Promise<void>) | null>;
    healthCheck?(): Promise<boolean>;
    shutdown?(): Promise<void>;
}
export interface ICacheKeyConfig {
    prefix: string;
    separator: string;
}
export interface ICacheKeyGenerator {
    forRole(roleId: string): string;
    forPermission(permissionId: string): string;
    forUserPermissions(userId: string, organizationId?: string | null): string;
    forUserRoles(userId: string, organizationId?: string | null): string;
    forRoleHierarchy(roleId: string): string;
    forRolePermissions(roleId: string): string;
    patternForUser(userId: string): string;
    patternForRole(roleId: string): string;
}
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