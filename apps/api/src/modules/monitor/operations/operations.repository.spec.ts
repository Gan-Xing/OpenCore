import {
  OnlineUserService,
  SeedOnlineUserRepository,
} from '@opencore/online-user';
import { runWithRequestContext } from '@opencore/core';
import { SchedulerService, SeedSchedulerRepository } from '@opencore/scheduler';
import { PrismaOperationsRepository } from './prisma-operations.repository';
import { SeedOperationsRepository } from './seed-operations.repository';

const ROOT_TENANT_ID = 'tenant_root';
const FOREIGN_TENANT_ID = 'tenant_foreign';

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
      repository.listCacheKeys({
        prefix: 'opencore:tenant:tenant_root:admin',
      }),
    ).resolves.toMatchObject({
      total: 1,
      scanComplete: true,
      items: [
        expect.objectContaining({
          tenantId: ROOT_TENANT_ID,
          key: 'opencore:tenant:tenant_root:admin:shell',
          name: 'admin',
          type: 'string',
        }),
      ],
    });
    await expect(repository.listCacheNames()).resolves.toMatchObject({
      total: 2,
      items: expect.arrayContaining([
        expect.objectContaining({
          tenantId: ROOT_TENANT_ID,
          name: 'admin',
          keyCount: 1,
          sampleKey: 'opencore:tenant:tenant_root:admin:shell',
        }),
      ]),
    });
    await expect(
      repository.getCacheValue('opencore:tenant:tenant_root:admin:shell'),
    ).resolves.toMatchObject({
      tenantId: ROOT_TENANT_ID,
      key: 'opencore:tenant:tenant_root:admin:shell',
      valuePreview: expect.stringContaining('fixture'),
      sensitive: false,
      truncated: false,
    });
    await expect(
      runAsTenant(ROOT_TENANT_ID, () =>
        repository.listCacheKeys({
          prefix: 'opencore:tenant:tenant_foreign:admin',
        }),
      ),
    ).resolves.toMatchObject({
      total: 0,
      scanComplete: true,
    });
    await expectHttpExceptionCode(
      runAsTenant(ROOT_TENANT_ID, () =>
        repository.getCacheValue('opencore:tenant:tenant_foreign:admin:shell'),
      ),
      'MONITOR_OPERATIONS_RESOURCE_NOT_FOUND',
    );
    await expect(
      runAsTenant(FOREIGN_TENANT_ID, () =>
        repository.getCacheValue('opencore:admin:shell'),
      ),
    ).resolves.toMatchObject({
      tenantId: FOREIGN_TENANT_ID,
      key: 'opencore:tenant:tenant_foreign:admin:shell',
      valuePreview: expect.stringContaining('fixture'),
    });
    await expect(
      repository.listReports({ enabled: true, owner: 'admin' }),
    ).resolves.toMatchObject({ total: 1 });
  });

  it('supports read-only cache listing and confirmed prefix clear policy', async () => {
    const repository = new SeedOperationsRepository();

    await expect(
      repository.clearCache({
        prefix: 'opencore:tenant:tenant_root:admin',
        dryRun: true,
      }),
    ).resolves.toMatchObject({
      dryRun: true,
      matchedKeys: 1,
      clearedKeys: 0,
    });
    await expectHttpExceptionCode(
      repository.clearCache({
        prefix: 'opencore:tenant:tenant_root:admin',
        dryRun: false,
      }),
      'MONITOR_OPERATIONS_CACHE_CLEAR_CONFIRMATION_REQUIRED',
    );
    await expectHttpExceptionCode(
      repository.clearCache({ prefix: 'opencore:*', dryRun: true }),
      'MONITOR_OPERATIONS_CACHE_CLEAR_PREFIX_WILDCARD_INVALID',
    );
    await expect(
      repository.clearCache({
        prefix: 'opencore:tenant:tenant_root:admin',
        dryRun: false,
        confirmed: true,
      }),
    ).resolves.toMatchObject({
      dryRun: false,
      clearedKeys: 1,
    });
    await expect(
      repository.deleteCacheKey({
        key: 'opencore:tenant:tenant_root:openapi:snapshot',
        dryRun: true,
      }),
    ).resolves.toMatchObject({
      existed: true,
      deleted: false,
    });
    await expectHttpExceptionCode(
      repository.deleteCacheKey({
        key: 'opencore:tenant:tenant_root:openapi:snapshot',
        dryRun: false,
      }),
      'MONITOR_OPERATIONS_CACHE_KEY_DELETE_CONFIRMATION_REQUIRED',
    );
    await expect(
      repository.deleteCacheKey({
        key: 'opencore:tenant:tenant_root:openapi:snapshot',
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

  it('scopes report definitions by the active tenant context', async () => {
    const repository = new PrismaOperationsRepository(
      createPrismaMock([
        {
          id: 'report_root_runtime',
          tenantId: ROOT_TENANT_ID,
          code: 'runtime.health',
          name: 'Runtime Health',
          description: null,
          querySchema: { source: 'monitor.status' },
          enabled: true,
          owner: 'admin',
        },
        {
          id: 'report_foreign_runtime',
          tenantId: FOREIGN_TENANT_ID,
          code: 'runtime.health',
          name: 'Foreign Runtime Health',
          description: null,
          querySchema: { source: 'foreign.status' },
          enabled: true,
          owner: 'foreign-admin',
        },
        {
          id: 'report_foreign_only',
          tenantId: FOREIGN_TENANT_ID,
          code: 'foreign.only',
          name: 'Foreign Only',
          description: null,
          querySchema: { source: 'foreign.only' },
          enabled: true,
          owner: 'foreign-admin',
        },
      ]),
      createRedisMock({}),
    );

    await expect(
      runAsTenant(ROOT_TENANT_ID, () => repository.listReports()),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        expect.objectContaining({
          tenantId: ROOT_TENANT_ID,
          code: 'runtime.health',
          owner: 'admin',
        }),
      ],
    });
    await expect(
      runAsTenant(ROOT_TENANT_ID, () =>
        repository.listReports({ owner: 'foreign-admin' }),
      ),
    ).resolves.toMatchObject({ total: 0 });
    await expectHttpExceptionCode(
      runAsTenant(ROOT_TENANT_ID, () => repository.getReport('foreign.only')),
      'MONITOR_OPERATIONS_RESOURCE_NOT_FOUND',
    );
    await expect(
      runAsTenant(FOREIGN_TENANT_ID, () =>
        repository.getReport('runtime.health'),
      ),
    ).resolves.toMatchObject({
      tenantId: FOREIGN_TENANT_ID,
      name: 'Foreign Runtime Health',
    });
    await expect(
      runAsTenant(ROOT_TENANT_ID, () =>
        repository.createReport({
          code: 'root.created',
          name: 'Root Created',
          querySchema: { source: 'root.created' },
          owner: 'admin',
        }),
      ),
    ).resolves.toMatchObject({
      tenantId: ROOT_TENANT_ID,
      code: 'root.created',
    });
  });

  it('uses Redis for cache listing, safe value preview and confirmed deletion', async () => {
    const rootSystemKey = 'opencore:tenant:tenant_root:system:config';
    const foreignSystemKey = 'opencore:tenant:tenant_foreign:system:config';
    const redis = createRedisMock({
      'opencore:tenant:tenant_root:admin:shell': 'shell-cache',
      [rootSystemKey]: JSON.stringify({
        theme: 'dark',
        password: 'must-not-leak',
      }),
      'opencore:tenant:tenant_root:secret:token': 'must-not-leak',
      [foreignSystemKey]: JSON.stringify({ theme: 'foreign' }),
    });
    const repository = new PrismaOperationsRepository(
      createPrismaMock(),
      redis,
    );

    await expect(
      runAsTenant(ROOT_TENANT_ID, () =>
        repository.listCacheKeys({ prefix: 'opencore:system' }),
      ),
    ).resolves.toMatchObject({
      total: 1,
      scanComplete: true,
      items: [
        expect.objectContaining({
          tenantId: ROOT_TENANT_ID,
          key: rootSystemKey,
          name: 'system',
          type: 'string',
        }),
      ],
    });
    await expect(
      runAsTenant(ROOT_TENANT_ID, () => repository.listCacheNames()),
    ).resolves.toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          tenantId: ROOT_TENANT_ID,
          name: 'admin',
          keyCount: 1,
        }),
        expect.objectContaining({
          tenantId: ROOT_TENANT_ID,
          name: 'system',
          keyCount: 1,
        }),
      ]),
    });

    const safeValue = await runAsTenant(ROOT_TENANT_ID, () =>
      repository.getCacheValue('opencore:system:config'),
    );
    expect(safeValue.tenantId).toBe(ROOT_TENANT_ID);
    expect(safeValue.valuePreview).toContain('"theme":"dark"');
    expect(safeValue.valuePreview).toContain('"password":"[redacted]"');
    expect(safeValue.valuePreview).not.toContain('must-not-leak');
    await expect(
      runAsTenant(ROOT_TENANT_ID, () =>
        repository.getCacheValue('opencore:secret:token'),
      ),
    ).resolves.toMatchObject({
      sensitive: true,
      valuePreview: '[redacted sensitive cache value]',
    });
    await expectHttpExceptionCode(
      runAsTenant(ROOT_TENANT_ID, () =>
        repository.getCacheValue('opencore:missing:key'),
      ),
      'MONITOR_OPERATIONS_CACHE_KEY_NOT_FOUND',
    );
    await expect(
      runAsTenant(ROOT_TENANT_ID, () =>
        repository.clearCache({
          prefix: 'opencore:admin',
          dryRun: false,
          confirmed: true,
        }),
      ),
    ).resolves.toMatchObject({
      matchedKeys: 1,
      clearedKeys: 1,
    });
    await expect(
      runAsTenant(ROOT_TENANT_ID, () =>
        repository.clearCache({
          prefix: 'opencore:tenant:tenant_foreign:system',
          dryRun: false,
          confirmed: true,
        }),
      ),
    ).resolves.toMatchObject({
      matchedKeys: 0,
      clearedKeys: 0,
    });
    await expectHttpExceptionCode(
      runAsTenant(ROOT_TENANT_ID, () =>
        repository.getCacheValue(foreignSystemKey),
      ),
      'MONITOR_OPERATIONS_CACHE_KEY_NOT_FOUND',
    );
    await expect(
      runAsTenant(ROOT_TENANT_ID, () =>
        repository.deleteCacheKey({
          key: foreignSystemKey,
          dryRun: false,
          confirmed: true,
        }),
      ),
    ).resolves.toMatchObject({
      existed: false,
      deleted: false,
    });
    await expect(
      runAsTenant(FOREIGN_TENANT_ID, () =>
        repository.getCacheValue(foreignSystemKey),
      ),
    ).resolves.toMatchObject({
      tenantId: FOREIGN_TENANT_ID,
      key: foreignSystemKey,
    });
    await expect(
      runAsTenant(ROOT_TENANT_ID, () =>
        repository.deleteCacheKey({
          key: 'opencore:system:config',
          dryRun: false,
          confirmed: true,
        }),
      ),
    ).resolves.toMatchObject({
      existed: true,
      deleted: true,
    });
  });
});

