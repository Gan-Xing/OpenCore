import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { loadRuntimeConfig } from '../../../platform/config/runtime-config';
import { PrismaService } from '../../../platform/database/prisma.service';
import type {
  CreateDictTypeDto,
  CreateFileAssetDto,
  CreateSystemConfigDto,
  PageQueryDto,
  UpdateDictTypeDto,
  UpdateSystemConfigDto,
} from './system-management.dto';
import type {
  AuditLogRecord,
  DictItemRecord,
  DictTypeRecord,
  FileAssetRecord,
  LoginLogRecord,
  SystemConfigRecord,
} from './system-management.seed';
import {
  assertSafeConfigKey,
  assertSafeFileAsset,
  createExportPreview,
  createPageResult,
  createStorageKey,
  normalizePageQuery,
  redactAuditMetadata,
  SystemManagementRepository,
  type ExportPreview,
  type PageResult,
  type SystemManagementExportResource,
} from './system-management.repository';

type PrismaDictTypeWithItems = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  enabled: boolean;
  items: PrismaDictItem[];
};

type PrismaDictItem = {
  id: string;
  label: string;
  value: string;
  sort: number;
  enabled: boolean;
};

type PrismaSystemConfig = {
  id: string;
  key: string;
  value: string;
  valueType: string;
  description: string | null;
  public: boolean;
};

type PrismaFileAsset = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  checksum: string | null;
  uploadedBy: string;
  createdAt: Date;
};

type PrismaAuditLog = {
  id: string;
  actorUsername: string;
  action: string;
  resource: string;
  resourceId: string | null;
  method: string;
  path: string;
  statusCode: number;
  ip: string;
  userAgent: string;
  requestId: string;
  metadata: unknown;
  createdAt: Date;
};

type PrismaLoginLog = {
  id: string;
  username: string;
  success: boolean;
  failureReason: string | null;
  ip: string;
  userAgent: string;
  requestId: string;
  createdAt: Date;
};

