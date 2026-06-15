import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  createApiErrorBody,
  createPageResult,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import type {
  BatchDeleteSystemConfigsDto,
  CreateSystemConfigDto,
  RotateSystemConfigSecretDto,
  RotateSystemConfigVaultKeyDto,
  UpdateSystemConfigDto,
  UpsertSystemConfigEnvironmentOverrideDto,
} from './system-config.dto';
import {
  createOpenCoreXlsxWorkbookBase64,
  OPENCORE_XLSX_CONTENT_TYPE,
} from '../export-xlsx';
import type {
  SystemConfigEnvironmentOverrideRecord,
  SystemConfigRecord,
  SystemConfigSecretVersionRecord,
  SystemConfigVaultKeyRotationRecord,
  SystemConfigVaultStatusRecord,
  SystemConfigValueType,
  SystemConfigVisibility,
} from './system-config.records';
import {
  decryptSystemConfigSecretValueAsync,
  decryptSystemConfigSecretValue,
  encryptSystemConfigSecretValueAsync,
  encryptSystemConfigSecretValue,
  getSystemConfigVaultBindingStatus,
  inspectSystemConfigSecretEnvelope,
  isEncryptedSystemConfigSecretValue,
  SYSTEM_CONFIG_REDACTED_SECRET_VALUE,
} from './system-config.vault';

export type SystemConfigExportPreview = {
  filename: string;
  contentType: string;
  contentBase64: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export type SystemConfigSecretValueResult = {
  key: string;
  value: string;
  valueType: 'string';
};

export type SystemConfigBatchMutationRecord = {
  deleted: true;
  affected: number;
  keys: readonly string[];
};

export type SystemConfigPageQuery = PageQueryInput;
export type SystemConfigEnvironment = string;

export type SystemConfigNormalizedPageQuery = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  skip: number;
  take: number;
};

const SENSITIVE_CONFIG_KEY_PATTERN =
  /(authorization|cookie|password|secret|token)/i;
const FEATURE_FLAG_CONFIG_KEY_PATTERN =
  /^feature\.[a-z0-9]+(?:[.-][a-z0-9]+)*\.enabled$/;
const FEATURE_FLAG_ROLLOUT_CONFIG_KEY_PATTERN =
  /^feature\.[a-z0-9]+(?:[.-][a-z0-9]+)*\.rolloutPercentage$/;
const FEATURE_FLAG_AUDIENCE_CONFIG_KEY_PATTERN =
  /^feature\.[a-z0-9]+(?:[.-][a-z0-9]+)*\.audienceRules$/;
const FEATURE_FLAG_AUDIENCE_ATTRIBUTE_PATTERN = /^[A-Za-z0-9_.-]{1,80}$/;
const SYSTEM_CONFIG_ENVIRONMENT_PATTERN = /^[a-z][a-z0-9-]{1,39}$/;
export const SYSTEM_CONFIG_DEFAULT_ENVIRONMENT = 'default';
export const SYSTEM_CONFIG_EXPORT_CONTENT_TYPE = OPENCORE_XLSX_CONTENT_TYPE;
export const SYSTEM_CONFIG_EXPORT_COLUMNS = [
  'category',
  'name',
  'key',
  'value',
  'valueType',
  'visibility',
  'encrypted',
  'public',
  'featureFlag',
  'featureRollout',
  'featureAudience',
  'system',
  'description',
  'remark',
] as const;

export type FeatureFlagAudienceOperator =
  | 'equals'
  | 'in'
  | 'not_equals'
  | 'not_in';

export type FeatureFlagAudienceRuleConfig = {
  attribute: string;
  operator: FeatureFlagAudienceOperator;
  values: readonly string[];
};

export type FeatureFlagAudienceRulesConfig = {
  mode: 'all' | 'any';
  rules: readonly FeatureFlagAudienceRuleConfig[];
};

export abstract class SystemConfigRepository {
  abstract listConfig(
    query?: SystemConfigPageQuery,
  ): Promise<PageResult<SystemConfigRecord>>;

  abstract getConfig(key: string): Promise<SystemConfigRecord>;

  abstract resolveSecretConfigValue(
    key: string,
  ): Promise<SystemConfigSecretValueResult>;

