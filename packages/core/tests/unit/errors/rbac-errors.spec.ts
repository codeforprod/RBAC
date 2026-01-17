import { RBACError, RBACErrorCode } from '../../../src/errors/rbac.error';
import { PermissionDeniedError } from '../../../src/errors/permission-denied.error';
import { RoleNotFoundError } from '../../../src/errors/role-not-found.error';
import { CircularHierarchyError } from '../../../src/errors/circular-hierarchy.error';

describe('RBAC Errors', () => {
  describe('RBACError', () => {
    it('should create error with message and code', () => {
      const error = new RBACError('Test error', RBACErrorCode.PERMISSION_DENIED);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RBACError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(RBACErrorCode.PERMISSION_DENIED);
      expect(error.name).toBe('RBACError');
    });

    it('should include context', () => {
      const context = { userId: 'user-1', resource: 'posts' };
      const error = new RBACError('Test error', RBACErrorCode.PERMISSION_DENIED, context);

      expect(error.context).toEqual(expect.objectContaining(context));
      expect(error.context.code).toBe(RBACErrorCode.PERMISSION_DENIED);
    });

    it('should serialize to JSON correctly', () => {
      const error = new RBACError('Test error', RBACErrorCode.PERMISSION_DENIED, {
        metadata: { test: 'value' },
      });

      const json = error.toJSON();

      expect(json.name).toBe('RBACError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe(RBACErrorCode.PERMISSION_DENIED);
      expect(json.context).toBeDefined();
      expect(json.timestamp).toBeDefined();
      expect(json.isOperational).toBe(true);
      expect(json.stack).toBeDefined();
    });

    it('should capture stack trace', () => {
      const error = new RBACError('Test error', RBACErrorCode.INTERNAL_ERROR);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('RBACError');
    });
  });

  describe('PermissionDeniedError', () => {
    it('should create error for permission denial', () => {
      const error = new PermissionDeniedError('posts:delete', 'user-1');

      expect(error).toBeInstanceOf(RBACError);
      expect(error).toBeInstanceOf(PermissionDeniedError);
      expect(error.code).toBe(RBACErrorCode.PERMISSION_DENIED);
      expect(error.permission).toBe('posts:delete');
      expect(error.userId).toBe('user-1');
      expect(error.message).toContain('Permission denied');
      expect(error.message).toContain('posts:delete');
      expect(error.message).toContain('user-1');
    });

    it('should include resource in context', () => {
      const error = new PermissionDeniedError('posts:delete', 'user-1', {
        resource: 'post-123',
      });

      // Resource from permission parsing (not context override since parsed takes precedence)
      expect(error.resource).toBe('posts');
      expect(error.context.resource).toBe('post-123');
    });

    it('should include organization in context', () => {
      const error = new PermissionDeniedError('teams:manage', 'user-1', {
        organizationId: 'org-1',
      });

      expect(error.context.organizationId).toBe('org-1');
    });

    it('should serialize to JSON with permission details', () => {
      const error = new PermissionDeniedError('posts:delete', 'user-1', {
        resource: 'post-123',
        organizationId: 'org-1',
      });

      const json = error.toJSON();

      expect(json.code).toBe(RBACErrorCode.PERMISSION_DENIED);
      expect(json.context).toEqual(
        expect.objectContaining({
          permission: 'posts:delete',
          userId: 'user-1',
          resource: 'post-123',
          organizationId: 'org-1',
        })
      );
    });
  });

  describe('RoleNotFoundError', () => {
    it('should create error by ID', () => {
      const error = RoleNotFoundError.byId('role-123');

      expect(error).toBeInstanceOf(RBACError);
      expect(error).toBeInstanceOf(RoleNotFoundError);
      expect(error.code).toBe(RBACErrorCode.ROLE_NOT_FOUND);
      expect(error.roleId).toBe('role-123');
      expect(error.message).toContain('role-123');
    });

    it('should create error by name', () => {
      const error = RoleNotFoundError.byName('admin');

      expect(error.roleName).toBe('admin');
      expect(error.message).toContain('admin');
    });

    it('should create error by name with organization', () => {
      const error = RoleNotFoundError.byName('admin', 'org-1');

      expect(error.roleName).toBe('admin');
      expect(error.organizationId).toBe('org-1');
      expect(error.message).toContain('admin');
      expect(error.message).toContain('org-1');
    });

    it('should create error for assignment', () => {
      const error = RoleNotFoundError.forAssignment('role-123', 'user-1');

      expect(error.roleId).toBe('role-123');
      expect(error.context.userId).toBe('user-1');
      expect(error.message).toContain('role-123');
      expect(error.message).toContain('user-1');
    });

    it('should create error for parent role', () => {
      const error = RoleNotFoundError.parentRole('parent-role-123', 'child-role-456');

      expect(error.roleId).toBe('parent-role-123');
      expect(error.context.metadata).toEqual(
        expect.objectContaining({ childRoleId: 'child-role-456' })
      );
      expect(error.message).toContain('parent-role-123');
    });

    it('should serialize to JSON with role details', () => {
      const error = RoleNotFoundError.byName('editor', 'org-1');

      const json = error.toJSON();

      expect(json.code).toBe(RBACErrorCode.ROLE_NOT_FOUND);
      expect(json.context).toEqual(
        expect.objectContaining({
          roleName: 'editor',
          organizationId: 'org-1',
        })
      );
    });
  });

  describe('CircularHierarchyError', () => {
    it('should create error for circular dependency', () => {
      const error = new CircularHierarchyError('role-1', 'role-2', ['role-1', 'role-2', 'role-1']);

      expect(error).toBeInstanceOf(RBACError);
      expect(error).toBeInstanceOf(CircularHierarchyError);
      expect(error.code).toBe(RBACErrorCode.CIRCULAR_HIERARCHY);
      expect(error.roleId).toBe('role-1');
      expect(error.targetRoleId).toBe('role-2');
      expect(error.chain).toEqual(['role-1', 'role-2', 'role-1']);
      expect(error.message).toContain('Circular');
      expect(error.message).toContain('role-1');
      expect(error.message).toContain('role-2');
    });

    it('should create error for self-reference', () => {
      const error = CircularHierarchyError.selfReference('role-1');

      expect(error.roleId).toBe('role-1');
      expect(error.targetRoleId).toBe('role-1');
      expect(error.message).toContain('self');
      expect(error.message).toContain('role-1');
    });

    it('should serialize to JSON with hierarchy chain', () => {
      const chain = ['role-1', 'role-2', 'role-3', 'role-1'];
      const error = new CircularHierarchyError('role-1', 'role-2', chain);

      const json = error.toJSON();

      expect(json.code).toBe(RBACErrorCode.CIRCULAR_HIERARCHY);
      expect(json.context).toEqual(
        expect.objectContaining({
          roleId: 'role-1',
        })
      );
      expect(json.metadata).toEqual(
        expect.objectContaining({
          targetRoleId: 'role-2',
          chain: chain,
        })
      );
    });
  });

  describe('Error Codes', () => {
    it('should have all required error codes', () => {
      expect(RBACErrorCode.PERMISSION_DENIED).toBeDefined();
      expect(RBACErrorCode.ROLE_NOT_FOUND).toBeDefined();
      expect(RBACErrorCode.CIRCULAR_HIERARCHY).toBeDefined();
      expect(RBACErrorCode.INVALID_PERMISSION_FORMAT).toBeDefined();
      expect(RBACErrorCode.SYSTEM_ROLE_MODIFICATION).toBeDefined();
      expect(RBACErrorCode.UNKNOWN_ERROR).toBeDefined();
    });

    it('should have unique error code values', () => {
      const codes = Object.values(RBACErrorCode);
      const uniqueCodes = new Set(codes);

      expect(codes.length).toBe(uniqueCodes.size);
    });
  });

  describe('Error Inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const rbacError = new RBACError('Test', RBACErrorCode.INTERNAL_ERROR);
      const permError = new PermissionDeniedError('test:perm', 'user-1');
      const roleError = RoleNotFoundError.byId('role-1');
      const circularError = new CircularHierarchyError('role-1', 'role-2', []);

      expect(rbacError).toBeInstanceOf(Error);
      expect(permError).toBeInstanceOf(Error);
      expect(permError).toBeInstanceOf(RBACError);
      expect(roleError).toBeInstanceOf(Error);
      expect(roleError).toBeInstanceOf(RBACError);
      expect(circularError).toBeInstanceOf(Error);
      expect(circularError).toBeInstanceOf(RBACError);
    });

    it('should be catchable as RBACError', () => {
      try {
        throw new PermissionDeniedError('test:perm', 'user-1');
      } catch (error) {
        expect(error).toBeInstanceOf(RBACError);
        if (error instanceof RBACError) {
          expect(error.code).toBe(RBACErrorCode.PERMISSION_DENIED);
        }
      }
    });

    it('should be catchable as specific error type', () => {
      try {
        throw RoleNotFoundError.byId('role-1');
      } catch (error) {
        expect(error).toBeInstanceOf(RoleNotFoundError);
        if (error instanceof RoleNotFoundError) {
          expect(error.roleId).toBe('role-1');
        }
      }
    });
  });
});
