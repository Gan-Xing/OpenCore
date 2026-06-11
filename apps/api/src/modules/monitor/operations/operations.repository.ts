import { BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  CacheKeyQueryDto,
  ClearCacheDto,
  CreateJobDefinitionDto,
  CreateReportDefinitionDto,
  KickOutSessionDto,
  JobQueryDto,
  JobRunQueryDto,
  OperationsSummaryDto,
  OnlineUserQueryDto,
  ReportQueryDto,
  TriggerJobDto,
  UpdateJobDefinitionDto,
} from './operations.dto';
import type {
  CacheKeyRecord,
  ExportJobDesignRecord,
  JobDefinitionRecord,
  JobRunLogRecord,
  OnlineUserSessionRecord,
  ReportDefinitionRecord,
} from './operations.seed';

export type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CacheClearResult = {
  prefix: string;
  dryRun: boolean;
  matchedKeys: number;
  clearedKeys: number;
  policy: string;
};

export abstract class OperationsRepository {
  abstract getSummary(): Promise<OperationsSummaryDto>;

  abstract listJobs(
    query?: JobQueryDto,
  ): Promise<PageResult<JobDefinitionRecord>>;
  abstract getJob(code: string): Promise<JobDefinitionRecord>;
  abstract createJob(
    body: CreateJobDefinitionDto,
  ): Promise<JobDefinitionRecord>;
  abstract updateJob(
    code: string,
    body: UpdateJobDefinitionDto,
  ): Promise<JobDefinitionRecord>;
  abstract enableJob(code: string): Promise<JobDefinitionRecord>;
  abstract disableJob(code: string): Promise<JobDefinitionRecord>;
  abstract triggerJob(
    code: string,
    body: TriggerJobDto,
  ): Promise<JobRunLogRecord>;
  abstract listJobRuns(
    code: string,
    query?: JobRunQueryDto,
  ): Promise<PageResult<JobRunLogRecord>>;
  abstract getJobRun(code: string, id: string): Promise<JobRunLogRecord>;

  abstract listCacheKeys(
    query?: CacheKeyQueryDto,
  ): Promise<PageResult<CacheKeyRecord>>;
  abstract clearCache(body: ClearCacheDto): Promise<CacheClearResult>;

  abstract listOnlineUsers(
    query?: OnlineUserQueryDto,
  ): Promise<PageResult<OnlineUserSessionRecord>>;
  abstract getOnlineUser(id: string): Promise<OnlineUserSessionRecord>;
  abstract kickOutSession(
    id: string,
    body: KickOutSessionDto,
  ): Promise<OnlineUserSessionRecord>;

  abstract listReports(
    query?: ReportQueryDto,
  ): Promise<PageResult<ReportDefinitionRecord>>;
  abstract getReport(code: string): Promise<ReportDefinitionRecord>;
  abstract createReport(
    body: CreateReportDefinitionDto,
  ): Promise<ReportDefinitionRecord>;
  abstract getExportJobDesign(): ExportJobDesignRecord;
}

export function buildOperationsSummary(input: {
  jobs: readonly JobDefinitionRecord[];
  jobRuns: readonly JobRunLogRecord[];
  cacheKeys: readonly CacheKeyRecord[];
  onlineSessions: readonly OnlineUserSessionRecord[];
  reports: readonly ReportDefinitionRecord[];
  exportJobDesign: ExportJobDesignRecord;
}): OperationsSummaryDto {
  return {
    jobs: {
      total: input.jobs.length,
      enabled: input.jobs.filter((job) => job.enabled).length,
      disabled: input.jobs.filter((job) => !job.enabled).length,
    },
    jobRuns: {
      total: input.jobRuns.length,
      queued: countByStatus(input.jobRuns, 'queued'),
      running: countByStatus(input.jobRuns, 'running'),
      completed: countByStatus(input.jobRuns, 'completed'),
      failed: countByStatus(input.jobRuns, 'failed'),
      latestStartedAt: latestTimestamp(
        input.jobRuns.map((run) => run.startedAt),
      ),
    },
    cache: {
      keyCount: input.cacheKeys.length,
      totalSizeBytes: input.cacheKeys.reduce(
        (total, key) => total + key.sizeBytes,
        0,
      ),
    },
    onlineUsers: {
      total: input.onlineSessions.length,
      active: input.onlineSessions.filter((session) => !session.revokedAt)
        .length,
      revoked: input.onlineSessions.filter((session) => session.revokedAt)
        .length,
    },
    reports: {
      total: input.reports.length,
      enabled: input.reports.filter((report) => report.enabled).length,
      disabled: input.reports.filter((report) => !report.enabled).length,
    },
    exportJobStatus: input.exportJobDesign.status,
  };
}

