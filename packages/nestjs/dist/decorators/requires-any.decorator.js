"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequiresAny = RequiresAny;
const common_1 = require("@nestjs/common");
const types_1 = require("../types");
function RequiresAny(permissions) {
    if (!Array.isArray(permissions) || permissions.length === 0) {
        throw new Error('RequiresAny requires a non-empty array of permissions');
    }
    return (0, common_1.applyDecorators)((0, common_1.SetMetadata)(types_1.RBAC_METADATA.PERMISSIONS, permissions), (0, common_1.SetMetadata)(types_1.RBAC_METADATA.CHECK_MODE, types_1.PermissionCheckMode.ANY));
}
//# sourceMappingURL=requires-any.decorator.js.map