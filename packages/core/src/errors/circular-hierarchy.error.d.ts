import { RBACError, RBACErrorContext } from './rbac.error';
export interface CircularHierarchyContext extends Partial<RBACErrorContext> {
  roleId: string;
  targetRoleId: string;
  chain: string[];
  depth?: number;
  maxDepth?: number;
}
export declare class CircularHierarchyError extends RBACError {
  readonly roleId: string;
  readonly targetRoleId: string;
  readonly chain: string[];
  readonly depth?: number;
  constructor(
    roleId: string,
    targetRoleId: string,
    chain: string[],
    context?: Partial<Omit<CircularHierarchyContext, 'roleId' | 'targetRoleId' | 'chain'>>,
  );
  private static buildMessage;
  static isCircularHierarchy(error: unknown): error is CircularHierarchyError;
  static selfReference(roleId: string): CircularHierarchyError;
  static direct(roleA: string, roleB: string): CircularHierarchyError;
  static maxDepthExceeded(
    roleId: string,
    chain: string[],
    maxDepth: number,
  ): CircularHierarchyError;
  getVisualChain(): string;
  getInvolvedRoles(): string[];
  toHttpResponse(): {
    statusCode: number;
    error: string;
    message: string;
    roleId: string;
    targetRoleId: string;
    chain: string[];
  };
}
//# sourceMappingURL=circular-hierarchy.error.d.ts.map
