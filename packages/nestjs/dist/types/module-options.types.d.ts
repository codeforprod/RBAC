import { ModuleMetadata, Type } from '@nestjs/common';
import { IRBACAdapter, IRBACCache, IAuditLogger, CacheOptions, AuditOptions, HierarchyOptions, PermissionOptions, MultiTenancyOptions, PerformanceOptions, ValidationOptions } from '@holocron/rbac-core';
export interface IUserExtractionStrategy {
    extractUserId(context: unknown): string | null | Promise<string | null>;
    extractOrganizationId?(context: unknown): string | null | Promise<string | null>;
    extractContext?(context: unknown): Record<string, unknown> | Promise<Record<string, unknown>>;
}
export type AuthorizationFailureHandler = (userId: string | null, permission: string, context: Record<string, unknown>) => void | Promise<void>;
export interface RbacModuleOptions {
    adapter: IRBACAdapter;
    cache?: IRBACCache;
    auditLogger?: IAuditLogger;
    userExtractionStrategy?: IUserExtractionStrategy;
    defaultRole?: string;
    throwOnDenied?: boolean;
    global?: boolean;
    onAuthorizationFailure?: AuthorizationFailureHandler;
    cacheOptions?: Partial<CacheOptions>;
    auditOptions?: Partial<AuditOptions>;
    hierarchyOptions?: Partial<HierarchyOptions>;
    permissionOptions?: Partial<PermissionOptions>;
    multiTenancyOptions?: Partial<MultiTenancyOptions>;
    performanceOptions?: Partial<PerformanceOptions>;
    validationOptions?: Partial<ValidationOptions>;
    autoInitialize?: boolean;
    debug?: boolean;
}
export interface RbacOptionsFactory {
    createRbacOptions(): Promise<RbacModuleOptions> | RbacModuleOptions;
}
export interface RbacModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    inject?: unknown[];
    useFactory?: (...args: unknown[]) => Promise<RbacModuleOptions> | RbacModuleOptions;
    useClass?: Type<RbacOptionsFactory>;
    useExisting?: Type<RbacOptionsFactory>;
    isGlobal?: boolean;
}
export declare const RBAC_METADATA: {
    readonly PERMISSIONS: "rbac:permissions";
    readonly ROLES: "rbac:roles";
    readonly CHECK_MODE: "rbac:check_mode";
    readonly IS_PUBLIC: "rbac:is_public";
    readonly SKIP_RBAC: "rbac:skip";
    readonly CUSTOM_AUTHORIZER: "rbac:custom_authorizer";
    readonly RESOURCE_TYPE: "rbac:resource_type";
    readonly OWNER_PARAM: "rbac:owner_param";
};
export declare enum PermissionCheckMode {
    ALL = "all",
    ANY = "any"
}
export type CustomAuthorizer = (userId: string, context: Record<string, unknown>) => boolean | Promise<boolean>;
export interface PermissionMetadata {
    permissions: string[];
    mode: PermissionCheckMode;
}
export interface RoleMetadata {
    roles: string[];
    mode: PermissionCheckMode;
}
//# sourceMappingURL=module-options.types.d.ts.map