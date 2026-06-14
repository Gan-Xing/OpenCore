import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
  BatchDeleteSystemConfigsDto,
  CreateSystemConfigDto,
  RotateSystemConfigSecretDto,
  RotateSystemConfigVaultKeyDto,
  UpdateSystemConfigDto,
  UpsertSystemConfigEnvironmentOverrideDto,
} from './system-config.dto';
import {
  seedSystemConfigs,
  type SystemConfigEnvironmentOverrideRecord,
  type SystemConfigRecord,
  type SystemConfigSecretVersionRecord,
  type SystemConfigVaultKeyRotationRecord,
  type SystemConfigVaultStatusRecord,
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
  normalizeExistingConfigValue,
  normalizeConfigCategory,
  normalizeConfigName,
  normalizeBatchSystemConfigKeys,
  normalizeOptionalConfigText,
  normalizeRequiredSystemConfigEnvironment,
  normalizeSecretRotationActor,
  normalizeSecretRotationValue,
  normalizeSystemConfigPageQuery,
  normalizeStoredConfigValue,
  redactSystemConfig,
  resolveConfigVisibility,
  SystemConfigRepository,
  type SystemConfigSecretValueResult,
  type SystemConfigPageQuery,
} from './system-config.repository';
import { inspectSystemConfigSecretEnvelope } from './system-config.vault';

type SeedSystemConfigSecretVersion = SystemConfigSecretVersionRecord & {
  value: string;
};

@Injectable()
export class SeedSystemConfigRepository extends SystemConfigRepository {
  private systemConfigs = seedSystemConfigs.map((config) => {
    const visibility = resolveConfigVisibility(config);

    return {
      ...config,
      encrypted: visibility === 'secret',
      public: visibility === 'public',
      value: normalizeStoredConfigValue({
        key: config.key,
        value: config.value,
        valueType: config.valueType,
        visibility,
      }),
      visibility,
    };
  });
  private environmentOverrides: SystemConfigEnvironmentOverrideRecord[] = [];
  private secretVersions: SeedSystemConfigSecretVersion[] = this.systemConfigs
    .filter((config) => config.visibility === 'secret')
    .map((config) => ({
      ...createSecretVersionRecordMetadata({
        active: true,
        createdAt: new Date().toISOString(),
        id: `secret_version_${config.key.replaceAll('.', '_')}_1`,
        key: config.key,
        reason: 'Seeded secret baseline.',
        rotatedBy: 'seed',
        value: config.value,
        version: 1,
      }),
      value: config.value,
    }));

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

