"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionSchema = void 0;
exports.createPermissionModel = createPermissionModel;
const mongoose_1 = require("mongoose");
exports.PermissionSchema = new mongoose_1.Schema({
    resource: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    action: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    scope: {
        type: String,
        trim: true,
        index: true,
    },
    conditions: {
        type: mongoose_1.Schema.Types.Mixed,
        default: undefined,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: undefined,
    },
    description: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
    collection: 'rbac_permissions',
});
exports.PermissionSchema.index({ resource: 1, action: 1, scope: 1 }, { unique: true, name: 'permission_unique_idx' });
exports.PermissionSchema.index({ description: 'text' }, { name: 'permission_description_text_idx' });
exports.PermissionSchema.virtual('permissionString').get(function () {
    if (this.scope) {
        return `${this.resource}:${this.action}:${this.scope}`;
    }
    return `${this.resource}:${this.action}`;
});
exports.PermissionSchema.set('toJSON', {
    virtuals: true,
    transform: ((_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }),
});
exports.PermissionSchema.set('toObject', {
    virtuals: true,
    transform: ((_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }),
});
function createPermissionModel(connection) {
    const mongoose = connection ?? require('mongoose');
    if (mongoose.models.Permission) {
        return mongoose.models.Permission;
    }
    return (0, mongoose_1.model)('Permission', exports.PermissionSchema);
}
//# sourceMappingURL=permission.schema.js.map