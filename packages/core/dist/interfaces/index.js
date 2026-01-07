"use strict";
/**
 * @fileoverview
 * Central export file for all RBAC core interfaces.
 * Import from '@holocron/rbac-core' to access all interfaces.
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
 * } from '@holocron/rbac-core';
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoOpAuditLogger = exports.AuditSeverity = exports.AuditAction = exports.InMemoryCache = exports.DefaultCacheKeyGenerator = void 0;
// Cache interfaces
var cache_interface_1 = require("./cache.interface");
Object.defineProperty(exports, "DefaultCacheKeyGenerator", { enumerable: true, get: function () { return cache_interface_1.DefaultCacheKeyGenerator; } });
Object.defineProperty(exports, "InMemoryCache", { enumerable: true, get: function () { return cache_interface_1.InMemoryCache; } });
// Audit interfaces
var audit_interface_1 = require("./audit.interface");
Object.defineProperty(exports, "AuditAction", { enumerable: true, get: function () { return audit_interface_1.AuditAction; } });
Object.defineProperty(exports, "AuditSeverity", { enumerable: true, get: function () { return audit_interface_1.AuditSeverity; } });
Object.defineProperty(exports, "NoOpAuditLogger", { enumerable: true, get: function () { return audit_interface_1.NoOpAuditLogger; } });
//# sourceMappingURL=index.js.map