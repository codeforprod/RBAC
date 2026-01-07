import { RBACError, RBACErrorCode, RBACErrorContext } from './rbac.error';

/**
 * Context specific to circular hierarchy errors.
 */
export interface CircularHierarchyContext extends Partial<RBACErrorContext> {
  /** The role where the circular dependency was detected */
  roleId: string;

  /** The role that would create the circular reference */
  targetRoleId: string;

  /** The chain of roles that form the circular dependency */
  chain: string[];

  /** Depth at which the circular dependency was detected */
  depth?: number;

  /** Maximum allowed depth */
  maxDepth?: number;
}

/**
 * Error thrown when a circular dependency is detected in the role hierarchy.
 * Circular dependencies occur when:
 * - Role A inherits from Role B, and Role B inherits from Role A
 * - A longer chain creates a loop (A -> B -> C -> A)
 * - A role attempts to inherit from itself
 *
 * @example
 * ```typescript
 * // Direct circular reference
 * throw new CircularHierarchyError('admin', 'superadmin', ['admin', 'superadmin', 'admin']);
 *
 * // Catching the error
 * try {
 *   await rbac.updateRole('editor', { parentRoles: ['admin'] });
 * } catch (error) {
 *   if (error instanceof CircularHierarchyError) {
 *     console.error('Circular dependency detected:', error.chain.join(' -> '));
 *   }
 * }
 * ```
 */
export class CircularHierarchyError extends RBACError {
  /** The role where the circular dependency was detected */
  public readonly roleId: string;

  /** The role that would create the circular reference */
  public readonly targetRoleId: string;

  /** The chain of roles that form the circular dependency */
  public readonly chain: string[];

  /** Depth at which the circular dependency was detected */
  public readonly depth?: number;

  /**
   * Creates a new CircularHierarchyError.
   *
   * @param roleId - The role ID where the check started
   * @param targetRoleId - The role ID that creates the circular reference
   * @param chain - The role chain showing the circular dependency
   * @param context - Additional context
   *
   * @example
   * ```typescript
   * throw new CircularHierarchyError(
   *   'editor',
   *   'admin',
   *   ['editor', 'manager', 'admin', 'editor']
   * );
   * ```
   */
  constructor(
    roleId: string,
    targetRoleId: string,
    chain: string[],
    context: Partial<Omit<CircularHierarchyContext, 'roleId' | 'targetRoleId' | 'chain'>> = {}
  ) {
    const message = CircularHierarchyError.buildMessage(roleId, targetRoleId, chain);

    super(message, RBACErrorCode.CIRCULAR_HIERARCHY, {
      roleId,
      ...context,
      metadata: {
        ...context.metadata,
        targetRoleId,
        chain,
        chainLength: chain.length,
        visualChain: chain.join(' -> '),
      },
    });

    this.roleId = roleId;
    this.targetRoleId = targetRoleId;
    this.chain = chain;
    this.depth = context.depth;
  }

  /**
   * Build a human-readable error message.
   *
   * @param roleId - The starting role ID
   * @param targetRoleId - The role that creates the circular reference
   * @param chain - The dependency chain
   * @returns Formatted error message
   */
  private static buildMessage(
    roleId: string,
    targetRoleId: string,
    chain: string[]
  ): string {
    if (roleId === targetRoleId) {
      return `Circular hierarchy detected: Role '${roleId}' cannot inherit from itself`;
    }

    const chainStr = chain.join(' -> ');
    return `Circular hierarchy detected: Adding '${targetRoleId}' as parent of '${roleId}' would create cycle: ${chainStr}`;
  }

  /**
   * Check if an error is a CircularHierarchyError.
   *
   * @param error - Error to check
   * @returns True if the error is a CircularHierarchyError
   */
  static isCircularHierarchy(error: unknown): error is CircularHierarchyError {
    return error instanceof CircularHierarchyError;
  }

  /**
   * Create a CircularHierarchyError for self-reference.
   *
   * @param roleId - The role ID that references itself
   * @returns A new CircularHierarchyError
   *
   * @example
   * ```typescript
   * throw CircularHierarchyError.selfReference('admin');
   * // "Circular hierarchy detected: Role 'admin' cannot inherit from itself"
   * ```
   */
  static selfReference(roleId: string): CircularHierarchyError {
    return new CircularHierarchyError(roleId, roleId, [roleId, roleId]);
  }

  /**
   * Create a CircularHierarchyError for a direct circular reference.
   * This is when Role A is parent of Role B and Role B is parent of Role A.
   *
   * @param roleA - First role in the circular reference
   * @param roleB - Second role in the circular reference
   * @returns A new CircularHierarchyError
   *
   * @example
   * ```typescript
   * throw CircularHierarchyError.direct('admin', 'superadmin');
   * // Creates chain: ['admin', 'superadmin', 'admin']
   * ```
   */
  static direct(roleA: string, roleB: string): CircularHierarchyError {
    return new CircularHierarchyError(roleA, roleB, [roleA, roleB, roleA]);
  }

  /**
   * Create a CircularHierarchyError when max hierarchy depth is exceeded.
   *
   * @param roleId - The role where depth was exceeded
   * @param chain - The chain that was traversed
   * @param maxDepth - The maximum allowed depth
   * @returns A new CircularHierarchyError
   *
   * @example
   * ```typescript
   * throw CircularHierarchyError.maxDepthExceeded(
   *   'leaf-role',
   *   ['root', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'l10', 'leaf-role'],
   *   10
   * );
   * ```
   */
  static maxDepthExceeded(
    roleId: string,
    chain: string[],
    maxDepth: number
  ): CircularHierarchyError {
    const error = new CircularHierarchyError(roleId, chain[0] ?? roleId, chain, {
      depth: chain.length,
      maxDepth,
    });

    // Override the message for max depth scenario
    Object.defineProperty(error, 'message', {
      value: `Maximum hierarchy depth (${maxDepth}) exceeded for role '${roleId}'. ` +
        `Chain length: ${chain.length}. This may indicate a circular dependency or excessively deep hierarchy.`,
      writable: false,
    });

    return error;
  }

  /**
   * Get a visual representation of the circular chain.
   *
   * @returns ASCII art representation of the chain
   *
   * @example
   * ```typescript
   * const error = new CircularHierarchyError('a', 'd', ['a', 'b', 'c', 'd', 'a']);
   * console.log(error.getVisualChain());
   * // Output:
   * // a -> b -> c -> d -> a (CYCLE!)
   * ```
   */
  getVisualChain(): string {
    const lastIndex = this.chain.length - 1;
    const parts = this.chain.map((role, index) => {
      if (index === lastIndex && this.chain[0] === role) {
        return `${role} (CYCLE!)`;
      }
      return role;
    });
    return parts.join(' -> ');
  }

  /**
   * Get the roles involved in the circular dependency (unique list).
   *
   * @returns Array of unique role IDs in the cycle
   */
  getInvolvedRoles(): string[] {
    return [...new Set(this.chain)];
  }

  /**
   * Convert to a format suitable for HTTP error responses.
   *
   * @returns Object suitable for JSON response
   */
  toHttpResponse(): {
    statusCode: number;
    error: string;
    message: string;
    roleId: string;
    targetRoleId: string;
    chain: string[];
  } {
    return {
      statusCode: 409, // Conflict
      error: 'Conflict',
      message: this.message,
      roleId: this.roleId,
      targetRoleId: this.targetRoleId,
      chain: this.chain,
    };
  }
}
