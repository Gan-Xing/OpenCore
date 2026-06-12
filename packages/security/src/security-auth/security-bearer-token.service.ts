import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

export type SecurityBearerTokenResult = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
};

export type SecurityBearerTokenPayload = {
  sub?: string;
  iat?: number;
  exp?: number;
};

export const DEFAULT_SECURITY_BEARER_TOKEN_TTL_SECONDS = 3600;
export const DEFAULT_SECURITY_AUTH_TOKEN_SECRET =
  'opencore-development-auth-token-secret';

@Injectable()
export class SecurityBearerTokenService {
  signSubject(
    subject: string,
    ttlSeconds = DEFAULT_SECURITY_BEARER_TOKEN_TTL_SECONDS,
  ): SecurityBearerTokenResult {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({
        sub: subject,
        iat: issuedAt,
        exp: issuedAt + ttlSeconds,
      }),
    ).toString('base64url');
    const signature = this.sign(payload);

    return {
      accessToken: `${payload}.${signature}`,
      tokenType: 'Bearer',
      expiresInSeconds: ttlSeconds,
    };
  }

  verifyAuthorization(authorization: string | undefined): string {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    return this.verifyToken(authorization.slice('Bearer '.length));
  }

  verifyToken(token: string): string {
    const [payload, signature] = token.split('.');

    if (!payload || !signature || !safeEqual(signature, this.sign(payload))) {
      throw new UnauthorizedException('Invalid bearer token');
    }

    const decoded = decodePayload(payload);

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
      process.env.AUTH_TOKEN_SECRET ?? DEFAULT_SECURITY_AUTH_TOKEN_SECRET,
    )
      .update(payload)
      .digest('base64url');
  }
}

function decodePayload(payload: string): SecurityBearerTokenPayload {
  try {
    return JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as SecurityBearerTokenPayload;
  } catch {
    throw new UnauthorizedException('Invalid bearer token payload');
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
