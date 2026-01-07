/**
 * @fileoverview RBAC Providers for NestJS
 *
 * This module exports all dependency injection providers and tokens
 * for the NestJS RBAC integration.
 *
 * @packageDocumentation
 */

export {
  // Injection tokens
  RBAC_OPTIONS_TOKEN,
  RBAC_ENGINE_TOKEN,
  USER_EXTRACTION_STRATEGY_TOKEN,
  // Provider factories
  createRbacProviders,
  createRbacAsyncProviders,
  // Default implementations
  DefaultUserExtractionStrategy,
} from './rbac-options.provider';