  abstract createConfig(
    body: CreateSystemConfigDto,
  ): Promise<SystemConfigRecord>;

  abstract updateConfig(
    key: string,
    body: UpdateSystemConfigDto,
  ): Promise<SystemConfigRecord>;

  abstract deleteConfig(key: string): Promise<{ deleted: true }>;

  abstract deleteConfigs(
    body: BatchDeleteSystemConfigsDto,
  ): Promise<SystemConfigBatchMutationRecord>;

  abstract listConfigEnvironmentOverrides(
    key: string,
  ): Promise<readonly SystemConfigEnvironmentOverrideRecord[]>;

  abstract getConfigEnvironmentOverride(
    key: string,
    environment: string,
  ): Promise<SystemConfigEnvironmentOverrideRecord>;

  abstract upsertConfigEnvironmentOverride(
    key: string,
    environment: string,
    body: UpsertSystemConfigEnvironmentOverrideDto,
  ): Promise<SystemConfigEnvironmentOverrideRecord>;

  abstract deleteConfigEnvironmentOverride(
    key: string,
    environment: string,
  ): Promise<{ deleted: true }>;

  abstract listConfigSecretVersions(
    key: string,
  ): Promise<readonly SystemConfigSecretVersionRecord[]>;

  abstract rotateSecretConfig(
    key: string,
    body: RotateSystemConfigSecretDto,
  ): Promise<SystemConfigSecretVersionRecord>;

  abstract getConfigVaultStatus(): Promise<SystemConfigVaultStatusRecord>;

  abstract rotateConfigVaultKey(
    body: RotateSystemConfigVaultKeyDto,
  ): Promise<SystemConfigVaultKeyRotationRecord>;
}

export function systemConfigBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

export function systemConfigConflict(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ConflictException {
  return new ConflictException(
    createApiErrorBody({ code, message, details }),
  );
}

export function systemConfigForbidden(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ForbiddenException {
  return new ForbiddenException(
    createApiErrorBody({ code, message, details }),
  );
}

export function systemConfigNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, message, details }));
}

export function normalizeSystemConfigPageQuery(
  query: SystemConfigPageQuery = {},
  total: number,
): SystemConfigNormalizedPageQuery {
  const pagination = normalizePagination(query, { maxPageSize: 100 });
  const totalPages = Math.ceil(total / pagination.pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(pagination.page, totalPages);

  return {
    page: safePage,
    pageSize: pagination.pageSize,
    total,
    totalPages,
    skip: (safePage - 1) * pagination.pageSize,
    take: pagination.pageSize,
  };
}

export function createSystemConfigPageResult<T>(
  items: readonly T[],
  pagination: SystemConfigNormalizedPageQuery,
): PageResult<T> {
  return createPageResult(
    [...items],
    {
      page: pagination.page,
      pageSize: pagination.pageSize,
    },
    pagination.total,
  );
}

export function createSystemConfigExportPreview(
  page: PageResult<SystemConfigRecord>,
): SystemConfigExportPreview {
  const generatedAt = new Date().toISOString();

  return {
    filename: 'opencore-system-config.xlsx',
    contentType: SYSTEM_CONFIG_EXPORT_CONTENT_TYPE,
    contentBase64: createOpenCoreXlsxWorkbookBase64({
      worksheetRows: createSystemConfigExportWorksheetRows(page.items),
      generatedAt,
      sheetName: 'Config',
    }),
    scope: 'current-page',
    columns: SYSTEM_CONFIG_EXPORT_COLUMNS,
    rowCount: page.items.length,
    generatedAt,
  };
}

function createSystemConfigExportWorksheetRows(
  rows: readonly SystemConfigRecord[],
): readonly (readonly string[])[] {
  return [
    SYSTEM_CONFIG_EXPORT_COLUMNS,
    ...rows.map((row) => [
      row.category,
      row.name,
      row.key,
      row.value,
      row.valueType,
      row.visibility,
      row.encrypted ? 'true' : 'false',
      row.public ? 'true' : 'false',
      toFeatureFlagName(row.key) ?? '',
      toFeatureFlagRolloutName(row.key) ?? '',
      toFeatureFlagAudienceName(row.key) ?? '',
      row.system ? 'true' : 'false',
      row.description ?? '',
      row.remark ?? '',
    ]),
  ];
}

export function assertSafeConfigKey(
  key: string,
  visibility: SystemConfigVisibility = resolveConfigVisibility({
    key,
    public: false,
  }),
): void {
  if (SENSITIVE_CONFIG_KEY_PATTERN.test(key) && visibility !== 'secret') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_SECRET_KEY_VISIBILITY_REQUIRED',
      'Secret-like system config keys must be explicitly marked with secret visibility.',
      { key, visibility },
    );
  }

  if (visibility === 'secret' && !SENSITIVE_CONFIG_KEY_PATTERN.test(key)) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_SECRET_VISIBILITY_KEY_REQUIRED',
      'Secret system config visibility requires a secret-like key name.',
      { key, visibility },
    );
  }
}

