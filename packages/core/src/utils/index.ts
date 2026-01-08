/**
 * @fileoverview
 * Central export file for all RBAC utility functions and classes.
 * Import from '@prodforcode/rbac-core' to access all utilities.
 *
 * @example
 * ```typescript
 * import {
 *   WildcardParser,
 *   PermissionMatcher,
 *   RoleHierarchyResolver,
 *   wildcardParser,
 *   permissionMatcher,
 *   hierarchyUtils
 * } from '@prodforcode/rbac-core';
 * ```
 */

// Wildcard parser
export {
  WildcardParser,
  ParsedPermission,
  WildcardMatchResult,
  wildcardParser,
} from './wildcard-parser';

// Permission matcher
export {
  PermissionMatcher,
  PermissionMatchContext,
  PermissionMatcherResult,
  permissionMatcher,
} from './permission-matcher';

// Role hierarchy
export {
  RoleHierarchyResolver,
  HierarchyResolutionResult,
  hierarchyUtils,
} from './role-hierarchy';
