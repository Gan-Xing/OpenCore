#!/usr/bin/env node

const DEFAULT_PORT = '39173';

const port = process.env.OPENCORE_SMOKE_PORT || DEFAULT_PORT;
const baseUrl = trimTrailingSlash(
  process.env.OPENCORE_SMOKE_BASE_URL || `http://127.0.0.1:${port}`,
);
const apiPrefix = normalizeApiPrefix(
  process.env.OPENCORE_SMOKE_API_PREFIX || '/api',
);
const checkDocs = parseBoolean(process.env.OPENCORE_SMOKE_CHECK_DOCS, true);
const username = process.env.OPENCORE_SMOKE_ADMIN_USERNAME || 'admin';
const passwordCandidates = [
  process.env.OPENCORE_SMOKE_ADMIN_PASSWORD,
  process.env.BOOTSTRAP_ADMIN_PASSWORD,
  'admin123',
].filter((candidate, index, candidates) => {
  return Boolean(candidate) && candidates.indexOf(candidate) === index;
});
const timeoutMs = Number(process.env.OPENCORE_SMOKE_TIMEOUT_MS || 10000);

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const dictCode = `opencore.smoke.dict.${runId}`;
let token;
let alphaItemId;
let betaItemId;
const createdDictCodes = [];

class HttpStatusError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HttpStatusError';
    this.status = status;
  }
}

try {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    await request(`${apiPrefix}/docs-json`, { expected: [200] });
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');

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

async function apiRequest(path, options = {}) {
  return request(`${apiPrefix}${path}`, {
    ...options,
    token,
    expected: options.expected || [200, 201],
  });
}

async function login() {
  let lastError;

  for (const password of passwordCandidates) {
    try {
      return await request(`${apiPrefix}/auth/login`, {
        method: 'POST',
        expected: [200, 201],
        body: {
          username,
          password,
        },
      });
    } catch (error) {
      lastError = error;
      if (
        !(error instanceof HttpStatusError) ||
        ![401, 403].includes(error.status)
      ) {
        throw error;
      }
    }
  }

  throw new Error(
    `Unable to authenticate smoke admin ${username}. Set OPENCORE_SMOKE_ADMIN_PASSWORD to the deployed admin password.`,
    { cause: lastError },
  );
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

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const expected = options.expected || [200];

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    const responseBody = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!expected.includes(response.status)) {
      throw new HttpStatusError(
        `${options.method || 'GET'} ${path} returned ${response.status}: ${JSON.stringify(responseBody)}`,
        response.status,
      );
    }

    return responseBody;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${options.method || 'GET'} ${path} timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `${label} mismatch: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function normalizeApiPrefix(value) {
  const trimmed = value.trim();

  if (!trimmed || trimmed === '/') {
    return '';
  }

  return trimmed.startsWith('/') ? trimTrailingSlash(trimmed) : `/${trimmed}`;
}

function parseBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}