export function assertSecretConfigShape(input: {
  key: string;
  valueType: SystemConfigValueType;
  visibility: SystemConfigVisibility;
}): void {
  if (input.visibility !== 'secret') {
    return;
  }

  if (input.valueType !== 'string') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_SECRET_VALUE_TYPE_INVALID',
      `Secret system config ${input.key} must keep string value type.`,
      { key: input.key, valueType: input.valueType },
    );
  }
}

export function assertSecretVersionedConfig(config: {
  key: string;
  valueType: SystemConfigValueType;
  visibility: SystemConfigVisibility;
}): void {
  if (config.visibility !== 'secret') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_SECRET_VERSION_VISIBILITY_INVALID',
      `Only secret system config can keep secret versions: ${config.key}`,
      { key: config.key, visibility: config.visibility },
    );
  }

  if (config.valueType !== 'string') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_SECRET_VALUE_TYPE_INVALID',
      `Secret system config ${config.key} must keep string value type.`,
      { key: config.key, valueType: config.valueType },
    );
  }
}

export function isFeatureFlagConfigKey(key: string): boolean {
  return FEATURE_FLAG_CONFIG_KEY_PATTERN.test(key);
}

export function isFeatureFlagRolloutConfigKey(key: string): boolean {
  return FEATURE_FLAG_ROLLOUT_CONFIG_KEY_PATTERN.test(key);
}

export function isFeatureFlagAudienceConfigKey(key: string): boolean {
  return FEATURE_FLAG_AUDIENCE_CONFIG_KEY_PATTERN.test(key);
}

export function toFeatureFlagName(key: string): string | undefined {
  if (!isFeatureFlagConfigKey(key)) {
    return undefined;
  }

  return key.slice('feature.'.length, -'.enabled'.length);
}

export function toFeatureFlagRolloutName(key: string): string | undefined {
  if (!isFeatureFlagRolloutConfigKey(key)) {
    return undefined;
  }

  return key.slice('feature.'.length, -'.rolloutPercentage'.length);
}

export function toFeatureFlagAudienceName(key: string): string | undefined {
  if (!isFeatureFlagAudienceConfigKey(key)) {
    return undefined;
  }

  return key.slice('feature.'.length, -'.audienceRules'.length);
}

export function assertFeatureFlagConfigShape(input: {
  key: string;
  value?: unknown;
  valueType: SystemConfigValueType;
  visibility: SystemConfigVisibility;
}): void {
  if (
    !isFeatureFlagConfigKey(input.key) &&
    !isFeatureFlagRolloutConfigKey(input.key) &&
    !isFeatureFlagAudienceConfigKey(input.key)
  ) {
    return;
  }

  const valueType = isFeatureFlagConfigKey(input.key)
    ? 'boolean'
    : isFeatureFlagRolloutConfigKey(input.key)
      ? 'number'
      : 'json';
  const valueTypeLabel =
    valueType === 'boolean'
      ? 'boolean value type'
      : valueType === 'number'
        ? 'number value type'
        : 'json value type';

  if (input.valueType !== valueType) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_FLAG_VALUE_TYPE_INVALID',
      `Feature flag config ${input.key} must keep ${valueTypeLabel}.`,
      { expectedValueType: valueType, key: input.key, valueType: input.valueType },
    );
  }

  if (input.visibility !== 'public') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_FLAG_VISIBILITY_INVALID',
      `Feature flag config ${input.key} must remain public.`,
      { key: input.key, visibility: input.visibility },
    );
  }

  if (isFeatureFlagRolloutConfigKey(input.key) && input.value !== undefined) {
    const normalized =
      typeof input.value === 'string' ? input.value.trim() : input.value;
    const percentage = Number(normalized);

    if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
      throw systemConfigBadRequest(
        'SYSTEM_CONFIG_FEATURE_FLAG_ROLLOUT_INVALID',
        `Feature flag rollout ${input.key} must be an integer between 0 and 100.`,
        { key: input.key, maximum: 100, minimum: 0, value: input.value },
      );
    }
  }

  if (isFeatureFlagAudienceConfigKey(input.key) && input.value !== undefined) {
    parseFeatureFlagAudienceRulesConfig(input.value, input.key);
  }
}

