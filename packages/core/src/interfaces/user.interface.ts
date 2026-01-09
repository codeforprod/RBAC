import { IRole } from './role.interface';
import { IPermission } from './permission.interface';

/**
 * Represents a user-role assignment with optional time constraints.
 * Supports both permanent and temporary role assignments.
 */
export interface IUserRoleAssignment {
  /** Unique identifier for the assignment */
  id: string;

  /** ID of the user */
  userId: string;

  /** ID of the assigned role */
  roleId: string;

  /** The assigned role (populated on fetch) */
  role?: IRole;

  /** Organization ID for multi-tenant scenarios (null for global assignments) */
  organizationId?: string | null;

  /** ID of the user who created this assignment */
  assignedBy?: string;

  /** Timestamp when the assignment was created */
  assignedAt: Date;

  /** Timestamp when the assignment expires (null for permanent assignments) */
  expiresAt?: Date | null;

  /** Whether the assignment is currently active */
  isActive: boolean;

  /** Additional metadata for the assignment */
  metadata?: Record<string, unknown>;
}

/**
 * Options for creating a user-role assignment.
 */
export interface ICreateUserRoleOptions {
  /** ID of the user to assign the role to */
  userId: string;

  /** ID of the role to assign */
  roleId: string;

  /** Organization ID for multi-tenant scenarios */
  organizationId?: string | null;

  /** ID of the user making the assignment */
  assignedBy?: string;

  /** When the assignment should expire (null for permanent) */
  expiresAt?: Date | null;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Represents a user with their RBAC-related information.
 * This is a minimal interface - your actual user model will have more properties.
 */
export interface IRBACUser {
  /** Unique identifier for the user */
  id: string;

  /** User's role assignments */
  roleAssignments?: IUserRoleAssignment[];

  /** Computed effective permissions (from all active roles) */
  effectivePermissions?: IPermission[];

  /** Organization ID for the current context (multi-tenant) */
  organizationId?: string | null;
}

/**
 * Context object for user authorization checks.
 * Contains all information needed to evaluate permissions.
 */
export interface IUserAuthorizationContext {
  /** User ID */
  userId: string;

  /** Organization ID for multi-tenant scenarios */
  organizationId?: string | null;

  /** Resource being accessed */
  resource?: string;

  /** Resource instance ID (for object-level permissions) */
  resourceId?: string;

  /** The owner ID of the resource (for "own" scope checks) */
  resourceOwnerId?: string;

  /** Additional context for ABAC conditions */
  attributes?: Record<string, unknown>;

  /** IP address of the request */
  ipAddress?: string;

  /** Request ID for correlation */
  requestId?: string;
}

/**
 * Result of checking a user's effective permissions.
 */
export interface IUserPermissionResult {
  /** User ID */
  userId: string;

  /** Organization ID */
  organizationId?: string | null;

  /** All effective permissions (direct + inherited) */
  permissions: IPermission[];

  /** All active roles */
  roles: IRole[];

  /** When this result was computed */
  computedAt: Date;

  /** Whether results came from cache */
  fromCache: boolean;
}

/**
 * Service for managing user-role relationships and authorization.
 */
export interface IUserRoleService {
  /**
   * Get all role assignments for a user.
   *
   * @param userId - User ID
   * @param organizationId - Optional organization ID
   * @returns Array of active role assignments
   *
   * @example
   * ```typescript
   * const assignments = await userRoleService.getUserRoleAssignments('user-123');
   * for (const assignment of assignments) {
   *   console.log(`Role: ${assignment.role?.name}, Expires: ${assignment.expiresAt}`);
   * }
   * ```
   */
  getUserRoleAssignments(
    userId: string,
    organizationId?: string | null,
  ): Promise<IUserRoleAssignment[]>;

  /**
   * Get all roles for a user (convenience method).
   *
   * @param userId - User ID
   * @param organizationId - Optional organization ID
   * @returns Array of active roles
   */
  getUserRoles(userId: string, organizationId?: string | null): Promise<IRole[]>;

  /**
   * Get all effective permissions for a user.
   * This includes permissions from all assigned roles and their parent roles.
   *
   * @param userId - User ID
   * @param organizationId - Optional organization ID
   * @returns User permission result including all computed permissions
   *
   * @example
   * ```typescript
   * const result = await userRoleService.getUserEffectivePermissions('user-123');
   * console.log(`User has ${result.permissions.length} effective permissions`);
   * console.log(`Computed from ${result.roles.length} roles`);
   * ```
   */
  getUserEffectivePermissions(
    userId: string,
    organizationId?: string | null,
  ): Promise<IUserPermissionResult>;

