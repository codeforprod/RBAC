import { IPermission } from '../interfaces/permission.interface';
import { IRole } from '../interfaces/role.interface';
import { IRBACAdapter } from '../interfaces/adapter.interface';
import { IRBACCache, ICacheKeyGenerator } from '../interfaces/cache.interface';
import { IUserAuthorizationContext, IDetailedPermissionCheckResult, ICheckPermissionOptions } from '../interfaces/user.interface';
import { RoleHierarchyResolver } from '../utils/role-hierarchy';
import { PermissionOptions, CacheOptions } from '../types/options.types';
export interface PermissionCheckerOptions {
    permissionOptions?: Partial<PermissionOptions>;
    cacheOptions?: Partial<CacheOptions>;
    throwOnDenied?: boolean;
    cacheKeyGenerator?: ICacheKeyGenerator;
}
export declare class PermissionChecker {
    private readonly adapter;
    private readonly hierarchyResolver;
    private readonly cache?;
    private readonly matcher;
    private readonly keyGenerator;
    private readonly options;
    private readonly cacheOptions;
    constructor(adapter: IRBACAdapter, hierarchyResolver: RoleHierarchyResolver, cache?: IRBACCache, options?: PermissionCheckerOptions);
    hasPermission(userId: string, permission: string, context?: Partial<IUserAuthorizationContext>): Promise<boolean>;
    hasAnyPermission(userId: string, permissions: string[], context?: Partial<IUserAuthorizationContext>): Promise<boolean>;
    hasAllPermissions(userId: string, permissions: string[], context?: Partial<IUserAuthorizationContext>): Promise<boolean>;
    checkPermissionDetailed(options: ICheckPermissionOptions): Promise<IDetailedPermissionCheckResult>;
    getUserEffectivePermissions(userId: string, organizationId?: string | null, skipCache?: boolean): Promise<{
        permissions: IPermission[];
        roles: IRole[];
        fromCache: boolean;
    }>;
    invalidateUserCache(userId: string, organizationId?: string | null): Promise<void>;
    private check;
    private findRoleWithPermission;
}
//# sourceMappingURL=permission-checker.service.d.ts.map