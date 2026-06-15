import { disconnectSmokePrisma, getSmokePrisma } from './prisma';
import {
  assertArray,
  assertEqual,
  assertOpenApiPath,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request, username } = smoke;
const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

async function main() {
  const createdTodoIds: string[] = [];

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

    const loginResponse = await smoke.login();
    const token = assertString(loginResponse.accessToken, 'login accessToken');

    const pendingTodos = await clients.collaboration.listTodos(token, {
      assignee: 'admin',
      status: 'pending',
    });
    assertPageContainsId(
      pendingTodos,
      'todo_review_openforge',
      'seeded pending todos',
    );

    const seededDetail = await clients.collaboration.getTodo(
      token,
      'todo_review_openforge',
    );
    assertEqual(seededDetail.id, 'todo_review_openforge', 'seeded todo id');
    assertEqual(seededDetail.status, 'pending', 'seeded todo status');

    const created = await clients.collaboration.createTodo(token, {
      actor: username,
      assignee: 'admin',
      businessId: runId,
      businessType: 'smoke',
      description: 'Collaboration todos smoke description.',
      sourceType: 'manual',
      title: `Smoke todo ${runId}`,
    });
    const createdTodoId = assertString(created.id, 'created todo id');
    createdTodoIds.push(createdTodoId);
    assertEqual(created.status, 'pending', 'created todo status');
    assertEqual(created.assignee, 'admin', 'created todo assignee');
    assertEqual(created.businessId, runId, 'created todo business id');
    assertTimelineAction(created, 'created', 'created todo timeline');

    const listedCreated = await clients.collaboration.listTodos(token, {
      assignee: 'admin',
      status: 'pending',
    });
    assertPageContainsId(listedCreated, createdTodoId, 'created pending todos');

    const detail = await clients.collaboration.getTodo(token, createdTodoId);
    assertEqual(detail.id, createdTodoId, 'created todo detail id');

    const assigned = await clients.collaboration.assignTodo(
      token,
      createdTodoId,
      {
        actor: username,
        assignee: 'ops',
      },
    );
    assertEqual(assigned.status, 'assigned', 'assigned todo status');
    assertEqual(assigned.assignee, 'ops', 'assigned todo assignee');
    assertTimelineAction(assigned, 'assigned', 'assigned todo timeline');

    const completed = await clients.collaboration.completeTodo(
      token,
      createdTodoId,
      { actor: 'ops' },
    );
    assertEqual(completed.status, 'completed', 'completed todo status');
    assertString(completed.completedAt, 'completed todo completedAt');
    assertTimelineAction(completed, 'completed', 'completed todo timeline');

    await smoke.apiRequest(
      `/collaboration/todos/${encodeURIComponent(createdTodoId)}/assign`,
      {
        body: {
          actor: username,
          assignee: 'admin',
        },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );

    await smoke.apiRequest(
      `/collaboration/todos/${encodeURIComponent(createdTodoId)}/cancel`,
      {
        body: { actor: username },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );

    const cancelTarget = await clients.collaboration.createTodo(token, {
      actor: username,
      assignee: 'admin',
      businessId: `${runId}_cancel`,
      businessType: 'smoke',
      description: 'Collaboration todos cancel smoke description.',
      sourceType: 'manual',
      title: `Smoke cancel todo ${runId}`,
    });
    const cancelTodoId = assertString(cancelTarget.id, 'cancel todo id');
    createdTodoIds.push(cancelTodoId);

    const canceled = await clients.collaboration.cancelTodo(
      token,
      cancelTodoId,
      {
        actor: username,
      },
    );
    assertEqual(canceled.status, 'canceled', 'canceled todo status');
    assertString(canceled.canceledAt, 'canceled todo canceledAt');
    assertTimelineAction(canceled, 'canceled', 'canceled todo timeline');

    const listedCanceled = await clients.collaboration.listTodos(token, {
      status: 'canceled',
    });
    assertPageContainsId(listedCanceled, cancelTodoId, 'canceled todos');

    await cleanupCreatedTodos(createdTodoIds);
    createdTodoIds.length = 0;

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
    await cleanupCreatedTodos(createdTodoIds);
    throw error;
  } finally {
    await disconnectSmokePrisma();
  }
}

async function cleanupCreatedTodos(ids: readonly string[]) {
  if (ids.length === 0) {
    return;
  }

  await getSmokePrisma().collaborationTodo.deleteMany({
    where: { id: { in: [...ids] } },
  });
}

function assertPageContainsId(
  page: { items: readonly { id: string }[] },
  id: string,
  label: string,
) {
  assertArray(page.items, `${label} items`);
  if (!page.items.some((item) => item.id === id)) {
    throw new Error(`${label} must contain ${id}`);
  }
}

function assertTimelineAction(
  item: { timeline: readonly { action: string }[] },
  action: string,
  label: string,
) {
  assertArray(item.timeline, label);
  if (!item.timeline.some((entry) => entry.action === action)) {
    throw new Error(`${label} must include ${action}`);
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      status: 'fail',
      baseUrl,
      apiPrefix,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});
