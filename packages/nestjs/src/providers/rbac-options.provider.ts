import { Provider } from '@nestjs/common';
import { RbacModuleOptions, RbacModuleAsyncOptions, RbacOptionsFactory } from '../types';

/**
 * Injection token for RBAC module options.
 */
export const RBAC_OPTIONS_TOKEN = Symbol('RBAC_OPTIONS');

/**
 * Injection token for the RBAC engine instance.
 */
export const RBAC_ENGINE_TOKEN = Symbol('RBAC_ENGINE');

/**
 * Injection token for the user extraction strategy.
 */
export const USER_EXTRACTION_STRATEGY_TOKEN = Symbol('USER_EXTRACTION_STRATEGY');

/**
 * Create providers for synchronous RBAC module configuration.
 *
 * @param options - RBAC module options
 * @returns Array of providers
 */
export function createRbacProviders(options: RbacModuleOptions): Provider[] {
  return [
    {
      provide: RBAC_OPTIONS_TOKEN,
      useValue: options,
    },
  ];
}

/**
 * Create providers for asynchronous RBAC module configuration.
 *
 * @param asyncOptions - Async configuration options
 * @returns Array of providers
 */
export function createRbacAsyncProviders(asyncOptions: RbacModuleAsyncOptions): Provider[] {
  const providers: Provider[] = [];

  if (asyncOptions.useFactory) {
    providers.push({
      provide: RBAC_OPTIONS_TOKEN,
      useFactory: asyncOptions.useFactory,
      inject: (asyncOptions.inject ?? []) as never[],
    });
  }

  if (asyncOptions.useClass) {
    providers.push(
      {
        provide: asyncOptions.useClass,
        useClass: asyncOptions.useClass,
      },
      {
        provide: RBAC_OPTIONS_TOKEN,
        useFactory: async (factory: RbacOptionsFactory) => factory.createRbacOptions(),
        inject: [asyncOptions.useClass],
      },
    );
  }

  if (asyncOptions.useExisting) {
    providers.push({
      provide: RBAC_OPTIONS_TOKEN,
      useFactory: async (factory: RbacOptionsFactory) => factory.createRbacOptions(),
      inject: [asyncOptions.useExisting],
    });
  }

  return providers;
}

/**
 * Default user extraction strategy.
 *
 * This strategy extracts user information from the standard locations:
 * - HTTP: request.user.id
 * - GraphQL: context.req.user.id
 * - WebSocket: client.user.id or client.handshake.user.id
 */
export const DefaultUserExtractionStrategy = {
  extractUserId(context: unknown): string | null {
    const user = extractUserFromAnyContext(context);
    return (user?.id as string | undefined) ?? null;
  },

  extractOrganizationId(context: unknown): string | null {
    const user = extractUserFromAnyContext(context);
    return (user?.organizationId as string | undefined) ?? null;
  },

  extractContext(context: unknown): Record<string, unknown> {
    const user = extractUserFromAnyContext(context);
    const request = extractRequestFromContext(context) as Record<string, unknown> | null;

    return {
      userId: user?.id,
      organizationId: user?.organizationId,
      ipAddress:
        (request?.ip as string | undefined) ??
        ((request?.connection as Record<string, unknown> | undefined)?.remoteAddress as
          | string
          | undefined),
      userAgent: (request?.headers as Record<string, unknown> | undefined)?.['user-agent'] as
        | string
        | undefined,
      requestId:
        (request?.id as string | undefined) ??
        ((request?.headers as Record<string, unknown> | undefined)?.['x-request-id'] as
          | string
          | undefined),
    };
  },
};

/**
 * Extract user object from various context types.
 */
function extractUserFromAnyContext(context: unknown): Record<string, unknown> | null {
  if (!context || typeof context !== 'object') {
    return null;
  }

  const ctx = context as Record<string, unknown>;

  // Direct user property
  if (ctx.user && typeof ctx.user === 'object') {
    return ctx.user as Record<string, unknown>;
  }

  // HTTP request
  if (ctx.request && typeof ctx.request === 'object') {
    const req = ctx.request as Record<string, unknown>;
    if (req.user && typeof req.user === 'object') {
      return req.user as Record<string, unknown>;
    }
  }

  // Shortened request (common in NestJS)
  if (ctx.req && typeof ctx.req === 'object') {
    const req = ctx.req as Record<string, unknown>;
    if (req.user && typeof req.user === 'object') {
      return req.user as Record<string, unknown>;
    }
  }

  // WebSocket client
  if (ctx.client && typeof ctx.client === 'object') {
    const client = ctx.client as Record<string, unknown>;
    if (client.user && typeof client.user === 'object') {
      return client.user as Record<string, unknown>;
    }
    if (client.handshake && typeof client.handshake === 'object') {
      const handshake = client.handshake as Record<string, unknown>;
      if (handshake.user && typeof handshake.user === 'object') {
        return handshake.user as Record<string, unknown>;
      }
    }
  }

  return null;
}

/**
 * Extract request object from context.
 */
function extractRequestFromContext(context: unknown): Record<string, unknown> | null {
  if (!context || typeof context !== 'object') {
    return null;
  }

  const ctx = context as Record<string, unknown>;

  if (ctx.request && typeof ctx.request === 'object') {
    return ctx.request as Record<string, unknown>;
  }

  if (ctx.req && typeof ctx.req === 'object') {
    return ctx.req as Record<string, unknown>;
  }

  return null;
}
