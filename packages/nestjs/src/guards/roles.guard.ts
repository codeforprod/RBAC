import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RBACEngine } from '@prodforcode/rbac-core';

/**
 * Guard that checks if user has required roles
 *
 * Usage:
 * ```typescript
 * @UseGuards(RolesGuard)
 * @Roles('admin', 'superAdmin')
 * async deleteUser() { }
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacEngine: RBACEngine,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      return false; // No authenticated user
    }

    // Check if user has ANY of the required roles
    for (const roleId of requiredRoles) {
      const hasRole = await this.rbacEngine.hasRole(user.id, roleId);
      if (hasRole) {
        return true;
      }
    }
    return false;
  }
}
