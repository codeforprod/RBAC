import { RBACError, RBACErrorContext } from './rbac.error';
export interface PermissionDeniedContext extends Partial<RBACErrorContext> {
  permission: string;
  resource?: string;
  action?: string;
  scope?: string;
  userId?: string;
  checkedRoles?: string[];
  denialReason?: string;
}
export declare class PermissionDeniedError extends RBACError {
  readonly permission: string;
  readonly resource?: string;
  readonly action?: string;
  readonly userId?: string;
  constructor(permission: string, userId?: string, context?: Partial<PermissionDeniedContext>);
  private static parsePermission;
  private static buildMessage;
  static isPermissionDenied(error: unknown): error is PermissionDeniedError;
  static forResource(
    permission: string,
    userId: string,
    resource: string,
    resourceId?: string,
  ): PermissionDeniedError;
  static forOwnership(
    permission: string,
    userId: string,
    resourceOwnerId: string,
  ): PermissionDeniedError;
  static forMissingRoles(
    permission: string,
    userId: string,
    requiredRoles: string[],
    userRoles: string[],
  ): PermissionDeniedError;
  toHttpResponse(): {
    statusCode: number;
    error: string;
    message: string;
    permission: string;
    resource?: string;
  };
}
//# sourceMappingURL=permission-denied.error.d.ts.map
