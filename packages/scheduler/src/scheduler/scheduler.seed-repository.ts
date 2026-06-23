import { Injectable } from '@nestjs/common';
import { normalizeOptionalString, type PageResult } from '@opencore/common';
import { SchedulerJobExecutor } from './scheduler.executor';
import type {
  SchedulerJobDefinitionRecord,
  SchedulerJobRunLogRecord,
} from './scheduler.records';
import { seedSchedulerJobs, seedSchedulerRuns } from './scheduler.records';
import {
  assertJobCanTrigger,
  assertSafeJobPolicy,
  compareJobs,
  compareRuns,
  createSchedulerPageResult,
  createSchedulerSummary,
  createSchedulerDispatchTick,
  isCronDue,
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
  type SchedulerRunTerminalStatus,
  type TriggerSchedulerJobInput,
  type UpdateSchedulerJobInput,
} from './scheduler.repository';

@Injectable()
export class SeedSchedulerRepository extends SchedulerRepository {
  private jobs = seedSchedulerJobs.map(cloneJob);
  private runs = seedSchedulerRuns.map(cloneRun);

  constructor(
    private readonly executor: SchedulerJobExecutor = new SchedulerJobExecutor(),
  ) {
    super();
  }

  async getSummary() {
    const tenantId = resolveCurrentTenantId();
    return createSchedulerSummary({
      jobs: this.jobs.filter((job) => job.tenantId === tenantId),
      jobRuns: this.runs.filter((run) => run.tenantId === tenantId),
    });
  }

  async listJobs(
    query: SchedulerJobQuery = {},
  ): Promise<PageResult<SchedulerJobDefinitionRecord>> {
    const tenantId = resolveCurrentTenantId();
    const filters = normalizeSchedulerJobFilters(query);
    const rows = this.jobs
      .filter(
        (job) =>
          job.tenantId === tenantId &&
          matchesOptional(job.enabled, filters.enabled) &&
          matchesOptional(job.queueName, filters.queueName),
      )
      .sort(compareJobs);
    const pagination = normalizeSchedulerPageQuery(query, rows.length);

    return createSchedulerPageResult(
      rows.slice(pagination.skip, pagination.skip + pagination.take),
      pagination,
    );
  }

  async getJob(code: string): Promise<SchedulerJobDefinitionRecord> {
    return cloneJob(this.findJob(code));
  }

  async createJob(
    body: CreateSchedulerJobInput,
  ): Promise<SchedulerJobDefinitionRecord> {
    const tenantId = resolveCurrentTenantId();
    const job: SchedulerJobDefinitionRecord = {
      id: `job_${body.code.replace(/[^a-zA-Z0-9]+/g, '_')}`,
      tenantId,
      code: body.code,
      name: body.name,
      queueName: body.queueName,
      cron: body.cron,
      enabled: body.enabled ?? true,
      retryLimit: body.retryLimit ?? 3,
      timeoutSeconds: body.timeoutSeconds ?? 60,
      adapter: 'bullmq',
      payload: body.payload,
    };
    assertSafeJobPolicy(job);
    this.jobs = [job, ...this.jobs];

    return cloneJob(job);
  }

  async updateJob(
    code: string,
    body: UpdateSchedulerJobInput,
  ): Promise<SchedulerJobDefinitionRecord> {
    const job = this.findJob(code);
    const updated = {
      ...job,
      name: body.name ?? job.name,
      queueName: body.queueName ?? job.queueName,
      cron: body.cron ?? job.cron,
      enabled: body.enabled ?? job.enabled,
      retryLimit: body.retryLimit ?? job.retryLimit,
      timeoutSeconds: body.timeoutSeconds ?? job.timeoutSeconds,
      payload: body.payload ?? job.payload,
    };
    assertSafeJobPolicy(updated);
    Object.assign(job, updated);

    return cloneJob(job);
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
    const job = this.findJob(code);
    const entry = assertJobCanTrigger(job);
    const execution = await this.executor.execute({
      actor: body.actor,
      entry,
      job,
      metadata: body.metadata,
      tenantId: job.tenantId,
    });
    const run: SchedulerJobRunLogRecord = {
      id: `run_${code.replace(/[^a-zA-Z0-9]+/g, '_')}_${this.runs.length + 1}`,
      tenantId: job.tenantId,
      jobCode: code,
      status: execution.status,
      trigger: 'manual',
      attempts: execution.attempts,
      durationMs: execution.durationMs,
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt,
      error: execution.error,
      metadata: execution.metadata,
    };
    this.runs = [run, ...this.runs];

    return cloneRun(run);
  }

