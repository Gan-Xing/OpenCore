import { MonitoringRepository } from './monitoring.repository';
import type { RuntimeDiagnostics } from './runtime-diagnostics.service';

describe('MonitoringRepository', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalAuthTokenSecret = process.env.AUTH_TOKEN_SECRET;

  afterEach(() => {
    restoreEnv('DATABASE_URL', originalDatabaseUrl);
    restoreEnv('AUTH_TOKEN_SECRET', originalAuthTokenSecret);
  });

  it('returns status checks without leaking sensitive configuration', async () => {
    process.env.DATABASE_URL = 'postgresql://secret@example/opencore';
    process.env.AUTH_TOKEN_SECRET = 'secret-token-value';
    const repository = new MonitoringRepository(createFakeDiagnostics());
    const payload = JSON.stringify(await repository.getSystemStatus());

    expect(payload).toContain('database');
    expect(payload).not.toContain('secret');
    expect(payload).not.toContain('postgresql://');
  });

  it('degrades system status when a runtime dependency degrades', async () => {
    const repository = new MonitoringRepository(
      createFakeDiagnostics({
        redisStatus: 'degraded',
      }),
    );

    await expect(repository.getSystemStatus()).resolves.toMatchObject({
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
    const repository = new MonitoringRepository(createFakeDiagnostics());

    await expect(repository.listQueues()).resolves.toMatchObject({
      queues: expect.arrayContaining([
        expect.objectContaining({
          name: 'maintenance',
          driver: 'bullmq-redis-readonly',
          readOnly: true,
        }),
      ]),
    });
  });

  it('returns safe version metadata', () => {
    const repository = new MonitoringRepository(createFakeDiagnostics());

    expect(repository.getVersionInfo()).toMatchObject({
      name: 'opencore-api',
      version: expect.any(String),
      nodeVersion: expect.stringMatching(/^v/),
    });
  });
});

function createFakeDiagnostics(
  options: { redisStatus?: 'degraded' | 'ok' } = {},
): RuntimeDiagnostics {
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
          driver: 'bullmq-redis-readonly',
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          paused: false,
          readOnly: true,
        },
        {
          name: 'reports',
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
