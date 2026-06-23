import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createApiErrorBody } from '@opencore/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { SecurityTenantAccessMode } from './security-auth.repository';

export type SecurityBearerTokenResult = {
  accessToken: string;
  tokenId: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  expiresAt: string;
};

export type SecurityBearerTokenPayload = {
  sub?: string;
  jti?: string;
  iat?: number;
  exp?: number;
  typ?: 'access' | 'login-ticket';
  tid?: string;
  mid?: string;
  am?: SecurityTenantAccessMode;
};

export type VerifiedSecurityBearerToken = {
  subject: string;
  tokenId: string;
  expiresAt: string;
  tenantId?: string;
  membershipId?: string;
  accessMode?: SecurityTenantAccessMode;
};

export type SecurityBearerSessionSubject = {
  subject: string;
  tenantId: string;
  membershipId?: string;
  accessMode: SecurityTenantAccessMode;
};

export const DEFAULT_SECURITY_BEARER_TOKEN_TTL_SECONDS = 3600;
export const DEFAULT_SECURITY_LOGIN_TICKET_TTL_SECONDS = 300;
export const DEFAULT_SECURITY_AUTH_TOKEN_SECRET =
  'opencore-development-auth-token-secret';

@Injectable()
export class SecurityBearerTokenService {
  signSubject(
    subject: string,
    ttlSeconds = DEFAULT_SECURITY_BEARER_TOKEN_TTL_SECONDS,
  ): SecurityBearerTokenResult {
    return this.signPayload({ sub: subject, typ: 'access' }, ttlSeconds);
  }

  signSession(
    subject: SecurityBearerSessionSubject,
    ttlSeconds = DEFAULT_SECURITY_BEARER_TOKEN_TTL_SECONDS,
  ): SecurityBearerTokenResult {
    return this.signPayload(
      {
        am: subject.accessMode,
        mid: subject.membershipId,
        sub: subject.subject,
        tid: subject.tenantId,
        typ: 'access',
      },
      ttlSeconds,
    );
  }

  signLoginTicket(
    subject: string,
    ttlSeconds = DEFAULT_SECURITY_LOGIN_TICKET_TTL_SECONDS,
  ): string {
    return this.signPayload({ sub: subject, typ: 'login-ticket' }, ttlSeconds)
      .accessToken;
  }

  verifyLoginTicket(ticket: string | undefined): string {
    if (!ticket) {
      throw bearerTokenError(
        'AUTH_LOGIN_TICKET_MISSING',
        'Missing login ticket',
      );
    }

    const token = this.verifyTokenPayload(ticket);

    if (token.type !== 'login-ticket') {
      throw bearerTokenError(
        'AUTH_LOGIN_TICKET_INVALID',
        'Invalid login ticket',
      );
    }

    return token.subject;
  }

  private signPayload(
    input: Omit<SecurityBearerTokenPayload, 'exp' | 'iat' | 'jti'>,
    ttlSeconds: number,
  ): SecurityBearerTokenResult {
    const issuedAt = Math.floor(Date.now() / 1000);
    const tokenId = randomUUID();
    const expiresAt = issuedAt + ttlSeconds;
    const payload = Buffer.from(
      JSON.stringify({
        ...input,
        jti: tokenId,
        iat: issuedAt,
        exp: expiresAt,
      }),
    ).toString('base64url');
    const signature = this.sign(payload);

    return {
      accessToken: `${payload}.${signature}`,
      tokenId,
      tokenType: 'Bearer',
      expiresInSeconds: ttlSeconds,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    };
  }

  verifyAuthorization(authorization: string | undefined): string {
    return this.verifyAuthorizationToken(authorization).subject;
  }

  verifyAuthorizationToken(
    authorization: string | undefined,
  ): VerifiedSecurityBearerToken {
    if (!authorization?.startsWith('Bearer ')) {
      throw bearerTokenError(
        'AUTH_BEARER_TOKEN_MISSING',
        'Missing bearer token',
      );
    }

    const token = this.verifyTokenPayload(
      authorization.slice('Bearer '.length),
    );

    if (token.type === 'login-ticket') {
      throw bearerTokenError(
        'AUTH_BEARER_TOKEN_INVALID',
        'Invalid bearer token',
      );
    }

    return token;
  }

  verifyToken(token: string): string {
    return this.verifyTokenPayload(token).subject;
  }

  verifyTokenPayload(
    token: string,
  ): VerifiedSecurityBearerToken & { type: 'access' | 'login-ticket' } {
    const [payload, signature] = token.split('.');

    if (!payload || !signature || !safeEqual(signature, this.sign(payload))) {
      throw bearerTokenError(
        'AUTH_BEARER_TOKEN_INVALID',
        'Invalid bearer token',
      );
    }

    const decoded = decodePayload(payload);

    if (!decoded.sub) {
      throw bearerTokenError(
        'AUTH_BEARER_TOKEN_INVALID_PAYLOAD',
        'Invalid bearer token payload',
      );
    }

    if (!decoded.exp || decoded.exp <= Math.floor(Date.now() / 1000)) {
      throw bearerTokenError(
        'AUTH_BEARER_TOKEN_EXPIRED',
        'Bearer token expired',
      );
    }

    return {
      accessMode: decoded.am,
      subject: decoded.sub,
      tokenId: decoded.jti ?? createLegacyTokenId(decoded),
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      membershipId: decoded.mid,
      tenantId: decoded.tid,
      type: decoded.typ ?? 'access',
    };
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

function createLegacyTokenId(payload: SecurityBearerTokenPayload): string {
  return `legacy:${payload.sub ?? 'unknown'}:${payload.iat ?? 'unknown'}`;
}

function decodePayload(payload: string): SecurityBearerTokenPayload {
  try {
    return JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as SecurityBearerTokenPayload;
  } catch {
    throw bearerTokenError(
      'AUTH_BEARER_TOKEN_INVALID_PAYLOAD',
      'Invalid bearer token payload',
    );
  }
}

function bearerTokenError(
  code: string,
  message: string,
): UnauthorizedException {
  return new UnauthorizedException(createApiErrorBody({ code, message }));
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
