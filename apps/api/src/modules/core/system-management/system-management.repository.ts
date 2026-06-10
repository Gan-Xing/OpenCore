import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type {
  CreateDictTypeDto,
  CreateFileAssetDto,
  CreateSystemConfigDto,
  PageQueryDto,
  UpdateDictTypeDto,
  UpdateSystemConfigDto,
} from './system-management.dto';
import {
  seedAuditLogs,
  seedDictTypes,
  seedFileAssets,
  seedLoginLogs,
  seedSystemConfigs,
  type AuditLogRecord,
  type DictTypeRecord,
  type FileAssetRecord,
  type LoginLogRecord,
  type SystemConfigRecord,
} from './system-management.seed';

type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type ExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: string[];
  rowCount: number;
  generatedAt: string;
};

const SENSITIVE_KEY_PATTERN = /(authorization|cookie|password|secret|token)/i;

@Injectable()
export class SystemManagementRepository {
  private dictTypes = seedDictTypes.map(cloneDictType);
  private systemConfigs = seedSystemConfigs.map((config) => ({ ...config }));
  private fileAssets = seedFileAssets.map((file) => ({ ...file }));
  private readonly auditLogs = seedAuditLogs.map((log) => ({ ...log }));
  private readonly loginLogs = seedLoginLogs.map((log) => ({ ...log }));

  listDicts(query: PageQueryDto = {}): PageResult<DictTypeRecord> {
    return createPage(this.dictTypes, query);
  }

  createDict(body: CreateDictTypeDto): DictTypeRecord {
    if (this.dictTypes.some((dict) => dict.code === body.code)) {
      throw new ConflictException(`Dictionary already exists: ${body.code}`);
    }

    const dict: DictTypeRecord = {
      id: `dict_${body.code.replaceAll('.', '_')}`,
      code: body.code,
      name: body.name,
      description: body.description,
      enabled: body.enabled ?? true,
      items: body.items ?? [],
    };
    this.dictTypes = [dict, ...this.dictTypes];
    return cloneDictType(dict);
  }

  updateDict(code: string, body: UpdateDictTypeDto): DictTypeRecord {
    const dict = this.findDict(code);
    Object.assign(dict, {
      name: body.name ?? dict.name,
      description: body.description ?? dict.description,
      enabled: body.enabled ?? dict.enabled,
      items: body.items ?? dict.items,
    });
    return cloneDictType(dict);
  }

  deleteDict(code: string): { deleted: true } {
    this.findDict(code);
    this.dictTypes = this.dictTypes.filter((dict) => dict.code !== code);
    return { deleted: true };
  }

  listConfig(query: PageQueryDto = {}): PageResult<SystemConfigRecord> {
    return createPage(this.systemConfigs, query);
  }

  createConfig(body: CreateSystemConfigDto): SystemConfigRecord {
    assertSafeConfigKey(body.key);

    if (this.systemConfigs.some((config) => config.key === body.key)) {
      throw new ConflictException(`System config already exists: ${body.key}`);
    }

    const config: SystemConfigRecord = {
      id: `config_${body.key.replaceAll('.', '_')}`,
      key: body.key,
      value: body.value,
      valueType: body.valueType,
      description: body.description,
      public: body.public ?? false,
    };
    this.systemConfigs = [config, ...this.systemConfigs];
    return { ...config };
  }

  updateConfig(key: string, body: UpdateSystemConfigDto): SystemConfigRecord {
    assertSafeConfigKey(key);
    const config = this.findConfig(key);
    Object.assign(config, {
      value: body.value ?? config.value,
      valueType: body.valueType ?? config.valueType,
      description: body.description ?? config.description,
      public: body.public ?? config.public,
    });
    return { ...config };
  }

  deleteConfig(key: string): { deleted: true } {
    this.findConfig(key);
    this.systemConfigs = this.systemConfigs.filter(
      (config) => config.key !== key,
    );
    return { deleted: true };
  }

  listFiles(query: PageQueryDto = {}): PageResult<FileAssetRecord> {
    return createPage(this.fileAssets, query);
  }

