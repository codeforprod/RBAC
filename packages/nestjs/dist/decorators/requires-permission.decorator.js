"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequiresPermission = RequiresPermission;
const common_1 = require("@nestjs/common");
const types_1 = require("../types");
function RequiresPermission(permission) {
    return (0, common_1.applyDecorators)((0, common_1.SetMetadata)(types_1.RBAC_METADATA.PERMISSIONS, [permission]), (0, common_1.SetMetadata)(types_1.RBAC_METADATA.CHECK_MODE, types_1.PermissionCheckMode.ALL));
}
//# sourceMappingURL=requires-permission.decorator.js.map