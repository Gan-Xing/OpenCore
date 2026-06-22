import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createApiErrorBody } from '@opencore/common';
import {
  AllowAllSecurityAuthSessionRepository,
  DefaultSecurityLoginPolicyProvider,
  NoopSecurityLoginLockoutRepository,
  NoopSecurityLoginAttemptRecorder,
  SecurityAuthSessionRepository,
  SecurityAuthUserRepository,
  SecurityLoginLockoutRepository,
  SecurityLoginAttemptRecorder,
  SecurityLoginPolicyProvider,
  type SecurityLoginLockoutRecord,
  type SecurityLoginAttemptRecord,
  type SecurityLoginResult,
  type SecurityLoginLogType,
  type SecurityAuthUserRecord,
  type SecurityAuthTenantMembershipLookup,
  type SecurityAuthTenantMembershipRecord,
  type SecurityAuthSessionContext,
  type SecurityTenantAccessMode,
} from './security-auth.repository';
import { SecurityBearerTokenService } from './security-bearer-token.service';
import { verifySecurityPassword } from './security-password';

export type AuthenticatedTenant = {
  id: string;
  code: string;
  slug: string;
  name: string;
  status: string;
};

export type AuthenticatedMembership = {
  id: string;
  status: string;
  isOwner: boolean;
};

export type TenantLoginOption = AuthenticatedTenant & {
  membershipId: string;
  membershipStatus: string;
  isOwner: boolean;
};

export type AuthenticatedUser = {
  id: string;
  username: string;
  displayName: string;
  roleCodes: readonly string[];
  permissionCodes: readonly string[];
  accessMode: SecurityTenantAccessMode;
  activeTenant?: AuthenticatedTenant;
  activeMembership?: AuthenticatedMembership;
  enabledModuleCodes: readonly string[];
  tenantOptions: readonly TenantLoginOption[];
  avatarUrl?: string;
};

export type LoginContext = {
  ip?: string;
  tenantCode?: string;
  tenantHost?: string;
  userAgent?: string;
  requestId?: string;
};

export type LoginResponse = {
  status: 'authenticated';
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  user: AuthenticatedUser;
};

export type TenantSelectionLoginResponse = {
  status: 'tenant_selection_required';
  loginTicket: string;
  tenantOptions: readonly TenantLoginOption[];
};

export type LoginResult = LoginResponse | TenantSelectionLoginResponse;

export type TenantSessionSelection = Pick<
  SecurityAuthTenantMembershipLookup,
  'membershipId' | 'tenantCode' | 'tenantHost' | 'tenantId'
>;

export type LogoutResponse = {
  loggedOut: true;
};

@Injectable()
export class SecurityAuthService {
  constructor(
    private readonly repository: SecurityAuthUserRepository,
    private readonly loginAttempts: SecurityLoginAttemptRecorder = new NoopSecurityLoginAttemptRecorder(),
    private readonly sessions: SecurityAuthSessionRepository = new AllowAllSecurityAuthSessionRepository(),
    private readonly bearerTokens: SecurityBearerTokenService = new SecurityBearerTokenService(),
    private readonly loginPolicy: SecurityLoginPolicyProvider = new DefaultSecurityLoginPolicyProvider(),
    private readonly loginLockouts: SecurityLoginLockoutRepository = new NoopSecurityLoginLockoutRepository(),
  ) {}

  async login(
    username: string,
    password: string,
    context: LoginContext = {},
  ): Promise<LoginResult> {
    const { normalizedUsername, user } = await this.assertUsernamePassword(
      username,
      password,
      context,
    );
    const tenant = await this.resolveTenantMembershipForLogin(user.id, context);
    await this.loginLockouts.clearLoginLockout(normalizedUsername);
    await this.recordLoginAttempt(
      normalizedUsername,
      'success',
      undefined,
      context,
    );

    if (tenant.status === 'selection') {
      return tenant.response;
    }

    const session = await this.issueSession(user, tenant.membership, context);
    return session;
  }

  async verifyCredentials(
    username: string,
    password: string,
    context: LoginContext = {},
  ): Promise<AuthenticatedUser> {
    const { normalizedUsername, user } = await this.assertUsernamePassword(
      username,
      password,
      context,
    );
    await this.loginLockouts.clearLoginLockout(normalizedUsername);
    return this.toAuthenticatedUser(user.id);
  }

  async createSocialSessionForUser(
    userId: string,
    context: LoginContext = {},
    provider?: { providerAccountId?: string; providerCode?: string },
  ): Promise<LoginResponse> {
    const session = await this.createSessionForUser(userId, context);
    await this.recordLoginAttempt(
      session.user.username,
      'success',
      undefined,
      context,
      'login.social',
      {
        actorUsername: session.user.username,
        reason: provider?.providerCode
          ? `${provider.providerCode}:${provider.providerAccountId ?? 'unknown'}`
          : 'social login',
      },
    );
    return session;
  }

