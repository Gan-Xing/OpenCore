import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
import { PrismaSchedulerRepository } from './scheduler.prisma-repository';
import { SeedSchedulerRepository } from './scheduler.seed-repository';
import { SchedulerService } from './scheduler.service';

describe('@opencore/scheduler', () => {
  it('lists, filters, manages and triggers whitelisted seed jobs', async () => {
    const repository = new SeedSchedulerRepository();
    const service = new SchedulerService(repository);

    await expect(
      service.listJobs({ enabled: true, queueName: 'maintenance' }),
    ).resolves.toMatchObject({
      total: 2,
      items: expect.arrayContaining([
        expect.objectContaining({ code: 'openapi.drift-check' }),
        expect.objectContaining({ code: 'audit-log.retention-clean' }),
      ]),
    });
    await expect(
      service.listJobRuns('openapi.drift-check', { status: 'completed' }),
    ).resolves.toMatchObject({ total: 1 });
    await expect(service.getSummary()).resolves.toMatchObject({
      jobs: { total: 2, enabled: 2, disabled: 0 },
      jobRuns: { total: 1, completed: 1 },
    });
    expect(service.listRegistryEntries()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'audit-log.retention-clean',
          handlerKey: 'maintenance.auditLogRetention',
        }),
        expect.objectContaining({
          code: 'report.refresh',
          handlerKey: 'reports.refresh',
        }),
      ]),
    );

    await expect(
      service.triggerJob('audit-log.retention-clean', {
        actor: 'admin',
        metadata: { reason: 'seed retention dry-run' },
      }),
    ).resolves.toMatchObject({
      jobCode: 'audit-log.retention-clean',
      status: 'completed',
      metadata: expect.objectContaining({
        handlerKey: 'maintenance.auditLogRetention',
        result: expect.objectContaining({
          dryRun: true,
          retentionDays: 90,
        }),
      }),
    });

    await expect(
      service.createJob({
        code: 'unknown.job',
        name: 'Unknown',
        queueName: 'maintenance',
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.createJob({
        code: 'report.refresh',
        name: 'Refresh reports',
        queueName: 'wrong',
      }),
    ).rejects.toThrow(BadRequestException);

    const job = await service.createJob({
      code: 'report.refresh',
      name: 'Refresh reports',
      queueName: 'reports',
      retryLimit: 3,
      timeoutSeconds: 90,
    });
    await expect(service.disableJob(job.code)).resolves.toMatchObject({
      enabled: false,
    });
    await expect(
      service.triggerJob(job.code, { actor: 'admin' }),
    ).rejects.toThrow(BadRequestException);
    await expect(service.enableJob(job.code)).resolves.toMatchObject({
      enabled: true,
    });
    const run = await service.triggerJob(job.code, {
      actor: 'admin',
      metadata: { reason: 'manual smoke' },
    });
    expect(run).toMatchObject({
      jobCode: job.code,
      status: 'completed',
      trigger: 'manual',
      attempts: 1,
      metadata: expect.objectContaining({
        adapter: 'bullmq',
        executionMode: 'in-process',
        handlerKey: 'reports.refresh',
        result: expect.objectContaining({ refreshed: true }),
      }),
    });
    expect(run.durationMs).toEqual(expect.any(Number));
    await expect(service.getJobRun(job.code, run.id)).resolves.toMatchObject({
      id: run.id,
      jobCode: job.code,
    });
    const seedCleanResult = await service.cleanJobRuns(job.code, {
      retentionDays: 0,
      status: 'completed',
    });
    expect(seedCleanResult).toMatchObject({
      deleted: true,
      jobCode: job.code,
      statuses: ['completed'],
    });
    expect(seedCleanResult.affected).toBeGreaterThanOrEqual(1);
    await expect(service.getJobRun(job.code, run.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('records failed handler execution after bounded retries', async () => {
    const service = new SchedulerService(new SeedSchedulerRepository());
    await service.createJob({
      code: 'report.refresh',
      name: 'Refresh reports failure',
      queueName: 'reports',
      retryLimit: 1,
      timeoutSeconds: 60,
      payload: { simulateFailure: true },
    });

    const run = await service.triggerJob('report.refresh', {
      actor: 'admin',
      metadata: { reason: 'failure smoke' },
    });

    expect(run).toMatchObject({
      attempts: 2,
      error: 'Report refresh failed by scheduler payload.',
      jobCode: 'report.refresh',
      status: 'failed',
      metadata: expect.objectContaining({
        executionMode: 'in-process',
        result: expect.objectContaining({
          failed: true,
          lastError: 'Report refresh failed by scheduler payload.',
        }),
      }),
    });
    expect(run.durationMs).toEqual(expect.any(Number));
    await expect(
      service.listJobRuns('report.refresh', { status: 'failed' }),
    ).resolves.toMatchObject({ total: 1 });
  });

  it('dispatches due cron jobs once and lets a worker claim queued runs', async () => {
    const service = new SchedulerService(new SeedSchedulerRepository());
    const now = '2026-06-10T03:00:00.000Z';

    const dispatch = await service.dispatchDueJobs({
      actor: 'scheduler-dispatcher',
      limit: 1,
      metadata: { source: 'scheduler.spec.dispatch' },
      now,
    });

    expect(dispatch).toMatchObject({
      checkedAt: now,
      dispatchedCount: 1,
      skippedCount: 1,
      queuedRuns: [
        expect.objectContaining({
          jobCode: 'audit-log.retention-clean',
          status: 'queued',
          trigger: 'schedule',
          attempts: 0,
          metadata: expect.objectContaining({
            executionMode: 'queued',
            scheduledAt: now,
            source: 'scheduler.spec.dispatch',
          }),
        }),
      ],
    });

    const worker = await service.claimQueuedJobs({
      actor: 'scheduler-worker',
      limit: 1,
      metadata: { source: 'scheduler.spec.worker' },
      queueName: 'maintenance',
    });

    expect(worker).toMatchObject({
      claimedCount: 1,
      completedCount: 1,
      failedCount: 0,
      runs: [
        expect.objectContaining({
          id: dispatch.queuedRuns[0].id,
          jobCode: 'audit-log.retention-clean',
          status: 'completed',
          trigger: 'schedule',
          metadata: expect.objectContaining({
            actor: 'scheduler-worker',
            executionMode: 'worker',
            queuedRunId: dispatch.queuedRuns[0].id,
            source: 'scheduler.spec.worker',
          }),
        }),
      ],
    });
    await expect(
      service.getJobRun('audit-log.retention-clean', dispatch.queuedRuns[0].id),
    ).resolves.toMatchObject({
      status: 'completed',
      metadata: expect.objectContaining({ executionMode: 'worker' }),
    });

    await expect(
      service.dispatchDueJobs({ actor: 'scheduler-dispatcher', now }),
    ).resolves.toMatchObject({
      dispatchedCount: 1,
      skippedCount: 1,
    });
  });

  it('rejects invalid cron and unsafe numeric policy', async () => {
    const service = new SchedulerService(new SeedSchedulerRepository());

    await expect(
      service.createJob({
        code: 'report.refresh',
        name: 'Refresh reports',
        queueName: 'reports',
        cron: 'bad cron',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createJob({
        code: 'report.refresh',
        name: 'Refresh reports',
        queueName: 'reports',
        retryLimit: 99,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.cleanJobRuns('openapi.drift-check', {
        retentionDays: 0,
        status: 'queued',
      } as never),
    ).rejects.toThrow(BadRequestException);
  });

  describe('PrismaSchedulerRepository integration', () => {
    const prisma = new PrismaService();
    const repository = new PrismaSchedulerRepository(prisma);
    const service = new SchedulerService(repository);
    const testRunId = randomUUID().slice(0, 8);
    const code = `report.refresh`;
    const jobName = `Scheduler Test ${testRunId}`;
    const createdRunIds: string[] = [];
    let originalJob: Awaited<
      ReturnType<typeof prisma.jobDefinition.findUnique>
    >;

    beforeEach(async () => {
      originalJob = await prisma.jobDefinition.findUnique({ where: { code } });
      await cleanupTestRows();
    });

    afterEach(async () => {
      await cleanupTestRows();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('persists whitelisted jobs and run logs through Prisma', async () => {
      if (originalJob) {
        await service.updateJob(code, {
          enabled: true,
          name: jobName,
          payload: {
            reportCode: `scheduler-test.${testRunId}`,
            source: 'scheduler.spec',
          },
          queueName: 'reports',
          retryLimit: 2,
          timeoutSeconds: 45,
        });
      } else {
        await service.createJob({
          code,
          name: jobName,
          payload: {
            reportCode: `scheduler-test.${testRunId}`,
            source: 'scheduler.spec',
          },
          queueName: 'reports',
          retryLimit: 2,
          timeoutSeconds: 45,
        });
      }
      const run = await service.triggerJob(code, { actor: 'admin' });
      createdRunIds.push(run.id);

      await expect(service.getJob(code)).resolves.toMatchObject({
        code,
        name: jobName,
      });
      await expect(service.getJobRun(code, run.id)).resolves.toMatchObject({
        id: run.id,
        durationMs: expect.any(Number),
        metadata: expect.objectContaining({
          executionMode: 'in-process',
          handlerKey: 'reports.refresh',
        }),
      });
      const cleanResult = await service.cleanJobRuns(code, {
        retentionDays: 0,
        status: 'completed',
      });
      expect(cleanResult).toMatchObject({
        deleted: true,
        jobCode: code,
        statuses: ['completed'],
      });
      expect(cleanResult.affected).toBeGreaterThanOrEqual(1);
      await expect(service.getJobRun(code, run.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('persists cron dispatch and worker claim through Prisma', async () => {
      const cronNow = '2026-06-10T04:15:00.000Z';
      if (originalJob) {
        await service.updateJob(code, {
          cron: '15 4 * * *',
          enabled: true,
          name: jobName,
          payload: {
            reportCode: `scheduler-worker.${testRunId}`,
            source: 'scheduler.spec.worker',
          },
          queueName: 'reports',
          retryLimit: 1,
          timeoutSeconds: 45,
        });
      } else {
        await service.createJob({
          code,
          cron: '15 4 * * *',
          enabled: true,
          name: jobName,
          payload: {
            reportCode: `scheduler-worker.${testRunId}`,
            source: 'scheduler.spec.worker',
          },
          queueName: 'reports',
          retryLimit: 1,
          timeoutSeconds: 45,
        });
      }

      const dispatch = await service.dispatchDueJobs({
        actor: 'scheduler-dispatcher',
        metadata: { source: `scheduler.spec.dispatch.${testRunId}` },
        now: cronNow,
      });
      createdRunIds.push(...dispatch.queuedRuns.map((run) => run.id));

      expect(dispatch).toMatchObject({
        dispatchedCount: 1,
        queuedRuns: [
          expect.objectContaining({
            jobCode: code,
            status: 'queued',
            trigger: 'schedule',
          }),
        ],
      });

      const worker = await service.claimQueuedJobs({
        actor: 'scheduler-worker',
        metadata: { source: `scheduler.spec.claim.${testRunId}` },
        queueName: 'reports',
      });

      expect(worker).toMatchObject({
        claimedCount: 1,
        completedCount: 1,
        failedCount: 0,
        runs: [
          expect.objectContaining({
            id: dispatch.queuedRuns[0].id,
            status: 'completed',
            trigger: 'schedule',
            metadata: expect.objectContaining({
              actor: 'scheduler-worker',
              executionMode: 'worker',
              queuedRunId: dispatch.queuedRuns[0].id,
            }),
          }),
        ],
      });
      await expect(
        service.getJobRun(code, dispatch.queuedRuns[0].id),
      ).resolves.toMatchObject({
        status: 'completed',
        metadata: expect.objectContaining({ executionMode: 'worker' }),
      });
    });

    async function cleanupTestRows(): Promise<void> {
      if (createdRunIds.length > 0) {
        await prisma.jobRunLog.deleteMany({
          where: { id: { in: createdRunIds } },
        });
        createdRunIds.length = 0;
      }

      await prisma.jobDefinition.deleteMany({
        where: { code, name: jobName },
      });

      if (originalJob) {
        await prisma.jobDefinition.upsert({
          create: {
            code: originalJob.code,
            cron: originalJob.cron,
            enabled: originalJob.enabled,
            name: originalJob.name,
            payload: toPrismaJsonInput(originalJob.payload),
            queueName: originalJob.queueName,
            retryLimit: originalJob.retryLimit,
            timeoutSeconds: originalJob.timeoutSeconds,
          },
          update: {
            cron: originalJob.cron,
            enabled: originalJob.enabled,
            name: originalJob.name,
            payload: toPrismaJsonInput(originalJob.payload),
            queueName: originalJob.queueName,
            retryLimit: originalJob.retryLimit,
            timeoutSeconds: originalJob.timeoutSeconds,
          },
          where: { code: originalJob.code },
        });
      }
    }
  });
});

function toPrismaJsonInput(value: Prisma.JsonValue): Prisma.InputJsonValue {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}
