"use strict";
/**
 * @fileoverview
 * Central export file for all RBAC services.
 * Import from '@holocron/rbac-core' to access all services.
 *
 * @example
 * ```typescript
 * import {
 *   RBACEngine,
 *   PermissionChecker,
 *   InMemoryAuditLogger,
 *   ContextualAuditLogger,
 *   createAuditLogger
 * } from '@holocron/rbac-core';
 *
 * // Create engine with full configuration
 * const engine = await RBACEngine.create({
 *   adapter: myAdapter,
 *   cache: myCache,
 *   auditLogger: new InMemoryAuditLogger()
 * });
 *
 * // Check permissions
 * const canEdit = await engine.can('user-123', 'posts:update');
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditLogger = exports.ContextualAuditLogger = exports.InMemoryAuditLogger = exports.PermissionChecker = exports.RBACEngine = void 0;
// RBAC Engine - Main entry point
var rbac_engine_service_1 = require("./rbac-engine.service");
Object.defineProperty(exports, "RBACEngine", { enumerable: true, get: function () { return rbac_engine_service_1.RBACEngine; } });
// Permission Checker
var permission_checker_service_1 = require("./permission-checker.service");
Object.defineProperty(exports, "PermissionChecker", { enumerable: true, get: function () { return permission_checker_service_1.PermissionChecker; } });
// Audit Logger
var audit_logger_service_1 = require("./audit-logger.service");
Object.defineProperty(exports, "InMemoryAuditLogger", { enumerable: true, get: function () { return audit_logger_service_1.InMemoryAuditLogger; } });
Object.defineProperty(exports, "ContextualAuditLogger", { enumerable: true, get: function () { return audit_logger_service_1.ContextualAuditLogger; } });
Object.defineProperty(exports, "createAuditLogger", { enumerable: true, get: function () { return audit_logger_service_1.createAuditLogger; } });
//# sourceMappingURL=index.js.map