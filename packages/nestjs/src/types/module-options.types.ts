import { ModuleMetadata, Type } from '@nestjs/common';
import {
  IRBACAdapter,
  IRBACCache,
  IAuditLogger,
  CacheOptions,
  AuditOptions,
  HierarchyOptions,
  PermissionOptions,
  MultiTenancyOptions,
  PerformanceOptions,
  ValidationOptions,
} from '@prodforcode/rbac-core';

/**
 * User extraction strategy for obtaining the current user from the request context.
 * Implement this interface to customize how the user is extracted from different
 * request types (HTTP, GraphQL, WebSocket).
 */
export interface IUserExtractionStrategy {
  /**
   * Extract user ID from the execution context.
   *
   * @param context - NestJS execution context or request object
   * @returns User ID or null if not authenticated
   */
  extractUserId(context: unknown): string | null | Promise<string | null>;

  /**
   * Extract organization ID from the execution context (for multi-tenancy).
   *
   * @param context - NestJS execution context or request object
   * @returns Organization ID or null
   */
  extractOrganizationId?(context: unknown): string | null | Promise<string | null>;

  /**
   * Extract additional context for authorization decisions.
   *
   * @param context - NestJS execution context or request object
   * @returns Additional context object
   */
  extractContext?(context: unknown): Record<string, unknown> | Promise<Record<string, unknown>>;
}

/**
 * Callback type for handling authorization failures.
 */
export type AuthorizationFailureHandler = (
  userId: string | null,
  permission: string,
  context: Record<string, unknown>,
) => void | Promise<void>;

/**
 * Configuration options for the RBAC NestJS module.
 */
export interface RbacModuleOptions {
  /**
   * Database adapter for RBAC operations.
   * Required - must be provided either directly or via factory.
   */
  adapter: IRBACAdapter;

  /**
   * Cache implementation for RBAC data.
   * Optional - defaults to in-memory cache.
   */
  cache?: IRBACCache;

  /**
   * Audit logger implementation.
   * Optional - defaults to no-op logger.
   */
  auditLogger?: IAuditLogger;

  /**
   * User extraction strategy.
   * Optional - defaults to extracting user from request.user.id
   */
  userExtractionStrategy?: IUserExtractionStrategy;

  /**
   * Default role assigned to users without explicit roles.
   * Optional - if not set, users without roles have no permissions.
   */
  defaultRole?: string;

  /**
   * Whether to throw exceptions on permission denied.
   * If false, guards will return false instead of throwing.
   * Default: true
   */
  throwOnDenied?: boolean;

  /**
   * Whether RBAC should be globally applied.
   * If true, all endpoints require authentication unless marked with @Public().
   * Default: false
   */
  global?: boolean;

  /**
   * Custom handler for authorization failures.
   * Called when a permission check fails.
   */
  onAuthorizationFailure?: AuthorizationFailureHandler;

  /**
   * Cache configuration options.
   */
  cacheOptions?: Partial<CacheOptions>;

  /**
   * Audit logging configuration options.
   */
  auditOptions?: Partial<AuditOptions>;

  /**
   * Role hierarchy configuration options.
   */
  hierarchyOptions?: Partial<HierarchyOptions>;

  /**
   * Permission matching configuration options.
   */
  permissionOptions?: Partial<PermissionOptions>;

  /**
   * Multi-tenancy configuration options.
   */
  multiTenancyOptions?: Partial<MultiTenancyOptions>;

  /**
   * Performance configuration options.
   */
  performanceOptions?: Partial<PerformanceOptions>;

  /**
   * Validation configuration options.
   */
  validationOptions?: Partial<ValidationOptions>;

  /**
   * Whether to automatically initialize the RBAC engine.
   * Default: true
   */
  autoInitialize?: boolean;

  /**
   * Enable debug logging.
   * Default: false
   */
  debug?: boolean;
}

