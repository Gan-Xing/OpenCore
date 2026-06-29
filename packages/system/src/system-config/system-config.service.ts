import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PageResult } from '@opencore/common';
import { getRequestContext } from '@opencore/core';
import type {
  BatchDeleteSystemConfigsDto,
  CreateSystemConfigDto,
  RotateSystemConfigSecretDto,
  RotateSystemConfigVaultKeyDto,
  SystemConfigFeatureFlagEvaluationQueryDto,
  SystemConfigRuntimeQueryDto,
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
  SYSTEM_CONFIG_DEFAULT_ENVIRONMENT,
  parseFeatureFlagAudienceRulesConfig,
  createSystemConfigExportPreview,
  normalizeRequiredSystemConfigEnvironment,
  normalizeSystemConfigEnvironment,
  systemConfigBadRequest,
  systemConfigForbidden,
  systemConfigNotFound,
  SystemConfigRepository,
  toFeatureFlagAudienceName,
  toFeatureFlagName,
  toFeatureFlagRolloutName,
  type FeatureFlagAudienceRulesConfig,
  type SystemConfigSecretValueResult,
  type SystemConfigBatchMutationRecord,
  type SystemConfigExportPreview,
  type SystemConfigPageQuery,
} from './system-config.repository';

export type SystemConfigValueResult = {
  key: string;
  value: string;
  valueType: SystemConfigRecord['valueType'];
  environment: string;
  overridden: boolean;
};

export type SystemConfigCacheRefreshResult = {
  refreshed: true;
  cachedKeys: number;
  refreshedAt: string;
};

export type SystemConfigFeatureFlagRule = {
  audienceRules: FeatureFlagAudienceRulesConfig;
  enabled: boolean;
  rolloutPercentage: number;
};

export type SystemConfigRuntimeResult = {
  environment: string;
  adminTitle: string;
  featureFlags: Record<string, boolean>;
  featureFlagRules: Record<string, SystemConfigFeatureFlagRule>;
  loginLockoutMinutes: number;
  loginMaxFailedAttempts: number;
};

export type SystemConfigFeatureFlagEvaluationResult = {
  flag: string;
  environment: string;
  subjectKey: string;
  enabled: boolean;
  rolloutPercentage: number;
  bucket: number;
  audienceMatched: boolean;
  reason:
    | 'audience-mismatch'
    | 'global-disabled'
    | 'matched-rollout'
    | 'outside-rollout';
};

