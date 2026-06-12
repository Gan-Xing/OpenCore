import { randomUUID } from 'node:crypto';
import { PrismaService } from '@opencore/database';
import { PrismaSystemDictRepository } from './system-dict.prisma-repository';
import { SeedSystemDictRepository } from './system-dict.seed-repository';
import { SystemDictService } from './system-dict.service';

describe('@opencore/system system-dict', () => {
  it('paginates seeded dictionaries and creates current-page export previews', async () => {
    const service = new SystemDictService(new SeedSystemDictRepository());

    await expect(service.listDicts({ page: 1, pageSize: 1 })).resolves.toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 1,
        total: 2,
        totalPages: 2,
      }),
    );
    await expect(service.createExportPreview()).resolves.toMatchObject({
      filename: 'opencore-dicts.csv',
      scope: 'current-page',
      columns: ['code', 'name', 'enabled'],
      rowCount: 2,
    });
    await expect(service.getDict('system.status')).resolves.toMatchObject({
      code: 'system.status',
      items: expect.arrayContaining([
        expect.objectContaining({ value: 'enabled' }),
      ]),
    });
  });

  it('supports seeded dictionary CRUD through the service boundary', async () => {
    const service = new SystemDictService(new SeedSystemDictRepository());
    const dict = await service.createDict({
      code: 'sample.status',
      name: 'Sample Status',
      items: [],
    });

    expect(dict.code).toBe('sample.status');
    expect(
      (await service.updateDict('sample.status', { enabled: false })).enabled,
    ).toBe(false);
    await expect(service.deleteDict('sample.status')).resolves.toEqual({
      deleted: true,
    });
  });

  describe('PrismaSystemDictRepository integration', () => {
    const prisma = new PrismaService();
    const service = new SystemDictService(
      new PrismaSystemDictRepository(prisma),
    );
    const testRunId = randomUUID().slice(0, 8);
    const dictCode = `system.pkg.${testRunId}`;

    beforeEach(async () => {
      await cleanupTestRows();
    });

    afterEach(async () => {
      await cleanupTestRows();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('reads seeded dictionaries from PostgreSQL', async () => {
      await expect(
        service.listDicts({ page: 1, pageSize: 20 }),
      ).resolves.toEqual(
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ code: 'system.status' }),
          ]),
        }),
      );
    });

    it('persists dictionary CRUD through Prisma', async () => {
      const dict = await service.createDict({
        code: dictCode,
        name: 'System Package Dictionary',
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
      await expect(service.getDict(dictCode)).resolves.toMatchObject({
        code: dictCode,
        items: [
          expect.objectContaining({
            value: 'enabled',
          }),
        ],
      });
      expect(
        (await service.updateDict(dictCode, { enabled: false })).enabled,
      ).toBe(false);
      await expect(
        service.createExportPreview({ page: 1, pageSize: 20 }),
      ).resolves.toMatchObject({
        filename: 'opencore-dicts.csv',
        scope: 'current-page',
        rowCount: expect.any(Number),
      });
      await expect(service.deleteDict(dictCode)).resolves.toEqual({
        deleted: true,
      });
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.dictType.deleteMany({ where: { code: dictCode } });
    }
  });
});
