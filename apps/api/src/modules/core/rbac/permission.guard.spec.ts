import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { PermissionGuard } from './permission.guard';
import { RbacRepository } from './rbac.repository';

describe('PermissionGuard', () => {
  const authService = new AuthService(new RbacRepository());
  const token = authService.login('admin', 'admin123').accessToken;

  it('allows requests whose bearer token has the required permission', () => {
    const guard = new PermissionGuard(
      createReflector(['core:user:read']),
      authService,
    );
    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    expect(guard.canActivate(createContext(request))).toBe(true);
    expect(request).toHaveProperty('user.username', 'admin');
  });

  it('rejects authenticated users missing the required permission', () => {
    const guard = new PermissionGuard(
      createReflector(['industry:crm:read']),
      authService,
    );

    expect(() =>
      guard.canActivate(
        createContext({
          headers: {
            authorization: `Bearer ${token}`,
          },
        }),
      ),
    ).toThrow(ForbiddenException);
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
