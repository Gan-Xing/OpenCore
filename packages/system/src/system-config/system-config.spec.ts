import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
import { PrismaSystemConfigRepository } from './system-config.prisma-repository';
import { SeedSystemConfigRepository } from './system-config.seed-repository';
import { SystemConfigService } from './system-config.service';

describe('@opencore/system system-config', () => {
  it('supports seeded config CRUD and export previews', async () => {
    const service = new SystemConfigService(new SeedSystemConfigRepository());

    await expect(service.listConfig({ page: 1, pageSize: 1 })).resolves.toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 1,
        total: 2,
        totalPages: 2,
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
      visibility: 'public',
    });
    await expect(
      service.getConfigValueByKey('opencore.admin.title'),
    ).resolves.toMatchObject({
      key: 'opencore.admin.title',
      value: 'OpenCore Admin',
      valueType: 'string',
    });
    await expect(
      service.getConfigValueByKey('auth.login.lockoutMinutes'),
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
        'public',
        'description',
        'remark',
      ],
    });
    const exportWorkbook = Buffer.from(exportPreview.contentBase64, 'base64');
    expect(exportWorkbook.subarray(0, 2).toString('utf8')).toBe('PK');
    expect(exportWorkbook.length).toBeGreaterThan(100);
    await expect(service.deleteConfig('sample.enabled')).resolves.toEqual({
      deleted: true,
    });
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
      value: '[REDACTED]',
      public: false,
      visibility: 'secret',
    });
    expect(JSON.stringify(await service.listConfig())).not.toContain('unsafe');
    await expect(service.getConfigValueByKey(secret.key)).rejects.toThrow(
      ForbiddenException,
    );
  });

  describe('PrismaSystemConfigRepository integration', () => {
    const prisma = new PrismaService();
    const service = new SystemConfigService(
      new PrismaSystemConfigRepository(prisma),
    );
    const testRunId = randomUUID().slice(0, 8);
    const configKey = `system.config.${testRunId}`;
    const secretKey = `auth.token.secret.${testRunId}`;

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
            expect.objectContaining({ key: 'opencore.admin.title' }),
          ]),
        }),
      );
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
      ).rejects.toThrow(ForbiddenException);

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
      await expect(service.getConfig(secretKey)).resolves.toMatchObject({
        key: secretKey,
        value: '[REDACTED]',
        visibility: 'secret',
      });
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
        rowCount: expect.any(Number),
      });
      await expect(service.deleteConfig(secretKey)).resolves.toEqual({
        deleted: true,
      });
      await expect(service.deleteConfig(configKey)).resolves.toEqual({
        deleted: true,
      });
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.systemConfig.deleteMany({
        where: { key: { in: [configKey, secretKey] } },
      });
    }
  });
});
