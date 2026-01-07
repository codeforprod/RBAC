import { Schema, Document, Model, Types } from 'mongoose';

/**
 * Mongoose document interface for RolePermission.
 * Junction collection linking roles to permissions.
 */
export interface RolePermissionDocument extends Document {
  _id: Types.ObjectId;
  roleId: Types.ObjectId;
  permissionId: Types.ObjectId;
  grantedAt: Date;
  grantedBy?: string;
  metadata?: Record<string, unknown>;
}

/**
 * RolePermission schema for MongoDB.
 * Links roles to their assigned permissions.
 *
 * This is a separate collection (rather than embedded) to support:
 * - Efficient permission queries across many roles
 * - Large numbers of permissions per role
 * - Audit trail of permission assignments
 */
export const RolePermissionSchema = new Schema<RolePermissionDocument>(
  {
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
      index: true,
    },
    permissionId: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    timestamps: false,
    collection: 'rbac_role_permissions',
  }
);

/**
 * Compound unique index to prevent duplicate assignments.
 */
RolePermissionSchema.index(
  { roleId: 1, permissionId: 1 },
  { unique: true, name: 'role_permission_unique_idx' }
);

/**
 * Index for efficient lookups of all permissions for a role.
 */
RolePermissionSchema.index(
  { roleId: 1 },
  { name: 'role_permission_role_idx' }
);

/**
 * Index for efficient lookups of all roles with a permission.
 */
RolePermissionSchema.index(
  { permissionId: 1 },
  { name: 'role_permission_permission_idx' }
);

/**
 * Transform for JSON serialization.
 */
RolePermissionSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: any) => {
    ret.id = ret._id.toString();
    ret.roleId = ret.roleId.toString();
    ret.permissionId = ret.permissionId.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

/**
 * Transform for object serialization.
 */
RolePermissionSchema.set('toObject', {
  virtuals: true,
  transform: (_doc, ret: any) => {
    ret.id = ret._id.toString();
    ret.roleId = ret.roleId.toString();
    ret.permissionId = ret.permissionId.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

/**
 * RolePermission model type.
 */
export type RolePermissionModel = Model<RolePermissionDocument>;

/**
 * Create RolePermission model.
 * This function creates the model lazily to support different connection instances.
 */
export function createRolePermissionModel(
  connection?: typeof import('mongoose')
): RolePermissionModel {
  const mongoose = connection ?? require('mongoose');
  if (mongoose.models.RolePermission) {
    return mongoose.models.RolePermission as RolePermissionModel;
  }
  return mongoose.model(RolePermissionDocument, 'RolePermission', RolePermissionSchema);
}
