"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoleRepository = void 0;
const mongoose_1 = require("mongoose");
const user_role_schema_1 = require("../schemas/user-role.schema");
const role_schema_1 = require("../schemas/role.schema");
const role_permission_schema_1 = require("../schemas/role-permission.schema");
class UserRoleRepository {
    userRoleModel;
    roleModel;
    rolePermissionModel;
    constructor(connection) {
        const conn = connection;
        this.userRoleModel = (0, user_role_schema_1.createUserRoleModel)(conn);
        this.roleModel = (0, role_schema_1.createRoleModel)(conn);
        this.rolePermissionModel = (0, role_permission_schema_1.createRolePermissionModel)(conn);
    }
    async findByUserId(userId, organizationId) {
        const filter = {
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
        const roleIds = docs.map((doc) => doc.roleId);
        const roles = await this.getRolesWithPermissions(roleIds);
        return docs.map((doc) => this.toUserRoleAssignment(doc, roles.get(doc.roleId.toString())));
    }
    async findByRoleId(roleId, options) {
        if (!mongoose_1.Types.ObjectId.isValid(roleId)) {
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
        const filter = {
            roleId: new mongoose_1.Types.ObjectId(roleId),
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
        const roles = await this.getRolesWithPermissions([new mongoose_1.Types.ObjectId(roleId)]);
        return {
            data: docs.map((doc) => this.toUserRoleAssignment(doc, roles.get(roleId))),
            total,
            count: docs.length,
            offset,
            hasMore: offset + docs.length < total,
        };
    }
    async create(options) {
        const doc = await this.userRoleModel.create({
            userId: options.userId,
            roleId: new mongoose_1.Types.ObjectId(options.roleId),
            organizationId: options.organizationId ?? null,
            assignedBy: options.assignedBy,
            assignedAt: new Date(),
            expiresAt: options.expiresAt ?? null,
            isActive: true,
            metadata: options.metadata,
        });
        const roles = await this.getRolesWithPermissions([doc.roleId]);
        return this.toUserRoleAssignment(doc.toObject(), roles.get(options.roleId));
    }
    async delete(userId, roleId, organizationId) {
        if (!mongoose_1.Types.ObjectId.isValid(roleId)) {
            return false;
        }
        const filter = {
            userId,
            roleId: new mongoose_1.Types.ObjectId(roleId),
        };
        if (organizationId !== undefined) {
            filter.organizationId = organizationId;
        }
        const result = await this.userRoleModel.deleteOne(filter).exec();
        return result.deletedCount > 0;
    }
    async userHasRole(userId, roleId, organizationId) {
        if (!mongoose_1.Types.ObjectId.isValid(roleId)) {
            return false;
        }
        const filter = {
            userId,
            roleId: new mongoose_1.Types.ObjectId(roleId),
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
    async deactivateExpired() {
        const result = await this.userRoleModel
            .updateMany({
            expiresAt: { $lte: new Date() },
            isActive: true,
        }, { $set: { isActive: false } })
            .exec();
        return result.modifiedCount;
    }
    async getEffectiveRoles(userId, organizationId) {
        const filter = {
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
        const assignments = await this.userRoleModel.find(filter).lean().exec();
        const directRoleIds = assignments.map((a) => a.roleId);
        if (directRoleIds.length === 0) {
            return [];
        }
        const pipeline = [
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
        const uniqueRoles = Array.from(new Map(roleDocs.map((doc) => [doc._id.toString(), doc])).values());
        const roleIds = uniqueRoles.map((doc) => new mongoose_1.Types.ObjectId(doc._id.toString()));
        const permissionsMap = await this.getPermissionsForRoles(roleIds);
        return uniqueRoles.map((doc) => {
            const roleId = doc._id.toString();
            return {
                id: roleId,
                name: doc.name,
                displayName: doc.displayName,
                description: doc.description,
                permissions: permissionsMap.get(roleId) ?? [],
                parentRoles: doc.parentRoles?.map((id) => id.toString()) ?? [],
                isSystem: doc.isSystem,
                isActive: doc.isActive,
                organizationId: doc.organizationId,
                metadata: doc.metadata,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            };
        });
    }
    async getRolesWithPermissions(roleIds) {
        if (roleIds.length === 0) {
            return new Map();
        }
        const pipeline = [
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
        const map = new Map();
        for (const doc of docs) {
            const roleId = doc._id.toString();
            map.set(roleId, {
                id: roleId,
                name: doc.name,
                displayName: doc.displayName,
                description: doc.description,
                permissions: (doc.permissions || []).map((p) => ({
                    id: p._id.toString(),
                    resource: p.resource,
                    action: p.action,
                    scope: p.scope,
                    conditions: p.conditions,
                    metadata: p.metadata,
                    description: p.description,
                    createdAt: p.createdAt,
                })),
                parentRoles: doc.parentRoles?.map((id) => id.toString()) ?? [],
                isSystem: doc.isSystem,
                isActive: doc.isActive,
                organizationId: doc.organizationId,
                metadata: doc.metadata,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt,
            });
        }
        return map;
    }
    async getPermissionsForRoles(roleIds) {
        if (roleIds.length === 0) {
            return new Map();
        }
        const pipeline = [
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
        const map = new Map();
        for (const result of results) {
            const roleId = result._id.toString();
            map.set(roleId, result.permissions.map((p) => ({
                id: p._id.toString(),
                resource: p.resource,
                action: p.action,
                scope: p.scope,
                conditions: p.conditions,
                metadata: p.metadata,
                description: p.description,
                createdAt: p.createdAt,
            })));
        }
        return map;
    }
    toUserRoleAssignment(doc, role) {
        return {
            id: doc._id.toString(),
            userId: doc.userId,
            roleId: doc.roleId.toString(),
            role,
            organizationId: doc.organizationId,
            assignedBy: doc.assignedBy,
            assignedAt: doc.assignedAt,
            expiresAt: doc.expiresAt,
            isActive: doc.isActive,
            metadata: doc.metadata,
        };
    }
}
exports.UserRoleRepository = UserRoleRepository;
//# sourceMappingURL=user-role.repository.js.map