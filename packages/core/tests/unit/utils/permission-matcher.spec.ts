/**
 * Unit tests for PermissionMatcher
 *
 * Tests permission matching logic including:
 * - Exact permission matching
 * - Wildcard matching
 * - Scope-based matching (ABAC)
 * - Condition evaluation
 * - Match scoring and best match selection
 */

import { PermissionMatcher, permissionMatcher, PermissionMatchContext } from '../../../src/utils/permission-matcher';
import { IPermission } from '../../../src/interfaces/permission.interface';

describe('PermissionMatcher', () => {
  let matcher: PermissionMatcher;

  // Test data
  const permissions: IPermission[] = [
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
      action: '*', // All post actions
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'perm-4',
      resource: '*',
      action: 'read', // Read anything
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'perm-5',
      resource: 'posts',
      action: 'update',
      scope: 'own', // Update own posts only
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'perm-6',
      resource: 'posts',
      action: 'delete',
      scope: 'all', // Delete all posts
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'perm-superadmin',
      resource: '*',
      action: '*', // All resources, all actions (closest to globstar)
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    matcher = new PermissionMatcher();
  });

  describe('constructor', () => {
    it('should create matcher with default options', () => {
      expect(matcher).toBeInstanceOf(PermissionMatcher);
    });

    it('should create matcher with custom options', () => {
      const customMatcher = new PermissionMatcher({
        separator: '.',
        caseSensitive: true,
      });
      expect(customMatcher).toBeInstanceOf(PermissionMatcher);
    });
  });

  describe('matches - single permission', () => {
    it('should match exact permission', () => {
      const result = matcher.matches('users:read', permissions);
      expect(result).toBe(true);
    });

    it('should not match unavailable permission', () => {
      const result = matcher.matches('users:delete', permissions.slice(0, 2));
      expect(result).toBe(false);
    });

    it('should match with resource wildcard', () => {
      const result = matcher.matches('posts:read', permissions);
      expect(result).toBe(true); // Matched by posts:*
    });

    it('should match with action wildcard', () => {
      const result = matcher.matches('comments:read', permissions);
      expect(result).toBe(true); // Matched by *:read
    });

    it('should match with globstar', () => {
      const result = matcher.matches('anything:here', permissions);
      expect(result).toBe(true); // Matched by *:*
    });

    it('should handle case-insensitive matching by default', () => {
      const result = matcher.matches('USERS:READ', permissions);
      expect(result).toBe(true);
    });
  });

  describe('matches - multiple permissions (OR logic)', () => {
    it('should match when any permission matches', () => {
      const result = matcher.matches(
        ['users:read', 'users:delete'],
        permissions
      );
      expect(result).toBe(true); // users:read matches
    });

    it('should return false when none match', () => {
      const result = matcher.matches(
        ['admin:create', 'admin:delete'],
        permissions.slice(0, 2) // Only users:read and users:write
      );
      expect(result).toBe(false);
    });

    it('should match multiple options', () => {
      const result = matcher.matches(
        ['posts:create', 'posts:update'],
        permissions
      );
      expect(result).toBe(true); // Both match via posts:*
    });
  });

  describe('matchesAll - AND logic', () => {
    it('should match when all permissions are satisfied', () => {
      const result = matcher.matchesAll(
        ['users:read', 'users:write'],
        permissions
      );
      expect(result).toBe(true);
    });

    it('should return false when any permission is missing', () => {
      const result = matcher.matchesAll(
        ['users:read', 'users:delete'],
        permissions.slice(0, 2)
      );
      expect(result).toBe(false); // users:delete not available
    });

    it('should match with wildcards', () => {
      const result = matcher.matchesAll(
        ['posts:create', 'posts:update', 'posts:delete'],
        permissions
      );
      expect(result).toBe(true); // All match via posts:* or specific permissions
    });
  });

  describe('matchesWithWildcard', () => {
    it('should match exact wildcard pattern', () => {
      const result = matcher.matchesWithWildcard('posts:*', permissions);
      expect(result).toBe(true);
    });

    it('should match globstar pattern', () => {
      const result = matcher.matchesWithWildcard('**', permissions);
      expect(result).toBe(true);
    });

    it('should match when pattern matches specific permission', () => {
      const result = matcher.matchesWithWildcard('users:*', permissions);
      expect(result).toBe(true); // Matches users:read and users:write
    });

    it('should match when available permission is wildcard', () => {
      const result = matcher.matchesWithWildcard('posts:create', permissions);
      expect(result).toBe(true); // Matched by posts:*
    });

    it('should not match unrelated patterns', () => {
      const result = matcher.matchesWithWildcard('admin:*', permissions.slice(0, 2));
      expect(result).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse basic permission', () => {
      const result = matcher.parse('users:read');
      expect(result).toEqual({
        resource: 'users',
        action: 'read',
        scope: undefined,
      });
    });

    it('should parse permission with scope', () => {
      const result = matcher.parse('posts:update:own');
      expect(result).toEqual({
        resource: 'posts',
        action: 'update',
        scope: 'own',
      });
    });

    it('should parse wildcard permission', () => {
      const result = matcher.parse('users:*');
      expect(result).toEqual({
        resource: 'users',
        action: '*',
        scope: undefined,
      });
    });
  });

  describe('normalize', () => {
    it('should normalize string permission', () => {
      const result = matcher.normalize('users:read');
      expect(result).toMatchObject({
        id: 'perm_users_read',
        resource: 'users',
        action: 'read',
        scope: undefined,
      });
    });

    it('should normalize permission with scope', () => {
      const result = matcher.normalize('posts:update:own');
      expect(result).toMatchObject({
        id: 'perm_posts_update_own',
        resource: 'posts',
        action: 'update',
        scope: 'own',
      });
    });

    it('should normalize partial permission object', () => {
      const result = matcher.normalize({
        resource: 'users',
        action: 'read',
      });
      expect(result).toMatchObject({
        resource: 'users',
        action: 'read',
      });
    });

    it('should provide defaults for missing fields', () => {
      const result = matcher.normalize({});
      expect(result.resource).toBe('*');
      expect(result.action).toBe('*');
    });
  });

  describe('findBestMatch', () => {
    it('should find exact match with highest score', () => {
      const result = matcher.findBestMatch('users:read', permissions);

      expect(result.matched).toBe(true);
      expect(result.matchedPermission?.id).toBe('perm-1');
      expect(result.matchScore).toBeGreaterThan(0);
      expect(result.reason).toContain('Exact match');
    });

    it('should find wildcard match with lower score', () => {
      const result = matcher.findBestMatch('posts:create', permissions);

      expect(result.matched).toBe(true);
      expect(result.matchedPermission?.id).toBe('perm-3'); // posts:*
      expect(result.reason).toContain('wildcard');
    });

    it('should prefer more specific matches', () => {
      const permsWithDuplicates: IPermission[] = [
        {
          id: 'specific',
          resource: 'users',
          action: 'read',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'wildcard',
          resource: '*',
          action: 'read',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = matcher.findBestMatch('users:read', permsWithDuplicates);

      expect(result.matchedPermission?.id).toBe('specific'); // More specific match
    });

    it('should return no match when permission not found', () => {
      const result = matcher.findBestMatch('admin:delete', permissions.slice(0, 2));

      expect(result.matched).toBe(false);
      expect(result.matchScore).toBe(0);
      expect(result.reason).toContain('No matching permission');
    });

    it('should score exact match higher than wildcard', () => {
      const exactPerm: IPermission = {
        id: 'exact',
        resource: 'users',
        action: 'read',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const wildcardPerm: IPermission = {
        id: 'wildcard',
        resource: 'users',
        action: '*',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const exactMatch = matcher.findBestMatch('users:read', [exactPerm]);
      const wildcardMatch = matcher.findBestMatch('users:read', [wildcardPerm]);

      expect(exactMatch.matched).toBe(true);
      expect(wildcardMatch.matched).toBe(true);
      expect(exactMatch.matchScore).toBeGreaterThan(wildcardMatch.matchScore);
    });
  });

  describe('check', () => {
    it('should return detailed check result for allowed permission', () => {
      const result = matcher.check('users:read', permissions);

      expect(result.allowed).toBe(true);
      expect(result.permission).toBe('users:read');
      expect(result.matchedPermission).toBeDefined();
      expect(result.reason).toBeDefined();
    });

    it('should return detailed check result for denied permission', () => {
      const result = matcher.check('admin:delete', permissions.slice(0, 2));

      expect(result.allowed).toBe(false);
      expect(result.permission).toBe('admin:delete');
      expect(result.reason).toContain('No matching permission');
    });

    it('should include context in result', () => {
      const context: PermissionMatchContext = {
        userId: 'user-123',
        attributes: { environment: 'production' },
      };

      const result = matcher.check('users:read', permissions, context);

      expect(result.context).toEqual(context);
    });
  });

  describe('findAllMatches', () => {
    it('should find all permissions matching pattern', () => {
      const matches = matcher.findAllMatches('users:*', permissions);

      expect(matches.length).toBeGreaterThanOrEqual(2);
      expect(matches.some(p => p.id === 'perm-1')).toBe(true); // users:read
      expect(matches.some(p => p.id === 'perm-2')).toBe(true); // users:write
    });

    it('should find permissions matching action wildcard', () => {
      const matches = matcher.findAllMatches('*:read', permissions);

      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array when no matches', () => {
      const matches = matcher.findAllMatches('admin:*', permissions.slice(0, 2));

      expect(matches).toEqual([]);
    });

    it('should find globstar matches', () => {
      const matches = matcher.findAllMatches('**', permissions);

      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('scope matching', () => {
    it('should match permission without scope requirement', () => {
      const result = matcher.matches('posts:update', permissions);
      expect(result).toBe(true);
    });

    it('should match "own" scope when user owns resource', () => {
      const context: PermissionMatchContext = {
        userId: 'user-123',
        resourceOwnerId: 'user-123',
      };

      const result = matcher.matches('posts:update:own', permissions, context);
      expect(result).toBe(true);
    });

    it('should not match "own" scope when user does not own resource', () => {
      const context: PermissionMatchContext = {
        userId: 'user-123',
        resourceOwnerId: 'user-456',
      };

      const result = matcher.matches('posts:update:own', permissions, context);
      expect(result).toBe(false);
    });

    it('should match "own" with "all" scope permission', () => {
      const context: PermissionMatchContext = {
        userId: 'user-123',
        resourceOwnerId: 'user-456',
      };

      // posts:delete:all should match posts:delete:own requirement
      const result = matcher.matches('posts:delete:own', permissions, context);
      expect(result).toBe(true); // Granted by "all" scope
    });

    it('should match wildcard scope', () => {
      const permsWithWildcardScope: IPermission[] = [
        {
          id: 'wildcard-scope',
          resource: 'posts',
          action: 'update',
          scope: '*',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = matcher.matches('posts:update:own', permsWithWildcardScope);
      expect(result).toBe(true);
    });

    it('should deny "own" scope without context', () => {
      const result = matcher.matches('posts:update:own', permissions);
      // Without context, can't determine ownership
      expect(result).toBe(false);
    });
  });

  describe('condition evaluation (ABAC)', () => {
    it('should match permission with satisfied conditions', () => {
      const conditionalPerms: IPermission[] = [
        {
          id: 'conditional',
          resource: 'documents',
          action: 'read',
          conditions: {
            department: 'engineering',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const context: PermissionMatchContext = {
        attributes: {
          department: 'engineering',
        },
      };

      const result = matcher.matches('documents:read', conditionalPerms, context);
      expect(result).toBe(true);
    });

    it('should not match permission with unsatisfied conditions', () => {
      const conditionalPerms: IPermission[] = [
        {
          id: 'conditional',
          resource: 'documents',
          action: 'read',
          conditions: {
            department: 'engineering',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const context: PermissionMatchContext = {
        attributes: {
          department: 'sales', // Different department
        },
      };

      const result = matcher.matches('documents:read', conditionalPerms, context);
      expect(result).toBe(false);
    });

    it('should match permission without conditions', () => {
      const context: PermissionMatchContext = {
        attributes: { someAttribute: 'value' },
      };

      const result = matcher.matches('users:read', permissions, context);
      expect(result).toBe(true);
    });

    it('should deny when conditions are present but no context provided', () => {
      const conditionalPerms: IPermission[] = [
        {
          id: 'conditional',
          resource: 'documents',
          action: 'read',
          conditions: {
            department: 'engineering',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const result = matcher.matches('documents:read', conditionalPerms);
      expect(result).toBe(false);
    });

    it('should match permission with multiple conditions', () => {
      const conditionalPerms: IPermission[] = [
        {
          id: 'multi-conditional',
          resource: 'reports',
          action: 'read',
          conditions: {
            department: 'engineering',
            role: 'senior',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const context: PermissionMatchContext = {
        attributes: {
          department: 'engineering',
          role: 'senior',
        },
      };

      const result = matcher.matches('reports:read', conditionalPerms, context);
      expect(result).toBe(true);
    });
  });

  describe('match scoring', () => {
    it('should score exact matches higher than wildcard matches', () => {
      const exactMatch = matcher.findBestMatch('users:read', [permissions[0]]);
      const wildcardMatch = matcher.findBestMatch('comments:read', [permissions[3]]);

      expect(exactMatch.matchScore).toBeGreaterThan(wildcardMatch.matchScore);
    });

    it('should score scoped permissions higher', () => {
      const scopedPerm: IPermission = {
        id: 'scoped',
        resource: 'posts',
        action: 'update',
        scope: 'own',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const unscopedPerm: IPermission = {
        id: 'unscoped',
        resource: 'posts',
        action: 'update',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const scopedMatch = matcher.findBestMatch('posts:update', [scopedPerm]);
      const unscopedMatch = matcher.findBestMatch('posts:update', [unscopedPerm]);

      expect(scopedMatch.matchScore).toBeGreaterThan(unscopedMatch.matchScore);
    });

    it('should score conditional permissions higher', () => {
      const conditionalPerm: IPermission = {
        id: 'conditional',
        resource: 'docs',
        action: 'read',
        conditions: { department: 'eng' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const unconditionalPerm: IPermission = {
        id: 'unconditional',
        resource: 'docs',
        action: 'read',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const context: PermissionMatchContext = {
        attributes: { department: 'eng' },
      };

      const conditionalMatch = matcher.findBestMatch('docs:read', [conditionalPerm], context);
      const unconditionalMatch = matcher.findBestMatch('docs:read', [unconditionalPerm], context);

      expect(conditionalMatch.matchScore).toBeGreaterThan(unconditionalMatch.matchScore);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(permissionMatcher).toBeInstanceOf(PermissionMatcher);
    });

    it('should use default options for singleton', () => {
      const result = permissionMatcher.matches('users:read', permissions);
      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty permissions array', () => {
      const result = matcher.matches('users:read', []);
      expect(result).toBe(false);
    });

    it('should handle empty required permission', () => {
      const result = matcher.matches('', permissions);
      // Empty permission gets parsed and may match wildcards
      expect(typeof result).toBe('boolean');
    });

    it('should handle very long permission strings', () => {
      const longResource = 'a'.repeat(100);
      const longAction = 'b'.repeat(100);
      const longPerm: IPermission = {
        id: 'long',
        resource: longResource,
        action: longAction,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = matcher.matches(`${longResource}:${longAction}`, [longPerm]);
      expect(result).toBe(true);
    });

    it('should handle permissions with special characters in metadata', () => {
      const perm: IPermission = {
        id: 'special',
        resource: 'users',
        action: 'read',
        metadata: {
          description: 'Permission with "quotes" and \\ backslashes',
          tags: ['tag:with:colons'],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = matcher.matches('users:read', [perm]);
      expect(result).toBe(true);
    });

    it('should handle null/undefined in context', () => {
      const context: PermissionMatchContext = {
        userId: undefined,
        resourceOwnerId: undefined,
        attributes: {},
      };

      const result = matcher.matches('posts:update:own', permissions, context);
      expect(result).toBe(false);
    });
  });
});
