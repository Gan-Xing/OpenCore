import type { DictDataOptionSummary } from '@opencore/sdk';

import {
  assertArray,
  assertEqual,
  assertIncludes,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request } = smoke;

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const dictCode = `opencore.smoke.dict.${runId}`;
const importDictCode = `opencore.smoke.import.${runId}`;
const createdDictCodes: string[] = [];

async function main() {
  let token: string | undefined;

  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      await request(`${apiPrefix}/docs-json`, { expected: [200] });
    }

    const loginResponse = await smoke.login();
    token = assertString(loginResponse.accessToken, 'login accessToken');

    const importTemplate = await clients.system.getDictImportTemplate(token);
    assertString(importTemplate.contentBase64, 'dict import template content');
    assertIncludes(importTemplate.columns, 'dictCode', 'dict import template columns');

    const importCsvBase64 = createImportCsvBase64(importDictCode);
    const importPreview = await clients.system.previewImportDicts(token, {
      contentBase64: importCsvBase64,
    });
    assertEqual(importPreview.dryRun, true, 'dict import preview dryRun');
    assertEqual(importPreview.createdDicts, 1, 'dict import preview dict count');
    assertEqual(importPreview.createdItems, 2, 'dict import preview item count');
    assertEqual(importPreview.failed, 0, 'dict import preview failures');

    const importResult = await clients.system.importDicts(token, {
      contentBase64: importCsvBase64,
    });
    createdDictCodes.push(importDictCode);
    assertEqual(importResult.dryRun, false, 'dict import apply dryRun');
    assertEqual(importResult.createdDicts, 1, 'dict import apply dict count');
    assertEqual(importResult.createdItems, 2, 'dict import apply item count');
    assertEqual(importResult.failed, 0, 'dict import apply failures');
    assertOptionValues(
      importDictCode,
      await publicSimpleList(importDictCode),
      ['primary'],
      'imported dict simple-list options',
    );

    const translation = await clients.system.translateDictValues(token, {
      entries: [{ dictCode: importDictCode, values: ['primary', 'missing'] }],
    });
    assertEqual(translation.items.length, 2, 'dict translation item count');
    assertEqual(translation.items[0]?.found, true, 'dict translation found item');
    assertEqual(translation.items[0]?.label, 'Primary', 'dict translation label');
    assertEqual(translation.items[1]?.found, false, 'dict translation missing item');

    const createdDict = await clients.system.createDict(token, {
      code: dictCode,
      description: 'Dictionary data simple-list smoke',
      enabled: true,
      items: [],
      name: 'OpenCore Smoke Dictionary',
    });
    createdDictCodes.push(dictCode);
    assertEqual(createdDict.code, dictCode, 'created dict code');

    await smoke.apiRequest(
      `/core/dicts/${encodeURIComponent(dictCode)}/items`,
      {
        body: {
          enabled: 'true',
          label: 'Bad Boolean',
          value: 'bad-boolean',
        },
        expected: [400],
        method: 'POST',
        token,
      },
    );

    const alpha = await clients.system.createDictItem(token, dictCode, {
      colorType: 'success',
      enabled: true,
      label: 'Alpha',
      remark: 'Smoke alpha option',
      sort: 10,
      value: 'alpha',
    });
    const alphaItemId = assertString(alpha.id, 'alpha item id');
    assertEqual(alpha.value, 'alpha', 'alpha value');

    const beta = await clients.system.createDictItem(token, dictCode, {
      colorType: 'warning',
      enabled: false,
      label: 'Beta',
      sort: 20,
      value: 'beta',
    });
    const betaItemId = assertString(beta.id, 'beta item id');
    assertEqual(beta.enabled, false, 'beta initial enabled');

    const items = await clients.system.listDictItems(token, dictCode);
    assertEqual(items.length, 2, 'dict item count');

    const itemPage = await clients.system.listDictItemsPage(token, {
      dictCode,
      page: 1,
      pageSize: 10,
      value: 'alpha',
    });
    assertEqual(itemPage.total, 1, 'dict item page filtered total');
    assertEqual(itemPage.items[0]?.dictCode, dictCode, 'dict item page dictCode');

    const dictPage = await clients.system.listDicts(token, {
      code: dictCode,
      page: 1,
      pageSize: 10,
    });
    assertEqual(dictPage.total, 1, 'dict page filtered total');

    const dictExport = await clients.system.exportDicts(token, { code: dictCode });
    assertEqual(dictExport.rowCount, 1, 'dict export row count');

    const itemExport = await clients.system.exportDictItems(token, { dictCode });
    assertEqual(itemExport.rowCount, 2, 'dict item export row count');

    const betaDetail = await clients.system.getDictItem(
      token,
      dictCode,
      betaItemId,
    );
    assertEqual(betaDetail.value, 'beta', 'beta detail value');

    const initialOptions = await publicSimpleList(dictCode);
    assertOptionValues(
      dictCode,
      initialOptions,
      ['alpha'],
      'initial simple-list options',
    );

    const enabledBeta = await clients.system.updateDictItem(
      token,
      dictCode,
      betaItemId,
      {
        enabled: true,
        label: 'Beta Enabled',
      },
    );
    assertEqual(enabledBeta.enabled, true, 'beta enabled update');

    await clients.system.updateDictItemStatus(token, {
      enabled: false,
      ids: [betaItemId],
    });
    assertOptionValues(
      dictCode,
      await publicSimpleList(dictCode),
      ['alpha'],
      'batch-disabled item simple-list options',
    );

    await clients.system.updateDictItemStatus(token, {
      enabled: true,
      ids: [betaItemId],
    });

    const enabledOptions = await publicSimpleList(dictCode);
    assertOptionValues(
      dictCode,
      enabledOptions,
      ['alpha', 'beta'],
      'enabled simple-list options',
    );

    await clients.system.updateDict(token, dictCode, {
      enabled: false,
    });
    assertOptionValues(
      dictCode,
      await publicSimpleList(dictCode),
      [],
      'disabled dict simple-list options',
    );

    await clients.system.updateDict(token, dictCode, {
      enabled: true,
    });

    await clients.system.updateDictStatus(token, {
      codes: [dictCode],
      enabled: false,
    });
    assertOptionValues(
      dictCode,
      await publicSimpleList(dictCode),
      [],
      'batch-disabled dict simple-list options',
    );

    await clients.system.updateDictStatus(token, {
      codes: [dictCode],
      enabled: true,
    });

    const cacheRefresh = await clients.system.refreshDictCache(token);
    assertEqual(cacheRefresh.refreshed, true, 'dict cache refresh result');

    const updatedAlpha = await clients.system.updateDictItem(
      token,
      dictCode,
      alphaItemId,
      {
        sort: 30,
        value: 'alpha-updated',
      },
    );
    assertEqual(updatedAlpha.value, 'alpha-updated', 'alpha updated value');

    await clients.system.deleteDictItem(token, dictCode, alphaItemId);
    const deletedAlphaPage = await clients.system.listDeletedDictItemsPage(token, {
      dictCode,
      page: 1,
      pageSize: 10,
      value: 'alpha-updated',
    });
    assertEqual(deletedAlphaPage.total, 1, 'deleted dict item page total');
    await clients.system.restoreDictItem(token, alphaItemId);
    assertOptionValues(
      dictCode,
      await publicSimpleList(dictCode),
      ['alpha-updated', 'beta'],
      'restored dict item simple-list options',
    );
    await clients.system.deleteDictItem(token, dictCode, alphaItemId);
    assertOptionValues(
      dictCode,
      await publicSimpleList(dictCode),
      ['beta'],
      'post-delete simple-list options',
    );

    await smoke.apiRequest(`/core/dicts/${encodeURIComponent(dictCode)}`, {
      expected: [400],
      method: 'DELETE',
      token,
    });

    await clients.system.deleteDictItems(token, { ids: [betaItemId] });
    await clients.system.hardDeleteDictItem(token, alphaItemId);
    await clients.system.hardDeleteDictItem(token, betaItemId);
    assertOptionValues(
      dictCode,
      await publicSimpleList(dictCode),
      [],
      'post-batch-delete simple-list options',
    );

    await clients.system.deleteDicts(token, { codes: [dictCode] });
    const deletedDictPage = await clients.system.listDeletedDicts(token, {
      code: dictCode,
      page: 1,
      pageSize: 10,
    });
    assertEqual(deletedDictPage.total, 1, 'deleted dict page total');
    await clients.system.restoreDict(token, dictCode);
    await clients.system.deleteDict(token, dictCode);
    await clients.system.hardDeleteDict(token, dictCode);
    removeCreatedDictCode(dictCode);

    await cleanupCreatedDicts(token);

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
          'core.dict.import-template',
          'core.dict.import-preview',
          'core.dict.import-apply',
          'core.dict.translation',
          'core.dict.create',
          'core.dict.item.bad-boolean-rejected',
          'core.dict.item.create',
          'core.dict.item.list',
          'core.dict.item.page',
          'core.dict.page',
          'core.dict.export',
          'core.dict.item.export',
          'core.dict.item.detail',
          'core.dict.simple-list.public-consumer',
          'core.dict.simple-list.disabled-item-filtered',
          'core.dict.item.batch-status',
          'core.dict.item.update',
          'core.dict.simple-list.disabled-dict-filtered',
          'core.dict.batch-status',
          'core.dict.refresh-cache',
          'core.dict.delete-with-items-rejected',
          'core.dict.item.recycle-list',
          'core.dict.item.restore',
          'core.dict.item.delete',
          'core.dict.item.hard-delete',
          'core.dict.item.batch-delete',
          'core.dict.recycle-list',
          'core.dict.restore',
          'core.dict.hard-delete',
          'core.dict.batch-delete',
        ],
      }),
    );
  } catch (error) {
    await cleanupCreatedDicts(token).catch(() => undefined);
    throw error;
  }
}