  async resolveSecretConfigValue(
    key: string,
  ): Promise<SystemConfigSecretValueResult> {
    const config = this.findConfig(key);

    if (config.visibility !== 'secret') {
      throw new ForbiddenException(`System config is not secret: ${key}`);
    }

    if (config.valueType !== 'string') {
      throw new BadRequestException(
        `Secret system config ${key} must keep string value type.`,
      );
    }

    return {
      key,
      value: normalizeExistingConfigValue({
        key,
        value: config.value,
        valueType: config.valueType,
        visibility: config.visibility,
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

    if (this.systemConfigs.some((config) => config.key === body.key)) {
      throw new ConflictException(`System config already exists: ${body.key}`);
    }

    const config: SystemConfigRecord = {
      id: `config_${body.key.replaceAll('.', '_')}`,
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
      description: normalizeOptionalConfigText(body.description, 'description'),
      encrypted: visibility === 'secret',
      remark: normalizeOptionalConfigText(body.remark, 'remark'),
      public: visibility === 'public',
      system: false,
      visibility,
    };
    this.systemConfigs = [config, ...this.systemConfigs];
    if (visibility === 'secret') {
      this.createSecretVersion(config, {
        reason: 'Initial secret config value.',
      });
    }
    return redactSystemConfig(config);
  }

  async updateConfig(
    key: string,
    body: UpdateSystemConfigDto,
  ): Promise<SystemConfigRecord> {
    const config = this.findConfig(key);
    const nextValueType = body.valueType ?? config.valueType;
    const nextValue =
      body.value === undefined
        ? normalizeExistingConfigValue({
            key,
            value: config.value,
            valueType: nextValueType,
            visibility: config.visibility,
          })
        : body.value;
    const visibility = resolveConfigVisibility({
      key,
      public: body.public ?? config.public,
      visibility: body.visibility ?? config.visibility,
    });
    const shouldCreateSecretVersion =
      visibility === 'secret' &&
      (body.value !== undefined || config.visibility !== 'secret');
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
    Object.assign(config, {
      category:
        body.category === undefined
          ? config.category
          : normalizeConfigCategory(body.category),
      name:
        body.name === undefined
          ? config.name
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
          ? config.description
          : normalizeOptionalConfigText(body.description, 'description'),
      remark:
        body.remark === undefined
          ? config.remark
          : normalizeOptionalConfigText(body.remark, 'remark'),
      public: visibility === 'public',
      visibility,
      encrypted: visibility === 'secret',
    });
    if (shouldCreateSecretVersion) {
      this.createSecretVersion(config, {
        reason: 'Updated secret config value.',
      });
    }
    return redactSystemConfig(config);
  }

  async deleteConfig(key: string): Promise<{ deleted: true }> {
    assertSystemConfigMutable(this.findConfig(key));
    this.systemConfigs = this.systemConfigs.filter(
      (config) => config.key !== key,
    );
    this.environmentOverrides = this.environmentOverrides.filter(
      (override) => override.key !== key,
    );
    this.secretVersions = this.secretVersions.filter(
      (version) => version.key !== key,
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

    const systemConfig = this.systemConfigs.find(
      (config) => keys.includes(config.key) && config.system,
    );

    if (systemConfig) {
      throw new BadRequestException(
        `System built-in config cannot be deleted: ${systemConfig.key}`,
      );
    }

    this.systemConfigs = this.systemConfigs.filter(
      (config) => !keys.includes(config.key),
    );
    this.environmentOverrides = this.environmentOverrides.filter(
      (override) => !keys.includes(override.key),
    );
    this.secretVersions = this.secretVersions.filter(
      (version) => !keys.includes(version.key),
    );

    return {
      deleted: true,
      affected: keys.length,
      keys,
    };
  }

  async listConfigEnvironmentOverrides(
    key: string,
  ): Promise<readonly SystemConfigEnvironmentOverrideRecord[]> {
    const config = this.findConfig(key);
    assertEnvironmentOverrideConfig(config);

    return this.environmentOverrides
      .filter((override) => override.key === key)
      .sort((left, right) => left.environment.localeCompare(right.environment))
      .map((override) => ({ ...override }));
  }

  async getConfigEnvironmentOverride(
    key: string,
    environment: string,
  ): Promise<SystemConfigEnvironmentOverrideRecord> {
    const normalizedEnvironment =
      normalizeRequiredSystemConfigEnvironment(environment);
    const override = this.environmentOverrides.find(
      (candidate) =>
        candidate.key === key &&
        candidate.environment === normalizedEnvironment,
    );

    if (!override) {
      throw new NotFoundException(
        `System config environment override not found: ${key}/${normalizedEnvironment}`,
      );
    }

    return { ...override };
  }

  async upsertConfigEnvironmentOverride(
    key: string,
    environment: string,
    body: UpsertSystemConfigEnvironmentOverrideDto,
  ): Promise<SystemConfigEnvironmentOverrideRecord> {
    const config = this.findConfig(key);
    const normalizedEnvironment =
      normalizeRequiredSystemConfigEnvironment(environment);
    assertEnvironmentOverrideConfig(config);
    assertFeatureFlagConfigShape({
      key,
      value: body.value,
      valueType: config.valueType,
      visibility: 'public',
    });

    const now = new Date().toISOString();
    const value = normalizeStoredConfigValue({
      key,
      value: body.value,
      valueType: config.valueType,
      visibility: 'public',
    });
    const existing = this.environmentOverrides.find(
      (candidate) =>
        candidate.key === key &&
        candidate.environment === normalizedEnvironment,
    );

    if (existing) {
      Object.assign(existing, {
        description: normalizeOptionalConfigText(
          body.description,
          'description',
        ),
        remark: normalizeOptionalConfigText(body.remark, 'remark'),
        updatedAt: now,
        value,
        valueType: config.valueType,
      });
      return { ...existing };
    }

    const override: SystemConfigEnvironmentOverrideRecord = {
      id: `config_override_${key.replaceAll('.', '_')}_${normalizedEnvironment}`,
      key,
      environment: normalizedEnvironment,
      value,
      valueType: config.valueType,
      description: normalizeOptionalConfigText(body.description, 'description'),
      remark: normalizeOptionalConfigText(body.remark, 'remark'),
      public: true,
      visibility: 'public',
      createdAt: now,
      updatedAt: now,
    };
    this.environmentOverrides = [override, ...this.environmentOverrides];

    return { ...override };
  }

  async deleteConfigEnvironmentOverride(
    key: string,
    environment: string,
  ): Promise<{ deleted: true }> {
    const normalizedEnvironment =
      normalizeRequiredSystemConfigEnvironment(environment);
    await this.getConfigEnvironmentOverride(key, normalizedEnvironment);
    this.environmentOverrides = this.environmentOverrides.filter(
      (override) =>
        override.key !== key || override.environment !== normalizedEnvironment,
    );

    return { deleted: true };
  }

  async listConfigSecretVersions(
    key: string,
  ): Promise<readonly SystemConfigSecretVersionRecord[]> {
    assertSecretVersionedConfig(this.findConfig(key));

    return this.secretVersions
      .filter((version) => version.key === key)
      .sort((left, right) => right.version - left.version)
      .map(toSecretVersionRecord);
  }

  async rotateSecretConfig(
    key: string,
    body: RotateSystemConfigSecretDto,
  ): Promise<SystemConfigSecretVersionRecord> {
    const config = this.findConfig(key);
    assertSecretVersionedConfig(config);

    const value = normalizeSecretRotationValue(body.value);
    config.value = normalizeStoredConfigValue({
      key,
      value,
      valueType: 'string',
      visibility: 'secret',
    });
    config.valueType = 'string';
    config.public = false;
    config.visibility = 'secret';
    config.encrypted = true;

    return this.createSecretVersion(config, {
      reason: normalizeOptionalConfigText(body.reason, 'remark'),
      rotatedBy: normalizeSecretRotationActor(body.rotatedBy),
    });
  }

  async getConfigVaultStatus(): Promise<SystemConfigVaultStatusRecord> {
    return this.createVaultStatus();
  }

  async rotateConfigVaultKey(
    body: RotateSystemConfigVaultKeyDto,
  ): Promise<SystemConfigVaultKeyRotationRecord> {
    let rewrappedConfigCount = 0;
    let rewrappedSecretVersionCount = 0;

    this.systemConfigs = this.systemConfigs.map((config) => {
      if (config.visibility !== 'secret') {
        return config;
      }

      const value = normalizeExistingConfigValue({
        key: config.key,
        value: config.value,
        valueType: 'string',
        visibility: 'secret',
      });
      rewrappedConfigCount += 1;

      return {
        ...config,
        encrypted: true,
        value: normalizeStoredConfigValue({
          key: config.key,
          value,
          valueType: 'string',
          visibility: 'secret',
        }),
      };
    });
    this.secretVersions = this.secretVersions.map((version) => {
      const value = normalizeExistingConfigValue({
        key: version.key,
        value: version.value,
        valueType: 'string',
        visibility: 'secret',
      });
      const nextValue = normalizeStoredConfigValue({
        key: version.key,
        value,
        valueType: 'string',
        visibility: 'secret',
      });
      rewrappedSecretVersionCount += 1;

      return {
        ...createSecretVersionRecordMetadata({
          ...version,
          value: nextValue,
        }),
        value: nextValue,
      };
    });

    return createSystemConfigVaultKeyRotationRecord({
      ...this.createVaultStatusValues(),
      reason: normalizeOptionalConfigText(body.reason, 'remark'),
      rewrappedConfigCount,
      rewrappedSecretVersionCount,
      rotatedAt: new Date().toISOString(),
      rotatedBy: normalizeSecretRotationActor(body.rotatedBy),
    });
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

  private createSecretVersion(
    config: SystemConfigRecord,
    input: { reason?: string; rotatedBy?: string } = {},
  ): SystemConfigSecretVersionRecord {
    assertSecretVersionedConfig(config);
    this.secretVersions = this.secretVersions.map((version) =>
      version.key === config.key ? { ...version, active: false } : version,
    );
    const nextVersion = this.nextSecretVersion(config.key);
    const version: SeedSystemConfigSecretVersion = {
      ...createSecretVersionRecordMetadata({
        active: true,
        createdAt: new Date().toISOString(),
        id: `secret_version_${config.key.replaceAll('.', '_')}_${nextVersion}`,
        key: config.key,
        reason: input.reason,
        rotatedBy: input.rotatedBy,
        value: config.value,
        version: nextVersion,
      }),
      value: config.value,
    };
    this.secretVersions = [version, ...this.secretVersions];

    return toSecretVersionRecord(version);
  }

  private createVaultStatus(): SystemConfigVaultStatusRecord {
    return createSystemConfigVaultStatus(this.createVaultStatusValues());
  }

  private createVaultStatusValues(): {
    currentSecretValues: readonly string[];
    secretVersionValues: readonly string[];
  } {
    return {
      currentSecretValues: this.systemConfigs
        .filter((config) => config.visibility === 'secret')
        .map((config) => config.value),
      secretVersionValues: this.secretVersions.map((version) => version.value),
    };
  }

  private nextSecretVersion(key: string): number {
    return (
      Math.max(
        0,
        ...this.secretVersions
          .filter((version) => version.key === key)
          .map((version) => version.version),
      ) + 1
    );
  }
}

function createSecretVersionRecordMetadata(input: {
  active: boolean;
  createdAt: string;
  id: string;
  key: string;
  reason?: string;
  rotatedBy?: string;
  value: string;
  version: number;
}): SystemConfigSecretVersionRecord {
  const envelope = inspectSystemConfigSecretEnvelope(input.value);

  return {
    id: input.id,
    key: input.key,
    version: input.version,
    active: input.active,
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
    rotatedBy: input.rotatedBy,
    reason: input.reason,
    createdAt: input.createdAt,
  };
}

function toSecretVersionRecord(
  version: SeedSystemConfigSecretVersion,
): SystemConfigSecretVersionRecord {
  return {
    id: version.id,
    key: version.key,
    version: version.version,
    active: version.active,
    encrypted: true,
    envelopeVersion: version.envelopeVersion,
    vaultProvider: version.vaultProvider,
    vaultKeyId: version.vaultKeyId,
    activeVaultKey: version.activeVaultKey,
    rotatedBy: version.rotatedBy,
    reason: version.reason,
    createdAt: version.createdAt,
  };
}
