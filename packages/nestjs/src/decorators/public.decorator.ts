import { SetMetadata } from '@nestjs/common';
import { RBAC_METADATA } from '../types';

/**
 * Decorator to mark an endpoint as public (no RBAC check required).
 *
 * Use this decorator when you want to skip RBAC checks for specific
 * endpoints, such as login, registration, or public API endpoints.
 *
 * When an endpoint is marked as @Public(), the RBACGuard will allow
 * the request to proceed without checking permissions or roles.
 *
 * @returns Method or class decorator
 *
 * @example Public login endpoint
 * ```typescript
 * @Controller('auth')
 * export class AuthController {
 *   @Post('login')
 *   @Public()
 *   login(@Body() dto: LoginDto) {
 *     return this.authService.login(dto);
 *   }
 *
 *   @Post('register')
 *   @Public()
 *   register(@Body() dto: RegisterDto) {
 *     return this.authService.register(dto);
 *   }
 * }
 * ```
 *
 * @example Public health check
 * ```typescript
 * @Controller('health')
 * @Public()
 * export class HealthController {
 *   @Get()
 *   check() {
 *     return { status: 'ok' };
 *   }
 *
 *   @Get('detailed')
 *   detailedCheck() {
 *     return this.healthService.getDetailedStatus();
 *   }
 * }
 * ```
 *
 * @example Mixed public and protected endpoints
 * ```typescript
 * @Controller('posts')
 * @UseGuards(JwtAuthGuard, RBACGuard)
 * export class PostsController {
 *   @Get()
 *   @Public()  // Anyone can read posts
 *   findAll() {
 *     return this.postsService.findAll();
 *   }
 *
 *   @Post()
 *   @RequiresPermission('posts:create')  // Only authenticated users can create
 *   create(@Body() dto: CreatePostDto) {
 *     return this.postsService.create(dto);
 *   }
 * }
 * ```
 *
 * @note When using global RBAC, all endpoints require authentication
 * unless explicitly marked with @Public()
 *
 * @see SkipRbac - Alternative that also skips the guard entirely
 */
export function Public(): MethodDecorator & ClassDecorator {
  return SetMetadata(RBAC_METADATA.IS_PUBLIC, true);
}

/**
 * Alias for @Public() decorator.
 *
 * Some teams prefer "AllowAnonymous" naming convention (similar to .NET).
 *
 * @example
 * ```typescript
 * @Get('public-data')
 * @AllowAnonymous()
 * getPublicData() {
 *   return this.service.getPublicData();
 * }
 * ```
 */
export const AllowAnonymous = Public;

/**
 * Decorator to completely skip RBAC processing for an endpoint.
 *
 * Unlike @Public(), which still allows the guard to run but permits
 * unauthenticated access, @SkipRbac() tells the guard to completely
 * bypass RBAC processing.
 *
 * Use this sparingly - it's mainly useful for internal or system endpoints
 * that should never have RBAC applied.
 *
 * @returns Method or class decorator
 *
 * @example Internal system endpoint
 * ```typescript
 * @Controller('internal')
 * export class InternalController {
 *   @Get('metrics')
 *   @SkipRbac()
 *   getMetrics() {
 *     return this.metricsService.collect();
 *   }
 * }
 * ```
 */
export function SkipRbac(): MethodDecorator & ClassDecorator {
  return SetMetadata(RBAC_METADATA.SKIP_RBAC, true);
}
