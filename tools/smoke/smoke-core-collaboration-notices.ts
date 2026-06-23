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
const runSafeId = runId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
const ROOT_TENANT_ID = 'tenant_root';
const FOREIGN_TENANT_ID = 'tenant_collaboration_notice_smoke_foreign';
const FOREIGN_NOTICE_ID = `notice_foreign_${runSafeId}`;

async function main() {
  let createdNoticeId: string | undefined;

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

    const loginResponse = await smoke.login();
    const token = assertString(loginResponse.accessToken, 'login accessToken');
    await seedForeignTenantNotice();
    await assertForeignTenantNoticeHidden(token);

    const draftNotices = await clients.collaboration.listNotices(token, {
      status: 'draft',
    });
    assertPageContainsId(
      draftNotices,
      'notice_release_window',
      'seeded draft notices',
    );

    const seededDetail = await clients.collaboration.getNotice(
      token,
      'notice_release_window',
    );
    assertEqual(seededDetail.id, 'notice_release_window', 'seeded notice id');
    assertEqual(
      seededDetail.tenantId,
      ROOT_TENANT_ID,
      'seeded notice tenant id',
    );
    assertEqual(seededDetail.status, 'draft', 'seeded notice status');

    const created = await clients.collaboration.createNotice(token, {
      body: 'Collaboration notices smoke body.',
      createdBy: username,
      targetAudience: ['admin', 'ops'],
      title: `Smoke notice ${runId}`,
    });
    createdNoticeId = assertString(created.id, 'created notice id');
    assertEqual(created.tenantId, ROOT_TENANT_ID, 'created notice tenant id');
    assertEqual(created.status, 'draft', 'created notice status');
    assertArray(created.targetAudience, 'created notice target audience');
    assertEqual(
      created.targetAudience.length,
      2,
      'created notice audience count',
    );

    const listedCreated = await clients.collaboration.listNotices(token, {
      status: 'draft',
    });
    assertPageContainsId(
      listedCreated,
      createdNoticeId,
      'created draft notices',
    );

    const detail = await clients.collaboration.getNotice(
      token,
      createdNoticeId,
    );
    assertEqual(detail.id, createdNoticeId, 'created notice detail id');

    const published = await clients.collaboration.publishNotice(
      token,
      createdNoticeId,
    );
    assertEqual(published.status, 'published', 'published notice status');
    assertString(published.publishedAt, 'published notice publishedAt');

    await smoke.apiRequest(
      `/collaboration/notices/${encodeURIComponent(createdNoticeId)}/publish`,
      { expected: [400], method: 'PATCH', token },
    );

    const archived = await clients.collaboration.archiveNotice(
      token,
      createdNoticeId,
    );
    assertEqual(archived.status, 'archived', 'archived notice status');
    assertString(archived.archivedAt, 'archived notice archivedAt');

    await smoke.apiRequest(
      `/collaboration/notices/${encodeURIComponent(createdNoticeId)}/archive`,
      { expected: [400], method: 'PATCH', token },
    );

    const listedArchived = await clients.collaboration.listNotices(token, {
      status: 'archived',
    });
    assertPageContainsId(listedArchived, createdNoticeId, 'archived notices');

    await cleanupCreatedNotice(createdNoticeId);
    createdNoticeId = undefined;

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
          'collaboration.notices.foreign-hidden',
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
    await cleanupCreatedNotice(createdNoticeId);
    throw error;
  } finally {
    await cleanupForeignTenantNotice().catch(() => undefined);
    await disconnectSmokePrisma();
  }
}

async function cleanupCreatedNotice(id: string | undefined) {
  if (!id) {
    return;
  }

  await getSmokePrisma().collaborationNotice.deleteMany({
    where: { id },
  });
}

async function seedForeignTenantNotice() {
  const prisma = getSmokePrisma();

  await cleanupForeignTenantNotice();
  await prisma.tenant.upsert({
    where: { id: FOREIGN_TENANT_ID },
    update: {
      code: 'collab-notice-smoke-foreign',
      slug: 'collab-notice-smoke-foreign',
      name: 'Collaboration Notice Smoke Foreign',
      status: 'active',
    },
    create: {
      id: FOREIGN_TENANT_ID,
      code: 'collab-notice-smoke-foreign',
      slug: 'collab-notice-smoke-foreign',
      name: 'Collaboration Notice Smoke Foreign',
      status: 'active',
    },
  });
  await prisma.collaborationNotice.create({
    data: {
      id: FOREIGN_NOTICE_ID,
      tenantId: FOREIGN_TENANT_ID,
      title: `Foreign smoke notice ${runId}`,
      body: 'Foreign tenant notice body.',
      status: 'draft',
      targetAudience: ['admin'],
      createdBy: 'foreign-admin',
    },
  });
}

async function assertForeignTenantNoticeHidden(rootToken: string) {
  const list = await clients.collaboration.listNotices(rootToken, {
    status: 'draft',
  });
  assertPageExcludesId(list, FOREIGN_NOTICE_ID, 'foreign notice list');

  await smoke.apiRequest(
    `/collaboration/notices/${encodeURIComponent(FOREIGN_NOTICE_ID)}`,
    { expected: [404], token: rootToken },
  );
  await smoke.apiRequest(
    `/collaboration/notices/${encodeURIComponent(FOREIGN_NOTICE_ID)}/publish`,
    { expected: [404], method: 'PATCH', token: rootToken },
  );
  await smoke.apiRequest(
    `/collaboration/notices/${encodeURIComponent(FOREIGN_NOTICE_ID)}/archive`,
    { expected: [404], method: 'PATCH', token: rootToken },
  );
  await assertForeignTenantNoticePreserved();
}

async function assertForeignTenantNoticePreserved() {
  const notice = await getSmokePrisma().collaborationNotice.findUnique({
    where: { id: FOREIGN_NOTICE_ID },
  });

  if (!notice || notice.tenantId !== FOREIGN_TENANT_ID) {
    throw new Error('Foreign tenant collaboration notice was changed');
  }
}

async function cleanupForeignTenantNotice() {
  const prisma = getSmokePrisma();

  await prisma.collaborationNotice.deleteMany({
    where: { id: FOREIGN_NOTICE_ID },
  });
  await prisma.tenant.deleteMany({ where: { id: FOREIGN_TENANT_ID } });
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
