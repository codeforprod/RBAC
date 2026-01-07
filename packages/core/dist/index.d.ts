/**
 * @fileoverview
 * @holocron/rbac-core - Framework-agnostic Role-Based Access Control library
 *
 * This package provides a complete RBAC implementation with:
 * - Permission matching with wildcard support (*, **)
 * - Role hierarchy with inheritance
 * - Attribute-Based Access Control (ABAC) through conditions
 * - Caching integration for performance
 * - Comprehensive audit logging
 * - Multi-tenancy support
 *
 * @packageDocumentation
 *
 * @example Basic Usage
 * ```typescript
 * import {
 *   RBACEngine,
 *   InMemoryCache,
 *   InMemoryAuditLogger
 * } from '@holocron/rbac-core';
 *
 * // Create RBAC engine
 * const rbac = await RBACEngine.create({
 *   adapter: myDatabaseAdapter,
 *   cache: new InMemoryCache(),
 *   auditLogger: new InMemoryAuditLogger()
 * });
 *
 * // Check permissions
 * const canRead = await rbac.can('user-123', 'posts:read');
 * const canEdit = await rbac.can('user-123', 'posts:update', {
 *   resourceOwnerId: 'user-123'  // For ownership checks
 * });
 *
 * // Throws if not authorized
 * await rbac.authorize('user-123', 'admin:delete');
 *
 * // Role management
 * const role = await rbac.createRole({
 *   name: 'editor',
 *   permissions: ['posts:*', 'comments:read']
 * });
 *
 * // Assign role to user
 * await rbac.assignRole({
 *   userId: 'user-123',
 *   roleId: role.id
 * });
 * ```
 *
 * @example With Wildcards
 * ```typescript
 * // Single-level wildcard (*)
 * 'posts:*'        // Matches posts:read, posts:write, NOT posts:draft:publish
 * 'users:*:read'   // Matches users:profile:read, users:settings:read
 *
 * // Multi-level wildcard (**)
 * 'admin:**'       // Matches admin:users:delete, admin:roles:permissions:grant
 * '**:read'        // Matches posts:read, users:profile:read
 *
 * // Super admin
 * '**'             // Matches everything
 * ```
 *
 * @example Role Hierarchy
 * ```typescript
 * // Create parent role
 * const viewer = await rbac.createRole({
 *   name: 'viewer',
 *   permissions: ['posts:read', 'comments:read']
 * });
 *
 * // Create child role that inherits from viewer
 * const editor = await rbac.createRole({
 *   name: 'editor',
 *   permissions: ['posts:write', 'posts:delete'],
 *   parentRoles: [viewer.id]  // Inherits viewer permissions
 * });
 *
 * // User with 'editor' role can:
 * // - posts:read (inherited from viewer)
 * // - comments:read (inherited from viewer)
 * // - posts:write (direct)
 * // - posts:delete (direct)
 * ```
 *
 * @example Implementing Custom Adapter
 * ```typescript
 * import { IRBACAdapter, IRole, IPermission } from '@holocron/rbac-core';
 *
 * class MyDatabaseAdapter implements IRBACAdapter {
 *   async findRoleById(id: string): Promise<IRole | null> {
 *     return this.db.roles.findOne({ where: { id } });
 *   }
 *
 *   async createRole(options: ICreateRoleOptions): Promise<IRole> {
 *     return this.db.roles.create(options);
 *   }
 *
 *   // ... implement all required methods
 * }
 * ```
 */
export { IPermission, IPermissionMatcher, IPermissionCheckResult, IRole, IRoleHierarchy, IRoleHierarchyTree, ICreateRoleOptions, IUpdateRoleOptions, IRBACAdapter, IRBACAdapterFactory, IQueryOptions, IPaginatedResult, ITransactionContext, IRBACCache, ICacheKeyGenerator, ICacheGetOptions, ICacheSetOptions, ICacheStats, ICacheKeyConfig, DefaultCacheKeyGenerator, InMemoryCache, CacheSerializedValue, IAuditLogger, IAuditEntry, IAuditContext, ICreateAuditEntryOptions, IAuditQueryOptions, IAuditQueryResult, IAuditSummary, AuditAction, AuditSeverity, NoOpAuditLogger, IRBACUser, IUserRoleAssignment, IUserRoleService, IUserAuthorizationContext, IUserPermissionResult, ICreateUserRoleOptions, ICheckPermissionOptions, IDetailedPermissionCheckResult, } from './interfaces';
export { RBACEngineOptions, ResolvedRBACEngineOptions, CacheOptions, AuditOptions, HierarchyOptions, PermissionOptions, MultiTenancyOptions, PerformanceOptions, ValidationOptions, RBACEventHooks, PermissionCheckCallback, RoleChangeCallback, PermissionString, RoleName, UserId, OrganizationId, mergeOptions, DEFAULT_CACHE_OPTIONS, DEFAULT_AUDIT_OPTIONS, DEFAULT_HIERARCHY_OPTIONS, DEFAULT_PERMISSION_OPTIONS, DEFAULT_MULTI_TENANCY_OPTIONS, DEFAULT_PERFORMANCE_OPTIONS, DEFAULT_VALIDATION_OPTIONS, } from './types';
export { RBACError, RBACErrorCode, RBACErrorContext, PermissionDeniedError, PermissionDeniedContext, RoleNotFoundError, RoleNotFoundContext, CircularHierarchyError, CircularHierarchyContext, } from './errors';
export { WildcardParser, ParsedPermission, WildcardMatchResult, wildcardParser, PermissionMatcher, PermissionMatchContext, PermissionMatcherResult, permissionMatcher, RoleHierarchyResolver, HierarchyResolutionResult, hierarchyUtils, } from './utils';
export { RBACEngine, PermissionChecker, PermissionCheckerOptions, InMemoryAuditLogger, ContextualAuditLogger, createAuditLogger, } from './services';
/**
 * Package version.
 */
export declare const VERSION = "1.0.0";
/**
 * Package name.
 */
export declare const PACKAGE_NAME = "@holocron/rbac-core";
//# sourceMappingURL=index.d.ts.map