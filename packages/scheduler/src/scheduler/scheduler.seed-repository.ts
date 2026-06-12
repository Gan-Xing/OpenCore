import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
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
  createManualRunLog,
  createSchedulerPageResult,
  createSchedulerSummary,
  normalizeSchedulerJobFilters,
  normalizeSchedulerPageQuery,
  SchedulerRepository,
  requireRecord,
  type CreateSchedulerJobInput,
  type SchedulerJobQuery,
  type SchedulerRunQuery,
  type TriggerSchedulerJobInput,
  type UpdateSchedulerJobInput,
} from './scheduler.repository';

@Injectable()
export class SeedSchedulerRepository extends SchedulerRepository {
  private jobs = seedSchedulerJobs.map(cloneJob);
  private runs = seedSchedulerRuns.map(cloneRun);

  async getSummary() {
    return createSchedulerSummary({
      jobs: this.jobs,
      jobRuns: this.runs,
    });
  }

  async listJobs(
    query: SchedulerJobQuery = {},
  ): Promise<PageResult<SchedulerJobDefinitionRecord>> {
    const filters = normalizeSchedulerJobFilters(query);
    const rows = this.jobs
      .filter(
        (job) =>
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
    const job: SchedulerJobDefinitionRecord = {
      id: `job_${body.code.replace(/[^a-zA-Z0-9]+/g, '_')}`,
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
    const run = createManualRunLog({
      actor: body.actor,
      entry,
      index: this.runs.length + 1,
      jobCode: code,
      metadata: body.metadata,
    });
    this.runs = [run, ...this.runs];

    return cloneRun(run);
  }

  async listJobRuns(
    code: string,
    query: SchedulerRunQuery = {},
  ): Promise<PageResult<SchedulerJobRunLogRecord>> {
    this.findJob(code);
    const rows = this.runs
      .filter(
        (run) =>
          run.jobCode === code && matchesOptional(run.status, query.status),
      )
      .sort(compareRuns);
    const pagination = normalizeSchedulerPageQuery(query, rows.length);

    return createSchedulerPageResult(
      rows.slice(pagination.skip, pagination.skip + pagination.take),
      pagination,
    );
  }

  async getJobRun(code: string, id: string): Promise<SchedulerJobRunLogRecord> {
    this.findJob(code);

    return cloneRun(
      requireRecord(
        this.runs.find((run) => run.jobCode === code && run.id === id),
        'Job run log',
        id,
      ),
    );
  }

  private findJob(code: string): SchedulerJobDefinitionRecord {
    return requireRecord(
      this.jobs.find((job) => job.code === code),
      'Job definition',
      code,
    );
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
