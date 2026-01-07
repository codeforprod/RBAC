"use strict";
/**
 * @fileoverview
 * Central export file for all RBAC error classes.
 * Import from '@holocron/rbac-core' to access all errors.
 *
 * @example
 * ```typescript
 * import {
 *   RBACError,
 *   RBACErrorCode,
 *   PermissionDeniedError,
 *   RoleNotFoundError,
 *   CircularHierarchyError
 * } from '@holocron/rbac-core';
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircularHierarchyError = exports.RoleNotFoundError = exports.PermissionDeniedError = exports.RBACErrorCode = exports.RBACError = void 0;
// Base error class and error codes
var rbac_error_1 = require("./rbac.error");
Object.defineProperty(exports, "RBACError", { enumerable: true, get: function () { return rbac_error_1.RBACError; } });
Object.defineProperty(exports, "RBACErrorCode", { enumerable: true, get: function () { return rbac_error_1.RBACErrorCode; } });
// Permission denied error
var permission_denied_error_1 = require("./permission-denied.error");
Object.defineProperty(exports, "PermissionDeniedError", { enumerable: true, get: function () { return permission_denied_error_1.PermissionDeniedError; } });
// Role not found error
var role_not_found_error_1 = require("./role-not-found.error");
Object.defineProperty(exports, "RoleNotFoundError", { enumerable: true, get: function () { return role_not_found_error_1.RoleNotFoundError; } });
// Circular hierarchy error
var circular_hierarchy_error_1 = require("./circular-hierarchy.error");
Object.defineProperty(exports, "CircularHierarchyError", { enumerable: true, get: function () { return circular_hierarchy_error_1.CircularHierarchyError; } });
//# sourceMappingURL=index.js.map