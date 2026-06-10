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

@Injectable()
export class AuthService {
  constructor(private readonly repository: RbacRepository) {}

  async login(username: string, password: string) {
    const user = await this.repository.findUserByUsername(username);

    if (
      !user ||
      !user.enabled ||
      user.passwordHash !== hashPassword(password)
    ) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return this.createSessionForUser(user.id);
  }

  async createSessionForUser(userId: string) {
    const authenticatedUser = await this.toAuthenticatedUser(userId);

    return {
      accessToken: this.signToken(userId),
      tokenType: 'Bearer' as const,
      expiresInSeconds: 3600,
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
    const payload = Buffer.from(
      JSON.stringify({
        sub: userId,
        iat: Math.floor(Date.now() / 1000),
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
      sub?: string;
    };

    if (!decoded.sub) {
      throw new UnauthorizedException('Invalid bearer token payload');
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
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
