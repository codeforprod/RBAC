import { Schema, Document, Model, Types } from 'mongoose';

/**
 * Mongoose document interface for Role.
 */
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

/**
 * Role schema for MongoDB.
 * Represents a role that can be assigned to users.
 * Roles group permissions together and can inherit from parent roles.
 */
export const RoleSchema = new Schema<RoleDocument>(
  {
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
        type: Schema.Types.ObjectId,
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
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    timestamps: true,
    collection: 'rbac_roles',
  },
);

/**
 * Compound index for unique role name within organization.
 * Global roles (organizationId = null) and org-specific roles are separate.
 */
RoleSchema.index(
  { name: 1, organizationId: 1 },
  { unique: true, name: 'role_name_org_unique_idx' },
);

/**
 * Index for finding roles by parent for hierarchy queries.
 */
RoleSchema.index({ parentRoles: 1 }, { name: 'role_parent_roles_idx' });

/**
 * Index for finding active roles within an organization.
 */
RoleSchema.index({ organizationId: 1, isActive: 1 }, { name: 'role_org_active_idx' });

/**
 * Text index for searching roles.
 */
RoleSchema.index(
  { name: 'text', displayName: 'text', description: 'text' },
  { name: 'role_text_search_idx' },
);

/**
 * Pre-save validation to prevent circular dependencies in role hierarchy.
 */
RoleSchema.pre('save', async function (next) {
  const doc = this as RoleDocument;
  if (!doc.isModified('parentRoles') || doc.parentRoles.length === 0) {
    return next();
  }

  const visited = new Set<string>();
  const checkCircular = async (roleId: Types.ObjectId): Promise<boolean> => {
    const roleIdStr = roleId.toString();

    if (roleIdStr === doc._id.toString()) {
      return true; // Circular dependency detected
    }

    if (visited.has(roleIdStr)) {
      return false; // Already checked this path
    }

    visited.add(roleIdStr);

    const role = (await doc.model('Role').findById(roleId).select('parentRoles').lean()) as {
      parentRoles?: Types.ObjectId[];
    } | null;
    if (!role || !role.parentRoles || role.parentRoles.length === 0) {
      return false;
    }

    for (const parentId of role.parentRoles) {
      if (await checkCircular(parentId)) {
        return true;
      }
    }

    return false;
  };

  for (const parentId of doc.parentRoles) {
    if (await checkCircular(parentId)) {
      return next(new Error('Circular dependency detected in role hierarchy'));
    }
  }

  next();
});

/**
 * Transform for JSON serialization.
 */
RoleSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: any) => {
    ret.id = ret._id.toString();
    ret.parentRoles = ret.parentRoles?.map((id: Types.ObjectId) => id.toString()) ?? [];
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

/**
 * Transform for object serialization.
 */
RoleSchema.set('toObject', {
  virtuals: true,
  transform: (_doc, ret: any) => {
    ret.id = ret._id.toString();
    ret.parentRoles = ret.parentRoles?.map((id: Types.ObjectId) => id.toString()) ?? [];
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

/**
 * Role model type.
 */
export type RoleModel = Model<RoleDocument>;

/**
 * Create Role model.
 * This function creates the model lazily to support different connection instances.
 */
export function createRoleModel(connection?: typeof import('mongoose')): RoleModel {
  const mongoose = connection ?? require('mongoose');
  if (mongoose.models.Role) {
    return mongoose.models.Role as RoleModel;
  }
  return mongoose.model('Role', RoleSchema, 'rbac_roles') as RoleModel;
}
