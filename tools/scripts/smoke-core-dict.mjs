#!/usr/bin/env node

import {
  assertArray,
  assertEqual,
  assertString,
  createSmokeRuntime,
} from './smoke-helpers.mjs';

const smoke = createSmokeRuntime();
const { apiPrefix, apiRequest, baseUrl, checkDocs, login, request } = smoke;

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const dictCode = `opencore.smoke.dict.${runId}`;
let token;
let alphaItemId;
let betaItemId;
const createdDictCodes = [];

try {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    await request(`${apiPrefix}/docs-json`, { expected: [200] });
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');
  smoke.setToken(token);

  const createdDict = await apiRequest('/core/dicts', {
    method: 'POST',
    body: {
      code: dictCode,
      name: 'OpenCore Smoke Dictionary',
      description: 'Dictionary data simple-list smoke',
      enabled: true,
      items: [],
    },
  });
  createdDictCodes.push(dictCode);
  assertEqual(createdDict.code, dictCode, 'created dict code');

  await apiRequest(`/core/dicts/${encodeURIComponent(dictCode)}/items`, {
    method: 'POST',
    expected: [400],
    body: {
      label: 'Bad Boolean',
      value: 'bad-boolean',
      enabled: 'true',
    },
  });

  const alpha = await apiRequest(
    `/core/dicts/${encodeURIComponent(dictCode)}/items`,
    {
      method: 'POST',
      body: {
        label: 'Alpha',
        value: 'alpha',
        sort: 10,
        enabled: true,
      },
    },
  );
  alphaItemId = assertString(alpha.id, 'alpha item id');
  assertEqual(alpha.value, 'alpha', 'alpha value');

  const beta = await apiRequest(
    `/core/dicts/${encodeURIComponent(dictCode)}/items`,
    {
      method: 'POST',
      body: {
        label: 'Beta',
        value: 'beta',
        sort: 20,
        enabled: false,
      },
    },
  );
  betaItemId = assertString(beta.id, 'beta item id');
  assertEqual(beta.enabled, false, 'beta initial enabled');

  const items = await apiRequest(
    `/core/dicts/${encodeURIComponent(dictCode)}/items`,
  );
  assertArray(items, 'dict items');
  assertEqual(items.length, 2, 'dict item count');

  const betaDetail = await apiRequest(
    `/core/dicts/${encodeURIComponent(dictCode)}/items/${encodeURIComponent(betaItemId)}`,
  );
  assertEqual(betaDetail.value, 'beta', 'beta detail value');

  const initialOptions = await publicSimpleList(dictCode);
  assertOptionValues(initialOptions, ['alpha'], 'initial simple-list options');

  const enabledBeta = await apiRequest(
    `/core/dicts/${encodeURIComponent(dictCode)}/items/${encodeURIComponent(betaItemId)}`,
    {
      method: 'PATCH',
      body: {
        label: 'Beta Enabled',
        enabled: true,
      },
    },
  );
  assertEqual(enabledBeta.enabled, true, 'beta enabled update');

  const enabledOptions = await publicSimpleList(dictCode);
  assertOptionValues(
    enabledOptions,
    ['alpha', 'beta'],
    'enabled simple-list options',
  );

  await apiRequest(`/core/dicts/${encodeURIComponent(dictCode)}`, {
    method: 'PATCH',
    body: {
      enabled: false,
    },
  });
  assertOptionValues(
    await publicSimpleList(dictCode),
    [],
    'disabled dict simple-list options',
  );

  await apiRequest(`/core/dicts/${encodeURIComponent(dictCode)}`, {
    method: 'PATCH',
    body: {
      enabled: true,
    },
  });

  const updatedAlpha = await apiRequest(
    `/core/dicts/${encodeURIComponent(dictCode)}/items/${encodeURIComponent(alphaItemId)}`,
    {
      method: 'PATCH',
      body: {
        value: 'alpha-updated',
        sort: 30,
      },
    },
  );
  assertEqual(updatedAlpha.value, 'alpha-updated', 'alpha updated value');

  await apiRequest(
    `/core/dicts/${encodeURIComponent(dictCode)}/items/${encodeURIComponent(alphaItemId)}`,
    {
      method: 'DELETE',
    },
  );
  assertOptionValues(
    await publicSimpleList(dictCode),
    ['beta'],
    'post-delete simple-list options',
  );

  await cleanupCreatedDicts();

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
        'core.dict.item.detail',
        'core.dict.simple-list.public-consumer',
        'core.dict.simple-list.disabled-item-filtered',
        'core.dict.item.update',
        'core.dict.simple-list.disabled-dict-filtered',
        'core.dict.item.delete',
        'core.dict.delete',
      ],
    }),
  );
} catch (error) {
  await cleanupCreatedDicts().catch(() => undefined);
  console.error(
    JSON.stringify({
      status: 'fail',
      baseUrl,
      apiPrefix,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
}

async function publicSimpleList(code) {
  const options = await request(
    `${apiPrefix}/core/dict-data/simple-list?dictCode=${encodeURIComponent(code)}`,
    {
      expected: [200],
    },
  );
  assertArray(options, 'dict simple-list options');
  return options;
}

function assertOptionValues(options, expectedValues, label) {
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

async function cleanupCreatedDicts() {
  if (!token) {
    return;
  }

  for (const code of [...createdDictCodes].reverse()) {
    await apiRequest(`/core/dicts/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      expected: [200, 404],
    });
  }

  createdDictCodes.length = 0;
}
