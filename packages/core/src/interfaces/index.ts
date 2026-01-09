/**
 * @fileoverview
 * Central export file for all RBAC core interfaces.
 * Import from '@prodforcode/rbac-core' to access all interfaces.
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
 * } from '@prodforcode/rbac-core';
 * ```
 */

// Permission interfaces
export { IPermission, IPermissionMatcher, IPermissionCheckResult } from './permission.interface';

// Role interfaces
export {
  IRole,
  IRoleHierarchy,
  IRoleHierarchyTree,
  ICreateRoleOptions,
  IUpdateRoleOptions,
} from './role.interface';

// Adapter interfaces
export {
  IRBACAdapter,
  IRBACAdapterFactory,
  IQueryOptions,
  IPaginatedResult,
  ITransactionContext,
} from './adapter.interface';

// Cache interfaces
export {
  IRBACCache,
  ICacheSetOptions,
  ICacheGetOptions,
  ICacheStats,
  ICacheKeyConfig,
  ICacheKeyGenerator,
  DefaultCacheKeyGenerator,
  InMemoryCache,
  CacheSerializedValue,
} from './cache.interface';

// Audit interfaces
export {
  IAuditLogger,
  IAuditEntry,
  IAuditContext,
  IAuditQueryOptions,
  IAuditQueryResult,
  IAuditSummary,
  ICreateAuditEntryOptions,
  AuditAction,
  AuditSeverity,
  NoOpAuditLogger,
} from './audit.interface';

// User interfaces
export {
  IRBACUser,
  IUserRoleAssignment,
  IUserRoleService,
  IUserAuthorizationContext,
  IUserPermissionResult,
  ICreateUserRoleOptions,
  ICheckPermissionOptions,
  IDetailedPermissionCheckResult,
} from './user.interface';
