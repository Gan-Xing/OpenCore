import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  createPageResult,
  normalizeOptionalString,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import type {
  JobDefinitionSummaryDto,
  JobRunSummaryDto,
  SchedulerSummaryDto,
} from './scheduler.dto';
import {
  schedulerJobRegistry,
  type SchedulerJobDefinitionRecord,
  type SchedulerJobRegistryEntry,
  type SchedulerJobRunLogRecord,
} from './scheduler.records';

export type SchedulerJobQuery = PageQueryInput & {
  enabled?: boolean | string;
  queueName?: string;
};

export type SchedulerRunQuery = PageQueryInput & {
  status?: SchedulerJobRunLogRecord['status'];
};

export type CreateSchedulerJobInput = {
  code: string;
  name: string;
  queueName: string;
  cron?: string;
  enabled?: boolean;
  retryLimit?: number;
  timeoutSeconds?: number;
  payload?: Record<string, unknown>;
};

export type UpdateSchedulerJobInput = Partial<
  Omit<CreateSchedulerJobInput, 'code'>
>;

export type TriggerSchedulerJobInput = {
  actor: string;
  metadata?: Record<string, unknown>;
};

export type SchedulerJobFilters = {
  enabled?: boolean;
  queueName?: string;
};

export type SchedulerNormalizedPageQuery = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skip: number;
  take: number;
};

export abstract class SchedulerRepository {
  abstract getSummary(): Promise<SchedulerSummaryDto>;

  abstract listJobs(
    query?: SchedulerJobQuery,
  ): Promise<PageResult<SchedulerJobDefinitionRecord>>;

  abstract getJob(code: string): Promise<SchedulerJobDefinitionRecord>;

  abstract createJob(
    body: CreateSchedulerJobInput,
  ): Promise<SchedulerJobDefinitionRecord>;

  abstract updateJob(
    code: string,
    body: UpdateSchedulerJobInput,
  ): Promise<SchedulerJobDefinitionRecord>;

  abstract enableJob(code: string): Promise<SchedulerJobDefinitionRecord>;

  abstract disableJob(code: string): Promise<SchedulerJobDefinitionRecord>;

  abstract triggerJob(
    code: string,
    body: TriggerSchedulerJobInput,
  ): Promise<SchedulerJobRunLogRecord>;

  abstract listJobRuns(
    code: string,
    query?: SchedulerRunQuery,
  ): Promise<PageResult<SchedulerJobRunLogRecord>>;

  abstract getJobRun(
    code: string,
    id: string,
  ): Promise<SchedulerJobRunLogRecord>;
}

export function normalizeSchedulerJobFilters(
  query: SchedulerJobQuery = {},
): SchedulerJobFilters {
  return {
    enabled: normalizeOptionalBoolean(query.enabled),
    queueName: normalizeOptionalString(query.queueName),
  };
}

