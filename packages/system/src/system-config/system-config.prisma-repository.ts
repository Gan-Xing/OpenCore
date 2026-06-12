import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import type {
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
} from './system-config.dto';
import type { SystemConfigRecord } from './system-config.records';
import {
  assertSafeConfigKey,
  createSystemConfigPageResult,
  normalizeSystemConfigPageQuery,
  redactSystemConfig,
  resolveConfigVisibility,
  resolveStoredConfigVisibility,
  SystemConfigRepository,
  toSystemConfigValueType,
  type SystemConfigPageQuery,
} from './system-config.repository';

type PrismaSystemConfig = {
  id: string;
  key: string;
  value: string;
  valueType: string;
  description: string | null;
  public: boolean;
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

  async createConfig(body: CreateSystemConfigDto): Promise<SystemConfigRecord> {
    const visibility = resolveConfigVisibility(body);
    assertSafeConfigKey(body.key, visibility);

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
        public: visibility === 'public',
      },
    });

    return redactSystemConfig(toSystemConfigRecord(config));
  }

  async updateConfig(
    key: string,
    body: UpdateSystemConfigDto,
  ): Promise<SystemConfigRecord> {
    const existing = await this.findConfigByKey(key);
    const visibility = resolveStoredConfigVisibility({
      key,
      public: body.public ?? existing.public,
      visibility: body.visibility,
    });
    assertSafeConfigKey(key, visibility);
    const config = await this.prisma.systemConfig.update({
      where: { key },
      data: {
        value: body.value ?? existing.value,
        valueType: body.valueType ?? existing.valueType,
        description: body.description ?? existing.description,
        public: visibility === 'public',
      },
    });

    return redactSystemConfig(toSystemConfigRecord(config));
  }

  async deleteConfig(key: string): Promise<{ deleted: true }> {
    await this.findConfigByKey(key);
    await this.prisma.systemConfig.delete({ where: { key } });
    return { deleted: true };
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
  return {
    id: config.id,
    key: config.key,
    value: config.value,
    valueType: toSystemConfigValueType(config.valueType),
    description: config.description ?? undefined,
    public: config.public,
    visibility: resolveStoredConfigVisibility({
      key: config.key,
      public: config.public,
    }),
  };
}
