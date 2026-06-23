import { UnauthorizedException } from '@nestjs/common';
import {
  normalizeLoginLockoutLookupInput,
  SecurityLoginLockoutRepository,
  type SecurityLoginLockoutAttemptInput,
  type SecurityLoginLockoutLookupInput,
  type SecurityLoginLockoutRecord,
  type SecurityLoginPolicy,
  SecurityLoginPolicyProvider,
  SecurityAuthSessionRepository,
  type SecurityAuthSessionRecord,
  type SecurityAuthSessionContext,
  type SecurityAuthSessionRevocationInput,
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

    const session = expectAuthenticated(
      await service.login('admin', 'admin123', {
        ip: '127.0.0.1',
        requestId: 'req_login_success',
        userAgent: 'jest',
      }),
    );

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
        tenantId: 'tenant_root',
        membershipId: 'tenant_membership_root_user_admin',
        accessMode: 'tenant',
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
        tenantId: 'tenant_root',
        logType: 'login.username',
        result: 'success',
        success: true,
        failureReason: undefined,
        ip: '127.0.0.1',
        requestId: 'req_login_success',
        userAgent: 'jest',
      },
    ]);
  });

  it('logs out the current bearer token and records a self logout log', async () => {
    const repository = new InMemorySecurityAuthUserRepository();
    const loginAttempts = new InMemorySecurityLoginAttemptRecorder();
    const sessions = new InMemorySecurityAuthSessionRepository();
    const service = new SecurityAuthService(
      repository,
      loginAttempts,
      sessions,
    );

    const session = expectAuthenticated(
      await service.login('admin', 'admin123', {
        ip: '127.0.0.1',
        requestId: 'req_login_before_logout',
        userAgent: 'jest-login',
      }),
    );
    const tokenId = sessions.records[0].tokenId;

    await expect(
      service.logout(`Bearer ${session.accessToken}`, {
        ip: '127.0.0.2',
        requestId: 'req_logout_self',
        userAgent: 'jest-logout',
      }),
    ).resolves.toEqual({ loggedOut: true });

    expect(sessions.revocations).toEqual([
      {
        tokenId,
        actor: 'admin',
        reason: 'self logout',
      },
    ]);
    await expect(
      service.authenticateBearer(`Bearer ${session.accessToken}`),
    ).rejects.toThrow(UnauthorizedException);
    expect(loginAttempts.records).toEqual([
      expect.objectContaining({
        username: 'admin',
        logType: 'login.username',
        result: 'success',
        success: true,
        requestId: 'req_login_before_logout',
      }),
      {
        username: 'admin',
        tenantId: 'tenant_root',
        logType: 'logout.self',
        result: 'success',
        success: true,
        failureReason: undefined,
        actorUsername: 'admin',
        reason: 'self logout',
        ip: '127.0.0.2',
        requestId: 'req_logout_self',
        userAgent: 'jest-logout',
      },
    ]);
  });

  it('returns a login ticket when multiple tenants are available and selects one', async () => {
    const repository = new MultiTenantSecurityAuthUserRepository();
    const sessions = new InMemorySecurityAuthSessionRepository();
    const service = new SecurityAuthService(
      repository,
      new InMemorySecurityLoginAttemptRecorder(),
      sessions,
    );

    const result = await service.login('admin', 'admin123');

    expect(result).toMatchObject({
      status: 'tenant_selection_required',
      tenantOptions: [
        expect.objectContaining({ code: 'alpha' }),
        expect.objectContaining({ code: 'beta' }),
      ],
    });

    if (result.status !== 'tenant_selection_required') {
      throw new Error('Expected tenant selection response');
    }

    const session = await service.selectTenant(result.loginTicket, {
      tenantCode: 'beta',
    });

    expect(session.user.activeTenant).toMatchObject({ code: 'beta' });
    expect(session.user).toMatchObject({
      permissionCodes: ['core:user:read'],
      postCodes: ['engineer'],
      roleCodes: ['viewer'],
    });
    await expect(
      service.authenticateBearer(`Bearer ${session.accessToken}`),
    ).resolves.toMatchObject({
      activeTenant: expect.objectContaining({ code: 'beta' }),
      permissionCodes: ['core:user:read'],
      postCodes: ['engineer'],
      roleCodes: ['viewer'],
      username: 'admin',
    });
  });

  it('issues platform visit sessions without tenant membership', async () => {
    const repository = new PlatformVisitSecurityAuthUserRepository();
    const sessions = new InMemorySecurityAuthSessionRepository();
    const service = new SecurityAuthService(
      repository,
      new InMemorySecurityLoginAttemptRecorder(),
      sessions,
    );

    const rootSession = expectAuthenticated(
      await service.login('admin', 'admin123'),
    );
    const rootTokenId = sessions.records[0].tokenId;
    const visitSession = await service.visitTenantAsPlatform(
      `Bearer ${rootSession.accessToken}`,
      {
        reason: 'support check',
        tenantCode: 'beta',
      },
    );

    expect(visitSession.user).toMatchObject({
      accessMode: 'platform-visit',
      activeMembership: undefined,
      activeTenant: expect.objectContaining({ code: 'beta' }),
      permissionCodes: expect.arrayContaining(['platform:tenant:visit']),
    });
    expect(sessions.records.at(-1)).toEqual(
      expect.objectContaining({
        accessMode: 'platform-visit',
        tenantId: 'tenant_beta',
      }),
    );
    expect(sessions.records.at(-1)).not.toHaveProperty('membershipId');
    expect(sessions.revocations).toContainEqual({
      actor: 'admin',
      reason: 'platform tenant visit: support check',
      tokenId: rootTokenId,
    });
    await expect(
      service.authenticateBearer(`Bearer ${visitSession.accessToken}`),
    ).resolves.toMatchObject({
      accessMode: 'platform-visit',
      activeMembership: undefined,
      activeTenant: expect.objectContaining({ code: 'beta' }),
    });
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
    await expect(service.login('missing', 'missing123')).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      }),
    });
    expect(loginAttempts.records).toEqual([
      expect.objectContaining({
        username: 'admin',
        logType: 'login.username',
        result: 'bad_credentials',
        success: false,
        failureReason: 'invalid-credentials',
      }),
      expect.objectContaining({
        username: 'disabled',
        logType: 'login.username',
        result: 'user_disabled',
        success: false,
        failureReason: 'user-disabled',
      }),
      expect.objectContaining({
        username: 'missing',
        logType: 'login.username',
        result: 'bad_credentials',
        success: false,
        failureReason: 'invalid-credentials',
      }),
    ]);
  });

  it('locks repeated bad password attempts and allows explicit unlock', async () => {
    const repository = new InMemorySecurityAuthUserRepository();
    const loginAttempts = new InMemorySecurityLoginAttemptRecorder();
    const loginLockouts = new InMemorySecurityLoginLockoutRepository();
    const service = new SecurityAuthService(
      repository,
      loginAttempts,
      new InMemorySecurityAuthSessionRepository(),
      new SecurityBearerTokenService(),
      new StaticSecurityLoginPolicyProvider({
        maxFailedAttempts: 2,
        lockoutMinutes: 15,
      }),
      loginLockouts,
    );

    const platformHost = { tenantHost: '127.0.0.1:39172' };

    await expect(service.login('admin', 'wrong', platformHost)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(
      service.login('admin', 'still-wrong', platformHost),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      service.login('admin', 'admin123', platformHost),
    ).rejects.toThrow(UnauthorizedException);

    expect(loginAttempts.records).toEqual([
      expect.objectContaining({
        username: 'admin',
        result: 'bad_credentials',
        success: false,
        failureReason: 'invalid-credentials',
      }),
      expect.objectContaining({
        username: 'admin',
        result: 'account_locked',
        success: false,
        failureReason: 'account-locked',
      }),
      expect.objectContaining({
        username: 'admin',
        result: 'account_locked',
        success: false,
        failureReason: 'account-locked',
      }),
    ]);

    await expect(loginLockouts.clearLoginLockout('admin')).resolves.toEqual(
      expect.objectContaining({
        username: 'admin',
        unlocked: true,
        failedAttempts: 2,
      }),
    );
    await expect(service.login('admin', 'admin123')).resolves.toMatchObject({
      user: {
        username: 'admin',
      },
    });
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

class MultiTenantSecurityAuthUserRepository extends InMemorySecurityAuthUserRepository {
  async listTenantMembershipsForUser() {
    return [
      {
        enabledModuleCodes: ['core.user'],
        isOwner: true,
        membershipId: 'tenant_membership_alpha_user_admin',
        membershipStatus: 'active',
        permissionCodes: ['core:dashboard:read'],
        postCodes: ['admin'],
        roleCodes: ['owner'],
        tenantCode: 'alpha',
        tenantId: 'tenant_alpha',
        tenantName: 'Alpha',
        tenantSlug: 'alpha',
        tenantStatus: 'active',
      },
      {
        enabledModuleCodes: ['core.user'],
        isOwner: false,
        membershipId: 'tenant_membership_beta_user_admin',
        membershipStatus: 'active',
        permissionCodes: ['core:user:read'],
        postCodes: ['engineer'],
        roleCodes: ['viewer'],
        tenantCode: 'beta',
        tenantId: 'tenant_beta',
        tenantName: 'Beta',
        tenantSlug: 'beta',
        tenantStatus: 'active',
      },
    ];
  }
}

class PlatformVisitSecurityAuthUserRepository extends InMemorySecurityAuthUserRepository {
  override async getPermissionCodesForUser(): Promise<string[]> {
    return ['core:dashboard:read', 'platform:tenant:visit'];
  }

  override async findTenantForVisit(input: {
    tenantCode?: string;
    tenantId?: string;
  }) {
    if (input.tenantCode === 'beta' || input.tenantId === 'tenant_beta') {
      return {
        code: 'beta',
        enabledModuleCodes: ['core.dashboard'],
        id: 'tenant_beta',
        name: 'Beta',
        slug: 'beta',
        status: 'active',
      };
    }

    return super.findTenantForVisit(input);
  }
}

class InMemorySecurityAuthSessionRepository extends SecurityAuthSessionRepository {
  readonly records: SecurityAuthSessionRecord[] = [];
  readonly revokedTokenIds = new Set<string>();
  readonly revocations: Array<
    SecurityAuthSessionRevocationInput & { tokenId: string }
  > = [];

  async registerSession(record: SecurityAuthSessionRecord): Promise<void> {
    this.records.push({ ...record });
  }

  async assertSessionActive(
    tokenId: string,
  ): Promise<SecurityAuthSessionContext | undefined> {
    if (this.revokedTokenIds.has(tokenId)) {
      throw new UnauthorizedException('Bearer token has been revoked');
    }

    const record = this.records.find((session) => session.tokenId === tokenId);

    return record
      ? {
          accessMode: record.accessMode,
          membershipId: record.membershipId,
          tenantId: record.tenantId,
          tokenId,
        }
      : undefined;
  }

  async revokeSession(
    tokenId: string,
    input: SecurityAuthSessionRevocationInput,
  ): Promise<void> {
    this.revokedTokenIds.add(tokenId);
    this.revocations.push({ tokenId, ...input });
  }
}

function expectAuthenticated(
  session: Awaited<ReturnType<SecurityAuthService['login']>>,
) {
  if (session.status !== 'authenticated') {
    throw new Error('Expected authenticated login response');
  }

  return session;
}

class InMemorySecurityLoginAttemptRecorder extends SecurityLoginAttemptRecorder {
  readonly records: SecurityLoginAttemptRecord[] = [];

  async recordLoginAttempt(record: SecurityLoginAttemptRecord): Promise<void> {
    this.records.push({ ...record });
  }
}

class StaticSecurityLoginPolicyProvider extends SecurityLoginPolicyProvider {
  constructor(private readonly policy: SecurityLoginPolicy) {
    super();
  }

  async getLoginPolicy(): Promise<SecurityLoginPolicy> {
    return { ...this.policy };
  }
}

class InMemorySecurityLoginLockoutRepository extends SecurityLoginLockoutRepository {
  private readonly records = new Map<string, SecurityLoginLockoutRecord>();

  async getLoginLockout(
    input: SecurityLoginLockoutLookupInput,
  ): Promise<SecurityLoginLockoutRecord | undefined> {
    return this.clone(this.records.get(this.key(input)));
  }

  async recordFailedLoginAttempt(
    input: SecurityLoginLockoutAttemptInput,
  ): Promise<SecurityLoginLockoutRecord> {
    const key = this.key(input);
    const current = this.records.get(key);
    const now = new Date();
    const failedAttempts = (current?.failedAttempts ?? 0) + 1;
    const lockedUntil =
      failedAttempts >= input.maxFailedAttempts
        ? new Date(now.getTime() + input.lockoutMinutes * 60_000).toISOString()
        : undefined;
    const record: SecurityLoginLockoutRecord = {
      tenantId: input.tenantId,
      username: input.username,
      failedAttempts,
      lockedUntil,
      lastFailedAt: now.toISOString(),
    };

    this.records.set(key, record);
    return { ...record };
  }

  async clearLoginLockout(input: SecurityLoginLockoutLookupInput) {
    const lookup = normalizeLoginLockoutLookupInput(input);
    const key = this.key(lookup);
    const current = this.records.get(key);
    this.records.delete(key);
    return {
      tenantId: lookup.tenantId ?? 'tenant_root',
      username: lookup.username,
      unlocked: Boolean(current),
      failedAttempts: current?.failedAttempts ?? 0,
      lockedUntil: current?.lockedUntil,
    };
  }

  private key(input: SecurityLoginLockoutLookupInput): string {
    const lookup = normalizeLoginLockoutLookupInput(input);

    return `${lookup.tenantId ?? 'tenant_root'}:${lookup.username}`;
  }

  private clone(
    record: SecurityLoginLockoutRecord | undefined,
  ): SecurityLoginLockoutRecord | undefined {
    return record ? { ...record } : undefined;
  }
}
