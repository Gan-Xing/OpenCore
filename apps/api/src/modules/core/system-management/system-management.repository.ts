import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type {
  CreateDictTypeDto,
  CreateFileAssetDto,
  CreateSystemConfigDto,
  PageQueryDto,
  UpdateDictTypeDto,
  UpdateFileAssetDto,
  UpdateSystemConfigDto,
} from './system-management.dto';
import type {
  AuditLogRecord,
  DictTypeRecord,
  FileAssetRecord,
  LoginLogRecord,
  SystemConfigRecord,
} from './system-management.seed';

export type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: string[];
  rowCount: number;
  generatedAt: string;
};

export type SystemManagementExportResource =
  | 'audit-logs'
  | 'config'
  | 'dicts'
  | 'files'
  | 'login-logs';

export type NormalizedPageQuery = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skip: number;
  take: number;
};

const SENSITIVE_KEY_PATTERN = /(authorization|cookie|password|secret|token)/i;
const REDACTED_SECRET_VALUE = '[REDACTED]';

export abstract class SystemManagementRepository {
  abstract listDicts(query?: PageQueryDto): Promise<PageResult<DictTypeRecord>>;

  abstract createDict(body: CreateDictTypeDto): Promise<DictTypeRecord>;

  abstract updateDict(
    code: string,
    body: UpdateDictTypeDto,
  ): Promise<DictTypeRecord>;

  abstract deleteDict(code: string): Promise<{ deleted: true }>;

  abstract listConfig(
    query?: PageQueryDto,
  ): Promise<PageResult<SystemConfigRecord>>;

  abstract createConfig(
    body: CreateSystemConfigDto,
  ): Promise<SystemConfigRecord>;

  abstract updateConfig(
    key: string,
    body: UpdateSystemConfigDto,
  ): Promise<SystemConfigRecord>;

  abstract deleteConfig(key: string): Promise<{ deleted: true }>;

  abstract listFiles(
    query?: PageQueryDto,
  ): Promise<PageResult<FileAssetRecord>>;

  abstract createFileAsset(body: CreateFileAssetDto): Promise<FileAssetRecord>;

  abstract updateFileAsset(
    id: string,
    body: UpdateFileAssetDto,
  ): Promise<FileAssetRecord>;

  abstract deleteFile(id: string): Promise<{ deleted: true }>;

  abstract listAuditLogs(
    query?: PageQueryDto,
  ): Promise<PageResult<AuditLogRecord>>;

  abstract listLoginLogs(
    query?: PageQueryDto,
  ): Promise<PageResult<LoginLogRecord>>;

  abstract createExportPreview(
    resource: SystemManagementExportResource,
    query?: PageQueryDto,
  ): Promise<ExportPreview>;
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

export function createPage<T>(
  rows: readonly T[],
  query: PageQueryDto = {},
): PageResult<T> {
  const pagination = normalizePageQuery(query, rows.length);
  const pageRows = rows.slice(
    pagination.skip,
    pagination.skip + pagination.take,
  );

  return createPageResult(
    pageRows.map((row) => clone(row)),
    pagination,
  );
}

export function normalizePageQuery(
  query: PageQueryDto = {},
  total: number,
): NormalizedPageQuery {
  const page = normalizePositiveInteger(query.page, 1);
  const pageSize = Math.min(normalizePositiveInteger(query.pageSize, 10), 100);
  const totalPages = Math.ceil(total / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    skip,
    take: pageSize,
  };
}

export function createPageResult<T>(
  items: readonly T[],
  pagination: NormalizedPageQuery,
): PageResult<T> {
  return {
    items: [...items],
    page: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    totalPages: pagination.totalPages,
  };
}

export function createExportPreview(
  resource: SystemManagementExportResource,
  page: PageResult<unknown>,
): ExportPreview {
  return {
    filename: `opencore-${resource}.csv`,
    scope: 'current-page',
    columns: [...exportColumnsByResource[resource]],
    rowCount: page.items.length,
    generatedAt: new Date().toISOString(),
  };
}

export function createStorageKey(
  body: CreateFileAssetDto,
  prefix = 'runtime/',
): string {
  const digest = createHash('sha256')
    .update(`${body.originalName}:${body.mimeType}:${body.sizeBytes}`)
    .digest('hex')
    .slice(0, 16);

  return `${normalizeObjectPrefix(prefix)}file-assets/${digest}-${sanitizeFileName(
    body.originalName,
  )}`;
}

export function assertSafeConfigKey(
  key: string,
  visibility: SystemConfigRecord['visibility'] = resolveConfigVisibility({
    key,
    public: false,
  }),
): void {
  if (SENSITIVE_KEY_PATTERN.test(key) && visibility !== 'secret') {
    throw new BadRequestException(
      'Secret-like system config keys must be explicitly marked with secret visibility.',
    );
  }

  if (visibility === 'secret' && !SENSITIVE_KEY_PATTERN.test(key)) {
    throw new BadRequestException(
      'Secret system config visibility requires a secret-like key name.',
    );
  }
}

export function resolveConfigVisibility(input: {
  key: string;
  public?: boolean;
  visibility?: SystemConfigRecord['visibility'];
}): SystemConfigRecord['visibility'] {
  if (input.visibility) {
    return input.visibility;
  }

  return input.public ? 'public' : 'private';
}

export function resolveStoredConfigVisibility(input: {
  key: string;
  public?: boolean;
  visibility?: SystemConfigRecord['visibility'];
}): SystemConfigRecord['visibility'] {
  if (input.visibility) {
    return input.visibility;
  }

  if (SENSITIVE_KEY_PATTERN.test(input.key)) {
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

export function assertSafeFileAsset(body: CreateFileAssetDto): void {
  if (!body.originalName.trim() || body.originalName.includes('/')) {
    throw new BadRequestException('File name must be a plain file name.');
  }

  if (body.sizeBytes <= 0) {
    throw new BadRequestException('File size must be positive.');
  }
}

function normalizePositiveInteger(
  value: number | string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function normalizeObjectPrefix(prefix: string): string {
  const trimmed = prefix.trim();

  if (!trimmed) {
    return '';
  }

  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const exportColumnsByResource = {
  'audit-logs': [
    'createdAt',
    'actorUsername',
    'action',
    'resource',
    'statusCode',
  ],
  config: ['key', 'valueType', 'visibility'],
  dicts: ['code', 'name', 'enabled'],
  files: ['originalName', 'mimeType', 'sizeBytes', 'storageKey'],
  'login-logs': ['createdAt', 'username', 'success', 'failureReason'],
} as const;
