import { IPermission } from './permission.interface';
export interface IRole {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  permissions: IPermission[];
  parentRoles?: string[];
  isSystem?: boolean;
  isActive: boolean;
  organizationId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}
export interface IRoleHierarchy {
  getInheritedPermissions(roleId: string): Promise<IPermission[]>;
  getParentRoles(roleId: string, maxDepth?: number): Promise<IRole[]>;
  getChildRoles(roleId: string): Promise<IRole[]>;
  hasCircularDependency(roleId: string): Promise<boolean>;
  validateHierarchy(childRoleId: string, parentRoleId: string): Promise<boolean>;
  getRoleDepth(roleId: string): Promise<number>;
  getHierarchyTree(rootRoleId: string): Promise<IRoleHierarchyTree>;
}
export interface IRoleHierarchyTree {
  role: IRole;
  children: IRoleHierarchyTree[];
  depth: number;
}
export interface ICreateRoleOptions {
  name: string;
  displayName?: string;
  description?: string;
  parentRoles?: string[];
  permissionIds?: string[];
  isSystem?: boolean;
  organizationId?: string | null;
  metadata?: Record<string, unknown>;
}
export interface IUpdateRoleOptions {
  displayName?: string;
  description?: string;
  parentRoles?: string[];
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}
//# sourceMappingURL=role.interface.d.ts.map
