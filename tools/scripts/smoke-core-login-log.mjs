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
const lockoutUsername = `opencore-smoke-lockout-${runId}`;
const lockoutPassword = `Lockout-${runId}-A1`;
const loginLockoutAttemptLimit = 5;
const failedLoginUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
let token;
let lockoutUserId;

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
    headers: {
      'user-agent': failedLoginUserAgent,
    },
    body: {
      username: failedUsername,
      password: 'not-the-smoke-password',
    },
  });

  const failedLog = await waitForFailedLoginLog();
  assertEqual(failedLog.username, failedUsername, 'failed login username');
  assertEqual(failedLog.logType, 'login.username', 'failed login log type');
  assertEqual(failedLog.result, 'bad_credentials', 'failed login result');
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
  assertEqual(detailLog.logType, 'login.username', 'detail login log type');
  assertEqual(detailLog.result, 'bad_credentials', 'detail login log result');
  assertEqual(detailLog.success, false, 'detail failed login success flag');
  assertString(detailLog.requestId, 'detail login log requestId');
  assertString(detailLog.ip, 'detail login log ip');
  assertString(detailLog.createdAt, 'detail login log createdAt');
  assertEqual(detailLog.browser, 'Chrome', 'detail login log browser');
  assertEqual(detailLog.os, 'Windows', 'detail login log os');

  const encodedFailedUsername = encodeURIComponent(failedUsername);
  const encodedIp = encodeURIComponent(detailLog.ip);
  const createdFrom = encodeURIComponent(
    offsetIsoDate(detailLog.createdAt, -60_000, 'detail login log createdAt'),
  );
  const createdTo = encodeURIComponent(
    offsetIsoDate(detailLog.createdAt, 60_000, 'detail login log createdAt'),
  );
  const serverFilteredPage = await apiRequest(
    `/core/login-logs?page=1&pageSize=10&username=${encodedFailedUsername}&logType=login.username&result=bad_credentials&success=false&ip=${encodedIp}&createdFrom=${createdFrom}&createdTo=${createdTo}`,
  );
  assertArray(serverFilteredPage.items, 'server filtered login log items');
  if (
    !serverFilteredPage.items.some(
      (item) => item.id === failedLog.id && item.browser === 'Chrome',
    )
  ) {
    throw new Error(
      'Expected server filters to include failed Chrome login log',
    );
  }

  const futureCreatedFrom = encodeURIComponent(
    offsetIsoDate(
      detailLog.createdAt,
      86_400_000,
      'detail login log createdAt',
    ),
  );
  const futurePage = await apiRequest(
    `/core/login-logs?page=1&pageSize=10&username=${encodedFailedUsername}&createdFrom=${futureCreatedFrom}`,
  );
  assertArray(futurePage.items, 'future filtered login log items');
  assertEqual(futurePage.total, 0, 'future filtered login log total');

  await apiRequest('/core/login-logs?createdFrom=not-a-date', {
    expected: [400],
  });
  await apiRequest('/core/login-logs?result=not-a-result', {
    expected: [400],
  });
  await apiRequest('/core/login-logs?logType=login.magic', {
    expected: [400],
  });

  const exportPreview = await apiRequest(
    `/core/login-logs/export?username=${encodedFailedUsername}&logType=login.username&result=bad_credentials&success=false&ip=${encodedIp}&createdFrom=${createdFrom}&createdTo=${createdTo}`,
  );
  assertEqual(exportPreview.scope, 'current-page', 'login log export scope');
  assertArray(exportPreview.columns, 'login log export columns');
  assertIncludes(exportPreview.columns, 'logType', 'login log export columns');
  assertIncludes(exportPreview.columns, 'result', 'login log export columns');
  assertIncludes(exportPreview.columns, 'browser', 'login log export columns');
  assertIncludes(exportPreview.columns, 'os', 'login log export columns');

  const createdLockoutUser = await apiRequest('/core/users', {
    method: 'POST',
    body: {
      username: lockoutUsername,
      displayName: 'Smoke Login Lockout User',
      password: lockoutPassword,
      roleCodes: [],
      enabled: true,
    },
  });
  lockoutUserId = assertString(
    createdLockoutUser.id,
    'created lockout smoke user id',
  );

  const emptyUnlockResult = await apiRequest('/core/login-logs/unlock', {
    method: 'POST',
    body: { username: lockoutUsername },
  });
  assertEqual(
    emptyUnlockResult.username,
    lockoutUsername,
    'empty unlock username',
  );
  assertEqual(emptyUnlockResult.unlocked, false, 'empty unlock result');

  for (let attempt = 0; attempt < loginLockoutAttemptLimit; attempt += 1) {
    await request(`${apiPrefix}/auth/login`, {
      method: 'POST',
      expected: [401, 403],
      body: {
        username: lockoutUsername,
        password: `wrong-${attempt}`,
      },
    });
  }

  await request(`${apiPrefix}/auth/login`, {
    method: 'POST',
    expected: [401, 403],
    body: {
      username: lockoutUsername,
      password: lockoutPassword,
    },
  });

  const lockedLog = await waitForAccountLockedLoginLog();
  assertEqual(
    lockedLog.username,
    lockoutUsername,
    'account locked login username',
  );
  assertEqual(
    lockedLog.result,
    'account_locked',
    'account locked login result',
  );
  assertEqual(lockedLog.success, false, 'account locked success flag');

  const lockedFilterPage = await apiRequest(
    `/core/login-logs?page=1&pageSize=10&username=${encodeURIComponent(
      lockoutUsername,
    )}&result=account_locked&success=false`,
  );
  assertArray(lockedFilterPage.items, 'account locked filtered items');
  if (!lockedFilterPage.items.some((item) => item.id === lockedLog.id)) {
    throw new Error('Expected account_locked login log to be filterable');
  }

  const unlockResult = await apiRequest('/core/login-logs/unlock', {
    method: 'POST',
    body: { username: lockoutUsername },
  });
  assertEqual(unlockResult.username, lockoutUsername, 'unlock username');
  assertEqual(unlockResult.unlocked, true, 'unlock result');
  assertEqual(
    unlockResult.failedAttempts,
    loginLockoutAttemptLimit,
    'unlock failed attempt count',
  );
  assertString(unlockResult.lockedUntil, 'unlock lockedUntil');

  const restoredLogin = await request(`${apiPrefix}/auth/login`, {
    method: 'POST',
    expected: [200, 201],
    body: {
      username: lockoutUsername,
      password: lockoutPassword,
    },
  });
  assertString(restoredLogin.accessToken, 'restored lockout user accessToken');

  await apiRequest(`/core/users/${encodeURIComponent(lockoutUserId)}`, {
    method: 'DELETE',
  });
  lockoutUserId = undefined;

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
        'core.login-log.server-filters',
        'core.login-log.result-schema',
        'core.login-log.invalid-result-guard',
        'core.login-log.invalid-time-range-guard',
        'core.login-log.detail',
        'core.login-log.device-fields',
        'core.login-log.export',
        'core.login-log.unlock-empty',
        'auth.login-lockout.enforced',
        'core.login-log.account-locked-filter',
        'core.login-log.unlock-restores-login',
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
      )}&logType=login.username&result=bad_credentials&success=false`,
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

async function waitForAccountLockedLoginLog() {
  let lastItems = [];

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const page = await apiRequest(
      `/core/login-logs?page=1&pageSize=10&username=${encodeURIComponent(
        lockoutUsername,
      )}&logType=login.username&result=account_locked&success=false`,
    );
    assertArray(page.items, 'filtered account locked login log items');
    lastItems = page.items;

    const match = page.items.find(
      (item) =>
        item.username === lockoutUsername &&
        item.result === 'account_locked' &&
        item.success === false,
    );

    if (match) {
      return match;
    }

    await delay(250);
  }

  throw new Error(
    `Account locked login log was not recorded for ${lockoutUsername}; latest rows=${formatBody(
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
        ...(options.headers || {}),
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

function assertIncludes(values, expected, label) {
  if (!values.includes(expected)) {
    throw new Error(
      `Expected ${label} to include ${JSON.stringify(
        expected,
      )}, received ${JSON.stringify(values)}`,
    );
  }
}

function offsetIsoDate(value, offsetMs, label) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    throw new Error(`Expected ${label} to be a valid ISO date-time string`);
  }

  return new Date(timestamp + offsetMs).toISOString();
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
