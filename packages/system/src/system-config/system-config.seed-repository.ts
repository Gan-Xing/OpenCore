import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
  BatchDeleteSystemConfigsDto,
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
} from './system-config.dto';
import {
  seedSystemConfigs,
  type SystemConfigRecord,
} from './system-config.records';
import {
  assertSafeConfigKey,
  createSystemConfigPageResult,
  normalizeConfigCategory,
  normalizeConfigName,
  normalizeBatchSystemConfigKeys,
  normalizeOptionalConfigText,
  normalizeSystemConfigPageQuery,
  redactSystemConfig,
  resolveConfigVisibility,
  SystemConfigRepository,
  type SystemConfigPageQuery,
} from './system-config.repository';

@Injectable()
export class SeedSystemConfigRepository extends SystemConfigRepository {
  private systemConfigs = seedSystemConfigs.map((config) => ({ ...config }));

  async listConfig(
    query: SystemConfigPageQuery = {},
  ): Promise<PageResult<SystemConfigRecord>> {
    const pagination = normalizeSystemConfigPageQuery(
      query,
      this.systemConfigs.length,
    );
    const rows = this.systemConfigs.slice(
      pagination.skip,
      pagination.skip + pagination.take,
    );

    return createSystemConfigPageResult(
      rows.map(redactSystemConfig),
      pagination,
    );
  }

  async getConfig(key: string): Promise<SystemConfigRecord> {
    return redactSystemConfig(this.findConfig(key));
  }

  async createConfig(body: CreateSystemConfigDto): Promise<SystemConfigRecord> {
    const visibility = resolveConfigVisibility(body);
    assertSafeConfigKey(body.key, visibility);

    if (this.systemConfigs.some((config) => config.key === body.key)) {
      throw new ConflictException(`System config already exists: ${body.key}`);
    }

    const config: SystemConfigRecord = {
      id: `config_${body.key.replaceAll('.', '_')}`,
      category: normalizeConfigCategory(body.category),
      name: normalizeConfigName(body.name, body.key),
      key: body.key,
      value: body.value,
      valueType: body.valueType,
      description: normalizeOptionalConfigText(body.description, 'description'),
      remark: normalizeOptionalConfigText(body.remark, 'remark'),
      public: visibility === 'public',
      visibility,
    };
    this.systemConfigs = [config, ...this.systemConfigs];
    return redactSystemConfig(config);
  }

  async updateConfig(
    key: string,
    body: UpdateSystemConfigDto,
  ): Promise<SystemConfigRecord> {
    const config = this.findConfig(key);
    const visibility = resolveConfigVisibility({
      key,
      public: body.public ?? config.public,
      visibility: body.visibility ?? config.visibility,
    });
    assertSafeConfigKey(key, visibility);
    Object.assign(config, {
      category:
        body.category === undefined
          ? config.category
          : normalizeConfigCategory(body.category),
      name:
        body.name === undefined
          ? config.name
          : normalizeConfigName(body.name, key),
      value: body.value ?? config.value,
      valueType: body.valueType ?? config.valueType,
      description:
        body.description === undefined
          ? config.description
          : normalizeOptionalConfigText(body.description, 'description'),
      remark:
        body.remark === undefined
          ? config.remark
          : normalizeOptionalConfigText(body.remark, 'remark'),
      public: visibility === 'public',
      visibility,
    });
    return redactSystemConfig(config);
  }

  async deleteConfig(key: string): Promise<{ deleted: true }> {
    this.findConfig(key);
    this.systemConfigs = this.systemConfigs.filter(
      (config) => config.key !== key,
    );
    return { deleted: true };
  }

  async deleteConfigs(
    body: BatchDeleteSystemConfigsDto,
  ): Promise<{ deleted: true; affected: number; keys: readonly string[] }> {
    const keys = normalizeBatchSystemConfigKeys(body?.keys);
    const existingKeys = new Set(
      this.systemConfigs.map((config) => config.key),
    );
    const missing = keys.find((key) => !existingKeys.has(key));

    if (missing) {
      throw new NotFoundException(`System config not found: ${missing}`);
    }

    this.systemConfigs = this.systemConfigs.filter(
      (config) => !keys.includes(config.key),
    );

    return {
      deleted: true,
      affected: keys.length,
      keys,
    };
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
