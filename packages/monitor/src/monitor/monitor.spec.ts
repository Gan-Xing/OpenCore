import { PrismaService } from '@opencore/database';
import { MonitorHealthService } from './monitor.health.service';
import { MonitorRepository } from './monitor.repository';
import type { MonitorRuntimeDiagnostics } from './monitor.runtime-diagnostics.service';
import { MonitorRuntimeDiagnosticsService } from './monitor.runtime-diagnostics.service';
import { MonitorService } from './monitor.service';

describe('@opencore/monitor', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalAuthTokenSecret = process.env.AUTH_TOKEN_SECRET;

  afterEach(() => {
    restoreEnv('DATABASE_URL', originalDatabaseUrl);
    restoreEnv('AUTH_TOKEN_SECRET', originalAuthTokenSecret);
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

  it('returns read-only queue status without scheduler controls', async () => {
    const service = new MonitorService(
      new MonitorRepository(createFakeDiagnostics()),
    );

    await expect(service.listQueues()).resolves.toMatchObject({
      queues: expect.arrayContaining([
        expect.objectContaining({
          name: 'table-export',
          driver: 'bullmq-redis-readonly',
          readOnly: true,
        }),
      ]),
    });
  });

  it('returns safe version metadata', () => {
    const service = new MonitorService(
      new MonitorRepository(createFakeDiagnostics()),
    );

    expect(service.getVersionInfo()).toMatchObject({
      name: 'opencore-api',
      version: expect.any(String),
      nodeVersion: expect.stringMatching(/^v/),
    });
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
            name: 'table-export',
            driver: 'bullmq-redis-readonly',
            readOnly: true,
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
          name: 'system-audit',
          driver: 'bullmq-redis-readonly',
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          paused: false,
          readOnly: true,
        },
        {
          name: 'table-export',
          driver: 'bullmq-redis-readonly',
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          paused: false,
          readOnly: true,
        },
      ],
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
