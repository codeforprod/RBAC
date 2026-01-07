"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionCheckMode = exports.RBAC_METADATA = void 0;
exports.RBAC_METADATA = {
    PERMISSIONS: 'rbac:permissions',
    ROLES: 'rbac:roles',
    CHECK_MODE: 'rbac:check_mode',
    IS_PUBLIC: 'rbac:is_public',
    SKIP_RBAC: 'rbac:skip',
    CUSTOM_AUTHORIZER: 'rbac:custom_authorizer',
    RESOURCE_TYPE: 'rbac:resource_type',
    OWNER_PARAM: 'rbac:owner_param',
};
var PermissionCheckMode;
(function (PermissionCheckMode) {
    PermissionCheckMode["ALL"] = "all";
    PermissionCheckMode["ANY"] = "any";
})(PermissionCheckMode || (exports.PermissionCheckMode = PermissionCheckMode = {}));
//# sourceMappingURL=module-options.types.js.map