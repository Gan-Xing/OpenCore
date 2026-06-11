import { BadRequestException } from '@nestjs/common';
import { SeedOperationsRepository } from './seed-operations.repository';

describe('OperationsRepository', () => {
  it('builds a bounded operations center summary', async () => {
    const repository = new SeedOperationsRepository();

    expect(await repository.getSummary()).toMatchObject({
      jobs: { total: 1, enabled: 1, disabled: 0 },
      jobRuns: { total: 1, completed: 1, failed: 0 },
      cache: { keyCount: 2, totalSizeBytes: 4608 },
      onlineUsers: { total: 1, active: 1, revoked: 0 },
      reports: { total: 1, enabled: 1, disabled: 0 },
      exportJobStatus: 'design-only',
    });
  });

  it('filters operations lists by bounded query fields', async () => {
    const repository = new SeedOperationsRepository();

    await expect(
      repository.listJobs({ enabled: true, queueName: 'maintenance' }),
    ).resolves.toMatchObject({ total: 1 });
    await expect(
      repository.listJobRuns('openapi.drift-check', { status: 'completed' }),
    ).resolves.toMatchObject({ total: 1 });
    await expect(
      repository.listCacheKeys({ prefix: 'opencore:admin' }),
    ).resolves.toMatchObject({ total: 1 });
    await expect(
      repository.listOnlineUsers({ active: true }),
    ).resolves.toMatchObject({ total: 1 });
    await expect(
      repository.listReports({ enabled: true, owner: 'admin' }),
    ).resolves.toMatchObject({ total: 1 });
  });

  it('manages job definitions and manual BullMQ-style run logs', async () => {
    const repository = new SeedOperationsRepository();
    const job = await repository.createJob({
      code: 'report.refresh',
      name: 'Refresh reports',
      queueName: 'reports',
      retryLimit: 3,
      timeoutSeconds: 90,
    });

    await expect(repository.disableJob(job.code)).resolves.toMatchObject({
      enabled: false,
    });
    await expect(repository.getJob(job.code)).resolves.toMatchObject({
      code: job.code,
      enabled: false,
    });
    await expect(
      repository.triggerJob(job.code, { actor: 'admin' }),
    ).rejects.toThrow(BadRequestException);
    await expect(repository.enableJob(job.code)).resolves.toMatchObject({
      enabled: true,
    });
    await expect(
      repository.triggerJob(job.code, { actor: 'admin' }),
    ).resolves.toMatchObject({
      jobCode: job.code,
      status: 'completed',
      trigger: 'manual',
      metadata: expect.objectContaining({ adapter: 'bullmq' }),
    });
    await expect(repository.listJobRuns(job.code)).resolves.toMatchObject({
      total: 1,
    });
    const run = (await repository.listJobRuns(job.code)).items[0];
    await expect(repository.getJobRun(job.code, run.id)).resolves.toMatchObject(
      {
        id: run.id,
        jobCode: job.code,
      },
    );
  });

  it('enforces bounded job retry and timeout policies', async () => {
    const repository = new SeedOperationsRepository();

    await expect(
      repository.createJob({
        code: 'unsafe.job',
        name: 'Unsafe Job',
        queueName: 'unsafe',
        retryLimit: 99,
        timeoutSeconds: 60,
      }),
    ).rejects.toThrow(BadRequestException);
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
    await expect(
      repository.clearCache({ prefix: 'opencore:admin', dryRun: false }),
    ).rejects.toThrow(BadRequestException);
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
  });

  it('lists online users and supports audited kick-out state', async () => {
    const repository = new SeedOperationsRepository();
    const session = (await repository.listOnlineUsers()).items[0];

    await expect(
      repository.kickOutSession(session.id, {
        actor: 'admin',
        reason: 'manual test',
      }),
    ).resolves.toMatchObject({
      id: session.id,
      revokedAt: expect.any(String),
      revokedBy: 'admin',
      revokedReason: 'manual test',
    });
    await expect(repository.getOnlineUser(session.id)).resolves.toMatchObject({
      id: session.id,
      revokedAt: expect.any(String),
    });
    await expect(
      repository.kickOutSession(session.id, {
        actor: 'admin',
        reason: 'repeat',
      }),
    ).rejects.toThrow(BadRequestException);
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
});
