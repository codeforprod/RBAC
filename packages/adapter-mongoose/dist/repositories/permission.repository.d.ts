import { Connection } from 'mongoose';
import { IPermission, IQueryOptions, IPaginatedResult } from '@holocron/rbac-core';
export declare class PermissionRepository {
    private readonly model;
    constructor(connection?: Connection);
    findById(id: string): Promise<IPermission | null>;
    findByResourceAction(resource: string, action: string, scope?: string): Promise<IPermission | null>;
    findByIds(ids: string[]): Promise<IPermission[]>;
    findAll(options?: IQueryOptions): Promise<IPaginatedResult<IPermission>>;
    create(permission: Omit<IPermission, 'id' | 'createdAt'>): Promise<IPermission>;
    update(id: string, updates: Partial<IPermission>): Promise<IPermission | null>;
    delete(id: string): Promise<boolean>;
    bulkCreate(permissions: Array<Omit<IPermission, 'id' | 'createdAt'>>): Promise<IPermission[]>;
    search(query: string, options?: IQueryOptions): Promise<IPaginatedResult<IPermission>>;
    private toPermission;
}
//# sourceMappingURL=permission.repository.d.ts.map