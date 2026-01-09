import { IRole } from './role.interface';
import { IPermission } from './permission.interface';
export interface IUserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  role?: IRole;
  organizationId?: string | null;
  assignedBy?: string;
  assignedAt: Date;
  expiresAt?: Date | null;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}
export interface ICreateUserRoleOptions {
  userId: string;
  roleId: string;
  organizationId?: string | null;
  assignedBy?: string;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}
export interface IRBACUser {
  id: string;
  roleAssignments?: IUserRoleAssignment[];
  effectivePermissions?: IPermission[];
  organizationId?: string | null;
}
export interface IUserAuthorizationContext {
  userId: string;
  organizationId?: string | null;
  resource?: string;
  resourceId?: string;
  resourceOwnerId?: string;
  attributes?: Record<string, unknown>;
  ipAddress?: string;
  requestId?: string;
}
export interface IUserPermissionResult {
  userId: string;
  organizationId?: string | null;
  permissions: IPermission[];
  roles: IRole[];
  computedAt: Date;
  fromCache: boolean;
}
export interface IUserRoleService {
  getUserRoleAssignments(
    userId: string,
    organizationId?: string | null,
  ): Promise<IUserRoleAssignment[]>;
  getUserRoles(userId: string, organizationId?: string | null): Promise<IRole[]>;
  getUserEffectivePermissions(
    userId: string,
    organizationId?: string | null,
  ): Promise<IUserPermissionResult>;
  assignRole(options: ICreateUserRoleOptions): Promise<IUserRoleAssignment>;
  removeRole(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;
  hasRole(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;
  hasAnyRole(userId: string, roleIds: string[], organizationId?: string | null): Promise<boolean>;
  hasAllRoles(userId: string, roleIds: string[], organizationId?: string | null): Promise<boolean>;
  hasPermission(
    userId: string,
    permission: string,
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<boolean>;
  hasAnyPermission(
    userId: string,
    permissions: string[],
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<boolean>;
  hasAllPermissions(
    userId: string,
    permissions: string[],
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<boolean>;
  cleanupExpiredAssignments(): Promise<number>;
  invalidateUserCache(userId: string, organizationId?: string | null): Promise<void>;
}
export interface ICheckPermissionOptions {
  userId: string;
  permission: string;
  context?: Partial<IUserAuthorizationContext>;
  detailed?: boolean;
  skipCache?: boolean;
}
export interface IDetailedPermissionCheckResult {
  allowed: boolean;
  requestedPermission: string;
  matchedPermission?: string;
  grantedByRole?: IRole;
  deniedReason?: string;
  checkedRoles: IRole[];
  context?: IUserAuthorizationContext;
  checkDuration: number;
  fromCache: boolean;
}
//# sourceMappingURL=user.interface.d.ts.map
