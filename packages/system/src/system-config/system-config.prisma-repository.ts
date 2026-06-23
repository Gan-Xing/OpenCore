import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { getRequestContext } from '@opencore/core';
import { PrismaService } from '@opencore/database';
import type {
  BatchDeleteSystemConfigsDto,
  CreateSystemConfigDto,
  RotateSystemConfigSecretDto,
  RotateSystemConfigVaultKeyDto,
  UpdateSystemConfigDto,
  UpsertSystemConfigEnvironmentOverrideDto,
} from './system-config.dto';
import type {
  SystemConfigEnvironmentOverrideRecord,
  SystemConfigRecord,
  SystemConfigSecretVersionRecord,
  SystemConfigVaultKeyRotationRecord,
  SystemConfigVaultStatusRecord,
} from './system-config.records';
import {
  assertEnvironmentOverrideConfig,
  assertSafeConfigKey,
  assertFeatureFlagConfigShape,
  assertSecretConfigShape,
  assertSecretVersionedConfig,
  assertSystemConfigMutable,
  createSystemConfigVaultKeyRotationRecord,
  createSystemConfigVaultStatus,
  createSystemConfigPageResult,
  isSystemConfigSecretEncrypted,
  normalizeExistingConfigValueAsync,
  normalizeConfigCategory,
  normalizeConfigName,
  normalizeBatchSystemConfigKeys,
  normalizeOptionalConfigText,
  normalizeRequiredSystemConfigEnvironment,
  normalizeSecretRotationActor,
  normalizeSecretRotationValue,
  normalizeSystemConfigPageQuery,
  normalizeStoredConfigValueAsync,
  normalizeStoredConfigValue,
  redactSystemConfig,
  resolveConfigVisibility,
  resolveStoredConfigVisibility,
  systemConfigBadRequest,
  systemConfigConflict,
  systemConfigForbidden,
  systemConfigNotFound,
  SystemConfigRepository,
  type SystemConfigSecretValueResult,
  toSystemConfigValueType,
  type SystemConfigPageQuery,
} from './system-config.repository';
import { inspectSystemConfigSecretEnvelope } from './system-config.vault';

