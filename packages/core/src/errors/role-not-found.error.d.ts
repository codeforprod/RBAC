import { RBACError, RBACErrorContext } from './rbac.error';
export interface RoleNotFoundContext extends Partial<RBACErrorContext> {
  roleId?: string;
  roleName?: string;
  organizationId?: string | null;
  searchType?: 'id' | 'name';
  operation?: string;
}
export declare class RoleNotFoundError extends RBACError {
  readonly roleId?: string;
  readonly roleName?: string;
  readonly organizationId?: string | null;
  constructor(roleIdOrName: string, context?: Partial<RoleNotFoundContext>);
  private static buildMessage;
  static isRoleNotFound(error: unknown): error is RoleNotFoundError;
  static byName(name: string, organizationId?: string | null): RoleNotFoundError;
  static byId(id: string, organizationId?: string | null): RoleNotFoundError;
  static parentRole(parentRoleId: string, childRoleId: string): RoleNotFoundError;
  static forAssignment(roleId: string, userId: string): RoleNotFoundError;
  static multiple(roleIds: string[]): RoleNotFoundError;
  toHttpResponse(): {
    statusCode: number;
    error: string;
    message: string;
    roleId?: string;
    roleName?: string;
  };
}
//# sourceMappingURL=role-not-found.error.d.ts.map
