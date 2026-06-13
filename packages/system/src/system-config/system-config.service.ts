import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PageResult } from '@opencore/common';
import type {
  BatchDeleteSystemConfigsDto,
  CreateSystemConfigDto,
  SystemConfigFeatureFlagEvaluationQueryDto,
  UpdateSystemConfigDto,
} from './system-config.dto';
import type { SystemConfigRecord } from './system-config.records';
import {
  parseFeatureFlagAudienceRulesConfig,
  createSystemConfigExportPreview,
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
  adminTitle: string;
  featureFlags: Record<string, boolean>;
  featureFlagRules: Record<string, SystemConfigFeatureFlagRule>;
  loginLockoutMinutes: number;
  loginMaxFailedAttempts: number;
};

export type SystemConfigFeatureFlagEvaluationResult = {
  flag: string;
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

  async getRuntimeConfig(): Promise<SystemConfigRuntimeResult> {
    const [
      adminTitle,
      featureFlagRules,
      loginLockoutMinutes,
      loginMaxFailedAttempts,
    ] = await Promise.all([
      this.getConfigValueByKey(ADMIN_TITLE_CONFIG_KEY),
      this.listRuntimeFeatureFlagRules(),
      this.getConfigValueByKey(LOGIN_LOCKOUT_MINUTES_CONFIG_KEY),
      this.getConfigValueByKey(LOGIN_MAX_FAILED_ATTEMPTS_CONFIG_KEY),
    ]);

    return {
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
    const subjectKey = normalizeFeatureFlagSubjectKey(query?.subjectKey);
    const subjectAttributes = normalizeFeatureFlagSubjectAttributes(
      query?.attributes,
    );
    const rules = await this.listRuntimeFeatureFlagRules();
    const rule = rules[flag];

    if (!rule) {
      throw new NotFoundException(`Feature flag not found: ${flag}`);
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

  private async listRuntimeFeatureFlagRules(): Promise<
    Record<string, SystemConfigFeatureFlagRule>
  > {
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
            throw new BadRequestException(
              `Feature flag config ${config.key} must be public boolean.`,
            );
          }

          enabledFlags[flagName] = config.value === 'true';
        }

        const rolloutName = toFeatureFlagRolloutName(config.key);
        if (rolloutName) {
          if (config.visibility !== 'public' || config.valueType !== 'number') {
            throw new BadRequestException(
              `Feature flag rollout config ${config.key} must be public number.`,
            );
          }

          rolloutPercentages[rolloutName] = parseFeatureFlagRolloutPercentage(
            config.value,
            config.key,
          );
        }

        const audienceName = toFeatureFlagAudienceName(config.key);
        if (audienceName) {
          if (config.visibility !== 'public' || config.valueType !== 'json') {
            throw new BadRequestException(
              `Feature flag audience config ${config.key} must be public json.`,
            );
          }

          audienceRules[audienceName] = parseFeatureFlagAudienceRulesConfig(
            config.value,
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
        throw new BadRequestException(
          `Feature flag rollout ${flagName} is missing its enabled config.`,
        );
      }
    }

    for (const flagName of Object.keys(audienceRules)) {
      if (enabledFlags[flagName] === undefined) {
        throw new BadRequestException(
          `Feature flag audience ${flagName} is missing its enabled config.`,
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
    throw new BadRequestException(
      `Runtime config ${key} must be an integer between ${minimum} and ${maximum}.`,
    );
  }

  return parsed;
}

function parseFeatureFlagRolloutPercentage(value: string, key: string): number {
  const normalized = value.trim();
  const parsed = Number(normalized);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    throw new BadRequestException(
      `Feature flag rollout ${key} must be an integer between 0 and 100.`,
    );
  }

  return parsed;
}

function normalizeFeatureFlagEvaluationName(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('Feature flag name must be a string.');
  }

  const normalized = value.trim();

  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(normalized)) {
    throw new BadRequestException('Feature flag name is invalid.');
  }

  return normalized;
}

function normalizeFeatureFlagSubjectKey(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('Feature flag subject key must be a string.');
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException('Feature flag subject key is required.');
  }

  if (normalized.length > 200) {
    throw new BadRequestException(
      'Feature flag subject key must not exceed 200 characters.',
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
    throw new BadRequestException(
      'Feature flag subject attributes must be a JSON object string.',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new BadRequestException(
      'Feature flag subject attributes must be valid JSON.',
    );
  }

  if (!isPlainRecord(parsed)) {
    throw new BadRequestException(
      'Feature flag subject attributes must be a JSON object.',
    );
  }

  const entries = Object.entries(parsed);
  if (entries.length > 50) {
    throw new BadRequestException(
      'Feature flag subject attributes must not exceed 50 keys.',
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
    throw new BadRequestException(
      'Feature flag subject attribute key is invalid.',
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
    throw new BadRequestException(
      `Feature flag subject attribute ${key} must be a string, number or boolean.`,
    );
  }

  const normalized = String(value).trim();
  if (!normalized || normalized.length > 100) {
    throw new BadRequestException(
      `Feature flag subject attribute ${key} must be 1 to 100 characters.`,
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
    throw new BadRequestException(`Runtime config ${key} must remain public.`);
  }

  if (key === ADMIN_TITLE_CONFIG_KEY) {
    if (body.valueType !== undefined && body.valueType !== 'string') {
      throw new BadRequestException(
        `Runtime config ${key} must keep string value type.`,
      );
    }
    return;
  }

  if (body.valueType !== undefined && body.valueType !== 'number') {
    throw new BadRequestException(
      `Runtime config ${key} must keep number value type.`,
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
