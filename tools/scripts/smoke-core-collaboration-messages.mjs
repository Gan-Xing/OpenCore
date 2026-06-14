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
const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let token;
let createdMessageId;

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
    const openApi = await request(`${apiPrefix}/docs-json`, {
      expected: [200],
    });
    assertOpenApiPath(openApi, '/api/collaboration/summary');
    assertOpenApiPath(openApi, '/api/collaboration/messages');
    assertOpenApiPath(openApi, '/api/collaboration/messages/{id}');
    assertOpenApiPath(openApi, '/api/collaboration/messages/{id}/read');
    assertOpenApiPath(openApi, '/api/collaboration/messages/{id}/archive');
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');

  const summary = await apiRequest('/collaboration/summary');
  assertNumberAtLeast(summary.messages.total, 1, 'seeded message total');
  assertNumberAtLeast(summary.messages.unread, 1, 'seeded unread messages');

  const seededMessages = await apiRequest(
    '/collaboration/messages?recipient=admin&status=unread',
  );
  assertPageContainsId(
    seededMessages,
    'msg_welcome_admin',
    'seeded admin unread messages',
  );

  const seededDetail = await apiRequest(
    '/collaboration/messages/msg_welcome_admin',
  );
  assertEqual(seededDetail.id, 'msg_welcome_admin', 'seeded message detail id');
  assertEqual(seededDetail.status, 'unread', 'seeded message status');

  const created = await apiRequest('/collaboration/messages', {
    method: 'POST',
    body: {
      title: `Smoke message ${runId}`,
      body: 'Collaboration messages smoke body.',
      sender: username,
      recipient: 'ops',
      businessType: 'smoke',
      businessId: runId,
    },
  });
  createdMessageId = assertString(created.id, 'created message id');
  assertEqual(created.status, 'unread', 'created message status');
  assertEqual(created.businessId, runId, 'created message business id');

  const listedCreated = await apiRequest(
    '/collaboration/messages?recipient=ops&status=unread',
  );
  assertPageContainsId(
    listedCreated,
    createdMessageId,
    'created unread messages',
  );

  const detail = await apiRequest(
    `/collaboration/messages/${encodeURIComponent(createdMessageId)}`,
  );
  assertEqual(detail.id, createdMessageId, 'created message detail id');

  const read = await apiRequest(
    `/collaboration/messages/${encodeURIComponent(createdMessageId)}/read`,
    { method: 'PATCH' },
  );
  assertEqual(read.status, 'read', 'read message status');
  assertString(read.readAt, 'read message readAt');

  const repeatedRead = await apiRequest(
    `/collaboration/messages/${encodeURIComponent(createdMessageId)}/read`,
    { method: 'PATCH' },
  );
  assertEqual(repeatedRead.status, 'read', 'repeat read message status');
  assertString(repeatedRead.readAt, 'repeat read message readAt');

  const archived = await apiRequest(
    `/collaboration/messages/${encodeURIComponent(createdMessageId)}/archive`,
    { method: 'PATCH' },
  );
  assertEqual(archived.status, 'archived', 'archived message status');
  assertString(archived.archivedAt, 'archived message archivedAt');

  const listedArchived = await apiRequest(
    '/collaboration/messages?recipient=ops&status=archived',
  );
  assertPageContainsId(listedArchived, createdMessageId, 'archived messages');

  await apiRequest(
    `/collaboration/messages/${encodeURIComponent(createdMessageId)}`,
    {
      method: 'DELETE',
    },
  );
  await apiRequest(
    `/collaboration/messages/${encodeURIComponent(createdMessageId)}`,
    {
      expected: [404],
    },
  );
  const postDeleteList = await apiRequest(
    '/collaboration/messages?recipient=ops',
  );
  assertPageExcludesId(
    postDeleteList,
    createdMessageId,
    'post-delete message list',
  );
  createdMessageId = undefined;

  console.log(
    JSON.stringify({
      status: 'pass',
      baseUrl,
      apiPrefix,
      checks: [
        'health.live',
        'health.ready',
        ...(checkDocs
          ? [
              'openapi.collaboration-summary-path',
              'openapi.collaboration-message-list-path',
              'openapi.collaboration-message-detail-path',
              'openapi.collaboration-message-read-path',
              'openapi.collaboration-message-archive-path',
            ]
          : []),
        'auth.login',
        'collaboration.summary.seeded',
        'collaboration.messages.seeded-list-detail',
        'collaboration.messages.create',
        'collaboration.messages.list-filter',
        'collaboration.messages.detail',
        'collaboration.messages.mark-read',
        'collaboration.messages.idempotent-read',
        'collaboration.messages.archive',
        'collaboration.messages.delete',
        'collaboration.messages.deleted-hidden',
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
} finally {
  await cleanupCreatedMessage();
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
        body: { username, password },
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

async function cleanupCreatedMessage() {
  if (!token || !createdMessageId) {
    return;
  }

  await apiRequest(
    `/collaboration/messages/${encodeURIComponent(createdMessageId)}`,
    {
      method: 'DELETE',
      expected: [200, 400, 404],
    },
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

function assertOpenApiPath(openApi, path) {
  if (!openApi?.paths?.[path]) {
    throw new Error(`OpenAPI path missing: ${path}`);
  }
}

function assertPageContainsId(page, id, label) {
  assertArray(page.items, `${label} items`);
  if (!page.items.some((item) => item.id === id)) {
    throw new Error(`${label} must contain ${id}`);
  }
}

function assertPageExcludesId(page, id, label) {
  assertArray(page.items, `${label} items`);
  if (page.items.some((item) => item.id === id)) {
    throw new Error(`${label} must not contain ${id}`);
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

function assertNumberAtLeast(value, min, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) {
    throw new Error(`${label} must be at least ${min}`);
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

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return trimTrailingSlash(withLeadingSlash);
}

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  if (value === 'true' || value === '1') {
    return true;
  }

  if (value === 'false' || value === '0') {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
}
