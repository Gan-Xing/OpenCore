import type { DictDataOptionSummary } from '@opencore/sdk';

import {
  assertArray,
  assertEqual,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request } = smoke;

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const dictCode = `opencore.smoke.dict.${runId}`;
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
      enabledOptions,
      ['alpha', 'beta'],
      'enabled simple-list options',
    );

    await clients.system.updateDict(token, dictCode, {
      enabled: false,
    });
    assertOptionValues(
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
    assertOptionValues(
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
    assertOptionValues(
      await publicSimpleList(dictCode),
      [],
      'post-batch-delete simple-list options',
    );

    await clients.system.deleteDicts(token, { codes: [dictCode] });
    createdDictCodes.length = 0;

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
          'core.dict.item.delete',
          'core.dict.item.batch-delete',
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
    assertEqual(option.dictCode, dictCode, `${label} dictCode`);
    assertEqual(typeof option.label, 'string', `${label} label type`);
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

    await smoke.apiRequest(`/core/dicts/${encodeURIComponent(code)}`, {
      expected: [200, 404],
      method: 'DELETE',
      token,
    });
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
