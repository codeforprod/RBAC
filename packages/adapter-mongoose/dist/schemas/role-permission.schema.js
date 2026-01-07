"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolePermissionSchema = void 0;
exports.createRolePermissionModel = createRolePermissionModel;
const mongoose_1 = require("mongoose");
exports.RolePermissionSchema = new mongoose_1.Schema({
    roleId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Role',
        required: true,
        index: true,
    },
    permissionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Permission',
        required: true,
        index: true,
    },
    grantedAt: {
        type: Date,
        default: () => new Date(),
    },
    grantedBy: {
        type: String,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: undefined,
    },
}, {
    timestamps: false,
    collection: 'rbac_role_permissions',
});
exports.RolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true, name: 'role_permission_unique_idx' });
exports.RolePermissionSchema.index({ roleId: 1 }, { name: 'role_permission_role_idx' });
exports.RolePermissionSchema.index({ permissionId: 1 }, { name: 'role_permission_permission_idx' });
exports.RolePermissionSchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.roleId = ret.roleId.toString();
        ret.permissionId = ret.permissionId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});
exports.RolePermissionSchema.set('toObject', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        ret.roleId = ret.roleId.toString();
        ret.permissionId = ret.permissionId.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    },
});
function createRolePermissionModel(connection) {
    const mongoose = connection ?? require('mongoose');
    if (mongoose.models.RolePermission) {
        return mongoose.models.RolePermission;
    }
    return (0, mongoose_1.model)('RolePermission', exports.RolePermissionSchema);
}
//# sourceMappingURL=role-permission.schema.js.map