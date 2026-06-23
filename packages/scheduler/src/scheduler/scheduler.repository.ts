import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  createApiErrorBody,
  createPageResult,
  normalizeOptionalString,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import { getRequestContext } from '@opencore/core';
import type {
  JobDefinitionSummaryDto,
  JobRunSummaryDto,
  SchedulerDispatchResultDto,
  SchedulerSummaryDto,
  SchedulerWorkerResultDto,
} from './scheduler.dto';
import {
  schedulerJobRegistry,
  type SchedulerJobDefinitionRecord,
  type SchedulerJobRegistryEntry,
  type SchedulerJobRunLogRecord,
} from './scheduler.records';

export const ROOT_TENANT_ID = 'tenant_root';

export type SchedulerJobQuery = PageQueryInput & {
  enabled?: boolean | string;
  queueName?: string;
};

export type SchedulerRunQuery = PageQueryInput & {
  status?: SchedulerJobRunLogRecord['status'];
};

export type SchedulerRunTerminalStatus = Extract<
  SchedulerJobRunLogRecord['status'],
  'completed' | 'failed'
>;

export type SchedulerRunCleanQuery = {
  retentionDays?: number | string;
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

export type DispatchDueSchedulerJobsInput = {
  actor: string;
  now?: string;
  queueName?: string;
  limit?: number;
  metadata?: Record<string, unknown>;
};

export type ClaimQueuedSchedulerJobsInput = {
  actor: string;
  queueName?: string;
  limit?: number;
  metadata?: Record<string, unknown>;
};

export type SchedulerJobFilters = {
  enabled?: boolean;
  queueName?: string;
};

export type SchedulerRunCleanPolicy = {
  cutoffBefore: Date;
  retentionDays: number;
  statuses: readonly SchedulerRunTerminalStatus[];
};

export type SchedulerRunCleanRecord = {
  deleted: true;
  jobCode: string;
  affected: number;
  retentionDays: number;
  cutoffBefore: string;
  statuses: readonly SchedulerRunTerminalStatus[];
};

const terminalRunStatuses: readonly SchedulerRunTerminalStatus[] = [
  'completed',
  'failed',
];

export function schedulerBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

export function schedulerNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, message, details }));
}

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

  abstract dispatchDueJobs(
    body: DispatchDueSchedulerJobsInput,
  ): Promise<SchedulerDispatchResultDto>;

  abstract claimQueuedJobs(
    body: ClaimQueuedSchedulerJobsInput,
  ): Promise<SchedulerWorkerResultDto>;

  abstract listJobRuns(
    code: string,
    query?: SchedulerRunQuery,
  ): Promise<PageResult<SchedulerJobRunLogRecord>>;

  abstract getJobRun(
    code: string,
    id: string,
  ): Promise<SchedulerJobRunLogRecord>;

  abstract cleanJobRuns(
    code: string,
    query?: SchedulerRunCleanQuery,
  ): Promise<SchedulerRunCleanRecord>;
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

export function resolveCurrentTenantId(): string {
  return getRequestContext()?.tenantId ?? ROOT_TENANT_ID;
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
    throw schedulerBadRequest(
      'SCHEDULER_JOB_QUEUE_MISMATCH',
      `Job ${input.code} must use registered queue: ${entry.queueName}`,
      {
        code: input.code,
        expectedQueueName: entry.queueName,
        queueName: input.queueName,
      },
    );
  }

  if (input.retryLimit < 0 || input.retryLimit > 10) {
    throw schedulerBadRequest(
      'SCHEDULER_JOB_RETRY_LIMIT_INVALID',
      'Job retry limit must be between 0 and 10.',
      { maxRetryLimit: 10, minRetryLimit: 0, retryLimit: input.retryLimit },
    );
  }

  if (input.timeoutSeconds < 1 || input.timeoutSeconds > 3600) {
    throw schedulerBadRequest(
      'SCHEDULER_JOB_TIMEOUT_INVALID',
      'Job timeout must be between 1 and 3600 seconds.',
      {
        maxTimeoutSeconds: 3600,
        minTimeoutSeconds: 1,
        timeoutSeconds: input.timeoutSeconds,
      },
    );
  }

  if (input.cron !== undefined && !isValidCronExpression(input.cron)) {
    throw schedulerBadRequest(
      'SCHEDULER_JOB_CRON_INVALID',
      `Invalid cron expression: ${input.cron}`,
      { cron: input.cron },
    );
  }

  return entry;
}

export function assertJobCanTrigger(input: {
  code: string;
  enabled: boolean;
}): SchedulerJobRegistryEntry {
  const entry = requireRegisteredJob(input.code);

  if (!entry.allowManualTrigger) {
    throw schedulerBadRequest(
      'SCHEDULER_JOB_MANUAL_TRIGGER_FORBIDDEN',
      `Job does not allow manual trigger: ${input.code}`,
      { code: input.code },
    );
  }

  if (!input.enabled) {
    throw schedulerBadRequest(
      'SCHEDULER_JOB_DISABLED',
      `Job definition is disabled: ${input.code}`,
      { code: input.code },
    );
  }

  return entry;
}

