/**
 * @fileoverview Type definitions for the @holocron/rbac-nestjs package.
 *
 * This module exports all TypeScript types, interfaces, and enums used
 * throughout the NestJS RBAC integration.
 *
 * @packageDocumentation
 */

export {
  // Module options
  RbacModuleOptions,
  RbacModuleAsyncOptions,
  RbacOptionsFactory,
  // User extraction
  IUserExtractionStrategy,
  AuthorizationFailureHandler,
  // Metadata keys
  RBAC_METADATA,
  // Enums
  PermissionCheckMode,
  // Authorizer types
  CustomAuthorizer,
  PermissionMetadata,
  RoleMetadata,
} from './module-options.types';