const ADMIN_TITLE_CONFIG_KEY = 'opencore.admin.title';
const LOGIN_LOCKOUT_MINUTES_CONFIG_KEY = 'auth.login.lockoutMinutes';
const LOGIN_MAX_FAILED_ATTEMPTS_CONFIG_KEY = 'auth.login.maxFailedAttempts';
const ROOT_TENANT_ID = 'tenant_root';
const MIN_LOGIN_LOCKOUT_MINUTES = 1;
const MAX_LOGIN_LOCKOUT_MINUTES = 1440;
const MIN_LOGIN_MAX_FAILED_ATTEMPTS = 1;
const MAX_LOGIN_MAX_FAILED_ATTEMPTS = 20;

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

  resolveSecretConfigValue(
    key: string | undefined,
  ): Promise<SystemConfigSecretValueResult> {
    return this.repository.resolveSecretConfigValue(
      normalizeConfigValueKey(key),
    );
  }

  async getConfigValueByKey(
    key: string | undefined,
    environment?: string,
  ): Promise<SystemConfigValueResult> {
    const normalizedKey = normalizeConfigValueKey(key);
    const normalizedEnvironment = normalizeSystemConfigEnvironment(environment);
    const tenantId = resolveCurrentTenantId();
    const cacheKey = createConfigValueCacheKey(
      tenantId,
      normalizedKey,
      normalizedEnvironment,
    );
    const cached = this.valueCache.get(cacheKey);
    if (cached) {
      return { ...cached };
    }

    const value = await this.resolvePublicConfigValue(
      normalizedKey,
      normalizedEnvironment,
    );
    this.valueCache.set(cacheKey, value);
    return { ...value };
  }

  async getRuntimeConfig(
    query: SystemConfigRuntimeQueryDto = {},
  ): Promise<SystemConfigRuntimeResult> {
    const environment = normalizeSystemConfigEnvironment(query.environment);
    const [
      adminTitle,
      featureFlagRules,
      loginLockoutMinutes,
      loginMaxFailedAttempts,
    ] = await Promise.all([
      this.getConfigValueByKey(ADMIN_TITLE_CONFIG_KEY, environment),
      this.listRuntimeFeatureFlagRules(environment),
      this.getConfigValueByKey(LOGIN_LOCKOUT_MINUTES_CONFIG_KEY, environment),
      this.getConfigValueByKey(
        LOGIN_MAX_FAILED_ATTEMPTS_CONFIG_KEY,
        environment,
      ),
    ]);

    return {
      environment,
      adminTitle: adminTitle.value,
      featureFlags: Object.fromEntries(
        Object.entries(featureFlagRules).map(([name, rule]) => [
          name,
          rule.enabled,
        ]),
      ),
      featureFlagRules,
      loginLockoutMinutes: parseRuntimeIntegerInRange(
        loginLockoutMinutes.value,
        LOGIN_LOCKOUT_MINUTES_CONFIG_KEY,
        MIN_LOGIN_LOCKOUT_MINUTES,
        MAX_LOGIN_LOCKOUT_MINUTES,
      ),
      loginMaxFailedAttempts: parseRuntimeIntegerInRange(
        loginMaxFailedAttempts.value,
        LOGIN_MAX_FAILED_ATTEMPTS_CONFIG_KEY,
        MIN_LOGIN_MAX_FAILED_ATTEMPTS,
        MAX_LOGIN_MAX_FAILED_ATTEMPTS,
      ),
    };
  }

  async evaluateFeatureFlag(
    query: SystemConfigFeatureFlagEvaluationQueryDto,
  ): Promise<SystemConfigFeatureFlagEvaluationResult> {
    const flag = normalizeFeatureFlagEvaluationName(query?.flag);
    const environment = normalizeSystemConfigEnvironment(query?.environment);
    const subjectKey = normalizeFeatureFlagSubjectKey(query?.subjectKey);
    const subjectAttributes = normalizeFeatureFlagSubjectAttributes(
      query?.attributes,
    );
    const rules = await this.listRuntimeFeatureFlagRules(environment);
    const rule = rules[flag];

    if (!rule) {
      throw systemConfigNotFound(
        'SYSTEM_CONFIG_FEATURE_FLAG_NOT_FOUND',
        `Feature flag not found: ${flag}`,
        { flag },
      );
    }

    const bucket = createFeatureFlagBucket(flag, subjectKey);
    const audienceMatched = matchesFeatureFlagAudience(
      rule.audienceRules,
      subjectAttributes,
    );
    const matched = bucket < rule.rolloutPercentage;
    const enabled = rule.enabled && audienceMatched && matched;

    return {
      flag,
      environment,
      subjectKey,
      enabled,
      rolloutPercentage: rule.rolloutPercentage,
      bucket,
      audienceMatched,
      reason: !rule.enabled
        ? 'global-disabled'
        : !audienceMatched
          ? 'audience-mismatch'
          : matched
            ? 'matched-rollout'
            : 'outside-rollout',
    };
  }

  async refreshConfigCache(): Promise<SystemConfigCacheRefreshResult> {
    this.valueCache.clear();
    let cachedKeys = 0;
    let page = 1;

    while (true) {
      const result = await this.repository.listConfig({ page, pageSize: 100 });
      for (const config of result.items) {
        if (config.visibility === 'public') {
          const value = toPublicConfigValue(
            config,
            SYSTEM_CONFIG_DEFAULT_ENVIRONMENT,
            false,
          );
          this.valueCache.set(
            createConfigValueCacheKey(
              resolveCurrentTenantId(),
              value.key,
              SYSTEM_CONFIG_DEFAULT_ENVIRONMENT,
            ),
            value,
          );
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
    assertRuntimeConfigMutation(key, body);
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

  listConfigEnvironmentOverrides(
    key: string,
  ): Promise<readonly SystemConfigEnvironmentOverrideRecord[]> {
    return this.repository.listConfigEnvironmentOverrides(
      normalizeConfigValueKey(key),
    );
  }

  async upsertConfigEnvironmentOverride(
    key: string,
    environment: string,
    body: UpsertSystemConfigEnvironmentOverrideDto,
  ): Promise<SystemConfigEnvironmentOverrideRecord> {
    const normalizedKey = normalizeConfigValueKey(key);
    const normalizedEnvironment =
      normalizeRequiredSystemConfigEnvironment(environment);
    const override = await this.repository.upsertConfigEnvironmentOverride(
      normalizedKey,
      normalizedEnvironment,
      body,
    );
    this.invalidateValueCache(normalizedKey);

    return override;
  }

  async deleteConfigEnvironmentOverride(
    key: string,
    environment: string,
  ): Promise<{ deleted: true }> {
    const normalizedKey = normalizeConfigValueKey(key);
    const normalizedEnvironment =
      normalizeRequiredSystemConfigEnvironment(environment);
    const result = await this.repository.deleteConfigEnvironmentOverride(
      normalizedKey,
      normalizedEnvironment,
    );
    this.invalidateValueCache(normalizedKey);

    return result;
  }

  listConfigSecretVersions(
    key: string,
  ): Promise<readonly SystemConfigSecretVersionRecord[]> {
    return this.repository.listConfigSecretVersions(
      normalizeConfigValueKey(key),
    );
  }

  async rotateSecretConfig(
    key: string,
    body: RotateSystemConfigSecretDto,
  ): Promise<SystemConfigSecretVersionRecord> {
    const normalizedKey = normalizeConfigValueKey(key);
    const version = await this.repository.rotateSecretConfig(
      normalizedKey,
      body,
    );
    this.invalidateValueCache(normalizedKey);

    return version;
  }

  getConfigVaultStatus(): Promise<SystemConfigVaultStatusRecord> {
    return this.repository.getConfigVaultStatus();
  }

  async rotateConfigVaultKey(
    body: RotateSystemConfigVaultKeyDto,
  ): Promise<SystemConfigVaultKeyRotationRecord> {
    const result = await this.repository.rotateConfigVaultKey(body);
    this.valueCache.clear();

    return result;
  }

  async createExportPreview(
    query: SystemConfigPageQuery = {},
  ): Promise<SystemConfigExportPreview> {
    return createSystemConfigExportPreview(
      await this.repository.listConfig(query),
    );
  }

  private async resolvePublicConfigValue(
    key: string,
    environment: string,
  ): Promise<SystemConfigValueResult> {
    const baseValue = toPublicConfigValue(
      await this.repository.getConfig(key),
      environment,
      false,
    );

    if (environment === SYSTEM_CONFIG_DEFAULT_ENVIRONMENT) {
      return baseValue;
    }

    try {
      const override = await this.repository.getConfigEnvironmentOverride(
        key,
        environment,
      );

      return {
        key,
        value: override.value,
        valueType: override.valueType,
        environment,
        overridden: true,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return baseValue;
      }

      throw error;
    }
  }

  private invalidateValueCache(key: string): void {
    for (const cacheKey of this.valueCache.keys()) {
      if (cacheKey.endsWith(`\0${key}`)) {
        this.valueCache.delete(cacheKey);
      }
    }
  }

  private async listRuntimeFeatureFlagRules(
    environment: string,
  ): Promise<Record<string, SystemConfigFeatureFlagRule>> {
    const enabledFlags: Record<string, boolean> = {};
    const rolloutPercentages: Record<string, number> = {};
    const audienceRules: Record<string, FeatureFlagAudienceRulesConfig> = {};
    let page = 1;

    while (true) {
      const result = await this.repository.listConfig({ page, pageSize: 100 });

      for (const config of result.items) {
        const flagName = toFeatureFlagName(config.key);
        if (flagName) {
          if (
            config.visibility !== 'public' ||
            config.valueType !== 'boolean'
          ) {
            throw systemConfigBadRequest(
              'SYSTEM_CONFIG_FEATURE_FLAG_RUNTIME_SHAPE_INVALID',
              `Feature flag config ${config.key} must be public boolean.`,
              {
                expectedValueType: 'boolean',
                expectedVisibility: 'public',
                key: config.key,
                valueType: config.valueType,
                visibility: config.visibility,
              },
            );
          }

          const value = await this.getConfigValueByKey(config.key, environment);
          enabledFlags[flagName] = value.value === 'true';
        }

        const rolloutName = toFeatureFlagRolloutName(config.key);
        if (rolloutName) {
          if (config.visibility !== 'public' || config.valueType !== 'number') {
            throw systemConfigBadRequest(
              'SYSTEM_CONFIG_FEATURE_FLAG_RUNTIME_SHAPE_INVALID',
              `Feature flag rollout config ${config.key} must be public number.`,
              {
                expectedValueType: 'number',
                expectedVisibility: 'public',
                key: config.key,
                valueType: config.valueType,
                visibility: config.visibility,
              },
            );
          }

          const value = await this.getConfigValueByKey(config.key, environment);
          rolloutPercentages[rolloutName] = parseFeatureFlagRolloutPercentage(
            value.value,
            config.key,
          );
        }

        const audienceName = toFeatureFlagAudienceName(config.key);
        if (audienceName) {
          if (config.visibility !== 'public' || config.valueType !== 'json') {
            throw systemConfigBadRequest(
              'SYSTEM_CONFIG_FEATURE_FLAG_RUNTIME_SHAPE_INVALID',
              `Feature flag audience config ${config.key} must be public json.`,
              {
                expectedValueType: 'json',
                expectedVisibility: 'public',
                key: config.key,
                valueType: config.valueType,
                visibility: config.visibility,
              },
            );
          }

          const value = await this.getConfigValueByKey(config.key, environment);
          audienceRules[audienceName] = parseFeatureFlagAudienceRulesConfig(
            value.value,
            config.key,
          );
        }
      }

      if (page >= result.totalPages) {
        break;
      }
      page += 1;
    }

    for (const flagName of Object.keys(rolloutPercentages)) {
      if (enabledFlags[flagName] === undefined) {
        throw systemConfigBadRequest(
          'SYSTEM_CONFIG_FEATURE_ROLLOUT_ENABLED_MISSING',
          `Feature flag rollout ${flagName} is missing its enabled config.`,
          { flag: flagName },
        );
      }
    }

    for (const flagName of Object.keys(audienceRules)) {
      if (enabledFlags[flagName] === undefined) {
        throw systemConfigBadRequest(
          'SYSTEM_CONFIG_FEATURE_AUDIENCE_ENABLED_MISSING',
          `Feature flag audience ${flagName} is missing its enabled config.`,
          { flag: flagName },
        );
      }
    }

    return Object.fromEntries(
      Object.entries(enabledFlags)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, enabled]) => [
          name,
          {
            audienceRules: audienceRules[name] ?? {
              mode: 'all',
              rules: [],
            },
            enabled,
            rolloutPercentage: rolloutPercentages[name] ?? 100,
          },
        ]),
    );
  }
}