type PrismaSystemConfig = {
  id: string;
  tenantId: string;
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

type PrismaSystemConfigEnvironmentOverride = {
  id: string;
  tenantId: string;
  key: string;
  environment: string;
  value: string;
  valueType: string;
  description: string | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaSystemConfigSecretVersion = {
  id: string;
  tenantId: string;
  key: string;
  version: number;
  value: string;
  active: boolean;
  rotatedBy: string | null;
  reason: string | null;
  createdAt: Date;
};

const ROOT_TENANT_ID = 'tenant_root';

@Injectable()
export class PrismaSystemConfigRepository extends SystemConfigRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listConfig(
    query: SystemConfigPageQuery = {},
  ): Promise<PageResult<SystemConfigRecord>> {
    const tenantId = resolveCurrentTenantId();
    const where = { tenantId };
    const total = await this.prisma.systemConfig.count({ where });
    const pagination = normalizeSystemConfigPageQuery(query, total);
    const rows = await this.prisma.systemConfig.findMany({
      where,
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
      throw systemConfigForbidden(
        'SYSTEM_CONFIG_NOT_SECRET',
        `System config is not secret: ${key}`,
        { key, visibility: record.visibility },
      );
    }

    if (record.valueType !== 'string') {
      throw systemConfigBadRequest(
        'SYSTEM_CONFIG_SECRET_VALUE_TYPE_INVALID',
        `Secret system config ${key} must keep string value type.`,
        { key, valueType: record.valueType },
      );
    }

    return {
      key,
      value: await normalizeExistingConfigValueAsync({
        key,
        value: row.value,
        valueType: record.valueType,
        visibility: record.visibility,
      }),
      valueType: 'string',
    };
  }

  async createConfig(body: CreateSystemConfigDto): Promise<SystemConfigRecord> {
    const tenantId = resolveCurrentTenantId();
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
      await this.prisma.systemConfig.findUnique({
        where: { tenantId_key: { tenantId, key: body.key } },
      })
    ) {
      throw systemConfigConflict(
        'SYSTEM_CONFIG_ALREADY_EXISTS',
        `System config already exists: ${body.key}`,
        { key: body.key },
      );
    }

    const value =
      visibility === 'secret'
        ? normalizeSecretRotationValue(body.value)
        : body.value;
    const storedValue = await normalizeStoredConfigValueAsync({
      key: body.key,
      value,
      valueType: body.valueType,
      visibility,
    });
    const data = {
      tenantId,
      category: normalizeConfigCategory(body.category),
      name: normalizeConfigName(body.name, body.key),
      key: body.key,
      valueType: body.valueType,
      value: storedValue,
      description: normalizeOptionalConfigText(body.description, 'description'),
      remark: normalizeOptionalConfigText(body.remark, 'remark'),
      public: visibility === 'public',
      system: false,
    };
    const config = await this.prisma.$transaction(async (tx) => {
      const created = await tx.systemConfig.create({
        data,
      });

      if (visibility === 'secret') {
        await tx.systemConfigSecretVersion.create({
          data: {
            active: true,
            tenantId,
            key: body.key,
            reason: 'Initial secret config value.',
            value: storedValue,
            valueType: 'string',
            version: 1,
          },
        });
      }

      return created;
    });

    return redactSystemConfig(toSystemConfigRecord(config));
  }

  async updateConfig(
    key: string,
    body: UpdateSystemConfigDto,
  ): Promise<SystemConfigRecord> {
    const tenantId = resolveCurrentTenantId();
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
        ? await normalizeExistingConfigValueAsync({
            key,
            value: existing.value,
            valueType: nextValueType,
            visibility: existingRecord.visibility,
          })
        : visibility === 'secret'
          ? normalizeSecretRotationValue(body.value)
          : body.value;
    const shouldCreateSecretVersion =
      visibility === 'secret' &&
      (body.value !== undefined || existingRecord.visibility !== 'secret');
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
    const storedValue = await normalizeStoredConfigValueAsync({
      key,
      value: nextValue,
      valueType: nextValueType,
      visibility,
    });
    const updateData = {
      category:
        body.category === undefined
          ? existing.category
          : normalizeConfigCategory(body.category),
      name:
        body.name === undefined
          ? existing.name
          : normalizeConfigName(body.name, key),
      value: storedValue,
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
    };
    const config = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.systemConfig.update({
        where: { tenantId_key: { tenantId, key } },
        data: updateData,
      });

      if (shouldCreateSecretVersion) {
        await tx.systemConfigSecretVersion.updateMany({
          where: { tenantId, key, active: true },
          data: { active: false },
        });
        const latest = await tx.systemConfigSecretVersion.aggregate({
          where: { tenantId, key },
          _max: { version: true },
        });
        await tx.systemConfigSecretVersion.create({
          data: {
            active: true,
            tenantId,
            key,
            reason: 'Updated secret config value.',
            value: storedValue,
            valueType: 'string',
            version: (latest._max.version ?? 0) + 1,
          },
        });
      }

      return updated;
    });

    return redactSystemConfig(toSystemConfigRecord(config));
  }

  async deleteConfig(key: string): Promise<{ deleted: true }> {
    const tenantId = resolveCurrentTenantId();
    assertSystemConfigMutable(
      toSystemConfigRecord(await this.findConfigByKey(key)),
    );
    await this.prisma.systemConfig.delete({
      where: { tenantId_key: { tenantId, key } },
    });
    return { deleted: true };
  }

  async deleteConfigs(
    body: BatchDeleteSystemConfigsDto,
  ): Promise<{ deleted: true; affected: number; keys: readonly string[] }> {
    const tenantId = resolveCurrentTenantId();
    const keys = normalizeBatchSystemConfigKeys(body?.keys);
    const configs = await this.prisma.systemConfig.findMany({
      where: { tenantId, key: { in: [...keys] } },
      select: { key: true, system: true },
    });
    const existingKeys = new Set(configs.map((config) => config.key));
    const missing = keys.find((key) => !existingKeys.has(key));

    if (missing) {
      throw systemConfigNotFound(
        'SYSTEM_CONFIG_NOT_FOUND',
        `System config not found: ${missing}`,
        { key: missing },
      );
    }

    const systemConfig = configs.find((config) => config.system);

    if (systemConfig) {
      throw systemConfigBadRequest(
        'SYSTEM_CONFIG_SYSTEM_IMMUTABLE',
        `System built-in config cannot be deleted: ${systemConfig.key}`,
        { key: systemConfig.key },
      );
    }

    await this.prisma.systemConfig.deleteMany({
      where: { tenantId, key: { in: [...keys] } },
    });

    return {
      deleted: true,
      affected: keys.length,
      keys,
    };
  }

  async listConfigEnvironmentOverrides(
    key: string,
  ): Promise<readonly SystemConfigEnvironmentOverrideRecord[]> {
    const tenantId = resolveCurrentTenantId();
    assertEnvironmentOverrideConfig(
      toSystemConfigRecord(await this.findConfigByKey(key)),
    );
    const rows = await this.prisma.systemConfigEnvironmentOverride.findMany({
      where: { tenantId, key },
      orderBy: [{ environment: 'asc' }],
    });

    return rows.map(toSystemConfigEnvironmentOverrideRecord);
  }

  async getConfigEnvironmentOverride(
    key: string,
    environment: string,
  ): Promise<SystemConfigEnvironmentOverrideRecord> {
    const tenantId = resolveCurrentTenantId();
    const normalizedEnvironment =
      normalizeRequiredSystemConfigEnvironment(environment);
    const row = await this.prisma.systemConfigEnvironmentOverride.findUnique({
      where: {
        tenantId_key_environment: {
          tenantId,
          key,
          environment: normalizedEnvironment,
        },
      },
    });

    if (!row) {
      throw systemConfigNotFound(
        'SYSTEM_CONFIG_ENVIRONMENT_OVERRIDE_NOT_FOUND',
        `System config environment override not found: ${key}/${normalizedEnvironment}`,
        { environment: normalizedEnvironment, key },
      );
    }

    return toSystemConfigEnvironmentOverrideRecord(row);
  }

  async upsertConfigEnvironmentOverride(
    key: string,
    environment: string,
    body: UpsertSystemConfigEnvironmentOverrideDto,
  ): Promise<SystemConfigEnvironmentOverrideRecord> {
    const tenantId = resolveCurrentTenantId();
    const config = toSystemConfigRecord(await this.findConfigByKey(key));
    const normalizedEnvironment =
      normalizeRequiredSystemConfigEnvironment(environment);
    assertEnvironmentOverrideConfig(config);
    assertFeatureFlagConfigShape({
      key,
      value: body.value,
      valueType: config.valueType,
      visibility: 'public',
    });

    const value = normalizeStoredConfigValue({
      key,
      value: body.value,
      valueType: config.valueType,
      visibility: 'public',
    });
    const data = {
      description: normalizeOptionalConfigText(body.description, 'description'),
      remark: normalizeOptionalConfigText(body.remark, 'remark'),
      value,
      valueType: config.valueType,
    };
    const row = await this.prisma.systemConfigEnvironmentOverride.upsert({
      where: {
        tenantId_key_environment: {
          tenantId,
          key,
          environment: normalizedEnvironment,
        },
      },
      create: {
        ...data,
        tenantId,
        key,
        environment: normalizedEnvironment,
      },
      update: data,
    });

    return toSystemConfigEnvironmentOverrideRecord(row);
  }

  async deleteConfigEnvironmentOverride(
    key: string,
    environment: string,
  ): Promise<{ deleted: true }> {
    const tenantId = resolveCurrentTenantId();
    const normalizedEnvironment =
      normalizeRequiredSystemConfigEnvironment(environment);
    await this.getConfigEnvironmentOverride(key, normalizedEnvironment);
    await this.prisma.systemConfigEnvironmentOverride.delete({
      where: {
        tenantId_key_environment: {
          tenantId,
          key,
          environment: normalizedEnvironment,
        },
      },
    });

    return { deleted: true };
  }

  async listConfigSecretVersions(
    key: string,
  ): Promise<readonly SystemConfigSecretVersionRecord[]> {
    const tenantId = resolveCurrentTenantId();
    assertSecretVersionedConfig(
      toSystemConfigRecord(await this.findConfigByKey(key)),
    );
    const rows = await this.prisma.systemConfigSecretVersion.findMany({
      where: { tenantId, key },
      orderBy: [{ version: 'desc' }],
    });

    return rows.map(toSystemConfigSecretVersionRecord);
  }

  async rotateSecretConfig(
    key: string,
    body: RotateSystemConfigSecretDto,
  ): Promise<SystemConfigSecretVersionRecord> {
    const tenantId = resolveCurrentTenantId();
    const config = toSystemConfigRecord(await this.findConfigByKey(key));
    assertSecretVersionedConfig(config);

    const storedValue = await normalizeStoredConfigValueAsync({
      key,
      value: normalizeSecretRotationValue(body.value),
      valueType: 'string',
      visibility: 'secret',
    });
    const rotatedBy = normalizeSecretRotationActor(body.rotatedBy);
    const reason = normalizeOptionalConfigText(body.reason, 'remark');
    const version = await this.prisma.$transaction(async (tx) => {
      await tx.systemConfig.update({
        where: { tenantId_key: { tenantId, key } },
        data: {
          public: false,
          value: storedValue,
          valueType: 'string',
        },
      });
      await tx.systemConfigSecretVersion.updateMany({
        where: { tenantId, key, active: true },
        data: { active: false },
      });
      const latest = await tx.systemConfigSecretVersion.aggregate({
        where: { tenantId, key },
        _max: { version: true },
      });

      return tx.systemConfigSecretVersion.create({
        data: {
          active: true,
          tenantId,
          key,
          reason,
          rotatedBy,
          value: storedValue,
          valueType: 'string',
          version: (latest._max.version ?? 0) + 1,
        },
      });
    });

    return toSystemConfigSecretVersionRecord(version);
  }

  async getConfigVaultStatus(): Promise<SystemConfigVaultStatusRecord> {
    return createSystemConfigVaultStatus(await this.readVaultStatusValues());
  }

  async rotateConfigVaultKey(
    body: RotateSystemConfigVaultKeyDto,
  ): Promise<SystemConfigVaultKeyRotationRecord> {
    const tenantId = resolveCurrentTenantId();
    const rotatedBy = normalizeSecretRotationActor(body.rotatedBy);
    const reason = normalizeOptionalConfigText(body.reason, 'remark');
    const rotatedAt = new Date().toISOString();
    const result = await this.prisma.$transaction(async (tx) => {
      const configs = await tx.systemConfig.findMany({ where: { tenantId } });
      const secretConfigs = configs.filter(
        (config) => toSystemConfigRecord(config).visibility === 'secret',
      );
      const secretVersions = await tx.systemConfigSecretVersion.findMany({
        where: { tenantId },
      });
      const currentSecretValues: string[] = [];
      const secretVersionValues: string[] = [];

      for (const config of secretConfigs) {
        const value = await normalizeExistingConfigValueAsync({
          key: config.key,
          value: config.value,
          valueType: 'string',
          visibility: 'secret',
        });
        const rewrapped = await normalizeStoredConfigValueAsync({
          key: config.key,
          value,
          valueType: 'string',
          visibility: 'secret',
        });
        await tx.systemConfig.update({
          where: { tenantId_key: { tenantId, key: config.key } },
          data: { value: rewrapped, valueType: 'string', public: false },
        });
        currentSecretValues.push(rewrapped);
      }

      for (const version of secretVersions) {
        const value = await normalizeExistingConfigValueAsync({
          key: version.key,
          value: version.value,
          valueType: 'string',
          visibility: 'secret',
        });
        const rewrapped = await normalizeStoredConfigValueAsync({
          key: version.key,
          value,
          valueType: 'string',
          visibility: 'secret',
        });
        await tx.systemConfigSecretVersion.update({
          where: {
            tenantId_key_version: {
              tenantId,
              key: version.key,
              version: version.version,
            },
          },
          data: { value: rewrapped, valueType: 'string' },
        });
        secretVersionValues.push(rewrapped);
      }

      return {
        currentSecretValues,
        rewrappedConfigCount: secretConfigs.length,
        rewrappedSecretVersionCount: secretVersions.length,
        secretVersionValues,
      };
    });

    return createSystemConfigVaultKeyRotationRecord({
      currentSecretValues: result.currentSecretValues,
      reason,
      rewrappedConfigCount: result.rewrappedConfigCount,
      rewrappedSecretVersionCount: result.rewrappedSecretVersionCount,
      rotatedAt,
      rotatedBy,
      secretVersionValues: result.secretVersionValues,
    });
  }

  private async findConfigByKey(key: string): Promise<PrismaSystemConfig> {
    const tenantId = resolveCurrentTenantId();
    const config = await this.prisma.systemConfig.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });

    if (!config) {
      throw systemConfigNotFound(
        'SYSTEM_CONFIG_NOT_FOUND',
        `System config not found: ${key}`,
        { key },
      );
    }

    return config;
  }

  private async readVaultStatusValues(): Promise<{
    currentSecretValues: readonly string[];
    secretVersionValues: readonly string[];
  }> {
    const tenantId = resolveCurrentTenantId();
    const configs = await this.prisma.systemConfig.findMany({
      where: { tenantId },
    });
    const secretVersions = await this.prisma.systemConfigSecretVersion.findMany(
      {
        where: { tenantId },
        select: { value: true },
      },
    );

    return {
      currentSecretValues: configs
        .filter(
          (config) => toSystemConfigRecord(config).visibility === 'secret',
        )
        .map((config) => config.value),
      secretVersionValues: secretVersions.map((version) => version.value),
    };
  }
}

