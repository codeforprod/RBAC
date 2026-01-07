import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { RBACEngine, IRole, IPermission, IUserRoleAssignment, ICreateRoleOptions, IUpdateRoleOptions, ICreateUserRoleOptions, IUserAuthorizationContext, IDetailedPermissionCheckResult } from '@holocron/rbac-core';
import type { RbacModuleOptions } from '../types/module-options.types';
export declare class RBACNestService implements OnModuleInit, OnModuleDestroy {
    private readonly options;
    private readonly logger;
    private engine;
    constructor(options: RbacModuleOptions);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    getEngine(): RBACEngine;
    can(userId: string, permission: string, context?: Partial<IUserAuthorizationContext>): Promise<boolean>;
    authorize(userId: string, permission: string, context?: Partial<IUserAuthorizationContext>): Promise<void>;
    canAny(userId: string, permissions: string[], context?: Partial<IUserAuthorizationContext>): Promise<boolean>;
    canAll(userId: string, permissions: string[], context?: Partial<IUserAuthorizationContext>): Promise<boolean>;
    checkDetailed(userId: string, permission: string, context?: Partial<IUserAuthorizationContext>): Promise<IDetailedPermissionCheckResult>;
    getEffectivePermissions(userId: string, organizationId?: string | null): Promise<IPermission[]>;
    createRole(options: ICreateRoleOptions, actorId?: string): Promise<IRole>;
    updateRole(roleId: string, options: IUpdateRoleOptions, actorId?: string): Promise<IRole>;
    deleteRole(roleId: string, actorId?: string): Promise<boolean>;
    getRole(roleId: string): Promise<IRole | null>;
    getRoleByName(name: string, organizationId?: string | null): Promise<IRole | null>;
    addPermissionsToRole(roleId: string, permissionIds: string[], actorId?: string): Promise<void>;
    removePermissionsFromRole(roleId: string, permissionIds: string[], actorId?: string): Promise<void>;
    assignRole(options: ICreateUserRoleOptions): Promise<IUserRoleAssignment>;
    removeRole(userId: string, roleId: string, actorId?: string, organizationId?: string | null): Promise<boolean>;
    getUserRoles(userId: string, organizationId?: string | null): Promise<IUserRoleAssignment[]>;
    hasRole(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;
    invalidateUserCache(userId: string, organizationId?: string | null): Promise<void>;
    invalidateRoleCache(roleId: string): Promise<void>;
    clearAllCaches(): Promise<void>;
    healthCheck(): Promise<{
        healthy: boolean;
        details: Record<string, boolean>;
    }>;
    isInitialized(): boolean;
}
//# sourceMappingURL=rbac-nest.service.d.ts.map