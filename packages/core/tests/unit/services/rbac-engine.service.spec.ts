import { RBACEngine } from '../../../src/services/rbac-engine.service';
import { IRBACAdapter } from '../../../src/interfaces/adapter.interface';
import { IRBACCache, InMemoryCache } from '../../../src/interfaces/cache.interface';
import { IAuditLogger, AuditAction } from '../../../src/interfaces/audit.interface';
import { IRole } from '../../../src/interfaces/role.interface';
import { IPermission } from '../../../src/interfaces/permission.interface';
import { IUserRoleAssignment } from '../../../src/interfaces/user.interface';
import { PermissionDeniedError } from '../../../src/errors/permission-denied.error';
import { RoleNotFoundError } from '../../../src/errors/role-not-found.error';
import { CircularHierarchyError } from '../../../src/errors/circular-hierarchy.error';
import { RBACError, RBACErrorCode } from '../../../src/errors/rbac.error';

describe('RBACEngine', () => {
  let engine: RBACEngine;
  let mockAdapter: jest.Mocked<IRBACAdapter>;
  let mockCache: jest.Mocked<IRBACCache>;
  let mockAuditLogger: jest.Mocked<IAuditLogger>;

  const mockRole: IRole = {
    id: 'role-1',
    name: 'editor',
    displayName: 'Editor',
    description: 'Can edit content',
    permissions: [],
    parentRoles: [],
    isSystem: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPermission: IPermission = {
    id: 'perm-1',
    resource: 'posts',
    action: 'update',
    scope: null,
    description: 'Update posts',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserRoleAssignment: IUserRoleAssignment = {
    userId: 'user-1',
    roleId: 'role-1',
    assignedBy: 'admin-1',
    assignedAt: new Date(),
    expiresAt: null,
    organizationId: null,
  };

  beforeEach(async () => {
    mockAdapter = {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      healthCheck: jest.fn().mockResolvedValue(true),
      createRole: jest.fn().mockResolvedValue(mockRole),
      updateRole: jest.fn().mockResolvedValue(mockRole),
      deleteRole: jest.fn().mockResolvedValue(true),
      findRoleById: jest.fn().mockResolvedValue(mockRole),
      findRoleByName: jest.fn().mockResolvedValue(mockRole),
      findRolesByIds: jest.fn().mockResolvedValue([mockRole]),
      findChildRoles: jest.fn().mockResolvedValue([]),
      listRoles: jest.fn().mockResolvedValue([mockRole]),
      assignPermissionsToRole: jest.fn().mockResolvedValue(undefined),
      removePermissionsFromRole: jest.fn().mockResolvedValue(undefined),
      findRolePermissions: jest.fn().mockResolvedValue([mockPermission]),
      createPermission: jest.fn().mockResolvedValue(mockPermission),
      findPermissionById: jest.fn().mockResolvedValue(mockPermission),
      findPermissionByString: jest.fn().mockResolvedValue(mockPermission),
      assignRoleToUser: jest.fn().mockResolvedValue(mockUserRoleAssignment),
      removeRoleFromUser: jest.fn().mockResolvedValue(true),
      findUserRoleAssignments: jest.fn().mockResolvedValue([mockUserRoleAssignment]),
      userHasRole: jest.fn().mockResolvedValue(true),
      findUserPermissions: jest.fn().mockResolvedValue([mockPermission]),
    } as unknown as jest.Mocked<IRBACAdapter>;

    mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(true),
      deletePattern: jest.fn().mockResolvedValue(0),
      clear: jest.fn().mockResolvedValue(undefined),
      healthCheck: jest.fn().mockResolvedValue(true),
      shutdown: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IRBACCache>;

    mockAuditLogger = {
      log: jest.fn().mockResolvedValue(undefined),
      logPermissionCheck: jest.fn().mockResolvedValue(undefined),
      logRoleCreation: jest.fn().mockResolvedValue(undefined),
      logRoleUpdate: jest.fn().mockResolvedValue(undefined),
      logRoleDeletion: jest.fn().mockResolvedValue(undefined),
      logRoleAssignment: jest.fn().mockResolvedValue(undefined),
      logRoleRemoval: jest.fn().mockResolvedValue(undefined),
      getAuditLogs: jest.fn().mockResolvedValue([]),
      getStats: jest.fn().mockResolvedValue({ totalLogs: 0 }),
      shutdown: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IAuditLogger>;

    engine = await RBACEngine.create({
      adapter: mockAdapter,
      cache: mockCache,
      auditLogger: mockAuditLogger,
      autoInitialize: true,
    });
  });

  describe('create', () => {
    it('should create engine with provided dependencies', async () => {
      expect(engine).toBeInstanceOf(RBACEngine);
      expect(mockAdapter.initialize).toHaveBeenCalled();
    });

    it('should create engine with default in-memory cache', async () => {
      const engineWithDefaultCache = await RBACEngine.create({
        adapter: mockAdapter,
        autoInitialize: false,
      });

      expect(engineWithDefaultCache.getCache()).toBeInstanceOf(InMemoryCache);
    });

    it('should not auto-initialize when autoInitialize is false', async () => {
      const customAdapter = { ...mockAdapter, initialize: jest.fn() };

      await RBACEngine.create({
        adapter: customAdapter as IRBACAdapter,
        autoInitialize: false,
      });

      expect(customAdapter.initialize).not.toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('should initialize adapter', async () => {
      const customAdapter = { ...mockAdapter, initialize: jest.fn() };
      const newEngine = await RBACEngine.create({
        adapter: customAdapter as IRBACAdapter,
        autoInitialize: false,
      });

      await newEngine.initialize();

      expect(customAdapter.initialize).toHaveBeenCalled();
      expect(newEngine.isInitialized()).toBe(true);
    });

    it('should not initialize twice', async () => {
      mockAdapter.initialize.mockClear();

      await engine.initialize();

      expect(mockAdapter.initialize).not.toHaveBeenCalled();
    });
  });

  describe('shutdown', () => {
    it('should call shutdown on adapter and cache', async () => {
      await engine.shutdown();

      expect(mockAdapter.shutdown).toHaveBeenCalled();
      expect(mockCache.shutdown).toHaveBeenCalled();
      expect(engine.isInitialized()).toBe(false);
    });
  });

  describe('can', () => {
    beforeEach(() => {
      const roleWithPermissions: IRole = {
        ...mockRole,
        permissions: [mockPermission],
      };
      mockAdapter.findRoleById.mockResolvedValue(roleWithPermissions);
      mockAdapter.findUserRoleAssignments.mockResolvedValue([mockUserRoleAssignment]);
      mockAdapter.findRolesByIds.mockResolvedValue([roleWithPermissions]);
      mockAdapter.findUserPermissions.mockResolvedValue([mockPermission]);
    });

    it('should return true when user has permission', async () => {
      const result = await engine.can('user-1', 'posts:update');

      expect(result).toBe(true);
      expect(mockAuditLogger.logPermissionCheck).toHaveBeenCalledWith(
        'user-1',
        'posts:update',
        true,
        expect.any(Object)
      );
    });

    it('should return false when user lacks permission', async () => {
      const roleWithoutPermissions: IRole = {
        ...mockRole,
        permissions: [],
      };
      mockAdapter.findRoleById.mockResolvedValue(roleWithoutPermissions);
      mockAdapter.findRolesByIds.mockResolvedValue([roleWithoutPermissions]);
      mockAdapter.findUserPermissions.mockResolvedValue([]);

      const result = await engine.can('user-1', 'posts:delete');

      expect(result).toBe(false);
      expect(mockAuditLogger.logPermissionCheck).toHaveBeenCalledWith(
        'user-1',
        'posts:delete',
        false,
        expect.any(Object)
      );
    });

    it('should pass context to permission checker', async () => {
      const context = {
        organizationId: 'org-1',
        resourceOwnerId: 'user-1',
        ipAddress: '127.0.0.1',
      };

      await engine.can('user-1', 'posts:update:own', context);

      expect(mockAuditLogger.logPermissionCheck).toHaveBeenCalledWith(
        'user-1',
        'posts:update:own',
        expect.any(Boolean),
        expect.objectContaining({
          organizationId: 'org-1',
          ipAddress: '127.0.0.1',
        })
      );
    });

    it('should call event hooks', async () => {
      const beforeHook = jest.fn();
      const afterHook = jest.fn();

      engine.registerHooks({
        beforePermissionCheck: beforeHook,
        afterPermissionCheck: afterHook,
      });

      await engine.can('user-1', 'posts:update');

      expect(beforeHook).toHaveBeenCalledWith('user-1', 'posts:update');
      expect(afterHook).toHaveBeenCalledWith('user-1', 'posts:update', true, undefined);
    });
  });

  describe('authorize', () => {
    beforeEach(() => {
      const roleWithPermissions: IRole = {
        ...mockRole,
        permissions: [mockPermission],
      };
      mockAdapter.findRoleById.mockResolvedValue(roleWithPermissions);
      mockAdapter.findUserRoleAssignments.mockResolvedValue([mockUserRoleAssignment]);
      mockAdapter.findRolesByIds.mockResolvedValue([roleWithPermissions]);
    });

    it('should not throw when user has permission', async () => {
      mockAdapter.findUserPermissions.mockResolvedValue([mockPermission]);

      await expect(engine.authorize('user-1', 'posts:update')).resolves.not.toThrow();
    });

    it('should throw PermissionDeniedError when user lacks permission', async () => {
      const roleWithoutPermissions: IRole = {
        ...mockRole,
        permissions: [],
      };
      mockAdapter.findRoleById.mockResolvedValue(roleWithoutPermissions);
      mockAdapter.findUserPermissions.mockResolvedValue([]);

      await expect(engine.authorize('user-1', 'posts:delete')).rejects.toThrow(
        PermissionDeniedError
      );
    });

    it('should include context in error', async () => {
      const roleWithoutPermissions: IRole = {
        ...mockRole,
        permissions: [],
      };
      mockAdapter.findRoleById.mockResolvedValue(roleWithoutPermissions);
      mockAdapter.findUserPermissions.mockResolvedValue([]);
      const context = {
        resource: 'post-123',
        organizationId: 'org-1',
      };

      try {
        await engine.authorize('user-1', 'posts:delete', context);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionDeniedError);
        const permError = error as PermissionDeniedError;
        expect(permError.userId).toBe('user-1');
        expect(permError.permission).toBe('posts:delete');
      }
    });
  });

  describe('canAny', () => {
    it('should return true if user has any permission', async () => {
      const roleWithPerms: IRole = {
        ...mockRole,
        permissions: [mockPermission],
      };
      mockAdapter.findRoleById.mockResolvedValue(roleWithPerms);
      mockAdapter.findUserPermissions.mockResolvedValue([mockPermission]);

      const result = await engine.canAny('user-1', ['posts:update', 'posts:delete']);

      expect(result).toBe(true);
    });

    it('should return false if user has none of the permissions', async () => {
      mockAdapter.findUserPermissions.mockResolvedValue([]);

      const result = await engine.canAny('user-1', ['posts:delete', 'posts:archive']);

      expect(result).toBe(false);
    });
  });

  describe('canAll', () => {
    it('should return true if user has all permissions', async () => {
      const updatePerm = { ...mockPermission, id: 'perm-1', action: 'update' };
      const deletePerm = { ...mockPermission, id: 'perm-2', action: 'delete' };
      const roleWithAllPerms: IRole = {
        ...mockRole,
        permissions: [updatePerm, deletePerm],
      };
      mockAdapter.findRoleById.mockResolvedValue(roleWithAllPerms);
      mockAdapter.findUserPermissions.mockResolvedValue([updatePerm, deletePerm]);

      const result = await engine.canAll('user-1', ['posts:update', 'posts:delete']);

      expect(result).toBe(true);
    });

    it('should return false if user is missing any permission', async () => {
      mockAdapter.findUserPermissions.mockResolvedValue([mockPermission]);

      const result = await engine.canAll('user-1', ['posts:update', 'posts:delete']);

      expect(result).toBe(false);
    });
  });

  describe('createRole', () => {
    it('should create role successfully', async () => {
      const options = {
        name: 'moderator',
        displayName: 'Moderator',
        description: 'Content moderator',
      };

      const result = await engine.createRole(options, 'admin-1');

      expect(mockAdapter.createRole).toHaveBeenCalledWith(options);
      expect(mockAuditLogger.logRoleCreation).toHaveBeenCalledWith(
        mockRole.id,
        'admin-1',
        expect.objectContaining({
          name: mockRole.name,
          displayName: mockRole.displayName,
        })
      );
      expect(result).toEqual(mockRole);
    });

    it('should validate parent roles exist', async () => {
      mockAdapter.findRoleById.mockResolvedValueOnce(null);

      await expect(
        engine.createRole({
          name: 'test',
          displayName: 'Test',
          parentRoles: ['non-existent'],
        })
      ).rejects.toThrow(RoleNotFoundError);
    });

    it('should invalidate parent role caches', async () => {
      await engine.createRole({
        name: 'test',
        displayName: 'Test',
        parentRoles: ['parent-1', 'parent-2'],
      });

      // Cache invalidation happens through hierarchyResolver
      expect(mockCache.deletePattern).toHaveBeenCalled();
    });
  });

  describe('updateRole', () => {
    it('should update role successfully', async () => {
      const options = {
        displayName: 'Senior Editor',
        description: 'Updated description',
      };

      const result = await engine.updateRole('role-1', options, 'admin-1');

      expect(mockAdapter.updateRole).toHaveBeenCalledWith('role-1', options);
      expect(mockAuditLogger.logRoleUpdate).toHaveBeenCalled();
      expect(result).toEqual(mockRole);
    });

    it('should throw if role not found', async () => {
      mockAdapter.findRoleById.mockResolvedValue(null);

      await expect(engine.updateRole('non-existent', {}, 'admin-1')).rejects.toThrow(
        RoleNotFoundError
      );
    });

    it('should prevent self-reference in parent roles', async () => {
      await expect(
        engine.updateRole('role-1', { parentRoles: ['role-1'] }, 'admin-1')
      ).rejects.toThrow(CircularHierarchyError);
    });
  });

  describe('deleteRole', () => {
    it('should delete role successfully', async () => {
      const result = await engine.deleteRole('role-1', 'admin-1');

      expect(mockAdapter.deleteRole).toHaveBeenCalledWith('role-1');
      expect(mockAuditLogger.logRoleDeletion).toHaveBeenCalledWith(
        'role-1',
        'admin-1',
        expect.objectContaining({ name: mockRole.name })
      );
      expect(result).toBe(true);
    });

    it('should return false if role not found', async () => {
      mockAdapter.findRoleById.mockResolvedValue(null);

      const result = await engine.deleteRole('non-existent', 'admin-1');

      expect(result).toBe(false);
      expect(mockAdapter.deleteRole).not.toHaveBeenCalled();
    });

    it('should prevent deletion of system roles', async () => {
      mockAdapter.findRoleById.mockResolvedValue({ ...mockRole, isSystem: true });

      await expect(engine.deleteRole('role-1', 'admin-1')).rejects.toThrow(RBACError);
      expect(mockAdapter.deleteRole).not.toHaveBeenCalled();
    });

    it('should invalidate caches on deletion', async () => {
      await engine.deleteRole('role-1', 'admin-1');

      expect(mockCache.deletePattern).toHaveBeenCalled();
    });
  });

  describe('assignRole', () => {
    it('should assign role to user successfully', async () => {
      const options = {
        userId: 'user-1',
        roleId: 'role-1',
        assignedBy: 'admin-1',
      };

      const result = await engine.assignRole(options);

      expect(mockAdapter.assignRoleToUser).toHaveBeenCalledWith(options);
      expect(mockAuditLogger.logRoleAssignment).toHaveBeenCalledWith(
        'user-1',
        'role-1',
        'admin-1',
        expect.any(Object)
      );
      expect(result).toEqual(mockUserRoleAssignment);
    });

    it('should throw if role not found', async () => {
      mockAdapter.findRoleById.mockResolvedValue(null);

      await expect(
        engine.assignRole({
          userId: 'user-1',
          roleId: 'non-existent',
          assignedBy: 'admin-1',
        })
      ).rejects.toThrow(RoleNotFoundError);
    });

    it('should call event hook on assignment', async () => {
      const hook = jest.fn();
      engine.registerHooks({ onRoleAssigned: hook });

      await engine.assignRole({
        userId: 'user-1',
        roleId: 'role-1',
        assignedBy: 'admin-1',
      });

      expect(hook).toHaveBeenCalledWith('assigned', 'user-1', 'role-1');
    });

    it('should handle temporary assignments with expiry', async () => {
      const expiresAt = new Date('2025-12-31');
      const options = {
        userId: 'user-1',
        roleId: 'role-1',
        assignedBy: 'admin-1',
        expiresAt,
      };

      await engine.assignRole(options);

      expect(mockAdapter.assignRoleToUser).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt })
      );
    });
  });

  describe('removeRole', () => {
    it('should remove role from user successfully', async () => {
      const result = await engine.removeRole('user-1', 'role-1', 'admin-1');

      expect(mockAdapter.removeRoleFromUser).toHaveBeenCalledWith('user-1', 'role-1', null);
      expect(mockAuditLogger.logRoleRemoval).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should call event hook on removal', async () => {
      const hook = jest.fn();
      engine.registerHooks({ onRoleRemoved: hook });

      await engine.removeRole('user-1', 'role-1', 'admin-1');

      expect(hook).toHaveBeenCalledWith('removed', 'user-1', 'role-1');
    });

    it('should handle organization-scoped removals', async () => {
      await engine.removeRole('user-1', 'role-1', 'admin-1', 'org-1');

      expect(mockAdapter.removeRoleFromUser).toHaveBeenCalledWith('user-1', 'role-1', 'org-1');
    });
  });

  describe('addPermissionsToRole', () => {
    it('should add permissions to role successfully', async () => {
      await engine.addPermissionsToRole('role-1', ['perm-1', 'perm-2'], 'admin-1');

      expect(mockAdapter.assignPermissionsToRole).toHaveBeenCalledWith('role-1', [
        'perm-1',
        'perm-2',
      ]);
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.ROLE_PERMISSION_ASSIGNED,
          targetId: 'role-1',
          actorId: 'admin-1',
        })
      );
    });

    it('should throw if role not found', async () => {
      mockAdapter.findRoleById.mockResolvedValue(null);

      await expect(
        engine.addPermissionsToRole('non-existent', ['perm-1'], 'admin-1')
      ).rejects.toThrow(RoleNotFoundError);
    });
  });

  describe('removePermissionsFromRole', () => {
    it('should remove permissions from role successfully', async () => {
      await engine.removePermissionsFromRole('role-1', ['perm-1'], 'admin-1');

      expect(mockAdapter.removePermissionsFromRole).toHaveBeenCalledWith('role-1', ['perm-1']);
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.ROLE_PERMISSION_REMOVED,
          targetId: 'role-1',
        })
      );
    });
  });

  describe('cache operations', () => {
    it('should invalidate user cache', async () => {
      await engine.invalidateUserCache('user-1');

      expect(mockCache.deletePattern).toHaveBeenCalled();
    });

    it('should invalidate role cache', async () => {
      await engine.invalidateRoleCache('role-1');

      expect(mockCache.deletePattern).toHaveBeenCalled();
    });

    it('should clear all caches', async () => {
      const hook = jest.fn();
      engine.registerHooks({ onCacheInvalidated: hook });

      await engine.clearAllCaches();

      expect(mockCache.clear).toHaveBeenCalled();
      expect(hook).toHaveBeenCalledWith(['all']);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all components are healthy', async () => {
      const result = await engine.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.details.initialized).toBe(true);
      expect(result.details.adapter).toBe(true);
      expect(result.details.cache).toBe(true);
    });

    it('should return unhealthy if any component fails', async () => {
      mockAdapter.healthCheck.mockResolvedValue(false);

      const result = await engine.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.details.adapter).toBe(false);
    });
  });

  describe('getters', () => {
    it('should return adapter', () => {
      expect(engine.getAdapter()).toBe(mockAdapter);
    });

    it('should return cache', () => {
      expect(engine.getCache()).toBe(mockCache);
    });

    it('should return audit logger', () => {
      expect(engine.getAuditLogger()).toBe(mockAuditLogger);
    });

    it('should return hierarchy resolver', () => {
      expect(engine.getHierarchyResolver()).toBeDefined();
    });

    it('should return options', () => {
      const options = engine.getOptions();
      expect(options).toBeDefined();
      expect(options.cacheOptions).toBeDefined();
      expect(options.permissionOptions).toBeDefined();
    });
  });

  describe('getUserRoles', () => {
    it('should get user roles successfully', async () => {
      const result = await engine.getUserRoles('user-1');

      expect(mockAdapter.findUserRoleAssignments).toHaveBeenCalledWith('user-1', undefined);
      expect(result).toEqual([mockUserRoleAssignment]);
    });

    it('should support organization-scoped queries', async () => {
      await engine.getUserRoles('user-1', 'org-1');

      expect(mockAdapter.findUserRoleAssignments).toHaveBeenCalledWith('user-1', 'org-1');
    });
  });

  describe('hasRole', () => {
    it('should check if user has role', async () => {
      const result = await engine.hasRole('user-1', 'role-1');

      expect(mockAdapter.userHasRole).toHaveBeenCalledWith('user-1', 'role-1', undefined);
      expect(result).toBe(true);
    });
  });
});
