import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import type {
  SchedulerJobDefinitionRecord,
  SchedulerJobRunLogRecord,
} from './scheduler.records';
import {
  assertJobCanTrigger,
  assertSafeJobPolicy,
  createManualRunLog,
  createSchedulerPageResult,
  createSchedulerSummary,
  normalizeRunStatus,
  normalizeRunTrigger,
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

type JobDefinitionRow = {
  id: string;
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
  jobCode: string;
  status: string;
  trigger: string;
  attempts: number;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
  metadata: unknown;
};

@Injectable()
export class PrismaSchedulerRepository extends SchedulerRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getSummary() {
    const [jobs, jobRuns] = await Promise.all([
      this.prisma.jobDefinition.findMany(),
      this.prisma.jobRunLog.findMany(),
    ]);

    return createSchedulerSummary({
      jobs: jobs.map(toJobDefinitionRecord),
      jobRuns: jobRuns.map(toJobRunLogRecord),
    });
  }

  async listJobs(
    query: SchedulerJobQuery = {},
  ): Promise<PageResult<SchedulerJobDefinitionRecord>> {
    const filters = normalizeSchedulerJobFilters(query);
    const where = {
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
    const policy = normalizePolicyInput(body);
    assertSafeJobPolicy(policy);
    const job = await this.prisma.jobDefinition.create({
      data: {
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
      where: { code },
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
    const runSeed = createManualRunLog({
      actor: body.actor,
      entry,
      index: Date.now(),
      jobCode: code,
      metadata: body.metadata,
    });
    const run = await this.prisma.jobRunLog.create({
      data: {
        jobCode: code,
        status: runSeed.status,
        trigger: runSeed.trigger,
        attempts: runSeed.attempts,
        startedAt: new Date(runSeed.startedAt),
        finishedAt: runSeed.finishedAt ? new Date(runSeed.finishedAt) : null,
        metadata: runSeed.metadata ? toInputJson(runSeed.metadata) : undefined,
      },
    });

    return toJobRunLogRecord(run);
  }

  async listJobRuns(
    code: string,
    query: SchedulerRunQuery = {},
  ): Promise<PageResult<SchedulerJobRunLogRecord>> {
    await this.findJob(code);
    const where = { jobCode: code, status: query.status };
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
    await this.findJob(code);

    return requireRecord(
      await this.prisma.jobRunLog
        .findFirst({ where: { id, jobCode: code } })
        .then((run) => (run ? toJobRunLogRecord(run) : undefined)),
      'Job run log',
      id,
    );
  }

  private async findJob(code: string): Promise<SchedulerJobDefinitionRecord> {
    return requireRecord(
      await this.prisma.jobDefinition
        .findUnique({ where: { code } })
        .then((job) => (job ? toJobDefinitionRecord(job) : undefined)),
      'Job definition',
      code,
    );
  }
}

function toJobDefinitionRecord(
  row: JobDefinitionRow,
): SchedulerJobDefinitionRecord {
  return {
    id: row.id,
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
    jobCode: row.jobCode,
    status: normalizeRunStatus(row.status),
    trigger: normalizeRunTrigger(row.trigger),
    attempts: row.attempts,
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
