import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
  BatchDeleteSystemConfigsDto,
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
} from './system-config.dto';
import type { SystemConfigRecord } from './system-config.records';
import {
  createSystemConfigExportPreview,
  SystemConfigRepository,
  type SystemConfigBatchMutationRecord,
  type SystemConfigExportPreview,
  type SystemConfigPageQuery,
} from './system-config.repository';

export type SystemConfigValueResult = {
  key: string;
  value: string;
  valueType: SystemConfigRecord['valueType'];
};

export type SystemConfigCacheRefreshResult = {
  refreshed: true;
  cachedKeys: number;
  refreshedAt: string;
};

@Injectable()
export class SystemConfigService {
  private readonly valueCache = new Map<string, SystemConfigValueResult>();

  constructor(private readonly repository: SystemConfigRepository) {}

  listConfig(
    query: SystemConfigPageQuery = {},
  ): Promise<PageResult<SystemConfigRecord>> {
    return this.repository.listConfig(query);
  }

  getConfig(key: string): Promise<SystemConfigRecord> {
    return this.repository.getConfig(key);
  }

  async getConfigValueByKey(
    key: string | undefined,
  ): Promise<SystemConfigValueResult> {
    const normalizedKey = normalizeConfigValueKey(key);
    const cached = this.valueCache.get(normalizedKey);
    if (cached) {
      return { ...cached };
    }

    const value = toPublicConfigValue(
      await this.repository.getConfig(normalizedKey),
    );
    this.valueCache.set(normalizedKey, value);
    return { ...value };
  }

  async refreshConfigCache(): Promise<SystemConfigCacheRefreshResult> {
    this.valueCache.clear();
    let cachedKeys = 0;
    let page = 1;

    while (true) {
      const result = await this.repository.listConfig({ page, pageSize: 100 });
      for (const config of result.items) {
        if (config.visibility === 'public') {
          const value = toPublicConfigValue(config);
          this.valueCache.set(value.key, value);
          cachedKeys += 1;
        }
      }

      if (page >= result.totalPages) {
        break;
      }
      page += 1;
    }

    return {
      refreshed: true,
      cachedKeys,
      refreshedAt: new Date().toISOString(),
    };
  }

  async createConfig(body: CreateSystemConfigDto): Promise<SystemConfigRecord> {
    const config = await this.repository.createConfig(body);
    this.invalidateValueCache(config.key);
    return config;
  }

  async updateConfig(
    key: string,
    body: UpdateSystemConfigDto,
  ): Promise<SystemConfigRecord> {
    const config = await this.repository.updateConfig(key, body);
    this.invalidateValueCache(config.key);
    return config;
  }

  async deleteConfig(key: string): Promise<{ deleted: true }> {
    const result = await this.repository.deleteConfig(key);
    this.invalidateValueCache(key);
    return result;
  }

  async deleteConfigs(
    body: BatchDeleteSystemConfigsDto,
  ): Promise<SystemConfigBatchMutationRecord> {
    const result = await this.repository.deleteConfigs(body);
    for (const key of result.keys) {
      this.invalidateValueCache(key);
    }
    return result;
  }

  async createExportPreview(
    query: SystemConfigPageQuery = {},
  ): Promise<SystemConfigExportPreview> {
    return createSystemConfigExportPreview(
      await this.repository.listConfig(query),
    );
  }

  private invalidateValueCache(key: string): void {
    this.valueCache.delete(key);
  }
}

function normalizeConfigValueKey(key: string | undefined): string {
  if (typeof key !== 'string') {
    throw new BadRequestException('System config key is required.');
  }

  const normalized = key.trim();
  if (!normalized) {
    throw new BadRequestException('System config key is required.');
  }
  return normalized;
}

function toPublicConfigValue(
  config: SystemConfigRecord,
): SystemConfigValueResult {
  if (config.visibility !== 'public') {
    throw new ForbiddenException(
      `System config value is not public: ${config.key}`,
    );
  }

  return {
    key: config.key,
    value: config.value,
    valueType: config.valueType,
  };
}
