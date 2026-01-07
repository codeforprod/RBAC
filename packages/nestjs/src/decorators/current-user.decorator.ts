import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Property to extract from the user object.
 * Use null to get the entire user object.
 */
export type UserProperty = string | null;

/**
 * Extract the current user or a specific property from the request.
 *
 * This decorator provides a convenient way to access the authenticated user
 * in your route handlers. It works with HTTP requests, GraphQL resolvers,
 * and WebSocket gateways.
 *
 * @param property - Optional property to extract from the user object
 * @returns Parameter decorator
 *
 * @example Get entire user object
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) {
 *   return this.userService.getProfile(user.id);
 * }
 * ```
 *
 * @example Get specific property
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser('id') userId: string) {
 *   return this.userService.getProfile(userId);
 * }
 * ```
 *
 * @example With validation
 * ```typescript
 * @Get('settings')
 * getSettings(@CurrentUser() user: User) {
 *   if (!user) {
 *     throw new UnauthorizedException();
 *   }
 *   return this.settingsService.getForUser(user.id);
 * }
 * ```
 *
 * @example In GraphQL resolver
 * ```typescript
 * @Query(() => Profile)
 * profile(@CurrentUser() user: User) {
 *   return this.profileService.findByUserId(user.id);
 * }
 * ```
 *
 * @example WebSocket gateway
 * ```typescript
 * @SubscribeMessage('message')
 * handleMessage(
 *   @CurrentUser('id') userId: string,
 *   @MessageBody() data: MessageDto
 * ) {
 *   return this.chatService.sendMessage(userId, data);
 * }
 * ```
 */
export const CurrentUser = createParamDecorator<UserProperty>(
  (property: UserProperty, ctx: ExecutionContext) => {
    const user = extractUserFromContext(ctx);

    if (!user) {
      return null;
    }

    if (property) {
      return user[property] ?? null;
    }

    return user;
  },
);

/**
 * Extract user from various execution contexts.
 *
 * @param ctx - NestJS execution context
 * @returns User object or null
 */
function extractUserFromContext(ctx: ExecutionContext): Record<string, unknown> | null {
  const type = ctx.getType<string>();

  switch (type) {
    case 'http': {
      const request = ctx.switchToHttp().getRequest();
      return request.user ?? null;
    }

    case 'graphql': {
      // For GraphQL, the context is passed in the args
      const gqlContext = getGqlContext(ctx);
      if (!gqlContext) return null;

      // TypeScript needs explicit checks for unknown properties
      const contextAny = gqlContext as Record<string, unknown>;
      return (contextAny.req as Record<string, unknown> | undefined)?.user as Record<string, unknown> | undefined ??
             contextAny.user as Record<string, unknown> | undefined ??
             null;
    }

    case 'ws': {
      const client = ctx.switchToWs().getClient();
      // WebSocket clients typically store user in handshake or data
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

/**
 * Get GraphQL context from execution context.
 * This handles the difference between various GraphQL implementations.
 *
 * @param ctx - NestJS execution context
 * @returns GraphQL context object
 */
function getGqlContext(ctx: ExecutionContext): Record<string, unknown> | null {
  try {
    // Try to get the GraphQL context
    const args = ctx.getArgs();

    // Apollo Server style: [root, args, context, info]
    if (args.length >= 3 && args[2] && typeof args[2] === 'object') {
      return args[2] as Record<string, unknown>;
    }

    // Mercurius style: [root, args, context, info] but context might be different
    for (const arg of args) {
      if (arg && typeof arg === 'object' && ('req' in arg || 'request' in arg)) {
        return arg as Record<string, unknown>;
      }
    }

    return null;
  } catch {
    return null;
  }
}
