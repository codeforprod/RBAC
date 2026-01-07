"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.hierarchyUtils = exports.RoleHierarchyResolver = exports.permissionMatcher = exports.PermissionMatcher = exports.wildcardParser = exports.WildcardParser = void 0;
// Wildcard parser
var wildcard_parser_1 = require("./wildcard-parser");
Object.defineProperty(exports, "WildcardParser", { enumerable: true, get: function () { return wildcard_parser_1.WildcardParser; } });
Object.defineProperty(exports, "wildcardParser", { enumerable: true, get: function () { return wildcard_parser_1.wildcardParser; } });
// Permission matcher
var permission_matcher_1 = require("./permission-matcher");
Object.defineProperty(exports, "PermissionMatcher", { enumerable: true, get: function () { return permission_matcher_1.PermissionMatcher; } });
Object.defineProperty(exports, "permissionMatcher", { enumerable: true, get: function () { return permission_matcher_1.permissionMatcher; } });
// Role hierarchy
var role_hierarchy_1 = require("./role-hierarchy");
Object.defineProperty(exports, "RoleHierarchyResolver", { enumerable: true, get: function () { return role_hierarchy_1.RoleHierarchyResolver; } });
Object.defineProperty(exports, "hierarchyUtils", { enumerable: true, get: function () { return role_hierarchy_1.hierarchyUtils; } });
//# sourceMappingURL=index.js.map