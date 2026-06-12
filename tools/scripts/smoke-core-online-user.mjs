#!/usr/bin/env node

const DEFAULT_PORT = '39173';
const TARGET_SESSION_ID = 'session_operator';

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

let token;
let kickedDuringRun = false;

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

  const page = await apiRequest('/monitor/online-users?page=1&pageSize=20');
  assertArray(page.items, 'online user list items');

  const adminActivePage = await apiRequest(
    '/monitor/online-users?page=1&pageSize=20&active=true&username=admin',
  );
  assertArray(adminActivePage.items, 'active admin session items');
  const adminSession = adminActivePage.items.find(
    (session) => session.id === 'session_admin' && !session.revokedAt,
  );
  if (!adminSession) {
    throw new Error('Expected seeded admin online session to remain active');
  }

  const targetBefore = await apiRequest(
    `/monitor/online-users/${encodeURIComponent(TARGET_SESSION_ID)}`,
  );
  assertEqual(targetBefore.username, 'operator', 'target online user username');

  if (!targetBefore.revokedAt) {
    const activeOperatorPage = await apiRequest(
      '/monitor/online-users?page=1&pageSize=20&active=true&username=operator',
    );
    assertArray(activeOperatorPage.items, 'active operator session items');
    if (
      !activeOperatorPage.items.some(
        (session) => session.id === TARGET_SESSION_ID && !session.revokedAt,
      )
    ) {
      throw new Error('Expected operator session before kick-out');
    }

    const kicked = await apiRequest(
      `/monitor/online-users/${encodeURIComponent(TARGET_SESSION_ID)}/kick-out`,
      {
        method: 'POST',
        body: {
          actor: username,
          reason: 'OpenCore online-user smoke kick-out',
        },
      },
    );
    kickedDuringRun = true;
    assertEqual(kicked.id, TARGET_SESSION_ID, 'kicked session id');
    assertString(kicked.revokedAt, 'kicked revokedAt');
    assertEqual(kicked.revokedBy, username, 'kicked revokedBy');
    assertEqual(
      kicked.revokedReason,
      'OpenCore online-user smoke kick-out',
      'kicked revokedReason',
    );
  }

  const targetAfter = await apiRequest(
    `/monitor/online-users/${encodeURIComponent(TARGET_SESSION_ID)}`,
  );
  assertString(targetAfter.revokedAt, 'detail revokedAt');

  await apiRequest(
    `/monitor/online-users/${encodeURIComponent(TARGET_SESSION_ID)}/kick-out`,
    {
      method: 'POST',
      expected: [400],
      body: {
        actor: username,
        reason: 'repeat smoke kick-out',
      },
    },
  );

  const revokedOperatorPage = await apiRequest(
    '/monitor/online-users?page=1&pageSize=20&active=false&username=operator',
  );
  assertArray(revokedOperatorPage.items, 'revoked operator session items');
  if (
    !revokedOperatorPage.items.some(
      (session) => session.id === TARGET_SESSION_ID && session.revokedAt,
    )
  ) {
    throw new Error('Expected revoked operator session after kick-out');
  }

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
        'monitor.online-user.list',
        'monitor.online-user.detail',
        kickedDuringRun
          ? 'monitor.online-user.kick-out'
          : 'monitor.online-user.already-revoked',
        'monitor.online-user.repeat-kick-blocked',
        'monitor.online-user.admin-session-preserved',
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

function formatBody(body) {
  if (typeof body === 'string') {
    return body.slice(0, 500);
  }

  return JSON.stringify(body).slice(0, 500);
}