async function publicSimpleList(code: string) {
  const options = await request<readonly DictDataOptionSummary[]>(
    `${apiPrefix}/core/dict-data/simple-list?dictCode=${encodeURIComponent(code)}`,
    { expected: [200] },
  );
  assertArray(options, 'dict simple-list options');
  return options;
}

function assertOptionValues(
  dictCodeForOptions: string,
  options: readonly DictDataOptionSummary[],
  expectedValues: readonly string[],
  label: string,
) {
  const actualValues = options.map((option) => option.value).sort();
  const sortedExpected = [...expectedValues].sort();
  assertEqual(
    JSON.stringify(actualValues),
    JSON.stringify(sortedExpected),
    label,
  );
  for (const option of options) {
    assertEqual(option.dictCode, dictCodeForOptions, `${label} dictCode`);
    assertEqual(typeof option.label, 'string', `${label} label type`);
  }
}

function createImportCsvBase64(code: string): string {
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
      'OpenCore Smoke Imported Dictionary',
      'Imported by smoke.',
      '',
      'true',
      'primary',
      'Primary',
      '10',
      'true',
      'success',
      '',
      'Primary imported option',
    ],
    [
      code,
      'OpenCore Smoke Imported Dictionary',
      'Imported by smoke.',
      '',
      'true',
      'secondary',
      'Secondary',
      '20',
      'false',
      'warning',
      '',
      'Secondary imported option',
    ],
  ]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\n');

  return Buffer.from(csv, 'utf8').toString('base64');
}

function escapeCsvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function removeCreatedDictCode(code: string): void {
  const index = createdDictCodes.indexOf(code);
  if (index >= 0) {
    createdDictCodes.splice(index, 1);
  }
}

async function cleanupCreatedDicts(token: string | undefined) {
  if (!token) {
    return;
  }

  for (const code of [...createdDictCodes].reverse()) {
    const items = await clients.system
      .listDictItemsPage(token, { dictCode: code, page: 1, pageSize: 200 })
      .catch(() => undefined);
    const itemIds = items?.items.map((item) => item.id) ?? [];
    if (itemIds.length > 0) {
      await clients.system
        .deleteDictItems(token, { ids: itemIds })
        .catch(() => undefined);
    }

    const deletedItems = await clients.system
      .listDeletedDictItemsPage(token, { dictCode: code, page: 1, pageSize: 200 })
      .catch(() => undefined);
    for (const item of deletedItems?.items ?? []) {
      await smoke
        .apiRequest(`/core/dict-items/${encodeURIComponent(item.id)}/hard`, {
          expected: [200, 404],
          method: 'DELETE',
          token,
        })
        .catch(() => undefined);
    }

    await smoke.apiRequest(`/core/dicts/${encodeURIComponent(code)}`, {
      expected: [200, 404],
      method: 'DELETE',
      token,
    });

    await smoke
      .apiRequest(`/core/dicts/${encodeURIComponent(code)}/hard`, {
        expected: [200, 404],
        method: 'DELETE',
        token,
      })
      .catch(() => undefined);
  }

  createdDictCodes.length = 0;
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      status: 'fail',
      baseUrl,
      apiPrefix,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});
