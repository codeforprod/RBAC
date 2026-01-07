"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeOptions = exports.DEFAULT_VALIDATION_OPTIONS = exports.DEFAULT_PERFORMANCE_OPTIONS = exports.DEFAULT_MULTI_TENANCY_OPTIONS = exports.DEFAULT_PERMISSION_OPTIONS = exports.DEFAULT_HIERARCHY_OPTIONS = exports.DEFAULT_AUDIT_OPTIONS = exports.DEFAULT_CACHE_OPTIONS = void 0;
var options_types_1 = require("./options.types");
// Default option values
Object.defineProperty(exports, "DEFAULT_CACHE_OPTIONS", { enumerable: true, get: function () { return options_types_1.DEFAULT_CACHE_OPTIONS; } });
Object.defineProperty(exports, "DEFAULT_AUDIT_OPTIONS", { enumerable: true, get: function () { return options_types_1.DEFAULT_AUDIT_OPTIONS; } });
Object.defineProperty(exports, "DEFAULT_HIERARCHY_OPTIONS", { enumerable: true, get: function () { return options_types_1.DEFAULT_HIERARCHY_OPTIONS; } });
Object.defineProperty(exports, "DEFAULT_PERMISSION_OPTIONS", { enumerable: true, get: function () { return options_types_1.DEFAULT_PERMISSION_OPTIONS; } });
Object.defineProperty(exports, "DEFAULT_MULTI_TENANCY_OPTIONS", { enumerable: true, get: function () { return options_types_1.DEFAULT_MULTI_TENANCY_OPTIONS; } });
Object.defineProperty(exports, "DEFAULT_PERFORMANCE_OPTIONS", { enumerable: true, get: function () { return options_types_1.DEFAULT_PERFORMANCE_OPTIONS; } });
Object.defineProperty(exports, "DEFAULT_VALIDATION_OPTIONS", { enumerable: true, get: function () { return options_types_1.DEFAULT_VALIDATION_OPTIONS; } });
// Utility functions
Object.defineProperty(exports, "mergeOptions", { enumerable: true, get: function () { return options_types_1.mergeOptions; } });
//# sourceMappingURL=index.js.map