import { Injectable, UnauthorizedException } from '@nestjs/common';
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
} from './security-auth.repository';
import { SecurityBearerTokenService } from './security-bearer-token.service';
import { verifySecurityPassword } from './security-password';

export type AuthenticatedUser = {
  id: string;
  username: string;
  displayName: string;
  roleCodes: readonly string[];
  permissionCodes: readonly string[];
  avatarUrl?: string;
};

export type LoginContext = {
  ip?: string;
  userAgent?: string;
  requestId?: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  user: AuthenticatedUser;
};

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
  ): Promise<LoginResponse> {
    const normalizedUsername = normalizeLoginUsername(username);

    if (!normalizedUsername) {
      await this.recordLoginAttempt(
        username,
        'bad_credentials',
        'invalid-credentials',
        context,
      );
      throw new UnauthorizedException('Invalid username or password');
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
      throw new UnauthorizedException('Invalid username or password');
    }

    const user = await this.repository.findUserByUsername(normalizedUsername);

    if (!user) {
      await this.recordFailedLoginAttempt(normalizedUsername, policy, context);
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!verifySecurityPassword(password, user.passwordHash)) {
      await this.recordFailedLoginAttempt(normalizedUsername, policy, context);
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.enabled) {
      await this.recordLoginAttempt(
        normalizedUsername,
        'user_disabled',
        'user-disabled',
        context,
      );
      throw new UnauthorizedException('Invalid username or password');
    }

    const session = await this.createSessionForUser(user.id, context);
    await this.loginLockouts.clearLoginLockout(normalizedUsername);
    await this.recordLoginAttempt(
      normalizedUsername,
      'success',
      undefined,
      context,
    );
    return session;
  }

  async createSessionForUser(
    userId: string,
    context: LoginContext = {},
  ): Promise<LoginResponse> {
    const authenticatedUser = await this.toAuthenticatedUser(userId);
    const token = this.bearerTokens.signSubject(userId);
    const issuedAt = new Date().toISOString();

    await this.sessions.registerSession({
      userId,
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
      user: authenticatedUser,
    };
  }

  async authenticateBearer(
    authorization: string | undefined,
  ): Promise<AuthenticatedUser> {
    const token = this.bearerTokens.verifyAuthorizationToken(authorization);
    await this.sessions.assertSessionActive(token.tokenId);
    return this.toAuthenticatedUser(token.subject);
  }

  async logout(
    authorization: string | undefined,
    context: LoginContext = {},
  ): Promise<LogoutResponse> {
    const token = this.bearerTokens.verifyAuthorizationToken(authorization);
    await this.sessions.assertSessionActive(token.tokenId);
    const user = await this.toAuthenticatedUser(token.subject);

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
    );

    return { loggedOut: true };
  }

  private async toAuthenticatedUser(
    userId: string,
  ): Promise<AuthenticatedUser> {
    const user = await this.repository.findUserById(userId);

    if (!user || !user.enabled) {
      throw new UnauthorizedException('User is disabled or missing');
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      roleCodes: [...user.roleCodes],
      permissionCodes: await this.repository.getPermissionCodesForUser(user.id),
      avatarUrl: user.avatarUrl,
    };
  }

  private async recordLoginAttempt(
    username: string,
    result: SecurityLoginResult,
    failureReason: string | undefined,
    context: LoginContext,
    logType: SecurityLoginLogType = 'login.username',
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

function isActiveLoginLockout(
  lockout: SecurityLoginLockoutRecord | undefined,
): boolean {
  if (!lockout?.lockedUntil) {
    return false;
  }

  return new Date(lockout.lockedUntil).getTime() > Date.now();
}
