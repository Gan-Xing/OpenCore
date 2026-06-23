import { randomUUID } from 'node:crypto';
import { runWithRequestContext } from '@opencore/core';
import { PrismaService } from '@opencore/database';
import { AuditLoginLogService } from './audit-login-log.service';
import { PrismaAuditLoginLogRepository } from './audit-login-log.prisma-repository';
import { SeedAuditLoginLogRepository } from './audit-login-log.seed-repository';

const ROOT_TENANT_ID = 'tenant_root';

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
          logType: 'login.username',
          result: 'success',
          success: true,
          browser: 'OpenCore Smoke',
          location: 'Loopback',
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
      logType: 'login.username',
      result: 'bad_credentials',
      success: false,
      failureReason: 'invalid-credentials',
      ip: '127.0.0.1',
      userAgent: 'jest',
      requestId: 'req_seed_login_failure',
    });
    await service.recordLoginAttempt({
      username: 'locked',
      logType: 'login.username',
      result: 'account_locked',
      success: false,
      failureReason: 'account-locked',
      ip: '127.0.0.1',
      userAgent: 'jest',
      requestId: 'req_seed_login_locked',
    });
    await service.recordLoginAttempt({
      username: 'operator',
      logType: 'logout.force',
      result: 'success',
      success: true,
      actorUsername: 'admin',
      reason: 'manual operator kick-out',
      ip: '127.0.0.1',
      userAgent: 'jest',
      requestId: 'req_seed_logout_force',
    });

    await expect(
      service.listLoginLogs({
        createdFrom: '2026-01-01T00:00:00.000Z',
        ip: '127.0.0.1',
        location: 'Loopback',
        success: false,
        logType: 'login.username',
        result: 'bad_credentials',
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
    await expect(
      service.listLoginLogs({
        actorUsername: 'admin',
        logType: 'logout.force',
        username: 'operator',
      }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        expect.objectContaining({
          actorUsername: 'admin',
          failureReason: undefined,
          logType: 'logout.force',
          reason: 'manual operator kick-out',
          result: 'success',
          username: 'operator',
        }),
      ],
    });
    await expect(
      service.listLoginLogs({
        result: 'account_locked',
        success: false,
        username: 'locked',
      }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        expect.objectContaining({
          username: 'locked',
          result: 'account_locked',
          failureReason: 'account-locked',
        }),
      ],
    });
    await expect(service.createExportPreview()).resolves.toMatchObject({
      filename: 'opencore-login-logs.csv',
      scope: 'current-page',
      columns: [
        'createdAt',
        'tenantId',
        'username',
        'logType',
        'result',
        'success',
        'failureReason',
        'actorUsername',
        'reason',
        'ip',
        'location',
        'browser',
        'os',
      ],
      rowCount: 5,
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
    await expectHttpExceptionCode(
      service.listLoginLogs({ createdFrom: 'not-a-date' }),
      'AUDIT_LOGIN_DATE_INVALID',
    );
    await expectHttpExceptionCode(
      service.listLoginLogs({ result: 'not-a-result' }),
      'AUDIT_LOGIN_RESULT_INVALID',
    );
    await expectHttpExceptionCode(
      service.listLoginLogs({ logType: 'login.magic' }),
      'AUDIT_LOGIN_LOG_TYPE_INVALID',
    );
    await expectHttpExceptionCode(
      service.deleteLoginLogs({ ids: [] }),
      'AUDIT_LOGIN_IDS_EMPTY',
    );
    await expectHttpExceptionCode(
      service.deleteLoginLogs({ ids: ['login_3', 'login_3'] }),
      'AUDIT_LOGIN_ID_DUPLICATED',
    );
    await expectHttpExceptionCode(
      service.deleteLoginLogs({ ids: ['login_3', 'missing_login_log'] }),
      'AUDIT_LOGIN_LOG_NOT_FOUND',
    );
    await expect(
      service.deleteLoginLogs({ ids: ['login_3'] }),
    ).resolves.toEqual({
      deleted: true,
      affected: 1,
      ids: ['login_3'],
    });
    await expectHttpExceptionCode(
      service.getLoginLog('login_3'),
      'AUDIT_LOGIN_LOG_NOT_FOUND',
    );
    await expect(service.cleanLoginLogs()).resolves.toEqual({
      deleted: true,
      affected: 4,
    });
    await expect(service.listLoginLogs()).resolves.toMatchObject({
      total: 0,
      items: [],
    });
  });

  describe('PrismaAuditLoginLogRepository integration', () => {
    const prisma = new PrismaService();
    const repository = new PrismaAuditLoginLogRepository(prisma);
    const service = new AuditLoginLogService(repository);
    const testRunId = randomUUID().slice(0, 8);
    const requestId = `req_login_${testRunId}`;
    const forceRequestId = `req_logout_force_${testRunId}`;
    const scopedRootRequestId = `req_login_root_${testRunId}`;
    const scopedOtherRequestId = `req_login_other_${testRunId}`;
    const otherCleanRequestId = `req_login_other_clean_${testRunId}`;
    const otherTenantId = `tenant_login_${testRunId}`;
    const otherCleanLogId = `login_other_clean_${testRunId}`;

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
          code: `login-${testRunId}`,
          slug: `login-${testRunId}`,
          name: `Login ${testRunId}`,
          status: 'active',
        },
      });
    });

    afterEach(async () => {
      await cleanupTestRows();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('persists and reads login attempts through Prisma', async () => {
      await service.recordLoginAttempt({
        username: `user_${testRunId}`,
        logType: 'login.username',
        result: 'bad_credentials',
        success: false,
        failureReason: 'invalid-credentials',
        ip: '127.0.0.1',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        requestId,
      });

      await expect(
        service.listLoginLogs({
          createdFrom: '2026-01-01T00:00:00.000Z',
          ip: '127.0.0.1',
          location: 'Loopback',
          username: `user_${testRunId}`,
          logType: 'login.username',
          result: 'bad_credentials',
        }),
      ).resolves.toMatchObject({
        total: 1,
        items: [
          expect.objectContaining({
            browser: 'Chrome',
            tenantId: ROOT_TENANT_ID,
            location: 'Loopback',
            requestId,
            os: 'Windows',
            success: false,
            failureReason: 'invalid-credentials',
            logType: 'login.username',
            result: 'bad_credentials',
          }),
        ],
      });

      await service.recordLoginAttempt({
        username: `operator_${testRunId}`,
        logType: 'logout.force',
        result: 'success',
        success: true,
        actorUsername: 'admin',
        reason: 'Prisma force logout test',
        ip: '127.0.0.1',
        userAgent: 'jest',
        requestId: forceRequestId,
      });
      await expect(
        service.listLoginLogs({
          actorUsername: 'admin',
          location: 'Loopback',
          logType: 'logout.force',
          username: `operator_${testRunId}`,
        }),
      ).resolves.toMatchObject({
        total: 1,
        items: [
          expect.objectContaining({
            actorUsername: 'admin',
            failureReason: undefined,
            location: 'Loopback',
            reason: 'Prisma force logout test',
            requestId: forceRequestId,
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
        failureReason: 'invalid-credentials',
        location: 'Loopback',
        logType: 'login.username',
        result: 'bad_credentials',
      });
      await expectHttpExceptionCode(
        service.deleteLoginLogs({ ids: [] }),
        'AUDIT_LOGIN_IDS_EMPTY',
      );
      await expectHttpExceptionCode(
        service.deleteLoginLogs({
          ids: [String(persistedId), String(persistedId)],
        }),
        'AUDIT_LOGIN_ID_DUPLICATED',
      );
      await expectHttpExceptionCode(
        service.deleteLoginLogs({
          ids: [String(persistedId), `missing_${testRunId}`],
        }),
        'AUDIT_LOGIN_LOG_NOT_FOUND',
      );
      await expect(service.getLoginLog(String(persistedId))).resolves.toEqual(
        expect.objectContaining({
          requestId,
        }),
      );
      await expect(
        service.deleteLoginLogs({ ids: [String(persistedId)] }),
      ).resolves.toEqual({
        deleted: true,
        affected: 1,
        ids: [String(persistedId)],
      });
      await expectHttpExceptionCode(
        service.getLoginLog(String(persistedId)),
        'AUDIT_LOGIN_LOG_NOT_FOUND',
      );
    });

    it('scopes Prisma login-log operations to the request tenant', async () => {
      await runInTenant(ROOT_TENANT_ID, () =>
        service.recordLoginAttempt({
          username: `tenant_root_${testRunId}`,
          logType: 'login.username',
          result: 'bad_credentials',
          success: false,
          failureReason: 'invalid-credentials',
          ip: '127.0.0.1',
          userAgent: 'jest',
          requestId: scopedRootRequestId,
        }),
      );
      await runInTenant(otherTenantId, () =>
        service.recordLoginAttempt({
          username: `tenant_other_${testRunId}`,
          logType: 'login.username',
          result: 'bad_credentials',
          success: false,
          failureReason: 'invalid-credentials',
          ip: '127.0.0.2',
          userAgent: 'jest',
          requestId: scopedOtherRequestId,
        }),
      );
      await prisma.loginLog.create({
        data: {
          id: otherCleanLogId,
          tenantId: otherTenantId,
          username: `tenant_other_clean_${testRunId}`,
          logType: 'login.username',
          result: 'success',
          success: true,
          ip: '127.0.0.3',
          location: 'Loopback',
          userAgent: 'jest',
          requestId: otherCleanRequestId,
        },
      });

      const otherLog = await prisma.loginLog.findFirstOrThrow({
        where: { requestId: scopedOtherRequestId },
      });
      const rootPage = await runInTenant(ROOT_TENANT_ID, () =>
        service.listLoginLogs({
          page: 1,
          pageSize: 100,
          username: `tenant_`,
        }),
      );
      expect(rootPage.items.map((log) => log.requestId)).toEqual(
        expect.arrayContaining([scopedRootRequestId]),
      );
      expect(rootPage.items.map((log) => log.requestId)).not.toEqual(
        expect.arrayContaining([scopedOtherRequestId, otherCleanRequestId]),
      );

      await expectHttpExceptionCode(
        runInTenant(ROOT_TENANT_ID, () => service.getLoginLog(otherLog.id)),
        'AUDIT_LOGIN_LOG_NOT_FOUND',
      );
      await expectHttpExceptionCode(
        runInTenant(ROOT_TENANT_ID, () =>
          service.deleteLoginLogs({ ids: [otherLog.id] }),
        ),
        'AUDIT_LOGIN_LOG_NOT_FOUND',
      );
      await expect(
        prisma.loginLog.findUnique({ where: { id: otherLog.id } }),
      ).resolves.toMatchObject({ id: otherLog.id });

      await expect(
        runInTenant(otherTenantId, () => service.getLoginLog(otherLog.id)),
      ).resolves.toMatchObject({
        id: otherLog.id,
        tenantId: otherTenantId,
        requestId: scopedOtherRequestId,
      });
      const cleanOther = await runInTenant(otherTenantId, () =>
        service.cleanLoginLogs(),
      );
      expect(cleanOther.affected).toBeGreaterThanOrEqual(2);
      await expect(
        prisma.loginLog.findFirst({
          where: { requestId: scopedRootRequestId },
        }),
      ).resolves.toMatchObject({ requestId: scopedRootRequestId });
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.loginLog.deleteMany({
        where: {
          OR: [
            {
              requestId: {
                in: [
                  requestId,
                  forceRequestId,
                  scopedRootRequestId,
                  scopedOtherRequestId,
                  otherCleanRequestId,
                ],
              },
            },
            { id: otherCleanLogId },
          ],
        },
      });
      await prisma.tenant.deleteMany({ where: { id: otherTenantId } });
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
  code: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
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
