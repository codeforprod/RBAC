import { Connection } from 'mongoose';
import { IUserRoleAssignment, ICreateUserRoleOptions, IQueryOptions, IPaginatedResult, IRole } from '@holocron/rbac-core';
export declare class UserRoleRepository {
    private readonly userRoleModel;
    private readonly roleModel;
    private readonly rolePermissionModel;
    constructor(connection?: Connection);
    findByUserId(userId: string, organizationId?: string | null): Promise<IUserRoleAssignment[]>;
    findByRoleId(roleId: string, options?: IQueryOptions): Promise<IPaginatedResult<IUserRoleAssignment>>;
    create(options: ICreateUserRoleOptions): Promise<IUserRoleAssignment>;
    delete(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;
    userHasRole(userId: string, roleId: string, organizationId?: string | null): Promise<boolean>;
    deactivateExpired(): Promise<number>;
    getEffectiveRoles(userId: string, organizationId?: string | null): Promise<IRole[]>;
    private getRolesWithPermissions;
    private getPermissionsForRoles;
    private toUserRoleAssignment;
}
//# sourceMappingURL=user-role.repository.d.ts.map