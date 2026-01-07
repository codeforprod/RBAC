/**
 * @fileoverview
 * Central export file for all RBAC utility functions and classes.
 * Import from '@holocron/rbac-core' to access all utilities.
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
 * } from '@holocron/rbac-core';
 * ```
 */
export { WildcardParser, ParsedPermission, WildcardMatchResult, wildcardParser, } from './wildcard-parser';
export { PermissionMatcher, PermissionMatchContext, PermissionMatcherResult, permissionMatcher, } from './permission-matcher';
export { RoleHierarchyResolver, HierarchyResolutionResult, hierarchyUtils, } from './role-hierarchy';
//# sourceMappingURL=index.d.ts.map