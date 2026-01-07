"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoleSchema = void 0;
exports.createUserRoleModel = createUserRoleModel;
const mongoose_1 = require("mongoose");
exports.UserRoleSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    roleId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Role',
        required: true,
        index: true,
    },
    organizationId: {
        type: String,
        default: null,
        index: true,
    },
    assignedBy: {
        type: String,
    },
    assignedAt: {
        type: Date,
        default: () => new Date(),
    },
    expiresAt: {
        type: Date,
        default: null,
        index: true,
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: undefined,
    },
}, {
    timestamps: true,
    collection: 'rbac_user_roles',
});
exports.UserRoleSchema.index({ userId: 1, roleId: 1, organizationId: 1 }, { unique: true, name: 'user_role_unique_idx' });
exports.UserRoleSchema.index({ userId: 1, organizationId: 1, isActive: 1 }, { name: 'user_org_active_roles_idx' });
exports.UserRoleSchema.index({ roleId: 1, isActive: 1 }, { name: 'role_active_users_idx' });
exports.UserRoleSchema.index({ expiresAt: 1, isActive: 1 }, {
    name: 'expired_assignments_idx',
    partialFilterExpression: { expiresAt: { $ne: null }, isActive: true },
});
exports.UserRoleSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.roleId = ret.roleId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});
exports.UserRoleSchema.set('toObject', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.roleId = ret.roleId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});
exports.UserRoleSchema.methods.isExpired = function () {
    if (!this.expiresAt) {
        return false;
    }
    return new Date() > this.expiresAt;
};
exports.UserRoleSchema.methods.isValid = function () {
    return this.isActive && !this.isExpired();
};
function createUserRoleModel(connection) {
    const mongoose = connection ?? require('mongoose');
    if (mongoose.models.UserRole) {
        return mongoose.models.UserRole;
    }
    return (0, mongoose_1.model)('UserRole', exports.UserRoleSchema);
}
//# sourceMappingURL=user-role.schema.js.map