/**
 * @fileoverview RBAC Decorators for NestJS
 *
 * This module exports all decorators for declarative permission and role
 * requirements in NestJS controllers and resolvers.
 *
 * @packageDocumentation
 *
 * @example Basic usage
 * ```typescript
 * import {
 *   RequiresPermission,
 *   RequiresRole,
 *   RequiresAny,
 *   RequiresAll,
 *   CurrentUser,
 *   Public,
 * } from '@holocron/rbac-nestjs';
 *
 * @Controller('users')
 * @UseGuards(JwtAuthGuard, RBACGuard)
 * export class UsersController {
 *   @Get()
 *   @RequiresPermission('users:read')
 *   findAll(@CurrentUser('id') userId: string) {
 *     return this.usersService.findAll();
 *   }
 *
 *   @Post('login')
 *   @Public()
 *   login(@Body() dto: LoginDto) {
 *     return this.authService.login(dto);
 *   }
 * }
 * ```
 */

export { RequiresPermission } from './requires-permission.decorator';
export { RequiresRole, RequiresRoles, RequiresAnyRole } from './requires-role.decorator';
export { RequiresAny } from './requires-any.decorator';
export { RequiresAll } from './requires-all.decorator';
export { CurrentUser, UserProperty } from './current-user.decorator';
export { Public, AllowAnonymous, SkipRbac } from './public.decorator';
