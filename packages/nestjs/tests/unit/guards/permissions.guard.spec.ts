import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../../../src/guards/permissions.guard';
import { RBACEngine } from '@prodforcode/rbac-core';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let rbacEngine: jest.Mocked<RBACEngine>;
  let context: jest.Mocked<ExecutionContext>;

  beforeEach(() => {
    reflector = new Reflector();
    rbacEngine = {
      canAll: jest.fn(),
    } as any;

    guard = new PermissionsGuard(reflector, rbacEngine);

    // Mock ExecutionContext
    context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: 'user-123' },
        }),
      }),
    } as any;
  });

  describe('canActivate', () => {
    it('should allow access when no permissions are required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when empty permissions array', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user is not authenticated', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['users:read']);
      context.switchToHttp().getRequest = jest.fn().mockReturnValue({
        user: null,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should allow access when user has all required permissions', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['users:read', 'users:write']);
      rbacEngine.canAll.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rbacEngine.canAll).toHaveBeenCalledWith('user-123', ['users:read', 'users:write']);
    });

    it('should deny access when user does not have all required permissions', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['users:read', 'users:delete']);
      rbacEngine.canAll.mockResolvedValue(false);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should handle single permission check', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['posts:read']);
      rbacEngine.canAll.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rbacEngine.canAll).toHaveBeenCalledWith('user-123', ['posts:read']);
    });
  });
});
