import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  NoopSecurityLoginAttemptRecorder,
  SecurityAuthUserRepository,
  SecurityLoginAttemptRecorder,
  type SecurityLoginAttemptRecord,
} from './security-auth.repository';
import { SecurityBearerTokenService } from './security-bearer-token.service';
import { verifySecurityPassword } from './security-password';

export type AuthenticatedUser = {
  id: string;
  username: string;
  displayName: string;
  roleCodes: readonly string[];
  permissionCodes: readonly string[];
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

@Injectable()
export class SecurityAuthService {
  constructor(
    private readonly repository: SecurityAuthUserRepository,
    private readonly loginAttempts: SecurityLoginAttemptRecorder = new NoopSecurityLoginAttemptRecorder(),
    private readonly bearerTokens: SecurityBearerTokenService = new SecurityBearerTokenService(),
  ) {}

  async login(
    username: string,
    password: string,
    context: LoginContext = {},
  ): Promise<LoginResponse> {
    const user = await this.repository.findUserByUsername(username);

    if (
      !user ||
      !user.enabled ||
      !verifySecurityPassword(password, user.passwordHash)
    ) {
      await this.recordLoginAttempt(username, false, context);
      throw new UnauthorizedException('Invalid username or password');
    }

    const session = await this.createSessionForUser(user.id);
    await this.recordLoginAttempt(username, true, context);
    return session;
  }

  async createSessionForUser(userId: string): Promise<LoginResponse> {
    const authenticatedUser = await this.toAuthenticatedUser(userId);
    const token = this.bearerTokens.signSubject(userId);

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
    const userId = this.bearerTokens.verifyAuthorization(authorization);
    return this.toAuthenticatedUser(userId);
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
    };
  }

  private async recordLoginAttempt(
    username: string,
    success: boolean,
    context: LoginContext,
  ): Promise<void> {
    const record: SecurityLoginAttemptRecord = {
      username,
      success,
      failureReason: success ? undefined : 'invalid-credentials-or-disabled',
      ip: context.ip ?? 'unknown',
      userAgent: context.userAgent ?? 'unknown',
      requestId: context.requestId ?? 'unknown',
    };

    await this.loginAttempts.recordLoginAttempt(record);
  }
}
