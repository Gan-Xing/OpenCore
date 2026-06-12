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
const failedUsername = `opencore-smoke-login-${runId}`;
let token;

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

  const listResponse = await apiRequest('/core/login-logs?page=1&pageSize=10');
  assertArray(listResponse.items, 'login log list items');

  await request(`${apiPrefix}/auth/login`, {
    method: 'POST',
    expected: [401, 403],
    body: {
      username: failedUsername,
      password: 'not-the-smoke-password',
    },
  });

  const failedLog = await waitForFailedLoginLog();
  assertEqual(failedLog.username, failedUsername, 'failed login username');
  assertEqual(failedLog.success, false, 'failed login success flag');

  const detailLog = await apiRequest(
    `/core/login-logs/${encodeURIComponent(failedLog.id)}`,
  );
  assertEqual(detailLog.id, failedLog.id, 'detail login log id');
  assertEqual(
    detailLog.username,
    failedUsername,
    'detail failed login username',
  );
  assertEqual(detailLog.success, false, 'detail failed login success flag');
  assertString(detailLog.requestId, 'detail login log requestId');

  const exportPreview = await apiRequest(
    `/core/login-logs/export?username=${encodeURIComponent(
      failedUsername,
    )}&success=false`,
  );
  assertEqual(exportPreview.scope, 'current-page', 'login log export scope');
  assertArray(exportPreview.columns, 'login log export columns');

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
        'auth.failed-login-recorded',
        'core.login-log.list',
        'core.login-log.detail',
        'core.login-log.export',
      ],
    }),
  );
} catch (error) {
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

async function waitForFailedLoginLog() {
  let lastItems = [];

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const page = await apiRequest(
      `/core/login-logs?page=1&pageSize=10&username=${encodeURIComponent(
        failedUsername,
      )}&success=false`,
    );
    assertArray(page.items, 'filtered failed login log items');
    lastItems = page.items;

    const match = page.items.find(
      (item) => item.username === failedUsername && item.success === false,
    );

    if (match) {
      return match;
    }

    await delay(250);
  }

  throw new Error(
    `Failed login log was not recorded for ${failedUsername}; latest rows=${formatBody(
      lastItems,
    )}`,
  );
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
    throw new Error(`Expected ${label} to be a non-empty string`);
  }
  return value;
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an array`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `Expected ${label} to be ${JSON.stringify(
        expected,
      )}, received ${JSON.stringify(actual)}`,
    );
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function formatBody(body) {
  if (typeof body === 'string') {
    return body.slice(0, 500);
  }

  return JSON.stringify(body).slice(0, 500);
}