  async createSessionForUser(
    userId: string,
    context: LoginContext = {},
    selection: TenantSessionSelection = {},
  ): Promise<LoginResponse> {
    const user = await this.assertActiveUser(userId);
    const membership = await this.resolveTenantMembershipForSession(userId, {
      tenantCode: context.tenantCode,
      tenantHost: context.tenantHost,
      ...selection,
    });

    return this.issueSession(user, membership, context);
  }

  async selectTenant(
    loginTicket: string,
    selection: TenantSessionSelection,
    context: LoginContext = {},
  ): Promise<LoginResponse> {
    const userId = this.bearerTokens.verifyLoginTicket(loginTicket);

    return this.createSessionForUser(userId, context, selection);
  }

  async switchTenant(
    authorization: string | undefined,
    selection: TenantSessionSelection,
    context: LoginContext = {},
  ): Promise<LoginResponse> {
    const token = this.bearerTokens.verifyAuthorizationToken(authorization);
    const currentUser = await this.authenticateBearer(authorization);
    const session = await this.createSessionForUser(
      currentUser.id,
      context,
      selection,
    );

    await this.sessions.revokeSession(token.tokenId, {
      actor: currentUser.username,
      reason: 'tenant switch',
    });

    return session;
  }

  private async issueSession(
    user: SecurityAuthUserRecord,
    membership: SecurityAuthTenantMembershipRecord,
    context: LoginContext,
  ): Promise<LoginResponse> {
    const token = this.bearerTokens.signSession({
      accessMode: 'tenant',
      membershipId: membership.membershipId,
      subject: user.id,
      tenantId: membership.tenantId,
    });
    const authenticatedUser = await this.toAuthenticatedUser(
      user.id,
      membership,
      'tenant',
    );
    const issuedAt = new Date().toISOString();

    await this.sessions.registerSession({
      accessMode: 'tenant',
      membershipId: membership.membershipId,
      tenantId: membership.tenantId,
      userId: user.id,
      username: authenticatedUser.username,
      tokenId: token.tokenId,
      ip: context.ip ?? 'unknown',
      userAgent: context.userAgent ?? 'unknown',
      lastSeenAt: issuedAt,
      expiresAt: token.expiresAt,
    });

    return {
      accessToken: token.accessToken,
      tokenType: token.tokenType,
      expiresInSeconds: token.expiresInSeconds,
      status: 'authenticated',
      user: authenticatedUser,
    };
  }

  async authenticateBearer(
    authorization: string | undefined,
  ): Promise<AuthenticatedUser> {
    const token = this.bearerTokens.verifyAuthorizationToken(authorization);
    const session = await this.sessions.assertSessionActive(token.tokenId);
    this.assertTokenTenantContext(token);
    this.assertSessionTenantContext(token, session);
    const membership = await this.repository.findTenantMembershipForUser({
      membershipId: token.membershipId,
      tenantId: token.tenantId,
      userId: token.subject,
    });
    this.assertUsableTenantMembership(membership);

    return this.toAuthenticatedUser(
      token.subject,
      membership,
      token.accessMode,
    );
  }

  async logout(
    authorization: string | undefined,
    context: LoginContext = {},
  ): Promise<LogoutResponse> {
    const token = this.bearerTokens.verifyAuthorizationToken(authorization);
    const user = await this.authenticateBearer(authorization);

    await this.sessions.revokeSession(token.tokenId, {
      actor: user.username,
      reason: 'self logout',
    });
    await this.recordLoginAttempt(
      user.username,
      'success',
      undefined,
      context,
      'logout.self',
      {
        actorUsername: user.username,
        reason: 'self logout',
      },
    );

    return { loggedOut: true };
  }

  private async toAuthenticatedUser(
    userId: string,
    activeMembership?: SecurityAuthTenantMembershipRecord,
    accessMode: SecurityTenantAccessMode = 'tenant',
  ): Promise<AuthenticatedUser> {
    const user = await this.assertActiveUser(userId);
    const memberships = await this.listUsableTenantMemberships(user.id);

    return {
      accessMode,
      activeMembership: activeMembership
        ? {
            id: activeMembership.membershipId,
            isOwner: activeMembership.isOwner,
            status: activeMembership.membershipStatus,
          }
        : undefined,
      activeTenant: activeMembership
        ? toAuthenticatedTenant(activeMembership)
        : undefined,
      enabledModuleCodes: activeMembership?.enabledModuleCodes ?? [],
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roleCodes: [...user.roleCodes],
      permissionCodes: await this.repository.getPermissionCodesForUser(user.id),
      tenantOptions: memberships.map(toTenantLoginOption),
      avatarUrl: user.avatarUrl,
    };
  }

