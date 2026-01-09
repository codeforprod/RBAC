/**
 * @fileoverview
 * Central export file for all RBAC error classes.
 * Import from '@prodforcode/rbac-core' to access all errors.
 *
 * @example
 * ```typescript
 * import {
 *   RBACError,
 *   RBACErrorCode,
 *   PermissionDeniedError,
 *   RoleNotFoundError,
 *   CircularHierarchyError
 * } from '@prodforcode/rbac-core';
 *
 * // Check error types
 * if (RBACError.isRBACError(error)) {
 *   switch (error.code) {
 *     case RBACErrorCode.PERMISSION_DENIED:
 *       // Handle permission denied
 *       break;
 *     case RBACErrorCode.ROLE_NOT_FOUND:
 *       // Handle role not found
 *       break;
 *     case RBACErrorCode.CIRCULAR_HIERARCHY:
 *       // Handle circular hierarchy
 *       break;
 *   }
 * }
 * ```
 */

// Base error class and error codes
export { RBACError, RBACErrorCode, RBACErrorContext } from './rbac.error';

// Permission denied error
export { PermissionDeniedError, PermissionDeniedContext } from './permission-denied.error';

// Role not found error
export { RoleNotFoundError, RoleNotFoundContext } from './role-not-found.error';

// Circular hierarchy error
export { CircularHierarchyError, CircularHierarchyContext } from './circular-hierarchy.error';
