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
const noticeTitles = [
  `OpenCore Smoke Notice ${runId}`,
  `OpenCore Smoke Notice Mark All ${runId}`,
];
let token;
const createdNoticeIds = [];

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

  await request(`${apiPrefix}/core/notices/inbox`, { expected: [401] });

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');

  await apiRequest('/core/notices/inbox?readStatus=not-boolean', {
    expected: [400],
  });
  await apiRequest('/core/notices/inbox/read', {
    method: 'POST',
    expected: [400],
    body: { ids: [] },
  });
  await apiRequest('/core/notices/inbox/read', {
    method: 'POST',
    expected: [400],
    body: { ids: ['notice_welcome', 'notice_welcome'] },
  });

  const draftNotice = await createNotice(noticeTitles[0]);
  await apiRequest(
    `/core/notices/inbox/${encodeURIComponent(draftNotice.id)}`,
    {
      expected: [404],
    },
  );
  await apiRequest('/core/notices/inbox/read', {
    method: 'POST',
    expected: [404],
    body: { ids: [draftNotice.id] },
  });

  const publishedNotice = await apiRequest(
    `/core/notices/${encodeURIComponent(draftNotice.id)}/publish`,
    {
      method: 'PATCH',
    },
  );
  assertEqual(publishedNotice.status, 'published', 'published notice status');

  const inboxItem = await apiRequest(
    `/core/notices/inbox/${encodeURIComponent(draftNotice.id)}`,
  );
  assertEqual(inboxItem.id, draftNotice.id, 'inbox item id');
  assertEqual(inboxItem.read, false, 'new inbox item read state');
  assertEqual(inboxItem.readAt, undefined, 'new inbox item readAt');

  const unreadPage = await apiRequest('/core/notices/inbox?readStatus=false');
  assertPageItemsContain(unreadPage, draftNotice.id, 'unread inbox page');
  const unreadList = await apiRequest(
    '/core/notices/inbox/unread-list?limit=10',
  );
  assertArray(unreadList, 'unread notice list');
  assertItemsContain(unreadList, draftNotice.id, 'unread notice list');
  const unreadCount = await apiRequest('/core/notices/inbox/unread-count');
  assertNumberAtLeast(unreadCount.unreadCount, 1, 'unread count');

  await apiRequest('/core/notices/inbox/read', {
    method: 'POST',
    expected: [404],
    body: { ids: [draftNotice.id, `missing_${draftNotice.id}`] },
  });

  const readResult = await apiRequest('/core/notices/inbox/read', {
    method: 'POST',
    body: { ids: [draftNotice.id] },
  });
  assertEqual(readResult.markedReadCount, 1, 'first read mutation count');
  assertArrayIncludes(readResult.ids, draftNotice.id, 'first read mutation id');

  const rereadResult = await apiRequest('/core/notices/inbox/read', {
    method: 'POST',
    body: { ids: [draftNotice.id] },
  });
  assertEqual(rereadResult.markedReadCount, 0, 'repeat read mutation count');

  const readItem = await apiRequest(
    `/core/notices/inbox/${encodeURIComponent(draftNotice.id)}`,
  );
  assertEqual(readItem.read, true, 'read inbox item state');
  assertString(readItem.readAt, 'read inbox item readAt');
  const readPage = await apiRequest('/core/notices/inbox?readStatus=true');
  assertPageItemsContain(readPage, draftNotice.id, 'read inbox page');
  assertItemsExclude(
    await apiRequest('/core/notices/inbox/unread-list?limit=10'),
    draftNotice.id,
    'unread list after mark read',
  );

  const markAllNotice = await createNotice(noticeTitles[1]);
  await apiRequest(
    `/core/notices/${encodeURIComponent(markAllNotice.id)}/publish`,
    {
      method: 'PATCH',
    },
  );
  assertEqual(
    (
      await apiRequest(
        `/core/notices/inbox/${encodeURIComponent(markAllNotice.id)}`,
      )
    ).read,
    false,
    'mark-all setup read state',
  );
  const markAllResult = await apiRequest('/core/notices/inbox/read-all', {
    method: 'POST',
  });
  assertArrayIncludes(
    markAllResult.ids,
    markAllNotice.id,
    'mark-all mutation ids',
  );
  assertEqual(markAllResult.unreadCount, 0, 'mark-all unread count');

  await cleanupCreatedNotices();

  console.log(
    JSON.stringify({
      status: 'pass',
      baseUrl,
      apiPrefix,
      checks: [
        'health.live',
        'health.ready',
        ...(checkDocs ? ['openapi.docs-json'] : []),
        'core.notice.inbox.auth-required',
        'auth.login',
        'core.notice.inbox.bad-read-status-guard',
        'core.notice.inbox.empty-read-ids-guard',
        'core.notice.inbox.duplicate-read-ids-guard',
        'core.notice.inbox.draft-hidden',
        'core.notice.inbox.mark-draft-hidden-guard',
        'core.notice.publish',
        'core.notice.inbox.unread-item',
        'core.notice.inbox.unread-page',
        'core.notice.inbox.unread-list',
        'core.notice.inbox.unread-count',
        'core.notice.inbox.missing-read-id-guard',
        'core.notice.inbox.mark-read',
        'core.notice.inbox.repeat-read-idempotent',
        'core.notice.inbox.read-page',
        'core.notice.inbox.unread-list-after-read',
        'core.notice.inbox.mark-all-read',
        'core.notice.cleanup',
      ],
    }),
  );
} catch (error) {
  await cleanupCreatedNotices().catch(() => undefined);
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

async function createNotice(title) {
  const notice = await apiRequest('/core/notices', {
    method: 'POST',
    body: {
      title,
      content: `Smoke notice content for ${runId}`,
      type: 'announcement',
      audience: 'admin',
      createdBy: username,
    },
  });
  createdNoticeIds.push(assertString(notice.id, 'created notice id'));
  assertEqual(notice.status, 'draft', 'created notice status');
  return notice;
}

async function cleanupCreatedNotices() {
  while (createdNoticeIds.length > 0) {
    const id = createdNoticeIds.pop();
    await apiRequest(`/core/notices/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      expected: [200, 404],
    }).catch(() => undefined);
  }
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

async function apiRequest(path, options = {}) {
  return request(`${apiPrefix}${path}`, {
    ...options,
    token,
  });
}

async function request(pathOrUrl, options = {}) {
  const url = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${baseUrl}${pathOrUrl}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
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
    const expected = options.expected || [200, 201];

    if (!expected.includes(response.status)) {
      throw new HttpStatusError(
        `${options.method || 'GET'} ${url} returned ${response.status}: ${formatResponseBody(responseBody)}`,
        response.status,
      );
    }

    return responseBody;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${options.method || 'GET'} ${url} timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function assertPageItemsContain(page, id, label) {
  assertArray(page.items, `${label} items`);
  assertItemsContain(page.items, id, label);
}

function assertItemsContain(items, id, label) {
  if (!items.some((item) => item?.id === id)) {
    throw new Error(`${label} must include ${id}`);
  }
}

function assertItemsExclude(items, id, label) {
  if (items.some((item) => item?.id === id)) {
    throw new Error(`${label} must not include ${id}`);
  }
}

function assertArrayIncludes(values, expected, label) {
  assertArray(values, label);
  if (!values.includes(expected)) {
    throw new Error(`${label} must include ${expected}`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function assertNumberAtLeast(value, min, label) {
  if (typeof value !== 'number' || value < min) {
    throw new Error(`${label}: expected at least ${min}, received ${value}`);
  }
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function normalizeApiPrefix(value) {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
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

function formatResponseBody(body) {
  if (typeof body === 'string') {
    return body.slice(0, 500);
  }
  return JSON.stringify(body).slice(0, 500);
}
