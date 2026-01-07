"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircularHierarchyError = exports.RoleNotFoundError = exports.PermissionDeniedError = exports.RBACErrorCode = exports.RBACError = void 0;
var rbac_error_1 = require("./rbac.error");
Object.defineProperty(exports, "RBACError", { enumerable: true, get: function () { return rbac_error_1.RBACError; } });
Object.defineProperty(exports, "RBACErrorCode", { enumerable: true, get: function () { return rbac_error_1.RBACErrorCode; } });
var permission_denied_error_1 = require("./permission-denied.error");
Object.defineProperty(exports, "PermissionDeniedError", { enumerable: true, get: function () { return permission_denied_error_1.PermissionDeniedError; } });
var role_not_found_error_1 = require("./role-not-found.error");
Object.defineProperty(exports, "RoleNotFoundError", { enumerable: true, get: function () { return role_not_found_error_1.RoleNotFoundError; } });
var circular_hierarchy_error_1 = require("./circular-hierarchy.error");
Object.defineProperty(exports, "CircularHierarchyError", { enumerable: true, get: function () { return circular_hierarchy_error_1.CircularHierarchyError; } });
//# sourceMappingURL=index.js.map