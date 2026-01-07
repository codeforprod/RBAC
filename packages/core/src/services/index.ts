/**
 * @fileoverview
 * Central export file for all RBAC services.
 * Import from '@callairis/rbac-core' to access all services.
 *
 * @example
 * ```typescript
 * import {
 *   RBACEngine,
 *   PermissionChecker,
 *   InMemoryAuditLogger,
 *   ContextualAuditLogger,
 *   createAuditLogger
 * } from '@callairis/rbac-core';
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

// RBAC Engine - Main entry point
export { RBACEngine } from './rbac-engine.service';

// Permission Checker
export {
  PermissionChecker,
  PermissionCheckerOptions,
} from './permission-checker.service';

// Audit Logger
export {
  InMemoryAuditLogger,
  ContextualAuditLogger,
  createAuditLogger,
} from './audit-logger.service';
