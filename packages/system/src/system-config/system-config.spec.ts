import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  createCipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import { PrismaService } from '@opencore/database';
import { PrismaSystemConfigRepository } from './system-config.prisma-repository';
import {
  normalizeExistingConfigValue,
  normalizeStoredConfigValue,
} from './system-config.repository';
import { seedSystemConfigs } from './system-config.records';
import { SeedSystemConfigRepository } from './system-config.seed-repository';
import { SystemConfigService } from './system-config.service';
import {
  inspectSystemConfigSecretEnvelope,
  SYSTEM_CONFIG_SECRET_VALUE_PREFIX,
  SYSTEM_CONFIG_SECRET_VALUE_V2_PREFIX,
} from './system-config.vault';

describe('@opencore/system system-config', () => {
  it('supports seeded config CRUD and export previews', async () => {
    const service = new SystemConfigService(new SeedSystemConfigRepository());

    await expect(service.listConfig({ page: 1, pageSize: 1 })).resolves.toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 1,
        total: 9,
        totalPages: 9,
      }),
    );
    await expect(
      service.getConfig('opencore.admin.title'),
    ).resolves.toMatchObject({
      category: 'system',
      key: 'opencore.admin.title',
      name: 'Admin title',
      public: true,
      remark: 'Shown in the Admin shell title.',
      system: true,
      visibility: 'public',
    });
    await expect(service.deleteConfig('opencore.admin.title')).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.deleteConfigs({ keys: ['opencore.admin.title'] }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.getConfigValueByKey('opencore.admin.title'),
    ).resolves.toMatchObject({
      key: 'opencore.admin.title',
      value: 'OpenCore Admin',
      valueType: 'string',
    });
    await expect(service.getRuntimeConfig()).resolves.toEqual({
      environment: 'default',
      adminTitle: 'OpenCore Admin',
      featureFlags: {
        'notice.inbox': true,
      },
      featureFlagRules: {
        'notice.inbox': {
          audienceRules: { mode: 'all', rules: [] },
          enabled: true,
          rolloutPercentage: 100,
        },
      },
      loginLockoutMinutes: 15,
      loginMaxFailedAttempts: 5,
    });
    await expect(
      service.evaluateFeatureFlag({
        flag: 'notice.inbox',
        subjectKey: 'user_admin',
      }),
    ).resolves.toMatchObject({
      flag: 'notice.inbox',
      environment: 'default',
      subjectKey: 'user_admin',
      enabled: true,
      rolloutPercentage: 100,
      audienceMatched: true,
      bucket: expect.any(Number),
      reason: 'matched-rollout',
    });
    await expect(
      service.getConfigValueByKey('auth.login.lockoutMinutes'),
    ).resolves.toMatchObject({
      key: 'auth.login.lockoutMinutes',
      value: '15',
      valueType: 'number',
      environment: 'default',
      overridden: false,
    });
    await expect(
      service.getConfigValueByKey('auth.login.maxFailedAttempts'),
    ).resolves.toMatchObject({
      key: 'auth.login.maxFailedAttempts',
      value: '5',
      valueType: 'number',
      environment: 'default',
      overridden: false,
    });
    await expect(
      service.getConfig('auth.jwt.secretRef'),
    ).resolves.toMatchObject({
      encrypted: true,
      key: 'auth.jwt.secretRef',
      system: true,
      value: '[REDACTED]',
      visibility: 'secret',
    });
    await expect(
      service.getConfigValueByKey('auth.jwt.secretRef'),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.listConfigSecretVersions('opencore.admin.title'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.listConfigSecretVersions('auth.jwt.secretRef'),
    ).resolves.toEqual([
      expect.objectContaining({
        active: true,
        activeVaultKey: true,
        encrypted: true,
        envelopeVersion: 'v2',
        key: 'auth.jwt.secretRef',
        vaultKeyId: 'local',
        version: 1,
      }),
    ]);
    await expect(service.getConfigVaultStatus()).resolves.toMatchObject({
      activeKeyConfigCount: 3,
      activeKeyId: 'local',
      encryptedConfigCount: 3,
      legacyEnvelopeCount: 0,
      provider: 'env',
      secretVersionCount: 3,
      staleKeyEnvelopeCount: 0,
    });
    await expect(
      service.rotateSecretConfig('auth.jwt.secretRef', {
        reason: 'Seed repository rotation.',
        rotatedBy: 'admin',
        value: 'env:ROTATED_AUTH_TOKEN_SECRET',
      }),
    ).resolves.toMatchObject({
      active: true,
      encrypted: true,
      key: 'auth.jwt.secretRef',
      reason: 'Seed repository rotation.',
      rotatedBy: 'admin',
      version: 2,
    });
    await expect(
      service.resolveSecretConfigValue('auth.jwt.secretRef'),
    ).resolves.toEqual({
      key: 'auth.jwt.secretRef',
      value: 'env:ROTATED_AUTH_TOKEN_SECRET',
      valueType: 'string',
    });
    await expect(
      service.listConfigSecretVersions('auth.jwt.secretRef'),
    ).resolves.toEqual([
      expect.objectContaining({
        active: true,
        activeVaultKey: true,
        envelopeVersion: 'v2',
        vaultKeyId: 'local',
        version: 2,
      }),
      expect.objectContaining({
        active: false,
        activeVaultKey: true,
        envelopeVersion: 'v2',
        vaultKeyId: 'local',
        version: 1,
      }),
    ]);
    await expect(
      service.rotateConfigVaultKey({
        reason: 'Seed repository vault key rewrap.',
        rotatedBy: 'admin',
      }),
    ).resolves.toMatchObject({
      activeKeyConfigCount: 3,
      activeKeyId: 'local',
      encryptedConfigCount: 3,
      legacyEnvelopeCount: 0,
      provider: 'env',
      reason: 'Seed repository vault key rewrap.',
      rewrappedConfigCount: 3,
      rewrappedSecretVersionCount: 4,
      rotatedBy: 'admin',
      secretVersionCount: 4,
      staleKeyEnvelopeCount: 0,
    });
    await expect(
      service.resolveSecretConfigValue('auth.jwt.secretRef'),
    ).resolves.toEqual({
      key: 'auth.jwt.secretRef',
      value: 'env:ROTATED_AUTH_TOKEN_SECRET',
      valueType: 'string',
    });
    await expect(
      service.rotateSecretConfig('auth.jwt.secretRef', { value: '   ' }),
    ).rejects.toThrow(BadRequestException);

    const config = await service.createConfig({
      category: 'feature',
      key: 'sample.enabled',
      name: 'Sample enabled',
      value: 'true',
      valueType: 'boolean',
      remark: 'Created from seed repository test.',
      visibility: 'public',
    });

    expect(config.category).toBe('feature');
    expect(config.name).toBe('Sample enabled');
    expect(config.remark).toBe('Created from seed repository test.');
    expect(config.system).toBe(false);
    expect(config.visibility).toBe('public');
    await expect(
      service.getConfigValueByKey('sample.enabled'),
    ).resolves.toMatchObject({
      key: 'sample.enabled',
      value: 'true',
      valueType: 'boolean',
      environment: 'default',
      overridden: false,
    });
    const updated = await service.updateConfig('sample.enabled', {
      category: 'feature-flags',
      name: 'Sample enabled flag',
      value: 'false',
      remark: 'Updated from seed repository test.',
    });
    expect(updated).toMatchObject({
      category: 'feature-flags',
      name: 'Sample enabled flag',
      remark: 'Updated from seed repository test.',
      value: 'false',
    });
    await expect(
      service.getConfigValueByKey('sample.enabled'),
    ).resolves.toMatchObject({
      key: 'sample.enabled',
      value: 'false',
      valueType: 'boolean',
      environment: 'default',
      overridden: false,
    });
    const secondConfig = await service.createConfig({
      category: 'feature',
      key: 'sample.batch-delete',
      name: 'Sample batch delete',
      value: 'batch',
      valueType: 'string',
      visibility: 'public',
    });
    await expect(service.deleteConfigs({ keys: [] })).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.deleteConfigs({
        keys: ['sample.enabled', 'sample.enabled'],
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.deleteConfigs({
        keys: ['sample.enabled', 'sample.missing'],
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.deleteConfigs({
        keys: [secondConfig.key, 'sample.enabled'],
      }),
    ).resolves.toEqual({
      deleted: true,
      affected: 2,
      keys: ['sample.batch-delete', 'sample.enabled'],
    });
    await expect(service.getConfigValueByKey('sample.enabled')).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.refreshConfigCache()).resolves.toMatchObject({
      refreshed: true,
      cachedKeys: expect.any(Number),
      refreshedAt: expect.any(String),
    });
    const exportPreview = await service.createExportPreview();
    expect(exportPreview).toMatchObject({
      filename: 'opencore-system-config.xlsx',
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      scope: 'current-page',
      columns: [
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
      ],
    });
    const exportWorkbook = Buffer.from(exportPreview.contentBase64, 'base64');
    expect(exportWorkbook.subarray(0, 2).toString('utf8')).toBe('PK');
    expect(exportWorkbook.length).toBeGreaterThan(100);
  });

  it('returns runtime config from public values and invalidates title cache after update', async () => {
    const service = new SystemConfigService(new SeedSystemConfigRepository());

    await expect(service.getRuntimeConfig()).resolves.toEqual({
      environment: 'default',
      adminTitle: 'OpenCore Admin',
      featureFlags: {
        'notice.inbox': true,
      },
      featureFlagRules: {
        'notice.inbox': {
          audienceRules: { mode: 'all', rules: [] },
          enabled: true,
          rolloutPercentage: 100,
        },
      },
      loginLockoutMinutes: 15,
      loginMaxFailedAttempts: 5,
    });

    await service.updateConfig('opencore.admin.title', {
      value: 'OpenCore Runtime Admin',
    });
    await service.updateConfig('feature.notice.inbox.enabled', {
      value: 'false',
    });
    await service.updateConfig('auth.login.lockoutMinutes', {
      value: '20',
    });
    await service.updateConfig('auth.login.maxFailedAttempts', {
      value: '4',
    });

    await expect(service.getRuntimeConfig()).resolves.toEqual({
      environment: 'default',
      adminTitle: 'OpenCore Runtime Admin',
      featureFlags: {
        'notice.inbox': false,
      },
      featureFlagRules: {
        'notice.inbox': {
          audienceRules: { mode: 'all', rules: [] },
          enabled: false,
          rolloutPercentage: 100,
        },
      },
      loginLockoutMinutes: 20,
      loginMaxFailedAttempts: 4,
    });
    await service.updateConfig('feature.notice.inbox.enabled', {
      value: 'true',
    });
    await service.updateConfig('feature.notice.inbox.rolloutPercentage', {
      value: '0',
    });
    await expect(
      service.evaluateFeatureFlag({
        flag: 'notice.inbox',
        subjectKey: 'user_admin',
      }),
    ).resolves.toMatchObject({
      enabled: false,
      rolloutPercentage: 0,
      reason: 'outside-rollout',
    });
    await service.updateConfig('feature.notice.inbox.rolloutPercentage', {
      value: '100',
    });
    await service.updateConfig('feature.notice.inbox.audienceRules', {
      value: JSON.stringify({
        mode: 'all',
        rules: [
          { attribute: 'dept', operator: 'equals', values: ['operations'] },
        ],
      }),
    });
    await expect(
      service.evaluateFeatureFlag({
        flag: 'notice.inbox',
        subjectKey: 'user_admin',
      }),
    ).resolves.toMatchObject({
      audienceMatched: false,
      enabled: false,
      reason: 'audience-mismatch',
    });
    await expect(
      service.evaluateFeatureFlag({
        attributes: '{"dept":"operations"}',
        flag: 'notice.inbox',
        subjectKey: 'user_admin',
      }),
    ).resolves.toMatchObject({
      audienceMatched: true,
      enabled: true,
      reason: 'matched-rollout',
    });
    await service.updateConfig('feature.notice.inbox.audienceRules', {
      value: '{"mode":"all","rules":[]}',
    });

    await expect(
      service.updateConfig('feature.notice.inbox.enabled', {
        valueType: 'string',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateConfig('feature.notice.inbox.enabled', {
        visibility: 'private',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createConfig({
        key: 'feature.sample.enabled',
        value: 'true',
        valueType: 'string',
        visibility: 'public',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createConfig({
        key: 'feature.sample.enabled',
        value: 'true',
        valueType: 'boolean',
        visibility: 'private',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateConfig('feature.notice.inbox.rolloutPercentage', {
        valueType: 'string',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateConfig('feature.notice.inbox.rolloutPercentage', {
        visibility: 'private',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateConfig('feature.notice.inbox.rolloutPercentage', {
        value: '101',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createConfig({
        key: 'feature.sample.rolloutPercentage',
        value: '50.5',
        valueType: 'number',
        visibility: 'public',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateConfig('feature.notice.inbox.audienceRules', {
        valueType: 'string',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateConfig('feature.notice.inbox.audienceRules', {
        visibility: 'private',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateConfig('feature.notice.inbox.audienceRules', {
        value: '{"mode":"some","rules":[]}',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createConfig({
        key: 'feature.sample.audienceRules',
        value: 'not-json',
        valueType: 'json',
        visibility: 'public',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.evaluateFeatureFlag({
        attributes: '{"dept":["operations"]}',
        flag: 'notice.inbox',
        subjectKey: 'user_admin',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.evaluateFeatureFlag({
        flag: 'missing.flag',
        subjectKey: 'user_admin',
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.evaluateFeatureFlag({
        flag: 'notice.inbox',
        subjectKey: '',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.updateConfig('auth.login.lockoutMinutes', {
        value: '20.5',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateConfig('auth.login.lockoutMinutes', {
        value: 'not-a-number',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateConfig('auth.login.maxFailedAttempts', {
        value: '0',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateConfig('auth.login.maxFailedAttempts', {
        value: '20.5',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.updateConfig('auth.login.maxFailedAttempts', {
        visibility: 'private',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.createConfig({
        key: 'sample.boolean.invalid',
        value: 'yes',
        valueType: 'boolean',
        visibility: 'public',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('resolves public config environment overrides for runtime config and feature flags', async () => {
    const service = new SystemConfigService(new SeedSystemConfigRepository());

    await expect(
      service.upsertConfigEnvironmentOverride('auth.jwt.secretRef', 'staging', {
        value: 'env:STAGING_AUTH_TOKEN_SECRET',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.upsertConfigEnvironmentOverride(
        'opencore.admin.title',
        'default',
        {
          value: 'Blocked',
        },
      ),
    ).rejects.toThrow(BadRequestException);

    const titleOverride = await service.upsertConfigEnvironmentOverride(
      'opencore.admin.title',
      'staging',
      {
        value: 'OpenCore Staging Admin',
        remark: 'Staging title override.',
      },
    );
    expect(titleOverride).toMatchObject({
      environment: 'staging',
      key: 'opencore.admin.title',
      remark: 'Staging title override.',
      value: 'OpenCore Staging Admin',
      valueType: 'string',
      visibility: 'public',
    });
    await expect(
      service.listConfigEnvironmentOverrides('opencore.admin.title'),
    ).resolves.toEqual([
      expect.objectContaining({
        environment: 'staging',
        value: 'OpenCore Staging Admin',
      }),
    ]);
    await expect(
      service.getConfigValueByKey('opencore.admin.title', 'staging'),
    ).resolves.toMatchObject({
      environment: 'staging',
      key: 'opencore.admin.title',
      overridden: true,
      value: 'OpenCore Staging Admin',
    });
    await expect(
      service.getConfigValueByKey('opencore.admin.title', 'prod'),
    ).resolves.toMatchObject({
      environment: 'prod',
      overridden: false,
      value: 'OpenCore Admin',
    });

    await service.upsertConfigEnvironmentOverride(
      'feature.notice.inbox.rolloutPercentage',
      'staging',
      { value: '0' },
    );
    await expect(
      service.getRuntimeConfig({ environment: 'staging' }),
    ).resolves.toMatchObject({
      adminTitle: 'OpenCore Staging Admin',
      environment: 'staging',
      featureFlagRules: {
        'notice.inbox': expect.objectContaining({
          rolloutPercentage: 0,
        }),
      },
    });
    await expect(
      service.evaluateFeatureFlag({
        environment: 'staging',
        flag: 'notice.inbox',
        subjectKey: 'user_admin',
      }),
    ).resolves.toMatchObject({
      enabled: false,
      environment: 'staging',
      reason: 'outside-rollout',
      rolloutPercentage: 0,
    });

    await expect(
      service.upsertConfigEnvironmentOverride(
        'feature.notice.inbox.rolloutPercentage',
        'staging',
        { value: '101' },
      ),
    ).rejects.toThrow(BadRequestException);
    await service.deleteConfigEnvironmentOverride(
      'feature.notice.inbox.rolloutPercentage',
      'staging',
    );
    await expect(
      service.evaluateFeatureFlag({
        environment: 'staging',
        flag: 'notice.inbox',
        subjectKey: 'user_admin',
      }),
    ).resolves.toMatchObject({
      enabled: true,
      environment: 'staging',
      rolloutPercentage: 100,
    });
  });

  it('decrypts legacy unversioned vault envelopes and rewraps them as v2', () => {
    const previousActiveKeyId = process.env.OPENCORE_CONFIG_KMS_ACTIVE_KEY_ID;
    const previousKey = process.env.OPENCORE_CONFIG_KMS_KEY;
    const previousKeyring = process.env.OPENCORE_CONFIG_KMS_KEYRING;

    try {
      process.env.OPENCORE_CONFIG_KMS_KEY = 'legacy-vault-key';
      delete process.env.OPENCORE_CONFIG_KMS_ACTIVE_KEY_ID;
      delete process.env.OPENCORE_CONFIG_KMS_KEYRING;

      const legacyValue = createLegacySystemConfigSecretValue({
        key: 'auth.legacy.secret',
        material: 'legacy-vault-key',
        plaintext: 'legacy-secret',
      });

      expect(inspectSystemConfigSecretEnvelope(legacyValue)).toMatchObject({
        activeKey: false,
        encrypted: true,
        envelopeVersion: 'v1',
      });
      expect(
        normalizeExistingConfigValue({
          key: 'auth.legacy.secret',
          value: legacyValue,
          valueType: 'string',
          visibility: 'secret',
        }),
      ).toBe('legacy-secret');

      const rewrappedValue = normalizeStoredConfigValue({
        key: 'auth.legacy.secret',
        value: 'legacy-secret',
        valueType: 'string',
        visibility: 'secret',
      });

      expect(rewrappedValue).toEqual(
        expect.stringContaining(SYSTEM_CONFIG_SECRET_VALUE_V2_PREFIX),
      );
      expect(
        normalizeExistingConfigValue({
          key: 'auth.legacy.secret',
          value: rewrappedValue,
          valueType: 'string',
          visibility: 'secret',
        }),
      ).toBe('legacy-secret');
    } finally {
      if (previousActiveKeyId === undefined) {
        delete process.env.OPENCORE_CONFIG_KMS_ACTIVE_KEY_ID;
      } else {
        process.env.OPENCORE_CONFIG_KMS_ACTIVE_KEY_ID = previousActiveKeyId;
      }
      if (previousKey === undefined) {
        delete process.env.OPENCORE_CONFIG_KMS_KEY;
      } else {
        process.env.OPENCORE_CONFIG_KMS_KEY = previousKey;
      }
      if (previousKeyring === undefined) {
        delete process.env.OPENCORE_CONFIG_KMS_KEYRING;
      } else {
        process.env.OPENCORE_CONFIG_KMS_KEYRING = previousKeyring;
      }
    }
  });

  it('rewraps seeded secret configs when the active vault key changes', async () => {
    const previousActiveKeyId = process.env.OPENCORE_CONFIG_KMS_ACTIVE_KEY_ID;
    const previousKey = process.env.OPENCORE_CONFIG_KMS_KEY;
    const previousKeyring = process.env.OPENCORE_CONFIG_KMS_KEYRING;

    try {
      process.env.OPENCORE_CONFIG_KMS_KEY = 'test-local-vault-key';
      delete process.env.OPENCORE_CONFIG_KMS_ACTIVE_KEY_ID;
      delete process.env.OPENCORE_CONFIG_KMS_KEYRING;

      const service = new SystemConfigService(new SeedSystemConfigRepository());

      await expect(service.getConfigVaultStatus()).resolves.toMatchObject({
        activeKeyConfigCount: 3,
        activeKeyId: 'local',
        encryptedConfigCount: 3,
        legacyEnvelopeCount: 0,
        secretVersionCount: 3,
        staleKeyEnvelopeCount: 0,
      });

      process.env.OPENCORE_CONFIG_KMS_ACTIVE_KEY_ID = 'next';
      process.env.OPENCORE_CONFIG_KMS_KEYRING = JSON.stringify({
        local: 'test-local-vault-key',
        next: 'test-next-vault-key',
      });

      await expect(service.getConfigVaultStatus()).resolves.toMatchObject({
        activeKeyConfigCount: 0,
        activeKeyId: 'next',
        encryptedConfigCount: 3,
        keyIds: ['local', 'next'],
        legacyEnvelopeCount: 0,
        secretVersionCount: 3,
        staleKeyEnvelopeCount: 6,
      });
      await expect(
        service.rotateConfigVaultKey({
          reason: 'Seed active key switch.',
          rotatedBy: 'admin',
        }),
      ).resolves.toMatchObject({
        activeKeyConfigCount: 3,
        activeKeyId: 'next',
        encryptedConfigCount: 3,
        legacyEnvelopeCount: 0,
        reason: 'Seed active key switch.',
        rewrappedConfigCount: 3,
        rewrappedSecretVersionCount: 3,
        rotatedBy: 'admin',
        secretVersionCount: 3,
        staleKeyEnvelopeCount: 0,
      });
      await expect(
        service.resolveSecretConfigValue('auth.jwt.secretRef'),
      ).resolves.toEqual({
        key: 'auth.jwt.secretRef',
        value: 'env:AUTH_TOKEN_SECRET',
        valueType: 'string',
      });
      await expect(
        service.listConfigSecretVersions('auth.jwt.secretRef'),
      ).resolves.toEqual([
        expect.objectContaining({
          active: true,
          activeVaultKey: true,
          envelopeVersion: 'v2',
          vaultKeyId: 'next',
          version: 1,
        }),
      ]);
    } finally {
      if (previousActiveKeyId === undefined) {
        delete process.env.OPENCORE_CONFIG_KMS_ACTIVE_KEY_ID;
      } else {
        process.env.OPENCORE_CONFIG_KMS_ACTIVE_KEY_ID = previousActiveKeyId;
      }
      if (previousKey === undefined) {
        delete process.env.OPENCORE_CONFIG_KMS_KEY;
      } else {
        process.env.OPENCORE_CONFIG_KMS_KEY = previousKey;
      }
      if (previousKeyring === undefined) {
        delete process.env.OPENCORE_CONFIG_KMS_KEYRING;
      } else {
        process.env.OPENCORE_CONFIG_KMS_KEYRING = previousKeyring;
      }
    }
  });

  it('requires explicit secret visibility and redacts secret config values', async () => {
    const service = new SystemConfigService(new SeedSystemConfigRepository());

    await expect(
      service.createConfig({
        key: 'auth.token.secret',
        value: 'unsafe',
        valueType: 'string',
      }),
    ).rejects.toThrow(BadRequestException);

    const secret = await service.createConfig({
      key: 'auth.token.secret',
      value: 'unsafe',
      valueType: 'string',
      visibility: 'secret',
    });

    expect(secret).toMatchObject({
      key: 'auth.token.secret',
      encrypted: true,
      value: '[REDACTED]',
      public: false,
      visibility: 'secret',
    });
    expect(JSON.stringify(await service.listConfig())).not.toContain('unsafe');
    await expect(service.getConfigValueByKey(secret.key)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.resolveSecretConfigValue(secret.key)).resolves.toEqual(
      {
        key: secret.key,
        value: 'unsafe',
        valueType: 'string',
      },
    );
    await expect(
      service.resolveSecretConfigValue('opencore.admin.title'),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.createConfig({
        key: 'auth.boolean.secret',
        value: 'true',
        valueType: 'boolean',
        visibility: 'secret',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('PrismaSystemConfigRepository integration', () => {
    const prisma = new PrismaService();
    const service = new SystemConfigService(
      new PrismaSystemConfigRepository(prisma),
    );
    const testRunId = randomUUID().slice(0, 8);
    const configKey = `system.config.${testRunId}`;
    const batchConfigKey = `system.config.batch.${testRunId}`;
    const secretKey = `auth.token.secret.${testRunId}`;

    beforeAll(async () => {
      await ensureSeedSystemConfigs();
    });

    beforeEach(async () => {
      await cleanupTestRows();
    });

    afterEach(async () => {
      await cleanupTestRows();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('reads seeded configs from PostgreSQL', async () => {
      await expect(
        service.listConfig({ page: 1, pageSize: 20 }),
      ).resolves.toEqual(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              key: 'opencore.admin.title',
              system: true,
            }),
          ]),
        }),
      );
      await expect(
        service.deleteConfig('opencore.admin.title'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.deleteConfigs({ keys: ['opencore.admin.title'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('persists config CRUD and keeps secret values redacted through Prisma', async () => {
      const config = await service.createConfig({
        category: 'runtime',
        key: configKey,
        name: 'Runtime smoke config',
        value: 'true',
        valueType: 'boolean',
        remark: 'Prisma metadata smoke config.',
        public: true,
      });

      expect(config.key).toBe(configKey);
      expect(config.system).toBe(false);
      await expect(service.getConfig(configKey)).resolves.toMatchObject({
        category: 'runtime',
        key: configKey,
        name: 'Runtime smoke config',
        remark: 'Prisma metadata smoke config.',
        value: 'true',
        visibility: 'public',
      });
      await expect(
        service.getConfigValueByKey(configKey),
      ).resolves.toMatchObject({
        key: configKey,
        value: 'true',
        valueType: 'boolean',
        environment: 'default',
        overridden: false,
      });
      const updated = await service.updateConfig(configKey, {
        category: 'runtime-updated',
        name: 'Runtime smoke config updated',
        value: 'false',
        remark: 'Prisma metadata smoke config updated.',
      });
      expect(updated).toMatchObject({
        category: 'runtime-updated',
        name: 'Runtime smoke config updated',
        remark: 'Prisma metadata smoke config updated.',
        value: 'false',
      });
      await expect(
        service.getConfigValueByKey(configKey),
      ).resolves.toMatchObject({
        key: configKey,
        value: 'false',
        valueType: 'boolean',
        environment: 'default',
        overridden: false,
      });
      await expect(service.refreshConfigCache()).resolves.toMatchObject({
        refreshed: true,
        cachedKeys: expect.any(Number),
        refreshedAt: expect.any(String),
      });
      await expect(
        service.getConfigValueByKey('auth.login.lockoutMinutes'),
      ).resolves.toMatchObject({
        key: 'auth.login.lockoutMinutes',
        value: '15',
        valueType: 'number',
        environment: 'default',
        overridden: false,
      });
      await expect(
        service.getConfigValueByKey('auth.login.maxFailedAttempts'),
      ).resolves.toMatchObject({
        key: 'auth.login.maxFailedAttempts',
        value: '5',
        valueType: 'number',
        environment: 'default',
        overridden: false,
      });
      const override = await service.upsertConfigEnvironmentOverride(
        configKey,
        'staging',
        {
          value: 'true',
          remark: 'Prisma environment override.',
        },
      );
      expect(override).toMatchObject({
        environment: 'staging',
        key: configKey,
        remark: 'Prisma environment override.',
        value: 'true',
      });
      await expect(
        service.getConfigValueByKey(configKey, 'staging'),
      ).resolves.toMatchObject({
        environment: 'staging',
        key: configKey,
        overridden: true,
        value: 'true',
      });
      await expect(
        service.listConfigEnvironmentOverrides(configKey),
      ).resolves.toEqual([
        expect.objectContaining({
          environment: 'staging',
          value: 'true',
        }),
      ]);
      await expect(
        prisma.systemConfigEnvironmentOverride.findUnique({
          where: {
            key_environment: {
              environment: 'staging',
              key: configKey,
            },
          },
        }),
      ).resolves.toMatchObject({
        environment: 'staging',
        key: configKey,
        value: 'true',
      });
      await expect(
        service.deleteConfigEnvironmentOverride(configKey, 'staging'),
      ).resolves.toEqual({ deleted: true });
      await expect(
        service.getConfigValueByKey(configKey, 'staging'),
      ).resolves.toMatchObject({
        environment: 'staging',
        overridden: false,
        value: 'false',
      });

      const secret = await service.createConfig({
        category: 'security',
        key: secretKey,
        name: 'Secret token setting',
        value: 'super-secret',
        valueType: 'string',
        remark: 'Redaction must preserve metadata.',
        visibility: 'secret',
      });

      expect(secret.category).toBe('security');
      expect(secret.name).toBe('Secret token setting');
      expect(secret.remark).toBe('Redaction must preserve metadata.');
      expect(secret.value).toBe('[REDACTED]');
      expect(secret.encrypted).toBe(true);
      await expect(service.getConfig(secretKey)).resolves.toMatchObject({
        key: secretKey,
        encrypted: true,
        value: '[REDACTED]',
        visibility: 'secret',
      });
      const storedSecret = await prisma.systemConfig.findUnique({
        where: { key: secretKey },
        select: { value: true },
      });
      expect(storedSecret?.value).toEqual(
        expect.stringContaining(SYSTEM_CONFIG_SECRET_VALUE_PREFIX),
      );
      expect(storedSecret?.value).toEqual(
        expect.stringContaining(SYSTEM_CONFIG_SECRET_VALUE_V2_PREFIX),
      );
      expect(storedSecret?.value).not.toContain('super-secret');
      await expect(
        service.listConfigSecretVersions(secretKey),
      ).resolves.toEqual([
        expect.objectContaining({
          active: true,
          activeVaultKey: true,
          encrypted: true,
          envelopeVersion: 'v2',
          key: secretKey,
          vaultKeyId: 'local',
          version: 1,
        }),
      ]);
      await expect(service.listConfigSecretVersions(configKey)).rejects.toThrow(
        BadRequestException,
      );
      const updatedSecret = await service.updateConfig(secretKey, {
        remark: 'Secret metadata update keeps the vault envelope.',
      });
      expect(updatedSecret).toMatchObject({
        encrypted: true,
        value: '[REDACTED]',
        visibility: 'secret',
        remark: 'Secret metadata update keeps the vault envelope.',
      });
      const storedSecretAfterMetadataUpdate =
        await prisma.systemConfig.findUnique({
          where: { key: secretKey },
          select: { value: true },
        });
      expect(storedSecretAfterMetadataUpdate?.value).toEqual(
        expect.stringContaining(SYSTEM_CONFIG_SECRET_VALUE_PREFIX),
      );
      expect(storedSecretAfterMetadataUpdate?.value).toEqual(
        expect.stringContaining(SYSTEM_CONFIG_SECRET_VALUE_V2_PREFIX),
      );
      expect(storedSecretAfterMetadataUpdate?.value).not.toContain(
        'super-secret',
      );
      await expect(
        service.listConfigSecretVersions(secretKey),
      ).resolves.toEqual([
        expect.objectContaining({
          active: true,
          activeVaultKey: true,
          envelopeVersion: 'v2',
          vaultKeyId: 'local',
          version: 1,
        }),
      ]);
      await expect(service.getConfigValueByKey(secretKey)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(
        service.resolveSecretConfigValue(secretKey),
      ).resolves.toEqual({
        key: secretKey,
        value: 'super-secret',
        valueType: 'string',
      });
      await expect(
        service.rotateSecretConfig(configKey, { value: 'not-secret' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.rotateSecretConfig(secretKey, { value: '   ' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.rotateSecretConfig(secretKey, {
          reason: 'Prisma rotation.',
          rotatedBy: 'admin',
          value: 'rotated-super-secret',
        }),
      ).resolves.toMatchObject({
        active: true,
        encrypted: true,
        key: secretKey,
        reason: 'Prisma rotation.',
        rotatedBy: 'admin',
        version: 2,
      });
      await expect(
        service.resolveSecretConfigValue(secretKey),
      ).resolves.toEqual({
        key: secretKey,
        value: 'rotated-super-secret',
        valueType: 'string',
      });
      await expect(
        service.listConfigSecretVersions(secretKey),
      ).resolves.toEqual([
        expect.objectContaining({
          active: true,
          activeVaultKey: true,
          encrypted: true,
          envelopeVersion: 'v2',
          key: secretKey,
          reason: 'Prisma rotation.',
          rotatedBy: 'admin',
          vaultKeyId: 'local',
          version: 2,
        }),
        expect.objectContaining({
          active: false,
          activeVaultKey: true,
          encrypted: true,
          envelopeVersion: 'v2',
          key: secretKey,
          vaultKeyId: 'local',
          version: 1,
        }),
      ]);
      const vaultStatusBeforeKeyRotation = await service.getConfigVaultStatus();
      expect(vaultStatusBeforeKeyRotation).toMatchObject({
        activeKeyId: 'local',
        legacyEnvelopeCount: 0,
        provider: 'env',
        staleKeyEnvelopeCount: 0,
      });
      expect(vaultStatusBeforeKeyRotation.encryptedConfigCount).toBeGreaterThan(
        0,
      );
      expect(vaultStatusBeforeKeyRotation.secretVersionCount).toBeGreaterThan(
        0,
      );
      const storedSecretVersions =
        await prisma.systemConfigSecretVersion.findMany({
          where: { key: secretKey },
          orderBy: { version: 'asc' },
          select: { active: true, value: true, version: true },
        });
      expect(storedSecretVersions).toEqual([
        expect.objectContaining({ active: false, version: 1 }),
        expect.objectContaining({ active: true, version: 2 }),
      ]);
      for (const version of storedSecretVersions) {
        expect(version.value).toEqual(
          expect.stringContaining(SYSTEM_CONFIG_SECRET_VALUE_PREFIX),
        );
        expect(version.value).toEqual(
          expect.stringContaining(SYSTEM_CONFIG_SECRET_VALUE_V2_PREFIX),
        );
        expect(version.value).not.toContain('super-secret');
        expect(version.value).not.toContain('rotated-super-secret');
      }
      const storedSecretBeforeVaultKeyRotation =
        await prisma.systemConfig.findUnique({
          where: { key: secretKey },
          select: { value: true },
        });
      const storedSecretVersionsBeforeVaultKeyRotation =
        await prisma.systemConfigSecretVersion.findMany({
          where: { key: secretKey },
          orderBy: { version: 'asc' },
          select: { value: true },
        });
      await expect(
        service.rotateConfigVaultKey({
          reason: 'Prisma vault key rewrap.',
          rotatedBy: 'admin',
        }),
      ).resolves.toMatchObject({
        activeKeyConfigCount: vaultStatusBeforeKeyRotation.encryptedConfigCount,
        activeKeyId: 'local',
        encryptedConfigCount: vaultStatusBeforeKeyRotation.encryptedConfigCount,
        legacyEnvelopeCount: 0,
        provider: 'env',
        reason: 'Prisma vault key rewrap.',
        rewrappedConfigCount: vaultStatusBeforeKeyRotation.encryptedConfigCount,
        rewrappedSecretVersionCount:
          vaultStatusBeforeKeyRotation.secretVersionCount,
        rotatedBy: 'admin',
        secretVersionCount: vaultStatusBeforeKeyRotation.secretVersionCount,
        staleKeyEnvelopeCount: 0,
      });
      const storedSecretAfterVaultKeyRotation =
        await prisma.systemConfig.findUnique({
          where: { key: secretKey },
          select: { value: true },
        });
      expect(storedSecretAfterVaultKeyRotation?.value).toEqual(
        expect.stringContaining(SYSTEM_CONFIG_SECRET_VALUE_V2_PREFIX),
      );
      expect(storedSecretAfterVaultKeyRotation?.value).not.toEqual(
        storedSecretBeforeVaultKeyRotation?.value,
      );
      expect(storedSecretAfterVaultKeyRotation?.value).not.toContain(
        'rotated-super-secret',
      );
      const storedSecretVersionsAfterVaultKeyRotation =
        await prisma.systemConfigSecretVersion.findMany({
          where: { key: secretKey },
          orderBy: { version: 'asc' },
          select: { value: true },
        });
      expect(
        storedSecretVersionsAfterVaultKeyRotation.map(
          (version) => version.value,
        ),
      ).not.toEqual(
        storedSecretVersionsBeforeVaultKeyRotation.map(
          (version) => version.value,
        ),
      );
      for (const version of storedSecretVersionsAfterVaultKeyRotation) {
        expect(version.value).toEqual(
          expect.stringContaining(SYSTEM_CONFIG_SECRET_VALUE_V2_PREFIX),
        );
        expect(version.value).not.toContain('super-secret');
        expect(version.value).not.toContain('rotated-super-secret');
      }
      await expect(
        service.resolveSecretConfigValue(secretKey),
      ).resolves.toEqual({
        key: secretKey,
        value: 'rotated-super-secret',
        valueType: 'string',
      });
      expect(
        JSON.stringify(await service.listConfig({ pageSize: 50 })),
      ).not.toContain('super-secret');
      expect(
        JSON.stringify(await service.listConfigSecretVersions(secretKey)),
      ).not.toContain('rotated-super-secret');
      await expect(
        service.createExportPreview({ page: 1, pageSize: 20 }),
      ).resolves.toMatchObject({
        filename: 'opencore-system-config.xlsx',
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        scope: 'current-page',
        contentBase64: expect.any(String),
        columns: expect.arrayContaining([
          'featureFlag',
          'featureRollout',
          'featureAudience',
          'system',
        ]),
        rowCount: expect.any(Number),
      });
      await service.createConfig({
        category: 'runtime',
        key: batchConfigKey,
        name: 'Runtime batch config',
        value: 'batch',
        valueType: 'string',
        visibility: 'public',
      });
      await expect(
        service.deleteConfigs({ keys: [configKey, batchConfigKey] }),
      ).resolves.toEqual({
        deleted: true,
        affected: 2,
        keys: [batchConfigKey, configKey].sort(),
      });
      await expect(service.getConfig(configKey)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteConfig(secretKey)).resolves.toEqual({
        deleted: true,
      });
      await expect(
        prisma.systemConfigSecretVersion.count({ where: { key: secretKey } }),
      ).resolves.toBe(0);
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.systemConfig.deleteMany({
        where: { key: { in: [configKey, batchConfigKey, secretKey] } },
      });
    }

    async function ensureSeedSystemConfigs(): Promise<void> {
      for (const config of seedSystemConfigs) {
        const storedValue = normalizeStoredConfigValue({
          key: config.key,
          value: config.value,
          valueType: config.valueType,
          visibility: config.visibility,
        });
        await prisma.systemConfig.upsert({
          where: { key: config.key },
          update: {
            category: config.category,
            name: config.name,
            value: storedValue,
            valueType: config.valueType,
            description: config.description,
            remark: config.remark,
            public: config.public,
            system: config.system,
          },
          create: {
            id: config.id,
            category: config.category,
            name: config.name,
            key: config.key,
            value: storedValue,
            valueType: config.valueType,
            description: config.description,
            remark: config.remark,
            public: config.public,
            system: config.system,
          },
        });

        if (config.visibility === 'secret') {
          await prisma.systemConfigSecretVersion.updateMany({
            where: { key: config.key, active: true },
            data: { active: false },
          });
          await prisma.systemConfigSecretVersion.upsert({
            where: {
              key_version: {
                key: config.key,
                version: 1,
              },
            },
            update: {
              active: true,
              reason: 'Seeded secret baseline.',
              rotatedBy: 'seed',
              value: storedValue,
              valueType: 'string',
            },
            create: {
              active: true,
              key: config.key,
              reason: 'Seeded secret baseline.',
              rotatedBy: 'seed',
              value: storedValue,
              valueType: 'string',
              version: 1,
            },
          });
        }
      }
    }
  });
});

function createLegacySystemConfigSecretValue(input: {
  key: string;
  material: string;
  plaintext: string;
}): string {
  const iv = randomBytes(12);
  const vaultKey = createHash('sha256')
    .update(`opencore-system-config-vault:${input.material}`, 'utf8')
    .digest();
  const cipher = createCipheriv('aes-256-gcm', vaultKey, iv);
  cipher.setAAD(Buffer.from(`system-config:${input.key}`, 'utf8'));
  const ciphertext = Buffer.concat([
    cipher.update(input.plaintext, 'utf8'),
    cipher.final(),
  ]);
  const envelope = {
    alg: 'aes-256-gcm',
    ciphertext: ciphertext.toString('base64url'),
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
  };

  return `${SYSTEM_CONFIG_SECRET_VALUE_PREFIX}${Buffer.from(
    JSON.stringify(envelope),
    'utf8',
  ).toString('base64url')}`;
}