export function assertEnvironmentOverrideConfig(config: {
  key: string;
  valueType: SystemConfigValueType;
  visibility: SystemConfigVisibility;
}): void {
  if (config.visibility !== 'public') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_ENVIRONMENT_OVERRIDE_VISIBILITY_INVALID',
      `Only public system config can define environment overrides: ${config.key}`,
      { key: config.key, visibility: config.visibility },
    );
  }

  if (
    isFeatureFlagConfigKey(config.key) ||
    isFeatureFlagRolloutConfigKey(config.key) ||
    isFeatureFlagAudienceConfigKey(config.key)
  ) {
    assertFeatureFlagConfigShape({
      key: config.key,
      valueType: config.valueType,
      visibility: 'public',
    });
  }
}

export function resolveConfigVisibility(input: {
  key: string;
  public?: boolean;
  visibility?: SystemConfigVisibility;
}): SystemConfigVisibility {
  if (input.visibility) {
    return input.visibility;
  }

  return input.public ? 'public' : 'private';
}

export function resolveStoredConfigVisibility(input: {
  key: string;
  public?: boolean;
  visibility?: SystemConfigVisibility;
}): SystemConfigVisibility {
  if (input.visibility) {
    return input.visibility;
  }

  if (SENSITIVE_CONFIG_KEY_PATTERN.test(input.key)) {
    return 'secret';
  }

  return input.public ? 'public' : 'private';
}

export function redactSystemConfig(
  config: SystemConfigRecord,
): SystemConfigRecord {
  const visibility = resolveStoredConfigVisibility(config);

  return {
    ...config,
    encrypted: visibility === 'secret' ? config.encrypted : false,
    public: visibility === 'public',
    visibility,
    value:
      visibility === 'secret'
        ? SYSTEM_CONFIG_REDACTED_SECRET_VALUE
        : config.value,
  };
}

export function normalizeStoredConfigValue(input: {
  key: string;
  value: unknown;
  valueType: SystemConfigValueType;
  visibility: SystemConfigVisibility;
}): string {
  const normalized = normalizeConfigValue(input.value, input.valueType);

  if (input.visibility !== 'secret') {
    return normalized;
  }

  return encryptSystemConfigSecretValue(input.key, normalized);
}

export async function normalizeStoredConfigValueAsync(input: {
  key: string;
  value: unknown;
  valueType: SystemConfigValueType;
  visibility: SystemConfigVisibility;
}): Promise<string> {
  const normalized = normalizeConfigValue(input.value, input.valueType);

  if (input.visibility !== 'secret') {
    return normalized;
  }

  return encryptSystemConfigSecretValueAsync(input.key, normalized);
}

export function normalizeExistingConfigValue(input: {
  key: string;
  value: string;
  valueType: SystemConfigValueType;
  visibility: SystemConfigVisibility;
}): string {
  const value =
    input.visibility === 'secret'
      ? decryptSystemConfigSecretValue(input.key, input.value)
      : input.value;

  return normalizeConfigValue(value, input.valueType);
}

export async function normalizeExistingConfigValueAsync(input: {
  key: string;
  value: string;
  valueType: SystemConfigValueType;
  visibility: SystemConfigVisibility;
}): Promise<string> {
  const value =
    input.visibility === 'secret'
      ? await decryptSystemConfigSecretValueAsync(input.key, input.value)
      : input.value;

  return normalizeConfigValue(value, input.valueType);
}

export function isSystemConfigSecretEncrypted(
  config: Pick<SystemConfigRecord, 'value' | 'visibility'>,
): boolean {
  return (
    config.visibility === 'secret' &&
    isEncryptedSystemConfigSecretValue(config.value)
  );
}

