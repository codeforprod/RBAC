/**
 * @fileoverview
 * Central export file for all RBAC core interfaces.
 * Import from '@holocron/rbac-core' to access all interfaces.
 *
 * @example
 * ```typescript
 * import {
 *   IPermission,
 *   IRole,
 *   IRBACAdapter,
 *   IRBACCache,
 *   IAuditLogger,
 *   IUserRoleAssignment
 * } from '@holocron/rbac-core';
 * ```
 */
export { IPermission, IPermissionMatcher, IPermissionCheckResult, } from './permission.interface';
export { IRole, IRoleHierarchy, IRoleHierarchyTree, ICreateRoleOptions, IUpdateRoleOptions, } from './role.interface';
export { IRBACAdapter, IRBACAdapterFactory, IQueryOptions, IPaginatedResult, ITransactionContext, } from './adapter.interface';
export { IRBACCache, ICacheSetOptions, ICacheGetOptions, ICacheStats, ICacheKeyConfig, ICacheKeyGenerator, DefaultCacheKeyGenerator, InMemoryCache, CacheSerializedValue, } from './cache.interface';
export { IAuditLogger, IAuditEntry, IAuditContext, IAuditQueryOptions, IAuditQueryResult, IAuditSummary, ICreateAuditEntryOptions, AuditAction, AuditSeverity, NoOpAuditLogger, } from './audit.interface';
export { IRBACUser, IUserRoleAssignment, IUserRoleService, IUserAuthorizationContext, IUserPermissionResult, ICreateUserRoleOptions, ICheckPermissionOptions, IDetailedPermissionCheckResult, } from './user.interface';
//# sourceMappingURL=index.d.ts.map