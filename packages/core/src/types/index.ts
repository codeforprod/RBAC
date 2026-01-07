/**
 * @fileoverview
 * Central export file for all RBAC core types.
 * Import from '@holocron/rbac-core' to access all types.
 *
 * @example
 * ```typescript
 * import {
 *   RBACEngineOptions,
 *   CacheOptions,
 *   AuditOptions,
 *   PermissionString,
 * } from '@holocron/rbac-core';
 * ```
 */

export {
  // Configuration option types
  CacheOptions,
  AuditOptions,
  HierarchyOptions,
  PermissionOptions,
  MultiTenancyOptions,
  PerformanceOptions,
  ValidationOptions,
  RBACEngineOptions,
  ResolvedRBACEngineOptions,

  // Default option values
  DEFAULT_CACHE_OPTIONS,
  DEFAULT_AUDIT_OPTIONS,
  DEFAULT_HIERARCHY_OPTIONS,
  DEFAULT_PERMISSION_OPTIONS,
  DEFAULT_MULTI_TENANCY_OPTIONS,
  DEFAULT_PERFORMANCE_OPTIONS,
  DEFAULT_VALIDATION_OPTIONS,

  // Utility functions
  mergeOptions,

  // Type aliases
  PermissionString,
  RoleName,
  UserId,
  OrganizationId,

  // Callback types
  PermissionCheckCallback,
  RoleChangeCallback,

  // Event hooks
  RBACEventHooks,
} from './options.types';
