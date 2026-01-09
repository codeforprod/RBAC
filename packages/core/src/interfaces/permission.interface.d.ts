export interface IPermission {
  id: string;
  resource: string;
  action: string;
  scope?: string;
  conditions?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  description?: string;
  createdAt?: Date;
}
export interface IPermissionMatcher {
  matches(
    required: string | string[],
    available: IPermission[],
    context?: Record<string, unknown>,
  ): boolean;
  matchesWithWildcard(pattern: string, permissions: IPermission[]): boolean;
  parse(permission: string): {
    resource: string;
    action: string;
    scope?: string;
  };
  normalize(permission: string | Partial<IPermission>): IPermission;
}
export interface IPermissionCheckResult {
  allowed: boolean;
  permission: string;
  reason?: string;
  matchedPermission?: IPermission;
  context?: Record<string, unknown>;
}
//# sourceMappingURL=permission.interface.d.ts.map
