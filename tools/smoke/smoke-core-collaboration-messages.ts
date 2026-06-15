import {
  assertArray,
  assertEqual,
  assertNumberAtLeast,
  assertOpenApiPath,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request, username } = smoke;
const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let token: string | undefined;
let createdMessageId: string | undefined;

async function main() {
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

    const loginResponse = await smoke.login();
    token = assertString(loginResponse.accessToken, 'login accessToken');

    const summary = await clients.collaboration.getSummary(token);
    assertNumberAtLeast(summary.messages.total, 1, 'seeded message total');
    assertNumberAtLeast(summary.messages.unread, 1, 'seeded unread messages');

    const seededMessages = await clients.collaboration.listMessages(token, {
      recipient: 'admin',
      status: 'unread',
    });
    assertPageContainsId(
      seededMessages,
      'msg_welcome_admin',
      'seeded admin unread messages',
    );

    const seededDetail = await clients.collaboration.getMessage(
      token,
      'msg_welcome_admin',
    );
    assertEqual(
      seededDetail.id,
      'msg_welcome_admin',
      'seeded message detail id',
    );
    assertEqual(seededDetail.status, 'unread', 'seeded message status');

    const created = await clients.collaboration.createMessage(token, {
      body: 'Collaboration messages smoke body.',
      businessId: runId,
      businessType: 'smoke',
      recipient: 'ops',
      sender: username,
      title: `Smoke message ${runId}`,
    });
    createdMessageId = assertString(created.id, 'created message id');
    assertEqual(created.status, 'unread', 'created message status');
    assertEqual(created.businessId, runId, 'created message business id');

    const listedCreated = await clients.collaboration.listMessages(token, {
      recipient: 'ops',
      status: 'unread',
    });
    assertPageContainsId(
      listedCreated,
      createdMessageId,
      'created unread messages',
    );

    const detail = await clients.collaboration.getMessage(
      token,
      createdMessageId,
    );
    assertEqual(detail.id, createdMessageId, 'created message detail id');

    const read = await clients.collaboration.markMessageRead(
      token,
      createdMessageId,
    );
    assertEqual(read.status, 'read', 'read message status');
    assertString(read.readAt, 'read message readAt');

    const repeatedRead = await clients.collaboration.markMessageRead(
      token,
      createdMessageId,
    );
    assertEqual(repeatedRead.status, 'read', 'repeat read message status');
    assertString(repeatedRead.readAt, 'repeat read message readAt');

    const archived = await clients.collaboration.archiveMessage(
      token,
      createdMessageId,
    );
    assertEqual(archived.status, 'archived', 'archived message status');
    assertString(archived.archivedAt, 'archived message archivedAt');

    const listedArchived = await clients.collaboration.listMessages(token, {
      recipient: 'ops',
      status: 'archived',
    });
    assertPageContainsId(listedArchived, createdMessageId, 'archived messages');

    await clients.collaboration.deleteMessage(token, createdMessageId);
    await smoke.apiRequest(
      `/collaboration/messages/${encodeURIComponent(createdMessageId)}`,
      {
        expected: [404],
        token,
      },
    );
    const postDeleteList = await clients.collaboration.listMessages(token, {
      recipient: 'ops',
    });
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
  } finally {
    await cleanupCreatedMessage();
  }
}

async function cleanupCreatedMessage() {
  if (!token || !createdMessageId) {
    return;
  }

  await smoke.apiRequest(
    `/collaboration/messages/${encodeURIComponent(createdMessageId)}`,
    {
      expected: [200, 400, 404],
      method: 'DELETE',
      token,
    },
  );
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

function assertPageExcludesId(
  page: { items: readonly { id: string }[] },
  id: string,
  label: string,
) {
  assertArray(page.items, `${label} items`);
  if (page.items.some((item) => item.id === id)) {
    throw new Error(`${label} must not contain ${id}`);
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