export function requireRecord<T>(
  record: T | undefined,
  resource: string,
  id: string,
): T {
  if (!record) {
    throw schedulerNotFound(
      'SCHEDULER_RESOURCE_NOT_FOUND',
      `${resource} not found: ${id}`,
      { id, resource },
    );
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

export function normalizeSchedulerWorkerLimit(value: unknown): number {
  const limit = Number(value ?? 20);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw schedulerBadRequest(
      'SCHEDULER_WORKER_LIMIT_INVALID',
      'Scheduler worker limit must be an integer between 1 and 100.',
      { limit, maxLimit: 100, minLimit: 1 },
    );
  }

  return limit;
}

export function normalizeSchedulerRunCleanPolicy(
  query: SchedulerRunCleanQuery = {},
): SchedulerRunCleanPolicy {
  const retentionDays = normalizeSchedulerRunRetentionDays(query.retentionDays);
  const statuses =
    query.status === undefined
      ? terminalRunStatuses
      : normalizeSchedulerRunCleanStatus(query.status);

  return {
    cutoffBefore: new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000),
    retentionDays,
    statuses,
  };
}

function normalizeSchedulerRunRetentionDays(value: unknown): number {
  const retentionDays = Number(value ?? 30);

  if (
    !Number.isInteger(retentionDays) ||
    retentionDays < 0 ||
    retentionDays > 3650
  ) {
    throw schedulerBadRequest(
      'SCHEDULER_RUN_RETENTION_DAYS_INVALID',
      'Scheduler run retentionDays must be an integer between 0 and 3650.',
      { maxRetentionDays: 3650, minRetentionDays: 0, retentionDays },
    );
  }

  return retentionDays;
}

function normalizeSchedulerRunCleanStatus(
  value: SchedulerJobRunLogRecord['status'],
): readonly SchedulerRunTerminalStatus[] {
  if (value === 'completed' || value === 'failed') {
    return [value];
  }

  throw schedulerBadRequest(
    'SCHEDULER_RUN_CLEAN_STATUS_INVALID',
    'Scheduler run cleanup only supports completed or failed terminal runs.',
    { status: value },
  );
}

export function normalizeSchedulerDispatchNow(value: unknown): Date {
  if (value === undefined || value === null || value === '') {
    return new Date();
  }

  if (typeof value !== 'string') {
    throw schedulerBadRequest(
      'SCHEDULER_DISPATCH_NOW_INVALID',
      'Scheduler dispatch now must be an ISO date.',
      { now: value },
    );
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw schedulerBadRequest(
      'SCHEDULER_DISPATCH_NOW_INVALID',
      'Scheduler dispatch now must be an ISO date.',
      { now: value },
    );
  }

  return parsed;
}

export function createSchedulerDispatchTick(now: Date): string {
  const tick = new Date(now);
  tick.setUTCSeconds(0, 0);

  return tick.toISOString();
}

export function isCronDue(cron: string, now: Date): boolean {
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 5 && fields.length !== 6) {
    return false;
  }

  const [second, minute, hour, dayOfMonth, month, dayOfWeek] =
    fields.length === 6 ? fields : ['*', ...fields];

  return (
    matchesCronField(second, now.getUTCSeconds(), 0, 59) &&
    matchesCronField(minute, now.getUTCMinutes(), 0, 59) &&
    matchesCronField(hour, now.getUTCHours(), 0, 23) &&
    matchesCronField(dayOfMonth, now.getUTCDate(), 1, 31) &&
    matchesCronField(month, now.getUTCMonth() + 1, 1, 12) &&
    matchesCronField(dayOfWeek, now.getUTCDay(), 0, 7)
  );
}

function countByStatus<T extends { status: string }>(
  rows: readonly T[],
  status: string,
): number {
  return rows.filter((row) => row.status === status).length;
}

function matchesCronField(
  expression: string,
  value: number,
  min: number,
  max: number,
): boolean {
  return expression
    .split(',')
    .some((part) => matchesCronPart(part.trim(), value, min, max));
}

function matchesCronPart(
  expression: string,
  value: number,
  min: number,
  max: number,
): boolean {
  if (!expression) {
    return false;
  }

  const [rangeExpression, stepExpression] = expression.split('/');
  const step = stepExpression ? Number(stepExpression) : 1;
  if (!Number.isInteger(step) || step < 1) {
    return false;
  }

  const range =
    rangeExpression === '*'
      ? { start: min, end: max }
      : parseCronRange(rangeExpression, min, max);
  if (!range) {
    return false;
  }

  const values = max === 7 && value === 0 ? [0, 7] : [value];

  return values.some(
    (candidate) =>
      candidate >= range.start &&
      candidate <= range.end &&
      (candidate - range.start) % step === 0,
  );
}

function parseCronRange(
  expression: string,
  min: number,
  max: number,
): { start: number; end: number } | undefined {
  const [startExpression, endExpression] = expression.split('-');
  const start = Number(startExpression);
  const end = endExpression === undefined ? start : Number(endExpression);

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < min ||
    end > max ||
    start > end
  ) {
    return undefined;
  }

  return { start, end };
}

function isValidCronExpression(value: string): boolean {
  const fields = value.trim().split(/\s+/);

  if (fields.length !== 5 && fields.length !== 6) {
    return false;
  }

  return fields.every((field) => /^[\d*,/-]+$/.test(field));
}
