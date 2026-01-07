"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultUserExtractionStrategy = exports.USER_EXTRACTION_STRATEGY_TOKEN = exports.RBAC_ENGINE_TOKEN = exports.RBAC_OPTIONS_TOKEN = void 0;
exports.createRbacProviders = createRbacProviders;
exports.createRbacAsyncProviders = createRbacAsyncProviders;
exports.RBAC_OPTIONS_TOKEN = Symbol('RBAC_OPTIONS');
exports.RBAC_ENGINE_TOKEN = Symbol('RBAC_ENGINE');
exports.USER_EXTRACTION_STRATEGY_TOKEN = Symbol('USER_EXTRACTION_STRATEGY');
function createRbacProviders(options) {
    return [
        {
            provide: exports.RBAC_OPTIONS_TOKEN,
            useValue: options,
        },
    ];
}
function createRbacAsyncProviders(asyncOptions) {
    const providers = [];
    if (asyncOptions.useFactory) {
        providers.push({
            provide: exports.RBAC_OPTIONS_TOKEN,
            useFactory: asyncOptions.useFactory,
            inject: (asyncOptions.inject ?? []),
        });
    }
    if (asyncOptions.useClass) {
        providers.push({
            provide: asyncOptions.useClass,
            useClass: asyncOptions.useClass,
        }, {
            provide: exports.RBAC_OPTIONS_TOKEN,
            useFactory: async (factory) => factory.createRbacOptions(),
            inject: [asyncOptions.useClass],
        });
    }
    if (asyncOptions.useExisting) {
        providers.push({
            provide: exports.RBAC_OPTIONS_TOKEN,
            useFactory: async (factory) => factory.createRbacOptions(),
            inject: [asyncOptions.useExisting],
        });
    }
    return providers;
}
exports.DefaultUserExtractionStrategy = {
    extractUserId(context) {
        const user = extractUserFromAnyContext(context);
        return user?.id ?? null;
    },
    extractOrganizationId(context) {
        const user = extractUserFromAnyContext(context);
        return user?.organizationId ?? null;
    },
    extractContext(context) {
        const user = extractUserFromAnyContext(context);
        const request = extractRequestFromContext(context);
        return {
            userId: user?.id,
            organizationId: user?.organizationId,
            ipAddress: request?.ip ??
                request?.connection?.remoteAddress,
            userAgent: request?.headers?.['user-agent'],
            requestId: request?.id ??
                request?.headers?.['x-request-id'],
        };
    },
};
function extractUserFromAnyContext(context) {
    if (!context || typeof context !== 'object') {
        return null;
    }
    const ctx = context;
    if (ctx.user && typeof ctx.user === 'object') {
        return ctx.user;
    }
    if (ctx.request && typeof ctx.request === 'object') {
        const req = ctx.request;
        if (req.user && typeof req.user === 'object') {
            return req.user;
        }
    }
    if (ctx.req && typeof ctx.req === 'object') {
        const req = ctx.req;
        if (req.user && typeof req.user === 'object') {
            return req.user;
        }
    }
    if (ctx.client && typeof ctx.client === 'object') {
        const client = ctx.client;
        if (client.user && typeof client.user === 'object') {
            return client.user;
        }
        if (client.handshake && typeof client.handshake === 'object') {
            const handshake = client.handshake;
            if (handshake.user && typeof handshake.user === 'object') {
                return handshake.user;
            }
        }
    }
    return null;
}
function extractRequestFromContext(context) {
    if (!context || typeof context !== 'object') {
        return null;
    }
    const ctx = context;
    if (ctx.request && typeof ctx.request === 'object') {
        return ctx.request;
    }
    if (ctx.req && typeof ctx.req === 'object') {
        return ctx.req;
    }
    return null;
}
//# sourceMappingURL=rbac-options.provider.js.map