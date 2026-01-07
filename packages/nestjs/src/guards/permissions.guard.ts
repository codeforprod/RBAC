import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RBACEngine } from '@holocron/rbac-core';

/**
 * Guard that checks if user has required permissions
 *
 * Usage:
 * ```typescript
 * @UseGuards(PermissionsGuard)
 * @Permissions('users:create', 'users:update')
 * async createUser() { }
 * ```
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacEngine: RBACEngine,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      return false; // No authenticated user
    }

    // Check if user has ALL required permissions
    return await this.rbacEngine.canAll(user.id, requiredPermissions);
  }
}
