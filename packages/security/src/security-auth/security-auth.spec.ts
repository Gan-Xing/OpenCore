import { UnauthorizedException } from '@nestjs/common';
import {
  SecurityAuthSessionRepository,
  type SecurityAuthSessionRecord,
  SecurityAuthUserRepository,
  type SecurityAuthUserRecord,
  SecurityLoginAttemptRecorder,
  type SecurityLoginAttemptRecord,
} from './security-auth.repository';
import { SecurityAuthService } from './security-auth.service';
import { SecurityBearerTokenService } from './security-bearer-token.service';
import {
  hashSecurityPassword,
  verifySecurityPassword,
} from './security-password';

describe('@opencore/security security-auth', () => {
  it('hashes and verifies passwords deterministically', () => {
    const passwordHash = hashSecurityPassword('admin123');

    expect(passwordHash).toHaveLength(64);
    expect(verifySecurityPassword('admin123', passwordHash)).toBe(true);
    expect(verifySecurityPassword('wrong', passwordHash)).toBe(false);
  });

  it('signs, verifies and rejects bearer tokens', () => {
    const tokens = new SecurityBearerTokenService();
    const issuedAt = Date.now();
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(issuedAt);
    const token = tokens.signSubject('user_admin');

    expect(token).toMatchObject({
      tokenId: expect.any(String),
      tokenType: 'Bearer',
      expiresInSeconds: 3600,
      expiresAt: new Date(
        (Math.floor(issuedAt / 1000) + 3600) * 1000,
      ).toISOString(),
    });
    expect(tokens.verifyAuthorization(`Bearer ${token.accessToken}`)).toBe(
      'user_admin',
    );
    expect(() => tokens.verifyAuthorization(undefined)).toThrow(
      UnauthorizedException,
    );
    expect(() => tokens.verifyToken(`${token.accessToken}tampered`)).toThrow(
      UnauthorizedException,
    );

    dateSpy.mockReturnValue(issuedAt + 3601 * 1000);
    expect(() => tokens.verifyToken(token.accessToken)).toThrow(
      UnauthorizedException,
    );
    dateSpy.mockRestore();
  });

  it('logs in, authenticates bearer tokens and records login attempts', async () => {
    const repository = new InMemorySecurityAuthUserRepository();
    const loginAttempts = new InMemorySecurityLoginAttemptRecorder();
    const sessions = new InMemorySecurityAuthSessionRepository();
    const service = new SecurityAuthService(
      repository,
      loginAttempts,
      sessions,
    );

    const session = await service.login('admin', 'admin123', {
      ip: '127.0.0.1',
      requestId: 'req_login_success',
      userAgent: 'jest',
    });

    expect(session.user).toMatchObject({
      username: 'admin',
      roleCodes: ['admin'],
      avatarUrl: '/api/core/users/user_admin/avatar?v=test',
    });
    await expect(
      service.authenticateBearer(`Bearer ${session.accessToken}`),
    ).resolves.toMatchObject({
      username: 'admin',
      permissionCodes: ['core:dashboard:read'],
      avatarUrl: '/api/core/users/user_admin/avatar?v=test',
    });
    expect(sessions.records).toEqual([
      expect.objectContaining({
        username: 'admin',
        ip: '127.0.0.1',
        userAgent: 'jest',
        tokenId: expect.any(String),
      }),
    ]);

    sessions.revokedTokenIds.add(sessions.records[0].tokenId);
    await expect(
      service.authenticateBearer(`Bearer ${session.accessToken}`),
    ).rejects.toThrow(UnauthorizedException);
    expect(loginAttempts.records).toEqual([
      {
        username: 'admin',
        success: true,
        failureReason: undefined,
        ip: '127.0.0.1',
        requestId: 'req_login_success',
        userAgent: 'jest',
      },
    ]);
  });

  it('rejects invalid credentials and disabled users', async () => {
    const repository = new InMemorySecurityAuthUserRepository();
    const loginAttempts = new InMemorySecurityLoginAttemptRecorder();
    const service = new SecurityAuthService(repository, loginAttempts);

    await expect(service.login('admin', 'wrong')).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.login('disabled', 'disabled123')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(loginAttempts.records).toEqual([
      expect.objectContaining({
        username: 'admin',
        success: false,
        failureReason: 'invalid-credentials-or-disabled',
      }),
      expect.objectContaining({
        username: 'disabled',
        success: false,
        failureReason: 'invalid-credentials-or-disabled',
      }),
    ]);
  });
});

class InMemorySecurityAuthUserRepository extends SecurityAuthUserRepository {
  private readonly users: SecurityAuthUserRecord[] = [
    {
      id: 'user_admin',
      username: 'admin',
      displayName: 'Admin',
      passwordHash: hashSecurityPassword('admin123'),
      roleCodes: ['admin'],
      enabled: true,
      avatarUrl: '/api/core/users/user_admin/avatar?v=test',
    },
    {
      id: 'user_disabled',
      username: 'disabled',
      displayName: 'Disabled',
      passwordHash: hashSecurityPassword('disabled123'),
      roleCodes: ['viewer'],
      enabled: false,
    },
  ];

  async findUserByUsername(
    username: string,
  ): Promise<SecurityAuthUserRecord | undefined> {
    return this.users.find((user) => user.username === username);
  }

  async findUserById(id: string): Promise<SecurityAuthUserRecord | undefined> {
    return this.users.find((user) => user.id === id);
  }

  async getPermissionCodesForUser(userId: string): Promise<string[]> {
    return userId === 'user_admin' ? ['core:dashboard:read'] : [];
  }
}

class InMemorySecurityAuthSessionRepository extends SecurityAuthSessionRepository {
  readonly records: SecurityAuthSessionRecord[] = [];
  readonly revokedTokenIds = new Set<string>();

  async registerSession(record: SecurityAuthSessionRecord): Promise<void> {
    this.records.push({ ...record });
  }

  async assertSessionActive(tokenId: string): Promise<void> {
    if (this.revokedTokenIds.has(tokenId)) {
      throw new UnauthorizedException('Bearer token has been revoked');
    }
  }
}

class InMemorySecurityLoginAttemptRecorder extends SecurityLoginAttemptRecorder {
  readonly records: SecurityLoginAttemptRecord[] = [];

  async recordLoginAttempt(record: SecurityLoginAttemptRecord): Promise<void> {
    this.records.push({ ...record });
  }
}
