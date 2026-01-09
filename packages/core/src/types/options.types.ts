import { IRBACAdapter } from '../interfaces/adapter.interface';
import { IRBACCache } from '../interfaces/cache.interface';
import { IAuditLogger } from '../interfaces/audit.interface';

/**
 * Cache configuration options for the RBAC engine.
 */
export interface CacheOptions {
  /** Whether caching is enabled (default: true) */
  enabled: boolean;

  /** Default TTL for cached items in seconds (default: 3600) */
  defaultTtl: number;

  /** TTL for user permissions cache in seconds (default: 300) */
  userPermissionsTtl: number;

  /** TTL for role hierarchy cache in seconds (default: 3600) */
  roleHierarchyTtl: number;

  /** TTL for role permissions cache in seconds (default: 1800) */
  rolePermissionsTtl: number;

  /** Key prefix for all RBAC cache keys (default: 'rbac') */
  keyPrefix: string;

  /** Key separator (default: ':') */
  keySeparator: string;
}

/**
 * Audit logging configuration options.
 */
export interface AuditOptions {
  /** Whether audit logging is enabled (default: true) */
  enabled: boolean;

  /** Log successful permission checks (default: false - can be verbose) */
  logSuccessfulChecks: boolean;

  /** Log permission denied events (default: true) */
  logDeniedChecks: boolean;

  /** Log role assignment/removal events (default: true) */
  logRoleChanges: boolean;

  /** Log permission changes (default: true) */
  logPermissionChanges: boolean;

  /** Log cache invalidation events (default: false) */
  logCacheInvalidation: boolean;

  /** Include detailed context in audit entries (default: true) */
  includeContext: boolean;

  /** Include IP address in audit entries when available (default: true) */
  includeIpAddress: boolean;

  /** Include user agent in audit entries when available (default: false) */
  includeUserAgent: boolean;
}

/**
 * Role hierarchy configuration options.
 */
export interface HierarchyOptions {
  /** Maximum depth for role hierarchy traversal (default: 10) */
  maxDepth: number;

  /** Whether to cache hierarchy calculations (default: true) */
  cacheHierarchy: boolean;

  /** Whether to detect circular dependencies on role creation/update (default: true) */
  detectCircularDependencies: boolean;

  /** Whether to allow a role to inherit from multiple parents (default: true) */
  allowMultipleParents: boolean;
}

/**
 * Permission matching configuration options.
 */
export interface PermissionOptions {
  /** Separator between permission parts (default: ':') */
  separator: string;

  /** Single-level wildcard character (default: '*') */
  wildcardChar: string;

  /** Multi-level (globstar) wildcard (default: '**') */
  globstarChar: string;

  /** Whether permission matching is case-sensitive (default: false) */
  caseSensitive: boolean;

  /** Whether to allow scope in permissions (default: true) */
  allowScope: boolean;

  /** Default scope when not specified (default: undefined - no scope) */
  defaultScope?: string;
}

/**
 * Multi-tenancy configuration options.
 */
export interface MultiTenancyOptions {
  /** Whether multi-tenancy is enabled (default: false) */
  enabled: boolean;

  /** Field name for organization/tenant ID (default: 'organizationId') */
  tenantIdField: string;

  /** Whether to allow global roles (not tied to any tenant) (default: true) */
  allowGlobalRoles: boolean;

  /** Whether to allow cross-tenant role inheritance (default: false) */
  allowCrossTenantInheritance: boolean;
}

/**
 * Performance and optimization options.
 */
export interface PerformanceOptions {
  /** Maximum number of permissions to load in a single query (default: 1000) */
  maxPermissionsPerQuery: number;

  /** Maximum number of roles to load in a single query (default: 100) */
  maxRolesPerQuery: number;

  /** Batch size for bulk operations (default: 100) */
  batchSize: number;

  /** Whether to use parallel permission checks (default: true) */
  parallelPermissionChecks: boolean;

