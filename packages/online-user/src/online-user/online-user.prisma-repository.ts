import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import type {
  SecurityAuthSessionRecord,
  SecurityAuthSessionRevocationInput,
} from '@opencore/security';
import type { OnlineUserSessionRecord } from './online-user.records';
import {
  assertTokenSessionActive,
  assertSessionActive,
  createOnlineUserPageResult,
  createOnlineUserSummary,
  normalizeOnlineUserFilters,
  normalizeOnlineUserPageQuery,
  OnlineUserRepository,
  parseOnlineUserAgent,
  requireOnlineUserSession,
  type KickOutSessionInput,
  type OnlineUserQuery,
} from './online-user.repository';

type OnlineUserSessionRow = {
  id: string;
  username: string;
  tokenId: string;
  ip: string;
  userAgent: string;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null;
  revokedReason: string | null;
};

@Injectable()
export class PrismaOnlineUserRepository extends OnlineUserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listOnlineUsers(
    query: OnlineUserQuery = {},
  ): Promise<PageResult<OnlineUserSessionRecord>> {
    const filters = normalizeOnlineUserFilters(query);
    const where = {
      ...(filters.active === undefined
        ? {}
        : {
            revokedAt: filters.active ? null : { not: null },
          }),
      ...(filters.username === undefined
        ? {}
        : { username: { contains: filters.username } }),
    };
    const total = await this.prisma.onlineUserSession.count({ where });
    const pagination = normalizeOnlineUserPageQuery(query, total);
    const rows = await this.prisma.onlineUserSession.findMany({
      where,
      orderBy: [{ lastSeenAt: 'desc' }, { username: 'asc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createOnlineUserPageResult(
      rows.map(toOnlineUserSessionRecord),
      pagination,
    );
  }

  async getOnlineUser(id: string): Promise<OnlineUserSessionRecord> {
    return this.findSession(id);
  }

  async registerSession(record: SecurityAuthSessionRecord): Promise<void> {
    await this.prisma.onlineUserSession.upsert({
      where: { tokenId: record.tokenId },
      create: {
        id: createSessionId(record.tokenId),
        username: record.username,
        tokenId: record.tokenId,
        ip: record.ip,
        userAgent: record.userAgent,
        lastSeenAt: new Date(record.lastSeenAt),
        expiresAt: new Date(record.expiresAt),
      },
      update: {
        username: record.username,
        ip: record.ip,
        userAgent: record.userAgent,
        lastSeenAt: new Date(record.lastSeenAt),
        expiresAt: new Date(record.expiresAt),
        revokedAt: null,
        revokedBy: null,
        revokedReason: null,
      },
    });
  }

  async assertSessionActive(tokenId: string): Promise<void> {
    const session = await this.prisma.onlineUserSession.findUnique({
      where: { tokenId },
      select: {
        tokenId: true,
        revokedAt: true,
        expiresAt: true,
      },
    });

    if (!session) {
      return;
    }

    assertTokenSessionActive({
      tokenId,
      revokedAt: session.revokedAt?.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    });

    await this.prisma.onlineUserSession.update({
      where: { tokenId },
      data: { lastSeenAt: new Date() },
    });
  }

  async revokeSession(
    tokenId: string,
    body: SecurityAuthSessionRevocationInput,
  ): Promise<void> {
    const session = await this.prisma.onlineUserSession.findUnique({
      where: { tokenId },
      select: { tokenId: true, revokedAt: true },
    });

    if (!session || session.revokedAt) {
      return;
    }

    await this.prisma.onlineUserSession.update({
      where: { tokenId },
      data: {
        revokedAt: new Date(),
        revokedBy: body.actor,
        revokedReason: body.reason,
      },
    });
  }

  async kickOutSession(
    id: string,
    body: KickOutSessionInput,
  ): Promise<OnlineUserSessionRecord> {
    const existing = await this.findSession(id);
    assertSessionActive(existing);
    const session = await this.prisma.onlineUserSession.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        revokedBy: body.actor,
        revokedReason: body.reason,
      },
    });

    return toOnlineUserSessionRecord(session);
  }

  async getSummary() {
    const sessions = await this.prisma.onlineUserSession.findMany({
      select: { revokedAt: true },
    });

    return createOnlineUserSummary(
      sessions.map((session) => ({
        revokedAt: session.revokedAt?.toISOString(),
      })),
    );
  }

  private async findSession(id: string): Promise<OnlineUserSessionRecord> {
    return requireOnlineUserSession(
      await this.prisma.onlineUserSession
        .findUnique({ where: { id } })
        .then((session) =>
          session ? toOnlineUserSessionRecord(session) : undefined,
        ),
      id,
    );
  }
}

function toOnlineUserSessionRecord(
  row: OnlineUserSessionRow,
): OnlineUserSessionRecord {
  const userAgent = parseOnlineUserAgent(row.userAgent);

  return {
    id: row.id,
    username: row.username,
    tokenId: row.tokenId,
    ip: row.ip,
    userAgent: row.userAgent,
    browser: userAgent.browser,
    os: userAgent.os,
    lastSeenAt: row.lastSeenAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString(),
    revokedBy: row.revokedBy ?? undefined,
    revokedReason: row.revokedReason ?? undefined,
  };
}

function createSessionId(tokenId: string): string {
  return `session_${tokenId.replace(/[^a-zA-Z0-9_-]/gu, '_')}`;
}
