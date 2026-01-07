/**
 * Unit tests for WildcardParser
 *
 * Tests wildcard permission matching logic including:
 * - Basic parsing of permission strings
 * - Wildcard matching (* and **)
 * - Specificity calculation
 * - Permission validation
 * - Edge cases and error handling
 */

import { WildcardParser, wildcardParser } from '../../../src/utils/wildcard-parser';
import { DEFAULT_PERMISSION_OPTIONS } from '../../../src/types/options.types';

describe('WildcardParser', () => {
  let parser: WildcardParser;

  beforeEach(() => {
    parser = new WildcardParser();
  });

  describe('constructor', () => {
    it('should create parser with default options', () => {
      const defaultParser = new WildcardParser();
      expect(defaultParser).toBeInstanceOf(WildcardParser);
    });

    it('should create parser with custom options', () => {
      const customParser = new WildcardParser({
        separator: '.',
        wildcardChar: '%',
        caseSensitive: true,
      });
      expect(customParser).toBeInstanceOf(WildcardParser);
    });

    it('should merge custom options with defaults', () => {
      const customParser = new WildcardParser({
        separator: '.',
      });
      // Should use custom separator but default wildcard
      expect(customParser.parse('users.read')).toMatchObject({
        resource: 'users',
        action: 'read',
      });
    });
  });

  describe('parse', () => {
    it('should parse basic permission format', () => {
      const result = parser.parse('users:read');

      expect(result).toMatchObject({
        resource: 'users',
        action: 'read',
        scope: undefined,
        isResourceWildcard: false,
        isActionWildcard: false,
        isGlobstar: false,
        isScopeWildcard: false,
        hasWildcard: false,
        original: 'users:read',
      });
    });

    it('should parse permission with scope', () => {
      const result = parser.parse('posts:update:own');

      expect(result).toMatchObject({
        resource: 'posts',
        action: 'update',
        scope: 'own',
        isResourceWildcard: false,
        isActionWildcard: false,
        isScopeWildcard: false,
        hasWildcard: false,
      });
    });

    it('should parse resource wildcard', () => {
      const result = parser.parse('users:*');

      expect(result).toMatchObject({
        resource: 'users',
        action: '*',
        isResourceWildcard: false,
        isActionWildcard: true,
        hasWildcard: true,
      });
    });

    it('should parse action wildcard', () => {
      const result = parser.parse('*:read');

      expect(result).toMatchObject({
        resource: '*',
        action: 'read',
        isResourceWildcard: true,
        isActionWildcard: false,
        hasWildcard: true,
      });
    });

    it('should parse scope wildcard', () => {
      const result = parser.parse('posts:update:*');

      expect(result).toMatchObject({
        resource: 'posts',
        action: 'update',
        scope: '*',
        isScopeWildcard: true,
        hasWildcard: true,
      });
    });

    it('should parse globstar', () => {
      const result = parser.parse('**');

      expect(result).toMatchObject({
        resource: '**',
        action: '**',
        scope: undefined,
        isResourceWildcard: true,
        isActionWildcard: true,
        isGlobstar: true,
        isScopeWildcard: true,
        hasWildcard: true,
      });
    });

    it('should handle case-insensitive mode by default', () => {
      const result = parser.parse('USERS:READ');

      expect(result.resource).toBe('users');
      expect(result.action).toBe('read');
    });

    it('should handle case-sensitive mode when configured', () => {
      const caseSensitiveParser = new WildcardParser({ caseSensitive: true });
      const result = caseSensitiveParser.parse('USERS:READ');

      expect(result.resource).toBe('USERS');
      expect(result.action).toBe('READ');
    });

    it('should handle incomplete permission strings', () => {
      const result = parser.parse('users');

      expect(result.resource).toBe('users');
      expect(result.action).toBe('*'); // Default to wildcard
    });

    it('should handle empty parts', () => {
      const result = parser.parse(':read');

      expect(result.resource).toBe(''); // Empty resource remains empty
      expect(result.action).toBe('read');
    });
  });

  describe('matches', () => {
    it('should match exact permission', () => {
      expect(parser.matches('users:read', 'users:read')).toBe(true);
    });

    it('should not match different permissions', () => {
      expect(parser.matches('users:read', 'users:write')).toBe(false);
      expect(parser.matches('users:read', 'posts:read')).toBe(false);
    });

    it('should match resource wildcard', () => {
      expect(parser.matches('users:*', 'users:read')).toBe(true);
      expect(parser.matches('users:*', 'users:write')).toBe(true);
      expect(parser.matches('users:*', 'users:delete')).toBe(true);
    });

    it('should match action wildcard', () => {
      expect(parser.matches('*:read', 'users:read')).toBe(true);
      expect(parser.matches('*:read', 'posts:read')).toBe(true);
      expect(parser.matches('*:read', 'comments:read')).toBe(true);
    });

    it('should match globstar against anything', () => {
      expect(parser.matches('**', 'users:read')).toBe(true);
      expect(parser.matches('**', 'posts:write:own')).toBe(true);
      expect(parser.matches('**', 'anything:here:really')).toBe(true);
    });

    it('should match scope correctly', () => {
      expect(parser.matches('posts:update:own', 'posts:update:own')).toBe(true);
      expect(parser.matches('posts:update:own', 'posts:update:all')).toBe(false);
    });

    it('should match scope wildcard', () => {
      expect(parser.matches('posts:update:*', 'posts:update:own')).toBe(true);
      expect(parser.matches('posts:update:*', 'posts:update:all')).toBe(true);
    });

    it('should allow pattern without scope to match permission with scope', () => {
      expect(parser.matches('posts:update', 'posts:update:own')).toBe(true);
      expect(parser.matches('posts:update', 'posts:update:all')).toBe(true);
    });

    it('should not match when pattern has scope but permission does not', () => {
      expect(parser.matches('posts:update:own', 'posts:update')).toBe(false);
    });

    it('should handle case-insensitive matching by default', () => {
      expect(parser.matches('USERS:READ', 'users:read')).toBe(true);
      expect(parser.matches('users:read', 'USERS:READ')).toBe(true);
    });

    it('should handle case-sensitive matching when configured', () => {
      const caseSensitiveParser = new WildcardParser({ caseSensitive: true });

      expect(caseSensitiveParser.matches('USERS:READ', 'users:read')).toBe(false);
      expect(caseSensitiveParser.matches('USERS:READ', 'USERS:READ')).toBe(true);
    });
  });

  describe('matchesDetailed', () => {
    it('should return detailed match result for exact match', () => {
      const result = parser.matchesDetailed('users:read', 'users:read');

      expect(result).toMatchObject({
        matches: true,
        pattern: 'users:read',
        permission: 'users:read',
        matchedParts: {
          resource: true,
          action: true,
          scope: true,
        },
      });
    });

    it('should return detailed result for non-match', () => {
      const result = parser.matchesDetailed('users:read', 'users:write');

      expect(result).toMatchObject({
        matches: false,
        pattern: 'users:read',
        permission: 'users:write',
        matchedParts: {
          resource: true,
          action: false,
          scope: true,
        },
      });
    });

    it('should return detailed result for wildcard match', () => {
      const result = parser.matchesDetailed('users:*', 'users:read');

      expect(result).toMatchObject({
        matches: true,
        matchedParts: {
          resource: true,
          action: true,
          scope: true,
        },
      });
    });

    it('should show which parts matched for partial match', () => {
      const result = parser.matchesDetailed('users:read:own', 'posts:read:own');

      expect(result.matches).toBe(false);
      expect(result.matchedParts.resource).toBe(false);
      expect(result.matchedParts.action).toBe(true);
      expect(result.matchedParts.scope).toBe(true);
    });
  });

  describe('normalize', () => {
    it('should normalize case-insensitive permission', () => {
      expect(parser.normalize('USERS:READ')).toBe('users:read');
    });

    it('should preserve case for case-sensitive parser', () => {
      const caseSensitiveParser = new WildcardParser({ caseSensitive: true });
      expect(caseSensitiveParser.normalize('USERS:READ')).toBe('USERS:READ');
    });

    it('should add wildcard action when only resource provided', () => {
      expect(parser.normalize('users')).toBe('users:*');
    });

    it('should not modify complete permissions', () => {
      expect(parser.normalize('users:read')).toBe('users:read');
      expect(parser.normalize('posts:update:own')).toBe('posts:update:own');
    });
  });

  describe('create', () => {
    it('should create permission from components', () => {
      expect(parser.create('users', 'read')).toBe('users:read');
    });

    it('should create permission with scope', () => {
      expect(parser.create('posts', 'update', 'own')).toBe('posts:update:own');
    });

    it('should create permission without scope', () => {
      expect(parser.create('comments', 'delete')).toBe('comments:delete');
    });
  });

  describe('createResourceWildcard', () => {
    it('should create wildcard permission for resource', () => {
      expect(parser.createResourceWildcard('users')).toBe('users:*');
    });
  });

  describe('createActionWildcard', () => {
    it('should create wildcard permission for action', () => {
      expect(parser.createActionWildcard('read')).toBe('*:read');
    });
  });

  describe('hasWildcard', () => {
    it('should detect single wildcard', () => {
      expect(parser.hasWildcard('users:*')).toBe(true);
      expect(parser.hasWildcard('*:read')).toBe(true);
    });

    it('should detect globstar', () => {
      expect(parser.hasWildcard('**')).toBe(true);
    });

    it('should return false for exact permissions', () => {
      expect(parser.hasWildcard('users:read')).toBe(false);
      expect(parser.hasWildcard('posts:update:own')).toBe(false);
    });
  });

  describe('expand', () => {
    it('should expand wildcard pattern to matching permissions', () => {
      const available = [
        'users:read',
        'users:write',
        'users:delete',
        'posts:read',
        'posts:write',
      ];

      const result = parser.expand('users:*', available);

      expect(result).toEqual([
        'users:read',
        'users:write',
        'users:delete',
      ]);
    });

    it('should expand action wildcard', () => {
      const available = [
        'users:read',
        'posts:read',
        'comments:read',
        'users:write',
      ];

      const result = parser.expand('*:read', available);

      expect(result).toEqual([
        'users:read',
        'posts:read',
        'comments:read',
      ]);
    });

    it('should expand globstar to all permissions', () => {
      const available = [
        'users:read',
        'posts:write',
        'comments:delete:own',
      ];

      const result = parser.expand('**', available);

      expect(result).toEqual(available);
    });

    it('should return empty array when no matches', () => {
      const available = ['users:read', 'posts:write'];
      const result = parser.expand('comments:*', available);

      expect(result).toEqual([]);
    });
  });

  describe('getSpecificity', () => {
    it('should return 0 for globstar', () => {
      expect(parser.getSpecificity('**')).toBe(0);
    });

    it('should return 0 for full wildcard', () => {
      expect(parser.getSpecificity('*:*')).toBe(0);
    });

    it('should return 1 for resource with wildcard action', () => {
      expect(parser.getSpecificity('users:*')).toBe(1);
    });

    it('should return 1 for wildcard resource with action', () => {
      expect(parser.getSpecificity('*:read')).toBe(1);
    });

    it('should return 2 for exact resource and action', () => {
      expect(parser.getSpecificity('users:read')).toBe(2);
    });

    it('should return 3 for exact resource, action, and scope', () => {
      expect(parser.getSpecificity('posts:update:own')).toBe(3);
    });

    it('should not count wildcard scope in specificity', () => {
      expect(parser.getSpecificity('posts:update:*')).toBe(2);
    });
  });

  describe('sortBySpecificity', () => {
    it('should sort permissions from most to least specific', () => {
      const permissions = [
        '**',
        'users:*',
        'users:read',
        'posts:update:own',
        '*:read',
      ];

      const sorted = parser.sortBySpecificity(permissions);

      expect(sorted).toEqual([
        'posts:update:own', // specificity 3
        'users:read',       // specificity 2
        'users:*',          // specificity 1
        '*:read',           // specificity 1
        '**',               // specificity 0
      ]);
    });

    it('should maintain order for equal specificity', () => {
      const permissions = ['users:*', 'posts:*', 'comments:*'];
      const sorted = parser.sortBySpecificity(permissions);

      // All have same specificity (1), order should be preserved
      expect(sorted).toEqual(permissions);
    });

    it('should not mutate original array', () => {
      const permissions = ['**', 'users:read', 'users:*'];
      const original = [...permissions];

      parser.sortBySpecificity(permissions);

      expect(permissions).toEqual(original);
    });
  });

  describe('validate', () => {
    it('should validate correct permission format', () => {
      expect(parser.validate('users:read')).toEqual({ valid: true });
      expect(parser.validate('posts:update:own')).toEqual({ valid: true });
    });

    it('should reject empty permission', () => {
      const result = parser.validate('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject permission with too many parts', () => {
      const result = parser.validate('a:b:c:d');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too many parts');
    });

    it('should reject permission with empty parts', () => {
      const result = parser.validate('users::read');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty parts');
    });

    it('should reject invalid characters', () => {
      const result = parser.validate('users:read$');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid characters');
    });

    it('should allow wildcards', () => {
      expect(parser.validate('*:read')).toEqual({ valid: true });
      expect(parser.validate('users:*')).toEqual({ valid: true });
      expect(parser.validate('**')).toEqual({ valid: true });
    });

    it('should allow alphanumeric and hyphens/underscores', () => {
      expect(parser.validate('user-profiles:read')).toEqual({ valid: true });
      expect(parser.validate('user_data:write_all')).toEqual({ valid: true });
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(wildcardParser).toBeInstanceOf(WildcardParser);
    });

    it('should use default options for singleton', () => {
      const result = wildcardParser.parse('USERS:READ');
      expect(result.resource).toBe('users'); // case-insensitive by default
    });
  });

  describe('edge cases', () => {
    it('should handle very long permission strings', () => {
      const longPermission = 'a'.repeat(100) + ':' + 'b'.repeat(100);
      const result = parser.parse(longPermission);
      expect(result.resource).toBe('a'.repeat(100));
      expect(result.action).toBe('b'.repeat(100));
    });

    it('should handle special characters in custom separator', () => {
      const dotParser = new WildcardParser({ separator: '.' });
      expect(dotParser.parse('users.read')).toMatchObject({
        resource: 'users',
        action: 'read',
      });
    });

    it('should handle permissions with only wildcards', () => {
      const result = parser.parse('*:*:*');
      expect(result.isResourceWildcard).toBe(true);
      expect(result.isActionWildcard).toBe(true);
      expect(result.isScopeWildcard).toBe(true);
    });

    it('should handle mixed case in case-insensitive mode', () => {
      expect(parser.matches('Users:Read', 'users:read')).toBe(true);
      expect(parser.matches('USERS:read', 'users:READ')).toBe(true);
    });
  });
});
