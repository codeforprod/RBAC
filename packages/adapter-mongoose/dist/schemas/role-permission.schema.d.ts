import { Schema, Document, Model, Types } from 'mongoose';
export interface RolePermissionDocument extends Document {
    _id: Types.ObjectId;
    roleId: Types.ObjectId;
    permissionId: Types.ObjectId;
    grantedAt: Date;
    grantedBy?: string;
    metadata?: Record<string, unknown>;
}
export declare const RolePermissionSchema: Schema<RolePermissionDocument, Model<RolePermissionDocument, any, any, any, Document<unknown, any, RolePermissionDocument, any, {}> & RolePermissionDocument & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RolePermissionDocument, Document<unknown, {}, import("mongoose").FlatRecord<RolePermissionDocument>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<RolePermissionDocument> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
export type RolePermissionModel = Model<RolePermissionDocument>;
export declare function createRolePermissionModel(connection?: typeof import('mongoose')): RolePermissionModel;
//# sourceMappingURL=role-permission.schema.d.ts.map