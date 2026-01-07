import { IRBACAdapter } from '../interfaces/adapter.interface';
import { IRBACCache } from '../interfaces/cache.interface';
import { IAuditLogger } from '../interfaces/audit.interface';
export interface CacheOptions {
    enabled: boolean;
    defaultTtl: number;
    userPermissionsTtl: number;
    roleHierarchyTtl: number;
    rolePermissionsTtl: number;
    keyPrefix: string;
    keySeparator: string;
}
export interface AuditOptions {
    enabled: boolean;
    logSuccessfulChecks: boolean;
    logDeniedChecks: boolean;
    logRoleChanges: boolean;
    logPermissionChanges: boolean;
    logCacheInvalidation: boolean;
    includeContext: boolean;
    includeIpAddress: boolean;
    includeUserAgent: boolean;
}
export interface HierarchyOptions {
    maxDepth: number;
    cacheHierarchy: boolean;
    detectCircularDependencies: boolean;
    allowMultipleParents: boolean;
}
export interface PermissionOptions {
    separator: string;
    wildcardChar: string;
    globstarChar: string;
    caseSensitive: boolean;
    allowScope: boolean;
    defaultScope?: string;
}
export interface MultiTenancyOptions {
    enabled: boolean;
    tenantIdField: string;
    allowGlobalRoles: boolean;
    allowCrossTenantInheritance: boolean;
}
export interface PerformanceOptions {
    maxPermissionsPerQuery: number;
    maxRolesPerQuery: number;
    batchSize: number;
    parallelPermissionChecks: boolean;
    connectionTimeout: number;
    queryTimeout: number;
}
export interface ValidationOptions {
    minRoleNameLength: number;
    maxRoleNameLength: number;
    roleNamePattern: RegExp;
    minPermissionLength: number;
    maxPermissionLength: number;
    validatePermissionFormat: boolean;
}
export interface RBACEngineOptions {
    adapter: IRBACAdapter;
    cache?: IRBACCache;
    auditLogger?: IAuditLogger;
    cacheOptions?: Partial<CacheOptions>;
    auditOptions?: Partial<AuditOptions>;
    hierarchyOptions?: Partial<HierarchyOptions>;
    permissionOptions?: Partial<PermissionOptions>;
    multiTenancyOptions?: Partial<MultiTenancyOptions>;
    performanceOptions?: Partial<PerformanceOptions>;
    validationOptions?: Partial<ValidationOptions>;
    autoInitialize?: boolean;
    strictMode?: boolean;
    debug?: boolean;
}
export declare const DEFAULT_CACHE_OPTIONS: CacheOptions;
export declare const DEFAULT_AUDIT_OPTIONS: AuditOptions;
export declare const DEFAULT_HIERARCHY_OPTIONS: HierarchyOptions;
export declare const DEFAULT_PERMISSION_OPTIONS: PermissionOptions;
export declare const DEFAULT_MULTI_TENANCY_OPTIONS: MultiTenancyOptions;
export declare const DEFAULT_PERFORMANCE_OPTIONS: PerformanceOptions;
export declare const DEFAULT_VALIDATION_OPTIONS: ValidationOptions;
export declare function mergeOptions(options: RBACEngineOptions): Required<Omit<RBACEngineOptions, 'adapter' | 'cache' | 'auditLogger'>> & Pick<RBACEngineOptions, 'adapter' | 'cache' | 'auditLogger'>;
export type ResolvedRBACEngineOptions = ReturnType<typeof mergeOptions>;
export type PermissionString = string;
export type RoleName = string;
export type UserId = string;
export type OrganizationId = string | null;
export type PermissionCheckCallback = (userId: UserId, permission: PermissionString, allowed: boolean, context?: Record<string, unknown>) => void | Promise<void>;
export type RoleChangeCallback = (event: 'assigned' | 'removed' | 'expired', userId: UserId, roleId: string, context?: Record<string, unknown>) => void | Promise<void>;
export interface RBACEventHooks {
    beforePermissionCheck?: (userId: UserId, permission: PermissionString) => void | Promise<void>;
    afterPermissionCheck?: PermissionCheckCallback;
    onRoleAssigned?: RoleChangeCallback;
    onRoleRemoved?: RoleChangeCallback;
    onRoleExpired?: RoleChangeCallback;
    onCacheInvalidated?: (keys: string[]) => void | Promise<void>;
    onError?: (error: Error, context?: Record<string, unknown>) => void | Promise<void>;
}
//# sourceMappingURL=options.types.d.ts.map