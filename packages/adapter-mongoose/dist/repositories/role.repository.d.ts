import { Connection } from 'mongoose';
import { IRole, IPermission, ICreateRoleOptions, IUpdateRoleOptions, IQueryOptions, IPaginatedResult } from '@holocron/rbac-core';
export declare class RoleRepository {
    private readonly roleModel;
    private readonly rolePermissionModel;
    constructor(connection?: Connection);
    findById(id: string): Promise<IRole | null>;
    findByName(name: string, organizationId?: string | null): Promise<IRole | null>;
    findByIds(ids: string[]): Promise<IRole[]>;
    findAll(options?: IQueryOptions): Promise<IPaginatedResult<IRole>>;
    create(options: ICreateRoleOptions): Promise<IRole>;
    update(id: string, options: IUpdateRoleOptions): Promise<IRole | null>;
    delete(id: string): Promise<boolean>;
    findChildRoles(parentRoleId: string): Promise<IRole[]>;
    getPermissionsForRole(roleId: string): Promise<IPermission[]>;
    getPermissionsForRoles(roleIds: string[]): Promise<Map<string, IPermission[]>>;
    assignPermissions(roleId: string, permissionIds: string[]): Promise<void>;
    removePermissions(roleId: string, permissionIds: string[]): Promise<void>;
    getAncestorRoles(roleId: string, maxDepth?: number): Promise<IRole[]>;
    getDescendantRoles(roleId: string, maxDepth?: number): Promise<IRole[]>;
    private toRole;
}
//# sourceMappingURL=role.repository.d.ts.map