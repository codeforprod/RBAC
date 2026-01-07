import { Types, FilterQuery, Connection, PipelineStage } from 'mongoose';
import {
  IUserRoleAssignment,
  ICreateUserRoleOptions,
  IQueryOptions,
  IPaginatedResult,
  IRole,
  IPermission,
} from '@callairis/rbac-core';
import { UserRoleModel, UserRoleDocument, createUserRoleModel } from '../schemas/user-role.schema';
import { createRoleModel, RoleModel } from '../schemas/role.schema';
import { createRolePermissionModel, RolePermissionModel } from '../schemas/role-permission.schema';

/**
 * Repository for UserRole data access operations.
 * Provides pure data access methods for user-role assignments.
 */
export class UserRoleRepository {
  private readonly userRoleModel: UserRoleModel;
  private readonly roleModel: RoleModel;
  private readonly rolePermissionModel: RolePermissionModel;

  constructor(connection?: Connection) {
    const conn = connection as unknown as typeof import('mongoose');
    this.userRoleModel = createUserRoleModel(conn);
    this.roleModel = createRoleModel(conn);
    this.rolePermissionModel = createRolePermissionModel(conn);
  }

  /**
   * Find all role assignments for a user.
   */
  async findByUserId(
    userId: string,
    organizationId?: string | null
  ): Promise<IUserRoleAssignment[]> {
    const filter: FilterQuery<UserRoleDocument> = {
      userId,
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    };

    if (organizationId !== undefined) {
      filter.organizationId = organizationId;
    }

    const docs = await this.userRoleModel.find(filter).lean().exec();

    // Get role data for all assignments
    const roleIds = docs.map((doc) => doc.roleId);
    const roles = await this.getRolesWithPermissions(roleIds);

    return docs.map((doc) => this.toUserRoleAssignment(doc, roles.get(doc.roleId.toString())));
  }

  /**
   * Find all users with a specific role.
   */
  async findByRoleId(
    roleId: string,
    options?: IQueryOptions
  ): Promise<IPaginatedResult<IUserRoleAssignment>> {
    if (!Types.ObjectId.isValid(roleId)) {
      return {
        data: [],
        total: 0,
        count: 0,
        offset: 0,
        hasMore: false,
      };
    }

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const filter: FilterQuery<UserRoleDocument> = {
      roleId: new Types.ObjectId(roleId),
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    };

    if (options?.organizationId !== undefined) {
      filter.organizationId = options.organizationId;
    }

    const [docs, total] = await Promise.all([
      this.userRoleModel
        .find(filter)
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      this.userRoleModel.countDocuments(filter).exec(),
    ]);

    // Get role data
    const roles = await this.getRolesWithPermissions([new Types.ObjectId(roleId)]);

    return {
      data: docs.map((doc) => this.toUserRoleAssignment(doc, roles.get(roleId))),
      total,
      count: docs.length,
      offset,
      hasMore: offset + docs.length < total,
    };
  }

  /**
   * Create a new user-role assignment.
   */
  async create(options: ICreateUserRoleOptions): Promise<IUserRoleAssignment> {
    const doc = await this.userRoleModel.create({
      userId: options.userId,
      roleId: new Types.ObjectId(options.roleId),
      organizationId: options.organizationId ?? null,
      assignedBy: options.assignedBy,
      assignedAt: new Date(),
      expiresAt: options.expiresAt ?? null,
      isActive: true,
      metadata: options.metadata,
    });

    // Get role data
    const roles = await this.getRolesWithPermissions([doc.roleId]);

    return this.toUserRoleAssignment(doc.toObject() as unknown as Record<string, unknown>, roles.get(options.roleId));
  }

  /**
   * Remove a role from a user.
   */
  async delete(
    userId: string,
    roleId: string,
    organizationId?: string | null
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(roleId)) {
      return false;
    }

    const filter: FilterQuery<UserRoleDocument> = {
      userId,
      roleId: new Types.ObjectId(roleId),
    };

    if (organizationId !== undefined) {
      filter.organizationId = organizationId;
    }

