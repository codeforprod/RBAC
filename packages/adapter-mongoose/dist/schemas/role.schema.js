"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleSchema = void 0;
exports.createRoleModel = createRoleModel;
const mongoose_1 = require("mongoose");
exports.RoleSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    displayName: {
        type: String,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    parentRoles: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Role',
        },
    ],
    isSystem: {
        type: Boolean,
        default: false,
        index: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    organizationId: {
        type: String,
        default: null,
        index: true,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: undefined,
    },
}, {
    timestamps: true,
    collection: 'rbac_roles',
});
exports.RoleSchema.index({ name: 1, organizationId: 1 }, { unique: true, name: 'role_name_org_unique_idx' });
exports.RoleSchema.index({ parentRoles: 1 }, { name: 'role_parent_roles_idx' });
exports.RoleSchema.index({ organizationId: 1, isActive: 1 }, { name: 'role_org_active_idx' });
exports.RoleSchema.index({ name: 'text', displayName: 'text', description: 'text' }, { name: 'role_text_search_idx' });
exports.RoleSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.parentRoles = ret.parentRoles?.map((id) => id.toString()) ?? [];
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});
exports.RoleSchema.set('toObject', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.parentRoles = ret.parentRoles?.map((id) => id.toString()) ?? [];
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});
function createRoleModel(connection) {
    const mongoose = connection ?? require('mongoose');
    if (mongoose.models.Role) {
        return mongoose.models.Role;
    }
    return (0, mongoose_1.model)('Role', exports.RoleSchema);
}
//# sourceMappingURL=role.schema.js.map