import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
import { PrismaSystemConfigRepository } from './system-config.prisma-repository';
import { normalizeStoredConfigValue } from './system-config.repository';
import { seedSystemConfigs } from './system-config.records';
import { SeedSystemConfigRepository } from './system-config.seed-repository';
import { SystemConfigService } from './system-config.service';
import { SYSTEM_CONFIG_SECRET_VALUE_PREFIX } from './system-config.vault';

describe('@opencore/system system-config', () => {
  it('supports seeded config CRUD and export previews', async () => {
    const service = new SystemConfigService(new SeedSystemConfigRepository());

    await expect(service.listConfig({ page: 1, pageSize: 1 })).resolves.toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 1,
        total: 7,
        totalPages: 7,
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
      subjectKey: 'user_admin',
      enabled: true,
      rolloutPercentage: 100,
      audienceMatched: true,
      bucket: expect.any(Number),
      reason: 'matched-rollout',
    });
    await expect(
      service.getConfigValueByKey('auth.login.lockoutMinutes'),
    ).resolves.toEqual({
      key: 'auth.login.lockoutMinutes',
      value: '15',
      valueType: 'number',
    });
    await expect(
      service.getConfigValueByKey('auth.login.maxFailedAttempts'),
    ).resolves.toEqual({
      key: 'auth.login.maxFailedAttempts',
      value: '5',
      valueType: 'number',
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
    ).resolves.toEqual({
      key: 'sample.enabled',
      value: 'true',
      valueType: 'boolean',
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
    ).resolves.toEqual({
      key: 'sample.enabled',
      value: 'false',
      valueType: 'boolean',
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
      await expect(service.getConfigValueByKey(configKey)).resolves.toEqual({
        key: configKey,
        value: 'true',
        valueType: 'boolean',
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
      await expect(service.getConfigValueByKey(configKey)).resolves.toEqual({
        key: configKey,
        value: 'false',
        valueType: 'boolean',
      });
      await expect(service.refreshConfigCache()).resolves.toMatchObject({
        refreshed: true,
        cachedKeys: expect.any(Number),
        refreshedAt: expect.any(String),
      });
      await expect(
        service.getConfigValueByKey('auth.login.lockoutMinutes'),
      ).resolves.toEqual({
        key: 'auth.login.lockoutMinutes',
        value: '15',
        valueType: 'number',
      });
      await expect(
        service.getConfigValueByKey('auth.login.maxFailedAttempts'),
      ).resolves.toEqual({
        key: 'auth.login.maxFailedAttempts',
        value: '5',
        valueType: 'number',
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
      expect(storedSecret?.value).not.toContain('super-secret');
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
      expect(storedSecretAfterMetadataUpdate?.value).not.toContain(
        'super-secret',
      );
      await expect(service.getConfigValueByKey(secretKey)).rejects.toThrow(
        ForbiddenException,
      );
      expect(
        JSON.stringify(await service.listConfig({ pageSize: 50 })),
      ).not.toContain('super-secret');
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
      }
    }
  });
});
