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
const parentKey = `system.smoke-menu-${runId}`;
const childKey = `${parentKey}.child`;
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

  const menus = await apiRequest('/core/menus');
  assertArray(menus, 'menu list');

  const systemRoot = findMenu(menus, 'system');
  assertEqual(systemRoot.type, 'directory', 'system root type');
  assertEqual(systemRoot.path, '/system', 'system root path');
  assertEqual(systemRoot.status, 'enabled', 'system root status');

  const systemMenus = findMenu(menus, 'system.menus');
  assertEqual(systemMenus.parentKey, 'system', 'system.menus parent');
  assertEqual(systemMenus.type, 'menu', 'system.menus type');
  assertEqual(systemMenus.component, 'System/Menus', 'system.menus component');
  assertEqual(systemMenus.hidden, false, 'system.menus visibility');

  const createdParent = await apiRequest('/core/menus', {
    method: 'POST',
    body: {
      key: parentKey,
      parentKey: 'system',
      title: 'Smoke Menu Parent',
      type: 'menu',
      path: `/system/smoke-menu-${runId}`,
      icon: 'AppstoreOutlined',
      component: 'System/SmokeMenu',
      permissionCode: 'core:menu:read',
      order: 997,
      status: 'enabled',
      cache: true,
      hidden: false,
    },
  });
  createdKeys.push(parentKey);
  assertEqual(createdParent.parentKey, 'system', 'created parent parentKey');
  assertEqual(createdParent.cache, true, 'created parent cache');
  assertEqual(createdParent.hidden, false, 'created parent hidden');

  const createdChild = await apiRequest('/core/menus', {
    method: 'POST',
    body: {
      key: childKey,
      parentKey,
      title: 'Smoke Menu Child',
      type: 'menu',
      path: `/system/smoke-menu-${runId}/child`,
      component: 'System/SmokeMenuChild',
      permissionCode: 'core:menu:read',
      order: 998,
      status: 'enabled',
      cache: false,
      hidden: false,
    },
  });
  createdKeys.push(childKey);
  assertEqual(createdChild.parentKey, parentKey, 'created child parentKey');

  const fetchedParent = await apiRequest(
    `/core/menus/${encodeURIComponent(parentKey)}`,
  );
  assertEqual(fetchedParent.key, parentKey, 'detail menu key');
  assertEqual(fetchedParent.component, 'System/SmokeMenu', 'detail component');

  await apiRequest(`/core/menus/${encodeURIComponent(parentKey)}`, {
    method: 'DELETE',
    expected: [400],
  });

  const updatedChild = await apiRequest(
    `/core/menus/${encodeURIComponent(childKey)}`,
    {
      method: 'PATCH',
      body: {
        component: 'System/SmokeMenuChildUpdated',
        permissionCode: null,
        status: 'disabled',
        cache: true,
        hidden: true,
      },
    },
  );
  assertEqual(
    updatedChild.component,
    'System/SmokeMenuChildUpdated',
    'updated child component',
  );
  assertEqual(updatedChild.status, 'disabled', 'updated child status');
  assertEqual(updatedChild.cache, true, 'updated child cache');
  assertEqual(updatedChild.hidden, true, 'updated child hidden');
  assertEqual(
    updatedChild.permissionCode,
    undefined,
    'updated child permission clear',
  );

  const exportPreview = await apiRequest('/core/menus/export');
  assertEqual(exportPreview.scope, 'current-page', 'menu export scope');
  assertArray(exportPreview.columns, 'menu export columns');
  assertIncludes(exportPreview.columns, 'parentKey', 'menu export parentKey');
  assertIncludes(exportPreview.columns, 'component', 'menu export component');
  assertIncludes(exportPreview.columns, 'status', 'menu export status');

  await cleanupCreatedMenus();

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
        'core.menu.list',
        'core.menu.seed-tree-metadata',
        'core.menu.create-parent',
        'core.menu.create-child',
        'core.menu.delete-parent-guard',
        'core.menu.detail',
        'core.menu.update',
        'core.menu.export',
        'core.menu.delete',
      ],
    }),
  );
} catch (error) {
  await cleanupCreatedMenus().catch(() => undefined);
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

async function cleanupCreatedMenus() {
  if (!token) {
    return;
  }

  for (const key of [...createdKeys].reverse()) {
    await apiRequest(`/core/menus/${encodeURIComponent(key)}`, {
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

function findMenu(menus, key) {
  const menu = menus.find((candidate) => candidate.key === key);
  if (!menu) {
    throw new Error(`Expected menu list to include ${key}`);
  }
  return menu;
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
