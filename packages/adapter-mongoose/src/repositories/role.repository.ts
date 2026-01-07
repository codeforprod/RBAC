import { Types, FilterQuery, Connection, PipelineStage } from 'mongoose';
import {
  IRole,
  IPermission,
  ICreateRoleOptions,
  IUpdateRoleOptions,
  IQueryOptions,
  IPaginatedResult,
} from '@callairis/rbac-core';
import { RoleModel, RoleDocument, createRoleModel } from '../schemas/role.schema';
import {
  RolePermissionModel,
  createRolePermissionModel,
} from '../schemas/role-permission.schema';
/**
 * Repository for Role data access operations.
 * Provides pure data access methods with aggregation pipeline support.
 */
export class RoleRepository {
  private readonly roleModel: RoleModel;
  private readonly rolePermissionModel: RolePermissionModel;

  constructor(connection?: Connection) {
    const conn = connection as unknown as typeof import('mongoose');
    this.roleModel = createRoleModel(conn);
    this.rolePermissionModel = createRolePermissionModel(conn);
  }

  /**
   * Find a role by its unique identifier.
   */
  async findById(id: string): Promise<IRole | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await this.roleModel.findById(id).lean().exec();
    if (!doc) {
      return null;
    }

    const permissions = await this.getPermissionsForRole(id);
    return this.toRole(doc, permissions);
  }

  /**
   * Find a role by name within an organization.
   */
  async findByName(name: string, organizationId?: string | null): Promise<IRole | null> {
    const filter: FilterQuery<RoleDocument> = {
      name: name.toLowerCase(),
      organizationId: organizationId ?? null,
    };

    const doc = await this.roleModel.findOne(filter).lean().exec();
    if (!doc) {
      return null;
    }

    const permissions = await this.getPermissionsForRole((doc._id as Types.ObjectId).toString());
    return this.toRole(doc, permissions);
  }

  /**
   * Find multiple roles by their IDs.
   */
  async findByIds(ids: string[]): Promise<IRole[]> {
    const validIds = ids.filter((id) => Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return [];
    }

    const docs = await this.roleModel
      .find({ _id: { $in: validIds.map((id) => new Types.ObjectId(id)) } })
      .lean()
      .exec();

    const roleIds = docs.map((doc) => (doc._id as Types.ObjectId).toString());
    const permissionsMap = await this.getPermissionsForRoles(roleIds);

    return docs.map((doc) => {
      const roleId = (doc._id as Types.ObjectId).toString();
      return this.toRole(doc, permissionsMap.get(roleId) ?? []);
    });
  }

  /**
   * Find all roles with optional filtering and pagination.
   */
  async findAll(options?: IQueryOptions): Promise<IPaginatedResult<IRole>> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const sortBy = options?.sortBy ?? 'createdAt';
    const sortOrder = options?.sortOrder ?? 'desc';

    const filter: FilterQuery<RoleDocument> = {};

    if (options?.organizationId !== undefined) {
      filter.organizationId = options.organizationId;
    }

    if (!options?.includeInactive) {
      filter.isActive = true;
    }

    const [docs, total] = await Promise.all([
      this.roleModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      this.roleModel.countDocuments(filter).exec(),
    ]);

    const roleIds = docs.map((doc) => (doc._id as Types.ObjectId).toString());
    const permissionsMap = await this.getPermissionsForRoles(roleIds);

    return {
      data: docs.map((doc) => {
        const roleId = (doc._id as Types.ObjectId).toString();
        return this.toRole(doc, permissionsMap.get(roleId) ?? []);
      }),
      total,
      count: docs.length,
      offset,
      hasMore: offset + docs.length < total,
    };
  }

  /**
   * Create a new role.
   */
  async create(options: ICreateRoleOptions): Promise<IRole> {
    const doc = await this.roleModel.create({
      name: options.name.toLowerCase(),
      displayName: options.displayName,
      description: options.description,
      parentRoles: options.parentRoles?.map((id) => new Types.ObjectId(id)) ?? [],
      isSystem: options.isSystem ?? false,
      isActive: true,
      organizationId: options.organizationId ?? null,
      metadata: options.metadata,
    });

    // Assign initial permissions if provided
    let permissions: IPermission[] = [];
    if (options.permissionIds && options.permissionIds.length > 0) {
      await this.assignPermissions(doc._id.toString(), options.permissionIds);
      permissions = await this.getPermissionsForRole(doc._id.toString());
    }

    return this.toRole(doc.toObject() as unknown as Record<string, unknown>, permissions);
  }

  /**
   * Update an existing role.
   */
  async update(id: string, options: IUpdateRoleOptions): Promise<IRole | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const updateFields: Record<string, unknown> = {};

    if (options.displayName !== undefined) {
      updateFields.displayName = options.displayName;
    }
    if (options.description !== undefined) {
      updateFields.description = options.description;
    }
    if (options.parentRoles !== undefined) {
      updateFields.parentRoles = options.parentRoles.map((id) => new Types.ObjectId(id));
    }
    if (options.isActive !== undefined) {
      updateFields.isActive = options.isActive;
    }
    if (options.metadata !== undefined) {
      updateFields.metadata = options.metadata;
    }

    const doc = await this.roleModel
      .findByIdAndUpdate(id, { $set: updateFields }, { new: true, runValidators: true })
      .lean()
      .exec();

    if (!doc) {
      return null;
    }

    const permissions = await this.getPermissionsForRole(id);
    return this.toRole(doc, permissions);
  }

  /**
   * Delete a role.
   */
  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }

    // Delete role-permission assignments
    await this.rolePermissionModel.deleteMany({ roleId: new Types.ObjectId(id) }).exec();

    // Delete the role
    const result = await this.roleModel.deleteOne({ _id: new Types.ObjectId(id) }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Find roles that have a specific role as their parent.
   */
  async findChildRoles(parentRoleId: string): Promise<IRole[]> {
    if (!Types.ObjectId.isValid(parentRoleId)) {
      return [];
    }

    const docs = await this.roleModel
      .find({ parentRoles: new Types.ObjectId(parentRoleId) })
      .lean()
      .exec();

    const roleIds = docs.map((doc) => (doc._id as Types.ObjectId).toString());
    const permissionsMap = await this.getPermissionsForRoles(roleIds);

    return docs.map((doc) => {
      const roleId = (doc._id as Types.ObjectId).toString();
      return this.toRole(doc, permissionsMap.get(roleId) ?? []);
    });
  }

  /**
   * Get all permissions directly assigned to a role.
   */
  async getPermissionsForRole(roleId: string): Promise<IPermission[]> {
    if (!Types.ObjectId.isValid(roleId)) {
      return [];
    }

    const pipeline: PipelineStage[] = [
      { $match: { roleId: new Types.ObjectId(roleId) } },
      {
        $lookup: {
          from: 'rbac_permissions',
          localField: 'permissionId',
          foreignField: '_id',
          as: 'permission',
        },
      },
      { $unwind: '$permission' },
      { $replaceRoot: { newRoot: '$permission' } },
    ];

    const docs = await this.rolePermissionModel.aggregate(pipeline).exec();

    return docs.map((doc) => ({
      id: (doc._id as Types.ObjectId).toString(),
      resource: doc.resource as string,
      action: doc.action as string,
      scope: doc.scope as string | undefined,
      conditions: doc.conditions as Record<string, unknown> | undefined,
      metadata: doc.metadata as Record<string, unknown> | undefined,
      description: doc.description as string | undefined,
      createdAt: doc.createdAt as Date | undefined,
    }));
  }

  /**
   * Get permissions for multiple roles in a single query.
   */
  async getPermissionsForRoles(roleIds: string[]): Promise<Map<string, IPermission[]>> {
    const validIds = roleIds.filter((id) => Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return new Map();
    }

    const pipeline: PipelineStage[] = [
      { $match: { roleId: { $in: validIds.map((id) => new Types.ObjectId(id)) } } },
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
        (result.permissions as Array<Record<string, unknown>>).map((doc) => ({
          id: (doc._id as Types.ObjectId).toString(),
          resource: doc.resource as string,
          action: doc.action as string,
          scope: doc.scope as string | undefined,
          conditions: doc.conditions as Record<string, unknown> | undefined,
          metadata: doc.metadata as Record<string, unknown> | undefined,
          description: doc.description as string | undefined,
          createdAt: doc.createdAt as Date | undefined,
        }))
      );
    }

    return map;
  }

  /**
   * Assign permissions to a role.
   */
  async assignPermissions(roleId: string, permissionIds: string[]): Promise<void> {
    if (!Types.ObjectId.isValid(roleId)) {
      return;
    }

    const validPermissionIds = permissionIds.filter((id) => Types.ObjectId.isValid(id));
    if (validPermissionIds.length === 0) {
      return;
    }

    const assignments = validPermissionIds.map((permissionId) => ({
      roleId: new Types.ObjectId(roleId),
      permissionId: new Types.ObjectId(permissionId),
      grantedAt: new Date(),
    }));

    await this.rolePermissionModel.insertMany(assignments, { ordered: false }).catch((err) => {
      // Ignore duplicate key errors (permission already assigned)
      if (err.code !== 11000) {
        throw err;
      }
    });
  }

  /**
   * Remove permissions from a role.
   */
  async removePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    if (!Types.ObjectId.isValid(roleId)) {
      return;
    }

    const validPermissionIds = permissionIds.filter((id) => Types.ObjectId.isValid(id));
    if (validPermissionIds.length === 0) {
      return;
    }

    await this.rolePermissionModel
      .deleteMany({
        roleId: new Types.ObjectId(roleId),
        permissionId: { $in: validPermissionIds.map((id) => new Types.ObjectId(id)) },
      })
      .exec();
  }

  /**
   * Get role hierarchy using aggregation pipeline.
   * Returns all ancestor roles for a given role.
   */
  async getAncestorRoles(roleId: string, maxDepth: number = 10): Promise<IRole[]> {
    if (!Types.ObjectId.isValid(roleId)) {
      return [];
    }

    const pipeline: PipelineStage[] = [
      { $match: { _id: new Types.ObjectId(roleId) } },
      {
        $graphLookup: {
          from: 'rbac_roles',
          startWith: '$parentRoles',
          connectFromField: 'parentRoles',
          connectToField: '_id',
          as: 'ancestors',
          maxDepth: maxDepth - 1,
          depthField: 'depth',
        },
      },
      { $unwind: '$ancestors' },
      { $replaceRoot: { newRoot: '$ancestors' } },
      { $sort: { depth: 1 } },
    ];

    const docs = await this.roleModel.aggregate(pipeline).exec();

    const roleIds = docs.map((doc) => (doc._id as Types.ObjectId).toString());
    const permissionsMap = await this.getPermissionsForRoles(roleIds);

    return docs.map((doc) => {
      const id = (doc._id as Types.ObjectId).toString();
      return this.toRole(doc, permissionsMap.get(id) ?? []);
    });
  }

  /**
   * Get role descendants using aggregation pipeline.
   * Returns all descendant roles for a given role.
   */
  async getDescendantRoles(roleId: string, maxDepth: number = 10): Promise<IRole[]> {
    if (!Types.ObjectId.isValid(roleId)) {
      return [];
    }

    const pipeline: PipelineStage[] = [
      { $match: { parentRoles: new Types.ObjectId(roleId) } },
      {
        $graphLookup: {
          from: 'rbac_roles',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentRoles',
          as: 'descendants',
          maxDepth: maxDepth - 1,
          depthField: 'depth',
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
                  depth: 0,
                },
              ],
              '$descendants',
            ],
          },
        },
      },
      { $unwind: '$allRoles' },
      { $replaceRoot: { newRoot: '$allRoles' } },
      { $sort: { depth: 1 } },
    ];

    const docs = await this.roleModel.aggregate(pipeline).exec();

    // Deduplicate roles
    const uniqueDocs = Array.from(
      new Map(docs.map((doc) => [(doc._id as Types.ObjectId).toString(), doc])).values()
    );

    const roleIds = uniqueDocs.map((doc) => (doc._id as Types.ObjectId).toString());
    const permissionsMap = await this.getPermissionsForRoles(roleIds);

    return uniqueDocs.map((doc) => {
      const id = (doc._id as Types.ObjectId).toString();
      return this.toRole(doc, permissionsMap.get(id) ?? []);
    });
  }

  /**
   * Convert Mongoose document to IRole interface.
   */
  private toRole(doc: Record<string, unknown>, permissions: IPermission[]): IRole {
    return {
      id: (doc._id as Types.ObjectId).toString(),
      name: doc.name as string,
      displayName: doc.displayName as string | undefined,
      description: doc.description as string | undefined,
      permissions,
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
  }
}
