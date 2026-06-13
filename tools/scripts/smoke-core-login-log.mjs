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
const logoutUsername = `opencore-smoke-logout-${runId}`;
const lockoutUsername = `opencore-smoke-lockout-${runId}`;
const postCleanUsername = `opencore-smoke-login-clean-${runId}`;
const logoutPassword = `Logout-${runId}-A1`;
const lockoutPassword = `Lockout-${runId}-A1`;
const smokeLoginMaxFailedAttempts = 3;
const failedLoginUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const logoutUserAgent = `OpenCoreSmokeLogout/${runId}`;
let token;
let logoutUserId;
let lockoutUserId;
let originalLoginMaxFailedAttempts;
let loginMaxFailedAttemptsMutated = false;

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

  const createdLogoutUser = await apiRequest('/core/users', {
    method: 'POST',
    body: {
      username: logoutUsername,
      displayName: 'Smoke Logout User',
      password: logoutPassword,
      roleCodes: [],
      enabled: true,
    },
  });
  logoutUserId = assertString(
    createdLogoutUser.id,
    'created logout smoke user id',
  );

  const logoutLoginResponse = await request(`${apiPrefix}/auth/login`, {
    method: 'POST',
    expected: [200, 201],
    headers: {
      'user-agent': logoutUserAgent,
    },
    body: {
      username: logoutUsername,
      password: logoutPassword,
    },
  });
  const logoutToken = assertString(
    logoutLoginResponse.accessToken,
    'logout smoke accessToken',
  );
  const logoutResult = await request(`${apiPrefix}/auth/logout`, {
    method: 'POST',
    token: logoutToken,
    headers: {
      'user-agent': logoutUserAgent,
    },
  });
  assertEqual(logoutResult.loggedOut, true, 'self logout result');
  await request(`${apiPrefix}/auth/me`, {
    token: logoutToken,
    expected: [401, 403],
  });

  const logoutLog = await waitForLoginLog({
    label: 'self logout',
    logType: 'logout.self',
    result: 'success',
    success: true,
    username: logoutUsername,
  });
  assertEqual(logoutLog.username, logoutUsername, 'self logout username');
  assertEqual(logoutLog.logType, 'logout.self', 'self logout log type');
  assertEqual(logoutLog.result, 'success', 'self logout result');
  assertEqual(logoutLog.success, true, 'self logout success flag');

  await apiRequest(`/core/users/${encodeURIComponent(logoutUserId)}`, {
    method: 'DELETE',
  });
  logoutUserId = undefined;

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

  await apiRequest('/core/login-logs/batch', {
    method: 'DELETE',
    expected: [400],
    body: { ids: [] },
  });
  await apiRequest('/core/login-logs/batch', {
    method: 'DELETE',
    expected: [400],
    body: { ids: [failedLog.id, failedLog.id] },
  });

  const missingLoginLogId = `missing-login-log-${runId}`;
  await apiRequest('/core/login-logs/batch', {
    method: 'DELETE',
    expected: [404],
    body: { ids: [failedLog.id, missingLoginLogId] },
  });

  const stillPresentAfterMissingDelete = await apiRequest(
    `/core/login-logs/${encodeURIComponent(failedLog.id)}`,
  );
  assertEqual(
    stillPresentAfterMissingDelete.id,
    failedLog.id,
    'batch delete missing id leaves existing login log',
  );

  const deleteResult = await apiRequest('/core/login-logs/batch', {
    method: 'DELETE',
    body: { ids: [failedLog.id] },
  });
  assertEqual(
    deleteResult.deleted,
    true,
    'batch delete login log deleted flag',
  );
  assertEqual(deleteResult.affected, 1, 'batch delete login log affected');
  assertArray(deleteResult.ids, 'batch delete login log ids');
  assertEqual(deleteResult.ids.length, 1, 'batch delete login log id count');
  assertEqual(deleteResult.ids[0], failedLog.id, 'batch delete login log id');
  await apiRequest(`/core/login-logs/${encodeURIComponent(failedLog.id)}`, {
    expected: [404],
  });

  const seededLoginMaxAttemptsConfig = await apiRequest(
    '/core/config/auth.login.maxFailedAttempts',
  );
  originalLoginMaxFailedAttempts = assertString(
    seededLoginMaxAttemptsConfig.value,
    'seeded login max failed attempts value',
  );
  assertEqual(
    seededLoginMaxAttemptsConfig.valueType,
    'number',
    'seeded login max failed attempts value type',
  );
  assertEqual(
    seededLoginMaxAttemptsConfig.visibility,
    'public',
    'seeded login max failed attempts visibility',
  );
  const updatedLoginMaxAttemptsConfig = await apiRequest(
    '/core/config/auth.login.maxFailedAttempts',
    {
      method: 'PATCH',
      body: { value: String(smokeLoginMaxFailedAttempts) },
    },
  );
  loginMaxFailedAttemptsMutated = true;
  assertEqual(
    updatedLoginMaxAttemptsConfig.value,
    String(smokeLoginMaxFailedAttempts),
    'updated login max failed attempts config value',
  );
  const updatedRuntimePolicy = await request(
    `${apiPrefix}/core/config/runtime`,
  );
  assertEqual(
    updatedRuntimePolicy.loginMaxFailedAttempts,
    smokeLoginMaxFailedAttempts,
    'runtime login max failed attempts after update',
  );

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

  for (let attempt = 0; attempt < smokeLoginMaxFailedAttempts; attempt += 1) {
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
    smokeLoginMaxFailedAttempts,
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
  await restoreLoginMaxFailedAttempts();

  const cleanResult = await apiRequest('/core/login-logs/clean', {
    method: 'DELETE',
  });
  assertEqual(cleanResult.deleted, true, 'clean login logs deleted flag');
  assertNumberAtLeast(cleanResult.affected, 1, 'clean login logs affected');

  const cleanedPage = await apiRequest('/core/login-logs?page=1&pageSize=10');
  assertArray(cleanedPage.items, 'cleaned login log list items');
  assertEqual(cleanedPage.total, 0, 'cleaned login log total');
  assertEqual(cleanedPage.items.length, 0, 'cleaned login log item count');

  await request(`${apiPrefix}/auth/login`, {
    method: 'POST',
    expected: [401, 403],
    body: {
      username: postCleanUsername,
      password: 'not-the-smoke-password',
    },
  });

  const postCleanFailedLog = await waitForLoginLog({
    label: 'post-clean failed login',
    result: 'bad_credentials',
    success: false,
    username: postCleanUsername,
  });
  assertEqual(
    postCleanFailedLog.username,
    postCleanUsername,
    'post-clean failed login username',
  );
  assertEqual(
    postCleanFailedLog.result,
    'bad_credentials',
    'post-clean failed login result',
  );
  assertEqual(
    postCleanFailedLog.success,
    false,
    'post-clean failed login success flag',
  );

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
        'auth.logout.self',
        'auth.logout.revokes-session',
        'core.login-log.logout-self-recorded',
        'auth.failed-login-recorded',
        'core.login-log.list',
        'core.login-log.server-filters',
        'core.login-log.result-schema',
        'core.login-log.invalid-result-guard',
        'core.login-log.invalid-time-range-guard',
        'core.login-log.detail',
        'core.login-log.device-fields',
        'core.login-log.export',
        'core.login-log.batch-delete-empty-guard',
        'core.login-log.batch-delete-duplicate-guard',
        'core.login-log.batch-delete-missing-no-partial',
        'core.login-log.batch-delete',
        'core.login-log.batch-delete-detail-404',
        'core.login-log.unlock-empty',
        'auth.login-lockout.enforced',
        'auth.login-lockout.configurable-attempt-limit',
        'core.login-log.account-locked-filter',
        'core.login-log.unlock-restores-login',
        'core.login-log.clean-all',
        'core.login-log.clean-all-list-empty',
        'auth.post-clean-failed-login-recorded',
      ],
    }),
  );
} catch (error) {
  await cleanupSmokeUser(logoutUserId).catch(() => undefined);
  await cleanupSmokeUser(lockoutUserId).catch(() => undefined);
  await restoreLoginMaxFailedAttempts().catch(() => undefined);
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

async function restoreLoginMaxFailedAttempts() {
  if (
    !token ||
    !loginMaxFailedAttemptsMutated ||
    originalLoginMaxFailedAttempts === undefined
  ) {
    return;
  }

  await apiRequest('/core/config/auth.login.maxFailedAttempts', {
    method: 'PATCH',
    body: {
      value: originalLoginMaxFailedAttempts,
    },
  });
  loginMaxFailedAttemptsMutated = false;
}

async function cleanupSmokeUser(userId) {
  if (!token || !userId) {
    return;
  }

  await apiRequest(`/core/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
}

async function waitForFailedLoginLog() {
  return waitForLoginLog({
    label: 'failed login',
    result: 'bad_credentials',
    success: false,
    username: failedUsername,
  });
}

async function waitForAccountLockedLoginLog() {
  return waitForLoginLog({
    label: 'account locked',
    result: 'account_locked',
    success: false,
    username: lockoutUsername,
  });
}

async function waitForLoginLog({
  label,
  logType = 'login.username',
  result,
  success,
  username,
}) {
  let lastItems = [];

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const page = await apiRequest(
      `/core/login-logs?page=1&pageSize=10&username=${encodeURIComponent(
        username,
      )}&logType=${encodeURIComponent(logType)}&result=${encodeURIComponent(
        result,
      )}&success=${encodeURIComponent(String(success))}`,
    );
    assertArray(page.items, `filtered ${label} login log items`);
    lastItems = page.items;

    const match = page.items.find(
      (item) =>
        item.username === username &&
        item.logType === logType &&
        item.result === result &&
        item.success === success,
    );

    if (match) {
      return match;
    }

    await delay(250);
  }

  throw new Error(
    `${label} login log was not recorded for ${username}; latest rows=${formatBody(
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

function assertNumberAtLeast(value, minimum, label) {
  if (typeof value !== 'number' || value < minimum) {
    throw new Error(
      `Expected ${label} to be a number >= ${minimum}, received ${JSON.stringify(
        value,
      )}`,
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
