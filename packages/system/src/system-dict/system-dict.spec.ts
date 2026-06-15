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
    await expectHttpExceptionCode(
      service.createDict({
        code: 'sample.status',
        name: 'Duplicate Sample Status',
        items: [],
      }),
      'SYSTEM_DICT_ALREADY_EXISTS',
    );
    expect(
      (await service.updateDict('sample.status', { enabled: false })).enabled,
    ).toBe(false);
    await expect(service.deleteDict('sample.status')).resolves.toEqual({
      deleted: true,
    });
  });

  it('supports item-level management and simple-list filtering in seed mode', async () => {
    const service = new SystemDictService(new SeedSystemDictRepository());
    const dict = await service.createDict({
      code: 'sample.options',
      name: 'Sample Options',
      items: [],
    });
    const visible = await service.createDictItem(dict.code, {
      label: 'Visible',
      value: 'visible',
      sort: 10,
    });
    const hidden = await service.createDictItem(dict.code, {
      label: 'Hidden',
      value: 'hidden',
      enabled: false,
      sort: 20,
    });
    await expectHttpExceptionCode(
      service.createDictItem(dict.code, {
        label: 'Duplicate Visible',
        value: 'visible',
      }),
      'SYSTEM_DICT_ITEM_ALREADY_EXISTS',
    );

    await expect(service.listDictItems(dict.code)).resolves.toHaveLength(2);
    await expect(
      service.listDictDataOptions({ dictCode: dict.code }),
    ).resolves.toEqual([
      expect.objectContaining({
        dictCode: dict.code,
        value: visible.value,
      }),
    ]);

    await expect(
      service.updateDictItem(dict.code, hidden.id, { enabled: true }),
    ).resolves.toMatchObject({ enabled: true });
    await expect(
      service.listDictDataOptions({ dictCode: dict.code }),
    ).resolves.toHaveLength(2);

    await service.updateDict(dict.code, { enabled: false });
    await expect(
      service.listDictDataOptions({ dictCode: dict.code }),
    ).resolves.toEqual([]);

    await service.updateDict(dict.code, { enabled: true });
    await expect(
      service.deleteDictItem(dict.code, visible.id),
    ).resolves.toEqual({ deleted: true });
    await expectHttpExceptionCode(
      service.getDictItem(dict.code, visible.id),
      'SYSTEM_DICT_ITEM_NOT_FOUND',
    );
  });

  it('rejects malformed dictionary booleans and item sort values', async () => {
    const service = new SystemDictService(new SeedSystemDictRepository());

    await expectHttpExceptionCode(
      service.createDict({
        code: 'sample.invalid',
        name: 'Sample Invalid',
        enabled: 'true' as unknown as boolean,
        items: [],
      }),
      'SYSTEM_DICT_BOOLEAN_INVALID',
    );

    await expectHttpExceptionCode(
      service.createDict({
        code: 'sample.invalid-item',
        name: 'Sample Invalid Item',
        items: [
          {
            id: 'invalid_item',
            label: 'Invalid',
            value: 'invalid',
            enabled: true,
            sort: '10' as unknown as number,
          },
        ],
      }),
      'SYSTEM_DICT_INTEGER_INVALID',
    );
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

    it('persists dictionary item CRUD and simple-list filtering through Prisma', async () => {
      const dict = await service.createDict({
        code: dictCode,
        name: 'System Package Dictionary',
        items: [],
      });
      const visible = await service.createDictItem(dict.code, {
        label: 'Visible',
        value: 'visible',
        sort: 10,
      });
      const hidden = await service.createDictItem(dict.code, {
        label: 'Hidden',
        value: 'hidden',
        enabled: false,
        sort: 20,
      });

      await expect(service.getDictItem(dict.code, visible.id)).resolves.toEqual(
        expect.objectContaining({ value: 'visible' }),
      );
      await expect(
        service.listDictDataOptions({ dictCode: dict.code }),
      ).resolves.toEqual([
        expect.objectContaining({
          dictCode: dict.code,
          value: 'visible',
        }),
      ]);

      await expect(
        service.updateDictItem(dict.code, hidden.id, { enabled: true }),
      ).resolves.toMatchObject({ enabled: true });
      await expect(
        service.listDictDataOptions({ dictCode: dict.code }),
      ).resolves.toHaveLength(2);

      await service.updateDict(dict.code, { enabled: false });
      await expect(
        service.listDictDataOptions({ dictCode: dict.code }),
      ).resolves.toEqual([]);

      await service.updateDict(dict.code, { enabled: true });
      await expect(
        service.deleteDictItem(dict.code, visible.id),
      ).resolves.toEqual({ deleted: true });
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.dictType.deleteMany({ where: { code: dictCode } });
    }
  });
});

async function expectHttpExceptionCode(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(getHttpExceptionResponse(error)).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected HTTP exception code ${code}`);
}

function getHttpExceptionResponse(error: unknown): unknown {
  if (
    error &&
    typeof error === 'object' &&
    'getResponse' in error &&
    typeof error.getResponse === 'function'
  ) {
    return error.getResponse();
  }

  return undefined;
}