  createFileAsset(body: CreateFileAssetDto): FileAssetRecord {
    if (!body.originalName.trim() || body.originalName.includes('/')) {
      throw new BadRequestException('File name must be a plain file name.');
    }

    if (body.sizeBytes <= 0) {
      throw new BadRequestException('File size must be positive.');
    }

    const storageKey = createStorageKey(body);
    const file: FileAssetRecord = {
      id: `file_${storageKey.slice(-12)}`,
      originalName: body.originalName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      storageKey,
      checksum: body.checksum,
      uploadedBy: body.uploadedBy,
      createdAt: new Date().toISOString(),
    };
    this.fileAssets = [file, ...this.fileAssets];
    return { ...file };
  }

  deleteFile(id: string): { deleted: true } {
    if (!this.fileAssets.some((file) => file.id === id)) {
      throw new NotFoundException(`File asset not found: ${id}`);
    }

    this.fileAssets = this.fileAssets.filter((file) => file.id !== id);
    return { deleted: true };
  }

  listAuditLogs(query: PageQueryDto = {}): PageResult<AuditLogRecord> {
    return createPage(
      this.auditLogs.map((log) => ({
        ...log,
        metadata: redactAuditMetadata(log.metadata),
      })),
      query,
    );
  }

  listLoginLogs(query: PageQueryDto = {}): PageResult<LoginLogRecord> {
    return createPage(this.loginLogs, query);
  }

  createExportPreview(
    resource: 'audit-logs' | 'config' | 'dicts' | 'files' | 'login-logs',
    query: PageQueryDto = {},
  ): ExportPreview {
    const pageByResource = {
      'audit-logs': this.listAuditLogs(query),
      config: this.listConfig(query),
      dicts: this.listDicts(query),
      files: this.listFiles(query),
      'login-logs': this.listLoginLogs(query),
    } satisfies Record<typeof resource, PageResult<unknown>>;

    return {
      filename: `opencore-${resource}.csv`,
      scope: 'current-page',
      columns: [...exportColumnsByResource[resource]],
      rowCount: pageByResource[resource].items.length,
      generatedAt: new Date().toISOString(),
    };
  }

  private findDict(code: string): DictTypeRecord {
    const dict = this.dictTypes.find((candidate) => candidate.code === code);

    if (!dict) {
      throw new NotFoundException(`Dictionary not found: ${code}`);
    }

    return dict;
  }

  private findConfig(key: string): SystemConfigRecord {
    const config = this.systemConfigs.find(
      (candidate) => candidate.key === key,
    );

    if (!config) {
      throw new NotFoundException(`System config not found: ${key}`);
    }

    return config;
  }
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

function createPage<T>(
  rows: readonly T[],
  query: PageQueryDto = {},
): PageResult<T> {
  const page = normalizePositiveInteger(query.page, 1);
  const pageSize = Math.min(normalizePositiveInteger(query.pageSize, 10), 100);
  const total = rows.length;
  const totalPages = Math.ceil(total / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: rows.slice(start, start + pageSize).map((row) => clone(row)),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}

function normalizePositiveInteger(
  value: number | string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function createStorageKey(body: CreateFileAssetDto): string {
  const digest = createHash('sha256')
    .update(`${body.originalName}:${body.mimeType}:${body.sizeBytes}`)
    .digest('hex')
    .slice(0, 16);

  return `file-assets/${digest}-${sanitizeFileName(body.originalName)}`;
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function assertSafeConfigKey(key: string): void {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    throw new BadRequestException(
      'System config keys must not store secrets, tokens, passwords, or credentials.',
    );
  }
}

function cloneDictType(dict: DictTypeRecord): DictTypeRecord {
  return {
    ...dict,
    items: dict.items.map((item) => ({ ...item })),
  };
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
  config: ['key', 'value', 'valueType', 'public'],
  dicts: ['code', 'name', 'enabled'],
  files: ['originalName', 'mimeType', 'sizeBytes', 'storageKey'],
  'login-logs': ['createdAt', 'username', 'success', 'failureReason'],
} as const;