function toSystemConfigRecord(config: PrismaSystemConfig): SystemConfigRecord {
  const visibility = resolveStoredConfigVisibility({
    key: config.key,
    public: config.public,
  });

  return {
    id: config.id,
    tenantId: config.tenantId,
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

function toSystemConfigEnvironmentOverrideRecord(
  override: PrismaSystemConfigEnvironmentOverride,
): SystemConfigEnvironmentOverrideRecord {
  return {
    id: override.id,
    tenantId: override.tenantId,
    key: override.key,
    environment: override.environment,
    value: override.value,
    valueType: toSystemConfigValueType(override.valueType),
    description: override.description ?? undefined,
    remark: override.remark ?? undefined,
    public: true,
    visibility: 'public',
    createdAt: override.createdAt.toISOString(),
    updatedAt: override.updatedAt.toISOString(),
  };
}

function toSystemConfigSecretVersionRecord(
  version: PrismaSystemConfigSecretVersion,
): SystemConfigSecretVersionRecord {
  const envelope = inspectSystemConfigSecretEnvelope(version.value);

  return {
    id: version.id,
    tenantId: version.tenantId,
    key: version.key,
    version: version.version,
    active: version.active,
    encrypted: true,
    envelopeVersion:
      envelope.envelopeVersion === 'v3'
        ? 'v3'
        : envelope.envelopeVersion === 'v2'
          ? 'v2'
          : 'v1',
    vaultProvider: envelope.provider,
    vaultKeyId: envelope.keyId,
    activeVaultKey: envelope.activeKey,
    rotatedBy: version.rotatedBy ?? undefined,
    reason: version.reason ?? undefined,
    createdAt: version.createdAt.toISOString(),
  };
}

function resolveCurrentTenantId(): string {
  return getRequestContext()?.tenantId ?? ROOT_TENANT_ID;
}
