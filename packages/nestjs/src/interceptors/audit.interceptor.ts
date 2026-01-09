import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Optional,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { IAuditLogger } from '@prodforcode/rbac-core';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Interceptor that logs authorization events
 *
 * Usage:
 * ```typescript
 * @UseInterceptors(AuditInterceptor)
 * @Controller('users')
 * export class UsersController { }
 * ```
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly auditLogger?: IAuditLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.auditLogger) {
      // Audit logging disabled, pass through
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get required permissions and roles
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      handler,
      controller,
    ]);
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      handler,
      controller,
    ]);

    const auditContext = {
      userId: user?.id || 'anonymous',
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      path: request.path,
      method: request.method,
      controller: controller.name,
      handler: handler.name,
      requiredPermissions,
      requiredRoles,
    };

    return next.handle().pipe(
      tap(() => {
        // Success - log permission check
        if (requiredPermissions && requiredPermissions.length > 0) {
          requiredPermissions.forEach((permission) => {
            this.auditLogger!.logPermissionCheck(user?.id || 'anonymous', permission, true, {
              resource: auditContext.path,
              ipAddress: auditContext.ip,
              userAgent: auditContext.userAgent,
            }).catch((error: Error) => {
              console.error('Failed to log audit event:', error);
            });
          });
        }
      }),
      catchError((error: Error) => {
        // Error - log permission denied if it's an authorization error
        if (error.name === 'PermissionDeniedError' || (error as any).status === 403) {
          if (requiredPermissions && requiredPermissions.length > 0) {
            requiredPermissions.forEach((permission) => {
              this.auditLogger!.logPermissionCheck(user?.id || 'anonymous', permission, false, {
                resource: auditContext.path,
                ipAddress: auditContext.ip,
                userAgent: auditContext.userAgent,
              }).catch((auditError: Error) => {
                console.error('Failed to log audit event:', auditError);
              });
            });
          }
        }

        return throwError(() => error);
      }),
    );
  }
}
