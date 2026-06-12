import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  createPageResult,
  normalizeOptionalString,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
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

export type OnlineUserNormalizedPageQuery = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skip: number;
  take: number;
};

export abstract class OnlineUserRepository {
  abstract listOnlineUsers(
    query?: OnlineUserQuery,
  ): Promise<PageResult<OnlineUserSessionRecord>>;

  abstract getOnlineUser(id: string): Promise<OnlineUserSessionRecord>;

  abstract kickOutSession(
    id: string,
    body: KickOutSessionInput,
  ): Promise<OnlineUserSessionRecord>;

  abstract getSummary(): Promise<OnlineUserSummaryDto>;
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
