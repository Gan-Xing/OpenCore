import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import type {
  BatchDeleteSystemConfigsDto,
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
} from './system-config.dto';
import type { SystemConfigRecord } from './system-config.records';
import {
  assertSafeConfigKey,
  assertFeatureFlagConfigShape,
  assertSecretConfigShape,
  assertSystemConfigMutable,
  createSystemConfigPageResult,
  isSystemConfigSecretEncrypted,
  normalizeExistingConfigValue,
  normalizeConfigCategory,
  normalizeConfigName,
  normalizeBatchSystemConfigKeys,
  normalizeOptionalConfigText,
  normalizeSystemConfigPageQuery,
  normalizeStoredConfigValue,
  redactSystemConfig,
  resolveConfigVisibility,
  resolveStoredConfigVisibility,
  SystemConfigRepository,
  type SystemConfigSecretValueResult,
  toSystemConfigValueType,
  type SystemConfigPageQuery,
} from './system-config.repository';

type PrismaSystemConfig = {
  id: string;
  category: string;
  name: string;
  key: string;
  value: string;
  valueType: string;
  description: string | null;
  remark: string | null;
  public: boolean;
  system: boolean;
};

@Injectable()
export class PrismaSystemConfigRepository extends SystemConfigRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listConfig(
    query: SystemConfigPageQuery = {},
  ): Promise<PageResult<SystemConfigRecord>> {
    const total = await this.prisma.systemConfig.count();
    const pagination = normalizeSystemConfigPageQuery(query, total);
    const rows = await this.prisma.systemConfig.findMany({
      orderBy: [{ createdAt: 'desc' }, { key: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createSystemConfigPageResult(
      rows.map((row) => redactSystemConfig(toSystemConfigRecord(row))),
      pagination,
    );
  }

  async getConfig(key: string): Promise<SystemConfigRecord> {
    return redactSystemConfig(
      toSystemConfigRecord(await this.findConfigByKey(key)),
    );
  }

  async resolveSecretConfigValue(
    key: string,
  ): Promise<SystemConfigSecretValueResult> {
    const row = await this.findConfigByKey(key);
    const record = toSystemConfigRecord(row);

    if (record.visibility !== 'secret') {
      throw new ForbiddenException(`System config is not secret: ${key}`);
    }

    if (record.valueType !== 'string') {
      throw new BadRequestException(
        `Secret system config ${key} must keep string value type.`,
      );
    }

    return {
      key,
      value: normalizeExistingConfigValue({
        key,
        value: row.value,
        valueType: record.valueType,
        visibility: record.visibility,
      }),
      valueType: 'string',
    };
  }

  async createConfig(body: CreateSystemConfigDto): Promise<SystemConfigRecord> {
    const visibility = resolveConfigVisibility(body);
    assertSafeConfigKey(body.key, visibility);
    assertFeatureFlagConfigShape({
      key: body.key,
      value: body.value,
      valueType: body.valueType,
      visibility,
    });
    assertSecretConfigShape({
      key: body.key,
      valueType: body.valueType,
      visibility,
    });

    if (
      await this.prisma.systemConfig.findUnique({ where: { key: body.key } })
    ) {
      throw new ConflictException(`System config already exists: ${body.key}`);
    }

    const config = await this.prisma.systemConfig.create({
      data: {
        category: normalizeConfigCategory(body.category),
        name: normalizeConfigName(body.name, body.key),
        key: body.key,
        valueType: body.valueType,
        value: normalizeStoredConfigValue({
          key: body.key,
          value: body.value,
          valueType: body.valueType,
          visibility,
        }),
        description: normalizeOptionalConfigText(
          body.description,
          'description',
        ),
        remark: normalizeOptionalConfigText(body.remark, 'remark'),
        public: visibility === 'public',
        system: false,
      },
    });

    return redactSystemConfig(toSystemConfigRecord(config));
  }

  async updateConfig(
    key: string,
    body: UpdateSystemConfigDto,
  ): Promise<SystemConfigRecord> {
    const existing = await this.findConfigByKey(key);
    const existingRecord = toSystemConfigRecord(existing);
    const nextValueType = toSystemConfigValueType(
      body.valueType ?? existing.valueType,
    );
    const visibility = resolveStoredConfigVisibility({
      key,
      public: body.public ?? existing.public,
      visibility: body.visibility,
    });
    const nextValue =
      body.value === undefined
        ? normalizeExistingConfigValue({
            key,
            value: existing.value,
            valueType: nextValueType,
            visibility: existingRecord.visibility,
          })
        : body.value;
    assertSafeConfigKey(key, visibility);
    assertFeatureFlagConfigShape({
      key,
      value: nextValue,
      valueType: nextValueType,
      visibility,
    });
    assertSecretConfigShape({
      key,
      valueType: nextValueType,
      visibility,
    });
    const config = await this.prisma.systemConfig.update({
      where: { key },
      data: {
        category:
          body.category === undefined
            ? existing.category
            : normalizeConfigCategory(body.category),
        name:
          body.name === undefined
            ? existing.name
            : normalizeConfigName(body.name, key),
        value: normalizeStoredConfigValue({
          key,
          value: nextValue,
          valueType: nextValueType,
          visibility,
        }),
        valueType: nextValueType,
        description:
          body.description === undefined
            ? existing.description
            : normalizeOptionalConfigText(body.description, 'description'),
        remark:
          body.remark === undefined
            ? existing.remark
            : normalizeOptionalConfigText(body.remark, 'remark'),
        public: visibility === 'public',
      },
    });

    return redactSystemConfig(toSystemConfigRecord(config));
  }

  async deleteConfig(key: string): Promise<{ deleted: true }> {
    assertSystemConfigMutable(
      toSystemConfigRecord(await this.findConfigByKey(key)),
    );
    await this.prisma.systemConfig.delete({ where: { key } });
    return { deleted: true };
  }

  async deleteConfigs(
    body: BatchDeleteSystemConfigsDto,
  ): Promise<{ deleted: true; affected: number; keys: readonly string[] }> {
    const keys = normalizeBatchSystemConfigKeys(body?.keys);
    const configs = await this.prisma.systemConfig.findMany({
      where: { key: { in: [...keys] } },
      select: { key: true, system: true },
    });
    const existingKeys = new Set(configs.map((config) => config.key));
    const missing = keys.find((key) => !existingKeys.has(key));

    if (missing) {
      throw new NotFoundException(`System config not found: ${missing}`);
    }

    const systemConfig = configs.find((config) => config.system);

    if (systemConfig) {
      throw new BadRequestException(
        `System built-in config cannot be deleted: ${systemConfig.key}`,
      );
    }

    await this.prisma.systemConfig.deleteMany({
      where: { key: { in: [...keys] } },
    });

    return {
      deleted: true,
      affected: keys.length,
      keys,
    };
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

function toSystemConfigRecord(config: PrismaSystemConfig): SystemConfigRecord {
  const visibility = resolveStoredConfigVisibility({
    key: config.key,
    public: config.public,
  });

  return {
    id: config.id,
    category: config.category,
    name: config.name,
    key: config.key,
    value: config.value,
    valueType: toSystemConfigValueType(config.valueType),
    description: config.description ?? undefined,
    encrypted: isSystemConfigSecretEncrypted({
      value: config.value,
      visibility,
    }),
    remark: config.remark ?? undefined,
    public: config.public,
    system: config.system,
    visibility,
  };
}
