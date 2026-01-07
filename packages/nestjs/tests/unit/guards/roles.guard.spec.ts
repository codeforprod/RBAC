import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../../src/guards/roles.guard';
import { RBACEngine } from '@holocron/rbac-core';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let rbacEngine: jest.Mocked<RBACEngine>;
  let context: jest.Mocked<ExecutionContext>;

  beforeEach(() => {
    reflector = new Reflector();
    rbacEngine = {
      hasRole: jest.fn(),
    } as any;

    guard = new RolesGuard(reflector, rbacEngine);

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
    it('should allow access when no roles are required', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when empty roles array', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when user is not authenticated', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      context.switchToHttp().getRequest = jest.fn().mockReturnValue({
        user: null,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should allow access when user has required role', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      rbacEngine.hasRole.mockResolvedValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rbacEngine.hasRole).toHaveBeenCalledWith('user-123', 'admin');
    });

    it('should deny access when user does not have required role', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
      rbacEngine.hasRole.mockResolvedValue(false);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should allow access when user has ANY of multiple required roles', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'moderator']);
      rbacEngine.hasRole
        .mockResolvedValueOnce(false) // admin: false
        .mockResolvedValueOnce(true);  // moderator: true

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rbacEngine.hasRole).toHaveBeenCalledTimes(2);
    });

    it('should deny access when user has NONE of the required roles', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'moderator']);
      rbacEngine.hasRole.mockResolvedValue(false);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
    });
  });
});
