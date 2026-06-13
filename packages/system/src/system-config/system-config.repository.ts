import { BadRequestException } from '@nestjs/common';
import {
  createPageResult,
  normalizePagination,
  type PageQueryInput,
  type PageResult,
} from '@opencore/common';
import type {
  BatchDeleteSystemConfigsDto,
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
} from './system-config.dto';
import {
  createOpenCoreXlsxWorkbookBase64,
  OPENCORE_XLSX_CONTENT_TYPE,
} from '../export-xlsx';
import type {
  SystemConfigRecord,
  SystemConfigValueType,
  SystemConfigVisibility,
} from './system-config.records';
import {
  decryptSystemConfigSecretValue,
  encryptSystemConfigSecretValue,
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

export type SystemConfigBatchMutationRecord = {
  deleted: true;
  affected: number;
  keys: readonly string[];
};

export type SystemConfigPageQuery = PageQueryInput;

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
    throw new BadRequestException(
      'Secret-like system config keys must be explicitly marked with secret visibility.',
    );
  }

  if (visibility === 'secret' && !SENSITIVE_CONFIG_KEY_PATTERN.test(key)) {
    throw new BadRequestException(
      'Secret system config visibility requires a secret-like key name.',
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
    throw new BadRequestException(
      `Secret system config ${input.key} must keep string value type.`,
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
    throw new BadRequestException(
      `Feature flag config ${input.key} must keep ${valueTypeLabel}.`,
    );
  }

  if (input.visibility !== 'public') {
    throw new BadRequestException(
      `Feature flag config ${input.key} must remain public.`,
    );
  }

  if (isFeatureFlagRolloutConfigKey(input.key) && input.value !== undefined) {
    const normalized =
      typeof input.value === 'string' ? input.value.trim() : input.value;
    const percentage = Number(normalized);

    if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
      throw new BadRequestException(
        `Feature flag rollout ${input.key} must be an integer between 0 and 100.`,
      );
    }
  }

  if (isFeatureFlagAudienceConfigKey(input.key) && input.value !== undefined) {
    parseFeatureFlagAudienceRulesConfig(input.value, input.key);
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
    throw new BadRequestException(
      `System built-in config cannot be deleted: ${config.key}`,
    );
  }
}

export function normalizeConfigCategory(value: unknown): string {
  if (value === undefined || value === null) {
    return 'system';
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('System config category must be a string.');
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException('System config category is required.');
  }

  if (normalized.length > 50) {
    throw new BadRequestException(
      'System config category must not exceed 50 characters.',
    );
  }

  return normalized;
}

export function normalizeConfigName(value: unknown, key: string): string {
  if (value === undefined || value === null) {
    return key;
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('System config name must be a string.');
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException('System config name is required.');
  }

  if (normalized.length > 100) {
    throw new BadRequestException(
      'System config name must not exceed 100 characters.',
    );
  }

  return normalized;
}

export function normalizeConfigValue(
  value: unknown,
  valueType: SystemConfigValueType,
): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('System config value must be a string.');
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
      throw new BadRequestException(
        'Boolean system config values must be "true" or "false".',
      );
    }

    return normalized;
  }

  if (!normalized || !Number.isFinite(Number(normalized))) {
    throw new BadRequestException(
      'Number system config values must be finite numbers.',
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
    throw new BadRequestException(
      `System config ${fieldName} must be a string.`,
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length > 500) {
    throw new BadRequestException(
      `System config ${fieldName} must not exceed 500 characters.`,
    );
  }

  return normalized;
}

export function normalizeBatchSystemConfigKeys(
  value: unknown,
): readonly string[] {
  if (!Array.isArray(value)) {
    throw new BadRequestException('System config keys must be an array.');
  }

  if (value.length === 0) {
    throw new BadRequestException('System config keys must not be empty.');
  }

  const normalized = value.map(normalizeSystemConfigKey);
  const duplicate = findFirstDuplicate(normalized);

  if (duplicate) {
    throw new BadRequestException(
      `System config key is duplicated: ${duplicate}`,
    );
  }

  return [...normalized].sort();
}

function normalizeSystemConfigKey(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('System config key must be a string.');
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException('System config key is required.');
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
    throw new BadRequestException(
      `Feature flag audience ${key} must be a JSON object.`,
    );
  }

  const mode = parsed.mode;
  if (mode !== 'all' && mode !== 'any') {
    throw new BadRequestException(
      `Feature flag audience ${key} mode must be all or any.`,
    );
  }

  if (!Array.isArray(parsed.rules)) {
    throw new BadRequestException(
      `Feature flag audience ${key} rules must be an array.`,
    );
  }

  if (parsed.rules.length > 20) {
    throw new BadRequestException(
      `Feature flag audience ${key} must not exceed 20 rules.`,
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
    throw new BadRequestException(
      'JSON system config values must be valid JSON.',
    );
  }
}

function normalizeFeatureFlagAudienceRule(
  value: unknown,
  key: string,
  index: number,
): FeatureFlagAudienceRuleConfig {
  if (!isPlainRecord(value)) {
    throw new BadRequestException(
      `Feature flag audience ${key} rule ${index + 1} must be a JSON object.`,
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
    throw new BadRequestException(
      `Feature flag audience ${key} rule ${index + 1} attribute must be a string.`,
    );
  }

  const normalized = value.trim();

  if (!FEATURE_FLAG_AUDIENCE_ATTRIBUTE_PATTERN.test(normalized)) {
    throw new BadRequestException(
      `Feature flag audience ${key} rule ${index + 1} attribute is invalid.`,
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

  throw new BadRequestException(
    `Feature flag audience ${key} rule ${index + 1} operator is invalid.`,
  );
}

function normalizeFeatureFlagAudienceValues(
  value: unknown,
  key: string,
  index: number,
): readonly string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    throw new BadRequestException(
      `Feature flag audience ${key} rule ${index + 1} values must contain 1 to 50 items.`,
    );
  }

  const normalized = value.map((item) => {
    if (typeof item !== 'string') {
      throw new BadRequestException(
        `Feature flag audience ${key} rule ${index + 1} values must be strings.`,
      );
    }

    const text = item.trim();
    if (!text || text.length > 100) {
      throw new BadRequestException(
        `Feature flag audience ${key} rule ${index + 1} values must be 1 to 100 characters.`,
      );
    }

    return text;
  });

  const duplicate = findFirstDuplicate(normalized);
  if (duplicate) {
    throw new BadRequestException(
      `Feature flag audience ${key} rule ${index + 1} value is duplicated: ${duplicate}`,
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
