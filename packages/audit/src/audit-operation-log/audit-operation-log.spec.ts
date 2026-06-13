import { BadRequestException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { lastValueFrom, of, throwError } from 'rxjs';
import { PrismaService } from '@opencore/database';
import {
  AUDIT_OPERATION_KEY,
  AuditOperation,
} from './audit-operation-log.decorators';
import {
  AuditOperationLogInterceptor,
  redactAuditMetadata,
} from './audit-operation-log.interceptor';
import { PrismaAuditOperationLogRepository } from './audit-operation-log.prisma-repository';
import { SeedAuditOperationLogRepository } from './audit-operation-log.seed-repository';
import { AuditOperationLogService } from './audit-operation-log.service';

describe('@opencore/audit audit-operation-log', () => {
  it('sets operation metadata and redacts sensitive metadata recursively', () => {
    class Target {}

    AuditOperation({
      action: 'publish',
      resource: 'core.notice',
      resourceIdField: 'id',
    })(Target);

    expect(readMetadata(AUDIT_OPERATION_KEY, Target)).toEqual({
      action: 'publish',
      resource: 'core.notice',
      resourceIdField: 'id',
    });
    expect(
      redactAuditMetadata({
        username: 'admin',
        password: 'admin123',
        nested: {
          token: 'secret-token',
        },
      }),
    ).toEqual({
      username: 'admin',
      password: '[REDACTED]',
      nested: {
        token: '[REDACTED]',
      },
    });
  });

  it('lists, filters, records and exports seed operation logs', async () => {
    const repository = new SeedAuditOperationLogRepository();
    const service = new AuditOperationLogService(repository);

    await expect(
      service.listOperationLogs({ resource: 'core.config' }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        expect.objectContaining({
          resource: 'core.config',
          action: 'read',
        }),
      ],
    });

    await service.recordOperation({
      actorUsername: 'operator',
      action: 'CREATE',
      resource: 'core.notice',
      resourceId: 'notice_1',
      method: 'POST',
      path: '/api/core/notices',
      statusCode: 201,
      ip: '127.0.0.1',
      userAgent: 'jest',
      requestId: 'req_seed_audit_create',
      metadata: {
        body: {
          password: 'secret',
        },
      },
    });

    await expect(
      service.listOperationLogs({ actorUsername: 'operator' }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        expect.objectContaining({
          requestId: 'req_seed_audit_create',
          metadata: {
            body: {
              password: '[REDACTED]',
            },
          },
        }),
      ],
    });
    await expect(service.getOperationLog('audit_3')).resolves.toMatchObject({
      requestId: 'req_seed_audit_create',
      metadata: {
        body: {
          password: '[REDACTED]',
        },
      },
    });
    await expect(service.createExportPreview()).resolves.toMatchObject({
      filename: 'opencore-audit-logs.csv',
      scope: 'current-page',
      columns: [
        'createdAt',
        'actorUsername',
        'action',
        'resource',
        'statusCode',
      ],
      rowCount: 3,
    });

    await expect(service.deleteOperationLogs({ ids: [] })).rejects.toThrow(
      'Audit log ids must not be empty.',
    );
    await expect(
      service.deleteOperationLogs({ ids: ['audit_3', 'audit_3'] }),
    ).rejects.toThrow('Audit log id is duplicated: audit_3');
    await expect(
      service.deleteOperationLogs({ ids: ['audit_3', 'missing_audit_log'] }),
    ).rejects.toThrow('Audit log not found: missing_audit_log');
    await expect(
      service.deleteOperationLogs({ ids: ['audit_3'] }),
    ).resolves.toEqual({
      deleted: true,
      affected: 1,
      ids: ['audit_3'],
    });
    await expect(service.getOperationLog('audit_3')).rejects.toThrow(
      'Audit log not found: audit_3',
    );
    await expect(service.cleanOperationLogs()).resolves.toEqual({
      deleted: true,
      affected: 2,
    });
    await expect(service.listOperationLogs()).resolves.toMatchObject({
      total: 0,
      items: [],
    });
  });

  it('records write operations through the interceptor and skips disabled metadata', async () => {
    const repository = new SeedAuditOperationLogRepository();
    const service = new AuditOperationLogService(repository);
    const interceptor = new AuditOperationLogInterceptor(
      service,
      createReflector({
        action: 'update',
        resource: 'core.config',
        resourceIdField: 'id',
      }),
    );

    await expect(
      lastValueFrom(
        interceptor.intercept(
          createContext({
            body: { password: 'secret' },
            headers: {
              authorization: 'Bearer secret',
              'user-agent': 'jest',
            },
            ip: '127.0.0.1',
            method: 'PATCH',
            originalUrl: '/api/core/config/site.name',
            params: { id: 'site.name' },
            user: { username: 'admin' },
          }),
          { handle: () => of({ ok: true }) },
        ),
      ),
    ).resolves.toEqual({ ok: true });

    await expect(
      service.listOperationLogs({
        actorUsername: 'admin',
        resource: 'core.config',
      }),
    ).resolves.toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          action: 'update',
          resourceId: 'site.name',
          metadata: expect.objectContaining({
            body: { password: '[REDACTED]' },
            headers: expect.objectContaining({
              authorization: '[REDACTED]',
            }),
          }),
        }),
      ]),
    });

    const skipped = new AuditOperationLogInterceptor(
      service,
      createReflector({ disabled: true }),
    );
    await lastValueFrom(
      skipped.intercept(createContext({ method: 'POST' }), {
        handle: () => of(null),
      }),
    );
    await expect(
      service.listOperationLogs({ resource: 'unknown' }),
    ).resolves.toMatchObject({ total: 0 });
  });

  it('records failed operations with error status codes', async () => {
    const repository = new SeedAuditOperationLogRepository();
    const service = new AuditOperationLogService(repository);
    const interceptor = new AuditOperationLogInterceptor(
      service,
      createReflector(undefined),
    );

    await expect(
      lastValueFrom(
        interceptor.intercept(
          createContext({
            headers: {},
            method: 'POST',
            originalUrl: '/api/core/config',
            user: { username: 'admin' },
          }),
          {
            handle: () =>
              throwError(() => new BadRequestException('Invalid config')),
          },
        ),
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.listOperationLogs({ resource: '/api/core/config' }),
    ).resolves.toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          statusCode: 400,
        }),
      ]),
    });
  });

  describe('PrismaAuditOperationLogRepository integration', () => {
    const prisma = new PrismaService();
    const repository = new PrismaAuditOperationLogRepository(prisma);
    const service = new AuditOperationLogService(repository);
    const testRunId = randomUUID().slice(0, 8);
    const requestId = `req_audit_${testRunId}`;
    const seedRequestId = `req_s7_seed_config_${testRunId}`;

    beforeEach(async () => {
      await cleanupTestRows();
    });

    afterEach(async () => {
      await cleanupTestRows();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('reads seeded operation logs and persists redacted operations through Prisma', async () => {
      await prisma.auditLog.create({
        data: {
          actorUsername: 'admin',
          action: 'read',
          resource: 'core.config',
          method: 'GET',
          path: '/api/core/config',
          statusCode: 200,
          ip: '127.0.0.1',
          userAgent: 'jest',
          requestId: seedRequestId,
          metadata: {
            filter: 'current-page',
          },
        },
      });

      await expect(
        service.listOperationLogs({ resource: 'core.config', pageSize: 20 }),
      ).resolves.toEqual(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              requestId: seedRequestId,
              resource: 'core.config',
            }),
          ]),
        }),
      );

      await service.recordOperation({
        actorUsername: 'operator',
        action: 'CREATE',
        resource: `test.resource.${testRunId}`,
        method: 'POST',
        path: '/api/test',
        statusCode: 201,
        ip: '127.0.0.1',
        userAgent: 'jest',
        requestId,
        metadata: {
          authorization: 'Bearer secret',
        },
      });

      await expect(
        service.listOperationLogs({ resource: `test.resource.${testRunId}` }),
      ).resolves.toMatchObject({
        total: 1,
        items: [
          expect.objectContaining({
            requestId,
            metadata: {
              authorization: '[REDACTED]',
            },
          }),
        ],
      });
      const page = await service.listOperationLogs({
        resource: `test.resource.${testRunId}`,
      });
      const recordedLog = page.items[0];

      await expect(service.getOperationLog(recordedLog.id)).resolves.toEqual(
        expect.objectContaining({
          id: recordedLog.id,
          requestId,
          metadata: {
            authorization: '[REDACTED]',
          },
        }),
      );
      await expect(service.deleteOperationLogs({ ids: [] })).rejects.toThrow(
        'Audit log ids must not be empty.',
      );
      await expect(
        service.deleteOperationLogs({
          ids: [recordedLog.id, recordedLog.id],
        }),
      ).rejects.toThrow(`Audit log id is duplicated: ${recordedLog.id}`);
      await expect(
        service.deleteOperationLogs({
          ids: [recordedLog.id, `missing_${testRunId}`],
        }),
      ).rejects.toThrow(`Audit log not found: missing_${testRunId}`);
      await expect(service.getOperationLog(recordedLog.id)).resolves.toEqual(
        expect.objectContaining({
          requestId,
        }),
      );
      await expect(
        service.deleteOperationLogs({ ids: [recordedLog.id] }),
      ).resolves.toEqual({
        deleted: true,
        affected: 1,
        ids: [recordedLog.id],
      });
      await expect(service.getOperationLog(recordedLog.id)).rejects.toThrow(
        `Audit log not found: ${recordedLog.id}`,
      );
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.auditLog.deleteMany({
        where: { requestId: { in: [requestId, seedRequestId] } },
      });
    }
  });
});

function createReflector(options: unknown): Reflector {
  return {
    getAllAndOverride: (metadataKey: string) =>
      metadataKey === AUDIT_OPERATION_KEY ? options : undefined,
  } as unknown as Reflector;
}

function createContext(request: unknown): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ statusCode: 200 }),
    }),
  } as ExecutionContext;
}

function readMetadata(key: string, target: object): unknown {
  return (
    Reflect as unknown as {
      getMetadata(metadataKey: string, metadataTarget: object): unknown;
    }
  ).getMetadata(key, target);
}
