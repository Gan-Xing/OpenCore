#!/usr/bin/env node
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const DEFAULT_PORT = '39173';
const REDACTED_SECRET_VALUE = '[REDACTED]';
const SECRET_VALUE_PREFIX = 'opencore:vault:v1:';
const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const port = process.env.OPENCORE_SMOKE_PORT || DEFAULT_PORT;
const baseUrl = trimTrailingSlash(
  process.env.OPENCORE_SMOKE_BASE_URL || `http://127.0.0.1:${port}`,
);
const apiPrefix = normalizeApiPrefix(
  process.env.OPENCORE_SMOKE_API_PREFIX || '/api',
);
const checkDocs = parseBoolean(process.env.OPENCORE_SMOKE_CHECK_DOCS, true);
const username = process.env.OPENCORE_SMOKE_ADMIN_USERNAME || 'admin';
const passwordCandidates = [
  process.env.OPENCORE_SMOKE_ADMIN_PASSWORD,
  process.env.BOOTSTRAP_ADMIN_PASSWORD,
  'admin123',
].filter((candidate, index, candidates) => {
  return Boolean(candidate) && candidates.indexOf(candidate) === index;
});
const timeoutMs = Number(process.env.OPENCORE_SMOKE_TIMEOUT_MS || 10000);

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const plainKey = `opencore.smoke.config.${runId}`;
const batchKeyA = `opencore.smoke.config.batch.${runId}.a`;
const batchKeyB = `opencore.smoke.config.batch.${runId}.b`;
const featureFlagKey = `feature.smoke.${runId}.enabled`;
const featureFlagName = `smoke.${runId}`;
const featureFlagRolloutKey = `feature.smoke.${runId}.rolloutPercentage`;
const secretKey = `auth.token.secret.${runId}`;
let token;
let originalAdminTitle;
let originalLoginLockoutMinutes;
let originalLoginMaxFailedAttempts;
let adminTitleMutated = false;
let loginLockoutMutated = false;
let loginMaxFailedAttemptsMutated = false;
let prisma;

const createdKeys = [];

class HttpStatusError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HttpStatusError';
    this.status = status;
  }
}

