import { Types, FilterQuery, Connection } from 'mongoose';
import { IPermission, IQueryOptions, IPaginatedResult } from '@prodforcode/rbac-core';
import {
  PermissionModel,
  PermissionDocument,
  createPermissionModel,
} from '../schemas/permission.schema';

/**
 * Repository for Permission data access operations.
 * Provides pure data access methods without business logic.
 */
export class PermissionRepository {
  private readonly model: PermissionModel;

  constructor(connection?: Connection) {
    this.model = createPermissionModel(connection as unknown as typeof import('mongoose'));
  }

  /**
   * Find a permission by its unique identifier.
   */
  async findById(id: string): Promise<IPermission | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await this.model.findById(id).lean().exec();
    if (!doc) {
      return null;
    }

    return this.toPermission(doc);
  }

  /**
   * Find a permission by resource, action, and optional scope.
   */
  async findByResourceAction(
    resource: string,
    action: string,
    scope?: string
  ): Promise<IPermission | null> {
    const filter: FilterQuery<PermissionDocument> = { resource, action };
    if (scope !== undefined) {
      filter.scope = scope;
    } else {
      filter.scope = { $exists: false };
    }

    const doc = await this.model.findOne(filter).lean().exec();
    if (!doc) {
      return null;
    }

    return this.toPermission(doc);
  }

  /**
   * Find multiple permissions by their IDs.
   */
  async findByIds(ids: string[]): Promise<IPermission[]> {
    const validIds = ids.filter((id) => Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return [];
    }

    const docs = await this.model
      .find({ _id: { $in: validIds.map((id) => new Types.ObjectId(id)) } })
      .lean()
      .exec();

    return docs.map((doc) => this.toPermission(doc));
  }

  /**
   * Find all permissions with optional filtering and pagination.
   */
  async findAll(options?: IQueryOptions): Promise<IPaginatedResult<IPermission>> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const sortBy = options?.sortBy ?? 'createdAt';
    const sortOrder = options?.sortOrder ?? 'desc';

    const [docs, total] = await Promise.all([
      this.model
        .find({})
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      this.model.countDocuments({}).exec(),
    ]);

    return {
      data: docs.map((doc) => this.toPermission(doc)),
      total,
      count: docs.length,
      offset,
      hasMore: offset + docs.length < total,
    };
  }

  /**
   * Create a new permission.
   */
  async create(permission: Omit<IPermission, 'id' | 'createdAt'>): Promise<IPermission> {
    const doc = await this.model.create({
      resource: permission.resource,
      action: permission.action,
      scope: permission.scope,
      conditions: permission.conditions,
      metadata: permission.metadata,
      description: permission.description,
    });

    return this.toPermission(doc.toObject() as unknown as Record<string, unknown>);
  }

  /**
   * Update an existing permission.
   */
  async update(id: string, updates: Partial<IPermission>): Promise<IPermission | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await this.model
      .findByIdAndUpdate(
        id,
        {
          $set: {
            ...(updates.resource && { resource: updates.resource }),
            ...(updates.action && { action: updates.action }),
            ...(updates.scope !== undefined && { scope: updates.scope }),
            ...(updates.conditions !== undefined && { conditions: updates.conditions }),
            ...(updates.metadata !== undefined && { metadata: updates.metadata }),
            ...(updates.description !== undefined && { description: updates.description }),
          },
        },
        { new: true, runValidators: true }
      )
      .lean()
      .exec();

    if (!doc) {
      return null;
    }

    return this.toPermission(doc);
  }

  /**
   * Delete a permission.
   */
  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }

    const result = await this.model.deleteOne({ _id: new Types.ObjectId(id) }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Bulk create permissions.
   */
  async bulkCreate(
    permissions: Array<Omit<IPermission, 'id' | 'createdAt'>>
  ): Promise<IPermission[]> {
    const docs = await this.model.insertMany(
      permissions.map((p) => ({
        resource: p.resource,
        action: p.action,
        scope: p.scope,
        conditions: p.conditions,
        metadata: p.metadata,
        description: p.description,
      })),
      { ordered: false }
    );

    return docs.map((doc) => this.toPermission(doc.toObject() as unknown as Record<string, unknown>));
  }

  /**
   * Search permissions by text query.
   */
  async search(query: string, options?: IQueryOptions): Promise<IPaginatedResult<IPermission>> {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const filter: FilterQuery<PermissionDocument> = {
      $or: [
        { resource: { $regex: query, $options: 'i' } },
        { action: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
    };

    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      data: docs.map((doc) => this.toPermission(doc)),
      total,
      count: docs.length,
      offset,
      hasMore: offset + docs.length < total,
    };
  }

  /**
   * Convert Mongoose document to IPermission interface.
   */
  private toPermission(doc: Record<string, unknown>): IPermission {
    return {
      id: (doc._id as Types.ObjectId).toString(),
      resource: doc.resource as string,
      action: doc.action as string,
      scope: doc.scope as string | undefined,
      conditions: doc.conditions as Record<string, unknown> | undefined,
      metadata: doc.metadata as Record<string, unknown> | undefined,
      description: doc.description as string | undefined,
      createdAt: doc.createdAt as Date | undefined,
    };
  }
}
