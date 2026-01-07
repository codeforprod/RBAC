import { IPermission } from './permission.interface';
import { IRole, ICreateRoleOptions, IUpdateRoleOptions } from './role.interface';
import { IUserRoleAssignment, ICreateUserRoleOptions } from './user.interface';
export interface IQueryOptions {
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    organizationId?: string | null;
    includeInactive?: boolean;
}
export interface IPaginatedResult<T> {
    data: T[];
    total: number;
    count: number;
    offset: number;
    hasMore: boolean;
}
export interface ITransactionContext {
    id: string;
    isActive: boolean;
    handle?: unknown;
}
export interface IRBACAdapter {
    findRoleById(id: string): Promise<IRole | null>;
    findRoleByName(name: string, organizationId?: string | null): Promise<IRole | null>;
    findRolesByIds(ids: string[]): Promise<IRole[]>;
    findAllRoles(options?: IQueryOptions): Promise<IPaginatedResult<IRole>>;
    createRole(options: ICreateRoleOptions): Promise<IRole>;
    updateRole(id: string, options: IUpdateRoleOptions): Promise<IRole>;
    deleteRole(id: string): Promise<boolean>;
    findChildRoles(parentRoleId: string): Promise<IRole[]>;
    findPermissionById(id: string): Promise<IPermission | null>;
    findPermissionByResourceAction(resource: string, action: string, scope?: string): Promise<IPermission | null>;
    findPermissionsByIds(ids: string[]): Promise<IPermission[]>;
    findAllPermissions(options?: IQueryOptions): Promise<IPaginatedResult<IPermission>>;
    createPermission(permission: Omit<IPermission, 'id' | 'createdAt'>): Promise<IPermission>;
    updatePermission(id: string, updates: Partial<IPermission>): Promise<IPermission>;
    deletePermission(id: string): Promise<boolean>;
    findPermissionsByRoleId(roleId: string): Promise<IPermission[]>;
    assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void>;
    removePermissionsFromRole(roleId: string, permissionIds: string[]): Promise<void>;
    findUserRoleAssignments(userId: string, organizationId?: string | null): Promise<IUserRoleAssignment[]>;
    findUsersByRoleId(roleId: string, options?: IQueryOptions): Promise<IPaginatedResult<IUserRoleAssignment>>;
    assignRoleToUser(options: ICreateUserRoleOptions): Promise<IUserRoleAssignment>;
    removeRoleFromUser(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;
    userHasRole(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;
    beginTransaction?(): Promise<ITransactionContext>;
    commitTransaction?(context: ITransactionContext): Promise<void>;
    rollbackTransaction?(context: ITransactionContext): Promise<void>;
    initialize?(): Promise<void>;
    shutdown?(): Promise<void>;
    healthCheck?(): Promise<boolean>;
}
export type IRBACAdapterFactory = () => IRBACAdapter | Promise<IRBACAdapter>;
//# sourceMappingURL=adapter.interface.d.ts.map