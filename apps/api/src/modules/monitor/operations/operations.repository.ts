import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { OnlineUserSummaryDto } from '@opencore/online-user';
import type { SchedulerSummaryDto } from '@opencore/scheduler';
import type {
  CacheNameListDto,
  CacheValueDto,
  DeleteCacheKeyDto,
  CacheKeyPageDto,
  CacheKeyQueryDto,
  ClearCacheDto,
  CreateReportDefinitionDto,
  OperationsSummaryDto,
  ReportQueryDto,
} from './operations.dto';
import type {
  CacheKeyRecord,
  ExportJobDesignRecord,
  ReportDefinitionRecord,
} from './operations.seed';

export type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  scanLimit?: number;
  scanComplete?: boolean;
};

export type CacheClearResult = {
  prefix: string;
  dryRun: boolean;
  matchedKeys: number;
  clearedKeys: number;
  policy: string;
};

export type CacheKeyDeleteResult = {
  key: string;
  dryRun: boolean;
  existed: boolean;
  deleted: boolean;
  policy: string;
};

export abstract class OperationsRepository {
  abstract getSummary(
    scheduler: SchedulerSummaryDto,
    onlineUsers: OnlineUserSummaryDto,
  ): Promise<OperationsSummaryDto>;

  abstract listCacheKeys(query?: CacheKeyQueryDto): Promise<CacheKeyPageDto>;
  abstract listCacheNames(): Promise<CacheNameListDto>;
  abstract getCacheValue(key: string): Promise<CacheValueDto>;
  abstract clearCache(body: ClearCacheDto): Promise<CacheClearResult>;
  abstract deleteCacheKey(
    body: DeleteCacheKeyDto,
  ): Promise<CacheKeyDeleteResult>;

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
  scheduler: SchedulerSummaryDto;
  cacheKeys: readonly CacheKeyRecord[];
  cacheScanLimit?: number;
  cacheScanComplete?: boolean;
  onlineUsers: OnlineUserSummaryDto;
  reports: readonly ReportDefinitionRecord[];
  exportJobDesign: ExportJobDesignRecord;
}): OperationsSummaryDto {
  return {
    jobs: input.scheduler.jobs,
    jobRuns: input.scheduler.jobRuns,
    cache: {
      keyCount: input.cacheKeys.length,
      totalSizeBytes: input.cacheKeys.reduce(
        (total, key) => total + key.sizeBytes,
        0,
      ),
      provider: 'redis',
      scanLimit: input.cacheScanLimit ?? input.cacheKeys.length,
      scanComplete: input.cacheScanComplete ?? true,
    },
    onlineUsers: input.onlineUsers,
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

export function applyCacheClearPolicy(
  keys: readonly CacheKeyRecord[],
  body: ClearCacheDto,
): CacheClearResult {
  const prefix = normalizeCachePrefix(body.prefix);

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

export function applyCacheKeyDeletePolicy(
  keyExists: boolean,
  body: DeleteCacheKeyDto,
): CacheKeyDeleteResult {
  const key = normalizeCacheKey(body.key);
  const dryRun = body.dryRun !== false;

  if (!dryRun && !body.confirmed) {
    throw new BadRequestException(
      'Cache key delete write mode requires confirmed=true.',
    );
  }

  return {
    key,
    dryRun,
    existed: keyExists,
    deleted: !dryRun && keyExists,
    policy: 'single-key delete; dry-run by default; confirmed=true required',
  };
}

export function normalizeCachePrefix(prefix: string): string {
  const normalized = prefix.trim();

  if (!normalized || normalized.length < 3) {
    throw new BadRequestException(
      'Cache clear prefix must be at least 3 chars.',
    );
  }

  if (/[*?[\]]/.test(normalized)) {
    throw new BadRequestException(
      'Cache clear prefix must not contain glob wildcards.',
    );
  }

  return normalized;
}

export function normalizeCacheKey(key: string): string {
  const normalized = key.trim();

  if (!normalized || normalized.length < 3) {
    throw new BadRequestException('Cache key must be at least 3 chars.');
  }

  if (/[\r\n]/.test(normalized)) {
    throw new BadRequestException('Cache key must be a single line.');
  }

  return normalized;
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
