import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import {
  seedOnlineUserSessions,
  type OnlineUserSessionRecord,
} from './online-user.records';
import {
  assertSessionActive,
  compareOnlineUserSessions,
  createOnlineUserPageResult,
  createOnlineUserSummary,
  normalizeOnlineUserFilters,
  normalizeOnlineUserPageQuery,
  OnlineUserRepository,
  requireOnlineUserSession,
  type KickOutSessionInput,
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
      ? !session.revokedAt
      : Boolean(session.revokedAt);
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
