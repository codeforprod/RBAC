"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllowAnonymous = void 0;
exports.Public = Public;
exports.SkipRbac = SkipRbac;
const common_1 = require("@nestjs/common");
const types_1 = require("../types");
function Public() {
    return (0, common_1.SetMetadata)(types_1.RBAC_METADATA.IS_PUBLIC, true);
}
exports.AllowAnonymous = Public;
function SkipRbac() {
    return (0, common_1.SetMetadata)(types_1.RBAC_METADATA.SKIP_RBAC, true);
}
//# sourceMappingURL=public.decorator.js.map