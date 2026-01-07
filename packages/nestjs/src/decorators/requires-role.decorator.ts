import { SetMetadata, applyDecorators } from '@nestjs/common';
import { RBAC_METADATA, PermissionCheckMode } from '../types';

/**
 * Decorator to require a specific role for accessing an endpoint.
 *
 * Role-based access control is useful when you want to restrict access
 * based on the user's role rather than specific permissions.
 *
 * @param role - The role name or ID required
 * @returns Method decorator
 *
 * @example Basic role requirement
 * ```typescript
 * @Controller('admin')
 * @UseGuards(JwtAuthGuard, RBACGuard)
 * export class AdminController {
 *   @Get('dashboard')
 *   @RequiresRole('admin')
 *   getDashboard() {
 *     return this.adminService.getDashboard();
 *   }
 * }
 * ```
 *
 * @example Controller-level role
 * ```typescript
 * @Controller('moderator')
 * @UseGuards(JwtAuthGuard, RBACGuard)
 * @RequiresRole('moderator')
 * export class ModeratorController {
 *   @Get('reports')
 *   getReports() {
 *     // All methods require 'moderator' role
 *     return this.moderatorService.getReports();
 *   }
 * }
 * ```
 *
 * @see RequiresPermission - For permission-based access control
 * @see RequiresAny - For requiring any of multiple roles/permissions
 */
export function RequiresRole(role: string): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(RBAC_METADATA.ROLES, [role]),
    SetMetadata(RBAC_METADATA.CHECK_MODE, PermissionCheckMode.ALL),
  );
}

/**
 * Decorator to require multiple roles (ALL must be present).
 *
 * Use this when a user must have all specified roles to access an endpoint.
 *
 * @param roles - Array of role names/IDs that are all required
 * @returns Method decorator
 *
 * @example Require multiple roles
 * ```typescript
 * @Post('publish')
 * @RequiresRoles(['editor', 'publisher'])
 * publish(@Body() dto: PublishDto) {
 *   // User must have both 'editor' AND 'publisher' roles
 *   return this.contentService.publish(dto);
 * }
 * ```
 */
export function RequiresRoles(roles: string[]): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(RBAC_METADATA.ROLES, roles),
    SetMetadata(RBAC_METADATA.CHECK_MODE, PermissionCheckMode.ALL),
  );
}

/**
 * Decorator to require any of the specified roles (OR logic).
 *
 * Use this when a user needs only one of the specified roles.
 *
 * @param roles - Array of role names/IDs where at least one is required
 * @returns Method decorator
 *
 * @example Require any role
 * ```typescript
 * @Get('reports')
 * @RequiresAnyRole(['admin', 'moderator', 'analyst'])
 * getReports() {
 *   // User needs any one of these roles
 *   return this.reportService.getAll();
 * }
 * ```
 */
export function RequiresAnyRole(roles: string[]): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(RBAC_METADATA.ROLES, roles),
    SetMetadata(RBAC_METADATA.CHECK_MODE, PermissionCheckMode.ANY),
  );
}
