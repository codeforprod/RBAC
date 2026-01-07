"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionRepository = void 0;
const mongoose_1 = require("mongoose");
const permission_schema_1 = require("../schemas/permission.schema");
class PermissionRepository {
    model;
    constructor(connection) {
        this.model = (0, permission_schema_1.createPermissionModel)(connection);
    }
    async findById(id) {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            return null;
        }
        const doc = await this.model.findById(id).lean().exec();
        if (!doc) {
            return null;
        }
        return this.toPermission(doc);
    }
    async findByResourceAction(resource, action, scope) {
        const filter = { resource, action };
        if (scope !== undefined) {
            filter.scope = scope;
        }
        else {
            filter.scope = { $exists: false };
        }
        const doc = await this.model.findOne(filter).lean().exec();
        if (!doc) {
            return null;
        }
        return this.toPermission(doc);
    }
    async findByIds(ids) {
        const validIds = ids.filter((id) => mongoose_1.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
            return [];
        }
        const docs = await this.model
            .find({ _id: { $in: validIds.map((id) => new mongoose_1.Types.ObjectId(id)) } })
            .lean()
            .exec();
        return docs.map((doc) => this.toPermission(doc));
    }
    async findAll(options) {
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
    async create(permission) {
        const doc = await this.model.create({
            resource: permission.resource,
            action: permission.action,
            scope: permission.scope,
            conditions: permission.conditions,
            metadata: permission.metadata,
            description: permission.description,
        });
        return this.toPermission(doc.toObject());
    }
    async update(id, updates) {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            return null;
        }
        const doc = await this.model
            .findByIdAndUpdate(id, {
            $set: {
                ...(updates.resource && { resource: updates.resource }),
                ...(updates.action && { action: updates.action }),
                ...(updates.scope !== undefined && { scope: updates.scope }),
                ...(updates.conditions !== undefined && { conditions: updates.conditions }),
                ...(updates.metadata !== undefined && { metadata: updates.metadata }),
                ...(updates.description !== undefined && { description: updates.description }),
            },
        }, { new: true, runValidators: true })
            .lean()
            .exec();
        if (!doc) {
            return null;
        }
        return this.toPermission(doc);
    }
    async delete(id) {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            return false;
        }
        const result = await this.model.deleteOne({ _id: new mongoose_1.Types.ObjectId(id) }).exec();
        return result.deletedCount > 0;
    }
    async bulkCreate(permissions) {
        const docs = await this.model.insertMany(permissions.map((p) => ({
            resource: p.resource,
            action: p.action,
            scope: p.scope,
            conditions: p.conditions,
            metadata: p.metadata,
            description: p.description,
        })), { ordered: false });
        return docs.map((doc) => this.toPermission(doc.toObject()));
    }
    async search(query, options) {
        const limit = options?.limit ?? 50;
        const offset = options?.offset ?? 0;
        const filter = {
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
    toPermission(doc) {
        return {
            id: doc._id.toString(),
            resource: doc.resource,
            action: doc.action,
            scope: doc.scope,
            conditions: doc.conditions,
            metadata: doc.metadata,
            description: doc.description,
            createdAt: doc.createdAt,
        };
    }
}
exports.PermissionRepository = PermissionRepository;
//# sourceMappingURL=permission.repository.js.map