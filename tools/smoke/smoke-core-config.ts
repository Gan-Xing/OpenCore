#!/usr/bin/env node
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import {
  assertArray,
  assertEqual,
  assertIncludes,
  assertNumberAtLeast,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const REDACTED_SECRET_VALUE = '[REDACTED]';
const SECRET_VALUE_PREFIX = 'opencore:vault:';
const SECRET_VALUE_V2_PREFIX = 'opencore:vault:v2:';
const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, login, username } = smoke;
const apiRequest = smoke.apiRequest as any;
const request = smoke.request as any;

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const tenantRunId = runId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
const ROOT_TENANT_ID = 'tenant_root';
const FOREIGN_TENANT_ID = `tenant_config_${tenantRunId}`;
const FOREIGN_CONFIG_KEY = `opencore.smoke.config.foreign.${runId}`;
const FOREIGN_SECRET_KEY = `auth.token.secret.foreign.${runId}`;
const plainKey = `opencore.smoke.config.${runId}`;
const batchKeyA = `opencore.smoke.config.batch.${runId}.a`;
const batchKeyB = `opencore.smoke.config.batch.${runId}.b`;
const featureFlagKey = `feature.smoke.${runId}.enabled`;
const featureFlagName = `smoke.${runId}`;
const featureFlagRolloutKey = `feature.smoke.${runId}.rolloutPercentage`;
const featureFlagAudienceKey = `feature.smoke.${runId}.audienceRules`;
const secretKey = `auth.token.secret.${runId}`;
let token;
let originalAdminTitle;
let originalLoginLockoutMinutes;
let originalLoginMaxFailedAttempts;
let adminTitleMutated = false;
let loginLockoutMutated = false;
let loginMaxFailedAttemptsMutated = false;
let prisma;
let foreignConfigSeeded = false;

