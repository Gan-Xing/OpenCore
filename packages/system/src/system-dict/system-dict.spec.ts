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
        total: 5,
        totalPages: 5,
      }),
    );
    await expect(service.createExportPreview()).resolves.toMatchObject({
      filename: 'opencore-dicts.csv',
      scope: 'current-page',
      columns: ['code', 'name', 'enabled', 'system', 'createdAt', 'updatedAt'],
      rowCount: 5,
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
    await expectHttpExceptionCode(
      service.deleteDict(dict.code),
      'SYSTEM_DICT_HAS_ITEMS',
    );
    await expect(
      service.deleteDictItems({ ids: [hidden.id] }),
    ).resolves.toMatchObject({ affected: 1, deleted: true });
    await expect(service.deleteDict(dict.code)).resolves.toEqual({
      deleted: true,
    });
  });

  it('supports dictionary import, translation, restore and hard delete in seed mode', async () => {
    const service = new SystemDictService(new SeedSystemDictRepository());
    const dictCode = 'sample.imported';
    const contentBase64 = createDictImportCsvBase64(dictCode);

    await expect(service.previewImportDicts({ contentBase64 })).resolves.toMatchObject({
      createdDicts: 1,
      createdItems: 2,
      dryRun: true,
      failed: 0,
    });
    await expect(service.importDicts({ contentBase64 })).resolves.toMatchObject({
      createdDicts: 1,
      createdItems: 2,
      dryRun: false,
      failed: 0,
    });
    await expect(
      service.listDictDataOptions({ dictCode }),
    ).resolves.toEqual([
      expect.objectContaining({ dictCode, label: 'Open', value: 'open' }),
    ]);
    await expect(
      service.translateDictValues({
        entries: [{ dictCode, values: ['open', 'missing'] }],
      }),
    ).resolves.toMatchObject({
      items: [
        expect.objectContaining({ found: true, label: 'Open', value: 'open' }),
        expect.objectContaining({ found: false, value: 'missing' }),
      ],
    });

    const openItem = requireDictItem(await service.listDictItems(dictCode), 'open');
    await expect(service.deleteDictItem(dictCode, openItem.id)).resolves.toEqual({
      deleted: true,
    });
    await expect(
      service.listDeletedDictItemsPage({ dictCode, value: 'open' }),
    ).resolves.toMatchObject({ total: 1 });
    await expect(service.restoreDictItem(openItem.id)).resolves.toMatchObject({
      value: 'open',
    });
    await service.deleteDictItem(dictCode, openItem.id);
    await expect(service.hardDeleteDictItem(openItem.id)).resolves.toEqual({
      deleted: true,
    });

    const closedItem = requireDictItem(
      await service.listDictItems(dictCode),
      'closed',
    );
    await service.deleteDictItem(dictCode, closedItem.id);
    await service.deleteDict(dictCode);
    await expectHttpExceptionCode(
      service.restoreDictItem(closedItem.id),
      'SYSTEM_DICT_PARENT_DELETED',
    );
    await expectHttpExceptionCode(
      service.hardDeleteDict(dictCode),
      'SYSTEM_DICT_HAS_ITEMS',
    );
    await service.restoreDict(dictCode);
    await service.restoreDictItem(closedItem.id);
    await service.deleteDictItem(dictCode, closedItem.id);
    await service.hardDeleteDictItem(closedItem.id);
    await service.deleteDict(dictCode);
    await expect(service.hardDeleteDict(dictCode)).resolves.toEqual({
      deleted: true,
    });
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
    const importDictCode = `system.pkg.import.${testRunId}`;

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
      await expectHttpExceptionCode(
        service.deleteDict(dictCode),
        'SYSTEM_DICT_HAS_ITEMS',
      );
      await expect(
        service.deleteDictItems({ ids: [`dict_item_${testRunId}`] }),
      ).resolves.toMatchObject({ affected: 1, deleted: true });
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
      await expect(
        service.deleteDictItems({ ids: [hidden.id] }),
      ).resolves.toMatchObject({ affected: 1, deleted: true });
      await expect(service.deleteDict(dict.code)).resolves.toEqual({
        deleted: true,
      });
    });

    it('persists import, translation, recycle and hard delete through Prisma', async () => {
      const contentBase64 = createDictImportCsvBase64(importDictCode);

      await expect(
        service.previewImportDicts({ contentBase64 }),
      ).resolves.toMatchObject({
        createdDicts: 1,
        createdItems: 2,
        dryRun: true,
        failed: 0,
      });
      await expect(service.importDicts({ contentBase64 })).resolves.toMatchObject({
        createdDicts: 1,
        createdItems: 2,
        dryRun: false,
        failed: 0,
      });
      await expect(
        service.translateDictValues({
          entries: [{ dictCode: importDictCode, values: ['open', 'missing'] }],
        }),
      ).resolves.toMatchObject({
        items: [
          expect.objectContaining({ found: true, label: 'Open', value: 'open' }),
          expect.objectContaining({ found: false, value: 'missing' }),
        ],
      });

      const openItem = requireDictItem(
        await service.listDictItems(importDictCode),
        'open',
      );
      await service.deleteDictItem(importDictCode, openItem.id);
      await expect(
        service.listDeletedDictItemsPage({
          dictCode: importDictCode,
          value: 'open',
        }),
      ).resolves.toMatchObject({ total: 1 });
      await service.restoreDictItem(openItem.id);
      await service.deleteDictItem(importDictCode, openItem.id);
      await service.hardDeleteDictItem(openItem.id);

      const closedItem = requireDictItem(
        await service.listDictItems(importDictCode),
        'closed',
      );
      await service.deleteDictItem(importDictCode, closedItem.id);
      await service.deleteDict(importDictCode);
      await expectHttpExceptionCode(
        service.restoreDictItem(closedItem.id),
        'SYSTEM_DICT_PARENT_DELETED',
      );
      await expectHttpExceptionCode(
        service.hardDeleteDict(importDictCode),
        'SYSTEM_DICT_HAS_ITEMS',
      );
      await service.restoreDict(importDictCode);
      await service.restoreDictItem(closedItem.id);
      await service.deleteDictItem(importDictCode, closedItem.id);
      await service.hardDeleteDictItem(closedItem.id);
      await service.deleteDict(importDictCode);
      await expect(service.hardDeleteDict(importDictCode)).resolves.toEqual({
        deleted: true,
      });
    });

    async function cleanupTestRows(): Promise<void> {
      await prisma.dictItem.deleteMany({
        where: { type: { code: { in: [dictCode, importDictCode] } } },
      });
      await prisma.dictType.deleteMany({
        where: { code: { in: [dictCode, importDictCode] } },
      });
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

function createDictImportCsvBase64(code: string): string {
  const csv = [
    [
      'dictCode',
      'dictName',
      'dictDescription',
      'dictRemark',
      'dictEnabled',
      'itemValue',
      'itemLabel',
      'itemSort',
      'itemEnabled',
      'itemColorType',
      'itemCssClass',
      'itemRemark',
    ],
    [
      code,
      'Imported Dictionary',
      'Imported by system-dict tests.',
      '',
      'true',
      'open',
      'Open',
      '10',
      'true',
      'success',
      '',
      'Open item',
    ],
    [
      code,
      'Imported Dictionary',
      'Imported by system-dict tests.',
      '',
      'true',
      'closed',
      'Closed',
      '20',
      'false',
      'default',
      '',
      'Closed item',
    ],
  ]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\n');

  return Buffer.from(csv, 'utf8').toString('base64');
}

function escapeCsvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function requireDictItem(
  items: readonly { value: string; id: string }[],
  value: string,
): { value: string; id: string } {
  const item = items.find((candidate) => candidate.value === value);

  if (!item) {
    throw new Error(`Expected dictionary item ${value}`);
  }

  return item;
}