    const result = await this.userRoleModel.deleteOne(filter).exec();
    return result.deletedCount > 0;
  }

  /**
   * Check if a user has a specific role.
   */
  async userHasRole(
    userId: string,
    roleId: string,
    organizationId?: string | null
  ): Promise<boolean> {
    if (!Types.ObjectId.isValid(roleId)) {
      return false;
    }

    const filter: FilterQuery<UserRoleDocument> = {
      userId,
      roleId: new Types.ObjectId(roleId),
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    };

    if (organizationId !== undefined) {
      filter.organizationId = organizationId;
    }

    const count = await this.userRoleModel.countDocuments(filter).exec();
    return count > 0;
  }

  /**
   * Deactivate expired role assignments.
   */
  async deactivateExpired(): Promise<number> {
    const result = await this.userRoleModel
      .updateMany(
        {
          expiresAt: { $lte: new Date() },
          isActive: true,
        },
        { $set: { isActive: false } }
      )
      .exec();

    return result.modifiedCount;
  }

  /**
   * Get all effective roles for a user (including inherited roles).
   */
  async getEffectiveRoles(
    userId: string,
    organizationId?: string | null
  ): Promise<IRole[]> {
    const filter: FilterQuery<UserRoleDocument> = {
      userId,
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    };

    if (organizationId !== undefined) {
      filter.organizationId = organizationId;
    }

    // Get direct role assignments
    const assignments = await this.userRoleModel.find(filter).lean().exec();
    const directRoleIds = assignments.map((a) => a.roleId);

    if (directRoleIds.length === 0) {
      return [];
    }

    // Use aggregation to get roles with hierarchy
    const pipeline: PipelineStage[] = [
      { $match: { _id: { $in: directRoleIds } } },
      {
        $graphLookup: {
          from: 'rbac_roles',
          startWith: '$parentRoles',
          connectFromField: 'parentRoles',
          connectToField: '_id',
          as: 'ancestors',
          maxDepth: 10,
        },
      },
      {
        $project: {
          allRoles: {
            $concatArrays: [
              [
                {
                  _id: '$_id',
                  name: '$name',
                  displayName: '$displayName',
                  description: '$description',
                  parentRoles: '$parentRoles',
                  isSystem: '$isSystem',
                  isActive: '$isActive',
                  organizationId: '$organizationId',
                  metadata: '$metadata',
                  createdAt: '$createdAt',
                  updatedAt: '$updatedAt',
                },
              ],
              '$ancestors',
            ],
          },
        },
      },
      { $unwind: '$allRoles' },
      { $replaceRoot: { newRoot: '$allRoles' } },
      { $match: { isActive: true } },
    ];

    const roleDocs = await this.roleModel.aggregate(pipeline).exec();

    // Deduplicate roles
    const uniqueRoles = Array.from(
      new Map(roleDocs.map((doc) => [(doc._id as Types.ObjectId).toString(), doc])).values()
    );

    // Get permissions for all roles
    const roleIds = uniqueRoles.map((doc) => new Types.ObjectId((doc._id as Types.ObjectId).toString()));
    const permissionsMap = await this.getPermissionsForRoles(roleIds);

    return uniqueRoles.map((doc) => {
      const roleId = (doc._id as Types.ObjectId).toString();
      return {
        id: roleId,
        name: doc.name as string,
        displayName: doc.displayName as string | undefined,
        description: doc.description as string | undefined,
        permissions: permissionsMap.get(roleId) ?? [],
        parentRoles: (doc.parentRoles as Types.ObjectId[] | undefined)?.map((id) =>
          id.toString()
        ) ?? [],
        isSystem: doc.isSystem as boolean | undefined,
        isActive: doc.isActive as boolean,
        organizationId: doc.organizationId as string | null | undefined,
        metadata: doc.metadata as Record<string, unknown> | undefined,
        createdAt: doc.createdAt as Date | undefined,
        updatedAt: doc.updatedAt as Date | undefined,
      };
    });
  }

  /**
   * Get roles with their permissions using aggregation.
   */
  private async getRolesWithPermissions(
    roleIds: Types.ObjectId[]
  ): Promise<Map<string, IRole>> {
    if (roleIds.length === 0) {
      return new Map();
    }

    const pipeline: PipelineStage[] = [
      { $match: { _id: { $in: roleIds } } },
      {
        $lookup: {
          from: 'rbac_role_permissions',
          localField: '_id',
          foreignField: 'roleId',
          as: 'rolePermissions',
        },
      },
      {
        $lookup: {
          from: 'rbac_permissions',
          localField: 'rolePermissions.permissionId',
          foreignField: '_id',
          as: 'permissions',
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          displayName: 1,
          description: 1,
          parentRoles: 1,
          isSystem: 1,
          isActive: 1,
          organizationId: 1,
          metadata: 1,
          createdAt: 1,
          updatedAt: 1,
          permissions: 1,
        },
      },
    ];

    const docs = await this.roleModel.aggregate(pipeline).exec();

    const map = new Map<string, IRole>();
    for (const doc of docs) {
      const roleId = (doc._id as Types.ObjectId).toString();
      map.set(roleId, {
        id: roleId,
        name: doc.name as string,
        displayName: doc.displayName as string | undefined,
        description: doc.description as string | undefined,
        permissions: (doc.permissions as Array<Record<string, unknown>> || []).map((p) => ({
          id: (p._id as Types.ObjectId).toString(),
          resource: p.resource as string,
          action: p.action as string,
          scope: p.scope as string | undefined,
          conditions: p.conditions as Record<string, unknown> | undefined,
          metadata: p.metadata as Record<string, unknown> | undefined,
          description: p.description as string | undefined,
          createdAt: p.createdAt as Date | undefined,
        })),
        parentRoles: (doc.parentRoles as Types.ObjectId[] | undefined)?.map((id) =>
          id.toString()
        ) ?? [],
        isSystem: doc.isSystem as boolean | undefined,
        isActive: doc.isActive as boolean,
        organizationId: doc.organizationId as string | null | undefined,
        metadata: doc.metadata as Record<string, unknown> | undefined,
        createdAt: doc.createdAt as Date | undefined,
        updatedAt: doc.updatedAt as Date | undefined,
      });
    }

    return map;
  }

  /**
   * Get permissions for multiple roles.
   */
  private async getPermissionsForRoles(
    roleIds: Types.ObjectId[]
  ): Promise<Map<string, IPermission[]>> {
    if (roleIds.length === 0) {
      return new Map();
    }

    const pipeline: PipelineStage[] = [
      { $match: { roleId: { $in: roleIds } } },
      {
        $lookup: {
          from: 'rbac_permissions',
          localField: 'permissionId',
          foreignField: '_id',
          as: 'permission',
        },
      },
      { $unwind: '$permission' },
      {
        $group: {
          _id: '$roleId',
          permissions: { $push: '$permission' },
        },
      },
    ];

    const results = await this.rolePermissionModel.aggregate(pipeline).exec();

    const map = new Map<string, IPermission[]>();
    for (const result of results) {
      const roleId = (result._id as Types.ObjectId).toString();
      map.set(
        roleId,
        (result.permissions as Array<Record<string, unknown>>).map((p) => ({
          id: (p._id as Types.ObjectId).toString(),
          resource: p.resource as string,
          action: p.action as string,
          scope: p.scope as string | undefined,
          conditions: p.conditions as Record<string, unknown> | undefined,
          metadata: p.metadata as Record<string, unknown> | undefined,
          description: p.description as string | undefined,
          createdAt: p.createdAt as Date | undefined,
        }))
      );
    }

    return map;
  }

  /**
   * Convert Mongoose document to IUserRoleAssignment interface.
   */
  private toUserRoleAssignment(
    doc: Record<string, unknown>,
    role?: IRole
  ): IUserRoleAssignment {
    return {
      id: (doc._id as Types.ObjectId).toString(),
      userId: doc.userId as string,
      roleId: (doc.roleId as Types.ObjectId).toString(),
      role,
      organizationId: doc.organizationId as string | null | undefined,
      assignedBy: doc.assignedBy as string | undefined,
      assignedAt: doc.assignedAt as Date,
      expiresAt: doc.expiresAt as Date | null | undefined,
      isActive: doc.isActive as boolean,
      metadata: doc.metadata as Record<string, unknown> | undefined,
    };
  }
}
