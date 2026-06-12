import {
  createPageResult,
  normalizeOptionalString,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
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

export abstract class AuditOperationLogRepository {
  abstract listOperationLogs(
    query?: AuditOperationLogQuery,
  ): Promise<PageResult<AuditOperationLogRecord>>;

  abstract getOperationLog(id: string): Promise<AuditOperationLogRecord>;

  abstract recordOperation(
    record: CreateAuditOperationLogRecord,
  ): Promise<void>;
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