  /**
   * Assign a role to a user.
   *
   * @param options - Assignment options
   * @returns The created assignment
   *
   * @example
   * ```typescript
   * const assignment = await userRoleService.assignRole({
   *   userId: 'user-123',
   *   roleId: 'editor-role-id',
   *   assignedBy: 'admin-user-id',
   *   expiresAt: new Date('2025-12-31') // Temporary assignment
   * });
   * ```
   */
  assignRole(options: ICreateUserRoleOptions): Promise<IUserRoleAssignment>;

  /**
   * Remove a role from a user.
   *
   * @param userId - User ID
   * @param roleId - Role ID
   * @param organizationId - Optional organization ID
   * @returns True if removed
   */
  removeRole(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;

  /**
   * Check if a user has a specific role.
   *
   * @param userId - User ID
   * @param roleId - Role ID
   * @param organizationId - Optional organization ID
   * @returns True if user has the role
   */
  hasRole(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;

  /**
   * Check if a user has any of the specified roles.
   *
   * @param userId - User ID
   * @param roleIds - Array of role IDs
   * @param organizationId - Optional organization ID
   * @returns True if user has any of the roles
   */
  hasAnyRole(userId: string, roleIds: string[], organizationId?: string | null): Promise<boolean>;

  /**
   * Check if a user has all of the specified roles.
   *
   * @param userId - User ID
   * @param roleIds - Array of role IDs
   * @param organizationId - Optional organization ID
   * @returns True if user has all roles
   */
  hasAllRoles(userId: string, roleIds: string[], organizationId?: string | null): Promise<boolean>;

  /**
   * Check if a user has a specific permission.
   *
   * @param userId - User ID
   * @param permission - Permission string (e.g., "users:read")
   * @param context - Optional authorization context
   * @returns True if user has the permission
   *
   * @example
   * ```typescript
   * const canRead = await userRoleService.hasPermission('user-123', 'users:read');
   * const canEditOwn = await userRoleService.hasPermission('user-123', 'posts:update:own', {
   *   resourceOwnerId: 'user-123' // Checking if user owns the resource
   * });
   * ```
   */
  hasPermission(
    userId: string,
    permission: string,
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<boolean>;

  /**
   * Check if a user has any of the specified permissions.
   *
   * @param userId - User ID
   * @param permissions - Array of permission strings
   * @param context - Optional authorization context
   * @returns True if user has any of the permissions
   */
  hasAnyPermission(
    userId: string,
    permissions: string[],
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<boolean>;

  /**
   * Check if a user has all of the specified permissions.
   *
   * @param userId - User ID
   * @param permissions - Array of permission strings
   * @param context - Optional authorization context
   * @returns True if user has all permissions
   */
  hasAllPermissions(
    userId: string,
    permissions: string[],
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<boolean>;

  /**
   * Clean up expired role assignments.
   * Should be called periodically by a scheduled job.
   *
   * @returns Number of expired assignments removed
   */
  cleanupExpiredAssignments(): Promise<number>;

  /**
   * Invalidate cached permissions for a user.
   * Call this when user's roles change.
   *
   * @param userId - User ID
   * @param organizationId - Optional organization ID
   */
  invalidateUserCache(userId: string, organizationId?: string | null): Promise<void>;
}

/**
 * Options for checking user permissions with detailed results.
 */
export interface ICheckPermissionOptions {
  /** User ID */
  userId: string;

  /** Permission to check (e.g., "users:read", "posts:update:own") */
  permission: string;

  /** Authorization context */
  context?: Partial<IUserAuthorizationContext>;

  /** Whether to include detailed matching information */
  detailed?: boolean;

  /** Whether to skip cache */
  skipCache?: boolean;
}

/**
 * Detailed result of a permission check.
 */
export interface IDetailedPermissionCheckResult {
  /** Whether permission was granted */
  allowed: boolean;

  /** The permission that was checked */
  requestedPermission: string;

  /** If allowed, the permission that matched (may differ due to wildcards) */
  matchedPermission?: string;

  /** If allowed, the role that provided the permission */
  grantedByRole?: IRole;

  /** If denied, the reason */
  deniedReason?: string;

  /** All roles that were checked */
  checkedRoles: IRole[];

  /** Authorization context used */
  context?: IUserAuthorizationContext;

  /** Time taken for the check (ms) */
  checkDuration: number;

  /** Whether result came from cache */
  fromCache: boolean;
}
