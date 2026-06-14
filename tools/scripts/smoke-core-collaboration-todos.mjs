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
    assertOpenApiPath(openApi, '/api/collaboration/todos');
    assertOpenApiPath(openApi, '/api/collaboration/todos/{id}');
    assertOpenApiPath(openApi, '/api/collaboration/todos/{id}/assign');
    assertOpenApiPath(openApi, '/api/collaboration/todos/{id}/complete');
    assertOpenApiPath(openApi, '/api/collaboration/todos/{id}/cancel');
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');

  const pendingTodos = await apiRequest(
    '/collaboration/todos?status=pending&assignee=admin',
  );
  assertPageContainsId(
    pendingTodos,
    'todo_review_openforge',
    'seeded pending todos',
  );

  const seededDetail = await apiRequest(
    '/collaboration/todos/todo_review_openforge',
  );
  assertEqual(seededDetail.id, 'todo_review_openforge', 'seeded todo id');
  assertEqual(seededDetail.status, 'pending', 'seeded todo status');

  const created = await apiRequest('/collaboration/todos', {
    method: 'POST',
    body: {
      actor: username,
      assignee: 'admin',
      businessId: runId,
      businessType: 'smoke',
      description: 'Collaboration todos smoke description.',
      sourceType: 'manual',
      title: `Smoke todo ${runId}`,
    },
  });
  const createdTodoId = assertString(created.id, 'created todo id');
  assertEqual(created.status, 'pending', 'created todo status');
  assertEqual(created.assignee, 'admin', 'created todo assignee');
  assertEqual(created.businessId, runId, 'created todo business id');
  assertTimelineAction(created, 'created', 'created todo timeline');

  const listedCreated = await apiRequest(
    '/collaboration/todos?status=pending&assignee=admin',
  );
  assertPageContainsId(listedCreated, createdTodoId, 'created pending todos');

  const detail = await apiRequest(
    `/collaboration/todos/${encodeURIComponent(createdTodoId)}`,
  );
  assertEqual(detail.id, createdTodoId, 'created todo detail id');

  const assigned = await apiRequest(
    `/collaboration/todos/${encodeURIComponent(createdTodoId)}/assign`,
    {
      method: 'PATCH',
      body: {
        actor: username,
        assignee: 'ops',
      },
    },
  );
  assertEqual(assigned.status, 'assigned', 'assigned todo status');
  assertEqual(assigned.assignee, 'ops', 'assigned todo assignee');
  assertTimelineAction(assigned, 'assigned', 'assigned todo timeline');

  const completed = await apiRequest(
    `/collaboration/todos/${encodeURIComponent(createdTodoId)}/complete`,
    {
      method: 'PATCH',
      body: { actor: 'ops' },
    },
  );
  assertEqual(completed.status, 'completed', 'completed todo status');
  assertString(completed.completedAt, 'completed todo completedAt');
  assertTimelineAction(completed, 'completed', 'completed todo timeline');

  await apiRequest(
    `/collaboration/todos/${encodeURIComponent(createdTodoId)}/assign`,
    {
      method: 'PATCH',
      body: {
        actor: username,
        assignee: 'admin',
      },
      expected: [400],
    },
  );

  await apiRequest(
    `/collaboration/todos/${encodeURIComponent(createdTodoId)}/cancel`,
    {
      method: 'PATCH',
      body: { actor: username },
      expected: [400],
    },
  );

  const cancelTarget = await apiRequest('/collaboration/todos', {
    method: 'POST',
    body: {
      actor: username,
      assignee: 'admin',
      businessId: `${runId}_cancel`,
      businessType: 'smoke',
      description: 'Collaboration todos cancel smoke description.',
      sourceType: 'manual',
      title: `Smoke cancel todo ${runId}`,
    },
  });
  const cancelTodoId = assertString(cancelTarget.id, 'cancel todo id');

  const canceled = await apiRequest(
    `/collaboration/todos/${encodeURIComponent(cancelTodoId)}/cancel`,
    {
      method: 'PATCH',
      body: { actor: username },
    },
  );
  assertEqual(canceled.status, 'canceled', 'canceled todo status');
  assertString(canceled.canceledAt, 'canceled todo canceledAt');
  assertTimelineAction(canceled, 'canceled', 'canceled todo timeline');

  const listedCanceled = await apiRequest(
    '/collaboration/todos?status=canceled',
  );
  assertPageContainsId(listedCanceled, cancelTodoId, 'canceled todos');

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
              'openapi.collaboration-todo-list-path',
              'openapi.collaboration-todo-detail-path',
              'openapi.collaboration-todo-assign-path',
              'openapi.collaboration-todo-complete-path',
              'openapi.collaboration-todo-cancel-path',
            ]
          : []),
        'auth.login',
        'collaboration.todos.seeded-list-detail',
        'collaboration.todos.create',
        'collaboration.todos.list-filter',
        'collaboration.todos.detail',
        'collaboration.todos.assign',
        'collaboration.todos.complete',
        'collaboration.todos.terminal-assign-guard',
        'collaboration.todos.terminal-cancel-guard',
        'collaboration.todos.cancel',
        'collaboration.todos.canceled-list',
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

function assertTimelineAction(todo, action, label) {
  assertArray(todo.timeline, label);
  if (!todo.timeline.some((entry) => entry.action === action)) {
    throw new Error(`${label} must include ${action}`);
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
