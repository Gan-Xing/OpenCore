import { randomUUID } from 'node:crypto';
import { runWithRequestContext } from '@opencore/core';
import { Prisma, PrismaService } from '@opencore/database';
import {
  SchedulerJobExecutor,
  sendTicketSlaRemindersForTenant,
} from './scheduler.executor';
import { PrismaSchedulerRepository } from './scheduler.prisma-repository';
import { SeedSchedulerRepository } from './scheduler.seed-repository';
import { SchedulerService } from './scheduler.service';

const ROOT_TENANT_ID = 'tenant_root';
const FOREIGN_TENANT_ID = 'tenant_scheduler_foreign_spec';

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
      jobs: { total: 3, enabled: 3, disabled: 0 },
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
        expect.objectContaining({
          code: 'collaboration.ticket-sla-reminders',
          handlerKey: 'collaboration.ticketSlaReminders',
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
      service.triggerJob('collaboration.ticket-sla-reminders', {
        actor: 'admin',
        metadata: { reason: 'seed ticket SLA dry-run' },
      }),
    ).resolves.toMatchObject({
      jobCode: 'collaboration.ticket-sla-reminders',
      status: 'completed',
      metadata: expect.objectContaining({
        handlerKey: 'collaboration.ticketSlaReminders',
        result: expect.objectContaining({
          dryRun: true,
          markedOverdue: 0,
          notified: 0,
          scanned: 0,
        }),
      }),
    });

    await expectHttpExceptionCode(
      service.createJob({
        code: 'unknown.job',
        name: 'Unknown',
        queueName: 'maintenance',
      }),
      'SCHEDULER_RESOURCE_NOT_FOUND',
    );
    await expectHttpExceptionCode(
      service.createJob({
        code: 'report.refresh',
        name: 'Refresh reports',
        queueName: 'wrong',
      }),
      'SCHEDULER_JOB_QUEUE_MISMATCH',
    );

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
    await expectHttpExceptionCode(
      service.triggerJob(job.code, { actor: 'admin' }),
      'SCHEDULER_JOB_DISABLED',
    );
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
    await expectHttpExceptionCode(
      service.getJobRun(job.code, run.id),
      'SCHEDULER_RESOURCE_NOT_FOUND',
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

  it('dispatches due cron jobs within a requested queue boundary', async () => {
    const service = new SchedulerService(new SeedSchedulerRepository());
    const now = '2026-06-10T03:00:00.000Z';
    await service.createJob({
      code: 'report.refresh',
      cron: '0 3 * * *',
      name: 'Refresh reports',
      queueName: 'reports',
    });

    const dispatch = await service.dispatchDueJobs({
      actor: 'scheduler-dispatcher',
      limit: 10,
      metadata: { source: 'scheduler.spec.dispatch.reports-only' },
      now,
      queueName: 'reports',
    });

    expect(dispatch).toMatchObject({
      dispatchedCount: 1,
      skippedCount: 0,
      queuedRuns: [
        expect.objectContaining({
          jobCode: 'report.refresh',
          metadata: expect.objectContaining({
            queueName: 'reports',
            scheduledAt: now,
          }),
          status: 'queued',
        }),
      ],
    });
    expect(
      dispatch.queuedRuns.some((run) => run.jobCode === 'openapi.drift-check'),
    ).toBe(false);
    expect(
      dispatch.queuedRuns.some(
        (run) => run.jobCode === 'audit-log.retention-clean',
      ),
    ).toBe(false);
  });

  it('scopes jobs and queued worker runs by tenant context', async () => {
    const service = new SchedulerService(new SeedSchedulerRepository());

    await runAsTenant(FOREIGN_TENANT_ID, () =>
      service.createJob({
        code: 'report.refresh',
        cron: '0 4 * * *',
        name: 'Foreign refresh reports',
        payload: { reportCode: 'foreign.runtime' },
        queueName: 'reports',
      }),
    );

    await expectHttpExceptionCode(
      service.getJob('report.refresh'),
      'SCHEDULER_RESOURCE_NOT_FOUND',
    );

    const foreignDispatch = await runAsTenant(FOREIGN_TENANT_ID, () =>
      service.dispatchDueJobs({
        actor: 'foreign-scheduler',
        now: '2026-06-10T04:00:00.000Z',
        queueName: 'reports',
      }),
    );
    expect(foreignDispatch.queuedRuns).toEqual([
      expect.objectContaining({
        jobCode: 'report.refresh',
        tenantId: FOREIGN_TENANT_ID,
        metadata: expect.objectContaining({ tenantId: FOREIGN_TENANT_ID }),
      }),
    ]);

    await expect(
      service.claimQueuedJobs({
        actor: 'root-scheduler',
        queueName: 'reports',
      }),
    ).resolves.toMatchObject({
      claimedCount: 0,
      completedCount: 0,
    });

    await expect(
      runAsTenant(FOREIGN_TENANT_ID, () =>
        service.claimQueuedJobs({
          actor: 'foreign-worker',
          queueName: 'reports',
        }),
      ),
    ).resolves.toMatchObject({
      claimedCount: 1,
      completedCount: 1,
      runs: [
        expect.objectContaining({
          tenantId: FOREIGN_TENANT_ID,
          metadata: expect.objectContaining({
            executionMode: 'worker',
            tenantId: FOREIGN_TENANT_ID,
          }),
        }),
      ],
    });
  });

  it('rejects invalid cron and unsafe numeric policy', async () => {
    const service = new SchedulerService(new SeedSchedulerRepository());

    await expectHttpExceptionCode(
      service.createJob({
        code: 'report.refresh',
        name: 'Refresh reports',
        queueName: 'reports',
        cron: 'bad cron',
      }),
      'SCHEDULER_JOB_CRON_INVALID',
    );
    await expectHttpExceptionCode(
      service.createJob({
        code: 'report.refresh',
        name: 'Refresh reports',
        queueName: 'reports',
        retryLimit: 99,
      }),
      'SCHEDULER_JOB_RETRY_LIMIT_INVALID',
    );
    await expectHttpExceptionCode(
      service.cleanJobRuns('openapi.drift-check', {
        retentionDays: 0,
        status: 'queued',
      } as never),
      'SCHEDULER_RUN_CLEAN_STATUS_INVALID',
    );
  });

  it('rejects missing scheduler handlers with stable error codes', async () => {
    const executor = new SchedulerJobExecutor();

    await expectHttpExceptionCode(
      executor.execute({
        actor: 'admin',
        entry: {
          allowManualTrigger: true,
          code: 'missing.handler',
          handlerKey: 'missing.handler',
          queueName: 'maintenance',
          title: 'Missing handler',
        },
        job: {
          adapter: 'bullmq',
          code: 'missing.handler',
          enabled: true,
          id: 'job_missing_handler',
          name: 'Missing handler',
          queueName: 'maintenance',
          retryLimit: 0,
          tenantId: ROOT_TENANT_ID,
          timeoutSeconds: 10,
        },
        tenantId: ROOT_TENANT_ID,
      }),
      'SCHEDULER_HANDLER_NOT_FOUND',
    );
  });

  it('marks overdue tickets and sends SLA reminder deliveries from the scheduler handler', async () => {
    const ticket = {
      assignee: 'admin',
      createdBy: 'creator',
      id: 'ticket_scheduler_sla',
      number: 'TCK-SCHEDULER-SLA',
      tenantId: ROOT_TENANT_ID,
      title: 'Scheduler SLA smoke',
    };
    const prisma = {
      systemNotice: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            ...data,
            id: 'notice_scheduler_sla',
          }),
        ),
      },
      systemNoticeDelivery: {
        create: jest.fn().mockResolvedValue({}),
      },
      tenantMembership: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'active',
        }),
      },
      ticket: {
        findMany: jest.fn().mockResolvedValue([ticket]),
        update: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          displayName: 'Admin',
          id: 'user_admin',
          username: 'admin',
        }),
      },
    } as unknown as PrismaService;

    await expect(
      sendTicketSlaRemindersForTenant({
        actor: 'system',
        prisma,
        tenantId: ROOT_TENANT_ID,
      }),
    ).resolves.toEqual({
      dryRun: false,
      markedOverdue: 1,
      notified: 1,
      scanned: 1,
    });

    expect(prisma.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          archivedAt: null,
          slaNotifiedAt: null,
          status: { in: ['new', 'processing', 'pending_confirmation'] },
          tenantId: ROOT_TENANT_ID,
        }),
      }),
    );
    expect(prisma.ticket.update).toHaveBeenCalledWith({
      where: { tenantId_id: { tenantId: ROOT_TENANT_ID, id: ticket.id } },
      data: expect.objectContaining({ slaBreached: true }),
    });
    expect(prisma.systemNoticeDelivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerStatus: 'sent',
        tenantId: ROOT_TENANT_ID,
        title: `Ticket sla-overdue: ${ticket.number}`,
        username: 'admin',
      }),
    });
  });

  describe('PrismaSchedulerRepository integration', () => {
    const prisma = new PrismaService();
    const repository = new PrismaSchedulerRepository(prisma);
    const service = new SchedulerService(repository);
    const testRunId = randomUUID().slice(0, 8);
    const code = `report.refresh`;
    const jobName = `Scheduler Test ${testRunId}`;
    const foreignTenantId = `${FOREIGN_TENANT_ID}_${testRunId}`;
    const foreignJobName = `Foreign Scheduler Test ${testRunId}`;
    const createdRunIds: string[] = [];
    let originalJob: Awaited<
      ReturnType<typeof prisma.jobDefinition.findUnique>
    >;

    beforeEach(async () => {
      originalJob = await prisma.jobDefinition.findUnique({
        where: { tenantId_code: { tenantId: ROOT_TENANT_ID, code } },
      });
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
      await expectHttpExceptionCode(
        service.getJobRun(code, run.id),
        'SCHEDULER_RESOURCE_NOT_FOUND',
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

    it('scopes persisted scheduler jobs and worker claims by tenant', async () => {
      await prisma.tenant.upsert({
        where: { id: foreignTenantId },
        update: {
          code: foreignTenantId,
          name: 'Foreign Scheduler Tenant',
          slug: foreignTenantId,
          status: 'active',
        },
        create: {
          id: foreignTenantId,
          code: foreignTenantId,
          name: 'Foreign Scheduler Tenant',
          slug: foreignTenantId,
          status: 'active',
        },
      });

      if (originalJob) {
        await service.updateJob(code, {
          enabled: true,
          name: jobName,
          payload: { source: 'scheduler.spec.root' },
          queueName: 'reports',
        });
      } else {
        await service.createJob({
          code,
          enabled: true,
          name: jobName,
          payload: { source: 'scheduler.spec.root' },
          queueName: 'reports',
        });
      }

      await runAsTenant(foreignTenantId, () =>
        service.createJob({
          code,
          cron: '20 4 * * *',
          enabled: true,
          name: foreignJobName,
          payload: { source: 'scheduler.spec.foreign' },
          queueName: 'reports',
        }),
      );

      await expect(service.getJob(code)).resolves.toMatchObject({
        name: jobName,
        tenantId: ROOT_TENANT_ID,
      });
      await expect(
        runAsTenant(foreignTenantId, () => service.getJob(code)),
      ).resolves.toMatchObject({
        name: foreignJobName,
        tenantId: foreignTenantId,
      });

      const foreignDispatch = await runAsTenant(foreignTenantId, () =>
        service.dispatchDueJobs({
          actor: 'foreign-dispatcher',
          now: '2026-06-10T04:20:00.000Z',
          queueName: 'reports',
        }),
      );
      createdRunIds.push(...foreignDispatch.queuedRuns.map((run) => run.id));
      const foreignRun = foreignDispatch.queuedRuns[0];
      expect(foreignRun).toMatchObject({
        jobCode: code,
        tenantId: foreignTenantId,
        metadata: expect.objectContaining({ tenantId: foreignTenantId }),
      });

      await expectHttpExceptionCode(
        service.getJobRun(code, foreignRun.id),
        'SCHEDULER_RESOURCE_NOT_FOUND',
      );
      await expect(
        service.claimQueuedJobs({
          actor: 'root-worker',
          queueName: 'reports',
        }),
      ).resolves.toMatchObject({ claimedCount: 0 });

      await expect(
        runAsTenant(foreignTenantId, () =>
          service.claimQueuedJobs({
            actor: 'foreign-worker',
            queueName: 'reports',
          }),
        ),
      ).resolves.toMatchObject({
        claimedCount: 1,
        completedCount: 1,
        runs: [
          expect.objectContaining({
            tenantId: foreignTenantId,
            metadata: expect.objectContaining({ tenantId: foreignTenantId }),
          }),
        ],
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
        where: { tenantId: ROOT_TENANT_ID, code, name: jobName },
      });
      await prisma.tenant.deleteMany({ where: { id: foreignTenantId } });

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
            tenantId: originalJob.tenantId,
            timeoutSeconds: originalJob.timeoutSeconds,
          },
          update: {
            cron: originalJob.cron,
            enabled: originalJob.enabled,
            name: originalJob.name,
            payload: toPrismaJsonInput(originalJob.payload),
            queueName: originalJob.queueName,
            retryLimit: originalJob.retryLimit,
            tenantId: originalJob.tenantId,
            timeoutSeconds: originalJob.timeoutSeconds,
          },
          where: {
            tenantId_code: {
              tenantId: originalJob.tenantId,
              code: originalJob.code,
            },
          },
        });
      }
    }
  });
});

function toPrismaJsonInput(value: Prisma.JsonValue): Prisma.InputJsonValue {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

function runAsTenant<T>(tenantId: string, callback: () => T): T {
  return runWithRequestContext(
    {
      requestId: `scheduler-spec:${tenantId}`,
      traceId: `scheduler-spec:${tenantId}`,
      accessMode: 'tenant',
      tenantId,
    },
    callback,
  );
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
