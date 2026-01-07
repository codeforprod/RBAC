import { SetMetadata, applyDecorators } from '@nestjs/common';
import { RBAC_METADATA, PermissionCheckMode } from '../types';

/**
 * Decorator to require ALL of the specified permissions (AND logic).
 *
 * The user must have every single permission in the array to access
 * the endpoint. This is useful for sensitive operations that require
 * multiple permission checks.
 *
 * @param permissions - Array of permission strings that are all required
 * @returns Method decorator
 *
 * @example Basic AND logic
 * ```typescript
 * @Controller('billing')
 * @UseGuards(JwtAuthGuard, RBACGuard)
 * export class BillingController {
 *   @Post('refund')
 *   @RequiresAll(['billing:read', 'billing:refund', 'transactions:write'])
 *   processRefund(@Body() dto: RefundDto) {
 *     // User must have ALL three permissions
 *     return this.billingService.refund(dto);
 *   }
 * }
 * ```
 *
 * @example Multi-step verification
 * ```typescript
 * @Delete('account')
 * @RequiresAll(['users:delete', 'admin:confirm', 'audit:log'])
 * deleteAccount(@Param('id') id: string) {
 *   // Requires multiple permission checks for safety
 *   return this.userService.deleteAccount(id);
 * }
 * ```
 *
 * @example Resource and action permissions
 * ```typescript
 * @Put(':id/publish')
 * @RequiresAll(['posts:update', 'posts:publish'])
 * publishPost(@Param('id') id: string) {
 *   // User needs both update and publish permissions
 *   return this.postsService.publish(id);
 * }
 * ```
 *
 * @see RequiresPermission - For single permission requirement
 * @see RequiresAny - For OR logic with multiple permissions
 */
export function RequiresAll(permissions: string[]): MethodDecorator & ClassDecorator {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    throw new Error('RequiresAll requires a non-empty array of permissions');
  }

  return applyDecorators(
    SetMetadata(RBAC_METADATA.PERMISSIONS, permissions),
    SetMetadata(RBAC_METADATA.CHECK_MODE, PermissionCheckMode.ALL),
  );
}