export function assertSystemConfigMutable(config: SystemConfigRecord): void {
  if (config.system) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_SYSTEM_IMMUTABLE',
      `System built-in config cannot be deleted: ${config.key}`,
      { key: config.key },
    );
  }
}

export function normalizeConfigCategory(value: unknown): string {
  if (value === undefined || value === null) {
    return 'system';
  }

  if (typeof value !== 'string') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_CATEGORY_INVALID_TYPE',
      'System config category must be a string.',
      { field: 'category' },
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_CATEGORY_REQUIRED',
      'System config category is required.',
      { field: 'category' },
    );
  }

  if (normalized.length > 50) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_CATEGORY_TOO_LONG',
      'System config category must not exceed 50 characters.',
      { field: 'category', maxLength: 50 },
    );
  }

  return normalized;
}

export function normalizeConfigName(value: unknown, key: string): string {
  if (value === undefined || value === null) {
    return key;
  }

  if (typeof value !== 'string') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_NAME_INVALID_TYPE',
      'System config name must be a string.',
      { field: 'name' },
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_NAME_REQUIRED',
      'System config name is required.',
      { field: 'name' },
    );
  }

  if (normalized.length > 100) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_NAME_TOO_LONG',
      'System config name must not exceed 100 characters.',
      { field: 'name', maxLength: 100 },
    );
  }

  return normalized;
}

export function normalizeConfigValue(
  value: unknown,
  valueType: SystemConfigValueType,
): string {
  if (typeof value !== 'string') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_VALUE_INVALID_TYPE',
      'System config value must be a string.',
      { field: 'value' },
    );
  }

  if (valueType === 'string') {
    return value;
  }

  const normalized = value.trim();

  if (valueType === 'json') {
    return JSON.stringify(parseJsonConfigValue(normalized));
  }

  if (valueType === 'boolean') {
    if (normalized !== 'true' && normalized !== 'false') {
      throw systemConfigBadRequest(
        'SYSTEM_CONFIG_VALUE_BOOLEAN_INVALID',
        'Boolean system config values must be "true" or "false".',
        { value },
      );
    }

    return normalized;
  }

  if (!normalized || !Number.isFinite(Number(normalized))) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_VALUE_NUMBER_INVALID',
      'Number system config values must be finite numbers.',
      { value },
    );
  }

  return normalized;
}

export function normalizeOptionalConfigText(
  value: unknown,
  fieldName: 'description' | 'remark',
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_TEXT_INVALID_TYPE',
      `System config ${fieldName} must be a string.`,
      { field: fieldName },
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length > 500) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_TEXT_TOO_LONG',
      `System config ${fieldName} must not exceed 500 characters.`,
      { field: fieldName, maxLength: 500 },
    );
  }

  return normalized;
}

export function normalizeSecretRotationActor(
  value: unknown,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_SECRET_ROTATION_ACTOR_INVALID_TYPE',
      'System config secret rotation actor must be a string.',
      { field: 'rotatedBy' },
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length > 100) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_SECRET_ROTATION_ACTOR_TOO_LONG',
      'System config secret rotation actor must not exceed 100 characters.',
      { field: 'rotatedBy', maxLength: 100 },
    );
  }

  return normalized;
}

export function normalizeSecretRotationValue(value: unknown): string {
  if (typeof value !== 'string') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_SECRET_ROTATION_VALUE_INVALID_TYPE',
      'System config secret rotation value must be a string.',
      { field: 'value' },
    );
  }

  if (!value.trim()) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_SECRET_ROTATION_VALUE_REQUIRED',
      'System config secret rotation value is required.',
      { field: 'value' },
    );
  }

  return value;
}

export function createSystemConfigVaultStatus(input: {
  currentSecretValues: readonly string[];
  secretVersionValues: readonly string[];
}): SystemConfigVaultStatusRecord {
  const binding = getSystemConfigVaultBindingStatus();
  const infos = [
    ...input.currentSecretValues,
    ...input.secretVersionValues,
  ].map(inspectSystemConfigSecretEnvelope);
  const currentInfos = input.currentSecretValues.map(
    inspectSystemConfigSecretEnvelope,
  );

  return {
    ...binding,
    activeKeyConfigCount: currentInfos.filter((info) => info.activeKey).length,
    encryptedConfigCount: currentInfos.filter((info) => info.encrypted).length,
    legacyEnvelopeCount: infos.filter((info) => info.envelopeVersion === 'v1')
      .length,
    secretVersionCount: input.secretVersionValues.length,
    staleKeyEnvelopeCount: infos.filter(
      (info) => info.encrypted && !info.activeKey,
    ).length,
  };
}

