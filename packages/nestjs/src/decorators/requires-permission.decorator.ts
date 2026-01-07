import { SetMetadata, applyDecorators } from '@nestjs/common';
import { RBAC_METADATA, PermissionCheckMode } from '../types';

/**
 * Decorator to require a specific permission for accessing an endpoint.
 *
 * The permission check is performed against the user's effective permissions,
 * which includes permissions from all assigned roles and inherited roles.
 *
 * Permission format: `resource:action` or `resource:action:scope`
 *
 * @param permission - The permission string required (e.g., 'users:read', 'posts:update:own')
 * @returns Method decorator
 *
 * @example Basic permission requirement
 * ```typescript
 * @Controller('users')
 * @UseGuards(JwtAuthGuard, RBACGuard)
 * export class UsersController {
 *   @Get()
 *   @RequiresPermission('users:read')
 *   findAll() {
 *     return this.usersService.findAll();
 *   }
 *
 *   @Post()
 *   @RequiresPermission('users:create')
 *   create(@Body() dto: CreateUserDto) {
 *     return this.usersService.create(dto);
 *   }
 * }
 * ```
 *
 * @example With scope
 * ```typescript
 * @Patch(':id')
 * @RequiresPermission('users:update:own')
 * updateOwn(@Param('id') id: string, @Body() dto: UpdateUserDto) {
 *   // User can only update their own profile
 *   return this.usersService.update(id, dto);
 * }
 * ```
 *
 * @example Wildcard permission
 * ```typescript
 * @Delete(':id')
 * @RequiresPermission('admin:**')
 * deleteAny(@Param('id') id: string) {
 *   // Requires admin super permissions
 *   return this.usersService.delete(id);
 * }
 * ```
 *
 * @see RequiresAny - For OR logic with multiple permissions
 * @see RequiresAll - For AND logic with multiple permissions
 */
export function RequiresPermission(permission: string): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(RBAC_METADATA.PERMISSIONS, [permission]),
    SetMetadata(RBAC_METADATA.CHECK_MODE, PermissionCheckMode.ALL),
  );
}