  /** Connection timeout in milliseconds (default: 5000) */
  connectionTimeout: number;

  /** Query timeout in milliseconds (default: 10000) */
  queryTimeout: number;
}

/**
 * Validation options for RBAC operations.
 */
export interface ValidationOptions {
  /** Minimum role name length (default: 2) */
  minRoleNameLength: number;

  /** Maximum role name length (default: 64) */
  maxRoleNameLength: number;

  /** Allowed characters pattern for role names (default: /^[a-z0-9_-]+$/i) */
  roleNamePattern: RegExp;

  /** Minimum permission length (default: 3) */
  minPermissionLength: number;

  /** Maximum permission length (default: 128) */
  maxPermissionLength: number;

  /** Whether to validate permissions format (default: true) */
  validatePermissionFormat: boolean;
}

/**
 * Complete RBAC engine configuration options.
 */
export interface RBACEngineOptions {
  /** Database adapter (required) */
  adapter: IRBACAdapter;

  /** Cache implementation (optional - defaults to in-memory cache) */
  cache?: IRBACCache;

  /** Audit logger implementation (optional - defaults to no-op logger) */
  auditLogger?: IAuditLogger;

  /** Cache configuration */
  cacheOptions?: Partial<CacheOptions>;

  /** Audit configuration */
  auditOptions?: Partial<AuditOptions>;

  /** Hierarchy configuration */
  hierarchyOptions?: Partial<HierarchyOptions>;

  /** Permission configuration */
  permissionOptions?: Partial<PermissionOptions>;

  /** Multi-tenancy configuration */
  multiTenancyOptions?: Partial<MultiTenancyOptions>;

  /** Performance configuration */
  performanceOptions?: Partial<PerformanceOptions>;

  /** Validation configuration */
  validationOptions?: Partial<ValidationOptions>;

  /** Whether to initialize the adapter on engine creation (default: true) */
  autoInitialize?: boolean;

  /** Whether to run in strict mode (throws on invalid operations) (default: true) */
  strictMode?: boolean;

  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Default cache options.
 */
export const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  enabled: true,
  defaultTtl: 3600, // 1 hour
  userPermissionsTtl: 300, // 5 minutes
  roleHierarchyTtl: 3600, // 1 hour
  rolePermissionsTtl: 1800, // 30 minutes
  keyPrefix: 'rbac',
  keySeparator: ':',
};

/**
 * Default audit options.
 */
export const DEFAULT_AUDIT_OPTIONS: AuditOptions = {
  enabled: true,
  logSuccessfulChecks: false,
  logDeniedChecks: true,
  logRoleChanges: true,
  logPermissionChanges: true,
  logCacheInvalidation: false,
  includeContext: true,
  includeIpAddress: true,
  includeUserAgent: false,
};

/**
 * Default hierarchy options.
 */
export const DEFAULT_HIERARCHY_OPTIONS: HierarchyOptions = {
  maxDepth: 10,
  cacheHierarchy: true,
  detectCircularDependencies: true,
  allowMultipleParents: true,
};

/**
 * Default permission options.
 */
export const DEFAULT_PERMISSION_OPTIONS: PermissionOptions = {
  separator: ':',
  wildcardChar: '*',
  globstarChar: '**',
  caseSensitive: false,
  allowScope: true,
  defaultScope: undefined,
};

/**
 * Default multi-tenancy options.
 */
export const DEFAULT_MULTI_TENANCY_OPTIONS: MultiTenancyOptions = {
  enabled: false,
  tenantIdField: 'organizationId',
  allowGlobalRoles: true,
  allowCrossTenantInheritance: false,
};

/**
 * Default performance options.
 */
export const DEFAULT_PERFORMANCE_OPTIONS: PerformanceOptions = {
  maxPermissionsPerQuery: 1000,
  maxRolesPerQuery: 100,
  batchSize: 100,
  parallelPermissionChecks: true,
  connectionTimeout: 5000,
  queryTimeout: 10000,
};

