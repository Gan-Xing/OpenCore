import {
  createPageResult,
  normalizeOptionalBoolean,
  normalizeOptionalString,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import {
  SecurityLoginAttemptRecorder,
  type SecurityLoginAttemptRecord,
} from '@opencore/security';
import type { AuditLoginLogRecord } from './audit-login-log.records';

export type AuditLoginLogQuery = PageQueryInput & {
  username?: string;
  success?: boolean | string;
};

export type AuditLoginLogFilters = {
  username?: string;
  success?: boolean;
};

export type AuditLoginLogNormalizedPageQuery = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skip: number;
  take: number;
};

export type AuditLoginLogExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export abstract class AuditLoginLogRepository extends SecurityLoginAttemptRecorder {
  abstract listLoginLogs(
    query?: AuditLoginLogQuery,
  ): Promise<PageResult<AuditLoginLogRecord>>;

  abstract getLoginLog(id: string): Promise<AuditLoginLogRecord>;

  abstract recordLoginAttempt(
    record: SecurityLoginAttemptRecord,
  ): Promise<void>;
}

export function normalizeAuditLoginLogFilters(
  query: AuditLoginLogQuery = {},
): AuditLoginLogFilters {
  return {
    username: normalizeOptionalString(query.username),
    success: normalizeOptionalBoolean(query.success),
  };
}

export function normalizeAuditLoginLogPageQuery(
  query: AuditLoginLogQuery = {},
  total: number,
): AuditLoginLogNormalizedPageQuery {
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

export function createAuditLoginLogPageResult<T>(
  items: readonly T[],
  pagination: AuditLoginLogNormalizedPageQuery,
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

export function createAuditLoginLogExportPreview(
  page: PageResult<unknown>,
): AuditLoginLogExportPreview {
  return {
    filename: 'opencore-login-logs.csv',
    scope: 'current-page',
    columns: ['createdAt', 'username', 'success', 'failureReason'],
    rowCount: page.items.length,
    generatedAt: new Date().toISOString(),
  };
}

export function compareAuditLoginLogRecords(
  left: AuditLoginLogRecord,
  right: AuditLoginLogRecord,
): number {
  return (
    right.createdAt.localeCompare(left.createdAt) ||
    left.id.localeCompare(right.id)
  );
}