function parseRuntimeIntegerInRange(
  value: string,
  key: string,
  minimum: number,
  maximum: number,
): number {
  const normalized = value.trim();
  const parsed = Number(normalized);

  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_RUNTIME_INTEGER_INVALID',
      `Runtime config ${key} must be an integer between ${minimum} and ${maximum}.`,
      { key, maximum, minimum, value },
    );
  }

  return parsed;
}

function parseFeatureFlagRolloutPercentage(value: string, key: string): number {
  const normalized = value.trim();
  const parsed = Number(normalized);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_FLAG_ROLLOUT_INVALID',
      `Feature flag rollout ${key} must be an integer between 0 and 100.`,
      { key, maximum: 100, minimum: 0, value },
    );
  }

  return parsed;
}

function normalizeFeatureFlagEvaluationName(value: unknown): string {
  if (typeof value !== 'string') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_FLAG_NAME_INVALID_TYPE',
      'Feature flag name must be a string.',
      { field: 'flag' },
    );
  }

  const normalized = value.trim();

  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(normalized)) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_FLAG_NAME_INVALID',
      'Feature flag name is invalid.',
      { flag: value },
    );
  }

  return normalized;
}

function normalizeFeatureFlagSubjectKey(value: unknown): string {
  if (typeof value !== 'string') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_KEY_INVALID_TYPE',
      'Feature flag subject key must be a string.',
      { field: 'subjectKey' },
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_KEY_REQUIRED',
      'Feature flag subject key is required.',
      { field: 'subjectKey' },
    );
  }

  if (normalized.length > 200) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_KEY_TOO_LONG',
      'Feature flag subject key must not exceed 200 characters.',
      { field: 'subjectKey', maxLength: 200 },
    );
  }

  return normalized;
}