const createdKeys: string[] = [];
async function main() {
  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      await request(`${apiPrefix}/docs-json`, { expected: [200] });
    }

    const loginResponse = await login();

    token = assertString(loginResponse.accessToken, 'login accessToken');
    smoke.setToken(token);
    await seedForeignTenantConfig();
    await assertForeignTenantConfigHidden();

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
    const seededFeatureAudienceConfig = await apiRequest(
      '/core/config/feature.notice.inbox.audienceRules',
    );
    assertEqual(
      seededFeatureAudienceConfig.system,
      true,
      'seeded notice inbox audience system flag',
    );
    assertEqual(
      seededFeatureAudienceConfig.public,
      true,
      'seeded notice inbox audience public flag',
    );
    assertEqual(
      seededFeatureAudienceConfig.visibility,
      'public',
      'seeded notice inbox audience visibility',
    );
    assertEqual(
      seededFeatureAudienceConfig.valueType,
      'json',
      'seeded notice inbox audience value type',
    );
    assertEqual(
      seededFeatureAudienceConfig.value,
      '{"mode":"all","rules":[]}',
      'seeded notice inbox audience value',
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
    const seededSecretVersions = await apiRequest(
      '/core/config/auth.jwt.secretRef/secret-versions',
    );
    assertArray(seededSecretVersions, 'seeded secret versions');
    assertEqual(
      seededSecretVersions[0]?.version,
      1,
      'seeded secret version baseline',
    );
    assertEqual(
      seededSecretVersions[0]?.active,
      true,
      'seeded secret version active flag',
    );
    assertEqual(
      seededSecretVersions[0]?.encrypted,
      true,
      'seeded secret version encrypted flag',
    );
    assertEqual(
      seededSecretVersions[0]?.envelopeVersion,
      'v2',
      'seeded secret version envelope',
    );
    assertEqual(
      seededSecretVersions[0]?.activeVaultKey,
      true,
      'seeded secret version active vault key',
    );
    assertNoOwnProperty(
      seededSecretVersions[0],
      'value',
      'seeded secret version value exposure',
    );
    await apiRequest('/core/config/get-value-by-key?key=auth.jwt.secretRef', {
      expected: [403],
    });
    await apiRequest('/core/config/opencore.admin.title/secret-versions', {
      expected: [400],
    });
    await apiRequest('/core/config/opencore.admin.title/rotate-secret', {
      method: 'POST',
      expected: [400],
      body: { value: 'not-a-secret' },
    });
    const initialVaultStatus = await apiRequest('/core/config/vault/status');
    assertEqual(initialVaultStatus.provider, 'env', 'vault provider');
    assertEqual(initialVaultStatus.mode, 'local', 'vault provider mode');
    assertEqual(initialVaultStatus.ready, true, 'vault provider readiness');
    assertEqual(
      initialVaultStatus.externalEncryptionEnabled,
      false,
      'vault external encryption flag',
    );
    assertString(initialVaultStatus.activeKeyId, 'vault active key id');
    assertArray(initialVaultStatus.keyIds, 'vault key ids');
    assertIncludes(
      initialVaultStatus.keyIds,
      initialVaultStatus.activeKeyId,
      'vault key ids active key',
    );
    assertEqual(
      initialVaultStatus.legacyDecryptEnabled,
      true,
      'vault legacy decrypt flag',
    );
    assertNumberAtLeast(
      initialVaultStatus.encryptedConfigCount,
      1,
      'vault encrypted config count',
    );
    assertNumberAtLeast(
      initialVaultStatus.secretVersionCount,
      1,
      'vault secret version count',
    );
    const initialRuntimeConfig = await request(
      `${apiPrefix}/core/config/runtime`,
    );
    assertEqual(
      initialRuntimeConfig.environment,
      'default',
      'initial runtime environment',
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
    assertDeepEqual(
      initialRuntimeConfig.featureFlagRules['notice.inbox'].audienceRules,
      { mode: 'all', rules: [] },
      'initial notice inbox feature flag audience',
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
      seededFeatureEvaluation.environment,
      'default',
      'seeded feature evaluation environment',
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
    assertEqual(
      seededFeatureEvaluation.audienceMatched,
      true,
      'seeded feature evaluation audience',
    );
    await apiRequest('/core/config/auth.jwt.secretRef/environments/staging', {
      method: 'PATCH',
      expected: [400],
      body: { value: 'env:STAGING_AUTH_TOKEN_SECRET' },
    });
    await apiRequest('/core/config/opencore.admin.title/environments/default', {
      method: 'PATCH',
      expected: [400],
      body: { value: 'Blocked default override' },
    });
    const stagingAdminTitle = `OpenCore Staging Admin ${runId}`;
    const stagingTitleOverride = await apiRequest(
      '/core/config/opencore.admin.title/environments/staging',
      {
        method: 'PATCH',
        body: {
          remark: 'Created by core.config smoke environment override.',
          value: stagingAdminTitle,
        },
      },
    );
    assertEqual(
      stagingTitleOverride.environment,
      'staging',
      'environment override environment',
    );
    assertEqual(
      stagingTitleOverride.value,
      stagingAdminTitle,
      'environment override value',
    );
    const stagingTitleOverrides = await apiRequest(
      '/core/config/opencore.admin.title/environments',
    );
    assertArray(stagingTitleOverrides, 'environment override list');
    assertItemsContainEnvironment(
      stagingTitleOverrides,
      'staging',
      'environment override list',
    );
    const stagingTitleValue = await apiRequest(
      '/core/config/get-value-by-key?key=opencore.admin.title&environment=staging',
    );
    assertEqual(
      stagingTitleValue.environment,
      'staging',
      'environment value environment',
    );
    assertEqual(
      stagingTitleValue.overridden,
      true,
      'environment value overridden flag',
    );
    assertEqual(
      stagingTitleValue.value,
      stagingAdminTitle,
      'environment value',
    );
    const stagingRuntimeConfig = await request(
      `${apiPrefix}/core/config/runtime?environment=staging`,
    );
    assertEqual(
      stagingRuntimeConfig.environment,
      'staging',
      'environment runtime environment',
    );
    assertEqual(
      stagingRuntimeConfig.adminTitle,
      stagingAdminTitle,
      'environment runtime admin title',
    );
    await apiRequest(
      '/core/config/feature.notice.inbox.rolloutPercentage/environments/staging',
      {
        method: 'PATCH',
        body: { value: '0' },
      },
    );
    const stagingFeatureEvaluation = await request(
      `${apiPrefix}/core/config/feature-flags/evaluate?flag=notice.inbox&subjectKey=smoke-admin&environment=staging`,
    );
    assertEqual(
      stagingFeatureEvaluation.environment,
      'staging',
      'environment feature evaluation environment',
    );
    assertEqual(
      stagingFeatureEvaluation.rolloutPercentage,
      0,
      'environment feature evaluation rollout',
    );
    assertEqual(
      stagingFeatureEvaluation.reason,
      'outside-rollout',
      'environment feature evaluation reason',
    );
    await apiRequest(
      '/core/config/feature.notice.inbox.rolloutPercentage/environments/staging',
      {
        method: 'DELETE',
      },
    );
    await apiRequest('/core/config/opencore.admin.title/environments/staging', {
      method: 'DELETE',
    });
    const stagingRuntimeAfterDelete = await request(
      `${apiPrefix}/core/config/runtime?environment=staging`,
    );
    assertEqual(
      stagingRuntimeAfterDelete.adminTitle,
      originalAdminTitle,
      'environment runtime delete fallback',
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
    await request(
      `${apiPrefix}/core/config/feature-flags/evaluate?flag=notice.inbox&subjectKey=smoke-admin&attributes=%5B%5D`,
      { expected: [400] },
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
    await apiRequest('/core/config', {
      method: 'POST',
      body: {
        category: 'feature',
        key: `feature.smoke.${runId}.invalid.audienceRules`,
        name: 'Invalid smoke feature audience',
        value: 'not-json',
        valueType: 'json',
        visibility: 'public',
      },
      expected: [400],
    });
    await apiRequest('/core/config', {
      method: 'POST',
      body: {
        category: 'feature',
        key: `feature.smoke.${runId}.invalid.audienceRules`,
        name: 'Invalid smoke feature audience',
        value: '{"mode":"all","rules":[]}',
        valueType: 'string',
        visibility: 'public',
      },
      expected: [400],
    });
    await apiRequest('/core/config', {
      method: 'POST',
      body: {
        category: 'feature',
        key: `feature.smoke.${runId}.invalid.audienceRules`,
        name: 'Invalid smoke feature audience',
        value: '{"mode":"all","rules":[]}',
        valueType: 'json',
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
      runtimeWithFeatureFlag.featureFlagRules[featureFlagName]
        .rolloutPercentage,
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
    const audienceRuleValue = JSON.stringify({
      mode: 'all',
      rules: [
        { attribute: 'dept', operator: 'equals', values: ['operations'] },
      ],
    });
    const createdFeatureAudience = await apiRequest('/core/config', {
      method: 'POST',
      body: {
        category: 'feature',
        key: featureFlagAudienceKey,
        name: 'OpenCore smoke feature audience',
        value: audienceRuleValue,
        valueType: 'json',
        description: 'OpenCore scripted runtime feature audience',
        remark: 'Created by core.config smoke.',
        visibility: 'public',
      },
    });
    createdKeys.push(featureFlagAudienceKey);
    assertEqual(
      createdFeatureAudience.value,
      audienceRuleValue,
      'created feature audience value',
    );
    assertEqual(
      createdFeatureAudience.valueType,
      'json',
      'created feature audience value type',
    );
    assertEqual(
      createdFeatureAudience.visibility,
      'public',
      'created feature audience visibility',
    );
    const runtimeWithFeatureAudience = await request(
      `${apiPrefix}/core/config/runtime`,
    );
    assertDeepEqual(
      runtimeWithFeatureAudience.featureFlagRules[featureFlagName]
        .audienceRules,
      {
        mode: 'all',
        rules: [
          { attribute: 'dept', operator: 'equals', values: ['operations'] },
        ],
      },
      'runtime feature audience after create',
    );
    const missingAudienceEvaluation = await request(
      `${apiPrefix}/core/config/feature-flags/evaluate?flag=${encodeURIComponent(featureFlagName)}&subjectKey=smoke-subject`,
    );
    assertEqual(
      missingAudienceEvaluation.enabled,
      false,
      'missing audience feature evaluation disabled',
    );
    assertEqual(
      missingAudienceEvaluation.audienceMatched,
      false,
      'missing audience feature evaluation audience',
    );
    assertEqual(
      missingAudienceEvaluation.reason,
      'audience-mismatch',
      'missing audience feature evaluation reason',
    );
    const matchingAudienceEvaluation = await request(
      `${apiPrefix}/core/config/feature-flags/evaluate?flag=${encodeURIComponent(featureFlagName)}&subjectKey=smoke-subject&attributes=${encodeURIComponent(
        JSON.stringify({ dept: 'operations' }),
      )}`,
    );
    assertEqual(
      matchingAudienceEvaluation.audienceMatched,
      true,
      'matching audience feature evaluation audience',
    );
    assertEqual(
      matchingAudienceEvaluation.enabled,
      matchingAudienceEvaluation.bucket < 50,
      'matching audience feature evaluation enabled by bucket',
    );
    const rejectedAudienceEvaluation = await request(
      `${apiPrefix}/core/config/feature-flags/evaluate?flag=${encodeURIComponent(featureFlagName)}&subjectKey=smoke-subject&attributes=${encodeURIComponent(
        JSON.stringify({ dept: 'engineering' }),
      )}`,
    );
    assertEqual(
      rejectedAudienceEvaluation.enabled,
      false,
      'rejected audience feature evaluation disabled',
    );
    assertEqual(
      rejectedAudienceEvaluation.reason,
      'audience-mismatch',
      'rejected audience feature evaluation reason',
    );
    await apiRequest(`/core/config/${featureFlagAudienceKey}`, {
      method: 'PATCH',
      body: {
        valueType: 'string',
      },
      expected: [400],
    });
    await apiRequest(`/core/config/${featureFlagAudienceKey}`, {
      method: 'PATCH',
      body: {
        visibility: 'private',
      },
      expected: [400],
    });
    await apiRequest(`/core/config/${featureFlagAudienceKey}`, {
      method: 'PATCH',
      body: {
        value:
          '{"mode":"all","rules":[{"attribute":"dept","operator":"equals","values":["operations","operations"]}]}',
      },
      expected: [400],
    });
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
      `${apiPrefix}/core/config/feature-flags/evaluate?flag=${encodeURIComponent(featureFlagName)}&subjectKey=smoke-subject&attributes=${encodeURIComponent(
        JSON.stringify({ dept: 'operations' }),
      )}`,
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
    assertEqual(
      createdConfig.visibility,
      'public',
      'created config visibility',
    );

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
      'tenantId',
      'config export tenant column',
    );
    assertIncludes(
      exportPreview.columns,
      'category',
      'config export category column',
    );
    assertIncludes(exportPreview.columns, 'name', 'config export name column');
    assertIncludes(
      exportPreview.columns,
      'value',
      'config export value column',
    );
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
      'featureAudience',
      'config export feature audience column',
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
    const initialSecretVersions = await apiRequest(
      `/core/config/${secretKey}/secret-versions`,
    );
    assertArray(initialSecretVersions, 'created secret versions');
    assertEqual(
      initialSecretVersions.length,
      1,
      'created secret version count',
    );
    assertEqual(
      initialSecretVersions[0]?.version,
      1,
      'created secret initial version',
    );
    assertEqual(
      initialSecretVersions[0]?.active,
      true,
      'created secret initial version active flag',
    );
    assertEqual(
      initialSecretVersions[0]?.envelopeVersion,
      'v2',
      'created secret initial version envelope',
    );
    assertEqual(
      initialSecretVersions[0]?.activeVaultKey,
      true,
      'created secret initial version active vault key',
    );
    assertNoOwnProperty(
      initialSecretVersions[0],
      'value',
      'created secret version value exposure',
    );
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
      SECRET_VALUE_V2_PREFIX,
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
    await apiRequest(`/core/config/${secretKey}/rotate-secret`, {
      method: 'POST',
      expected: [400],
      body: { value: '   ' },
    });
    const rotatedSecretVersion = await apiRequest(
      `/core/config/${secretKey}/rotate-secret`,
      {
        method: 'POST',
        body: {
          reason: 'Smoke rotation',
          rotatedBy: username,
          value: 'rotated-secret-smoke-value',
        },
      },
    );
    assertEqual(
      rotatedSecretVersion.version,
      2,
      'rotated secret version number',
    );
    assertEqual(
      rotatedSecretVersion.active,
      true,
      'rotated secret active flag',
    );
    assertEqual(
      rotatedSecretVersion.encrypted,
      true,
      'rotated secret encrypted flag',
    );
    assertEqual(
      rotatedSecretVersion.rotatedBy,
      username,
      'rotated secret actor',
    );
    assertEqual(
      rotatedSecretVersion.reason,
      'Smoke rotation',
      'rotated secret reason',
    );
    assertNoOwnProperty(
      rotatedSecretVersion,
      'value',
      'rotated secret version value exposure',
    );
    const rotatedSecretVersions = await apiRequest(
      `/core/config/${secretKey}/secret-versions`,
    );
    assertEqual(
      rotatedSecretVersions.length,
      2,
      'rotated secret version count',
    );
    assertEqual(
      rotatedSecretVersions[0]?.version,
      2,
      'rotated secret latest version',
    );
    assertEqual(
      rotatedSecretVersions[0]?.active,
      true,
      'rotated secret latest active flag',
    );
    assertEqual(
      rotatedSecretVersions[0]?.envelopeVersion,
      'v2',
      'rotated secret latest envelope',
    );
    assertEqual(
      rotatedSecretVersions[0]?.activeVaultKey,
      true,
      'rotated secret latest active vault key',
    );
    assertEqual(
      rotatedSecretVersions[1]?.version,
      1,
      'rotated secret previous version',
    );
    assertEqual(
      rotatedSecretVersions[1]?.active,
      false,
      'rotated secret previous inactive flag',
    );
    const rotatedStoredSecretValue = await readStoredConfigValue(secretKey);
    assertStringIncludes(
      rotatedStoredSecretValue,
      SECRET_VALUE_V2_PREFIX,
      'rotated stored secret vault envelope',
    );
    assertStringExcludes(
      rotatedStoredSecretValue,
      'rotated-secret-smoke-value',
      'rotated stored secret plaintext',
    );
    const storedSecretVersionValues =
      await readStoredSecretVersionValues(secretKey);
    assertEqual(
      storedSecretVersionValues.length,
      2,
      'stored secret version row count',
    );
    for (const versionValue of storedSecretVersionValues) {
      assertStringIncludes(
        versionValue,
        SECRET_VALUE_V2_PREFIX,
        'stored secret version vault envelope',
      );
      assertStringExcludes(
        versionValue,
        'super-secret-smoke-value',
        'stored secret version original plaintext',
      );
      assertStringExcludes(
        versionValue,
        'rotated-secret-smoke-value',
        'stored secret version rotated plaintext',
      );
    }
    const vaultRotation = await apiRequest('/core/config/vault/rotate-key', {
      method: 'POST',
      body: {
        reason: 'Smoke vault key rotation',
        rotatedBy: username,
      },
    });
    assertEqual(vaultRotation.provider, 'env', 'vault key rotation provider');
    assertEqual(
      vaultRotation.mode,
      'local',
      'vault key rotation provider mode',
    );
    assertEqual(vaultRotation.ready, true, 'vault key rotation provider ready');
    assertEqual(
      vaultRotation.externalEncryptionEnabled,
      false,
      'vault key rotation external encryption flag',
    );
    assertString(vaultRotation.activeKeyId, 'vault key rotation active key id');
    assertNumberAtLeast(
      vaultRotation.rewrappedConfigCount,
      1,
      'vault key rotation config count',
    );
    assertNumberAtLeast(
      vaultRotation.rewrappedSecretVersionCount,
      1,
      'vault key rotation version count',
    );
    assertEqual(vaultRotation.rotatedBy, username, 'vault key rotation actor');
    assertEqual(
      vaultRotation.reason,
      'Smoke vault key rotation',
      'vault key rotation reason',
    );
    assertEqual(
      vaultRotation.staleKeyEnvelopeCount,
      0,
      'vault key rotation stale envelope count',
    );
    assertEqual(
      vaultRotation.legacyEnvelopeCount,
      0,
      'vault key rotation legacy envelope count',
    );
    assertEqual(
      vaultRotation.activeKeyConfigCount,
      vaultRotation.encryptedConfigCount,
      'vault key rotation active config count',
    );
    const rewrappedStoredSecretValue = await readStoredConfigValue(secretKey);
    assertStringIncludes(
      rewrappedStoredSecretValue,
      SECRET_VALUE_V2_PREFIX,
      'rewrapped stored secret vault envelope',
    );
    assertNotEqual(
      rewrappedStoredSecretValue,
      rotatedStoredSecretValue,
      'rewrapped stored secret value',
    );
    assertStringExcludes(
      rewrappedStoredSecretValue,
      'rotated-secret-smoke-value',
      'rewrapped stored secret plaintext',
    );
    const rewrappedSecretVersions = await apiRequest(
      `/core/config/${secretKey}/secret-versions`,
    );
    assertEqual(
      rewrappedSecretVersions[0]?.activeVaultKey,
      true,
      'rewrapped secret latest active vault key',
    );
    assertEqual(
      rewrappedSecretVersions[0]?.envelopeVersion,
      'v2',
      'rewrapped secret latest envelope',
    );
    const rewrappedSecretVersionValues =
      await readStoredSecretVersionValues(secretKey);
    for (const versionValue of rewrappedSecretVersionValues) {
      assertStringIncludes(
        versionValue,
        SECRET_VALUE_V2_PREFIX,
        'rewrapped secret version vault envelope',
      );
      assertStringExcludes(
        versionValue,
        'rotated-secret-smoke-value',
        'rewrapped secret version plaintext',
      );
    }

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
    await cleanupForeignTenantConfig();
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
          'core.config.foreign-tenant-hidden',
          'core.config.foreign-tenant-mutation-blocked',
          'core.config.foreign-tenant-preserved',
          'core.config.detail',
          'core.config.metadata',
          'core.config.runtime',
          'core.config.runtime-cache-invalidation',
          'core.config.runtime-feature-flags',
          'core.config.runtime-feature-flag-rules',
          'core.config.runtime-feature-flag-evaluate',
          'core.config.runtime-feature-flag-rollout',
          'core.config.runtime-feature-flag-audience',
          'core.config.runtime-feature-flag-guards',
          'core.config.runtime-login-policy',
          'core.config.runtime-login-policy-guards',
          'core.config.runtime-login-attempt-policy',
          'core.config.runtime-login-attempt-policy-guards',
          'core.config.seed-secret-vault',
          'core.config.vault.status',
          'core.config.vault.key-rotation',
          'core.config.secret-version.seed',
          'core.config.secret-version.guards',
          'core.config.secret-version.rotate',
          'core.config.secret-version.no-plaintext',
          'core.config.environment-override.guards',
          'core.config.environment-override.crud',
          'core.config.environment-runtime',
          'core.config.environment-feature-rollout',
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
    await cleanupForeignTenantConfig().catch(() => undefined);
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
}

void main();

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
  const client = await getSmokePrisma();

  const row = await client.systemConfig.findUnique({
    where: { tenantId_key: { tenantId: ROOT_TENANT_ID, key } },
    select: { value: true },
  });

  if (!row) {
    throw new Error(`Stored system config not found: ${key}`);
  }

  return row.value;
}

async function readStoredSecretVersionValues(key) {
  const client = await getSmokePrisma();

  const rows = await client.systemConfigSecretVersion.findMany({
    where: { tenantId: ROOT_TENANT_ID, key },
    orderBy: { version: 'asc' },
    select: { value: true },
  });

  return rows.map((row) => row.value);
}

async function getSmokePrisma() {
  if (!prisma) {
    const connectionString = assertString(
      process.env.DATABASE_URL,
      'DATABASE_URL',
    );
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  return prisma;
}

async function seedForeignTenantConfig() {
  const client = await getSmokePrisma();
  const foreignSecretValue = 'foreign-secret-smoke-value';

  await client.tenant.upsert({
    where: { id: FOREIGN_TENANT_ID },
    update: {
      code: FOREIGN_TENANT_ID,
      slug: FOREIGN_TENANT_ID,
      name: 'Config smoke foreign tenant',
      status: 'active',
    },
    create: {
      id: FOREIGN_TENANT_ID,
      code: FOREIGN_TENANT_ID,
      slug: FOREIGN_TENANT_ID,
      name: 'Config smoke foreign tenant',
      status: 'active',
    },
  });
  await client.systemConfig.upsert({
    where: {
      tenantId_key: {
        tenantId: FOREIGN_TENANT_ID,
        key: FOREIGN_CONFIG_KEY,
      },
    },
    update: {
      category: 'smoke',
      name: 'Foreign tenant config',
      value: 'foreign-visible-value',
      valueType: 'string',
      description: 'Foreign tenant config smoke row.',
      remark: 'Must stay hidden from root tenant.',
      public: true,
      system: false,
    },
    create: {
      id: `config_foreign_${tenantRunId}`,
      tenantId: FOREIGN_TENANT_ID,
      category: 'smoke',
      name: 'Foreign tenant config',
      key: FOREIGN_CONFIG_KEY,
      value: 'foreign-visible-value',
      valueType: 'string',
      description: 'Foreign tenant config smoke row.',
      remark: 'Must stay hidden from root tenant.',
      public: true,
      system: false,
    },
  });
  await client.systemConfigEnvironmentOverride.upsert({
    where: {
      tenantId_key_environment: {
        tenantId: FOREIGN_TENANT_ID,
        key: FOREIGN_CONFIG_KEY,
        environment: 'staging',
      },
    },
    update: {
      value: 'foreign-staging-value',
      valueType: 'string',
      description: 'Foreign tenant environment override.',
      remark: 'Must stay hidden from root tenant.',
    },
    create: {
      id: `config_foreign_override_${tenantRunId}`,
      tenantId: FOREIGN_TENANT_ID,
      key: FOREIGN_CONFIG_KEY,
      environment: 'staging',
      value: 'foreign-staging-value',
      valueType: 'string',
      description: 'Foreign tenant environment override.',
      remark: 'Must stay hidden from root tenant.',
    },
  });
  await client.systemConfig.upsert({
    where: {
      tenantId_key: {
        tenantId: FOREIGN_TENANT_ID,
        key: FOREIGN_SECRET_KEY,
      },
    },
    update: {
      category: 'security',
      name: 'Foreign tenant secret config',
      value: foreignSecretValue,
      valueType: 'string',
      description: 'Foreign tenant secret config smoke row.',
      remark: 'Must stay hidden from root tenant.',
      public: false,
      system: false,
    },
    create: {
      id: `config_foreign_secret_${tenantRunId}`,
      tenantId: FOREIGN_TENANT_ID,
      category: 'security',
      name: 'Foreign tenant secret config',
      key: FOREIGN_SECRET_KEY,
      value: foreignSecretValue,
      valueType: 'string',
      description: 'Foreign tenant secret config smoke row.',
      remark: 'Must stay hidden from root tenant.',
      public: false,
      system: false,
    },
  });
  await client.systemConfigSecretVersion.upsert({
    where: {
      tenantId_key_version: {
        tenantId: FOREIGN_TENANT_ID,
        key: FOREIGN_SECRET_KEY,
        version: 1,
      },
    },
    update: {
      active: true,
      value: foreignSecretValue,
      valueType: 'string',
      reason: 'Foreign tenant smoke baseline.',
      rotatedBy: 'smoke',
    },
    create: {
      tenantId: FOREIGN_TENANT_ID,
      key: FOREIGN_SECRET_KEY,
      version: 1,
      active: true,
      value: foreignSecretValue,
      valueType: 'string',
      reason: 'Foreign tenant smoke baseline.',
      rotatedBy: 'smoke',
    },
  });
  foreignConfigSeeded = true;
}

async function assertForeignTenantConfigHidden() {
  await apiRequest(`/core/config/${encodeURIComponent(FOREIGN_CONFIG_KEY)}`, {
    expected: [404],
  });
  await apiRequest(
    `/core/config/get-value-by-key?key=${encodeURIComponent(FOREIGN_CONFIG_KEY)}`,
    { expected: [404] },
  );
  await apiRequest(
    `/core/config/${encodeURIComponent(FOREIGN_CONFIG_KEY)}/environments`,
    { expected: [404] },
  );
  await apiRequest(
    `/core/config/${encodeURIComponent(FOREIGN_CONFIG_KEY)}/environments/staging`,
    {
      method: 'PATCH',
      expected: [404],
      body: { value: 'root-should-not-write' },
    },
  );
  await apiRequest(
    `/core/config/${encodeURIComponent(FOREIGN_CONFIG_KEY)}/environments/staging`,
    { method: 'DELETE', expected: [404] },
  );
  await apiRequest(
    `/core/config/${encodeURIComponent(FOREIGN_SECRET_KEY)}/secret-versions`,
    { expected: [404] },
  );
  await apiRequest(
    `/core/config/${encodeURIComponent(FOREIGN_SECRET_KEY)}/rotate-secret`,
    {
      method: 'POST',
      expected: [404],
      body: { value: 'root-should-not-rotate' },
    },
  );
  await apiRequest(`/core/config/${encodeURIComponent(FOREIGN_CONFIG_KEY)}`, {
    method: 'PATCH',
    expected: [404],
    body: { value: 'root-should-not-write' },
  });
  await apiRequest('/core/config/batch', {
    method: 'DELETE',
    expected: [404],
    body: { keys: [FOREIGN_CONFIG_KEY] },
  });
  await apiRequest(`/core/config/${encodeURIComponent(FOREIGN_CONFIG_KEY)}`, {
    method: 'DELETE',
    expected: [404],
  });

  const rootList = await apiRequest('/core/config?page=1&pageSize=100');
  assertArray(rootList.items, 'root config list items');
  if (rootList.items.some((item) => item?.key === FOREIGN_CONFIG_KEY)) {
    throw new Error('Foreign tenant config leaked into root config list.');
  }
  await assertForeignTenantConfigPreserved();
}

async function assertForeignTenantConfigPreserved() {
  const client = await getSmokePrisma();
  const config = await client.systemConfig.findUnique({
    where: {
      tenantId_key: {
        tenantId: FOREIGN_TENANT_ID,
        key: FOREIGN_CONFIG_KEY,
      },
    },
    select: { tenantId: true, key: true, value: true },
  });
  if (!config) {
    throw new Error('Foreign tenant config was unexpectedly removed.');
  }
  assertEqual(config.tenantId, FOREIGN_TENANT_ID, 'foreign config tenant');
  assertEqual(config.value, 'foreign-visible-value', 'foreign config value');

  const override = await client.systemConfigEnvironmentOverride.findUnique({
    where: {
      tenantId_key_environment: {
        tenantId: FOREIGN_TENANT_ID,
        key: FOREIGN_CONFIG_KEY,
        environment: 'staging',
      },
    },
    select: { tenantId: true, value: true },
  });
  if (!override) {
    throw new Error('Foreign tenant config override was unexpectedly removed.');
  }
  assertEqual(
    override.value,
    'foreign-staging-value',
    'foreign config override value',
  );

  const secretVersionCount = await client.systemConfigSecretVersion.count({
    where: { tenantId: FOREIGN_TENANT_ID, key: FOREIGN_SECRET_KEY },
  });
  assertEqual(secretVersionCount, 1, 'foreign secret version count');
}

async function cleanupForeignTenantConfig() {
  if (!foreignConfigSeeded) {
    return;
  }

  const client = await getSmokePrisma();
  await client.systemConfig.deleteMany({
    where: {
      tenantId: FOREIGN_TENANT_ID,
      key: { in: [FOREIGN_CONFIG_KEY, FOREIGN_SECRET_KEY] },
    },
  });
  await client.tenant.deleteMany({ where: { id: FOREIGN_TENANT_ID } });
  foreignConfigSeeded = false;
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

function assertObject(value, label) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value;
}

function assertNotEqual(actual, expected, label) {
  if (actual === expected) {
    throw new Error(`${label} must change`);
  }
}

function assertDeepEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertItemsContainEnvironment(items, environment, label) {
  assertArray(items, label);
  if (!items.some((item) => item?.environment === environment)) {
    throw new Error(`${label} must include environment ${environment}`);
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

function assertNoOwnProperty(value, property, label) {
  assertObject(value, label);
  if (Object.prototype.hasOwnProperty.call(value, property)) {
    throw new Error(`${label} must not expose ${property}`);
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
