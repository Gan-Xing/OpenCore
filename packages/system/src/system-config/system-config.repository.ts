import { BadRequestException } from '@nestjs/common';
import {
  createPageResult,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import type {
  BatchDeleteSystemConfigsDto,
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
} from './system-config.dto';
import {
  createOpenCoreXlsxWorkbookBase64,
  OPENCORE_XLSX_CONTENT_TYPE,
} from '../export-xlsx';
import type {
  SystemConfigRecord,
  SystemConfigVisibility,
} from './system-config.records';

export type SystemConfigExportPreview = {
  filename: string;
  contentType: string;
  contentBase64: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export type SystemConfigBatchMutationRecord = {
  deleted: true;
  affected: number;
  keys: readonly string[];
};

export type SystemConfigPageQuery = PageQueryInput;

export type SystemConfigNormalizedPageQuery = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skip: number;
  take: number;
};

const SENSITIVE_CONFIG_KEY_PATTERN =
  /(authorization|cookie|password|secret|token)/i;
const REDACTED_SECRET_VALUE = '[REDACTED]';
export const SYSTEM_CONFIG_EXPORT_CONTENT_TYPE = OPENCORE_XLSX_CONTENT_TYPE;
export const SYSTEM_CONFIG_EXPORT_COLUMNS = [
  'category',
  'name',
  'key',
  'value',
  'valueType',
  'visibility',
  'public',
  'description',
  'remark',
] as const;

export abstract class SystemConfigRepository {
  abstract listConfig(
    query?: SystemConfigPageQuery,
  ): Promise<PageResult<SystemConfigRecord>>;

  abstract getConfig(key: string): Promise<SystemConfigRecord>;

  abstract createConfig(
    body: CreateSystemConfigDto,
  ): Promise<SystemConfigRecord>;

  abstract updateConfig(
    key: string,
    body: UpdateSystemConfigDto,
  ): Promise<SystemConfigRecord>;

  abstract deleteConfig(key: string): Promise<{ deleted: true }>;

  abstract deleteConfigs(
    body: BatchDeleteSystemConfigsDto,
  ): Promise<SystemConfigBatchMutationRecord>;
}

export function normalizeSystemConfigPageQuery(
  query: SystemConfigPageQuery = {},
  total: number,
): SystemConfigNormalizedPageQuery {
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

export function createSystemConfigPageResult<T>(
  items: readonly T[],
  pagination: SystemConfigNormalizedPageQuery,
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

export function createSystemConfigExportPreview(
  page: PageResult<SystemConfigRecord>,
): SystemConfigExportPreview {
  const generatedAt = new Date().toISOString();

  return {
    filename: 'opencore-system-config.xlsx',
    contentType: SYSTEM_CONFIG_EXPORT_CONTENT_TYPE,
    contentBase64: createOpenCoreXlsxWorkbookBase64({
      worksheetRows: createSystemConfigExportWorksheetRows(page.items),
      generatedAt,
      sheetName: 'Config',
    }),
    scope: 'current-page',
    columns: SYSTEM_CONFIG_EXPORT_COLUMNS,
    rowCount: page.items.length,
    generatedAt,
  };
}

function createSystemConfigExportWorksheetRows(
  rows: readonly SystemConfigRecord[],
): readonly (readonly string[])[] {
  return [
    SYSTEM_CONFIG_EXPORT_COLUMNS,
    ...rows.map((row) => [
      row.category,
      row.name,
      row.key,
      row.value,
      row.valueType,
      row.visibility,
      row.public ? 'true' : 'false',
      row.description ?? '',
      row.remark ?? '',
    ]),
  ];
}

export function assertSafeConfigKey(
  key: string,
  visibility: SystemConfigVisibility = resolveConfigVisibility({
    key,
    public: false,
  }),
): void {
  if (SENSITIVE_CONFIG_KEY_PATTERN.test(key) && visibility !== 'secret') {
    throw new BadRequestException(
      'Secret-like system config keys must be explicitly marked with secret visibility.',
    );
  }

  if (visibility === 'secret' && !SENSITIVE_CONFIG_KEY_PATTERN.test(key)) {
    throw new BadRequestException(
      'Secret system config visibility requires a secret-like key name.',
    );
  }
}

export function resolveConfigVisibility(input: {
  key: string;
  public?: boolean;
  visibility?: SystemConfigVisibility;
}): SystemConfigVisibility {
  if (input.visibility) {
    return input.visibility;
  }

  return input.public ? 'public' : 'private';
}

export function resolveStoredConfigVisibility(input: {
  key: string;
  public?: boolean;
  visibility?: SystemConfigVisibility;
}): SystemConfigVisibility {
  if (input.visibility) {
    return input.visibility;
  }

  if (SENSITIVE_CONFIG_KEY_PATTERN.test(input.key)) {
    return 'secret';
  }

  return input.public ? 'public' : 'private';
}

export function redactSystemConfig(
  config: SystemConfigRecord,
): SystemConfigRecord {
  const visibility = resolveStoredConfigVisibility(config);

  return {
    ...config,
    public: visibility === 'public',
    visibility,
    value: visibility === 'secret' ? REDACTED_SECRET_VALUE : config.value,
  };
}

export function normalizeConfigCategory(value: unknown): string {
  if (value === undefined || value === null) {
    return 'system';
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('System config category must be a string.');
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException('System config category is required.');
  }

  if (normalized.length > 50) {
    throw new BadRequestException(
      'System config category must not exceed 50 characters.',
    );
  }

  return normalized;
}

export function normalizeConfigName(value: unknown, key: string): string {
  if (value === undefined || value === null) {
    return key;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('System config name must be a string.');
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException('System config name is required.');
  }

  if (normalized.length > 100) {
    throw new BadRequestException(
      'System config name must not exceed 100 characters.',
    );
  }

  return normalized;
}

export function normalizeOptionalConfigText(
  value: unknown,
  fieldName: 'description' | 'remark',
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(
      `System config ${fieldName} must be a string.`,
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length > 500) {
    throw new BadRequestException(
      `System config ${fieldName} must not exceed 500 characters.`,
    );
  }

  return normalized;
}

export function normalizeBatchSystemConfigKeys(
  value: unknown,
): readonly string[] {
  if (!Array.isArray(value)) {
    throw new BadRequestException('System config keys must be an array.');
  }

  if (value.length === 0) {
    throw new BadRequestException('System config keys must not be empty.');
  }

  const normalized = value.map(normalizeSystemConfigKey);
  const duplicate = findFirstDuplicate(normalized);

  if (duplicate) {
    throw new BadRequestException(
      `System config key is duplicated: ${duplicate}`,
    );
  }

  return [...normalized].sort();
}

function normalizeSystemConfigKey(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('System config key must be a string.');
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException('System config key is required.');
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

export function toSystemConfigValueType(
  valueType: string,
): SystemConfigRecord['valueType'] {
  if (
    valueType === 'boolean' ||
    valueType === 'number' ||
    valueType === 'string'
  ) {
    return valueType;
  }

  return 'string';
}
