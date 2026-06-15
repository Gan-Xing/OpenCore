import { PrismaService } from '@opencore/database';
import { MonitorHealthService } from './monitor.health.service';
import { MonitorRepository } from './monitor.repository';
import type { MonitorRuntimeDiagnostics } from './monitor.runtime-diagnostics.service';
import { MonitorRuntimeDiagnosticsService } from './monitor.runtime-diagnostics.service';
import { MonitorService } from './monitor.service';

describe('@opencore/monitor', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalAuthTokenSecret = process.env.AUTH_TOKEN_SECRET;
  const originalGitCommit = process.env.OPENCORE_GIT_COMMIT;
  const originalBuildTime = process.env.OPENCORE_BUILD_TIME;
  const originalAppVersion = process.env.OPENCORE_APP_VERSION;
  const originalDeploymentId = process.env.OPENCORE_DEPLOYMENT_ID;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    restoreEnv('DATABASE_URL', originalDatabaseUrl);
    restoreEnv('AUTH_TOKEN_SECRET', originalAuthTokenSecret);
    restoreEnv('OPENCORE_GIT_COMMIT', originalGitCommit);
    restoreEnv('OPENCORE_BUILD_TIME', originalBuildTime);
    restoreEnv('OPENCORE_APP_VERSION', originalAppVersion);
    restoreEnv('OPENCORE_DEPLOYMENT_ID', originalDeploymentId);
    restoreEnv('NODE_ENV', originalNodeEnv);
  });

  it('returns health probes through the monitor health service', () => {
    const health = new MonitorHealthService();

    expect(health.live()).toMatchObject({
      status: 'ok',
      service: 'opencore-api',
      checks: [{ name: 'process', status: 'ok', critical: true }],
    });
    expect(health.ready()).toMatchObject({
      status: 'ready',
      checks: expect.arrayContaining([
        expect.objectContaining({ name: 'config', status: 'ok' }),
      ]),
    });
  });

  it('returns status checks without leaking sensitive configuration', async () => {
    process.env.DATABASE_URL = 'postgresql://secret@example/opencore';
    process.env.AUTH_TOKEN_SECRET = 'secret-token-value';
    const service = new MonitorService(
      new MonitorRepository(createFakeDiagnostics()),
    );
    const payload = JSON.stringify(await service.getSystemStatus());

    expect(payload).toContain('database');
    await expect(service.getSystemStatus()).resolves.toMatchObject({
      runtime: {
        process: {
          pid: expect.any(Number),
          nodeVersion: expect.stringMatching(/^v/),
          platform: expect.any(String),
          arch: expect.any(String),
          uptimeSeconds: expect.any(Number),
          startedAt: expect.any(String),
        },
        cpu: {
          logicalCores: expect.any(Number),
          loadAverage1m: expect.any(Number),
          processUserMicros: expect.any(Number),
          processSystemMicros: expect.any(Number),
        },
        memory: {
          rssBytes: expect.any(Number),
          heapUsedBytes: expect.any(Number),
          systemTotalBytes: expect.any(Number),
          systemFreeBytes: expect.any(Number),
          systemUsedRatio: expect.any(Number),
        },
        disk: {
          path: expect.any(String),
          totalBytes: expect.any(Number),
          freeBytes: expect.any(Number),
          usedBytes: expect.any(Number),
          usedRatio: expect.any(Number),
        },
      },
    });
    expect(payload).not.toContain('secret');
    expect(payload).not.toContain('postgresql://');
  });

  it('degrades system status when a runtime dependency degrades', async () => {
    const service = new MonitorService(
      new MonitorRepository(
        createFakeDiagnostics({
          redisStatus: 'degraded',
        }),
      ),
    );

    await expect(service.getSystemStatus()).resolves.toMatchObject({
      status: 'degraded',
      dependencies: expect.arrayContaining([
        expect.objectContaining({
          name: 'redis',
          status: 'degraded',
          message: expect.not.stringContaining('redis://'),
        }),
      ]),
    });
  });

  it('returns managed queue status and controls allowed queues', async () => {
    const service = new MonitorService(
      new MonitorRepository(createFakeDiagnostics()),
    );

    await expect(service.listQueues()).resolves.toMatchObject({
      queues: expect.arrayContaining([
        expect.objectContaining({
          name: 'maintenance',
          driver: 'bullmq-redis-managed',
          controlMode: 'managed',
        }),
      ]),
    });
    await expect(service.pauseQueue('maintenance')).resolves.toMatchObject({
      name: 'maintenance',
      action: 'pause',
      appliedAt: expect.any(String),
      queue: {
        name: 'maintenance',
        paused: true,
        controlMode: 'managed',
      },
    });
    await expect(service.resumeQueue('maintenance')).resolves.toMatchObject({
      name: 'maintenance',
      action: 'resume',
      appliedAt: expect.any(String),
      queue: {
        name: 'maintenance',
        paused: false,
        controlMode: 'managed',
      },
    });
    await expectHttpExceptionCode(
      service.pauseQueue('unknown'),
      'MONITOR_QUEUE_UNSUPPORTED',
    );
  });

  it('returns safe version metadata', () => {
    process.env.OPENCORE_GIT_COMMIT = 'abc1234';
    process.env.OPENCORE_BUILD_TIME = '2026-06-14T00:00:00Z';
    process.env.OPENCORE_APP_VERSION = '1.2.3';
    process.env.OPENCORE_DEPLOYMENT_ID = 'abc1234-20260614T000000Z';
    process.env.NODE_ENV = 'production';
    const service = new MonitorService(
      new MonitorRepository(createFakeDiagnostics()),
    );
    const payload = JSON.stringify(service.getVersionInfo());

    expect(service.getVersionInfo()).toMatchObject({
      name: 'opencore-api',
      version: '1.2.3',
      commit: 'abc1234',
      buildTime: '2026-06-14T00:00:00Z',
      nodeVersion: expect.stringMatching(/^v/),
      runtime: 'node',
      environment: 'production',
      platform: expect.any(String),
      arch: expect.any(String),
      processId: expect.any(Number),
      uptimeSeconds: expect.any(Number),
      startedAt: expect.any(String),
      timezone: expect.any(String),
      deploymentId: 'abc1234-20260614T000000Z',
    });
    expect(payload).not.toContain('DATABASE_URL');
    expect(payload).not.toContain('AUTH_TOKEN_SECRET');
    expect(payload).not.toContain('postgresql://');
  });

  describe('MonitorRuntimeDiagnosticsService integration', () => {
    const prisma = new PrismaService();
    const diagnostics = new MonitorRuntimeDiagnosticsService(prisma);

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('checks PostgreSQL, Redis, BullMQ, and S3 without leaking runtime values', async () => {
      const database = await diagnostics.checkDatabase();
      const redis = await diagnostics.checkRedis();
      const queues = await diagnostics.listQueues();
      const s3 = await diagnostics.checkS3();
      const payload = JSON.stringify({ database, redis, queues, s3 });

      expect(database.status).toBe('ok');
      expect(redis.status).toBe('ok');
      expect(queues.status).toBe('ok');
      expect(s3.status).toBe('ok');
      expect(queues.queues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'maintenance',
            driver: 'bullmq-redis-managed',
            controlMode: 'managed',
          }),
        ]),
      );
      expect(payload).not.toContain('postgresql://');
      expect(payload).not.toContain('redis://');
      expect(payload).not.toContain('S3_SECRET_ACCESS_KEY');
    });
  });
});

