"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_VALIDATION_OPTIONS = exports.DEFAULT_PERFORMANCE_OPTIONS = exports.DEFAULT_MULTI_TENANCY_OPTIONS = exports.DEFAULT_PERMISSION_OPTIONS = exports.DEFAULT_HIERARCHY_OPTIONS = exports.DEFAULT_AUDIT_OPTIONS = exports.DEFAULT_CACHE_OPTIONS = void 0;
exports.mergeOptions = mergeOptions;
/**
 * Default cache options.
 */
exports.DEFAULT_CACHE_OPTIONS = {
    enabled: true,
    defaultTtl: 3600, // 1 hour
    userPermissionsTtl: 300, // 5 minutes
    roleHierarchyTtl: 3600, // 1 hour
    rolePermissionsTtl: 1800, // 30 minutes
    keyPrefix: 'rbac',
    keySeparator: ':',
};
/**
 * Default audit options.
 */
exports.DEFAULT_AUDIT_OPTIONS = {
    enabled: true,
    logSuccessfulChecks: false,
    logDeniedChecks: true,
    logRoleChanges: true,
    logPermissionChanges: true,
    logCacheInvalidation: false,
    includeContext: true,
    includeIpAddress: true,
    includeUserAgent: false,
};
/**
 * Default hierarchy options.
 */
exports.DEFAULT_HIERARCHY_OPTIONS = {
    maxDepth: 10,
    cacheHierarchy: true,
    detectCircularDependencies: true,
    allowMultipleParents: true,
};
/**
 * Default permission options.
 */
exports.DEFAULT_PERMISSION_OPTIONS = {
    separator: ':',
    wildcardChar: '*',
    globstarChar: '**',
    caseSensitive: false,
    allowScope: true,
    defaultScope: undefined,
};
/**
 * Default multi-tenancy options.
 */
exports.DEFAULT_MULTI_TENANCY_OPTIONS = {
    enabled: false,
    tenantIdField: 'organizationId',
    allowGlobalRoles: true,
    allowCrossTenantInheritance: false,
};
/**
 * Default performance options.
 */
exports.DEFAULT_PERFORMANCE_OPTIONS = {
    maxPermissionsPerQuery: 1000,
    maxRolesPerQuery: 100,
    batchSize: 100,
    parallelPermissionChecks: true,
    connectionTimeout: 5000,
    queryTimeout: 10000,
};
/**
 * Default validation options.
 */
exports.DEFAULT_VALIDATION_OPTIONS = {
    minRoleNameLength: 2,
    maxRoleNameLength: 64,
    roleNamePattern: /^[a-z0-9_-]+$/i,
    minPermissionLength: 3,
    maxPermissionLength: 128,
    validatePermissionFormat: true,
};
/**
 * Merge user options with defaults.
 *
 * @param options - User-provided options
 * @returns Complete options with defaults applied
 *
 * @example
 * ```typescript
 * const options = mergeOptions({
 *   adapter: myAdapter,
 *   cacheOptions: { defaultTtl: 7200 }
 * });
 * ```
 */
function mergeOptions(options) {
    return {
        adapter: options.adapter,
        cache: options.cache,
        auditLogger: options.auditLogger,
        cacheOptions: { ...exports.DEFAULT_CACHE_OPTIONS, ...options.cacheOptions },
        auditOptions: { ...exports.DEFAULT_AUDIT_OPTIONS, ...options.auditOptions },
        hierarchyOptions: { ...exports.DEFAULT_HIERARCHY_OPTIONS, ...options.hierarchyOptions },
        permissionOptions: { ...exports.DEFAULT_PERMISSION_OPTIONS, ...options.permissionOptions },
        multiTenancyOptions: { ...exports.DEFAULT_MULTI_TENANCY_OPTIONS, ...options.multiTenancyOptions },
        performanceOptions: { ...exports.DEFAULT_PERFORMANCE_OPTIONS, ...options.performanceOptions },
        validationOptions: { ...exports.DEFAULT_VALIDATION_OPTIONS, ...options.validationOptions },
        autoInitialize: options.autoInitialize ?? true,
        strictMode: options.strictMode ?? true,
        debug: options.debug ?? false,
    };
}
//# sourceMappingURL=options.types.js.map