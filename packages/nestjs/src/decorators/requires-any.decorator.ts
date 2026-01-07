import { SetMetadata, applyDecorators } from '@nestjs/common';
import { RBAC_METADATA, PermissionCheckMode } from '../types';

/**
 * Decorator to require ANY of the specified permissions (OR logic).
 *
 * The user must have at least one of the specified permissions to access
 * the endpoint. This is useful for endpoints that can be accessed by users
 * with different permission sets.
 *
 * @param permissions - Array of permission strings where at least one is required
 * @returns Method decorator
 *
 * @example Basic OR logic
 * ```typescript
 * @Controller('posts')
 * @UseGuards(JwtAuthGuard, RBACGuard)
 * export class PostsController {
 *   @Get()
 *   @RequiresAny(['posts:read', 'posts:admin', 'content:view'])
 *   findAll() {
 *     // User with any of these permissions can access
 *     return this.postsService.findAll();
 *   }
 * }
 * ```
 *
 * @example Multiple access paths
 * ```typescript
 * @Get(':id')
 * @RequiresAny(['posts:read', 'posts:read:own'])
 * findOne(@Param('id') id: string) {
 *   // Either permission grants access
 *   return this.postsService.findOne(id);
 * }
 * ```
 *
 * @example Admin or specific permission
 * ```typescript
 * @Delete(':id')
 * @RequiresAny(['admin:**', 'posts:delete'])
 * delete(@Param('id') id: string) {
 *   // Admins or users with delete permission can access
 *   return this.postsService.delete(id);
 * }
 * ```
 *
 * @see RequiresPermission - For single permission requirement
 * @see RequiresAll - For AND logic with multiple permissions
 */
export function RequiresAny(permissions: string[]): MethodDecorator & ClassDecorator {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    throw new Error('RequiresAny requires a non-empty array of permissions');
  }

  return applyDecorators(
    SetMetadata(RBAC_METADATA.PERMISSIONS, permissions),
    SetMetadata(RBAC_METADATA.CHECK_MODE, PermissionCheckMode.ANY),
  );
}