@Injectable()
export class PrismaSystemManagementRepository extends SystemManagementRepository {
  private readonly storagePrefix = loadRuntimeConfig().s3.prefix;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listDicts(
    query: PageQueryDto = {},
  ): Promise<PageResult<DictTypeRecord>> {
    const total = await this.prisma.dictType.count();
    const pagination = normalizePageQuery(query, total);
    const rows = await this.prisma.dictType.findMany({
      include: {
        items: {
          orderBy: [{ sort: 'asc' }, { value: 'asc' }],
        },
      },
      orderBy: [{ createdAt: 'desc' }, { code: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createPageResult(rows.map(toDictTypeRecord), pagination);
  }

  async createDict(body: CreateDictTypeDto): Promise<DictTypeRecord> {
    if (await this.prisma.dictType.findUnique({ where: { code: body.code } })) {
      throw new ConflictException(`Dictionary already exists: ${body.code}`);
    }

    const dict = await this.prisma.dictType.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        enabled: body.enabled ?? true,
        items: {
          create: (body.items ?? []).map((item) => ({
            id: item.id,
            label: item.label,
            value: item.value,
            sort: item.sort,
            enabled: item.enabled,
          })),
        },
      },
      include: { items: { orderBy: [{ sort: 'asc' }, { value: 'asc' }] } },
    });

    return toDictTypeRecord(dict);
  }

  async updateDict(
    code: string,
    body: UpdateDictTypeDto,
  ): Promise<DictTypeRecord> {
    const existing = await this.findDictByCode(code);

    const dict = await this.prisma.dictType.update({
      where: { code },
      data: {
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        enabled: body.enabled ?? existing.enabled,
        ...(body.items
          ? {
              items: {
                deleteMany: {},
                create: body.items.map((item) => ({
                  id: item.id,
                  label: item.label,
                  value: item.value,
                  sort: item.sort,
                  enabled: item.enabled,
                })),
              },
            }
          : {}),
      },
      include: { items: { orderBy: [{ sort: 'asc' }, { value: 'asc' }] } },
    });

    return toDictTypeRecord(dict);
  }

  async deleteDict(code: string): Promise<{ deleted: true }> {
    await this.findDictByCode(code);
    await this.prisma.dictType.delete({ where: { code } });
    return { deleted: true };
  }

  async listConfig(
    query: PageQueryDto = {},
  ): Promise<PageResult<SystemConfigRecord>> {
    const total = await this.prisma.systemConfig.count();
    const pagination = normalizePageQuery(query, total);
    const rows = await this.prisma.systemConfig.findMany({
      orderBy: [{ createdAt: 'desc' }, { key: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createPageResult(rows.map(toSystemConfigRecord), pagination);
  }

  async createConfig(body: CreateSystemConfigDto): Promise<SystemConfigRecord> {
    assertSafeConfigKey(body.key);

    if (
      await this.prisma.systemConfig.findUnique({ where: { key: body.key } })
    ) {
      throw new ConflictException(`System config already exists: ${body.key}`);
    }

    const config = await this.prisma.systemConfig.create({
      data: {
        key: body.key,
        value: body.value,
        valueType: body.valueType,
        description: body.description,
        public: body.public ?? false,
      },
    });

    return toSystemConfigRecord(config);
  }

  async updateConfig(
    key: string,
    body: UpdateSystemConfigDto,
  ): Promise<SystemConfigRecord> {
    assertSafeConfigKey(key);
    const existing = await this.findConfigByKey(key);
    const config = await this.prisma.systemConfig.update({
      where: { key },
      data: {
        value: body.value ?? existing.value,
        valueType: body.valueType ?? existing.valueType,
        description: body.description ?? existing.description,
        public: body.public ?? existing.public,
      },
    });

    return toSystemConfigRecord(config);
  }

  async deleteConfig(key: string): Promise<{ deleted: true }> {
    await this.findConfigByKey(key);
    await this.prisma.systemConfig.delete({ where: { key } });
    return { deleted: true };
  }

  async listFiles(
    query: PageQueryDto = {},
  ): Promise<PageResult<FileAssetRecord>> {
    const total = await this.prisma.fileAsset.count();
    const pagination = normalizePageQuery(query, total);
    const rows = await this.prisma.fileAsset.findMany({
      orderBy: [{ createdAt: 'desc' }, { originalName: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createPageResult(rows.map(toFileAssetRecord), pagination);
  }

  async createFileAsset(body: CreateFileAssetDto): Promise<FileAssetRecord> {
    assertSafeFileAsset(body);

    const storageKey = createStorageKey(body, this.storagePrefix);

    if (await this.prisma.fileAsset.findUnique({ where: { storageKey } })) {
      throw new ConflictException(`File asset already exists: ${storageKey}`);
    }

    const file = await this.prisma.fileAsset.create({
      data: {
        originalName: body.originalName,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        storageKey,
        checksum: body.checksum,
        uploadedBy: body.uploadedBy,
      },
    });

    return toFileAssetRecord(file);
  }

  async deleteFile(id: string): Promise<{ deleted: true }> {
    if (!(await this.prisma.fileAsset.findUnique({ where: { id } }))) {
      throw new NotFoundException(`File asset not found: ${id}`);
    }

    await this.prisma.fileAsset.delete({ where: { id } });
    return { deleted: true };
  }

  async listAuditLogs(
    query: PageQueryDto = {},
  ): Promise<PageResult<AuditLogRecord>> {
    const total = await this.prisma.auditLog.count();
    const pagination = normalizePageQuery(query, total);
    const rows = await this.prisma.auditLog.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createPageResult(rows.map(toAuditLogRecord), pagination);
  }

  async listLoginLogs(
    query: PageQueryDto = {},
  ): Promise<PageResult<LoginLogRecord>> {
    const total = await this.prisma.loginLog.count();
    const pagination = normalizePageQuery(query, total);
    const rows = await this.prisma.loginLog.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createPageResult(rows.map(toLoginLogRecord), pagination);
  }

  async createExportPreview(
    resource: SystemManagementExportResource,
    query: PageQueryDto = {},
  ): Promise<ExportPreview> {
    const pageByResource = {
      'audit-logs': this.listAuditLogs(query),
      config: this.listConfig(query),
      dicts: this.listDicts(query),
      files: this.listFiles(query),
      'login-logs': this.listLoginLogs(query),
    } satisfies Record<
      SystemManagementExportResource,
      Promise<PageResult<unknown>>
    >;

    return createExportPreview(resource, await pageByResource[resource]);
  }

  private async findDictByCode(code: string): Promise<PrismaDictTypeWithItems> {
    const dict = await this.prisma.dictType.findUnique({
      where: { code },
      include: { items: { orderBy: [{ sort: 'asc' }, { value: 'asc' }] } },
    });

    if (!dict) {
      throw new NotFoundException(`Dictionary not found: ${code}`);
    }

    return dict;
  }

  private async findConfigByKey(key: string): Promise<PrismaSystemConfig> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config) {
      throw new NotFoundException(`System config not found: ${key}`);
    }

    return config;
  }
}

function toDictTypeRecord(dict: PrismaDictTypeWithItems): DictTypeRecord {
  return {
    id: dict.id,
    code: dict.code,
    name: dict.name,
    description: dict.description ?? undefined,
    enabled: dict.enabled,
    items: dict.items.map(toDictItemRecord),
  };
}

function toDictItemRecord(item: PrismaDictItem): DictItemRecord {
  return {
    id: item.id,
    label: item.label,
    value: item.value,
    sort: item.sort,
    enabled: item.enabled,
  };
}

function toSystemConfigRecord(config: PrismaSystemConfig): SystemConfigRecord {
  return {
    id: config.id,
    key: config.key,
    value: config.value,
    valueType: toSystemConfigValueType(config.valueType),
    description: config.description ?? undefined,
    public: config.public,
  };
}

function toSystemConfigValueType(
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

function toFileAssetRecord(file: PrismaFileAsset): FileAssetRecord {
  return {
    id: file.id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    storageKey: file.storageKey,
    checksum: file.checksum ?? undefined,
    uploadedBy: file.uploadedBy,
    createdAt: file.createdAt.toISOString(),
  };
}

function toAuditLogRecord(log: PrismaAuditLog): AuditLogRecord {
  return {
    id: log.id,
    actorUsername: log.actorUsername,
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId ?? undefined,
    method: log.method,
    path: log.path,
    statusCode: log.statusCode,
    ip: log.ip,
    userAgent: log.userAgent,
    requestId: log.requestId,
    metadata: redactAuditMetadata(log.metadata),
    createdAt: log.createdAt.toISOString(),
  };
}

function toLoginLogRecord(log: PrismaLoginLog): LoginLogRecord {
  return {
    id: log.id,
    username: log.username,
    success: log.success,
    failureReason: log.failureReason ?? undefined,
    ip: log.ip,
    userAgent: log.userAgent,
    requestId: log.requestId,
    createdAt: log.createdAt.toISOString(),
  };
}