/**
 * Factory interface for creating RBAC module options.
 */
export interface RbacOptionsFactory {
  /**
   * Create RBAC module options.
   * Can return options directly or a Promise.
   */
  createRbacOptions(): Promise<RbacModuleOptions> | RbacModuleOptions;
}

/**
 * Async configuration options for RbacModule.forRootAsync().
 */
export interface RbacModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Injection tokens to be used by the module.
   */
  inject?: unknown[];

  /**
   * Factory function to create options.
   * Use this for complex async configuration.
   *
   * @example
   * ```typescript
   * RbacModule.forRootAsync({
   *   imports: [ConfigModule, TypeOrmModule],
   *   useFactory: async (config: ConfigService, dataSource: DataSource) => ({
   *     adapter: new TypeORMAdapter(dataSource),
   *     cache: new RedisCache(config.get('REDIS_URL')),
   *   }),
   *   inject: [ConfigService, DataSource],
   * })
   * ```
   */
  useFactory?: (...args: unknown[]) => Promise<RbacModuleOptions> | RbacModuleOptions;

  /**
   * Class that implements RbacOptionsFactory.
   * The class must implement createRbacOptions().
   *
   * @example
   * ```typescript
   * @Injectable()
   * class RbacConfigService implements RbacOptionsFactory {
   *   constructor(private config: ConfigService) {}
   *
   *   createRbacOptions(): RbacModuleOptions {
   *     return {
   *       adapter: new TypeORMAdapter(this.config.get('DATABASE')),
   *     };
   *   }
   * }
   *
   * RbacModule.forRootAsync({
   *   useClass: RbacConfigService,
   * })
   * ```
   */
  useClass?: Type<RbacOptionsFactory>;

  /**
   * Existing provider to use for options.
   *
   * @example
   * ```typescript
   * RbacModule.forRootAsync({
   *   imports: [ConfigModule],
   *   useExisting: RbacConfigService,
   * })
   * ```
   */
  useExisting?: Type<RbacOptionsFactory>;

  /**
   * Whether the module is global.
   * Default: false
   */
  isGlobal?: boolean;
}

/**
 * Metadata key for RBAC decorators.
 */
export const RBAC_METADATA = {
  /** Required permissions metadata key */
  PERMISSIONS: 'rbac:permissions',

  /** Required roles metadata key */
  ROLES: 'rbac:roles',

  /** Permission check mode (AND/OR) */
  CHECK_MODE: 'rbac:check_mode',

  /** Public endpoint marker */
  IS_PUBLIC: 'rbac:is_public',

  /** Skip RBAC entirely */
  SKIP_RBAC: 'rbac:skip',

  /** Custom authorization callback */
  CUSTOM_AUTHORIZER: 'rbac:custom_authorizer',

  /** Resource type for context */
  RESOURCE_TYPE: 'rbac:resource_type',

  /** Owner parameter name */
  OWNER_PARAM: 'rbac:owner_param',
} as const;

/**
 * Permission check modes for decorators that accept multiple permissions.
 */
export enum PermissionCheckMode {
  /** User must have ALL specified permissions (AND logic) */
  ALL = 'all',

  /** User must have ANY of the specified permissions (OR logic) */
  ANY = 'any',
}

/**
 * Custom authorizer function type.
 * Use this for complex authorization logic that cannot be expressed with simple permissions.
 */
export type CustomAuthorizer = (
  userId: string,
  context: Record<string, unknown>,
) => boolean | Promise<boolean>;

/**
 * Decorator metadata for permission requirements.
 */
export interface PermissionMetadata {
  /** Required permissions */
  permissions: string[];

  /** Check mode (AND/OR) */
  mode: PermissionCheckMode;
}

/**
 * Decorator metadata for role requirements.
 */
export interface RoleMetadata {
  /** Required roles */
  roles: string[];

  /** Check mode (AND/OR) */
  mode: PermissionCheckMode;
}
