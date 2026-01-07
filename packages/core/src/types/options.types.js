"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_VALIDATION_OPTIONS = exports.DEFAULT_PERFORMANCE_OPTIONS = exports.DEFAULT_MULTI_TENANCY_OPTIONS = exports.DEFAULT_PERMISSION_OPTIONS = exports.DEFAULT_HIERARCHY_OPTIONS = exports.DEFAULT_AUDIT_OPTIONS = exports.DEFAULT_CACHE_OPTIONS = void 0;
exports.mergeOptions = mergeOptions;
exports.DEFAULT_CACHE_OPTIONS = {
    enabled: true,
    defaultTtl: 3600,
    userPermissionsTtl: 300,
    roleHierarchyTtl: 3600,
    rolePermissionsTtl: 1800,
    keyPrefix: 'rbac',
    keySeparator: ':',
};
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
exports.DEFAULT_HIERARCHY_OPTIONS = {
    maxDepth: 10,
    cacheHierarchy: true,
    detectCircularDependencies: true,
    allowMultipleParents: true,
};
exports.DEFAULT_PERMISSION_OPTIONS = {
    separator: ':',
    wildcardChar: '*',
    globstarChar: '**',
    caseSensitive: false,
    allowScope: true,
    defaultScope: undefined,
};
exports.DEFAULT_MULTI_TENANCY_OPTIONS = {
    enabled: false,
    tenantIdField: 'organizationId',
    allowGlobalRoles: true,
    allowCrossTenantInheritance: false,
};
exports.DEFAULT_PERFORMANCE_OPTIONS = {
    maxPermissionsPerQuery: 1000,
    maxRolesPerQuery: 100,
    batchSize: 100,
    parallelPermissionChecks: true,
    connectionTimeout: 5000,
    queryTimeout: 10000,
};
exports.DEFAULT_VALIDATION_OPTIONS = {
    minRoleNameLength: 2,
    maxRoleNameLength: 64,
    roleNamePattern: /^[a-z0-9_-]+$/i,
    minPermissionLength: 3,
    maxPermissionLength: 128,
    validatePermissionFormat: true,
};
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