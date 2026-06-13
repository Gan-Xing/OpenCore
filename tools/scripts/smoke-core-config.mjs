#!/usr/bin/env node

const DEFAULT_PORT = '39173';
const REDACTED_SECRET_VALUE = '[REDACTED]';
const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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
const plainKey = `opencore.smoke.config.${runId}`;
const secretKey = `auth.token.secret.${runId}`;
let token;

const createdKeys = [];

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

  const listResponse = await apiRequest('/core/config?page=1&pageSize=10');
  assertArray(listResponse.items, 'config list items');

  const createdConfig = await apiRequest('/core/config', {
    method: 'POST',
    body: {
      category: 'smoke',
      key: plainKey,
      name: 'OpenCore smoke config',
      value: 'true',
      valueType: 'boolean',
      description: 'OpenCore scripted smoke config',
      remark: 'Created by core.config smoke.',
      visibility: 'public',
    },
  });
  createdKeys.push(plainKey);
  assertEqual(createdConfig.category, 'smoke', 'created config category');
  assertEqual(
    createdConfig.name,
    'OpenCore smoke config',
    'created config name',
  );
  assertEqual(createdConfig.key, plainKey, 'created config key');
  assertEqual(
    createdConfig.remark,
    'Created by core.config smoke.',
    'created config remark',
  );
  assertEqual(createdConfig.value, 'true', 'created config value');
  assertEqual(createdConfig.visibility, 'public', 'created config visibility');

  const fetchedConfig = await apiRequest(`/core/config/${plainKey}`);
  assertEqual(fetchedConfig.category, 'smoke', 'detail config category');
  assertEqual(
    fetchedConfig.name,
    'OpenCore smoke config',
    'detail config name',
  );
  assertEqual(fetchedConfig.key, plainKey, 'detail config key');
  assertEqual(
    fetchedConfig.remark,
    'Created by core.config smoke.',
    'detail config remark',
  );
  assertEqual(fetchedConfig.value, 'true', 'detail config value');

  const fetchedValue = await apiRequest(
    `/core/config/get-value-by-key?key=${encodeURIComponent(plainKey)}`,
  );
  assertEqual(fetchedValue.key, plainKey, 'config value key');
  assertEqual(fetchedValue.value, 'true', 'config value by key');
  assertEqual(fetchedValue.valueType, 'boolean', 'config value type');

  const updatedConfig = await apiRequest(`/core/config/${plainKey}`, {
    method: 'PATCH',
    body: {
      category: 'smoke-updated',
      name: 'OpenCore smoke config updated',
      value: 'false',
      valueType: 'boolean',
      description: 'OpenCore scripted smoke config updated',
      remark: 'Updated by core.config smoke.',
    },
  });
  assertEqual(
    updatedConfig.category,
    'smoke-updated',
    'updated config category',
  );
  assertEqual(
    updatedConfig.name,
    'OpenCore smoke config updated',
    'updated config name',
  );
  assertEqual(
    updatedConfig.remark,
    'Updated by core.config smoke.',
    'updated config remark',
  );
  assertEqual(updatedConfig.value, 'false', 'updated config value');

  const updatedValue = await apiRequest(
    `/core/config/get-value-by-key?key=${encodeURIComponent(plainKey)}`,
  );
  assertEqual(updatedValue.value, 'false', 'updated config value by key');

  const cacheRefresh = await apiRequest('/core/config/refresh-cache', {
    method: 'POST',
  });
  assertEqual(cacheRefresh.refreshed, true, 'config cache refresh result');
  assertNumberAtLeast(cacheRefresh.cachedKeys, 1, 'config cache keys');
  assertString(cacheRefresh.refreshedAt, 'config cache refreshedAt');

  const exportPreview = await apiRequest(
    '/core/config/export?page=1&pageSize=10',
  );
  assertEqual(
    exportPreview.filename,
    'opencore-system-config.xlsx',
    'config export filename',
  );
  assertEqual(
    exportPreview.contentType,
    XLSX_CONTENT_TYPE,
    'config export MIME type',
  );
  const exportWorkbook = Buffer.from(
    assertString(exportPreview.contentBase64, 'config export workbook body'),
    'base64',
  );
  assertEqual(
    exportWorkbook.subarray(0, 2).toString('utf8'),
    'PK',
    'config export XLSX zip header',
  );
  assertNumberAtLeast(
    exportWorkbook.length,
    100,
    'config export XLSX byte length',
  );
  assertEqual(exportPreview.scope, 'current-page', 'config export scope');
  assertArray(exportPreview.columns, 'config export columns');
  assertIncludes(
    exportPreview.columns,
    'category',
    'config export category column',
  );
  assertIncludes(exportPreview.columns, 'name', 'config export name column');
  assertIncludes(exportPreview.columns, 'value', 'config export value column');
  assertIncludes(
    exportPreview.columns,
    'remark',
    'config export remark column',
  );

  const secretConfig = await apiRequest('/core/config', {
    method: 'POST',
    body: {
      category: 'security',
      key: secretKey,
      name: 'OpenCore smoke secret config',
      value: 'super-secret-smoke-value',
      valueType: 'string',
      description: 'OpenCore scripted smoke secret config',
      remark: 'Secret config metadata remains visible.',
      visibility: 'secret',
    },
  });
  createdKeys.push(secretKey);
  assertEqual(secretConfig.category, 'security', 'created secret category');
  assertEqual(
    secretConfig.name,
    'OpenCore smoke secret config',
    'created secret name',
  );
  assertEqual(secretConfig.key, secretKey, 'created secret config key');
  assertEqual(
    secretConfig.remark,
    'Secret config metadata remains visible.',
    'created secret remark',
  );
  assertEqual(
    secretConfig.value,
    REDACTED_SECRET_VALUE,
    'created secret config redaction',
  );
  assertEqual(secretConfig.visibility, 'secret', 'created secret visibility');

  const fetchedSecret = await apiRequest(`/core/config/${secretKey}`);
  assertEqual(
    fetchedSecret.value,
    REDACTED_SECRET_VALUE,
    'detail secret config redaction',
  );
  await apiRequest(
    `/core/config/get-value-by-key?key=${encodeURIComponent(secretKey)}`,
    {
      expected: [403],
    },
  );

  await cleanupCreatedConfig();

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
        'core.config.list',
        'core.config.detail',
        'core.config.metadata',
        'core.config.value-by-key',
        'core.config.value-cache-invalidation',
        'core.config.cache-refresh',
        'core.config.create',
        'core.config.update',
        'core.config.export.xlsx',
        'core.config.secret-redaction',
        'core.config.secret-value-blocked',
        'core.config.delete',
      ],
    }),
  );
} catch (error) {
  await cleanupCreatedConfig().catch(() => undefined);
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

async function cleanupCreatedConfig() {
  if (!token) {
    return;
  }

  for (const key of [...createdKeys].reverse()) {
    await apiRequest(`/core/config/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      expected: [200, 404],
    });
  }

  createdKeys.length = 0;
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
        `${options.method || 'GET'} ${path} returned ${response.status}: ${formatBody(
          responseBody,
        )}`,
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

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function normalizeApiPrefix(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes'].includes(value.toLowerCase());
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }

  return value;
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  return value;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(values, expected, label) {
  if (!Array.isArray(values) || !values.includes(expected)) {
    throw new Error(`${label} must include ${expected}`);
  }
}

function assertNumberAtLeast(actual, expected, label) {
  if (typeof actual !== 'number' || actual < expected) {
    throw new Error(`${label} expected >= ${expected}, got ${actual}`);
  }
}

function formatBody(value) {
  if (typeof value === 'string') {
    return value.slice(0, 500);
  }

  return JSON.stringify(value).slice(0, 500);
}
