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
const permissionCode = `core:smoke-permission-${runId}:read`;
let token;
let createdPermission = false;

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

  const list = await apiRequest('/core/permissions');
  assertArray(list, 'permission list');
  assertPermission(
    findPermission(list, 'core:permission:read'),
    'core:permission:read',
    { system: true },
  );

  const detail = await apiRequest(
    `/core/permissions/${encodeURIComponent('core:permission:read')}`,
  );
  assertPermission(detail, 'core:permission:read', { system: true });

  await apiRequest(
    `/core/permissions/${encodeURIComponent('core:permission:read')}`,
    {
      method: 'PATCH',
      expected: [400],
      body: { title: 'Renamed System Permission' },
    },
  );

  await apiRequest(
    `/core/permissions/${encodeURIComponent('core:permission:read')}`,
    {
      method: 'DELETE',
      expected: [400],
    },
  );

  const created = await apiRequest('/core/permissions', {
    method: 'POST',
    body: {
      code: permissionCode,
      title: 'Smoke Permission Read',
    },
  });
  createdPermission = true;
  assertPermission(created, permissionCode, { system: false });

  const fetched = await apiRequest(
    `/core/permissions/${encodeURIComponent(permissionCode)}`,
  );
  assertPermission(fetched, permissionCode, { system: false });

  const updated = await apiRequest(
    `/core/permissions/${encodeURIComponent(permissionCode)}`,
    {
      method: 'PATCH',
      body: { title: 'Smoke Permission Read Updated' },
    },
  );
  assertEqual(
    updated.title,
    'Smoke Permission Read Updated',
    'updated permission title',
  );

  const exportPreview = await apiRequest('/core/permissions/export');
  assertEqual(exportPreview.scope, 'current-page', 'permission export scope');
  assertString(exportPreview.filename, 'permission export filename');
  assertNumberAtLeast(exportPreview.rowCount, 1, 'permission export rowCount');
  assertArray(exportPreview.columns, 'permission export columns');
  assertIncludes(exportPreview.columns, 'code', 'permission export code');
  assertIncludes(exportPreview.columns, 'title', 'permission export title');

  await cleanupCreatedPermission();

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
        'core.permission.list',
        'core.permission.system-detail',
        'core.permission.system-update-guard',
        'core.permission.system-delete-guard',
        'core.permission.create',
        'core.permission.detail',
        'core.permission.update',
        'core.permission.export',
        'core.permission.delete',
      ],
    }),
  );
} catch (error) {
  await cleanupCreatedPermission().catch(() => undefined);
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

async function cleanupCreatedPermission() {
  if (!token || !createdPermission) {
    return;
  }

  await apiRequest(`/core/permissions/${encodeURIComponent(permissionCode)}`, {
    method: 'DELETE',
    expected: [200, 404],
  });
  createdPermission = false;
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

function findPermission(permissions, code) {
  const permission = permissions.find((candidate) => candidate.code === code);
  if (!permission) {
    throw new Error(`Expected permission list to include ${code}`);
  }
  return permission;
}

function assertPermission(value, code, expectations = {}) {
  if (!value || typeof value !== 'object') {
    throw new Error(`Expected permission ${code} to be an object`);
  }
  assertEqual(value.code, code, `${code} code`);
  assertString(value.title, `${code} title`);
  assertString(value.stage, `${code} stage`);

  for (const [key, expected] of Object.entries(expectations)) {
    assertEqual(value[key], expected, `${code} ${key}`);
  }
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Expected ${label} to be a non-empty string`);
  }
  return value;
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an array`);
  }
}

function assertIncludes(values, expected, label) {
  if (!values.includes(expected)) {
    throw new Error(`Expected ${label} to include ${expected}`);
  }
}

function assertNumberAtLeast(value, minimum, label) {
  if (typeof value !== 'number' || value < minimum) {
    throw new Error(`Expected ${label} to be at least ${minimum}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `Expected ${label} to equal ${JSON.stringify(
        expected,
      )}, got ${JSON.stringify(actual)}`,
    );
  }
}

function formatBody(body) {
  if (typeof body === 'string') {
    return body.slice(0, 500);
  }

  return JSON.stringify(body).slice(0, 500);
}
