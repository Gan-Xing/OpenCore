import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeOptionalString, type PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import { SchedulerJobExecutor } from './scheduler.executor';
import type {
  SchedulerJobDefinitionRecord,
  SchedulerJobRunLogRecord,
} from './scheduler.records';
import {
  assertJobCanTrigger,
  assertSafeJobPolicy,
  createSchedulerPageResult,
  createSchedulerDispatchTick,
  createSchedulerSummary,
  isCronDue,
  normalizeRunStatus,
  normalizeRunTrigger,
  normalizeSchedulerDispatchNow,
  normalizeSchedulerJobFilters,
  normalizeSchedulerPageQuery,
  normalizeSchedulerRunCleanPolicy,
  normalizeSchedulerWorkerLimit,
  resolveCurrentTenantId,
  SchedulerRepository,
  requireRecord,
  type ClaimQueuedSchedulerJobsInput,
  type CreateSchedulerJobInput,
  type DispatchDueSchedulerJobsInput,
  type SchedulerJobQuery,
  type SchedulerRunQuery,
  type SchedulerRunCleanQuery,
  type TriggerSchedulerJobInput,
  type UpdateSchedulerJobInput,
} from './scheduler.repository';

type JobDefinitionRow = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  queueName: string;
  cron: string | null;
  enabled: boolean;
  retryLimit: number;
  timeoutSeconds: number;
  payload: unknown;
};

type JobRunLogRow = {
  id: string;
  tenantId: string;
  jobCode: string;
  status: string;
  trigger: string;
  attempts: number;
  durationMs: number | null;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
  metadata: unknown;
};

