import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../platform/database/prisma.service';
import { PrismaSystemManagementRepository } from './prisma-system-management.repository';

describe('PrismaSystemManagementRepository integration', () => {
  const prisma = new PrismaService();
  const repository = new PrismaSystemManagementRepository(prisma);
  const testRunId = randomUUID().slice(0, 8);
  const dictCode = `r4.test.${testRunId}`;
  const configKey = `r4.test.enabled.${testRunId}`;
  const fileName = `r4-test-${testRunId}.txt`;

  beforeEach(async () => {
    await cleanupTestRows();
  });

  afterEach(async () => {
    await cleanupTestRows();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reads seeded system management records from PostgreSQL', async () => {
    await expect(
      repository.listDicts({ page: 1, pageSize: 20 }),
    ).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ code: 'system.status' }),
        ]),
      }),
    );

    await expect(
      repository.listConfig({ page: 1, pageSize: 20 }),
    ).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ key: 'opencore.admin.title' }),
        ]),
      }),
    );

    await expect(
      repository.listFiles({ page: 1, pageSize: 20 }),
    ).resolves.toEqual(
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            storageKey: 'file-assets/opencore-readme.txt',
          }),
        ]),
      }),
    );
  });

  it('persists dictionary, config, and file metadata CRUD through Prisma', async () => {
    const dict = await repository.createDict({
      code: dictCode,
      name: 'R4 Test Dictionary',
      items: [
        {
          id: `dict_item_${testRunId}`,
          label: 'Enabled',
          value: 'enabled',
          sort: 10,
          enabled: true,
        },
      ],
    });

    expect(dict.code).toBe(dictCode);
    expect(
      (await repository.updateDict(dictCode, { enabled: false })).enabled,
    ).toBe(false);

    const config = await repository.createConfig({
      key: configKey,
      value: 'true',
      valueType: 'boolean',
      public: true,
    });

    expect(config.key).toBe(configKey);
    expect(
      (await repository.updateConfig(configKey, { value: 'false' })).value,
    ).toBe('false');

    const file = await repository.createFileAsset({
      originalName: fileName,
      mimeType: 'text/plain',
      sizeBytes: 64,
      uploadedBy: 'admin',
    });

    expect(file.storageKey).toContain('file-assets/');
    expect(file.originalName).toBe(fileName);
    await expect(
      repository.createExportPreview('files', { page: 1, pageSize: 20 }),
    ).resolves.toMatchObject({
      scope: 'current-page',
      rowCount: expect.any(Number),
    });

    await expect(repository.deleteFile(file.id)).resolves.toEqual({
      deleted: true,
    });
    await expect(repository.deleteConfig(configKey)).resolves.toEqual({
      deleted: true,
    });
    await expect(repository.deleteDict(dictCode)).resolves.toEqual({
      deleted: true,
    });
  });

  it('redacts sensitive audit metadata read from PostgreSQL', async () => {
    const auditLogs = await repository.listAuditLogs({ page: 1, pageSize: 20 });

    expect(auditLogs.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestId: 'req_s7_seed_login',
          metadata: expect.objectContaining({
            password: '[REDACTED]',
            authorization: '[REDACTED]',
          }),
        }),
      ]),
    );
  });

  async function cleanupTestRows(): Promise<void> {
    await prisma.dictType.deleteMany({ where: { code: dictCode } });
    await prisma.systemConfig.deleteMany({ where: { key: configKey } });
    await prisma.fileAsset.deleteMany({
      where: { originalName: fileName },
    });
  }
});
