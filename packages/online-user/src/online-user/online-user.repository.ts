import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createApiErrorBody } from '@opencore/common';
import {
  createPageResult,
  normalizeOptionalString,
  normalizePagination,
  parseUserAgent,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import { SecurityAuthSessionRepository } from '@opencore/security';
import type { OnlineUserSummaryDto } from './online-user.dto';
import type { OnlineUserSessionRecord } from './online-user.records';

export type OnlineUserQuery = PageQueryInput & {
  active?: boolean | string;
  username?: string;
};

export type OnlineUserFilters = {
  active?: boolean;
  username?: string;
};

export type KickOutSessionInput = {
  actor: string;
  reason: string;
};

export type BatchKickOutSessionsInput = KickOutSessionInput & {
  ids: readonly string[];
};

export type BatchKickOutSessionsResult = {
  requested: number;
  kicked: number;
  skipped: number;
  items: readonly OnlineUserSessionRecord[];
};

export type CleanExpiredOnlineUserSessionsInput = {
  expiredBefore?: string;
};

export type CleanExpiredOnlineUserSessionsResult = {
  deleted: true;
  affected: number;
  expiredBefore: string;
};

export type OnlineUserNormalizedPageQuery = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skip: number;
  take: number;
};

export abstract class OnlineUserRepository extends SecurityAuthSessionRepository {
  abstract listOnlineUsers(
    query?: OnlineUserQuery,
  ): Promise<PageResult<OnlineUserSessionRecord>>;

  abstract getOnlineUser(id: string): Promise<OnlineUserSessionRecord>;

  abstract kickOutSession(
    id: string,
    body: KickOutSessionInput,
  ): Promise<OnlineUserSessionRecord>;

  abstract getSummary(): Promise<OnlineUserSummaryDto>;

  abstract cleanExpiredSessions(
    input?: CleanExpiredOnlineUserSessionsInput,
  ): Promise<CleanExpiredOnlineUserSessionsResult>;

  async kickOutSessions(
    body: BatchKickOutSessionsInput,
  ): Promise<BatchKickOutSessionsResult> {
    const ids = [...new Set(body.ids.map((id) => id.trim()).filter(Boolean))];
    const items: OnlineUserSessionRecord[] = [];
    let skipped = 0;

    for (const id of ids) {
      try {
        items.push(
          await this.kickOutSession(id, {
            actor: body.actor,
            reason: body.reason,
          }),
        );
      } catch (error) {
        if (
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        ) {
          skipped += 1;
          continue;
        }
        throw error;
      }
    }

    return {
      requested: ids.length,
      kicked: items.length,
      skipped,
      items,
    };
  }
}

export function normalizeOnlineUserFilters(
  query: OnlineUserQuery = {},
): OnlineUserFilters {
  return {
    active: normalizeOptionalBoolean(query.active),
    username: normalizeOptionalString(query.username),
  };
}

export function normalizeOnlineUserPageQuery(
  query: OnlineUserQuery = {},
  total: number,
): OnlineUserNormalizedPageQuery {
  const pagination = normalizePagination(query, { maxPageSize: 100 });
  const totalPages = Math.ceil(total / pagination.pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(pagination.page, totalPages);

  return {
    page: safePage,
    pageSize: pagination.pageSize,
    total,
    totalPages,
    skip: (safePage - 1) * pagination.pageSize,
    take: pagination.pageSize,
  };
}

export function createOnlineUserPageResult<T>(
  items: readonly T[],
  pagination: OnlineUserNormalizedPageQuery,
): PageResult<T> {
  return createPageResult(
    [...items],
    {
      page: pagination.page,
      pageSize: pagination.pageSize,
    },
    pagination.total,
  );
}

export function createOnlineUserSummary(
  sessions: readonly Pick<OnlineUserSessionRecord, 'expiresAt' | 'revokedAt'>[],
  now = new Date().toISOString(),
): OnlineUserSummaryDto {
  const expired = sessions.filter((session) =>
    isOnlineUserSessionExpired(session, now),
  ).length;

  return {
    total: sessions.length,
    active: sessions.filter(
      (session) =>
        !session.revokedAt && !isOnlineUserSessionExpired(session, now),
    ).length,
    revoked: sessions.filter((session) => session.revokedAt).length,
    expired,
    cleanupEligible: expired,
  };
}

export function assertSessionActive(input: {
  id: string;
  revokedAt?: string;
}): void {
  if (input.revokedAt) {
    throw onlineBadRequest(
      'ONLINE_USER_SESSION_ALREADY_REVOKED',
      'Online user session is already revoked.',
      { id: input.id },
    );
  }
}

export function assertTokenSessionActive(input: {
  tokenId: string;
  revokedAt?: string;
  expiresAt?: string;
}): void {
  if (input.revokedAt) {
    throw onlineUnauthorized(
      'ONLINE_USER_TOKEN_REVOKED',
      'Bearer token has been revoked',
      { tokenId: input.tokenId },
    );
  }

  if (input.expiresAt && input.expiresAt <= new Date().toISOString()) {
    throw onlineUnauthorized(
      'ONLINE_USER_TOKEN_EXPIRED',
      'Bearer token session expired',
      { tokenId: input.tokenId },
    );
  }
}

export function assertTokenSessionRegistered<T>(
  session: T | null | undefined,
  tokenId: string,
): NonNullable<T> {
  if (!session) {
    throw onlineUnauthorized(
      'ONLINE_USER_TOKEN_SESSION_UNREGISTERED',
      'Bearer token session is not registered.',
      { tokenId },
    );
  }

  return session;
}

export function isOnlineUserSessionExpired(
  session: Pick<OnlineUserSessionRecord, 'expiresAt'>,
  now = new Date().toISOString(),
): boolean {
  return session.expiresAt <= now;
}

export function normalizeExpiredBefore(value: string | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw onlineBadRequest(
      'ONLINE_USER_EXPIRED_BEFORE_INVALID',
      'expiredBefore must be an ISO date-time',
      { field: 'expiredBefore' },
    );
  }

  return new Date(timestamp).toISOString();
}

export function requireOnlineUserSession<T>(
  record: T | undefined,
  id: string,
): T {
  if (!record) {
    throw onlineNotFound(
      'ONLINE_USER_SESSION_NOT_FOUND',
      'Online user session not found.',
      { id },
    );
  }

  return record;
}

function onlineBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

function onlineUnauthorized(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): UnauthorizedException {
  return new UnauthorizedException(
    createApiErrorBody({ code, message, details }),
  );
}

function onlineNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, message, details }));
}

export function compareOnlineUserSessions(
  left: OnlineUserSessionRecord,
  right: OnlineUserSessionRecord,
): number {
  return (
    right.lastSeenAt.localeCompare(left.lastSeenAt) ||
    left.username.localeCompare(right.username) ||
    left.id.localeCompare(right.id)
  );
}

export function parseOnlineUserAgent(userAgent: string): {
  browser: string;
  os: string;
} {
  return parseUserAgent(userAgent);
}

export function normalizeOptionalBoolean(
  value: boolean | string | undefined,
): boolean | undefined {
  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return undefined;
}
