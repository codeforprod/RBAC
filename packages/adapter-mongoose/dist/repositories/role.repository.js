"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleRepository = void 0;
const mongoose_1 = require("mongoose");
const role_schema_1 = require("../schemas/role.schema");
const role_permission_schema_1 = require("../schemas/role-permission.schema");
class RoleRepository {
    roleModel;
    rolePermissionModel;
    constructor(connection) {
        const conn = connection;
        this.roleModel = (0, role_schema_1.createRoleModel)(conn);
        this.rolePermissionModel = (0, role_permission_schema_1.createRolePermissionModel)(conn);
    }
    async findById(id) {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            return null;
        }
        const doc = await this.roleModel.findById(id).lean().exec();
        if (!doc) {
            return null;
        }
        const permissions = await this.getPermissionsForRole(id);
        return this.toRole(doc, permissions);
    }
    async findByName(name, organizationId) {
        const filter = {
            name: name.toLowerCase(),
            organizationId: organizationId ?? null,
        };
        const doc = await this.roleModel.findOne(filter).lean().exec();
        if (!doc) {
            return null;
        }
        const permissions = await this.getPermissionsForRole(doc._id.toString());
        return this.toRole(doc, permissions);
    }
    async findByIds(ids) {
        const validIds = ids.filter((id) => mongoose_1.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
            return [];
        }
        const docs = await this.roleModel
            .find({ _id: { $in: validIds.map((id) => new mongoose_1.Types.ObjectId(id)) } })
            .lean()
            .exec();
        const roleIds = docs.map((doc) => doc._id.toString());
        const permissionsMap = await this.getPermissionsForRoles(roleIds);
        return docs.map((doc) => {
            const roleId = doc._id.toString();
            return this.toRole(doc, permissionsMap.get(roleId) ?? []);
        });
    }
    async findAll(options) {
        const limit = options?.limit ?? 50;
        const offset = options?.offset ?? 0;
        const sortBy = options?.sortBy ?? 'createdAt';
        const sortOrder = options?.sortOrder ?? 'desc';
        const filter = {};
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
        const roleIds = docs.map((doc) => doc._id.toString());
        const permissionsMap = await this.getPermissionsForRoles(roleIds);
        return {
            data: docs.map((doc) => {
                const roleId = doc._id.toString();
                return this.toRole(doc, permissionsMap.get(roleId) ?? []);
            }),
            total,
            count: docs.length,
            offset,
            hasMore: offset + docs.length < total,
        };
    }
    async create(options) {
        const doc = await this.roleModel.create({
            name: options.name.toLowerCase(),
            displayName: options.displayName,
            description: options.description,
            parentRoles: options.parentRoles?.map((id) => new mongoose_1.Types.ObjectId(id)) ?? [],
            isSystem: options.isSystem ?? false,
            isActive: true,
            organizationId: options.organizationId ?? null,
            metadata: options.metadata,
        });
        let permissions = [];
        if (options.permissionIds && options.permissionIds.length > 0) {
            await this.assignPermissions(doc._id.toString(), options.permissionIds);
            permissions = await this.getPermissionsForRole(doc._id.toString());
        }
        return this.toRole(doc.toObject(), permissions);
    }
    async update(id, options) {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            return null;
        }
        const updateFields = {};
        if (options.displayName !== undefined) {
            updateFields.displayName = options.displayName;
        }
        if (options.description !== undefined) {
            updateFields.description = options.description;
        }
        if (options.parentRoles !== undefined) {
            updateFields.parentRoles = options.parentRoles.map((id) => new mongoose_1.Types.ObjectId(id));
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
    async delete(id) {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            return false;
        }
        await this.rolePermissionModel.deleteMany({ roleId: new mongoose_1.Types.ObjectId(id) }).exec();
        const result = await this.roleModel.deleteOne({ _id: new mongoose_1.Types.ObjectId(id) }).exec();
        return result.deletedCount > 0;
    }
    async findChildRoles(parentRoleId) {
        if (!mongoose_1.Types.ObjectId.isValid(parentRoleId)) {
            return [];
        }
        const docs = await this.roleModel
            .find({ parentRoles: new mongoose_1.Types.ObjectId(parentRoleId) })
            .lean()
            .exec();
        const roleIds = docs.map((doc) => doc._id.toString());
        const permissionsMap = await this.getPermissionsForRoles(roleIds);
        return docs.map((doc) => {
            const roleId = doc._id.toString();
            return this.toRole(doc, permissionsMap.get(roleId) ?? []);
        });
    }
    async getPermissionsForRole(roleId) {
        if (!mongoose_1.Types.ObjectId.isValid(roleId)) {
            return [];
        }
        const pipeline = [
            { $match: { roleId: new mongoose_1.Types.ObjectId(roleId) } },
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
            id: doc._id.toString(),
            resource: doc.resource,
            action: doc.action,
            scope: doc.scope,
            conditions: doc.conditions,
            metadata: doc.metadata,
            description: doc.description,
            createdAt: doc.createdAt,
        }));
    }
    async getPermissionsForRoles(roleIds) {
        const validIds = roleIds.filter((id) => mongoose_1.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
            return new Map();
        }
        const pipeline = [
            { $match: { roleId: { $in: validIds.map((id) => new mongoose_1.Types.ObjectId(id)) } } },
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
        const map = new Map();
        for (const result of results) {
            const roleId = result._id.toString();
            map.set(roleId, result.permissions.map((doc) => ({
                id: doc._id.toString(),
                resource: doc.resource,
                action: doc.action,
                scope: doc.scope,
                conditions: doc.conditions,
                metadata: doc.metadata,
                description: doc.description,
                createdAt: doc.createdAt,
            })));
        }
        return map;
    }
    async assignPermissions(roleId, permissionIds) {
        if (!mongoose_1.Types.ObjectId.isValid(roleId)) {
            return;
        }
        const validPermissionIds = permissionIds.filter((id) => mongoose_1.Types.ObjectId.isValid(id));
        if (validPermissionIds.length === 0) {
            return;
        }
        const assignments = validPermissionIds.map((permissionId) => ({
            roleId: new mongoose_1.Types.ObjectId(roleId),
            permissionId: new mongoose_1.Types.ObjectId(permissionId),
            grantedAt: new Date(),
        }));
        await this.rolePermissionModel.insertMany(assignments, { ordered: false }).catch((err) => {
            if (err.code !== 11000) {
                throw err;
            }
        });
    }
    async removePermissions(roleId, permissionIds) {
        if (!mongoose_1.Types.ObjectId.isValid(roleId)) {
            return;
        }
        const validPermissionIds = permissionIds.filter((id) => mongoose_1.Types.ObjectId.isValid(id));
        if (validPermissionIds.length === 0) {
            return;
        }
        await this.rolePermissionModel
            .deleteMany({
            roleId: new mongoose_1.Types.ObjectId(roleId),
            permissionId: { $in: validPermissionIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
        })
            .exec();
    }
    async getAncestorRoles(roleId, maxDepth = 10) {
        if (!mongoose_1.Types.ObjectId.isValid(roleId)) {
            return [];
        }
        const pipeline = [
            { $match: { _id: new mongoose_1.Types.ObjectId(roleId) } },
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
        const roleIds = docs.map((doc) => doc._id.toString());
        const permissionsMap = await this.getPermissionsForRoles(roleIds);
        return docs.map((doc) => {
            const id = doc._id.toString();
            return this.toRole(doc, permissionsMap.get(id) ?? []);
        });
    }
    async getDescendantRoles(roleId, maxDepth = 10) {
        if (!mongoose_1.Types.ObjectId.isValid(roleId)) {
            return [];
        }
        const pipeline = [
            { $match: { parentRoles: new mongoose_1.Types.ObjectId(roleId) } },
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
        const uniqueDocs = Array.from(new Map(docs.map((doc) => [doc._id.toString(), doc])).values());
        const roleIds = uniqueDocs.map((doc) => doc._id.toString());
        const permissionsMap = await this.getPermissionsForRoles(roleIds);
        return uniqueDocs.map((doc) => {
            const id = doc._id.toString();
            return this.toRole(doc, permissionsMap.get(id) ?? []);
        });
    }
    toRole(doc, permissions) {
        return {
            id: doc._id.toString(),
            name: doc.name,
            displayName: doc.displayName,
            description: doc.description,
            permissions,
            parentRoles: doc.parentRoles?.map((id) => id.toString()) ?? [],
            isSystem: doc.isSystem,
            isActive: doc.isActive,
            organizationId: doc.organizationId,
            metadata: doc.metadata,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
        };
    }
}
exports.RoleRepository = RoleRepository;
//# sourceMappingURL=role.repository.js.map