try {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    await request(`${apiPrefix}/docs-json`, { expected: [200] });
  }

  const loginResponse = await login();

  token = assertString(loginResponse.accessToken, 'login accessToken');

  const listResponse = await apiRequest('/core/config?page=1&pageSize=10');
  assertArray(listResponse.items, 'config list items');

  const seededSystemConfig = await apiRequest(
    '/core/config/opencore.admin.title',
  );
  originalAdminTitle = assertString(
    seededSystemConfig.value,
    'seeded admin title value',
  );
  assertEqual(seededSystemConfig.system, true, 'seeded config system flag');
  const seededLoginPolicyConfig = await apiRequest(
    '/core/config/auth.login.lockoutMinutes',
  );
  originalLoginLockoutMinutes = assertString(
    seededLoginPolicyConfig.value,
    'seeded login lockout minutes value',
  );
  const originalLoginLockoutMinutesNumber = parseRuntimeInteger(
    originalLoginLockoutMinutes,
    'seeded login lockout minutes',
  );
  assertEqual(
    seededLoginPolicyConfig.system,
    true,
    'seeded login lockout system flag',
  );
  assertEqual(
    seededLoginPolicyConfig.public,
    true,
    'seeded login lockout public flag',
  );
  assertEqual(
    seededLoginPolicyConfig.visibility,
    'public',
    'seeded login lockout visibility',
  );
  assertEqual(
    seededLoginPolicyConfig.valueType,
    'number',
    'seeded login lockout value type',
  );
  const seededLoginMaxAttemptsConfig = await apiRequest(
    '/core/config/auth.login.maxFailedAttempts',
  );
  originalLoginMaxFailedAttempts = assertString(
    seededLoginMaxAttemptsConfig.value,
    'seeded login max failed attempts value',
  );
  const originalLoginMaxFailedAttemptsNumber = parseRuntimeInteger(
    originalLoginMaxFailedAttempts,
    'seeded login max failed attempts',
  );
  assertEqual(
    seededLoginMaxAttemptsConfig.system,
    true,
    'seeded login max failed attempts system flag',
  );
  assertEqual(
    seededLoginMaxAttemptsConfig.public,
    true,
    'seeded login max failed attempts public flag',
  );
  assertEqual(
    seededLoginMaxAttemptsConfig.visibility,
    'public',
    'seeded login max failed attempts visibility',
  );
  assertEqual(
    seededLoginMaxAttemptsConfig.valueType,
    'number',
    'seeded login max failed attempts value type',
  );
  const seededFeatureRolloutConfig = await apiRequest(
    '/core/config/feature.notice.inbox.rolloutPercentage',
  );
  assertEqual(
    seededFeatureRolloutConfig.system,
    true,
    'seeded notice inbox rollout system flag',
  );
  assertEqual(
    seededFeatureRolloutConfig.public,
    true,
    'seeded notice inbox rollout public flag',
  );
  assertEqual(
    seededFeatureRolloutConfig.visibility,
    'public',
    'seeded notice inbox rollout visibility',
  );
  assertEqual(
    seededFeatureRolloutConfig.valueType,
    'number',
    'seeded notice inbox rollout value type',
  );
  assertEqual(
    seededFeatureRolloutConfig.value,
    '100',
    'seeded notice inbox rollout value',
  );
  const seededSecretConfig = await apiRequest(
    '/core/config/auth.jwt.secretRef',
  );
  assertEqual(
    seededSecretConfig.value,
    REDACTED_SECRET_VALUE,
    'seeded secret config redaction',
  );
  assertEqual(
    seededSecretConfig.visibility,
    'secret',
    'seeded secret config visibility',
  );
  assertEqual(
    seededSecretConfig.encrypted,
    true,
    'seeded secret encrypted flag',
  );
  await apiRequest('/core/config/get-value-by-key?key=auth.jwt.secretRef', {
    expected: [403],
  });
  const initialRuntimeConfig = await request(
    `${apiPrefix}/core/config/runtime`,
  );
  assertEqual(
    initialRuntimeConfig.adminTitle,
    originalAdminTitle,
    'initial runtime admin title',
  );
  assertObject(
    initialRuntimeConfig.featureFlags,
    'initial runtime feature flags',
  );
  assertEqual(
    initialRuntimeConfig.featureFlags['notice.inbox'],
    true,
    'initial notice inbox feature flag',
  );
  assertObject(
    initialRuntimeConfig.featureFlagRules,
    'initial runtime feature flag rules',
  );
  assertEqual(
    initialRuntimeConfig.featureFlagRules['notice.inbox'].enabled,
    true,
    'initial notice inbox feature flag rule enabled',
  );
  assertEqual(
    initialRuntimeConfig.featureFlagRules['notice.inbox'].rolloutPercentage,
    100,
    'initial notice inbox feature flag rollout',
  );
  const seededFeatureEvaluation = await request(
    `${apiPrefix}/core/config/feature-flags/evaluate?flag=notice.inbox&subjectKey=smoke-admin`,
  );
  assertEqual(
    seededFeatureEvaluation.flag,
    'notice.inbox',
    'seeded feature evaluation flag',
  );
  assertEqual(
    seededFeatureEvaluation.subjectKey,
    'smoke-admin',
    'seeded feature evaluation subject',
  );
  assertEqual(
    seededFeatureEvaluation.enabled,
    true,
    'seeded feature evaluation enabled',
  );
  assertEqual(
    seededFeatureEvaluation.rolloutPercentage,
    100,
    'seeded feature evaluation rollout',
  );
  assertNumberBetween(
    seededFeatureEvaluation.bucket,
    0,
    99,
    'seeded feature evaluation bucket',
  );
  assertEqual(
    seededFeatureEvaluation.reason,
    'matched-rollout',
    'seeded feature evaluation reason',
  );
  await request(
    `${apiPrefix}/core/config/feature-flags/evaluate?flag=bad_flag&subjectKey=smoke-admin`,
    { expected: [400] },
  );
  await request(
    `${apiPrefix}/core/config/feature-flags/evaluate?flag=notice.inbox&subjectKey=`,
    { expected: [400] },
  );
  await request(
    `${apiPrefix}/core/config/feature-flags/evaluate?flag=missing.flag&subjectKey=smoke-admin`,
    { expected: [404] },
  );
  assertEqual(
    initialRuntimeConfig.loginLockoutMinutes,
    originalLoginLockoutMinutesNumber,
    'initial runtime login lockout minutes',
  );
  assertEqual(
    initialRuntimeConfig.loginMaxFailedAttempts,
    originalLoginMaxFailedAttemptsNumber,
    'initial runtime login max failed attempts',
  );
  await apiRequest('/core/config/opencore.admin.title', {
    method: 'DELETE',
    expected: [400],
  });
  await apiRequest('/core/config/auth.login.lockoutMinutes', {
    method: 'PATCH',
    body: {
      value: 'not-a-number',
    },
    expected: [400],
  });
  await apiRequest('/core/config/auth.login.lockoutMinutes', {
    method: 'PATCH',
    body: {
      value: '20.5',
    },
    expected: [400],
  });
  await apiRequest('/core/config/auth.login.lockoutMinutes', {
    method: 'PATCH',
    body: {
      visibility: 'private',
    },
    expected: [400],
  });
  await apiRequest('/core/config/auth.login.maxFailedAttempts', {
    method: 'PATCH',
    body: {
      value: '0',
    },
    expected: [400],
  });
  await apiRequest('/core/config/auth.login.maxFailedAttempts', {
    method: 'PATCH',
    body: {
      value: '20.5',
    },
    expected: [400],
  });
  await apiRequest('/core/config/auth.login.maxFailedAttempts', {
    method: 'PATCH',
    body: {
      visibility: 'private',
    },
    expected: [400],
  });
  const smokeAdminTitle = `OpenCore Smoke Admin ${runId}`;
  const updatedAdminTitle = await apiRequest(
    '/core/config/opencore.admin.title',
    {
      method: 'PATCH',
      body: {
        value: smokeAdminTitle,
      },
    },
  );
  adminTitleMutated = true;
  assertEqual(
    updatedAdminTitle.value,
    smokeAdminTitle,
    'updated admin title config value',
  );
  const updatedRuntimeConfig = await request(
    `${apiPrefix}/core/config/runtime`,
  );
  assertEqual(
    updatedRuntimeConfig.adminTitle,
    smokeAdminTitle,
    'runtime admin title after update',
  );
  await restoreAdminTitle();

  const smokeLoginLockoutMinutes =
    originalLoginLockoutMinutesNumber === 15 ? 16 : 15;
  const updatedLoginPolicy = await apiRequest(
    '/core/config/auth.login.lockoutMinutes',
    {
      method: 'PATCH',
      body: {
        value: String(smokeLoginLockoutMinutes),
      },
    },
  );
  loginLockoutMutated = true;
  assertEqual(
    updatedLoginPolicy.value,
    String(smokeLoginLockoutMinutes),
    'updated login lockout config value',
  );
  const updatedLoginPolicyRuntimeConfig = await request(
    `${apiPrefix}/core/config/runtime`,
  );
  assertEqual(
    updatedLoginPolicyRuntimeConfig.loginLockoutMinutes,
    smokeLoginLockoutMinutes,
    'runtime login lockout minutes after update',
  );
  await restoreLoginLockoutMinutes();

  const smokeLoginMaxFailedAttempts =
    originalLoginMaxFailedAttemptsNumber === 5 ? 4 : 5;
  const updatedLoginAttemptPolicy = await apiRequest(
    '/core/config/auth.login.maxFailedAttempts',
    {
      method: 'PATCH',
      body: {
        value: String(smokeLoginMaxFailedAttempts),
      },
    },
  );
  loginMaxFailedAttemptsMutated = true;
  assertEqual(
    updatedLoginAttemptPolicy.value,
    String(smokeLoginMaxFailedAttempts),
    'updated login max failed attempts config value',
  );
  const updatedLoginAttemptPolicyRuntimeConfig = await request(
    `${apiPrefix}/core/config/runtime`,
  );
  assertEqual(
    updatedLoginAttemptPolicyRuntimeConfig.loginMaxFailedAttempts,
    smokeLoginMaxFailedAttempts,
    'runtime login max failed attempts after update',
  );
  await restoreLoginMaxFailedAttempts();

  await apiRequest('/core/config', {
    method: 'POST',
    body: {
      category: 'feature',
      key: `feature.smoke.${runId}.invalid.enabled`,
      name: 'Invalid smoke feature flag',
      value: 'true',
      valueType: 'string',
      visibility: 'public',
    },
    expected: [400],
  });
  await apiRequest('/core/config', {
    method: 'POST',
    body: {
      category: 'feature',
      key: `feature.smoke.${runId}.invalid.enabled`,
      name: 'Invalid smoke feature flag',
      value: 'true',
      valueType: 'boolean',
      visibility: 'private',
    },
    expected: [400],
  });
  await apiRequest('/core/config', {
    method: 'POST',
    body: {
      category: 'feature',
      key: `feature.smoke.${runId}.invalid.rolloutPercentage`,
      name: 'Invalid smoke feature rollout',
      value: '101',
      valueType: 'number',
      visibility: 'public',
    },
    expected: [400],
  });
  await apiRequest('/core/config', {
    method: 'POST',
    body: {
      category: 'feature',
      key: `feature.smoke.${runId}.invalid.rolloutPercentage`,
      name: 'Invalid smoke feature rollout',
      value: '50',
      valueType: 'string',
      visibility: 'public',
    },
    expected: [400],
  });
  await apiRequest('/core/config', {
    method: 'POST',
    body: {
      category: 'feature',
      key: `feature.smoke.${runId}.invalid.rolloutPercentage`,
      name: 'Invalid smoke feature rollout',
      value: '50',
      valueType: 'number',
      visibility: 'private',
    },
    expected: [400],
  });

  const createdFeatureFlag = await apiRequest('/core/config', {
    method: 'POST',
    body: {
      category: 'feature',
      key: featureFlagKey,
      name: 'OpenCore smoke feature flag',
      value: 'true',
      valueType: 'boolean',
      description: 'OpenCore scripted runtime feature flag',
      remark: 'Created by core.config smoke.',
      visibility: 'public',
    },
  });
  createdKeys.push(featureFlagKey);
  assertEqual(createdFeatureFlag.value, 'true', 'created feature flag value');
  assertEqual(
    createdFeatureFlag.valueType,
    'boolean',
    'created feature flag value type',
  );
  assertEqual(
    createdFeatureFlag.visibility,
    'public',
    'created feature flag visibility',
  );
  const runtimeWithFeatureFlag = await request(
    `${apiPrefix}/core/config/runtime`,
  );
  assertEqual(
    runtimeWithFeatureFlag.featureFlags[featureFlagName],
    true,
    'runtime feature flag after create',
  );
  assertEqual(
    runtimeWithFeatureFlag.featureFlagRules[featureFlagName].enabled,
    true,
    'runtime feature flag rule after create',
  );
  assertEqual(
    runtimeWithFeatureFlag.featureFlagRules[featureFlagName].rolloutPercentage,
    100,
    'runtime feature flag default rollout after create',
  );
  const createdFeatureRollout = await apiRequest('/core/config', {
    method: 'POST',
    body: {
      category: 'feature',
      key: featureFlagRolloutKey,
      name: 'OpenCore smoke feature rollout',
      value: '50',
      valueType: 'number',
      description: 'OpenCore scripted runtime feature rollout',
      remark: 'Created by core.config smoke.',
      visibility: 'public',
    },
  });
  createdKeys.push(featureFlagRolloutKey);
  assertEqual(
    createdFeatureRollout.value,
    '50',
    'created feature rollout value',
  );
  assertEqual(
    createdFeatureRollout.valueType,
    'number',
    'created feature rollout value type',
  );
  assertEqual(
    createdFeatureRollout.visibility,
    'public',
    'created feature rollout visibility',
  );
  const runtimeWithFeatureRollout = await request(
    `${apiPrefix}/core/config/runtime`,
  );
  assertEqual(
    runtimeWithFeatureRollout.featureFlagRules[featureFlagName]
      .rolloutPercentage,
    50,
    'runtime feature rollout after create',
  );
  const dynamicFeatureEvaluation = await request(
    `${apiPrefix}/core/config/feature-flags/evaluate?flag=${encodeURIComponent(featureFlagName)}&subjectKey=smoke-subject`,
  );
  assertEqual(
    dynamicFeatureEvaluation.flag,
    featureFlagName,
    'dynamic feature evaluation flag',
  );
  assertEqual(
    dynamicFeatureEvaluation.rolloutPercentage,
    50,
    'dynamic feature evaluation rollout',
  );
  assertNumberBetween(
    dynamicFeatureEvaluation.bucket,
    0,
    99,
    'dynamic feature evaluation bucket',
  );
  assertEqual(
    dynamicFeatureEvaluation.enabled,
    dynamicFeatureEvaluation.bucket < 50,
    'dynamic feature evaluation enabled by bucket',
  );
  assertEqual(
    dynamicFeatureEvaluation.reason,
    dynamicFeatureEvaluation.bucket < 50
      ? 'matched-rollout'
      : 'outside-rollout',
    'dynamic feature evaluation reason',
  );
  await apiRequest(`/core/config/${featureFlagRolloutKey}`, {
    method: 'PATCH',
    body: {
      valueType: 'string',
    },
    expected: [400],
  });
  await apiRequest(`/core/config/${featureFlagRolloutKey}`, {
    method: 'PATCH',
    body: {
      visibility: 'private',
    },
    expected: [400],
  });
  await apiRequest(`/core/config/${featureFlagRolloutKey}`, {
    method: 'PATCH',
    body: {
      value: '-1',
    },
    expected: [400],
  });
  await apiRequest(`/core/config/${featureFlagRolloutKey}`, {
    method: 'PATCH',
    body: {
      value: '0',
    },
  });
  const zeroRolloutEvaluation = await request(
    `${apiPrefix}/core/config/feature-flags/evaluate?flag=${encodeURIComponent(featureFlagName)}&subjectKey=smoke-subject`,
  );
  assertEqual(
    zeroRolloutEvaluation.enabled,
    false,
    'zero rollout feature evaluation disabled',
  );
  assertEqual(
    zeroRolloutEvaluation.reason,
    'outside-rollout',
    'zero rollout feature evaluation reason',
  );
  await apiRequest(`/core/config/${featureFlagKey}`, {
    method: 'PATCH',
    body: {
      valueType: 'string',
    },
    expected: [400],
  });
  await apiRequest(`/core/config/${featureFlagKey}`, {
    method: 'PATCH',
    body: {
      visibility: 'private',
    },
    expected: [400],
  });
  await apiRequest(`/core/config/${featureFlagKey}`, {
    method: 'PATCH',
    body: {
      value: 'yes',
    },
    expected: [400],
  });
  await apiRequest(`/core/config/${featureFlagKey}`, {
    method: 'PATCH',
    body: {
      value: 'false',
    },
  });
  const runtimeAfterFeatureFlagUpdate = await request(
    `${apiPrefix}/core/config/runtime`,
  );
  assertEqual(
    runtimeAfterFeatureFlagUpdate.featureFlags[featureFlagName],
    false,
    'runtime feature flag after update',
  );
  assertEqual(
    runtimeAfterFeatureFlagUpdate.featureFlagRules[featureFlagName].enabled,
    false,
    'runtime feature flag rule disabled after update',
  );

  const createdConfig = await apiRequest('/core/config', {
    method: 'POST',
    body: {
      category: 'smoke',
      key: plainKey,
      name: 'OpenCore smoke config',
      value: 'true',
      valueType: 'boolean',
      description: 'OpenCore scripted smoke config',
      remark: 'Created by core.config smoke.',
      visibility: 'public',
    },
  });
  createdKeys.push(plainKey);
  assertEqual(createdConfig.category, 'smoke', 'created config category');
  assertEqual(
    createdConfig.name,
    'OpenCore smoke config',
    'created config name',
  );
  assertEqual(createdConfig.key, plainKey, 'created config key');
  assertEqual(
    createdConfig.remark,
    'Created by core.config smoke.',
    'created config remark',
  );
  assertEqual(createdConfig.value, 'true', 'created config value');
  assertEqual(createdConfig.system, false, 'created config system flag');
  assertEqual(createdConfig.visibility, 'public', 'created config visibility');

  const fetchedConfig = await apiRequest(`/core/config/${plainKey}`);
  assertEqual(fetchedConfig.category, 'smoke', 'detail config category');
  assertEqual(
    fetchedConfig.name,
    'OpenCore smoke config',
    'detail config name',
  );
  assertEqual(fetchedConfig.key, plainKey, 'detail config key');
  assertEqual(
    fetchedConfig.remark,
    'Created by core.config smoke.',
    'detail config remark',
  );
  assertEqual(fetchedConfig.value, 'true', 'detail config value');

  const fetchedValue = await apiRequest(
    `/core/config/get-value-by-key?key=${encodeURIComponent(plainKey)}`,
  );
  assertEqual(fetchedValue.key, plainKey, 'config value key');
  assertEqual(fetchedValue.value, 'true', 'config value by key');
  assertEqual(fetchedValue.valueType, 'boolean', 'config value type');

  const updatedConfig = await apiRequest(`/core/config/${plainKey}`, {
    method: 'PATCH',
    body: {
      category: 'smoke-updated',
      name: 'OpenCore smoke config updated',
      value: 'false',
      valueType: 'boolean',
      description: 'OpenCore scripted smoke config updated',
      remark: 'Updated by core.config smoke.',
    },
  });
  assertEqual(
    updatedConfig.category,
    'smoke-updated',
    'updated config category',
  );
  assertEqual(
    updatedConfig.name,
    'OpenCore smoke config updated',
    'updated config name',
  );
  assertEqual(
    updatedConfig.remark,
    'Updated by core.config smoke.',
    'updated config remark',
  );
  assertEqual(updatedConfig.value, 'false', 'updated config value');

  const updatedValue = await apiRequest(
    `/core/config/get-value-by-key?key=${encodeURIComponent(plainKey)}`,
  );
  assertEqual(updatedValue.value, 'false', 'updated config value by key');

  const cacheRefresh = await apiRequest('/core/config/refresh-cache', {
    method: 'POST',
  });
  assertEqual(cacheRefresh.refreshed, true, 'config cache refresh result');
  assertNumberAtLeast(cacheRefresh.cachedKeys, 1, 'config cache keys');
  assertString(cacheRefresh.refreshedAt, 'config cache refreshedAt');

  const exportPreview = await apiRequest(
    '/core/config/export?page=1&pageSize=10',
  );
  assertEqual(
    exportPreview.filename,
    'opencore-system-config.xlsx',
    'config export filename',
  );
  assertEqual(
    exportPreview.contentType,
    XLSX_CONTENT_TYPE,
    'config export MIME type',
  );
  const exportWorkbook = Buffer.from(
    assertString(exportPreview.contentBase64, 'config export workbook body'),
    'base64',
  );
  assertEqual(
    exportWorkbook.subarray(0, 2).toString('utf8'),
    'PK',
    'config export XLSX zip header',
  );
  assertNumberAtLeast(
    exportWorkbook.length,
    100,
    'config export XLSX byte length',
  );
  assertEqual(exportPreview.scope, 'current-page', 'config export scope');
  assertArray(exportPreview.columns, 'config export columns');
  assertIncludes(
    exportPreview.columns,
    'category',
    'config export category column',
  );
  assertIncludes(exportPreview.columns, 'name', 'config export name column');
  assertIncludes(exportPreview.columns, 'value', 'config export value column');
  assertIncludes(
    exportPreview.columns,
    'featureFlag',
    'config export feature flag column',
  );
  assertIncludes(
    exportPreview.columns,
    'featureRollout',
    'config export feature rollout column',
  );
  assertIncludes(
    exportPreview.columns,
    'encrypted',
    'config export encrypted column',
  );
  assertIncludes(
    exportPreview.columns,
    'system',
    'config export system column',
  );
  assertIncludes(
    exportPreview.columns,
    'remark',
    'config export remark column',
  );

  const secretConfig = await apiRequest('/core/config', {
    method: 'POST',
    body: {
      category: 'security',
      key: secretKey,
      name: 'OpenCore smoke secret config',
      value: 'super-secret-smoke-value',
      valueType: 'string',
      description: 'OpenCore scripted smoke secret config',
      remark: 'Secret config metadata remains visible.',
      visibility: 'secret',
    },
  });
  createdKeys.push(secretKey);
  assertEqual(secretConfig.category, 'security', 'created secret category');
  assertEqual(
    secretConfig.name,
    'OpenCore smoke secret config',
    'created secret name',
  );
  assertEqual(secretConfig.key, secretKey, 'created secret config key');
  assertEqual(
    secretConfig.remark,
    'Secret config metadata remains visible.',
    'created secret remark',
  );
  assertEqual(
    secretConfig.value,
    REDACTED_SECRET_VALUE,
    'created secret config redaction',
  );
  assertEqual(secretConfig.visibility, 'secret', 'created secret visibility');
  assertEqual(secretConfig.encrypted, true, 'created secret encrypted flag');
  await apiRequest('/core/config', {
    method: 'POST',
    body: {
      category: 'security',
      key: `auth.boolean.secret.${runId}`,
      name: 'Invalid secret config',
      value: 'true',
      valueType: 'boolean',
      visibility: 'secret',
    },
    expected: [400],
  });

  const storedSecretValue = await readStoredConfigValue(secretKey);
  assertString(storedSecretValue, 'stored secret config value');
  assertStringIncludes(
    storedSecretValue,
    SECRET_VALUE_PREFIX,
    'stored secret config vault envelope',
  );
  assertStringExcludes(
    storedSecretValue,
    'super-secret-smoke-value',
    'stored secret config plaintext',
  );

  const fetchedSecret = await apiRequest(`/core/config/${secretKey}`);
  assertEqual(
    fetchedSecret.value,
    REDACTED_SECRET_VALUE,
    'detail secret config redaction',
  );
  assertEqual(fetchedSecret.encrypted, true, 'detail secret encrypted flag');
  await apiRequest(
    `/core/config/get-value-by-key?key=${encodeURIComponent(secretKey)}`,
    {
      expected: [403],
    },
  );

  await apiRequest('/core/config/batch', {
    method: 'DELETE',
    body: { keys: [] },
    expected: [400],
  });
  await apiRequest('/core/config/batch', {
    method: 'DELETE',
    body: { keys: [plainKey, plainKey] },
    expected: [400],
  });
  await apiRequest('/core/config/batch', {
    method: 'DELETE',
    body: { keys: [plainKey, `opencore.smoke.config.missing.${runId}`] },
    expected: [404],
  });
  await apiRequest('/core/config/batch', {
    method: 'DELETE',
    body: { keys: [plainKey, 'opencore.admin.title'] },
    expected: [400],
  });
  await apiRequest(`/core/config/${encodeURIComponent(plainKey)}`);

  await apiRequest('/core/config', {
    method: 'POST',
    body: {
      category: 'smoke',
      key: batchKeyA,
      name: 'OpenCore smoke batch config A',
      value: 'batch-a',
      valueType: 'string',
      visibility: 'public',
    },
  });
  createdKeys.push(batchKeyA);
  await apiRequest('/core/config', {
    method: 'POST',
    body: {
      category: 'smoke',
      key: batchKeyB,
      name: 'OpenCore smoke batch config B',
      value: 'batch-b',
      valueType: 'string',
      visibility: 'public',
    },
  });
  createdKeys.push(batchKeyB);
  await apiRequest(
    `/core/config/get-value-by-key?key=${encodeURIComponent(batchKeyA)}`,
  );
  const batchDeleted = await apiRequest('/core/config/batch', {
    method: 'DELETE',
    body: { keys: [batchKeyA, batchKeyB] },
  });
  assertEqual(batchDeleted.deleted, true, 'config batch delete result');
  assertEqual(batchDeleted.affected, 2, 'config batch delete affected count');
  assertIncludes(batchDeleted.keys, batchKeyA, 'config batch delete key A');
  assertIncludes(batchDeleted.keys, batchKeyB, 'config batch delete key B');
  await apiRequest(`/core/config/${encodeURIComponent(batchKeyA)}`, {
    expected: [404],
  });
  await apiRequest(
    `/core/config/get-value-by-key?key=${encodeURIComponent(batchKeyA)}`,
    {
      expected: [404],
    },
  );
  await apiRequest(`/core/config/${encodeURIComponent(batchKeyB)}`, {
    expected: [404],
  });

  await cleanupCreatedConfig();
  await prisma?.$disconnect().catch(() => undefined);

  console.log(
    JSON.stringify({
      status: 'pass',
      baseUrl,
      apiPrefix,
      checks: [
        'health.live',
        'health.ready',
        ...(checkDocs ? ['openapi.docs-json'] : []),
        'auth.login',
        'core.config.list',
        'core.config.detail',
        'core.config.metadata',
        'core.config.runtime',
        'core.config.runtime-cache-invalidation',
        'core.config.runtime-feature-flags',
        'core.config.runtime-feature-flag-rules',
        'core.config.runtime-feature-flag-evaluate',
        'core.config.runtime-feature-flag-rollout',
        'core.config.runtime-feature-flag-guards',
        'core.config.runtime-login-policy',
        'core.config.runtime-login-policy-guards',
        'core.config.runtime-login-attempt-policy',
        'core.config.runtime-login-attempt-policy-guards',
        'core.config.seed-secret-vault',
        'core.config.value-by-key',
        'core.config.value-cache-invalidation',
        'core.config.cache-refresh',
        'core.config.create',
        'core.config.update',
        'core.config.export.xlsx',
        'core.config.secret-redaction',
        'core.config.secret-value-blocked',
        'core.config.secret-vault-encrypted',
        'core.config.secret-value-type-guard',
        'core.config.system-flag',
        'core.config.system-delete-guard',
        'core.config.batch-delete.empty-guard',
        'core.config.batch-delete.duplicate-guard',
        'core.config.batch-delete.missing-guard',
        'core.config.batch-delete.system-guard',
        'core.config.batch-delete',
        'core.config.batch-delete.cache-invalidation',
        'core.config.delete',
      ],
    }),
  );
} catch (error) {
  await cleanupCreatedConfig().catch(() => undefined);
  await restoreAdminTitle().catch(() => undefined);
  await restoreLoginLockoutMinutes().catch(() => undefined);
  await restoreLoginMaxFailedAttempts().catch(() => undefined);
  await prisma?.$disconnect().catch(() => undefined);
  console.error(
    JSON.stringify({
      status: 'fail',
      baseUrl,
      apiPrefix,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
}

async function apiRequest(path, options = {}) {
  return request(`${apiPrefix}${path}`, {
    ...options,
    token,
    expected: options.expected || [200, 201],
  });
}

async function login() {
  let lastError;

  for (const password of passwordCandidates) {
    try {
      return await request(`${apiPrefix}/auth/login`, {
        method: 'POST',
        expected: [200, 201],
        body: {
          username,
          password,
        },
      });
    } catch (error) {
      lastError = error;
      if (
        !(error instanceof HttpStatusError) ||
        ![401, 403].includes(error.status)
      ) {
        throw error;
      }
    }
  }

  throw new Error(
    `Unable to authenticate smoke admin ${username}. Set OPENCORE_SMOKE_ADMIN_PASSWORD to the deployed admin password.`,
    { cause: lastError },
  );
}

async function cleanupCreatedConfig() {
  if (!token) {
    return;
  }

  for (const key of [...createdKeys].reverse()) {
    await apiRequest(`/core/config/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      expected: [200, 404],
    });
  }

  createdKeys.length = 0;
}

async function readStoredConfigValue(key) {
  if (!prisma) {
    const connectionString = assertString(
      process.env.DATABASE_URL,
      'DATABASE_URL',
    );
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  const row = await prisma.systemConfig.findUnique({
    where: { key },
    select: { value: true },
  });

  if (!row) {
    throw new Error(`Stored system config not found: ${key}`);
  }

  return row.value;
}

async function restoreAdminTitle() {
  if (!token || !adminTitleMutated || originalAdminTitle === undefined) {
    return;
  }

  await apiRequest('/core/config/opencore.admin.title', {
    method: 'PATCH',
    body: {
      value: originalAdminTitle,
    },
  });
  adminTitleMutated = false;
}

async function restoreLoginLockoutMinutes() {
  if (
    !token ||
    !loginLockoutMutated ||
    originalLoginLockoutMinutes === undefined
  ) {
    return;
  }

  await apiRequest('/core/config/auth.login.lockoutMinutes', {
    method: 'PATCH',
    body: {
      value: originalLoginLockoutMinutes,
    },
  });
  loginLockoutMutated = false;
}

async function restoreLoginMaxFailedAttempts() {
  if (
    !token ||
    !loginMaxFailedAttemptsMutated ||
    originalLoginMaxFailedAttempts === undefined
  ) {
    return;
  }

  await apiRequest('/core/config/auth.login.maxFailedAttempts', {
    method: 'PATCH',
    body: {
      value: originalLoginMaxFailedAttempts,
    },
  });
  loginMaxFailedAttemptsMutated = false;
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const expected = options.expected || [200];

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    const responseBody = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!expected.includes(response.status)) {
      throw new HttpStatusError(
        `${options.method || 'GET'} ${path} returned ${response.status}: ${formatBody(
          responseBody,
        )}`,
        response.status,
      );
    }

    return responseBody;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${options.method || 'GET'} ${path} timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function normalizeApiPrefix(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes'].includes(value.toLowerCase());
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }

  return value;
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  return value;
}

function assertObject(value, label) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(values, expected, label) {
  if (!Array.isArray(values) || !values.includes(expected)) {
    throw new Error(`${label} must include ${expected}`);
  }
}

function assertStringIncludes(value, expected, label) {
  if (typeof value !== 'string' || !value.includes(expected)) {
    throw new Error(`${label} must include ${expected}`);
  }
}

function assertStringExcludes(value, expected, label) {
  if (typeof value !== 'string' || value.includes(expected)) {
    throw new Error(`${label} must not include ${expected}`);
  }
}

function assertNumberAtLeast(actual, expected, label) {
  if (typeof actual !== 'number' || actual < expected) {
    throw new Error(`${label} expected >= ${expected}, got ${actual}`);
  }
}

function assertNumberBetween(actual, minimum, maximum, label) {
  if (typeof actual !== 'number' || actual < minimum || actual > maximum) {
    throw new Error(
      `${label} expected between ${minimum} and ${maximum}, got ${actual}`,
    );
  }
}

function parseRuntimeInteger(value, label) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} must be an integer`);
  }

  return parsed;
}

function formatBody(value) {
  if (typeof value === 'string') {
    return value.slice(0, 500);
  }

  return JSON.stringify(value).slice(0, 500);
}
