#!/usr/bin/env node

const DEFAULT_PORT = '39173';
const REDACTED_SECRET_VALUE = '[REDACTED]';

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
      key: plainKey,
      value: 'true',
      valueType: 'boolean',
      description: 'OpenCore scripted smoke config',
      visibility: 'private',
    },
  });
  createdKeys.push(plainKey);
  assertEqual(createdConfig.key, plainKey, 'created config key');
  assertEqual(createdConfig.value, 'true', 'created config value');

  const fetchedConfig = await apiRequest(`/core/config/${plainKey}`);
  assertEqual(fetchedConfig.key, plainKey, 'detail config key');
  assertEqual(fetchedConfig.value, 'true', 'detail config value');

  const updatedConfig = await apiRequest(`/core/config/${plainKey}`, {
    method: 'PATCH',
    body: {
      value: 'false',
      valueType: 'boolean',
      description: 'OpenCore scripted smoke config updated',
    },
  });
  assertEqual(updatedConfig.value, 'false', 'updated config value');

  const exportPreview = await apiRequest(
    '/core/config/export?page=1&pageSize=10',
  );
  assertEqual(exportPreview.scope, 'current-page', 'config export scope');
  assertArray(exportPreview.columns, 'config export columns');

  const secretConfig = await apiRequest('/core/config', {
    method: 'POST',
    body: {
      key: secretKey,
      value: 'super-secret-smoke-value',
      valueType: 'string',
      description: 'OpenCore scripted smoke secret config',
      visibility: 'secret',
    },
  });
  createdKeys.push(secretKey);
  assertEqual(secretConfig.key, secretKey, 'created secret config key');
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
        'core.config.create',
        'core.config.update',
        'core.config.export',
        'core.config.secret-redaction',
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

function formatBody(value) {
  if (typeof value === 'string') {
    return value.slice(0, 500);
  }

  return JSON.stringify(value).slice(0, 500);
}