/**
 * Default validation options.
 */
export const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  minRoleNameLength: 2,
  maxRoleNameLength: 64,
  roleNamePattern: /^[a-z0-9_-]+$/i,
  minPermissionLength: 3,
  maxPermissionLength: 128,
  validatePermissionFormat: true,
};

/**
 * Merge user options with defaults.
 *
 * @param options - User-provided options
 * @returns Complete options with defaults applied
 *
 * @example
 * ```typescript
 * const options = mergeOptions({
 *   adapter: myAdapter,
 *   cacheOptions: { defaultTtl: 7200 }
 * });
 * ```
 */
export function mergeOptions(
  options: RBACEngineOptions,
): Required<Omit<RBACEngineOptions, 'adapter' | 'cache' | 'auditLogger'>> &
  Pick<RBACEngineOptions, 'adapter' | 'cache' | 'auditLogger'> {
  return {
    adapter: options.adapter,
    cache: options.cache,
    auditLogger: options.auditLogger,
    cacheOptions: { ...DEFAULT_CACHE_OPTIONS, ...options.cacheOptions },
    auditOptions: { ...DEFAULT_AUDIT_OPTIONS, ...options.auditOptions },
    hierarchyOptions: { ...DEFAULT_HIERARCHY_OPTIONS, ...options.hierarchyOptions },
    permissionOptions: { ...DEFAULT_PERMISSION_OPTIONS, ...options.permissionOptions },
    multiTenancyOptions: { ...DEFAULT_MULTI_TENANCY_OPTIONS, ...options.multiTenancyOptions },
    performanceOptions: { ...DEFAULT_PERFORMANCE_OPTIONS, ...options.performanceOptions },
    validationOptions: { ...DEFAULT_VALIDATION_OPTIONS, ...options.validationOptions },
    autoInitialize: options.autoInitialize ?? true,
    strictMode: options.strictMode ?? true,
    debug: options.debug ?? false,
  };
}

/**
 * Type for resolved options (all fields present).
 */
export type ResolvedRBACEngineOptions = ReturnType<typeof mergeOptions>;

/**
 * Permission string format: "resource:action" or "resource:action:scope"
 *
 * @example
 * - "users:read" - Read users
 * - "posts:delete:own" - Delete own posts
 * - "admin:*" - All admin actions (wildcard)
 * - "**" - Super admin (all permissions)
 */
export type PermissionString = string;

/**
 * Role name type for type safety.
 */
export type RoleName = string;

/**
 * User ID type for type safety.
 */
export type UserId = string;

/**
 * Organization/Tenant ID type for type safety.
 */
export type OrganizationId = string | null;

/**
 * Callback for permission check events.
 */
export type PermissionCheckCallback = (
  userId: UserId,
  permission: PermissionString,
  allowed: boolean,
  context?: Record<string, unknown>,
) => void | Promise<void>;

/**
 * Callback for role change events.
 */
export type RoleChangeCallback = (
  event: 'assigned' | 'removed' | 'expired',
  userId: UserId,
  roleId: string,
  context?: Record<string, unknown>,
) => void | Promise<void>;

/**
 * Event hooks for RBAC operations.
 */
export interface RBACEventHooks {
  /** Called before a permission check */
  beforePermissionCheck?: (userId: UserId, permission: PermissionString) => void | Promise<void>;

  /** Called after a permission check */
  afterPermissionCheck?: PermissionCheckCallback;

  /** Called when a role is assigned */
  onRoleAssigned?: RoleChangeCallback;

  /** Called when a role is removed */
  onRoleRemoved?: RoleChangeCallback;

  /** Called when a role expires */
  onRoleExpired?: RoleChangeCallback;

  /** Called when cache is invalidated */
  onCacheInvalidated?: (keys: string[]) => void | Promise<void>;

  /** Called on any error */
  onError?: (error: Error, context?: Record<string, unknown>) => void | Promise<void>;
}
