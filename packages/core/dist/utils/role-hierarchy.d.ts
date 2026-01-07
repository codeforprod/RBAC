import { IRole, IRoleHierarchy, IRoleHierarchyTree } from '../interfaces/role.interface';
import { IPermission } from '../interfaces/permission.interface';
import { IRBACAdapter } from '../interfaces/adapter.interface';
import { IRBACCache } from '../interfaces/cache.interface';
import { HierarchyOptions } from '../types/options.types';
/**
 * Result of resolving a role hierarchy.
 */
export interface HierarchyResolutionResult {
    /** The role being resolved */
    role: IRole;
    /** All parent roles (in resolution order) */
    parentRoles: IRole[];
    /** All unique permissions (direct + inherited) */
    permissions: IPermission[];
    /** Depth of the hierarchy */
    depth: number;
    /** Chain of role IDs from root to this role */
    ancestorChain: string[];
    /** Whether this came from cache */
    fromCache: boolean;
}
/**
 * Role hierarchy resolver that handles parent-child relationships.
 *
 * This class provides:
 * - Recursive parent role resolution
 * - Circular dependency detection
 * - Permission inheritance aggregation
 * - Hierarchy tree generation
 * - Caching integration
 *
 * @example
 * ```typescript
 * const hierarchy = new RoleHierarchyResolver(adapter, cache);
 *
 * // Get all inherited permissions for a role
 * const permissions = await hierarchy.getInheritedPermissions('editor-role-id');
 *
 * // Get all parent roles
 * const parents = await hierarchy.getParentRoles('editor-role-id');
 *
 * // Check for circular dependency before adding parent
 * const isValid = await hierarchy.validateHierarchy('child-role', 'parent-role');
 * ```
 */
export declare class RoleHierarchyResolver implements IRoleHierarchy {
    private readonly adapter;
    private readonly cache?;
    private readonly options;
    /**
     * Creates a new RoleHierarchyResolver.
     *
     * @param adapter - Database adapter
     * @param cache - Optional cache implementation
     * @param options - Hierarchy options
     */
    constructor(adapter: IRBACAdapter, cache?: IRBACCache, options?: Partial<HierarchyOptions>);
    /**
     * Get all permissions for a role, including inherited permissions from parent roles.
     *
     * @param roleId - The role ID
     * @returns Array of all permissions (direct + inherited)
     *
     * @example
     * ```typescript
     * // Get all permissions including inherited ones
     * const permissions = await hierarchy.getInheritedPermissions('editor');
     * console.log(`Editor has ${permissions.length} total permissions`);
     * ```
     */
    getInheritedPermissions(roleId: string): Promise<IPermission[]>;
    /**
     * Get all parent roles for a given role, recursively.
     *
     * @param roleId - The role ID
     * @param maxDepth - Maximum depth to traverse
     * @returns Array of parent roles in hierarchy order (closest first)
     *
     * @example
     * ```typescript
     * const parents = await hierarchy.getParentRoles('junior-editor', 5);
     * for (const parent of parents) {
     *   console.log(`Parent: ${parent.name}`);
     * }
     * ```
     */
    getParentRoles(roleId: string, maxDepth?: number): Promise<IRole[]>;
    /**
     * Get all child roles for a given role.
     *
     * @param roleId - The role ID
     * @returns Array of child roles
     */
    getChildRoles(roleId: string): Promise<IRole[]>;
    /**
     * Check if a role hierarchy contains circular dependencies.
     *
     * @param roleId - The role ID to check
     * @returns True if circular dependency exists
     */
    hasCircularDependency(roleId: string): Promise<boolean>;
    /**
     * Validate that a new parent relationship won't create a circular dependency.
     *
     * @param childRoleId - The child role ID
     * @param parentRoleId - The proposed parent role ID
     * @returns True if the relationship is valid
     *
     * @example
     * ```typescript
     * const canAdd = await hierarchy.validateHierarchy('editor', 'admin');
     * if (!canAdd) {
     *   throw new Error('Adding this parent would create a circular dependency');
     * }
     * ```
     */
    validateHierarchy(childRoleId: string, parentRoleId: string): Promise<boolean>;
    /**
     * Get the depth of a role in the hierarchy.
     *
     * @param roleId - The role ID
     * @returns Depth level (0 for root roles)
     */
    getRoleDepth(roleId: string): Promise<number>;
    /**
     * Get all roles in a hierarchy tree starting from a root role.
     *
     * @param rootRoleId - The root role ID
     * @returns Tree structure of roles
     */
    getHierarchyTree(rootRoleId: string): Promise<IRoleHierarchyTree>;
    /**
     * Resolve the complete hierarchy for a role.
     *
     * @param roleId - The role ID
     * @returns Complete hierarchy resolution result
     */
    resolveHierarchy(roleId: string): Promise<HierarchyResolutionResult>;
    /**
     * Invalidate cached hierarchy data for a role.
     *
     * @param roleId - The role ID
     */
    invalidateCache(roleId: string): Promise<void>;
    /**
     * Get all ancestor IDs (parent, grandparent, etc.) for a role.
     *
     * @param roleId - The role ID
     * @returns Set of ancestor role IDs
     */
    private getAncestorIds;
    /**
     * Recursively collect parent roles.
     */
    private collectParentRoles;
    /**
     * Detect circular dependency using DFS.
     */
    private detectCircle;
    /**
     * Build a hierarchy tree recursively.
     */
    private buildTree;
}
/**
 * Utility functions for role hierarchy operations.
 */
export declare const hierarchyUtils: {
    /**
     * Flatten a hierarchy tree into an array of roles.
     *
     * @param tree - Hierarchy tree
     * @returns Flat array of roles
     */
    flattenTree(tree: IRoleHierarchyTree): IRole[];
    /**
     * Get the maximum depth of a hierarchy tree.
     *
     * @param tree - Hierarchy tree
     * @returns Maximum depth
     */
    getMaxDepth(tree: IRoleHierarchyTree): number;
    /**
     * Find a role in a hierarchy tree.
     *
     * @param tree - Hierarchy tree
     * @param roleId - Role ID to find
     * @returns The tree node or undefined
     */
    findInTree(tree: IRoleHierarchyTree, roleId: string): IRoleHierarchyTree | undefined;
    /**
     * Get path from root to a specific role in the tree.
     *
     * @param tree - Hierarchy tree
     * @param roleId - Target role ID
     * @returns Array of roles from root to target
     */
    getPathToRole(tree: IRoleHierarchyTree, roleId: string): IRole[];
};
//# sourceMappingURL=role-hierarchy.d.ts.map