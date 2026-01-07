import { Schema, Document, Model, Types } from 'mongoose';
export interface RoleDocument extends Document {
    _id: Types.ObjectId;
    name: string;
    displayName?: string;
    description?: string;
    parentRoles: Types.ObjectId[];
    isSystem: boolean;
    isActive: boolean;
    organizationId?: string | null;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export declare const RoleSchema: Schema<RoleDocument, Model<RoleDocument, any, any, any, Document<unknown, any, RoleDocument, any, {}> & RoleDocument & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, RoleDocument, Document<unknown, {}, import("mongoose").FlatRecord<RoleDocument>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<RoleDocument> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
export type RoleModel = Model<RoleDocument>;
export declare function createRoleModel(connection?: typeof import('mongoose')): RoleModel;
//# sourceMappingURL=role.schema.d.ts.map