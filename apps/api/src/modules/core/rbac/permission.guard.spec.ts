import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { SecurityBearerTokenService } from '@opencore/security';
import {
  seedSystemUsers,
  type SystemUserRecord,
} from '@opencore/system/records';
import { AuthService } from './auth.service';
import { PermissionGuard } from './permission.guard';
import { hashPassword } from './rbac.password';
import { SeedRbacRepository } from './seed-rbac.repository';

describe('PermissionGuard', () => {
  let repository: SeedRbacRepository;
  let authService: AuthService;
  let token: string;

  beforeEach(async () => {
    repository = new SeedRbacRepository(createPermissionGuardUsers());
    authService = new AuthService(repository);
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

  it('rejects requests without a bearer token', async () => {
    const guard = new PermissionGuard(
      createReflector(['core:user:read']),
      authService,
    );

    await expect(
      guard.canActivate(
        createContext({
          headers: {},
        }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects tokens for disabled users', async () => {
    const disabledToken = createTestToken('user_disabled');
    const guard = new PermissionGuard(
      createReflector(['core:user:read']),
      authService,
    );

    await expect(
      guard.canActivate(
        createContext({
          headers: {
            authorization: `Bearer ${disabledToken}`,
          },
        }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects dangerous operations without the matching dangerous permission', async () => {
    const viewerToken = (await authService.login('viewer', 'viewer123'))
      .accessToken;
    const guard = new PermissionGuard(
      createReflector(['core:user:delete']),
      authService,
    );

    await expect(
      guard.canActivate(
        createContext({
          headers: {
            authorization: `Bearer ${viewerToken}`,
          },
        }),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});

function createPermissionGuardUsers(): readonly SystemUserRecord[] {
  return [
    ...seedSystemUsers,
    {
      id: 'user_viewer',
      username: 'viewer',
      displayName: 'Viewer User',
      passwordHash: hashPassword('viewer123'),
      roleCodes: ['viewer'],
      postCodes: [],
      enabled: true,
      system: false,
    },
    {
      id: 'user_disabled',
      username: 'disabled',
      displayName: 'Disabled User',
      passwordHash: hashPassword('disabled123'),
      roleCodes: ['viewer'],
      postCodes: [],
      enabled: false,
      system: false,
    },
  ];
}

function createTestToken(userId: string): string {
  return new SecurityBearerTokenService().signSubject(userId).accessToken;
}

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
