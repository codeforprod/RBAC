"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PACKAGE_NAME = exports.VERSION = exports.createAuditLogger = exports.ContextualAuditLogger = exports.InMemoryAuditLogger = exports.PermissionChecker = exports.RBACEngine = exports.hierarchyUtils = exports.RoleHierarchyResolver = exports.permissionMatcher = exports.PermissionMatcher = exports.wildcardParser = exports.WildcardParser = exports.CircularHierarchyError = exports.RoleNotFoundError = exports.PermissionDeniedError = exports.RBACErrorCode = exports.RBACError = exports.DEFAULT_VALIDATION_OPTIONS = exports.DEFAULT_PERFORMANCE_OPTIONS = exports.DEFAULT_MULTI_TENANCY_OPTIONS = exports.DEFAULT_PERMISSION_OPTIONS = exports.DEFAULT_HIERARCHY_OPTIONS = exports.DEFAULT_AUDIT_OPTIONS = exports.DEFAULT_CACHE_OPTIONS = exports.mergeOptions = exports.NoOpAuditLogger = exports.AuditSeverity = exports.AuditAction = exports.InMemoryCache = exports.DefaultCacheKeyGenerator = void 0;
// ============================================================================
// Interfaces
// ============================================================================
var interfaces_1 = require("./interfaces");
Object.defineProperty(exports, "DefaultCacheKeyGenerator", { enumerable: true, get: function () { return interfaces_1.DefaultCacheKeyGenerator; } });
Object.defineProperty(exports, "InMemoryCache", { enumerable: true, get: function () { return interfaces_1.InMemoryCache; } });
Object.defineProperty(exports, "AuditAction", { enumerable: true, get: function () { return interfaces_1.AuditAction; } });
Object.defineProperty(exports, "AuditSeverity", { enumerable: true, get: function () { return interfaces_1.AuditSeverity; } });
Object.defineProperty(exports, "NoOpAuditLogger", { enumerable: true, get: function () { return interfaces_1.NoOpAuditLogger; } });
// ============================================================================
// Types
// ============================================================================
var types_1 = require("./types");
// Merge function
Object.defineProperty(exports, "mergeOptions", { enumerable: true, get: function () { return types_1.mergeOptions; } });
// Default values
Object.defineProperty(exports, "DEFAULT_CACHE_OPTIONS", { enumerable: true, get: function () { return types_1.DEFAULT_CACHE_OPTIONS; } });
Object.defineProperty(exports, "DEFAULT_AUDIT_OPTIONS", { enumerable: true, get: function () { return types_1.DEFAULT_AUDIT_OPTIONS; } });
Object.defineProperty(exports, "DEFAULT_HIERARCHY_OPTIONS", { enumerable: true, get: function () { return types_1.DEFAULT_HIERARCHY_OPTIONS; } });
Object.defineProperty(exports, "DEFAULT_PERMISSION_OPTIONS", { enumerable: true, get: function () { return types_1.DEFAULT_PERMISSION_OPTIONS; } });
Object.defineProperty(exports, "DEFAULT_MULTI_TENANCY_OPTIONS", { enumerable: true, get: function () { return types_1.DEFAULT_MULTI_TENANCY_OPTIONS; } });
Object.defineProperty(exports, "DEFAULT_PERFORMANCE_OPTIONS", { enumerable: true, get: function () { return types_1.DEFAULT_PERFORMANCE_OPTIONS; } });
Object.defineProperty(exports, "DEFAULT_VALIDATION_OPTIONS", { enumerable: true, get: function () { return types_1.DEFAULT_VALIDATION_OPTIONS; } });
// ============================================================================
// Errors
// ============================================================================
var errors_1 = require("./errors");
// Base error
Object.defineProperty(exports, "RBACError", { enumerable: true, get: function () { return errors_1.RBACError; } });
Object.defineProperty(exports, "RBACErrorCode", { enumerable: true, get: function () { return errors_1.RBACErrorCode; } });
// Specific errors
Object.defineProperty(exports, "PermissionDeniedError", { enumerable: true, get: function () { return errors_1.PermissionDeniedError; } });
Object.defineProperty(exports, "RoleNotFoundError", { enumerable: true, get: function () { return errors_1.RoleNotFoundError; } });
Object.defineProperty(exports, "CircularHierarchyError", { enumerable: true, get: function () { return errors_1.CircularHierarchyError; } });
// ============================================================================
// Utilities
// ============================================================================
var utils_1 = require("./utils");
// Wildcard parser
Object.defineProperty(exports, "WildcardParser", { enumerable: true, get: function () { return utils_1.WildcardParser; } });
Object.defineProperty(exports, "wildcardParser", { enumerable: true, get: function () { return utils_1.wildcardParser; } });
// Permission matcher
Object.defineProperty(exports, "PermissionMatcher", { enumerable: true, get: function () { return utils_1.PermissionMatcher; } });
Object.defineProperty(exports, "permissionMatcher", { enumerable: true, get: function () { return utils_1.permissionMatcher; } });
// Role hierarchy
Object.defineProperty(exports, "RoleHierarchyResolver", { enumerable: true, get: function () { return utils_1.RoleHierarchyResolver; } });
Object.defineProperty(exports, "hierarchyUtils", { enumerable: true, get: function () { return utils_1.hierarchyUtils; } });
// ============================================================================
// Services
// ============================================================================
var services_1 = require("./services");
// Main engine
Object.defineProperty(exports, "RBACEngine", { enumerable: true, get: function () { return services_1.RBACEngine; } });
// Permission checker
Object.defineProperty(exports, "PermissionChecker", { enumerable: true, get: function () { return services_1.PermissionChecker; } });
// Audit logger
Object.defineProperty(exports, "InMemoryAuditLogger", { enumerable: true, get: function () { return services_1.InMemoryAuditLogger; } });
Object.defineProperty(exports, "ContextualAuditLogger", { enumerable: true, get: function () { return services_1.ContextualAuditLogger; } });
Object.defineProperty(exports, "createAuditLogger", { enumerable: true, get: function () { return services_1.createAuditLogger; } });
// ============================================================================
// Version
// ============================================================================
/**
 * Package version.
 */
exports.VERSION = '1.0.0';
/**
 * Package name.
 */
exports.PACKAGE_NAME = '@holocron/rbac-core';
//# sourceMappingURL=index.js.map