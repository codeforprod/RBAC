import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for a route
 *
 * @param permissions - Array of permission strings required to access the route
 *
 * @example
 * ```typescript
 * @Permissions('users:create', 'users:update')
 * @Post('users')
 * async createUser() { }
 * ```
 */
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
