#!/usr/bin/env node

import {
  assertArray,
  assertEqual,
  assertOpenApiPath,
  assertString,
  createSmokeRuntime,
} from './smoke-helpers.mjs';

const smoke = createSmokeRuntime();
const { apiPrefix, apiRequest, baseUrl, checkDocs, login, request, username } =
  smoke;
const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let token;

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
  smoke.setToken(token);

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
