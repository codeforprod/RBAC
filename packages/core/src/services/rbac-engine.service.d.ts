import { IPermission } from '../interfaces/permission.interface';
import { IRole, ICreateRoleOptions, IUpdateRoleOptions } from '../interfaces/role.interface';
import { IRBACAdapter } from '../interfaces/adapter.interface';
import { IRBACCache } from '../interfaces/cache.interface';
import { IAuditLogger } from '../interfaces/audit.interface';
import {
  IUserRoleAssignment,
  ICreateUserRoleOptions,
  IUserAuthorizationContext,
  IDetailedPermissionCheckResult,
} from '../interfaces/user.interface';
import { RoleHierarchyResolver } from '../utils/role-hierarchy';
import {
  RBACEngineOptions,
  ResolvedRBACEngineOptions,
  RBACEventHooks,
} from '../types/options.types';
export declare class RBACEngine {
  private readonly adapter;
  private readonly cache;
  private readonly auditLogger;
  private readonly options;
  private readonly keyGenerator;
  private readonly hierarchyResolver;
  private readonly permissionChecker;
  private eventHooks;
  private initialized;
  private constructor();
  static create(options: RBACEngineOptions): Promise<RBACEngine>;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  can(
    userId: string,
    permission: string,
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<boolean>;
  authorize(
    userId: string,
    permission: string,
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<void>;
  canAny(
    userId: string,
    permissions: string[],
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<boolean>;
  canAll(
    userId: string,
    permissions: string[],
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<boolean>;
  checkDetailed(
    userId: string,
    permission: string,
    context?: Partial<IUserAuthorizationContext>,
  ): Promise<IDetailedPermissionCheckResult>;
  getEffectivePermissions(userId: string, organizationId?: string | null): Promise<IPermission[]>;
  createRole(options: ICreateRoleOptions, actorId?: string): Promise<IRole>;
  updateRole(roleId: string, options: IUpdateRoleOptions, actorId?: string): Promise<IRole>;
  deleteRole(roleId: string, actorId?: string): Promise<boolean>;
  getRole(roleId: string): Promise<IRole | null>;
  getRoleByName(name: string, organizationId?: string | null): Promise<IRole | null>;
  addPermissionsToRole(roleId: string, permissionIds: string[], actorId?: string): Promise<void>;
  removePermissionsFromRole(
    roleId: string,
    permissionIds: string[],
    actorId?: string,
  ): Promise<void>;
  assignRole(options: ICreateUserRoleOptions): Promise<IUserRoleAssignment>;
  removeRole(
    userId: string,
    roleId: string,
    actorId?: string,
    organizationId?: string | null,
  ): Promise<boolean>;
  getUserRoles(userId: string, organizationId?: string | null): Promise<IUserRoleAssignment[]>;
  hasRole(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;
  invalidateUserCache(userId: string, organizationId?: string | null): Promise<void>;
  invalidateRoleCache(roleId: string): Promise<void>;
  clearAllCaches(): Promise<void>;
  registerHooks(hooks: RBACEventHooks): void;
  healthCheck(): Promise<{
    healthy: boolean;
    details: Record<string, boolean>;
  }>;
  getAdapter(): IRBACAdapter;
  getCache(): IRBACCache;
  getAuditLogger(): IAuditLogger;
  getHierarchyResolver(): RoleHierarchyResolver;
  isInitialized(): boolean;
  getOptions(): ResolvedRBACEngineOptions;
}
//# sourceMappingURL=rbac-engine.service.d.ts.map