export function createPage<T>(
  rows: readonly T[],
  query: { page?: number | string; pageSize?: number | string } = {},
): PageResult<T> {
  const page = normalizePositiveInteger(query.page, 1);
  const pageSize = Math.min(normalizePositiveInteger(query.pageSize, 10), 100);
  const total = rows.length;
  const totalPages = Math.ceil(total / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  return {
    items: rows.slice(skip, skip + pageSize).map(clone),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}

export function normalizeOptionalBoolean(
  value: boolean | string | undefined,
): boolean | undefined {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

export function matchesOptional<T>(
  value: T | undefined,
  expected: T | undefined,
): boolean {
  return expected === undefined || value === expected;
}

export function assertSafeJobPolicy(input: {
  retryLimit: number;
  timeoutSeconds: number;
}): void {
  if (input.retryLimit < 0 || input.retryLimit > 10) {
    throw new BadRequestException('Job retry limit must be between 0 and 10.');
  }

  if (input.timeoutSeconds < 1 || input.timeoutSeconds > 3600) {
    throw new BadRequestException(
      'Job timeout must be between 1 and 3600 seconds.',
    );
  }
}

export function assertJobEnabled(input: {
  code: string;
  enabled: boolean;
}): void {
  if (!input.enabled) {
    throw new BadRequestException(`Job definition is disabled: ${input.code}`);
  }
}

export function assertSessionActive(input: {
  id: string;
  revokedAt?: string;
}): void {
  if (input.revokedAt) {
    throw new BadRequestException(
      `Online user session is already revoked: ${input.id}`,
    );
  }
}

export function createManualRunLog(input: {
  jobCode: string;
  actor: string;
  metadata?: Record<string, unknown>;
  index: number;
}): JobRunLogRecord {
  const now = new Date().toISOString();

  return {
    id: `run_${input.jobCode.replace(/[^a-zA-Z0-9]+/g, '_')}_${input.index}`,
    jobCode: input.jobCode,
    status: 'completed',
    trigger: 'manual',
    attempts: 1,
    startedAt: now,
    finishedAt: now,
    metadata: {
      ...(input.metadata ?? {}),
      actor: input.actor,
      adapter: 'bullmq',
    },
  };
}

export function applyCacheClearPolicy(
  keys: readonly CacheKeyRecord[],
  body: ClearCacheDto,
): CacheClearResult {
  const prefix = body.prefix.trim();

  if (!prefix || prefix.length < 3) {
    throw new BadRequestException(
      'Cache clear prefix must be at least 3 chars.',
    );
  }

  const matchedKeys = keys.filter((key) => key.key.startsWith(prefix)).length;
  const dryRun = body.dryRun !== false;

  if (!dryRun && !body.confirmed) {
    throw new BadRequestException(
      'Cache clear write mode requires confirmed=true.',
    );
  }

  return {
    prefix,
    dryRun,
    matchedKeys,
    clearedKeys: dryRun ? 0 : matchedKeys,
    policy: 'prefix-only; dry-run by default; confirmed=true required',
  };
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

function normalizePositiveInteger(
  value: number | string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function countByStatus<T extends { status: string }>(
  rows: readonly T[],
  status: string,
): number {
  return rows.filter((row) => row.status === status).length;
}

function latestTimestamp(values: readonly string[]): string | undefined {
  return values.filter(Boolean).sort((a, b) => b.localeCompare(a))[0];
}
