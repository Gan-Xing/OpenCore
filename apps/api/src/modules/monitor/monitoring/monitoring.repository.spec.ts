import { MonitoringRepository } from './monitoring.repository';
import type { RuntimeDiagnostics } from './runtime-diagnostics.service';

describe('MonitoringRepository', () => {
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

  it('returns status checks without leaking sensitive configuration', async () => {
    process.env.DATABASE_URL = 'postgresql://secret@example/opencore';
    process.env.AUTH_TOKEN_SECRET = 'secret-token-value';
    const repository = new MonitoringRepository(createFakeDiagnostics());
    const payload = JSON.stringify(await repository.getSystemStatus());

    expect(payload).toContain('database');
    await expect(repository.getSystemStatus()).resolves.toMatchObject({
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

  it('returns managed queue status and controls allowed queues', async () => {
    const repository = new MonitoringRepository(createFakeDiagnostics());

    await expect(repository.listQueues()).resolves.toMatchObject({
      queues: expect.arrayContaining([
        expect.objectContaining({
          name: 'maintenance',
          tenantId: 'tenant_root',
          runtimeName: 'tenant:tenant_root:maintenance',
          driver: 'bullmq-redis-managed',
          controlMode: 'managed',
        }),
      ]),
    });
    await expect(repository.pauseQueue('maintenance')).resolves.toMatchObject({
      name: 'maintenance',
      tenantId: 'tenant_root',
      runtimeName: 'tenant:tenant_root:maintenance',
      action: 'pause',
      queue: {
        name: 'maintenance',
        tenantId: 'tenant_root',
        runtimeName: 'tenant:tenant_root:maintenance',
        paused: true,
        controlMode: 'managed',
      },
    });
    await expect(repository.resumeQueue('maintenance')).resolves.toMatchObject({
      name: 'maintenance',
      tenantId: 'tenant_root',
      runtimeName: 'tenant:tenant_root:maintenance',
      action: 'resume',
      queue: {
        name: 'maintenance',
        tenantId: 'tenant_root',
        runtimeName: 'tenant:tenant_root:maintenance',
        paused: false,
        controlMode: 'managed',
      },
    });
    await expect(repository.pauseQueue('unknown')).rejects.toMatchObject({
      status: 400,
    });
  });

  it('returns safe version metadata', () => {
    process.env.OPENCORE_GIT_COMMIT = 'abc1234';
    process.env.OPENCORE_BUILD_TIME = '2026-06-14T00:00:00Z';
    process.env.OPENCORE_APP_VERSION = '1.2.3';
    process.env.OPENCORE_DEPLOYMENT_ID = 'abc1234-20260614T000000Z';
    process.env.NODE_ENV = 'production';
    const repository = new MonitoringRepository(createFakeDiagnostics());
    const payload = JSON.stringify(repository.getVersionInfo());

    expect(repository.getVersionInfo()).toMatchObject({
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
    listQueues: async (tenantId) => ({
      status: 'ok',
      latencyMs: 1,
      message:
        'Tenant BullMQ queues were read from Redis using the OpenCore queue prefix.',
      queues: [
        {
          name: 'maintenance',
          tenantId,
          runtimeName: `tenant:${tenantId}:maintenance`,
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
          tenantId,
          runtimeName: `tenant:${tenantId}:reports`,
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
    pauseQueue: async (tenantId, name) => ({
      name,
      tenantId,
      runtimeName: `tenant:${tenantId}:${name}`,
      driver: 'bullmq-redis-managed',
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      paused: true,
      controlMode: 'managed',
    }),
    resumeQueue: async (tenantId, name) => ({
      name,
      tenantId,
      runtimeName: `tenant:${tenantId}:${name}`,
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