async function createSeedSchedulerSummary() {
  return new SchedulerService(new SeedSchedulerRepository()).getSummary();
}

function runAsTenant<T>(tenantId: string, callback: () => T): T {
  return runWithRequestContext(
    {
      requestId: `test:${tenantId}`,
      traceId: `test:${tenantId}`,
      tenantId,
      membershipId: `membership:${tenantId}`,
      accessMode: 'tenant',
    },
    callback,
  );
}

async function createSeedOnlineUserSummary() {
  return new OnlineUserService(new SeedOnlineUserRepository()).getSummary();
}

type ReportDefinitionMockRow = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  querySchema: Record<string, unknown>;
  enabled: boolean;
  owner: string;
};

function createPrismaMock(reportRows: ReportDefinitionMockRow[] = []) {
  const reports = [...reportRows];

  return {
    reportDefinition: {
      findMany: async (input?: {
        where?: { tenantId?: string; enabled?: boolean; owner?: string };
      }) =>
        reports.filter(
          (report) =>
            report.tenantId === input?.where?.tenantId &&
            (input?.where?.enabled === undefined ||
              report.enabled === input.where.enabled) &&
            (input?.where?.owner === undefined ||
              report.owner === input.where.owner),
        ),
      findFirst: async (input?: {
        where?: { tenantId?: string; code?: string };
      }) =>
        reports.find(
          (report) =>
            report.tenantId === input?.where?.tenantId &&
            report.code === input?.where?.code,
        ),
      create: async (input: {
        data: {
          tenant: { connect: { id: string } };
          code: string;
          name: string;
          description?: string;
          querySchema: Record<string, unknown>;
          enabled: boolean;
          owner: string;
        };
      }) => ({
        id: `report_${input.data.code}`,
        tenantId: input.data.tenant.connect.id,
        code: input.data.code,
        name: input.data.name,
        description: input.data.description ?? null,
        querySchema: input.data.querySchema,
        enabled: input.data.enabled,
        owner: input.data.owner,
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
    key: (...parts: readonly string[]) =>
      parts.length > 0 ? `opencore:${parts.join(':')}` : 'opencore:',
    tenantKey: (tenantId: string, ...parts: readonly string[]) =>
      ['opencore', 'tenant', tenantId, ...parts].join(':'),
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