  async dispatchDueJobs(body: DispatchDueSchedulerJobsInput) {
    const tenantId = resolveCurrentTenantId();
    const now = normalizeSchedulerDispatchNow(body.now);
    const dispatchTick = createSchedulerDispatchTick(now);
    const limit = normalizeSchedulerWorkerLimit(body.limit);
    const queueName = normalizeOptionalString(body.queueName);
    const queuedRuns: SchedulerJobRunLogRecord[] = [];
    let skippedCount = 0;

    for (const job of this.jobs.sort(compareJobs)) {
      if (
        job.tenantId !== tenantId ||
        !job.enabled ||
        !job.cron ||
        (queueName && job.queueName !== queueName) ||
        !isCronDue(job.cron, now)
      ) {
        continue;
      }
      assertSafeJobPolicy(job);
      if (this.hasScheduledRunForTick(job.code, dispatchTick)) {
        skippedCount += 1;
        continue;
      }
      if (queuedRuns.length >= limit) {
        skippedCount += 1;
        continue;
      }

      const run: SchedulerJobRunLogRecord = {
        id: `run_${job.code.replace(/[^a-zA-Z0-9]+/g, '_')}_${this.runs.length + 1}`,
        tenantId,
        jobCode: job.code,
        status: 'queued',
        trigger: 'schedule',
        attempts: 0,
        startedAt: now.toISOString(),
        metadata: {
          ...(body.metadata ?? {}),
          actor: body.actor,
          cron: job.cron,
          executionMode: 'queued',
          queueName: job.queueName,
          scheduledAt: dispatchTick,
          tenantId,
        },
      };
      this.runs = [run, ...this.runs];
      queuedRuns.push(cloneRun(run));
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
    const runs = this.runs
      .filter(
        (run) =>
          run.tenantId === tenantId &&
          run.status === 'queued' &&
          run.trigger === 'schedule',
      )
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt));
    const claimedRuns: SchedulerJobRunLogRecord[] = [];
    let completedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const run of runs) {
      const job = this.findJob(run.jobCode);
      if (queueName && job.queueName !== queueName) {
        skippedCount += 1;
        continue;
      }
      if (claimedRuns.length >= limit) {
        skippedCount += 1;
        continue;
      }

      if (!job.enabled) {
        const failedRun = this.failQueuedRun(run, body, nowIso());
        failedCount += 1;
        claimedRuns.push(cloneRun(failedRun));
        continue;
      }

      const entry = assertSafeJobPolicy(job);
      const execution = await this.executor.execute({
        actor: body.actor,
        entry,
        executionMode: 'worker',
        job,
        metadata: {
          ...(run.metadata ?? {}),
          ...(body.metadata ?? {}),
          queuedRunId: run.id,
          tenantId: run.tenantId,
          workerQueueName: job.queueName,
        },
        tenantId: run.tenantId,
      });
      Object.assign(run, {
        status: execution.status,
        attempts: execution.attempts,
        durationMs: execution.durationMs,
        startedAt: execution.startedAt,
        finishedAt: execution.finishedAt,
        error: execution.error,
        metadata: execution.metadata,
      });
      if (run.status === 'completed') {
        completedCount += 1;
      } else {
        failedCount += 1;
      }
      claimedRuns.push(cloneRun(run));
    }

    return {
      checkedAt: nowIso(),
      claimedCount: claimedRuns.length,
      completedCount,
      failedCount,
      skippedCount,
      runs: claimedRuns,
    };
  }

  async listJobRuns(
    code: string,
    query: SchedulerRunQuery = {},
  ): Promise<PageResult<SchedulerJobRunLogRecord>> {
    const tenantId = resolveCurrentTenantId();
    this.findJob(code);
    const rows = this.runs
      .filter(
        (run) =>
          run.tenantId === tenantId &&
          run.jobCode === code &&
          matchesOptional(run.status, query.status),
      )
      .sort(compareRuns);
    const pagination = normalizeSchedulerPageQuery(query, rows.length);

    return createSchedulerPageResult(
      rows.slice(pagination.skip, pagination.skip + pagination.take),
      pagination,
    );
  }

  async getJobRun(code: string, id: string): Promise<SchedulerJobRunLogRecord> {
    const tenantId = resolveCurrentTenantId();
    this.findJob(code);

    return cloneRun(
      requireRecord(
        this.runs.find(
          (run) =>
            run.tenantId === tenantId && run.jobCode === code && run.id === id,
        ),
        'Job run log',
        id,
      ),
    );
  }

  async cleanJobRuns(code: string, query: SchedulerRunCleanQuery = {}) {
    const tenantId = resolveCurrentTenantId();
    this.findJob(code);
    const policy = normalizeSchedulerRunCleanPolicy(query);
    const beforeCount = this.runs.length;
    this.runs = this.runs.filter((run) => {
      if (run.tenantId !== tenantId || run.jobCode !== code) {
        return true;
      }
      if (!policy.statuses.includes(run.status as SchedulerRunTerminalStatus)) {
        return true;
      }

      return new Date(run.startedAt) >= policy.cutoffBefore;
    });

    return {
      deleted: true as const,
      jobCode: code,
      affected: beforeCount - this.runs.length,
      cutoffBefore: policy.cutoffBefore.toISOString(),
      retentionDays: policy.retentionDays,
      statuses: policy.statuses,
    };
  }

  private findJob(code: string): SchedulerJobDefinitionRecord {
    const tenantId = resolveCurrentTenantId();
    return requireRecord(
      this.jobs.find((job) => job.tenantId === tenantId && job.code === code),
      'Job definition',
      code,
    );
  }

  private hasScheduledRunForTick(code: string, dispatchTick: string): boolean {
    const tenantId = resolveCurrentTenantId();
    return this.runs.some(
      (run) =>
        run.tenantId === tenantId &&
        run.jobCode === code &&
        run.trigger === 'schedule' &&
        run.metadata?.scheduledAt === dispatchTick,
    );
  }

  private failQueuedRun(
    run: SchedulerJobRunLogRecord,
    body: ClaimQueuedSchedulerJobsInput,
    finishedAt: string,
  ): SchedulerJobRunLogRecord {
    Object.assign(run, {
      status: 'failed' as const,
      attempts: 0,
      durationMs: 0,
      finishedAt,
      error: 'Job definition is disabled before worker execution.',
      metadata: {
        ...(run.metadata ?? {}),
        ...(body.metadata ?? {}),
        actor: body.actor,
        executionMode: 'worker',
        tenantId: run.tenantId,
        result: { failed: true, skippedDisabledJob: true },
      },
    });

    return run;
  }
}

function matchesOptional<T>(
  value: T | undefined,
  expected: T | undefined,
): boolean {
  return expected === undefined || value === expected;
}

function cloneJob(
  job: SchedulerJobDefinitionRecord,
): SchedulerJobDefinitionRecord {
  return JSON.parse(JSON.stringify(job)) as SchedulerJobDefinitionRecord;
}

function cloneRun(run: SchedulerJobRunLogRecord): SchedulerJobRunLogRecord {
  return JSON.parse(JSON.stringify(run)) as SchedulerJobRunLogRecord;
}

function nowIso(): string {
  return new Date().toISOString();
}