function normalizeFeatureFlagSubjectAttributes(
  value: unknown,
): Record<string, string> {
  if (value === undefined || value === null || value === '') {
    return {};
  }

  if (typeof value !== 'string') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_ATTRIBUTES_INVALID_TYPE',
      'Feature flag subject attributes must be a JSON object string.',
      { field: 'attributes' },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_ATTRIBUTES_JSON_INVALID',
      'Feature flag subject attributes must be valid JSON.',
      { field: 'attributes' },
    );
  }

  if (!isPlainRecord(parsed)) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_ATTRIBUTES_OBJECT_INVALID',
      'Feature flag subject attributes must be a JSON object.',
      { field: 'attributes' },
    );
  }

  const entries = Object.entries(parsed);
  if (entries.length > 50) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_ATTRIBUTES_TOO_MANY',
      'Feature flag subject attributes must not exceed 50 keys.',
      { field: 'attributes', maxKeys: 50 },
    );
  }

  return Object.fromEntries(
    entries.map(([key, attributeValue]) => [
      normalizeFeatureFlagSubjectAttributeKey(key),
      normalizeFeatureFlagSubjectAttributeValue(attributeValue, key),
    ]),
  );
}

function createFeatureFlagBucket(flag: string, subjectKey: string): number {
  const hash = createHash('sha256')
    .update(`${flag}:${subjectKey}`, 'utf8')
    .digest();

  return hash.readUInt32BE(0) % 100;
}