export function createSystemConfigVaultKeyRotationRecord(input: {
  currentSecretValues: readonly string[];
  reason?: string;
  rewrappedConfigCount: number;
  rewrappedSecretVersionCount: number;
  rotatedAt: string;
  rotatedBy?: string;
  secretVersionValues: readonly string[];
}): SystemConfigVaultKeyRotationRecord {
  return {
    ...createSystemConfigVaultStatus({
      currentSecretValues: input.currentSecretValues,
      secretVersionValues: input.secretVersionValues,
    }),
    reason: input.reason,
    rewrappedConfigCount: input.rewrappedConfigCount,
    rewrappedSecretVersionCount: input.rewrappedSecretVersionCount,
    rotatedAt: input.rotatedAt,
    rotatedBy: input.rotatedBy,
  };
}

export function normalizeSystemConfigEnvironment(value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return SYSTEM_CONFIG_DEFAULT_ENVIRONMENT;
  }

  if (typeof value !== 'string') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_ENVIRONMENT_INVALID_TYPE',
      'System config environment must be a string.',
      { field: 'environment' },
    );
  }

  const normalized = value.trim().toLowerCase();

  if (!SYSTEM_CONFIG_ENVIRONMENT_PATTERN.test(normalized)) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_ENVIRONMENT_INVALID',
      'System config environment must be 2 to 40 lowercase letters, numbers or hyphens, starting with a letter.',
      { environment: value },
    );
  }

  return normalized;
}

export function normalizeRequiredSystemConfigEnvironment(
  value: unknown,
): string {
  const environment = normalizeSystemConfigEnvironment(value);

  if (environment === SYSTEM_CONFIG_DEFAULT_ENVIRONMENT) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_ENVIRONMENT_DEFAULT_FORBIDDEN',
      'System config environment override cannot target the default environment.',
      { environment },
    );
  }

  return environment;
}

export function normalizeBatchSystemConfigKeys(
  value: unknown,
): readonly string[] {
  if (!Array.isArray(value)) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_KEYS_INVALID',
      'System config keys must be an array.',
      { field: 'keys' },
    );
  }

  if (value.length === 0) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_KEYS_EMPTY',
      'System config keys must not be empty.',
      { field: 'keys' },
    );
  }

  const normalized = value.map(normalizeSystemConfigKey);
  const duplicate = findFirstDuplicate(normalized);

  if (duplicate) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_KEY_DUPLICATED',
      `System config key is duplicated: ${duplicate}`,
      { key: duplicate },
    );
  }

  return [...normalized].sort();
}

function normalizeSystemConfigKey(value: unknown): string {
  if (typeof value !== 'string') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_KEY_INVALID_TYPE',
      'System config key must be a string.',
      { field: 'key' },
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_KEY_REQUIRED',
      'System config key is required.',
      { field: 'key' },
    );
  }

  return normalized;
}

function findFirstDuplicate(values: readonly string[]): string | undefined {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
  }

  return undefined;
}

export function toSystemConfigValueType(
  valueType: string,
): SystemConfigRecord['valueType'] {
  if (
    valueType === 'boolean' ||
    valueType === 'json' ||
    valueType === 'number' ||
    valueType === 'string'
  ) {
    return valueType;
  }

  return 'string';
}

