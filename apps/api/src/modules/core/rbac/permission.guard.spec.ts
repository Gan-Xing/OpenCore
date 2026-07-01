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
    token = expectAuthenticated(
      await authService.login('admin', 'admin123'),
    ).accessToken;
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
    const viewerToken = expectAuthenticated(
      await authService.login('viewer', 'viewer123'),
    ).accessToken;
    const guard = new PermissionGuard(
      createReflector(['business:core:read']),
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
    const viewerToken = expectAuthenticated(
      await authService.login('viewer', 'viewer123'),
    ).accessToken;
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
      createdAt: '2026-06-10T00:00:00.000Z',
      updatedAt: '2026-06-10T00:00:00.000Z',
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
      createdAt: '2026-06-10T00:00:00.000Z',
      updatedAt: '2026-06-10T00:00:00.000Z',
    },
  ];
}

function expectAuthenticated(
  session: Awaited<ReturnType<AuthService['login']>>,
) {
  if (session.status !== 'authenticated') {
    throw new Error('Expected authenticated login response');
  }

  return session;
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