export function normalizeSchedulerPageQuery(
  query: PageQueryInput = {},
  total: number,
): SchedulerNormalizedPageQuery {
  const pagination = normalizePagination(query, { maxPageSize: 100 });
  const totalPages = Math.ceil(total / pagination.pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(pagination.page, totalPages);

  return {
    page: safePage,
    pageSize: pagination.pageSize,
    total,
    totalPages,
    skip: (safePage - 1) * pagination.pageSize,
    take: pagination.pageSize,
  };
}

export function createSchedulerPageResult<T>(
  items: readonly T[],
  pagination: SchedulerNormalizedPageQuery,
): PageResult<T> {
  return createPageResult(
    [...items],
    {
      page: pagination.page,
      pageSize: pagination.pageSize,
    },
    pagination.total,
  );
}

export function createSchedulerSummary(input: {
  jobs: readonly Pick<SchedulerJobDefinitionRecord, 'enabled'>[];
  jobRuns: readonly Pick<SchedulerJobRunLogRecord, 'startedAt' | 'status'>[];
}): SchedulerSummaryDto {
  return {
    jobs: createJobDefinitionSummary(input.jobs),
    jobRuns: createJobRunSummary(input.jobRuns),
  };
}

export function createJobDefinitionSummary(
  jobs: readonly Pick<SchedulerJobDefinitionRecord, 'enabled'>[],
): JobDefinitionSummaryDto {
  return {
    total: jobs.length,
    enabled: jobs.filter((job) => job.enabled).length,
    disabled: jobs.filter((job) => !job.enabled).length,
  };
}

export function createJobRunSummary(
  runs: readonly Pick<SchedulerJobRunLogRecord, 'startedAt' | 'status'>[],
): JobRunSummaryDto {
  return {
    total: runs.length,
    queued: countByStatus(runs, 'queued'),
    running: countByStatus(runs, 'running'),
    completed: countByStatus(runs, 'completed'),
    failed: countByStatus(runs, 'failed'),
    latestStartedAt: runs
      .map((run) => run.startedAt)
      .filter(Boolean)
      .sort((left, right) => right.localeCompare(left))[0],
  };
}

export function assertSafeJobPolicy(input: {
  code: string;
  cron?: string;
  queueName: string;
  retryLimit: number;
  timeoutSeconds: number;
}): SchedulerJobRegistryEntry {
  const entry = requireRegisteredJob(input.code);

  if (input.queueName !== entry.queueName) {
    throw new BadRequestException(
      `Job ${input.code} must use registered queue: ${entry.queueName}`,
    );
  }

  if (input.retryLimit < 0 || input.retryLimit > 10) {
    throw new BadRequestException('Job retry limit must be between 0 and 10.');
  }

  if (input.timeoutSeconds < 1 || input.timeoutSeconds > 3600) {
    throw new BadRequestException(
      'Job timeout must be between 1 and 3600 seconds.',
    );
  }

  if (input.cron !== undefined && !isValidCronExpression(input.cron)) {
    throw new BadRequestException(`Invalid cron expression: ${input.cron}`);
  }

  return entry;
}

export function assertJobCanTrigger(input: {
  code: string;
  enabled: boolean;
}): SchedulerJobRegistryEntry {
  const entry = requireRegisteredJob(input.code);

  if (!entry.allowManualTrigger) {
    throw new BadRequestException(
      `Job does not allow manual trigger: ${input.code}`,
    );
  }

  if (!input.enabled) {
    throw new BadRequestException(`Job definition is disabled: ${input.code}`);
  }

  return entry;
}

export function requireRecord<T>(
  record: T | undefined,
  resource: string,
  id: string,
): T {
  if (!record) {
    throw new NotFoundException(`${resource} not found: ${id}`);
  }

  return record;
}

export function requireRegisteredJob(code: string): SchedulerJobRegistryEntry {
  return requireRecord(
    schedulerJobRegistry.find((entry) => entry.code === code),
    'Scheduler job registry entry',
    code,
  );
}

export function compareJobs(
  left: SchedulerJobDefinitionRecord,
  right: SchedulerJobDefinitionRecord,
): number {
  return left.code.localeCompare(right.code);
}

export function compareRuns(
  left: SchedulerJobRunLogRecord,
  right: SchedulerJobRunLogRecord,
): number {
  return (
    right.startedAt.localeCompare(left.startedAt) ||
    left.id.localeCompare(right.id)
  );
}

export function normalizeRunStatus(
  value: string,
): SchedulerJobRunLogRecord['status'] {
  return ['queued', 'running', 'completed', 'failed'].includes(value)
    ? (value as SchedulerJobRunLogRecord['status'])
    : 'queued';
}

export function normalizeRunTrigger(
  value: string,
): SchedulerJobRunLogRecord['trigger'] {
  return value === 'schedule' ? 'schedule' : 'manual';
}

export function normalizeOptionalBoolean(
  value: boolean | string | undefined,
): boolean | undefined {
  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return undefined;
}

function countByStatus<T extends { status: string }>(
  rows: readonly T[],
  status: string,
): number {
  return rows.filter((row) => row.status === status).length;
}

function isValidCronExpression(value: string): boolean {
  const fields = value.trim().split(/\s+/);

  if (fields.length !== 5 && fields.length !== 6) {
    return false;
  }

  return fields.every((field) => /^[\d*,/-]+$/.test(field));
}