  private async assertActiveUser(
    userId: string,
  ): Promise<SecurityAuthUserRecord> {
    const user = await this.repository.findUserById(userId);

    if (!user || !user.enabled) {
      throw new UnauthorizedException(
        createApiErrorBody({
          code: 'AUTH_USER_UNAVAILABLE',
          message: 'User is disabled or missing',
        }),
      );
    }

    return user;
  }

  private async resolveTenantMembershipForLogin(
    userId: string,
    context: LoginContext,
  ): Promise<
    | { status: 'selected'; membership: SecurityAuthTenantMembershipRecord }
    | { status: 'selection'; response: TenantSelectionLoginResponse }
  > {
    const explicitSelection = hasTenantSelection(context);

    if (explicitSelection) {
      return {
        membership: await this.resolveTenantMembershipForSession(
          userId,
          context,
        ),
        status: 'selected',
      };
    }

    const memberships = await this.listUsableTenantMemberships(userId);

    if (memberships.length === 1) {
      return { membership: memberships[0], status: 'selected' };
    }

    if (memberships.length > 1) {
      return {
        response: {
          loginTicket: this.bearerTokens.signLoginTicket(userId),
          status: 'tenant_selection_required',
          tenantOptions: memberships.map(toTenantLoginOption),
        },
        status: 'selection',
      };
    }

    throw tenantUnavailableError();
  }

  private async resolveTenantMembershipForSession(
    userId: string,
    selection: TenantSessionSelection,
  ): Promise<SecurityAuthTenantMembershipRecord> {
    if (hasTenantSelection(selection)) {
      const membership = await this.repository.findTenantMembershipForUser({
        ...selection,
        userId,
      });
      this.assertUsableTenantMembership(membership);
      return membership;
    }

    const memberships = await this.listUsableTenantMemberships(userId);

    if (!memberships[0]) {
      throw tenantUnavailableError();
    }

    return memberships[0];
  }

  private async listUsableTenantMemberships(
    userId: string,
  ): Promise<readonly SecurityAuthTenantMembershipRecord[]> {
    const memberships =
      await this.repository.listTenantMembershipsForUser(userId);

    return memberships.filter(isUsableTenantMembership);
  }

  private assertTokenTenantContext(
    token: Pick<
      ReturnType<SecurityBearerTokenService['verifyAuthorizationToken']>,
      'accessMode' | 'membershipId' | 'tenantId'
    >,
  ): asserts token is {
    accessMode: SecurityTenantAccessMode;
    membershipId: string;
    tenantId: string;
  } {
    if (!token.accessMode || !token.membershipId || !token.tenantId) {
      throw new UnauthorizedException(
        createApiErrorBody({
          code: 'AUTH_TENANT_CONTEXT_MISSING',
          message: 'Bearer token is missing tenant context',
        }),
      );
    }
  }

  private assertSessionTenantContext(
    token: {
      accessMode: SecurityTenantAccessMode;
      membershipId: string;
      tenantId: string;
      tokenId: string;
    },
    session: SecurityAuthSessionContext | undefined,
  ): void {
    if (!session) {
      return;
    }

    if (
      session.accessMode !== token.accessMode ||
      session.membershipId !== token.membershipId ||
      session.tenantId !== token.tenantId
    ) {
      throw new UnauthorizedException(
        createApiErrorBody({
          code: 'AUTH_TENANT_CONTEXT_MISMATCH',
          message: 'Bearer token tenant context does not match session',
          details: { tokenId: token.tokenId },
        }),
      );
    }
  }

  private assertUsableTenantMembership(
    membership: SecurityAuthTenantMembershipRecord | undefined,
  ): asserts membership is SecurityAuthTenantMembershipRecord {
    if (!isUsableTenantMembership(membership)) {
      throw tenantUnavailableError();
    }
  }

