"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequiresRole = RequiresRole;
exports.RequiresRoles = RequiresRoles;
exports.RequiresAnyRole = RequiresAnyRole;
const common_1 = require("@nestjs/common");
const types_1 = require("../types");
function RequiresRole(role) {
    return (0, common_1.applyDecorators)((0, common_1.SetMetadata)(types_1.RBAC_METADATA.ROLES, [role]), (0, common_1.SetMetadata)(types_1.RBAC_METADATA.CHECK_MODE, types_1.PermissionCheckMode.ALL));
}
function RequiresRoles(roles) {
    return (0, common_1.applyDecorators)((0, common_1.SetMetadata)(types_1.RBAC_METADATA.ROLES, roles), (0, common_1.SetMetadata)(types_1.RBAC_METADATA.CHECK_MODE, types_1.PermissionCheckMode.ALL));
}
function RequiresAnyRole(roles) {
    return (0, common_1.applyDecorators)((0, common_1.SetMetadata)(types_1.RBAC_METADATA.ROLES, roles), (0, common_1.SetMetadata)(types_1.RBAC_METADATA.CHECK_MODE, types_1.PermissionCheckMode.ANY));
}
//# sourceMappingURL=requires-role.decorator.js.map