import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
import { AuditLoginLogService } from './audit-login-log.service';
import { PrismaAuditLoginLogRepository } from './audit-login-log.prisma-repository';
import { SeedAuditLoginLogRepository } from './audit-login-log.seed-repository';

describe('@opencore/audit audit-login-log', () => {
  it('lists, filters, records and exports seed login logs', async () => {
    const repository = new SeedAuditLoginLogRepository();
    const service = new AuditLoginLogService(repository);

    await expect(
      service.listLoginLogs({ username: 'admin' }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        expect.objectContaining({
          username: 'admin',
          success: true,
          browser: 'OpenCore Smoke',
          os: 'Unknown',
        }),
      ],
    });
    await expect(
      service.getLoginLog('login_success_admin'),
    ).resolves.toMatchObject({
      id: 'login_success_admin',
      username: 'admin',
      success: true,
    });

    await service.recordLoginAttempt({
      username: 'operator',
      success: false,
      failureReason: 'invalid-credentials-or-disabled',
      ip: '127.0.0.1',
      userAgent: 'jest',
      requestId: 'req_seed_login_failure',
    });

    await expect(
      service.listLoginLogs({
        createdFrom: '2026-01-01T00:00:00.000Z',
        ip: '127.0.0.1',
        success: false,
        pageSize: 10,
      }),
    ).resolves.toMatchObject({
      total: 2,
      items: expect.arrayContaining([
        expect.objectContaining({
          username: 'operator',
          requestId: 'req_seed_login_failure',
        }),
      ]),
    });
    await expect(service.createExportPreview()).resolves.toMatchObject({
      filename: 'opencore-login-logs.csv',
      scope: 'current-page',
      columns: [
        'createdAt',
        'username',
        'success',
        'failureReason',
        'ip',
        'browser',
        'os',
      ],
      rowCount: 3,
    });
    await expect(
      service.listLoginLogs({
        createdFrom: '2026-06-10T00:01:00.000Z',
        createdTo: '2026-06-10T00:03:00.000Z',
      }),
    ).resolves.toMatchObject({
      total: 1,
      items: [expect.objectContaining({ id: 'login_failure_unknown' })],
    });
    await expect(
      service.listLoginLogs({ createdFrom: 'not-a-date' }),
    ).rejects.toThrow('createdFrom must be a valid ISO date-time string');
  });

  describe('PrismaAuditLoginLogRepository integration', () => {
    const prisma = new PrismaService();
    const repository = new PrismaAuditLoginLogRepository(prisma);
    const service = new AuditLoginLogService(repository);
    const testRunId = randomUUID().slice(0, 8);
    const requestId = `req_login_${testRunId}`;

    beforeEach(async () => {
      await cleanupTestRows();
    });

    afterEach(async () => {
      await cleanupTestRows();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('reads seeded login logs and persists login attempts through Prisma', async () => {
      await expect(
        service.listLoginLogs({
          username: 'unknown',
          success: false,
          pageSize: 20,
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              username: 'unknown',
              requestId: 'req_s7_seed_login_fail',
            }),
          ]),
        }),
      );

      await service.recordLoginAttempt({
        username: `user_${testRunId}`,
        success: false,
        failureReason: 'invalid-credentials-or-disabled',
        ip: '127.0.0.1',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        requestId,
      });

      await expect(
        service.listLoginLogs({
          createdFrom: '2026-01-01T00:00:00.000Z',
          ip: '127.0.0.1',
          username: `user_${testRunId}`,
        }),
      ).resolves.toMatchObject({
        total: 1,
        items: [
          expect.objectContaining({
            browser: 'Chrome',
            requestId,
            os: 'Windows',
            success: false,
            failureReason: 'invalid-credentials-or-disabled',
          }),
        ],
      });

      const page = await service.listLoginLogs({
        username: `user_${testRunId}`,
      });
      const persistedId = page.items[0]?.id;
      expect(persistedId).toBeDefined();

      await expect(
        service.getLoginLog(String(persistedId)),
      ).resolves.toMatchObject({
        requestId,
        success: false,
        failureReason: 'invalid-credentials-or-disabled',
      });
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.loginLog.deleteMany({
        where: { requestId },
      });
    }
  });
});
