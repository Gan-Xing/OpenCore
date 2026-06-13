import { BadRequestException } from '@nestjs/common';
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
  type SecurityLoginLogType,
  type SecurityLoginResult,
  type SecurityLoginAttemptRecord,
} from '@opencore/security';
import type { AuditLoginLogRecord } from './audit-login-log.records';

export type AuditLoginLogQuery = PageQueryInput & {
  username?: string;
  logType?: string;
  result?: string;
  success?: boolean | string;
  ip?: string;
  createdFrom?: string;
  createdTo?: string;
};

export type AuditLoginLogFilters = {
  username?: string;
  logType?: SecurityLoginLogType;
  result?: SecurityLoginResult;
  success?: boolean;
  ip?: string;
  createdFrom?: string;
  createdTo?: string;
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

export const AUDIT_LOGIN_LOG_TYPES = [
  'login.mobile',
  'login.sms',
  'login.social',
  'login.username',
  'logout.force',
  'logout.self',
] as const satisfies readonly SecurityLoginLogType[];

export const AUDIT_LOGIN_RESULTS = [
  'bad_credentials',
  'captcha_code_error',
  'captcha_not_found',
  'success',
  'user_disabled',
] as const satisfies readonly SecurityLoginResult[];

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
  const createdFrom = normalizeOptionalIsoDate(
    query.createdFrom,
    'createdFrom',
  );
  const createdTo = normalizeOptionalIsoDate(query.createdTo, 'createdTo');

  if (createdFrom && createdTo && createdFrom > createdTo) {
    throw new BadRequestException(
      'createdFrom must be earlier than or equal to createdTo',
    );
  }

  return {
    username: normalizeOptionalString(query.username),
    logType: normalizeOptionalLoginLogType(query.logType),
    result: normalizeOptionalLoginResult(query.result),
    success: normalizeOptionalBoolean(query.success),
    ip: normalizeOptionalString(query.ip),
    createdFrom,
    createdTo,
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
    columns: [
      'createdAt',
      'username',
      'logType',
      'result',
      'success',
      'failureReason',
      'ip',
      'browser',
      'os',
    ],
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

function normalizeOptionalIsoDate(
  value: unknown,
  fieldName: string,
): string | undefined {
  const normalized = normalizeOptionalString(value);

  if (normalized === undefined) {
    return undefined;
  }

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(
      `${fieldName} must be a valid ISO date-time string`,
    );
  }

  return date.toISOString();
}

function normalizeOptionalLoginLogType(
  value: unknown,
): SecurityLoginLogType | undefined {
  return normalizeOptionalEnumValue(value, AUDIT_LOGIN_LOG_TYPES, 'logType');
}

function normalizeOptionalLoginResult(
  value: unknown,
): SecurityLoginResult | undefined {
  return normalizeOptionalEnumValue(value, AUDIT_LOGIN_RESULTS, 'result');
}

function normalizeOptionalEnumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string,
): T | undefined {
  const normalized = normalizeOptionalString(value);

  if (normalized === undefined) {
    return undefined;
  }

  if (!allowed.includes(normalized as T)) {
    throw new BadRequestException(
      `${fieldName} must be one of: ${allowed.join(', ')}`,
    );
  }

  return normalized as T;
}
