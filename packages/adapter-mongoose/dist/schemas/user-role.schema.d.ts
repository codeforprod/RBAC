import { Schema, Document, Model, Types } from 'mongoose';
export interface UserRoleDocument extends Document {
    _id: Types.ObjectId;
    userId: string;
    roleId: Types.ObjectId;
    organizationId?: string | null;
    assignedBy?: string;
    assignedAt: Date;
    expiresAt?: Date | null;
    isActive: boolean;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export declare const UserRoleSchema: Schema<UserRoleDocument, Model<UserRoleDocument, any, any, any, Document<unknown, any, UserRoleDocument, any, {}> & UserRoleDocument & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, UserRoleDocument, Document<unknown, {}, import("mongoose").FlatRecord<UserRoleDocument>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<UserRoleDocument> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
export type UserRoleModel = Model<UserRoleDocument>;
export declare function createUserRoleModel(connection?: typeof import('mongoose')): UserRoleModel;
//# sourceMappingURL=user-role.schema.d.ts.map