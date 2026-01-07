"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hierarchyUtils = exports.RoleHierarchyResolver = exports.permissionMatcher = exports.PermissionMatcher = exports.wildcardParser = exports.WildcardParser = void 0;
var wildcard_parser_1 = require("./wildcard-parser");
Object.defineProperty(exports, "WildcardParser", { enumerable: true, get: function () { return wildcard_parser_1.WildcardParser; } });
Object.defineProperty(exports, "wildcardParser", { enumerable: true, get: function () { return wildcard_parser_1.wildcardParser; } });
var permission_matcher_1 = require("./permission-matcher");
Object.defineProperty(exports, "PermissionMatcher", { enumerable: true, get: function () { return permission_matcher_1.PermissionMatcher; } });
Object.defineProperty(exports, "permissionMatcher", { enumerable: true, get: function () { return permission_matcher_1.permissionMatcher; } });
var role_hierarchy_1 = require("./role-hierarchy");
Object.defineProperty(exports, "RoleHierarchyResolver", { enumerable: true, get: function () { return role_hierarchy_1.RoleHierarchyResolver; } });
Object.defineProperty(exports, "hierarchyUtils", { enumerable: true, get: function () { return role_hierarchy_1.hierarchyUtils; } });
//# sourceMappingURL=index.js.map