import { Schema, Document, Model, Types } from 'mongoose';

/**
 * Mongoose document interface for Permission.
 */
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

/**
 * Permission schema for MongoDB.
 * Represents a permission that can be granted to roles.
 *
 * Permissions follow the format: resource:action or resource:action:scope
 * Examples: "users:read", "posts:delete", "settings:update:system"
 */
export const PermissionSchema = new Schema<PermissionDocument>(
  {
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
      type: Schema.Types.Mixed,
      default: undefined,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'rbac_permissions',
  }
);

/**
 * Compound index for unique permission identification.
 * A permission is unique by its resource + action + scope combination.
 */
PermissionSchema.index(
  { resource: 1, action: 1, scope: 1 },
  { unique: true, name: 'permission_unique_idx' }
);

/**
 * Index for efficient text search on description.
 */
PermissionSchema.index(
  { description: 'text' },
  { name: 'permission_description_text_idx' }
);

/**
 * Virtual property to get permission string format.
 */
PermissionSchema.virtual('permissionString').get(function (this: PermissionDocument) {
  if (this.scope) {
    return `${this.resource}:${this.action}:${this.scope}`;
  }
  return `${this.resource}:${this.action}`;
});

/**
 * Transform for JSON serialization.
 */
PermissionSchema.set('toJSON', {
  virtuals: true,
  transform: ((_doc: any, ret: Record<string, unknown>) => {
    ret.id = (ret._id as Types.ObjectId).toString();
    delete (ret as { _id?: unknown })._id;
    delete (ret as { __v?: unknown }).__v;
    return ret;
  }) as any,
});

/**
 * Transform for object serialization.
 */
PermissionSchema.set('toObject', {
  virtuals: true,
  transform: ((_doc: any, ret: Record<string, unknown>) => {
    ret.id = (ret._id as Types.ObjectId).toString();
    delete (ret as { _id?: unknown })._id;
    delete (ret as { __v?: unknown }).__v;
    return ret;
  }) as any,
});

/**
 * Permission model type.
 */
export type PermissionModel = Model<PermissionDocument>;

/**
 * Create Permission model.
 * This function creates the model lazily to support different connection instances.
 */
export function createPermissionModel(
  connection?: typeof import('mongoose')
): PermissionModel {
  const mongoose = connection ?? require('mongoose');
  if (mongoose.models.Permission) {
    return mongoose.models.Permission as PermissionModel;
  }
  return mongoose.model('Permission', PermissionSchema, 'rbac_permissions') as PermissionModel;
}
