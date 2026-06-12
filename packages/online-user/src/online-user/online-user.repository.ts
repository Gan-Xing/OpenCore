import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createPageResult,
  normalizeOptionalString,
  normalizePagination,
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
  sessions: readonly Pick<OnlineUserSessionRecord, 'revokedAt'>[],
): OnlineUserSummaryDto {
  return {
    total: sessions.length,
    active: sessions.filter((session) => !session.revokedAt).length,
    revoked: sessions.filter((session) => session.revokedAt).length,
  };
}

export function assertSessionActive(input: {
  id: string;
  revokedAt?: string;
}): void {
  if (input.revokedAt) {
    throw new BadRequestException(
      `Online user session is already revoked: ${input.id}`,
    );
  }
}

export function assertTokenSessionActive(input: {
  tokenId: string;
  revokedAt?: string;
  expiresAt?: string;
}): void {
  if (input.revokedAt) {
    throw new UnauthorizedException('Bearer token has been revoked');
  }

  if (input.expiresAt && input.expiresAt <= new Date().toISOString()) {
    throw new UnauthorizedException('Bearer token session expired');
  }
}

export function requireOnlineUserSession<T>(
  record: T | undefined,
  id: string,
): T {
  if (!record) {
    throw new NotFoundException(`Online user session not found: ${id}`);
  }

  return record;
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
  return {
    browser: parseBrowser(userAgent),
    os: parseOs(userAgent),
  };
}

function parseBrowser(userAgent: string): string {
  if (/Edg\//u.test(userAgent)) {
    return 'Microsoft Edge';
  }
  if (/Chrome\//u.test(userAgent) && !/Chromium/u.test(userAgent)) {
    return 'Chrome';
  }
  if (/Firefox\//u.test(userAgent)) {
    return 'Firefox';
  }
  if (/Safari\//u.test(userAgent) && !/Chrome\//u.test(userAgent)) {
    return 'Safari';
  }
  if (/curl\//iu.test(userAgent)) {
    return 'curl';
  }
  if (/node|undici/iu.test(userAgent)) {
    return 'Node.js';
  }
  if (/OpenCore Smoke/iu.test(userAgent)) {
    return 'OpenCore Smoke';
  }
  if (/OpenCore Admin/iu.test(userAgent)) {
    return 'OpenCore Admin';
  }
  return 'Unknown';
}

function parseOs(userAgent: string): string {
  if (/Windows NT/u.test(userAgent)) {
    return 'Windows';
  }
  if (/Mac OS X|Macintosh/u.test(userAgent)) {
    return 'macOS';
  }
  if (/Android/u.test(userAgent)) {
    return 'Android';
  }
  if (/iPhone|iPad|iOS/u.test(userAgent)) {
    return 'iOS';
  }
  if (/Linux/u.test(userAgent)) {
    return 'Linux';
  }
  return 'Unknown';
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