function matchesFeatureFlagAudience(
  audienceRules: FeatureFlagAudienceRulesConfig,
  subjectAttributes: Record<string, string>,
): boolean {
  if (audienceRules.rules.length === 0) {
    return true;
  }

  const results = audienceRules.rules.map((rule) => {
    const actual = subjectAttributes[rule.attribute];

    if (actual === undefined) {
      return rule.operator === 'not_equals' || rule.operator === 'not_in';
    }

    if (rule.operator === 'equals') {
      return actual === rule.values[0];
    }

    if (rule.operator === 'not_equals') {
      return actual !== rule.values[0];
    }

    if (rule.operator === 'in') {
      return rule.values.includes(actual);
    }

    return !rule.values.includes(actual);
  });

  return audienceRules.mode === 'all'
    ? results.every(Boolean)
    : results.some(Boolean);
}

function normalizeFeatureFlagSubjectAttributeKey(value: string): string {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9_.-]{1,80}$/.test(normalized)) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_ATTRIBUTE_KEY_INVALID',
      'Feature flag subject attribute key is invalid.',
      { attribute: value },
    );
  }

  return normalized;
}

function normalizeFeatureFlagSubjectAttributeValue(
  value: unknown,
  key: string,
): string {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean'
  ) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_ATTRIBUTE_VALUE_INVALID_TYPE',
      `Feature flag subject attribute ${key} must be a string, number or boolean.`,
      { attribute: key },
    );
  }

  const normalized = String(value).trim();
  if (!normalized || normalized.length > 100) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_FLAG_SUBJECT_ATTRIBUTE_VALUE_INVALID',
      `Feature flag subject attribute ${key} must be 1 to 100 characters.`,
      { attribute: key, maxLength: 100, minLength: 1 },
    );
  }

  return normalized;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertRuntimeConfigMutation(
  key: string,
  body: UpdateSystemConfigDto,
): void {
  if (
    key !== ADMIN_TITLE_CONFIG_KEY &&
    key !== LOGIN_LOCKOUT_MINUTES_CONFIG_KEY &&
    key !== LOGIN_MAX_FAILED_ATTEMPTS_CONFIG_KEY
  ) {
    return;
  }

  if (
    body.public === false ||
    (body.visibility !== undefined && body.visibility !== 'public')
  ) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_RUNTIME_VISIBILITY_INVALID',
      `Runtime config ${key} must remain public.`,
      {
        key,
        visibility:
          body.visibility ?? (body.public === false ? 'private' : undefined),
      },
    );
  }

  if (key === ADMIN_TITLE_CONFIG_KEY) {
    if (body.valueType !== undefined && body.valueType !== 'string') {
      throw systemConfigBadRequest(
        'SYSTEM_CONFIG_RUNTIME_VALUE_TYPE_INVALID',
        `Runtime config ${key} must keep string value type.`,
        { expectedValueType: 'string', key, valueType: body.valueType },
      );
    }
    return;
  }

  if (body.valueType !== undefined && body.valueType !== 'number') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_RUNTIME_VALUE_TYPE_INVALID',
      `Runtime config ${key} must keep number value type.`,
      { expectedValueType: 'number', key, valueType: body.valueType },
    );
  }

  if (body.value !== undefined) {
    if (key === LOGIN_LOCKOUT_MINUTES_CONFIG_KEY) {
      parseRuntimeIntegerInRange(
        body.value,
        key,
        MIN_LOGIN_LOCKOUT_MINUTES,
        MAX_LOGIN_LOCKOUT_MINUTES,
      );
      return;
    }

    parseRuntimeIntegerInRange(
      body.value,
      key,
      MIN_LOGIN_MAX_FAILED_ATTEMPTS,
      MAX_LOGIN_MAX_FAILED_ATTEMPTS,
    );
  }
}

function normalizeConfigValueKey(key: string | undefined): string {
  if (typeof key !== 'string') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_KEY_REQUIRED',
      'System config key is required.',
      { field: 'key' },
    );
  }

  const normalized = key.trim();
  if (!normalized) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_KEY_REQUIRED',
      'System config key is required.',
      { field: 'key' },
    );
  }
  return normalized;
}

function toPublicConfigValue(
  config: SystemConfigRecord,
  environment: string,
  overridden: boolean,
): SystemConfigValueResult {
  if (config.visibility !== 'public') {
    throw systemConfigForbidden(
      'SYSTEM_CONFIG_VALUE_NOT_PUBLIC',
      `System config value is not public: ${config.key}`,
      { key: config.key, visibility: config.visibility },
    );
  }

  return {
    key: config.key,
    value: config.value,
    valueType: config.valueType,
    environment,
    overridden,
  };
}

function createConfigValueCacheKey(
  tenantId: string,
  key: string,
  environment: string,
): string {
  return `${tenantId}\0${environment}\0${key}`;
}

function resolveCurrentTenantId(): string {
  return getRequestContext()?.tenantId ?? ROOT_TENANT_ID;
}