export function parseFeatureFlagAudienceRulesConfig(
  value: unknown,
  key: string,
): FeatureFlagAudienceRulesConfig {
  const parsed =
    typeof value === 'string' ? parseJsonConfigValue(value.trim()) : value;

  if (!isPlainRecord(parsed)) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_AUDIENCE_INVALID',
      `Feature flag audience ${key} must be a JSON object.`,
      { key, reason: 'not-object' },
    );
  }

  const mode = parsed.mode;
  if (mode !== 'all' && mode !== 'any') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_AUDIENCE_MODE_INVALID',
      `Feature flag audience ${key} mode must be all or any.`,
      { key, mode },
    );
  }

  if (!Array.isArray(parsed.rules)) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_AUDIENCE_RULES_INVALID',
      `Feature flag audience ${key} rules must be an array.`,
      { key },
    );
  }

  if (parsed.rules.length > 20) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_AUDIENCE_RULES_TOO_MANY',
      `Feature flag audience ${key} must not exceed 20 rules.`,
      { key, maxItems: 20 },
    );
  }

  return {
    mode,
    rules: parsed.rules.map((rule, index) =>
      normalizeFeatureFlagAudienceRule(rule, key, index),
    ),
  };
}

function parseJsonConfigValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_VALUE_JSON_INVALID',
      'JSON system config values must be valid JSON.',
      { value },
    );
  }
}

function normalizeFeatureFlagAudienceRule(
  value: unknown,
  key: string,
  index: number,
): FeatureFlagAudienceRuleConfig {
  if (!isPlainRecord(value)) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_AUDIENCE_RULE_INVALID',
      `Feature flag audience ${key} rule ${index + 1} must be a JSON object.`,
      { index, key },
    );
  }

  const attribute = normalizeFeatureFlagAudienceAttribute(
    value.attribute,
    key,
    index,
  );
  const operator = normalizeFeatureFlagAudienceOperator(
    value.operator,
    key,
    index,
  );
  const values = normalizeFeatureFlagAudienceValues(value.values, key, index);

  return {
    attribute,
    operator,
    values,
  };
}

function normalizeFeatureFlagAudienceAttribute(
  value: unknown,
  key: string,
  index: number,
): string {
  if (typeof value !== 'string') {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_AUDIENCE_ATTRIBUTE_INVALID_TYPE',
      `Feature flag audience ${key} rule ${index + 1} attribute must be a string.`,
      { index, key },
    );
  }

  const normalized = value.trim();

  if (!FEATURE_FLAG_AUDIENCE_ATTRIBUTE_PATTERN.test(normalized)) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_AUDIENCE_ATTRIBUTE_INVALID',
      `Feature flag audience ${key} rule ${index + 1} attribute is invalid.`,
      { attribute: value, index, key },
    );
  }

  return normalized;
}

function normalizeFeatureFlagAudienceOperator(
  value: unknown,
  key: string,
  index: number,
): FeatureFlagAudienceOperator {
  if (
    value === 'equals' ||
    value === 'in' ||
    value === 'not_equals' ||
    value === 'not_in'
  ) {
    return value;
  }

  throw systemConfigBadRequest(
    'SYSTEM_CONFIG_FEATURE_AUDIENCE_OPERATOR_INVALID',
    `Feature flag audience ${key} rule ${index + 1} operator is invalid.`,
    { index, key, operator: value },
  );
}

function normalizeFeatureFlagAudienceValues(
  value: unknown,
  key: string,
  index: number,
): readonly string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_AUDIENCE_VALUES_INVALID',
      `Feature flag audience ${key} rule ${index + 1} values must contain 1 to 50 items.`,
      { index, key, maxItems: 50, minItems: 1 },
    );
  }

  const normalized = value.map((item) => {
    if (typeof item !== 'string') {
      throw systemConfigBadRequest(
        'SYSTEM_CONFIG_FEATURE_AUDIENCE_VALUE_INVALID_TYPE',
        `Feature flag audience ${key} rule ${index + 1} values must be strings.`,
        { index, key },
      );
    }

    const text = item.trim();
    if (!text || text.length > 100) {
      throw systemConfigBadRequest(
        'SYSTEM_CONFIG_FEATURE_AUDIENCE_VALUE_INVALID',
        `Feature flag audience ${key} rule ${index + 1} values must be 1 to 100 characters.`,
        { index, key, maxLength: 100, minLength: 1 },
      );
    }

    return text;
  });

  const duplicate = findFirstDuplicate(normalized);
  if (duplicate) {
    throw systemConfigBadRequest(
      'SYSTEM_CONFIG_FEATURE_AUDIENCE_VALUE_DUPLICATED',
      `Feature flag audience ${key} rule ${index + 1} value is duplicated: ${duplicate}`,
      { index, key, value: duplicate },
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
