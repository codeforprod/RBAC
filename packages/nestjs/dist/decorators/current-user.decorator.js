"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((property, ctx) => {
    const user = extractUserFromContext(ctx);
    if (!user) {
        return null;
    }
    if (property) {
        return user[property] ?? null;
    }
    return user;
});
function extractUserFromContext(ctx) {
    const type = ctx.getType();
    switch (type) {
        case 'http': {
            const request = ctx.switchToHttp().getRequest();
            return request.user ?? null;
        }
        case 'graphql': {
            const gqlContext = getGqlContext(ctx);
            if (!gqlContext)
                return null;
            const contextAny = gqlContext;
            return contextAny.req?.user ??
                contextAny.user ??
                null;
        }
        case 'ws': {
            const client = ctx.switchToWs().getClient();
            return client.user ?? client.handshake?.user ?? client.data?.user ?? null;
        }
        case 'rpc': {
            const rpcContext = ctx.switchToRpc().getContext();
            return rpcContext?.user ?? null;
        }
        default:
            return null;
    }
}
function getGqlContext(ctx) {
    try {
        const args = ctx.getArgs();
        if (args.length >= 3 && args[2] && typeof args[2] === 'object') {
            return args[2];
        }
        for (const arg of args) {
            if (arg && typeof arg === 'object' && ('req' in arg || 'request' in arg)) {
                return arg;
            }
        }
        return null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=current-user.decorator.js.map