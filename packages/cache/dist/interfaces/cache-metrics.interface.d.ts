export interface ICacheMetrics {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    maxSize: number;
    memoryUsage?: number;
    evictions: number;
    expirations: number;
    getOperations: number;
    setOperations: number;
    deleteOperations: number;
    avgGetLatencyMs: number;
    avgSetLatencyMs: number;
    startedAt: Date;
    uptimeMs: number;
}
export interface IMultiLevelCacheMetrics {
    l1: ICacheMetrics | null;
    l2: ICacheMetrics | null;
    combinedHitRate: number;
    l1Hits: number;
    l2Hits: number;
    totalMisses: number;
}
export interface ICacheHealthStatus {
    healthy: boolean;
    adapter: string;
    connected: boolean;
    lastSuccessfulOperation: Date | null;
    lastError: string | null;
    consecutiveFailures: number;
    responseTimeMs: number;
}
//# sourceMappingURL=cache-metrics.interface.d.ts.map