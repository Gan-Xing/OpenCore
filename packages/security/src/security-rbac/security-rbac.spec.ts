import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import 'reflect-metadata';
import { SecurityAuthUserRepository } from '../security-auth/security-auth.repository';
import {
  SecurityAuthService,
  type AuthenticatedUser,
} from '../security-auth/security-auth.service';
import { hashSecurityPassword } from '../security-auth/security-password';
import { SecurityPermissionGuard } from './security-permission.guard';
import {
  REQUIRED_PERMISSIONS_KEY,
  REQUIRE_AUTHENTICATED_KEY,
  REQUIRED_ROLES_KEY,
  RequireAuthenticated,
  RequirePermission,
  RequireRole,
} from './security-rbac.decorators';
import { SecurityRoleGuard } from './security-role.guard';

describe('@opencore/security security-rbac', () => {
  let repository: InMemoryAuthRepository;
  let authService: SecurityAuthService;
  let adminToken: string;

  beforeEach(async () => {
    repository = new InMemoryAuthRepository();
    authService = new SecurityAuthService(repository);
    adminToken = (await authService.login('admin', 'admin123')).accessToken;
  });

  it('sets permission and role metadata through decorators', () => {
    class PermissionTarget {}
    class AuthenticatedTarget {}
    class RoleTarget {}

    RequirePermission('core:user:read')(PermissionTarget);
    RequireAuthenticated()(AuthenticatedTarget);
    RequireRole('admin')(RoleTarget);

    expect(readMetadata(REQUIRED_PERMISSIONS_KEY, PermissionTarget)).toEqual([
      'core:user:read',
    ]);
    expect(readMetadata(REQUIRE_AUTHENTICATED_KEY, AuthenticatedTarget)).toBe(
      true,
    );
    expect(readMetadata(REQUIRED_ROLES_KEY, RoleTarget)).toEqual(['admin']);
  });

  it('allows requests whose bearer token has the required permission', async () => {
    const guard = new SecurityPermissionGuard(
      createReflector(REQUIRED_PERMISSIONS_KEY, ['core:user:read']),
      authService,
    );
    const request = createRequest(adminToken);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual(
      expect.objectContaining({ username: 'admin' }),
    );
  });

  it('rejects missing bearer tokens and missing permissions', async () => {
    const guard = new SecurityPermissionGuard(
      createReflector(REQUIRED_PERMISSIONS_KEY, ['core:user:delete']),
      authService,
    );

    await expect(
      guard.canActivate(createContext({ headers: {} })),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      guard.canActivate(createContext(createRequest(adminToken))),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows authenticated-only requests without requiring a permission', async () => {
    const guard = new SecurityPermissionGuard(
      createReflector(REQUIRE_AUTHENTICATED_KEY, true),
      authService,
    );
    const request = createRequest(adminToken);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual(
      expect.objectContaining({ username: 'admin' }),
    );
  });

  it('allows requests with any matching required role', async () => {
    const guard = new SecurityRoleGuard(
      createReflector(REQUIRED_ROLES_KEY, ['operator', 'admin']),
      authService,
    );
    const request = createRequest(adminToken);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual(
      expect.objectContaining({ roleCodes: ['admin'] }),
    );
  });

  it('rejects authenticated users missing the required role', async () => {
    const guard = new SecurityRoleGuard(
      createReflector(REQUIRED_ROLES_KEY, ['operator']),
      authService,
    );

    await expect(
      guard.canActivate(createContext(createRequest(adminToken))),
    ).rejects.toThrow(ForbiddenException);
  });

  it('reuses the request user when an earlier guard has already authenticated', async () => {
    const guard = new SecurityPermissionGuard(
      createReflector(REQUIRED_PERMISSIONS_KEY, ['core:user:read']),
      authService,
    );
    const request = {
      headers: {},
      user: repository.adminUser(),
    };

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });
});

class InMemoryAuthRepository extends SecurityAuthUserRepository {
  private readonly users = [
    {
      id: 'user_admin',
      username: 'admin',
      displayName: 'Admin',
      passwordHash: hashSecurityPassword('admin123'),
      roleCodes: ['admin'],
      permissionCodes: ['core:user:read'],
      enabled: true,
    },
  ];

  adminUser(): AuthenticatedUser {
    const user = this.users[0];

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roleCodes: [...user.roleCodes],
      permissionCodes: [...user.permissionCodes],
    };
  }

  async findUserByUsername(username: string) {
    return this.users.find((user) => user.username === username);
  }

  async findUserById(id: string) {
    return this.users.find((user) => user.id === id);
  }

  async getPermissionCodesForUser(userId: string): Promise<string[]> {
    return this.users.find((user) => user.id === userId)?.permissionCodes ?? [];
  }
}

function createRequest(accessToken: string): {
  headers: { authorization: string };
  user?: AuthenticatedUser;
} {
  return {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  };
}

function createReflector(key: string, values: unknown): Reflector {
  return {
    getAllAndOverride: (metadataKey: string) =>
      metadataKey === key ? values : undefined,
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

function readMetadata(key: string, target: object): unknown {
  return (
    Reflect as unknown as {
      getMetadata(metadataKey: string, metadataTarget: object): unknown;
    }
  ).getMetadata(key, target);
}
