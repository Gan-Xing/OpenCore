import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
import { PrismaOnlineUserRepository } from './online-user.prisma-repository';
import { SeedOnlineUserRepository } from './online-user.seed-repository';
import { OnlineUserService } from './online-user.service';

describe('@opencore/online-user', () => {
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
      revoked: 0,
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
      revoked: 1,
    });
    await expect(
      service.kickOutSession('session_admin', {
        actor: 'admin',
        reason: 'repeat',
      }),
    ).rejects.toThrow(BadRequestException);
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

    await expect(repository.assertSessionActive(tokenId)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  describe('PrismaOnlineUserRepository integration', () => {
    const prisma = new PrismaService();
    const repository = new PrismaOnlineUserRepository(prisma);
    const service = new OnlineUserService(repository);
    const testRunId = randomUUID().slice(0, 8);
    const id = `session_test_${testRunId}`;
    const tokenId = `token_test_${testRunId}`;

    beforeEach(async () => {
      await cleanupTestRows();
      await prisma.onlineUserSession.create({
        data: {
          id,
          username: `operator_${testRunId}`,
          tokenId,
          ip: '127.0.0.1',
          userAgent: 'jest',
          lastSeenAt: new Date('2026-06-10T00:10:00.000Z'),
          expiresAt: new Date('2099-06-10T01:10:00.000Z'),
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
      await expect(repository.assertSessionActive(tokenId)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.onlineUserSession.deleteMany({
        where: { OR: [{ id }, { tokenId }] },
      });
    }
  });
});
