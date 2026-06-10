import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import {
  assertSafeConfigKey,
  assertSafeFileAsset,
  createExportPreview,
  createPage,
  createStorageKey,
  redactAuditMetadata,
  SystemManagementRepository,
  type ExportPreview,
  type PageResult,
  type SystemManagementExportResource,
} from './system-management.repository';

@Injectable()
export class SeedSystemManagementRepository extends SystemManagementRepository {
  private dictTypes = seedDictTypes.map(cloneDictType);
  private systemConfigs = seedSystemConfigs.map((config) => ({ ...config }));
  private fileAssets = seedFileAssets.map((file) => ({ ...file }));
  private readonly auditLogs = seedAuditLogs.map((log) => ({ ...log }));
  private readonly loginLogs = seedLoginLogs.map((log) => ({ ...log }));

  async listDicts(
    query: PageQueryDto = {},
  ): Promise<PageResult<DictTypeRecord>> {
    return createPage(this.dictTypes, query);
  }

  async createDict(body: CreateDictTypeDto): Promise<DictTypeRecord> {
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

  async updateDict(
    code: string,
    body: UpdateDictTypeDto,
  ): Promise<DictTypeRecord> {
    const dict = this.findDict(code);
    Object.assign(dict, {
      name: body.name ?? dict.name,
      description: body.description ?? dict.description,
      enabled: body.enabled ?? dict.enabled,
      items: body.items ?? dict.items,
    });
    return cloneDictType(dict);
  }

  async deleteDict(code: string): Promise<{ deleted: true }> {
    this.findDict(code);
    this.dictTypes = this.dictTypes.filter((dict) => dict.code !== code);
    return { deleted: true };
  }

  async listConfig(
    query: PageQueryDto = {},
  ): Promise<PageResult<SystemConfigRecord>> {
    return createPage(this.systemConfigs, query);
  }

  async createConfig(body: CreateSystemConfigDto): Promise<SystemConfigRecord> {
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

  async updateConfig(
    key: string,
    body: UpdateSystemConfigDto,
  ): Promise<SystemConfigRecord> {
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

  async deleteConfig(key: string): Promise<{ deleted: true }> {
    this.findConfig(key);
    this.systemConfigs = this.systemConfigs.filter(
      (config) => config.key !== key,
    );
    return { deleted: true };
  }

  async listFiles(
    query: PageQueryDto = {},
  ): Promise<PageResult<FileAssetRecord>> {
    return createPage(this.fileAssets, query);
  }

  async createFileAsset(body: CreateFileAssetDto): Promise<FileAssetRecord> {
    assertSafeFileAsset(body);

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

  async deleteFile(id: string): Promise<{ deleted: true }> {
    if (!this.fileAssets.some((file) => file.id === id)) {
      throw new NotFoundException(`File asset not found: ${id}`);
    }

    this.fileAssets = this.fileAssets.filter((file) => file.id !== id);
    return { deleted: true };
  }

  async listAuditLogs(
    query: PageQueryDto = {},
  ): Promise<PageResult<AuditLogRecord>> {
    return createPage(
      this.auditLogs.map((log) => ({
        ...log,
        metadata: redactAuditMetadata(log.metadata),
      })),
      query,
    );
  }

  async listLoginLogs(
    query: PageQueryDto = {},
  ): Promise<PageResult<LoginLogRecord>> {
    return createPage(this.loginLogs, query);
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

function cloneDictType(dict: DictTypeRecord): DictTypeRecord {
  return {
    ...dict,
    items: dict.items.map((item) => ({ ...item })),
  };
}
