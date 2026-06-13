import { BadRequestException } from '@nestjs/common';
import {
  createPageResult,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import type {
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
} from './system-config.dto';
import type {
  SystemConfigRecord,
  SystemConfigVisibility,
} from './system-config.records';

export type SystemConfigExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: string[];
  rowCount: number;
  generatedAt: string;
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
  page: PageResult<unknown>,
): SystemConfigExportPreview {
  return {
    filename: 'opencore-config.csv',
    scope: 'current-page',
    columns: ['category', 'name', 'key', 'valueType', 'visibility', 'remark'],
    rowCount: page.items.length,
    generatedAt: new Date().toISOString(),
  };
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