@Injectable()
export class PrismaSchedulerRepository extends SchedulerRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly executor: SchedulerJobExecutor = new SchedulerJobExecutor(),
  ) {
    super();
  }

  async getSummary() {
    const tenantId = resolveCurrentTenantId();
    const [jobs, jobRuns] = await Promise.all([
      this.prisma.jobDefinition.findMany({ where: { tenantId } }),
      this.prisma.jobRunLog.findMany({ where: { tenantId } }),
    ]);

    return createSchedulerSummary({
      jobs: jobs.map(toJobDefinitionRecord),
      jobRuns: jobRuns.map(toJobRunLogRecord),
    });
  }

  async listJobs(
    query: SchedulerJobQuery = {},
  ): Promise<PageResult<SchedulerJobDefinitionRecord>> {
    const tenantId = resolveCurrentTenantId();
    const filters = normalizeSchedulerJobFilters(query);
    const where = {
      tenantId,
      enabled: filters.enabled,
      queueName: filters.queueName,
    };
    const total = await this.prisma.jobDefinition.count({ where });
    const pagination = normalizeSchedulerPageQuery(query, total);
    const rows = await this.prisma.jobDefinition.findMany({
      where,
      orderBy: [{ code: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createSchedulerPageResult(
      rows.map(toJobDefinitionRecord),
      pagination,
    );
  }

  async getJob(code: string): Promise<SchedulerJobDefinitionRecord> {
    return this.findJob(code);
  }

  async createJob(
    body: CreateSchedulerJobInput,
  ): Promise<SchedulerJobDefinitionRecord> {
    const tenantId = resolveCurrentTenantId();
    const policy = normalizePolicyInput(body);
    assertSafeJobPolicy(policy);
    const job = await this.prisma.jobDefinition.create({
      data: {
        tenantId,
        code: body.code,
        name: body.name,
        queueName: body.queueName,
        cron: body.cron,
        enabled: body.enabled ?? true,
        retryLimit: policy.retryLimit,
        timeoutSeconds: policy.timeoutSeconds,
        payload: body.payload ? toInputJson(body.payload) : undefined,
      },
    });

    return toJobDefinitionRecord(job);
  }

  async updateJob(
    code: string,
    body: UpdateSchedulerJobInput,
  ): Promise<SchedulerJobDefinitionRecord> {
    const tenantId = resolveCurrentTenantId();
    const existing = await this.findJob(code);
    const updated = {
      code,
      cron: body.cron ?? existing.cron,
      queueName: body.queueName ?? existing.queueName,
      retryLimit: body.retryLimit ?? existing.retryLimit,
      timeoutSeconds: body.timeoutSeconds ?? existing.timeoutSeconds,
    };
    assertSafeJobPolicy(updated);
    const job = await this.prisma.jobDefinition.update({
      where: { tenantId_code: { tenantId, code } },
      data: {
        name: body.name ?? existing.name,
        queueName: updated.queueName,
        cron: updated.cron,
        enabled: body.enabled ?? existing.enabled,
        retryLimit: updated.retryLimit,
        timeoutSeconds: updated.timeoutSeconds,
        payload: body.payload ? toInputJson(body.payload) : undefined,
      },
    });

    return toJobDefinitionRecord(job);
  }

  async enableJob(code: string): Promise<SchedulerJobDefinitionRecord> {
    return this.updateJob(code, { enabled: true });
  }

  async disableJob(code: string): Promise<SchedulerJobDefinitionRecord> {
    return this.updateJob(code, { enabled: false });
  }

  async triggerJob(
    code: string,
    body: TriggerSchedulerJobInput,
  ): Promise<SchedulerJobRunLogRecord> {
    const job = await this.findJob(code);
    const entry = assertJobCanTrigger(job);
    const execution = await this.executor.execute({
      actor: body.actor,
      entry,
      job,
      metadata: body.metadata,
      prisma: this.prisma,
      tenantId: job.tenantId,
    });
    const run = await this.prisma.jobRunLog.create({
      data: {
        tenantId: job.tenantId,
        jobCode: code,
        status: execution.status,
        trigger: 'manual',
        attempts: execution.attempts,
        durationMs: execution.durationMs,
        startedAt: new Date(execution.startedAt),
        finishedAt: new Date(execution.finishedAt),
        error: execution.error,
        metadata: toInputJson(execution.metadata),
      },
    });

    return toJobRunLogRecord(run);
  }

  async dispatchDueJobs(body: DispatchDueSchedulerJobsInput) {
    const tenantId = resolveCurrentTenantId();
    const now = normalizeSchedulerDispatchNow(body.now);
    const dispatchTick = createSchedulerDispatchTick(now);
    const limit = normalizeSchedulerWorkerLimit(body.limit);
    const queueName = normalizeOptionalString(body.queueName);
    const jobs = await this.prisma.jobDefinition.findMany({
      where: { tenantId, enabled: true, cron: { not: null }, queueName },
      orderBy: [{ code: 'asc' }],
    });
    const queuedRuns: SchedulerJobRunLogRecord[] = [];
    let skippedCount = 0;

    for (const row of jobs) {
      const job = toJobDefinitionRecord(row);
      if (!job.cron || !isCronDue(job.cron, now)) {
        continue;
      }
      assertSafeJobPolicy(job);
      const scheduledRuns = await this.prisma.jobRunLog.findMany({
        where: {
          tenantId,
          jobCode: job.code,
          trigger: 'schedule',
        },
      });
      if (
        scheduledRuns.some(
          (run) =>
            toJobRunLogRecord(run).metadata?.scheduledAt === dispatchTick,
        )
      ) {
        skippedCount += 1;
        continue;
      }
      if (queuedRuns.length >= limit) {
        skippedCount += 1;
        continue;
      }

      const run = await this.prisma.jobRunLog.create({
        data: {
          tenantId,
          jobCode: job.code,
          status: 'queued',
          trigger: 'schedule',
          attempts: 0,
          startedAt: now,
          metadata: toInputJson({
            ...(body.metadata ?? {}),
            actor: body.actor,
            cron: job.cron,
            executionMode: 'queued',
            queueName: job.queueName,
            scheduledAt: dispatchTick,
            tenantId,
          }),
        },
      });
      queuedRuns.push(toJobRunLogRecord(run));
    }

    return {
      checkedAt: now.toISOString(),
      dispatchedCount: queuedRuns.length,
      skippedCount,
      queuedRuns,
    };
  }

  async claimQueuedJobs(body: ClaimQueuedSchedulerJobsInput) {
    const tenantId = resolveCurrentTenantId();
    const limit = normalizeSchedulerWorkerLimit(body.limit);
    const queueName = normalizeOptionalString(body.queueName);
    const queuedRows = await this.prisma.jobRunLog.findMany({
      where: { tenantId, status: 'queued', trigger: 'schedule' },
      orderBy: [{ startedAt: 'asc' }, { id: 'asc' }],
      take: limit * 3,
    });
    const runs: SchedulerJobRunLogRecord[] = [];
    let completedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const row of queuedRows) {
      const job = await this.findJob(row.jobCode, row.tenantId);
      if (queueName && job.queueName !== queueName) {
        skippedCount += 1;
        continue;
      }
      if (runs.length >= limit) {
        skippedCount += 1;
        continue;
      }

      if (!job.enabled) {
        const failedRun = await this.failQueuedRun(row, body);
        runs.push(failedRun);
        failedCount += 1;
        continue;
      }

      await this.prisma.jobRunLog.update({
        where: { id: row.id },
        data: { status: 'running' },
      });
      const entry = assertSafeJobPolicy(job);
      const execution = await this.executor.execute({
        actor: body.actor,
        entry,
        executionMode: 'worker',
        job,
        metadata: {
          ...(toJobRunLogRecord(row).metadata ?? {}),
          ...(body.metadata ?? {}),
          queuedRunId: row.id,
          tenantId: row.tenantId,
          workerQueueName: job.queueName,
        },
        prisma: this.prisma,
        tenantId: row.tenantId,
      });
      const updated = await this.prisma.jobRunLog.update({
        where: { id: row.id },
        data: {
          attempts: execution.attempts,
          durationMs: execution.durationMs,
          error: execution.error,
          finishedAt: new Date(execution.finishedAt),
          metadata: toInputJson(execution.metadata),
          startedAt: new Date(execution.startedAt),
          status: execution.status,
        },
      });
      const run = toJobRunLogRecord(updated);
      runs.push(run);
      if (run.status === 'completed') {
        completedCount += 1;
      } else {
        failedCount += 1;
      }
    }

    return {
      checkedAt: new Date().toISOString(),
      claimedCount: runs.length,
      completedCount,
      failedCount,
      skippedCount,
      runs,
    };
  }

  async listJobRuns(
    code: string,
    query: SchedulerRunQuery = {},
  ): Promise<PageResult<SchedulerJobRunLogRecord>> {
    const tenantId = resolveCurrentTenantId();
    await this.findJob(code, tenantId);
    const where = { tenantId, jobCode: code, status: query.status };
    const total = await this.prisma.jobRunLog.count({ where });
    const pagination = normalizeSchedulerPageQuery(query, total);
    const rows = await this.prisma.jobRunLog.findMany({
      where,
      orderBy: [{ startedAt: 'desc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createSchedulerPageResult(rows.map(toJobRunLogRecord), pagination);
  }

  async getJobRun(code: string, id: string): Promise<SchedulerJobRunLogRecord> {
    const tenantId = resolveCurrentTenantId();
    await this.findJob(code, tenantId);

    return requireRecord(
      await this.prisma.jobRunLog
        .findFirst({ where: { tenantId, id, jobCode: code } })
        .then((run) => (run ? toJobRunLogRecord(run) : undefined)),
      'Job run log',
      id,
    );
  }

  async cleanJobRuns(code: string, query: SchedulerRunCleanQuery = {}) {
    const tenantId = resolveCurrentTenantId();
    await this.findJob(code, tenantId);
    const policy = normalizeSchedulerRunCleanPolicy(query);
    const result = await this.prisma.jobRunLog.deleteMany({
      where: {
        tenantId,
        jobCode: code,
        startedAt: { lt: policy.cutoffBefore },
        status: { in: [...policy.statuses] },
      },
    });

    return {
      deleted: true as const,
      jobCode: code,
      affected: result.count,
      cutoffBefore: policy.cutoffBefore.toISOString(),
      retentionDays: policy.retentionDays,
      statuses: policy.statuses,
    };
  }

  private async findJob(
    code: string,
    tenantId = resolveCurrentTenantId(),
  ): Promise<SchedulerJobDefinitionRecord> {
    return requireRecord(
      await this.prisma.jobDefinition
        .findUnique({ where: { tenantId_code: { tenantId, code } } })
        .then((job) => (job ? toJobDefinitionRecord(job) : undefined)),
      'Job definition',
      code,
    );
  }

  private async failQueuedRun(
    row: JobRunLogRow,
    body: ClaimQueuedSchedulerJobsInput,
  ): Promise<SchedulerJobRunLogRecord> {
    const finishedAt = new Date();
    const existing = toJobRunLogRecord(row);
    const updated = await this.prisma.jobRunLog.update({
      where: { id: row.id },
      data: {
        attempts: 0,
        durationMs: 0,
        error: 'Job definition is disabled before worker execution.',
        finishedAt,
        metadata: toInputJson({
          ...(existing.metadata ?? {}),
          ...(body.metadata ?? {}),
          actor: body.actor,
          executionMode: 'worker',
          tenantId: existing.tenantId,
          result: { failed: true, skippedDisabledJob: true },
        }),
        status: 'failed',
      },
    });

    return toJobRunLogRecord(updated);
  }
}

function toJobDefinitionRecord(
  row: JobDefinitionRow,
): SchedulerJobDefinitionRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    code: row.code,
    name: row.name,
    queueName: row.queueName,
    cron: row.cron ?? undefined,
    enabled: row.enabled,
    retryLimit: row.retryLimit,
    timeoutSeconds: row.timeoutSeconds,
    adapter: 'bullmq',
    payload: normalizeRecord(row.payload),
  };
}

function toJobRunLogRecord(row: JobRunLogRow): SchedulerJobRunLogRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    jobCode: row.jobCode,
    status: normalizeRunStatus(row.status),
    trigger: normalizeRunTrigger(row.trigger),
    attempts: row.attempts,
    durationMs: row.durationMs ?? undefined,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString(),
    error: row.error ?? undefined,
    metadata: normalizeRecord(row.metadata),
  };
}

function normalizePolicyInput(input: CreateSchedulerJobInput): {
  code: string;
  cron?: string;
  queueName: string;
  retryLimit: number;
  timeoutSeconds: number;
} {
  return {
    code: input.code,
    cron: input.cron,
    queueName: input.queueName,
    retryLimit: input.retryLimit ?? 3,
    timeoutSeconds: input.timeoutSeconds ?? 60,
  };
}

function normalizeRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
