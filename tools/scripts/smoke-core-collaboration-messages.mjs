#!/usr/bin/env node

import {
  assertArray,
  assertEqual,
  assertNumberAtLeast,
  assertOpenApiPath,
  assertString,
  createSmokeRuntime,
} from './smoke-helpers.mjs';

const smoke = createSmokeRuntime();
const { apiPrefix, apiRequest, baseUrl, checkDocs, login, request, username } =
  smoke;
const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
let token;
let createdMessageId;

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
  smoke.setToken(token);

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
