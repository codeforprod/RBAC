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
export { RBACEngine } from './rbac-engine.service';
export { PermissionChecker, PermissionCheckerOptions, } from './permission-checker.service';
export { InMemoryAuditLogger, ContextualAuditLogger, createAuditLogger, } from './audit-logger.service';
//# sourceMappingURL=index.d.ts.map