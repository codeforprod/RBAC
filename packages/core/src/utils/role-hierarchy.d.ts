import { IRole, IRoleHierarchy, IRoleHierarchyTree } from '../interfaces/role.interface';
import { IPermission } from '../interfaces/permission.interface';
import { IRBACAdapter } from '../interfaces/adapter.interface';
import { IRBACCache } from '../interfaces/cache.interface';
import { HierarchyOptions } from '../types/options.types';
export interface HierarchyResolutionResult {
  role: IRole;
  parentRoles: IRole[];
  permissions: IPermission[];
  depth: number;
  ancestorChain: string[];
  fromCache: boolean;
}
export declare class RoleHierarchyResolver implements IRoleHierarchy {
  private readonly adapter;
  private readonly cache?;
  private readonly options;
  constructor(adapter: IRBACAdapter, cache?: IRBACCache, options?: Partial<HierarchyOptions>);
  getInheritedPermissions(roleId: string): Promise<IPermission[]>;
  getParentRoles(roleId: string, maxDepth?: number): Promise<IRole[]>;
  getChildRoles(roleId: string): Promise<IRole[]>;
  hasCircularDependency(roleId: string): Promise<boolean>;
  validateHierarchy(childRoleId: string, parentRoleId: string): Promise<boolean>;
  getRoleDepth(roleId: string): Promise<number>;
  getHierarchyTree(rootRoleId: string): Promise<IRoleHierarchyTree>;
  resolveHierarchy(roleId: string): Promise<HierarchyResolutionResult>;
  invalidateCache(roleId: string): Promise<void>;
  private getAncestorIds;
  private collectParentRoles;
  private detectCircle;
  private buildTree;
}
export declare const hierarchyUtils: {
  flattenTree(tree: IRoleHierarchyTree): IRole[];
  getMaxDepth(tree: IRoleHierarchyTree): number;
  findInTree(tree: IRoleHierarchyTree, roleId: string): IRoleHierarchyTree | undefined;
  getPathToRole(tree: IRoleHierarchyTree, roleId: string): IRole[];
};
//# sourceMappingURL=role-hierarchy.d.ts.map
