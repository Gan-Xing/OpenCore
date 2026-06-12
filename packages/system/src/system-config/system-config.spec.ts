import { BadRequestException } from '@nestjs/common';
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
      key: 'opencore.admin.title',
      public: true,
      visibility: 'public',
    });

    const config = await service.createConfig({
      key: 'sample.enabled',
      value: 'true',
      valueType: 'boolean',
    });

    expect(config.visibility).toBe('private');
    expect(
      (await service.updateConfig('sample.enabled', { value: 'false' })).value,
    ).toBe('false');
    await expect(service.createExportPreview()).resolves.toMatchObject({
      filename: 'opencore-config.csv',
      scope: 'current-page',
      columns: ['key', 'valueType', 'visibility'],
    });
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
        key: configKey,
        value: 'true',
        valueType: 'boolean',
        public: true,
      });

      expect(config.key).toBe(configKey);
      await expect(service.getConfig(configKey)).resolves.toMatchObject({
        key: configKey,
        value: 'true',
        visibility: 'public',
      });
      expect(
        (await service.updateConfig(configKey, { value: 'false' })).value,
      ).toBe('false');

      const secret = await service.createConfig({
        key: secretKey,
        value: 'super-secret',
        valueType: 'string',
        visibility: 'secret',
      });

      expect(secret.value).toBe('[REDACTED]');
      await expect(service.getConfig(secretKey)).resolves.toMatchObject({
        key: secretKey,
        value: '[REDACTED]',
        visibility: 'secret',
      });
      expect(
        JSON.stringify(await service.listConfig({ pageSize: 50 })),
      ).not.toContain('super-secret');
      await expect(
        service.createExportPreview({ page: 1, pageSize: 20 }),
      ).resolves.toMatchObject({
        filename: 'opencore-config.csv',
        scope: 'current-page',
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
