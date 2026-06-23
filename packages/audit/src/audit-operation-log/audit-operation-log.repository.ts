import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  createApiErrorBody,
  createPageResult,
  normalizeOptionalString,
  normalizePagination,
  parseIpLocation,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import type {
  BatchDeleteAuditLogsDto,
  CleanAuditLogsDto,
} from './audit-operation-log.dto';
import type {
  AuditOperationLogRecord,
  CreateAuditOperationLogRecord,
} from './audit-operation-log.records';

export type AuditOperationLogQuery = PageQueryInput & {
  actorUsername?: string;
  action?: string;
  createdFrom?: string;
  createdTo?: string;
  location?: string;
  maxDurationMs?: number | string;
  minDurationMs?: number | string;
  resource?: string;
  status?: 'error' | 'success';
};

export type AuditOperationLogFilters = {
  actorUsername?: string;
  action?: string;
  createdFrom?: Date;
  createdTo?: Date;
  location?: string;
  maxDurationMs?: number;
  minDurationMs?: number;
  resource?: string;
  status?: 'error' | 'success';
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
  cutoffBefore: string;
  retentionDays: number;
};

export type AuditOperationLogRetentionPolicy = {
  cutoffBefore: Date;
  retentionDays: number;
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

  abstract cleanOperationLogs(
    policy?: CleanAuditLogsDto,
  ): Promise<AuditOperationLogCleanRecord>;
}

export function auditOperationLogBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

export function auditOperationLogNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, message, details }));
}

export function normalizeAuditOperationLogFilters(
  query: AuditOperationLogQuery = {},
): AuditOperationLogFilters {
  const minDurationMs = normalizeOptionalDurationMs(
    query.minDurationMs,
    'minDurationMs',
  );
  const maxDurationMs = normalizeOptionalDurationMs(
    query.maxDurationMs,
    'maxDurationMs',
  );

  if (
    minDurationMs !== undefined &&
    maxDurationMs !== undefined &&
    minDurationMs > maxDurationMs
  ) {
    throw auditOperationLogBadRequest(
      'AUDIT_OPERATION_DURATION_RANGE_INVALID',
      'Audit log minDurationMs must not exceed maxDurationMs.',
      { maxDurationMs, minDurationMs },
    );
  }

  return {
    actorUsername: normalizeOptionalString(query.actorUsername),
    action: normalizeOptionalString(query.action),
    createdFrom: normalizeOptionalIsoDate(query.createdFrom, 'createdFrom'),
    createdTo: normalizeOptionalIsoDate(query.createdTo, 'createdTo'),
    location: normalizeOptionalString(query.location),
    maxDurationMs,
    minDurationMs,
    resource: normalizeOptionalString(query.resource),
    status: normalizeOptionalAuditOperationLogStatus(query.status),
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
    columns: [
      'createdAt',
      'tenantId',
      'actorUsername',
      'action',
      'resource',
      'statusCode',
      'durationMs',
      'location',
    ],
    rowCount: page.items.length,
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeAuditOperationLogRetentionPolicy(
  policy: CleanAuditLogsDto = {},
  now = new Date(),
): AuditOperationLogRetentionPolicy {
  const retentionDays = normalizeRetentionDays(policy.retentionDays);
  const cutoffBefore = new Date(
    now.getTime() - retentionDays * 24 * 60 * 60 * 1000,
  );

  return {
    cutoffBefore,
    retentionDays,
  };
}

export function resolveAuditOperationLogLocation(ip: string): string {
  return parseIpLocation(ip);
}

export function normalizeBatchDeleteAuditOperationLogIds(
  body: BatchDeleteAuditLogsDto,
): readonly string[] {
  if (!Array.isArray(body?.ids)) {
    throw auditOperationLogBadRequest(
      'AUDIT_OPERATION_IDS_INVALID',
      'Audit log ids must be an array.',
    );
  }

  if (body.ids.length === 0) {
    throw auditOperationLogBadRequest(
      'AUDIT_OPERATION_IDS_EMPTY',
      'Audit log ids must not be empty.',
    );
  }

  const ids = body.ids.map(normalizeAuditOperationLogId);
  const duplicate = findFirstDuplicate(ids);

  if (duplicate) {
    throw auditOperationLogBadRequest(
      'AUDIT_OPERATION_ID_DUPLICATED',
      `Audit log id is duplicated: ${duplicate}`,
      { id: duplicate },
    );
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
const DEFAULT_RETENTION_DAYS = 90;
const MAX_RETENTION_DAYS = 3650;

function normalizeAuditOperationLogId(value: string): string {
  if (typeof value !== 'string') {
    throw auditOperationLogBadRequest(
      'AUDIT_OPERATION_ID_INVALID_TYPE',
      'Audit log id must be a string.',
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    throw auditOperationLogBadRequest(
      'AUDIT_OPERATION_ID_REQUIRED',
      'Audit log id is required.',
    );
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

function normalizeOptionalAuditOperationLogStatus(
  value: unknown,
): 'error' | 'success' | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value !== 'error' && value !== 'success') {
    throw auditOperationLogBadRequest(
      'AUDIT_OPERATION_STATUS_FILTER_INVALID',
      'Audit log status filter must be "success" or "error".',
      { status: value },
    );
  }

  return value;
}

function normalizeOptionalDurationMs(
  value: unknown,
  fieldName: 'maxDurationMs' | 'minDurationMs',
): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized < 0) {
    throw auditOperationLogBadRequest(
      'AUDIT_OPERATION_DURATION_INVALID',
      `Audit log ${fieldName} must be a non-negative integer.`,
      { fieldName, value },
    );
  }

  return normalized;
}

function normalizeOptionalIsoDate(
  value: unknown,
  fieldName: 'createdFrom' | 'createdTo',
): Date | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw auditOperationLogBadRequest(
      'AUDIT_OPERATION_DATE_INVALID',
      `Audit log ${fieldName} must be an ISO datetime string.`,
      { fieldName, value },
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw auditOperationLogBadRequest(
      'AUDIT_OPERATION_DATE_INVALID',
      `Audit log ${fieldName} must be an ISO datetime string.`,
      { fieldName, value },
    );
  }

  return date;
}

function normalizeRetentionDays(value: unknown): number {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_RETENTION_DAYS;
  }

  const normalized = Number(value);

  if (
    !Number.isInteger(normalized) ||
    normalized < 0 ||
    normalized > MAX_RETENTION_DAYS
  ) {
    throw auditOperationLogBadRequest(
      'AUDIT_OPERATION_RETENTION_DAYS_INVALID',
      `Audit log retentionDays must be an integer between 0 and ${MAX_RETENTION_DAYS}.`,
      {
        maxRetentionDays: MAX_RETENTION_DAYS,
        minRetentionDays: 0,
        retentionDays: value,
      },
    );
  }

  return normalized;
}
