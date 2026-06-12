import { BadRequestException, NotFoundException } from '@nestjs/common';
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
      total: 1,
      items: [expect.objectContaining({ code: 'openapi.drift-check' })],
    });
    await expect(
      service.listJobRuns('openapi.drift-check', { status: 'completed' }),
    ).resolves.toMatchObject({ total: 1 });
    await expect(service.getSummary()).resolves.toMatchObject({
      jobs: { total: 1, enabled: 1, disabled: 0 },
      jobRuns: { total: 1, completed: 1 },
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
      metadata: expect.objectContaining({
        adapter: 'bullmq',
        handlerKey: 'reports.refresh',
      }),
    });
    await expect(service.getJobRun(job.code, run.id)).resolves.toMatchObject({
      id: run.id,
      jobCode: job.code,
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
  });

  describe('PrismaSchedulerRepository integration', () => {
    const prisma = new PrismaService();
    const repository = new PrismaSchedulerRepository(prisma);
    const service = new SchedulerService(repository);
    const testRunId = randomUUID().slice(0, 8);
    const code = `report.refresh`;
    const jobName = `Scheduler Test ${testRunId}`;
    const createdRunIds: string[] = [];

    beforeEach(async () => {
      await cleanupTestRows();
    });

    afterEach(async () => {
      await cleanupTestRows();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('persists whitelisted jobs and run logs through Prisma', async () => {
      await service.createJob({
        code,
        name: jobName,
        queueName: 'reports',
        retryLimit: 2,
        timeoutSeconds: 45,
      });
      const run = await service.triggerJob(code, { actor: 'admin' });
      createdRunIds.push(run.id);

      await expect(service.getJob(code)).resolves.toMatchObject({
        code,
        name: jobName,
      });
      await expect(service.getJobRun(code, run.id)).resolves.toMatchObject({
        id: run.id,
        metadata: expect.objectContaining({
          handlerKey: 'reports.refresh',
        }),
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
    }
  });
});
