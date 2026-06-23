import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { runWithRequestContext } from '@opencore/core';
import { PrismaService } from '@opencore/database';
import { PrismaOnlineUserRepository } from './online-user.prisma-repository';
import { SeedOnlineUserRepository } from './online-user.seed-repository';
import { OnlineUserService } from './online-user.service';

describe('@opencore/online-user', () => {
  const ROOT_TENANT_ID = 'tenant_root';

  it('lists, filters, summarizes and kicks out seed sessions', async () => {
    const repository = new SeedOnlineUserRepository();
    const service = new OnlineUserService(repository);

    await expect(
      service.listOnlineUsers({ active: true, username: 'admin' }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        expect.objectContaining({
          id: 'session_admin',
          username: 'admin',
        }),
      ],
    });
    await expect(service.getSummary()).resolves.toEqual({
      total: 2,
      active: 2,
      activeUsers: 2,
      revoked: 0,
      expired: 0,
      cleanupEligible: 0,
    });
    await expect(
      service.kickOutSession('session_admin', {
        actor: 'admin',
        reason: 'manual test',
      }),
    ).resolves.toMatchObject({
      id: 'session_admin',
      revokedAt: expect.any(String),
      revokedBy: 'admin',
      revokedReason: 'manual test',
    });
    await expect(service.getSummary()).resolves.toEqual({
      total: 2,
      active: 1,
      activeUsers: 1,
      revoked: 1,
      expired: 0,
      cleanupEligible: 0,
    });
    await expectHttpExceptionCode(
      service.kickOutSession('session_admin', {
        actor: 'admin',
        reason: 'repeat',
      }),
      BadRequestException,
      'ONLINE_USER_SESSION_ALREADY_REVOKED',
    );
  });

  it('registers auth sessions, parses user agents and rejects revoked tokens', async () => {
    const repository = new SeedOnlineUserRepository();
    const service = new OnlineUserService(repository);
    const tokenId = `token_${randomUUID()}`;

    await repository.registerSession({
      userId: 'user_admin',
      username: 'admin',
      tokenId,
      ip: '10.0.0.1',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36',
      lastSeenAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    const page = await service.listOnlineUsers({
      username: 'admin',
      active: true,
    });
    const session = page.items.find((item) => item.tokenId === tokenId);

    expect(session).toMatchObject({
      browser: 'Chrome',
      os: 'Windows',
      ip: '10.0.0.1',
    });
    await expect(repository.assertSessionActive(tokenId)).resolves.toBe(
      undefined,
    );

    await service.kickOutSessions({
      ids: [session?.id ?? 'missing'],
      actor: 'admin',
      reason: 'batch revoke',
    });

    await expectHttpExceptionCode(
      repository.assertSessionActive(tokenId),
      UnauthorizedException,
      'ONLINE_USER_TOKEN_REVOKED',
    );
    await expectHttpExceptionCode(
      repository.assertSessionActive(`missing_${tokenId}`),
      UnauthorizedException,
      'ONLINE_USER_TOKEN_SESSION_UNREGISTERED',
    );
  });

  it('summarizes and cleans expired seed token sessions', async () => {
    const repository = new SeedOnlineUserRepository();
    const service = new OnlineUserService(repository);
    const tokenId = `token_expired_${randomUUID()}`;
    const expiresAt = '2026-06-10T00:00:00.000Z';

    await repository.registerSession({
      userId: 'user_admin',
      username: 'expired-admin',
      tokenId,
      ip: '10.0.0.2',
      userAgent: 'jest',
      lastSeenAt: '2026-06-09T00:00:00.000Z',
      expiresAt,
    });

    await expect(
      service.listOnlineUsers({ active: false, username: 'expired-admin' }),
    ).resolves.toMatchObject({
      total: 1,
      items: [expect.objectContaining({ tokenId })],
    });
    await expectHttpExceptionCode(
      repository.assertSessionActive(tokenId),
      UnauthorizedException,
      'ONLINE_USER_TOKEN_EXPIRED',
    );
    await expectHttpExceptionCode(
      service.cleanExpiredSessions({
        expiredBefore: 'not-a-date',
      }),
      BadRequestException,
      'ONLINE_USER_EXPIRED_BEFORE_INVALID',
    );
    await expect(
      service.cleanExpiredSessions({
        expiredBefore: '2026-06-10T00:00:00.000Z',
      }),
    ).resolves.toEqual({
      deleted: true,
      affected: 1,
      expiredBefore: '2026-06-10T00:00:00.000Z',
    });
    await expect(
      service.listOnlineUsers({ username: 'expired-admin' }),
    ).resolves.toMatchObject({ total: 0 });
  });

  describe('PrismaOnlineUserRepository integration', () => {
    const prisma = new PrismaService();
    const repository = new PrismaOnlineUserRepository(prisma);
    const service = new OnlineUserService(repository);
    const testRunId = randomUUID().slice(0, 8);
    const id = `session_test_${testRunId}`;
    const tokenId = `token_test_${testRunId}`;
    const expiredId = `session_expired_${testRunId}`;
    const expiredTokenId = `token_expired_${testRunId}`;
    const otherTenantId = `tenant_online_${testRunId}`;
    const otherSessionId = `session_other_${testRunId}`;
    const otherTokenId = `token_other_${testRunId}`;
    const otherExpiredId = `session_other_expired_${testRunId}`;
    const otherExpiredTokenId = `token_other_expired_${testRunId}`;

    beforeEach(async () => {
      await cleanupTestRows();
      await prisma.tenant.upsert({
        where: { id: ROOT_TENANT_ID },
        update: {},
        create: {
          id: ROOT_TENANT_ID,
          code: 'root',
          slug: 'root',
          name: 'Root Tenant',
          status: 'active',
        },
      });
      await prisma.tenant.create({
        data: {
          id: otherTenantId,
          code: `online-${testRunId}`,
          slug: `online-${testRunId}`,
          name: `Online ${testRunId}`,
          status: 'active',
        },
      });
      await prisma.onlineUserSession.create({
        data: {
          id,
          username: `operator_${testRunId}`,
          tokenId,
          tenantId: ROOT_TENANT_ID,
          ip: '127.0.0.1',
          userAgent: 'jest',
          lastSeenAt: new Date('2026-06-10T00:10:00.000Z'),
          expiresAt: new Date('2099-06-10T01:10:00.000Z'),
        },
      });
      await prisma.onlineUserSession.create({
        data: {
          id: expiredId,
          username: `expired_${testRunId}`,
          tokenId: expiredTokenId,
          tenantId: ROOT_TENANT_ID,
          ip: '127.0.0.2',
          userAgent: 'jest',
          lastSeenAt: new Date('2026-06-10T00:10:00.000Z'),
          expiresAt: new Date('2026-06-10T01:10:00.000Z'),
        },
      });
      await prisma.onlineUserSession.create({
        data: {
          id: otherSessionId,
          username: `other_${testRunId}`,
          tokenId: otherTokenId,
          tenantId: otherTenantId,
          ip: '127.0.0.2',
          userAgent: 'jest',
          lastSeenAt: new Date('2026-06-10T00:10:00.000Z'),
          expiresAt: new Date('2099-06-10T01:10:00.000Z'),
        },
      });
      await prisma.onlineUserSession.create({
        data: {
          id: otherExpiredId,
          username: `other_expired_${testRunId}`,
          tokenId: otherExpiredTokenId,
          tenantId: otherTenantId,
          ip: '127.0.0.3',
          userAgent: 'jest',
          lastSeenAt: new Date('2026-06-10T00:10:00.000Z'),
          expiresAt: new Date('2026-06-10T01:10:00.000Z'),
        },
      });
    });

    afterEach(async () => {
      await cleanupTestRows();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('persists online-user kick-out audit fields through Prisma', async () => {
      await expect(
        service.listOnlineUsers({ active: true, username: testRunId }),
      ).resolves.toMatchObject({
        total: 1,
        items: [expect.objectContaining({ id, tokenId })],
      });

      await expect(
        service.kickOutSession(id, {
          actor: 'admin',
          reason: 'security rotation',
        }),
      ).resolves.toMatchObject({
        id,
        revokedAt: expect.any(String),
        revokedBy: 'admin',
        revokedReason: 'security rotation',
      });
      await expect(service.getOnlineUser(id)).resolves.toMatchObject({
        id,
        revokedBy: 'admin',
        revokedReason: 'security rotation',
      });
      await expectHttpExceptionCode(
        repository.assertSessionActive(tokenId),
        UnauthorizedException,
        'ONLINE_USER_TOKEN_REVOKED',
      );
      await expectHttpExceptionCode(
        repository.assertSessionActive(`missing_${tokenId}`),
        UnauthorizedException,
        'ONLINE_USER_TOKEN_SESSION_UNREGISTERED',
      );
    });

    it('summarizes and cleans expired Prisma sessions without deleting active sessions', async () => {
      await expect(
        service.listOnlineUsers({ active: false, username: testRunId }),
      ).resolves.toMatchObject({
        total: 1,
        items: [expect.objectContaining({ id: expiredId })],
      });
      await expectHttpExceptionCode(
        repository.assertSessionActive(expiredTokenId),
        UnauthorizedException,
        'ONLINE_USER_TOKEN_EXPIRED',
      );
      const cleanResult = await service.cleanExpiredSessions({
        expiredBefore: '2026-06-10T01:10:00.000Z',
      });
      expect(cleanResult).toMatchObject({
        deleted: true,
        expiredBefore: '2026-06-10T01:10:00.000Z',
      });
      expect(cleanResult.affected).toBeGreaterThanOrEqual(1);
      await expect(service.getOnlineUser(id)).resolves.toMatchObject({
        id,
        tokenId,
      });
      await expectHttpExceptionCode(
        service.getOnlineUser(expiredId),
        NotFoundException,
        'ONLINE_USER_SESSION_NOT_FOUND',
      );
    });

    it('scopes Prisma monitor operations to the request tenant', async () => {
      const rootPage = await runInTenant(ROOT_TENANT_ID, () =>
        service.listOnlineUsers({
          page: 1,
          pageSize: 100,
          username: testRunId,
        }),
      );
      expect(rootPage.items.map((session) => session.id)).toEqual(
        expect.arrayContaining([id, expiredId]),
      );
      expect(rootPage.items.map((session) => session.id)).not.toEqual(
        expect.arrayContaining([otherSessionId, otherExpiredId]),
      );

      await expectHttpExceptionCode(
        runInTenant(ROOT_TENANT_ID, () =>
          service.getOnlineUser(otherSessionId),
        ),
        NotFoundException,
        'ONLINE_USER_SESSION_NOT_FOUND',
      );
      const rootKick = await runInTenant(ROOT_TENANT_ID, () =>
        service.kickOutSessions({
          ids: [otherSessionId],
          actor: 'admin',
          reason: 'wrong tenant',
        }),
      );
      expect(rootKick).toMatchObject({ requested: 1, kicked: 0, skipped: 1 });

      await expect(
        runInTenant(otherTenantId, () => service.getSummary()),
      ).resolves.toMatchObject({
        total: 2,
        active: 1,
        expired: 1,
      });
      await expect(
        runInTenant(otherTenantId, () =>
          service.kickOutSession(otherSessionId, {
            actor: 'admin',
            reason: 'same tenant',
          }),
        ),
      ).resolves.toMatchObject({
        id: otherSessionId,
        revokedReason: 'same tenant',
      });

      const cleanRoot = await runInTenant(ROOT_TENANT_ID, () =>
        service.cleanExpiredSessions({
          expiredBefore: '2026-06-10T01:10:00.000Z',
        }),
      );
      expect(cleanRoot.affected).toBeGreaterThanOrEqual(1);
      await expect(
        prisma.onlineUserSession.findUnique({ where: { id: otherExpiredId } }),
      ).resolves.toMatchObject({ id: otherExpiredId });
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.onlineUserSession.deleteMany({
        where: {
          OR: [
            { id },
            { tokenId },
            { id: expiredId },
            { tokenId: expiredTokenId },
            { id: otherSessionId },
            { tokenId: otherTokenId },
            { id: otherExpiredId },
            { tokenId: otherExpiredTokenId },
          ],
        },
      });
      await prisma.tenant.deleteMany({
        where: { id: otherTenantId },
      });
    }
  });
});

function runInTenant<T>(tenantId: string, callback: () => T): T {
  return runWithRequestContext(
    {
      requestId: `test-${tenantId}`,
      traceId: `test-${tenantId}`,
      tenantId,
    },
    callback,
  );
}

async function expectHttpExceptionCode(
  promise: Promise<unknown>,
  exceptionClass: new (...args: never[]) => Error,
  code: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(exceptionClass);
    expect(getHttpExceptionResponse(error)).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected HTTP exception code ${code}`);
}

function getHttpExceptionResponse(error: unknown): unknown {
  if (
    error &&
    typeof error === 'object' &&
    'getResponse' in error &&
    typeof error.getResponse === 'function'
  ) {
    return error.getResponse();
  }

  return undefined;
}
