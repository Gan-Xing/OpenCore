import {
  OnlineUserService,
  SeedOnlineUserRepository,
} from '@opencore/online-user';
import { SchedulerService, SeedSchedulerRepository } from '@opencore/scheduler';
import { PrismaOperationsRepository } from './prisma-operations.repository';
import { SeedOperationsRepository } from './seed-operations.repository';

describe('OperationsRepository', () => {
  it('builds a bounded operations center summary', async () => {
    const repository = new SeedOperationsRepository();
    const scheduler = await createSeedSchedulerSummary();
    const onlineUsers = await createSeedOnlineUserSummary();

    expect(await repository.getSummary(scheduler, onlineUsers)).toMatchObject({
      jobs: { total: 2, enabled: 2, disabled: 0 },
      jobRuns: { total: 1, completed: 1, failed: 0 },
      cache: { keyCount: 2, totalSizeBytes: 4608 },
      onlineUsers: {
        total: 2,
        active: 2,
        activeUsers: 2,
        revoked: 0,
        expired: 0,
        cleanupEligible: 0,
      },
      reports: { total: 1, enabled: 1, disabled: 0 },
      exportJobStatus: 'design-only',
    });
  });

  it('filters operations lists by bounded query fields', async () => {
    const repository = new SeedOperationsRepository();

    await expect(
      repository.listCacheKeys({ prefix: 'opencore:admin' }),
    ).resolves.toMatchObject({
      total: 1,
      scanComplete: true,
      items: [
        expect.objectContaining({
          key: 'opencore:admin:shell',
          name: 'opencore:admin',
          type: 'string',
        }),
      ],
    });
    await expect(repository.listCacheNames()).resolves.toMatchObject({
      total: 2,
      items: expect.arrayContaining([
        expect.objectContaining({
          name: 'opencore:admin',
          keyCount: 1,
          sampleKey: 'opencore:admin:shell',
        }),
      ]),
    });
    await expect(
      repository.getCacheValue('opencore:admin:shell'),
    ).resolves.toMatchObject({
      key: 'opencore:admin:shell',
      valuePreview: expect.stringContaining('fixture'),
      sensitive: false,
      truncated: false,
    });
    await expect(
      repository.listReports({ enabled: true, owner: 'admin' }),
    ).resolves.toMatchObject({ total: 1 });
  });

  it('supports read-only cache listing and confirmed prefix clear policy', async () => {
    const repository = new SeedOperationsRepository();

    await expect(
      repository.clearCache({ prefix: 'opencore:admin', dryRun: true }),
    ).resolves.toMatchObject({
      dryRun: true,
      matchedKeys: 1,
      clearedKeys: 0,
    });
    await expectHttpExceptionCode(
      repository.clearCache({ prefix: 'opencore:admin', dryRun: false }),
      'MONITOR_OPERATIONS_CACHE_CLEAR_CONFIRMATION_REQUIRED',
    );
    await expectHttpExceptionCode(
      repository.clearCache({ prefix: 'opencore:*', dryRun: true }),
      'MONITOR_OPERATIONS_CACHE_CLEAR_PREFIX_WILDCARD_INVALID',
    );
    await expect(
      repository.clearCache({
        prefix: 'opencore:admin',
        dryRun: false,
        confirmed: true,
      }),
    ).resolves.toMatchObject({
      dryRun: false,
      clearedKeys: 1,
    });
    await expect(
      repository.deleteCacheKey({
        key: 'opencore:openapi:snapshot',
        dryRun: true,
      }),
    ).resolves.toMatchObject({
      existed: true,
      deleted: false,
    });
    await expectHttpExceptionCode(
      repository.deleteCacheKey({
        key: 'opencore:openapi:snapshot',
        dryRun: false,
      }),
      'MONITOR_OPERATIONS_CACHE_KEY_DELETE_CONFIRMATION_REQUIRED',
    );
    await expect(
      repository.deleteCacheKey({
        key: 'opencore:openapi:snapshot',
        dryRun: false,
        confirmed: true,
      }),
    ).resolves.toMatchObject({
      existed: true,
      deleted: true,
    });
    await expectHttpExceptionCode(
      repository.getCacheValue('missing:cache:key'),
      'MONITOR_OPERATIONS_RESOURCE_NOT_FOUND',
    );
  });

  it('creates report definitions and exposes async export job design', async () => {
    const repository = new SeedOperationsRepository();

    await expect(
      repository.createReport({
        code: 'jobs.summary',
        name: 'Jobs Summary',
        querySchema: { source: 'monitor.job' },
        owner: 'admin',
      }),
    ).resolves.toMatchObject({
      code: 'jobs.summary',
      querySchema: { source: 'monitor.job' },
    });
    await expect(repository.getReport('jobs.summary')).resolves.toMatchObject({
      code: 'jobs.summary',
      owner: 'admin',
    });
    expect(repository.getExportJobDesign()).toMatchObject({
      status: 'design-only',
      requiredBindings: expect.arrayContaining(['file asset id']),
    });
  });

  it('uses Redis for cache listing, safe value preview and confirmed deletion', async () => {
    const redis = createRedisMock({
      'opencore:admin:shell': 'shell-cache',
      'opencore:system:config': JSON.stringify({
        theme: 'dark',
        password: 'must-not-leak',
      }),
      'opencore:secret:token': 'must-not-leak',
    });
    const repository = new PrismaOperationsRepository(
      createPrismaMock(),
      redis,
    );

    await expect(
      repository.listCacheKeys({ prefix: 'opencore:system' }),
    ).resolves.toMatchObject({
      total: 1,
      scanComplete: true,
      items: [
        expect.objectContaining({
          key: 'opencore:system:config',
          name: 'opencore:system',
          type: 'string',
        }),
      ],
    });
    await expect(repository.listCacheNames()).resolves.toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({ name: 'opencore:admin', keyCount: 1 }),
        expect.objectContaining({ name: 'opencore:system', keyCount: 1 }),
      ]),
    });

    const safeValue = await repository.getCacheValue('opencore:system:config');
    expect(safeValue.valuePreview).toContain('"theme":"dark"');
    expect(safeValue.valuePreview).toContain('"password":"[redacted]"');
    expect(safeValue.valuePreview).not.toContain('must-not-leak');
    await expect(
      repository.getCacheValue('opencore:secret:token'),
    ).resolves.toMatchObject({
      sensitive: true,
      valuePreview: '[redacted sensitive cache value]',
    });
    await expectHttpExceptionCode(
      repository.getCacheValue('opencore:missing:key'),
      'MONITOR_OPERATIONS_CACHE_KEY_NOT_FOUND',
    );
    await expect(
      repository.clearCache({
        prefix: 'opencore:admin',
        dryRun: false,
        confirmed: true,
      }),
    ).resolves.toMatchObject({
      matchedKeys: 1,
      clearedKeys: 1,
    });
    await expect(
      repository.deleteCacheKey({
        key: 'opencore:system:config',
        dryRun: false,
        confirmed: true,
      }),
    ).resolves.toMatchObject({
      existed: true,
      deleted: true,
    });
  });
});