function createFakeDiagnostics(
  options: { redisStatus?: 'degraded' | 'ok' } = {},
): MonitorRuntimeDiagnostics {
  return {
    checkDatabase: async () => ({
      name: 'database',
      status: 'ok',
      latencyMs: 1,
      message: 'PostgreSQL responded to a read-only health query.',
    }),
    checkRedis: async () => ({
      name: 'redis',
      status: options.redisStatus ?? 'ok',
      latencyMs: 1,
      message:
        options.redisStatus === 'degraded'
          ? 'redis health probe failed without exposing runtime details.'
          : 'Redis responded to PING with the OpenCore key prefix configured.',
    }),
    checkS3: async () => ({
      name: 's3',
      status: 'ok',
      latencyMs: 1,
      message:
        'S3 bucket is reachable and the OpenCore object prefix is listable.',
    }),
    listQueues: async () => ({
      status: 'ok',
      latencyMs: 1,
      message:
        'BullMQ queues were read from Redis using the OpenCore queue prefix.',
      queues: [
        {
          name: 'maintenance',
          driver: 'bullmq-redis-managed',
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          paused: false,
          controlMode: 'managed',
        },
        {
          name: 'reports',
          driver: 'bullmq-redis-managed',
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          paused: false,
          controlMode: 'managed',
        },
      ],
    }),
    pauseQueue: async (name) => ({
      name,
      driver: 'bullmq-redis-managed',
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      paused: true,
      controlMode: 'managed',
    }),
    resumeQueue: async (name) => ({
      name,
      driver: 'bullmq-redis-managed',
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      paused: false,
      controlMode: 'managed',
    }),
  };
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
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
