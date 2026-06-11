import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { hashPassword } from './rbac.password';
import { RbacRepository } from './rbac.repository';

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

const TOKEN_TTL_SECONDS = 3600;

@Injectable()
export class AuthService {
  constructor(private readonly repository: RbacRepository) {}

  async login(username: string, password: string, context: LoginContext = {}) {
    const user = await this.repository.findUserByUsername(username);

    if (
      !user ||
      !user.enabled ||
      user.passwordHash !== hashPassword(password)
    ) {
      await this.recordLoginAttempt(username, false, context);
      throw new UnauthorizedException('Invalid username or password');
    }

    const session = await this.createSessionForUser(user.id);
    await this.recordLoginAttempt(username, true, context);
    return session;
  }

  async createSessionForUser(userId: string) {
    const authenticatedUser = await this.toAuthenticatedUser(userId);

    return {
      accessToken: this.signToken(userId),
      tokenType: 'Bearer' as const,
      expiresInSeconds: TOKEN_TTL_SECONDS,
      user: authenticatedUser,
    };
  }

  async authenticateBearer(
    authorization: string | undefined,
  ): Promise<AuthenticatedUser> {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const userId = this.verifyToken(authorization.slice('Bearer '.length));
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

  private signToken(userId: string): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({
        sub: userId,
        iat: issuedAt,
        exp: issuedAt + TOKEN_TTL_SECONDS,
      }),
    ).toString('base64url');
    const signature = this.sign(payload);

    return `${payload}.${signature}`;
  }

  private verifyToken(token: string): string {
    const [payload, signature] = token.split('.');

    if (!payload || !signature || !safeEqual(signature, this.sign(payload))) {
      throw new UnauthorizedException('Invalid bearer token');
    }

    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as {
      exp?: number;
      sub?: string;
    };

    if (!decoded.sub) {
      throw new UnauthorizedException('Invalid bearer token payload');
    }

    if (!decoded.exp || decoded.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Bearer token expired');
    }

    return decoded.sub;
  }

  private sign(payload: string): string {
    return createHmac(
      'sha256',
      process.env.AUTH_TOKEN_SECRET ?? 'opencore-development-auth-token-secret',
    )
      .update(payload)
      .digest('base64url');
  }

  private async recordLoginAttempt(
    username: string,
    success: boolean,
    context: LoginContext,
  ): Promise<void> {
    await this.repository.recordLoginAttempt({
      username,
      success,
      failureReason: success ? undefined : 'invalid-credentials-or-disabled',
      ip: context.ip ?? 'unknown',
      userAgent: context.userAgent ?? 'unknown',
      requestId: context.requestId ?? 'unknown',
    });
  }
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