async function createSeedSchedulerSummary() {
  return new SchedulerService(new SeedSchedulerRepository()).getSummary();
}

async function createSeedOnlineUserSummary() {
  return new OnlineUserService(new SeedOnlineUserRepository()).getSummary();
}

function createPrismaMock() {
  return {
    reportDefinition: {
      findMany: async () => [],
      findUnique: async () => undefined,
      create: async (input: {
        data: {
          code: string;
          name: string;
          description?: string;
          querySchema: Record<string, unknown>;
          enabled: boolean;
          owner: string;
        };
      }) => ({
        id: `report_${input.data.code}`,
        ...input.data,
      }),
    },
  } as never;
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

function createRedisMock(values: Record<string, string>) {
  const entries = new Map(Object.entries(values));

  return {
    scan: async (_cursor: string, options: { match?: string } = {}) => {
      const prefix = options.match?.endsWith('*')
        ? options.match.slice(0, -1)
        : undefined;
      const keys = [...entries.keys()].filter((key) =>
        prefix ? key.startsWith(prefix) : true,
      );

      return ['0', keys] as [string, string[]];
    },
    ttl: async (key: string) => (entries.has(key) ? 300 : -2),
    type: async (key: string) => (entries.has(key) ? 'string' : 'none'),
    memoryUsage: async (key: string) =>
      entries.has(key)
        ? Buffer.byteLength(entries.get(key) ?? '', 'utf8')
        : null,
    get: async (key: string) => entries.get(key) ?? null,
    delete: async (...keys: readonly string[]) => {
      let deleted = 0;

      for (const key of keys) {
        if (entries.delete(key)) {
          deleted += 1;
        }
      }

      return deleted;
    },
  } as never;
}
