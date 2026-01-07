/**
 * Unit tests for RoleHierarchyResolver
 *
 * Tests role hierarchy resolution including:
 * - Parent role resolution
 * - Permission inheritance
 * - Circular dependency detection
 * - Hierarchy validation
 * - Caching integration
 */

import { RoleHierarchyResolver, hierarchyUtils } from '../../../src/utils/role-hierarchy';
import { IRBACAdapter } from '../../../src/interfaces/adapter.interface';
import { IRBACCache } from '../../../src/interfaces/cache.interface';
import { IRole } from '../../../src/interfaces/role.interface';
import { IPermission } from '../../../src/interfaces/permission.interface';
import { CircularHierarchyError } from '../../../src/errors/circular-hierarchy.error';
import { RoleNotFoundError } from '../../../src/errors/role-not-found.error';

describe('RoleHierarchyResolver', () => {
  let mockAdapter: jest.Mocked<IRBACAdapter>;
  let mockCache: jest.Mocked<IRBACCache>;
  let resolver: RoleHierarchyResolver;

  // Test data
  const mockPermissions: IPermission[] = [
    {
      id: 'perm-1',
      resource: 'users',
      action: 'read',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'perm-2',
      resource: 'users',
      action: 'write',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'perm-3',
      resource: 'posts',
      action: 'read',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockRoles: Record<string, IRole> = {
    'admin': {
      id: 'admin',
      name: 'Admin',
      description: 'Administrator role',
      permissions: mockPermissions,
      parentRoles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    'editor': {
      id: 'editor',
      name: 'Editor',
      description: 'Editor role',
      permissions: [mockPermissions[2]], // Only posts:read
      parentRoles: ['admin'], // Inherits from admin
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    'viewer': {
      id: 'viewer',
      name: 'Viewer',
      description: 'Viewer role',
      permissions: [mockPermissions[0]], // Only users:read
      parentRoles: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    'junior-editor': {
      id: 'junior-editor',
      name: 'Junior Editor',
      description: 'Junior editor role',
      permissions: [],
      parentRoles: ['editor'], // Inherits from editor (which inherits from admin)
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(() => {
    // Mock adapter
    mockAdapter = {
      findRoleById: jest.fn((id: string) => Promise.resolve(mockRoles[id] || null)),
      findChildRoles: jest.fn((id: string) => {
        const children = Object.values(mockRoles).filter(
          role => role.parentRoles?.includes(id)
        );
        return Promise.resolve(children);
      }),
    } as unknown as jest.Mocked<IRBACAdapter>;

    // Mock cache
    mockCache = {
      get: jest.fn(() => Promise.resolve(null)),
      set: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
    } as unknown as jest.Mocked<IRBACCache>;

    resolver = new RoleHierarchyResolver(mockAdapter, mockCache);
  });

  describe('constructor', () => {
    it('should create resolver with adapter only', () => {
      const resolverWithoutCache = new RoleHierarchyResolver(mockAdapter);
      expect(resolverWithoutCache).toBeInstanceOf(RoleHierarchyResolver);
    });

    it('should create resolver with adapter and cache', () => {
      expect(resolver).toBeInstanceOf(RoleHierarchyResolver);
    });

    it('should accept custom options', () => {
      const customResolver = new RoleHierarchyResolver(mockAdapter, mockCache, {
        maxDepth: 5,
        cacheHierarchy: false,
      });
      expect(customResolver).toBeInstanceOf(RoleHierarchyResolver);
    });
  });

  describe('getInheritedPermissions', () => {
    it('should get permissions for role without parents', async () => {
      const permissions = await resolver.getInheritedPermissions('admin');

      expect(permissions).toHaveLength(3);
      expect(permissions).toEqual(mockPermissions);
      expect(mockAdapter.findRoleById).toHaveBeenCalledWith('admin');
    });

    it('should get inherited permissions from parent roles', async () => {
      const permissions = await resolver.getInheritedPermissions('editor');

      // Editor has posts:read + inherits all from admin
      expect(permissions.length).toBeGreaterThanOrEqual(3);
      expect(mockAdapter.findRoleById).toHaveBeenCalledWith('editor');
    });

    it('should get multi-level inherited permissions', async () => {
      const permissions = await resolver.getInheritedPermissions('junior-editor');

      // junior-editor inherits from editor, which inherits from admin
      expect(permissions.length).toBeGreaterThanOrEqual(3);
    });

    it('should use cache when available', async () => {
      const cachedPermissions = [mockPermissions[0]];
      mockCache.get.mockResolvedValueOnce(cachedPermissions);

      const permissions = await resolver.getInheritedPermissions('admin');

      expect(permissions).toEqual(cachedPermissions);
      expect(mockCache.get).toHaveBeenCalledWith('rbac:role-permissions:admin');
      expect(mockAdapter.findRoleById).not.toHaveBeenCalled();
    });

    it('should cache results after resolution', async () => {
      await resolver.getInheritedPermissions('admin');

      expect(mockCache.set).toHaveBeenCalledWith(
        'rbac:role-permissions:admin',
        expect.any(Array),
        expect.objectContaining({ ttl: expect.any(Number) })
      );
    });

    it('should not use cache when caching is disabled', async () => {
      const noCacheResolver = new RoleHierarchyResolver(mockAdapter, mockCache, {
        cacheHierarchy: false,
      });

      await noCacheResolver.getInheritedPermissions('admin');

      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('should handle role not found', async () => {
      mockAdapter.findRoleById.mockResolvedValueOnce(null);

      await expect(
        resolver.getInheritedPermissions('nonexistent')
      ).rejects.toThrow(RoleNotFoundError);
    });
  });

  describe('getParentRoles', () => {
    it('should return empty array for role without parents', async () => {
      const parents = await resolver.getParentRoles('admin');

      expect(parents).toEqual([]);
    });

    it('should return direct parent roles', async () => {
      const parents = await resolver.getParentRoles('editor');

      expect(parents).toHaveLength(1);
      expect(parents[0].id).toBe('admin');
    });

    it('should return all ancestor roles', async () => {
      const parents = await resolver.getParentRoles('junior-editor');

      expect(parents.length).toBeGreaterThanOrEqual(1);
      expect(parents.map(r => r.id)).toContain('editor');
      expect(parents.map(r => r.id)).toContain('admin');
    });

    it('should respect maxDepth option', async () => {
      const limitedResolver = new RoleHierarchyResolver(mockAdapter, mockCache, {
        maxDepth: 1,
        detectCircularDependencies: false, // Disable to avoid throwing error
      });

      const parents = await limitedResolver.getParentRoles('junior-editor');

      // Should only get direct parent (editor), not grandparent (admin)
      expect(parents).toHaveLength(1);
      expect(parents[0].id).toBe('editor');
    });

    it('should use cache when available', async () => {
      const cachedParents = [mockRoles['admin']];
      mockCache.get.mockResolvedValueOnce(cachedParents);

      const parents = await resolver.getParentRoles('editor');

      expect(parents).toEqual(cachedParents);
      expect(mockCache.get).toHaveBeenCalledWith('rbac:role-hierarchy:editor');
    });

    it('should cache results after resolution', async () => {
      await resolver.getParentRoles('editor');

      expect(mockCache.set).toHaveBeenCalledWith(
        'rbac:role-hierarchy:editor',
        expect.any(Array),
        expect.objectContaining({ ttl: expect.any(Number) })
      );
    });

    it('should throw RoleNotFoundError for nonexistent role', async () => {
      mockAdapter.findRoleById.mockResolvedValueOnce(null);

      await expect(
        resolver.getParentRoles('nonexistent')
      ).rejects.toThrow(RoleNotFoundError);
    });
  });

  describe('getChildRoles', () => {
    it('should return child roles', async () => {
      const children = await resolver.getChildRoles('admin');

      expect(children.length).toBeGreaterThan(0);
      expect(children.some(r => r.id === 'editor')).toBe(true);
    });

    it('should return empty array when no children', async () => {
      const children = await resolver.getChildRoles('viewer');

      expect(children).toEqual([]);
    });
  });

  describe('hasCircularDependency', () => {
    it('should return false for valid hierarchy', async () => {
      const hasCircle = await resolver.hasCircularDependency('editor');

      expect(hasCircle).toBe(false);
    });

    it('should detect circular dependency', async () => {
      // Create circular dependency: A -> B -> A
      const circularRoles: Record<string, IRole> = {
        'role-a': {
          id: 'role-a',
          name: 'Role A',
          permissions: [],
          parentRoles: ['role-b'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        'role-b': {
          id: 'role-b',
          name: 'Role B',
          permissions: [],
          parentRoles: ['role-a'], // Circular!
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockAdapter.findRoleById.mockImplementation(
        (id: string) => Promise.resolve(circularRoles[id] || null)
      );

      const hasCircle = await resolver.hasCircularDependency('role-a');

      expect(hasCircle).toBe(true);
    });

    it('should return false for nonexistent role', async () => {
      mockAdapter.findRoleById.mockResolvedValueOnce(null);

      const hasCircle = await resolver.hasCircularDependency('nonexistent');

      expect(hasCircle).toBe(false);
    });
  });

  describe('validateHierarchy', () => {
    it('should validate valid parent relationship', async () => {
      const isValid = await resolver.validateHierarchy('viewer', 'admin');

      expect(isValid).toBe(true);
    });

    it('should reject self-reference', async () => {
      const isValid = await resolver.validateHierarchy('admin', 'admin');

      expect(isValid).toBe(false);
    });

    it('should reject circular dependency', async () => {
      // Trying to make admin a child of editor (which already inherits from admin)
      const isValid = await resolver.validateHierarchy('admin', 'editor');

      expect(isValid).toBe(false);
    });

    it('should reject nonexistent parent', async () => {
      mockAdapter.findRoleById.mockImplementation((id: string) => {
        if (id === 'nonexistent') return Promise.resolve(null);
        return Promise.resolve(mockRoles[id] || null);
      });

      const isValid = await resolver.validateHierarchy('viewer', 'nonexistent');

      expect(isValid).toBe(false);
    });

    it('should allow multiple parents', async () => {
      const isValid1 = await resolver.validateHierarchy('viewer', 'admin');
      const isValid2 = await resolver.validateHierarchy('viewer', 'editor');

      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
    });
  });

  describe('getRoleDepth', () => {
    it('should return 0 for root role', async () => {
      const depth = await resolver.getRoleDepth('admin');

      expect(depth).toBe(0);
    });

    it('should return 1 for direct child', async () => {
      const depth = await resolver.getRoleDepth('editor');

      expect(depth).toBe(1);
    });

    it('should return 2 for grandchild', async () => {
      const depth = await resolver.getRoleDepth('junior-editor');

      expect(depth).toBe(2);
    });

    it('should throw RoleNotFoundError for nonexistent role', async () => {
      mockAdapter.findRoleById.mockResolvedValueOnce(null);

      await expect(
        resolver.getRoleDepth('nonexistent')
      ).rejects.toThrow(RoleNotFoundError);
    });
  });

  describe('getHierarchyTree', () => {
    it('should build hierarchy tree from root role', async () => {
      const tree = await resolver.getHierarchyTree('admin');

      expect(tree.role.id).toBe('admin');
      expect(tree.depth).toBe(0);
      expect(tree.children.length).toBeGreaterThan(0);
    });

    it('should include nested children', async () => {
      const tree = await resolver.getHierarchyTree('admin');

      // Should have editor as child
      const editorNode = tree.children.find(c => c.role.id === 'editor');
      expect(editorNode).toBeDefined();

      // Editor should have junior-editor as child
      if (editorNode) {
        expect(editorNode.children.some(c => c.role.id === 'junior-editor')).toBe(true);
      }
    });

    it('should throw RoleNotFoundError for nonexistent role', async () => {
      mockAdapter.findRoleById.mockResolvedValueOnce(null);

      await expect(
        resolver.getHierarchyTree('nonexistent')
      ).rejects.toThrow(RoleNotFoundError);
    });
  });

  describe('resolveHierarchy', () => {
    it('should resolve complete hierarchy', async () => {
      const result = await resolver.resolveHierarchy('editor');

      expect(result.role.id).toBe('editor');
      expect(result.parentRoles.length).toBeGreaterThan(0);
      expect(result.permissions.length).toBeGreaterThan(0);
      expect(result.depth).toBeGreaterThanOrEqual(0);
      expect(result.ancestorChain).toContain('editor');
      expect(result.fromCache).toBe(false);
    });

    it('should include all unique permissions', async () => {
      const result = await resolver.resolveHierarchy('editor');

      const permissionIds = result.permissions.map(p => p.id);
      const uniqueIds = new Set(permissionIds);

      // No duplicate permissions
      expect(permissionIds.length).toBe(uniqueIds.size);
    });

    it('should build correct ancestor chain', async () => {
      const result = await resolver.resolveHierarchy('junior-editor');

      expect(result.ancestorChain).toContain('junior-editor');
      expect(result.ancestorChain).toContain('editor');
      expect(result.ancestorChain).toContain('admin');
    });

    it('should throw RoleNotFoundError for nonexistent role', async () => {
      mockAdapter.findRoleById.mockResolvedValueOnce(null);

      await expect(
        resolver.resolveHierarchy('nonexistent')
      ).rejects.toThrow(RoleNotFoundError);
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate hierarchy cache', async () => {
      await resolver.invalidateCache('editor');

      expect(mockCache.delete).toHaveBeenCalledWith('rbac:role-hierarchy:editor');
      expect(mockCache.delete).toHaveBeenCalledWith('rbac:role-permissions:editor');
    });

    it('should invalidate child role caches recursively', async () => {
      await resolver.invalidateCache('editor');

      // Should also invalidate junior-editor (child of editor)
      expect(mockCache.delete).toHaveBeenCalledWith('rbac:role-hierarchy:junior-editor');
      expect(mockCache.delete).toHaveBeenCalledWith('rbac:role-permissions:junior-editor');
    });

    it('should do nothing when cache is not configured', async () => {
      const noCacheResolver = new RoleHierarchyResolver(mockAdapter);

      await noCacheResolver.invalidateCache('editor');

      expect(mockCache.delete).not.toHaveBeenCalled();
    });
  });

  describe('circular dependency detection with maxDepth', () => {
    it('should throw CircularHierarchyError when max depth exceeded', async () => {
      // Create deep hierarchy
      const deepRoles: Record<string, IRole> = {};
      for (let i = 0; i < 15; i++) {
        deepRoles[`role-${i}`] = {
          id: `role-${i}`,
          name: `Role ${i}`,
          permissions: [],
          parentRoles: i > 0 ? [`role-${i - 1}`] : [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      mockAdapter.findRoleById.mockImplementation(
        (id: string) => Promise.resolve(deepRoles[id] || null)
      );

      await expect(
        resolver.getParentRoles('role-14')
      ).rejects.toThrow(CircularHierarchyError);
    });

    it('should not throw when max depth not exceeded', async () => {
      const result = await resolver.getParentRoles('junior-editor');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should not detect circular dependencies when disabled', async () => {
      const noDetectResolver = new RoleHierarchyResolver(mockAdapter, mockCache, {
        detectCircularDependencies: false,
        maxDepth: 2,
      });

      // Create deep hierarchy that would normally throw
      const deepRoles: Record<string, IRole> = {};
      for (let i = 0; i < 5; i++) {
        deepRoles[`role-${i}`] = {
          id: `role-${i}`,
          name: `Role ${i}`,
          permissions: [],
          parentRoles: i > 0 ? [`role-${i - 1}`] : [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      mockAdapter.findRoleById.mockImplementation(
        (id: string) => Promise.resolve(deepRoles[id] || null)
      );

      const parents = await noDetectResolver.getParentRoles('role-4');

      // Should stop at maxDepth without throwing
      expect(parents.length).toBeLessThanOrEqual(2);
    });
  });
});

describe('hierarchyUtils', () => {
  const mockRole: IRole = {
    id: 'root',
    name: 'Root',
    permissions: [],
    parentRoles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockChild: IRole = {
    id: 'child',
    name: 'Child',
    permissions: [],
    parentRoles: ['root'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGrandchild: IRole = {
    id: 'grandchild',
    name: 'Grandchild',
    permissions: [],
    parentRoles: ['child'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('flattenTree', () => {
    it('should flatten hierarchy tree to array', () => {
      const tree = {
        role: mockRole,
        children: [
          {
            role: mockChild,
            children: [
              { role: mockGrandchild, children: [], depth: 2 },
            ],
            depth: 1,
          },
        ],
        depth: 0,
      };

      const flattened = hierarchyUtils.flattenTree(tree);

      expect(flattened).toHaveLength(3);
      expect(flattened.map(r => r.id)).toEqual(['root', 'child', 'grandchild']);
    });

    it('should handle tree with no children', () => {
      const tree = {
        role: mockRole,
        children: [],
        depth: 0,
      };

      const flattened = hierarchyUtils.flattenTree(tree);

      expect(flattened).toHaveLength(1);
      expect(flattened[0].id).toBe('root');
    });
  });

  describe('getMaxDepth', () => {
    it('should get maximum depth of tree', () => {
      const tree = {
        role: mockRole,
        children: [
          {
            role: mockChild,
            children: [
              { role: mockGrandchild, children: [], depth: 2 },
            ],
            depth: 1,
          },
        ],
        depth: 0,
      };

      const maxDepth = hierarchyUtils.getMaxDepth(tree);

      expect(maxDepth).toBe(2);
    });

    it('should return node depth when no children', () => {
      const tree = {
        role: mockRole,
        children: [],
        depth: 0,
      };

      const maxDepth = hierarchyUtils.getMaxDepth(tree);

      expect(maxDepth).toBe(0);
    });
  });

  describe('findInTree', () => {
    it('should find role in tree', () => {
      const tree = {
        role: mockRole,
        children: [
          {
            role: mockChild,
            children: [],
            depth: 1,
          },
        ],
        depth: 0,
      };

      const found = hierarchyUtils.findInTree(tree, 'child');

      expect(found).toBeDefined();
      expect(found?.role.id).toBe('child');
    });

    it('should return undefined when role not found', () => {
      const tree = {
        role: mockRole,
        children: [],
        depth: 0,
      };

      const found = hierarchyUtils.findInTree(tree, 'nonexistent');

      expect(found).toBeUndefined();
    });

    it('should find deeply nested role', () => {
      const tree = {
        role: mockRole,
        children: [
          {
            role: mockChild,
            children: [
              { role: mockGrandchild, children: [], depth: 2 },
            ],
            depth: 1,
          },
        ],
        depth: 0,
      };

      const found = hierarchyUtils.findInTree(tree, 'grandchild');

      expect(found).toBeDefined();
      expect(found?.role.id).toBe('grandchild');
    });
  });

  describe('getPathToRole', () => {
    it('should get path from root to role', () => {
      const tree = {
        role: mockRole,
        children: [
          {
            role: mockChild,
            children: [
              { role: mockGrandchild, children: [], depth: 2 },
            ],
            depth: 1,
          },
        ],
        depth: 0,
      };

      const path = hierarchyUtils.getPathToRole(tree, 'grandchild');

      expect(path).toHaveLength(3);
      expect(path.map(r => r.id)).toEqual(['root', 'child', 'grandchild']);
    });

    it('should return empty array when role not found', () => {
      const tree = {
        role: mockRole,
        children: [],
        depth: 0,
      };

      const path = hierarchyUtils.getPathToRole(tree, 'nonexistent');

      expect(path).toEqual([]);
    });

    it('should return single role when it is the root', () => {
      const tree = {
        role: mockRole,
        children: [],
        depth: 0,
      };

      const path = hierarchyUtils.getPathToRole(tree, 'root');

      expect(path).toEqual([mockRole]);
    });
  });
});
