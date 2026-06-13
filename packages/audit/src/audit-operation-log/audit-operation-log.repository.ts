import { BadRequestException } from '@nestjs/common';
import {
  createPageResult,
  normalizeOptionalString,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import type { BatchDeleteAuditLogsDto } from './audit-operation-log.dto';
import type {
  AuditOperationLogRecord,
  CreateAuditOperationLogRecord,
} from './audit-operation-log.records';

export type AuditOperationLogQuery = PageQueryInput & {
  actorUsername?: string;
  action?: string;
  resource?: string;
};

export type AuditOperationLogFilters = {
  actorUsername?: string;
  action?: string;
  resource?: string;
};

export type AuditOperationLogNormalizedPageQuery = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skip: number;
  take: number;
};

export type AuditOperationLogExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export type AuditOperationLogBatchMutationRecord = {
  deleted: true;
  affected: number;
  ids: readonly string[];
};

export type AuditOperationLogCleanRecord = {
  deleted: true;
  affected: number;
};

export abstract class AuditOperationLogRepository {
  abstract listOperationLogs(
    query?: AuditOperationLogQuery,
  ): Promise<PageResult<AuditOperationLogRecord>>;

  abstract getOperationLog(id: string): Promise<AuditOperationLogRecord>;

  abstract recordOperation(
    record: CreateAuditOperationLogRecord,
  ): Promise<void>;

  abstract deleteOperationLogs(
    body: BatchDeleteAuditLogsDto,
  ): Promise<AuditOperationLogBatchMutationRecord>;

  abstract cleanOperationLogs(): Promise<AuditOperationLogCleanRecord>;
}

export function normalizeAuditOperationLogFilters(
  query: AuditOperationLogQuery = {},
): AuditOperationLogFilters {
  return {
    actorUsername: normalizeOptionalString(query.actorUsername),
    action: normalizeOptionalString(query.action),
    resource: normalizeOptionalString(query.resource),
  };
}

export function normalizeAuditOperationLogPageQuery(
  query: AuditOperationLogQuery = {},
  total: number,
): AuditOperationLogNormalizedPageQuery {
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

export function createAuditOperationLogPageResult<T>(
  items: readonly T[],
  pagination: AuditOperationLogNormalizedPageQuery,
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

export function createAuditOperationLogExportPreview(
  page: PageResult<unknown>,
): AuditOperationLogExportPreview {
  return {
    filename: 'opencore-audit-logs.csv',
    scope: 'current-page',
    columns: ['createdAt', 'actorUsername', 'action', 'resource', 'statusCode'],
    rowCount: page.items.length,
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeBatchDeleteAuditOperationLogIds(
  body: BatchDeleteAuditLogsDto,
): readonly string[] {
  if (!Array.isArray(body?.ids)) {
    throw new BadRequestException('Audit log ids must be an array.');
  }

  if (body.ids.length === 0) {
    throw new BadRequestException('Audit log ids must not be empty.');
  }

  const ids = body.ids.map(normalizeAuditOperationLogId);
  const duplicate = findFirstDuplicate(ids);

  if (duplicate) {
    throw new BadRequestException(`Audit log id is duplicated: ${duplicate}`);
  }

  return [...ids].sort();
}

export function redactAuditMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactAuditMetadata(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key)
          ? '[REDACTED]'
          : redactAuditMetadata(entryValue),
      ]),
    );
  }

  return value;
}

export function compareAuditOperationLogRecords(
  left: AuditOperationLogRecord,
  right: AuditOperationLogRecord,
): number {
  return (
    right.createdAt.localeCompare(left.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

const SENSITIVE_KEY_PATTERN = /(authorization|cookie|password|secret|token)/i;

function normalizeAuditOperationLogId(value: string): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('Audit log id must be a string.');
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException('Audit log id is required.');
  }

  return normalized;
}

function findFirstDuplicate(values: readonly string[]): string | undefined {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
  }

  return undefined;
}
