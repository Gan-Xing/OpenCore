import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
  SecurityAuthSessionRecord,
  SecurityAuthSessionContext,
  SecurityAuthSessionRevocationInput,
} from '@opencore/security';
import {
  seedOnlineUserSessions,
  type OnlineUserSessionRecord,
} from './online-user.records';
import {
  assertTokenSessionActive,
  assertTokenSessionRegistered,
  assertSessionActive,
  compareOnlineUserSessions,
  createOnlineUserPageResult,
  createOnlineUserSummary,
  isOnlineUserSessionExpired,
  normalizeExpiredBefore,
  normalizeOnlineUserFilters,
  normalizeOnlineUserPageQuery,
  OnlineUserRepository,
  parseOnlineUserAgent,
  requireOnlineUserSession,
  type KickOutSessionInput,
  type CleanExpiredOnlineUserSessionsInput,
  type OnlineUserQuery,
} from './online-user.repository';

@Injectable()
export class SeedOnlineUserRepository extends OnlineUserRepository {
  private sessions: OnlineUserSessionRecord[] =
    seedOnlineUserSessions.map(cloneSession);

  async listOnlineUsers(
    query: OnlineUserQuery = {},
  ): Promise<PageResult<OnlineUserSessionRecord>> {
    const filters = normalizeOnlineUserFilters(query);
    const rows = this.sessions
      .filter(
        (session) =>
          matchesActive(session, filters.active) &&
          matchesUsername(session, filters.username),
      )
      .sort(compareOnlineUserSessions);
    const pagination = normalizeOnlineUserPageQuery(query, rows.length);

    return createOnlineUserPageResult(
      rows
        .slice(pagination.skip, pagination.skip + pagination.take)
        .map(cloneSession),
      pagination,
    );
  }

  async getOnlineUser(id: string): Promise<OnlineUserSessionRecord> {
    return cloneSession(this.findSession(id));
  }

  async registerSession(record: SecurityAuthSessionRecord): Promise<void> {
    const existing = this.sessions.find(
      (session) => session.tokenId === record.tokenId,
    );
    const nextSession = withParsedUserAgent({
      id: createSessionId(record.tokenId),
      username: record.username,
      tokenId: record.tokenId,
      tenantId: record.tenantId,
      membershipId: record.membershipId,
      accessMode: record.accessMode,
      ip: record.ip,
      userAgent: record.userAgent,
      lastSeenAt: record.lastSeenAt,
      expiresAt: record.expiresAt,
      revokedAt: undefined,
      revokedBy: undefined,
      revokedReason: undefined,
    });

    if (existing) {
      Object.assign(existing, nextSession);
      return;
    }

    this.sessions.push(nextSession);
  }

  async assertSessionActive(
    tokenId: string,
  ): Promise<SecurityAuthSessionContext | undefined> {
    const session = assertTokenSessionRegistered(
      this.sessions.find((row) => row.tokenId === tokenId),
      tokenId,
    );
    assertTokenSessionActive(session);
    session.lastSeenAt = new Date().toISOString();

    if (
      !session.tenantId ||
      !session.accessMode ||
      (session.accessMode === 'tenant' && !session.membershipId)
    ) {
      return undefined;
    }

    return {
      accessMode: session.accessMode,
      membershipId: session.membershipId,
      tenantId: session.tenantId,
      tokenId,
    };
  }

  async revokeSession(
    tokenId: string,
    body: SecurityAuthSessionRevocationInput,
  ): Promise<void> {
    const session = this.sessions.find((row) => row.tokenId === tokenId);

    if (!session || session.revokedAt) {
      return;
    }

    session.revokedAt = new Date().toISOString();
    session.revokedBy = body.actor;
    session.revokedReason = body.reason;
  }

  async kickOutSession(
    id: string,
    body: KickOutSessionInput,
  ): Promise<OnlineUserSessionRecord> {
    const session = this.findSession(id);
    assertSessionActive(session);
    session.revokedAt = new Date().toISOString();
    session.revokedBy = body.actor;
    session.revokedReason = body.reason;

    return cloneSession(session);
  }

  async getSummary() {
    return createOnlineUserSummary(this.sessions);
  }

  async cleanExpiredSessions(input: CleanExpiredOnlineUserSessionsInput = {}) {
    const expiredBefore = normalizeExpiredBefore(input.expiredBefore);
    const beforeCount = this.sessions.length;
    this.sessions = this.sessions.filter(
      (session) => !isOnlineUserSessionExpired(session, expiredBefore),
    );

    return {
      deleted: true as const,
      affected: beforeCount - this.sessions.length,
      expiredBefore,
    };
  }

  private findSession(id: string): OnlineUserSessionRecord {
    return requireOnlineUserSession(
      this.sessions.find((session) => session.id === id),
      id,
    );
  }
}

function matchesActive(
  session: OnlineUserSessionRecord,
  active: boolean | undefined,
): boolean {
  return active === undefined
    ? true
    : active
      ? !session.revokedAt && !isOnlineUserSessionExpired(session)
      : Boolean(session.revokedAt) || isOnlineUserSessionExpired(session);
}

function matchesUsername(
  session: OnlineUserSessionRecord,
  username: string | undefined,
): boolean {
  return username === undefined || session.username.includes(username);
}

function cloneSession(
  session: OnlineUserSessionRecord,
): OnlineUserSessionRecord {
  return JSON.parse(JSON.stringify(session)) as OnlineUserSessionRecord;
}

function withParsedUserAgent(
  session: Omit<OnlineUserSessionRecord, 'browser' | 'os'>,
): OnlineUserSessionRecord {
  const userAgent = parseOnlineUserAgent(session.userAgent);

  return {
    ...session,
    browser: userAgent.browser,
    os: userAgent.os,
  };
}

function createSessionId(tokenId: string): string {
  return `session_${tokenId.replace(/[^a-zA-Z0-9_-]/gu, '_')}`;
}