  private async assertUsernamePassword(
    username: string,
    password: string,
    context: LoginContext,
  ): Promise<{
    normalizedUsername: string;
    user: SecurityAuthUserRecord;
  }> {
    const normalizedUsername = normalizeLoginUsername(username);

    if (!normalizedUsername) {
      await this.recordLoginAttempt(
        username,
        'bad_credentials',
        'invalid-credentials',
        context,
      );
      throw invalidCredentialsError();
    }

    const policy = await this.loginPolicy.getLoginPolicy();
    const existingLockout =
      await this.loginLockouts.getLoginLockout(normalizedUsername);

    if (isActiveLoginLockout(existingLockout)) {
      await this.recordLoginAttempt(
        normalizedUsername,
        'account_locked',
        'account-locked',
        context,
      );
      throw invalidCredentialsError();
    }

    const user = await this.repository.findUserByUsername(normalizedUsername);

    if (!user) {
      await this.recordFailedLoginAttempt(normalizedUsername, policy, context);
      throw invalidCredentialsError();
    }

    if (!verifySecurityPassword(password, user.passwordHash)) {
      await this.recordFailedLoginAttempt(normalizedUsername, policy, context);
      throw invalidCredentialsError();
    }

    if (!user.enabled) {
      await this.recordLoginAttempt(
        normalizedUsername,
        'user_disabled',
        'user-disabled',
        context,
      );
      throw invalidCredentialsError();
    }

    return { normalizedUsername, user };
  }

  private async recordLoginAttempt(
    username: string,
    result: SecurityLoginResult,
    failureReason: string | undefined,
    context: LoginContext,
    logType: SecurityLoginLogType = 'login.username',
    structuredContext: Pick<
      SecurityLoginAttemptRecord,
      'actorUsername' | 'reason'
    > = {},
  ): Promise<void> {
    const record: SecurityLoginAttemptRecord = {
      username,
      logType,
      result,
      success: result === 'success',
      failureReason,
      ip: context.ip ?? 'unknown',
      userAgent: context.userAgent ?? 'unknown',
      requestId: context.requestId ?? 'unknown',
    };

    if (structuredContext.actorUsername !== undefined) {
      record.actorUsername = structuredContext.actorUsername;
    }

    if (structuredContext.reason !== undefined) {
      record.reason = structuredContext.reason;
    }

    await this.loginAttempts.recordLoginAttempt(record);
  }

  private async recordFailedLoginAttempt(
    username: string,
    policy: Awaited<ReturnType<SecurityLoginPolicyProvider['getLoginPolicy']>>,
    context: LoginContext,
  ): Promise<void> {
    const lockout = await this.loginLockouts.recordFailedLoginAttempt({
      username,
      maxFailedAttempts: policy.maxFailedAttempts,
      lockoutMinutes: policy.lockoutMinutes,
    });
    const locked = isActiveLoginLockout(lockout);

    await this.recordLoginAttempt(
      username,
      locked ? 'account_locked' : 'bad_credentials',
      locked ? 'account-locked' : 'invalid-credentials',
      context,
    );
  }
}

function normalizeLoginUsername(username: string): string {
  return username.trim();
}

function invalidCredentialsError(): UnauthorizedException {
  return new UnauthorizedException(
    createApiErrorBody({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid username or password',
    }),
  );
}

function tenantUnavailableError(): UnauthorizedException {
  return new UnauthorizedException(
    createApiErrorBody({
      code: 'AUTH_TENANT_UNAVAILABLE',
      message: 'No active tenant membership is available for this user',
    }),
  );
}

function hasTenantSelection(
  input: TenantSessionSelection | LoginContext,
): boolean {
  const selection = input as TenantSessionSelection;

  return Boolean(
    selection.membershipId ||
    selection.tenantCode ||
    selection.tenantHost ||
    selection.tenantId,
  );
}

function isUsableTenantMembership(
  membership: SecurityAuthTenantMembershipRecord | undefined,
): membership is SecurityAuthTenantMembershipRecord {
  if (!membership) {
    return false;
  }

  if (
    membership.membershipStatus !== 'active' ||
    membership.tenantStatus !== 'active'
  ) {
    return false;
  }

  return (
    !membership.tenantExpiresAt ||
    membership.tenantExpiresAt > new Date().toISOString()
  );
}

function toAuthenticatedTenant(
  membership: SecurityAuthTenantMembershipRecord,
): AuthenticatedTenant {
  return {
    code: membership.tenantCode,
    id: membership.tenantId,
    name: membership.tenantName,
    slug: membership.tenantSlug,
    status: membership.tenantStatus,
  };
}

function toTenantLoginOption(
  membership: SecurityAuthTenantMembershipRecord,
): TenantLoginOption {
  return {
    ...toAuthenticatedTenant(membership),
    isOwner: membership.isOwner,
    membershipId: membership.membershipId,
    membershipStatus: membership.membershipStatus,
  };
}

function isActiveLoginLockout(
  lockout: SecurityLoginLockoutRecord | undefined,
): boolean {
  if (!lockout?.lockedUntil) {
    return false;
  }

  return new Date(lockout.lockedUntil).getTime() > Date.now();
}
