import { Schema, Document, Model, Types } from 'mongoose';

/**
 * Mongoose document interface for UserRole.
 */
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

/**
 * UserRole schema for MongoDB.
 * Represents user-role assignments with optional time constraints.
 * Supports both permanent and temporary role assignments.
 */
export const UserRoleSchema = new Schema<UserRoleDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    roleId: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    timestamps: true,
    collection: 'rbac_user_roles',
  }
);

/**
 * Compound unique index to prevent duplicate assignments.
 * A user can have the same role only once per organization.
 */
UserRoleSchema.index(
  { userId: 1, roleId: 1, organizationId: 1 },
  { unique: true, name: 'user_role_unique_idx' }
);

/**
 * Index for finding all roles for a user within an organization.
 */
UserRoleSchema.index(
  { userId: 1, organizationId: 1, isActive: 1 },
  { name: 'user_org_active_roles_idx' }
);

/**
 * Index for finding all users with a specific role.
 */
UserRoleSchema.index(
  { roleId: 1, isActive: 1 },
  { name: 'role_active_users_idx' }
);

/**
 * Index for cleaning up expired assignments.
 */
UserRoleSchema.index(
  { expiresAt: 1, isActive: 1 },
  {
    name: 'expired_assignments_idx',
    partialFilterExpression: { expiresAt: { $ne: null }, isActive: true },
  }
);

/**
 * Transform for JSON serialization.
 */
UserRoleSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: any) => {
    ret.id = ret._id.toString();
    ret.roleId = ret.roleId.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

/**
 * Transform for object serialization.
 */
UserRoleSchema.set('toObject', {
  virtuals: true,
  transform: (_doc, ret: any) => {
    ret.id = ret._id.toString();
    ret.roleId = ret.roleId.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

/**
 * Instance method to check if assignment is expired.
 */
UserRoleSchema.methods.isExpired = function (): boolean {
  if (!this.expiresAt) {
    return false;
  }
  return new Date() > this.expiresAt;
};

/**
 * Instance method to check if assignment is currently valid.
 */
UserRoleSchema.methods.isValid = function (): boolean {
  return this.isActive && !this.isExpired();
};

/**
 * UserRole model type.
 */
export type UserRoleModel = Model<UserRoleDocument>;

/**
 * Create UserRole model.
 * This function creates the model lazily to support different connection instances.
 */
export function createUserRoleModel(
  connection?: typeof import('mongoose')
): UserRoleModel {
  const mongoose = connection ?? require('mongoose');
  if (mongoose.models.UserRole) {
    return mongoose.models.UserRole as UserRoleModel;
  }
  return mongoose.model(UserRoleDocument, 'UserRole', UserRoleSchema);
}
