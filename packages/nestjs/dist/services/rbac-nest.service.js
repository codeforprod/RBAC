"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RBACNestService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBACNestService = void 0;
const common_1 = require("@nestjs/common");
const rbac_core_1 = require("@holocron/rbac-core");
const providers_1 = require("../providers");
let RBACNestService = RBACNestService_1 = class RBACNestService {
    options;
    logger = new common_1.Logger(RBACNestService_1.name);
    engine = null;
    constructor(options) {
        this.options = options;
    }
    async onModuleInit() {
        this.logger.log('Initializing RBAC engine...');
        this.engine = await rbac_core_1.RBACEngine.create({
            adapter: this.options.adapter,
            cache: this.options.cache,
            auditLogger: this.options.auditLogger,
            cacheOptions: this.options.cacheOptions,
            auditOptions: this.options.auditOptions,
            hierarchyOptions: this.options.hierarchyOptions,
            permissionOptions: this.options.permissionOptions,
            multiTenancyOptions: this.options.multiTenancyOptions,
            performanceOptions: this.options.performanceOptions,
            validationOptions: this.options.validationOptions,
            autoInitialize: this.options.autoInitialize ?? true,
            debug: this.options.debug,
        });
        this.logger.log('RBAC engine initialized successfully');
    }
    async onModuleDestroy() {
        if (this.engine) {
            this.logger.log('Shutting down RBAC engine...');
            await this.engine.shutdown();
            this.engine = null;
            this.logger.log('RBAC engine shutdown complete');
        }
    }
    getEngine() {
        if (!this.engine) {
            throw new Error('RBAC engine is not initialized');
        }
        return this.engine;
    }
    async can(userId, permission, context) {
        return this.getEngine().can(userId, permission, context);
    }
    async authorize(userId, permission, context) {
        return this.getEngine().authorize(userId, permission, context);
    }
    async canAny(userId, permissions, context) {
        return this.getEngine().canAny(userId, permissions, context);
    }
    async canAll(userId, permissions, context) {
        return this.getEngine().canAll(userId, permissions, context);
    }
    async checkDetailed(userId, permission, context) {
        return this.getEngine().checkDetailed(userId, permission, context);
    }
    async getEffectivePermissions(userId, organizationId) {
        return this.getEngine().getEffectivePermissions(userId, organizationId);
    }
    async createRole(options, actorId) {
        return this.getEngine().createRole(options, actorId);
    }
    async updateRole(roleId, options, actorId) {
        return this.getEngine().updateRole(roleId, options, actorId);
    }
    async deleteRole(roleId, actorId) {
        return this.getEngine().deleteRole(roleId, actorId);
    }
    async getRole(roleId) {
        return this.getEngine().getRole(roleId);
    }
    async getRoleByName(name, organizationId) {
        return this.getEngine().getRoleByName(name, organizationId);
    }
    async addPermissionsToRole(roleId, permissionIds, actorId) {
        return this.getEngine().addPermissionsToRole(roleId, permissionIds, actorId);
    }
    async removePermissionsFromRole(roleId, permissionIds, actorId) {
        return this.getEngine().removePermissionsFromRole(roleId, permissionIds, actorId);
    }
    async assignRole(options) {
        return this.getEngine().assignRole(options);
    }
    async removeRole(userId, roleId, actorId, organizationId) {
        return this.getEngine().removeRole(userId, roleId, actorId, organizationId);
    }
    async getUserRoles(userId, organizationId) {
        return this.getEngine().getUserRoles(userId, organizationId);
    }
    async hasRole(userId, roleId, organizationId) {
        return this.getEngine().hasRole(userId, roleId, organizationId);
    }
    async invalidateUserCache(userId, organizationId) {
        return this.getEngine().invalidateUserCache(userId, organizationId);
    }
    async invalidateRoleCache(roleId) {
        return this.getEngine().invalidateRoleCache(roleId);
    }
    async clearAllCaches() {
        return this.getEngine().clearAllCaches();
    }
    async healthCheck() {
        return this.getEngine().healthCheck();
    }
    isInitialized() {
        return this.engine?.isInitialized() ?? false;
    }
};
exports.RBACNestService = RBACNestService;
exports.RBACNestService = RBACNestService = RBACNestService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(providers_1.RBAC_OPTIONS_TOKEN)),
    __metadata("design:paramtypes", [Object])
], RBACNestService);
//# sourceMappingURL=rbac-nest.service.js.map