import { Schema, Document, Model, Types } from 'mongoose';
export interface PermissionDocument extends Document {
    _id: Types.ObjectId;
    resource: string;
    action: string;
    scope?: string;
    conditions?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PermissionSchema: Schema<PermissionDocument, Model<PermissionDocument, any, any, any, Document<unknown, any, PermissionDocument, any, {}> & PermissionDocument & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PermissionDocument, Document<unknown, {}, import("mongoose").FlatRecord<PermissionDocument>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<PermissionDocument> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
export type PermissionModel = Model<PermissionDocument>;
export declare function createPermissionModel(connection?: typeof import('mongoose')): PermissionModel;
//# sourceMappingURL=permission.schema.d.ts.map