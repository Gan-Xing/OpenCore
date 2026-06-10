import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { PermissionGuard } from './permission.guard';
import { SeedRbacRepository } from './seed-rbac.repository';

describe('PermissionGuard', () => {
  const authService = new AuthService(new SeedRbacRepository());
  let token: string;

  beforeAll(async () => {
    token = (await authService.login('admin', 'admin123')).accessToken;
  });

  it('allows requests whose bearer token has the required permission', async () => {
    const guard = new PermissionGuard(
      createReflector(['core:user:read']),
      authService,
    );
    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request).toHaveProperty('user.username', 'admin');
  });

  it('rejects authenticated users missing the required permission', async () => {
    const guard = new PermissionGuard(
      createReflector(['industry:crm:read']),
      authService,
    );

    await expect(
      guard.canActivate(
        createContext({
          headers: {
            authorization: `Bearer ${token}`,
          },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});

function createReflector(requiredPermissions: string[]): Reflector {
  return {
    getAllAndOverride: () => requiredPermissions,
  } as unknown as Reflector;
}

function createContext(request: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}
