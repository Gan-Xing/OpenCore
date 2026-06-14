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
    assertOpenApiPath(openApi, '/api/collaboration/notices');
    assertOpenApiPath(openApi, '/api/collaboration/notices/{id}');
    assertOpenApiPath(openApi, '/api/collaboration/notices/{id}/publish');
    assertOpenApiPath(openApi, '/api/collaboration/notices/{id}/archive');
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');

  const draftNotices = await apiRequest('/collaboration/notices?status=draft');
  assertPageContainsId(
    draftNotices,
    'notice_release_window',
    'seeded draft notices',
  );

  const seededDetail = await apiRequest(
    '/collaboration/notices/notice_release_window',
  );
  assertEqual(seededDetail.id, 'notice_release_window', 'seeded notice id');
  assertEqual(seededDetail.status, 'draft', 'seeded notice status');

  const created = await apiRequest('/collaboration/notices', {
    method: 'POST',
    body: {
      title: `Smoke notice ${runId}`,
      body: 'Collaboration notices smoke body.',
      targetAudience: ['admin', 'ops'],
      createdBy: username,
    },
  });
  const createdNoticeId = assertString(created.id, 'created notice id');
  assertEqual(created.status, 'draft', 'created notice status');
  assertArray(created.targetAudience, 'created notice target audience');
  assertEqual(
    created.targetAudience.length,
    2,
    'created notice audience count',
  );

  const listedCreated = await apiRequest('/collaboration/notices?status=draft');
  assertPageContainsId(listedCreated, createdNoticeId, 'created draft notices');

  const detail = await apiRequest(
    `/collaboration/notices/${encodeURIComponent(createdNoticeId)}`,
  );
  assertEqual(detail.id, createdNoticeId, 'created notice detail id');

  const published = await apiRequest(
    `/collaboration/notices/${encodeURIComponent(createdNoticeId)}/publish`,
    { method: 'PATCH' },
  );
  assertEqual(published.status, 'published', 'published notice status');
  assertString(published.publishedAt, 'published notice publishedAt');

  await apiRequest(
    `/collaboration/notices/${encodeURIComponent(createdNoticeId)}/publish`,
    { method: 'PATCH', expected: [400] },
  );

  const archived = await apiRequest(
    `/collaboration/notices/${encodeURIComponent(createdNoticeId)}/archive`,
    { method: 'PATCH' },
  );
  assertEqual(archived.status, 'archived', 'archived notice status');
  assertString(archived.archivedAt, 'archived notice archivedAt');

  await apiRequest(
    `/collaboration/notices/${encodeURIComponent(createdNoticeId)}/archive`,
    { method: 'PATCH', expected: [400] },
  );

  const listedArchived = await apiRequest(
    '/collaboration/notices?status=archived',
  );
  assertPageContainsId(listedArchived, createdNoticeId, 'archived notices');

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
              'openapi.collaboration-notice-list-path',
              'openapi.collaboration-notice-detail-path',
              'openapi.collaboration-notice-publish-path',
              'openapi.collaboration-notice-archive-path',
            ]
          : []),
        'auth.login',
        'collaboration.notices.seeded-list-detail',
        'collaboration.notices.create',
        'collaboration.notices.list-filter',
        'collaboration.notices.detail',
        'collaboration.notices.publish',
        'collaboration.notices.repeat-publish-guard',
        'collaboration.notices.archive',
        'collaboration.notices.repeat-archive-guard',
        'collaboration.notices.archived-list',
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
