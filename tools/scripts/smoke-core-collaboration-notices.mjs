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
    assertOpenApiPath(openApi, '/api/collaboration/notices');
    assertOpenApiPath(openApi, '/api/collaboration/notices/{id}');
    assertOpenApiPath(openApi, '/api/collaboration/notices/{id}/publish');
    assertOpenApiPath(openApi, '/api/collaboration/notices/{id}/archive');
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');
  smoke.setToken(token);

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

function assertPageContainsId(page, id, label) {
  assertArray(page.items, `${label} items`);
  if (!page.items.some((item) => item.id === id)) {
    throw new Error(`${label} must contain ${id}`);
  }
}
