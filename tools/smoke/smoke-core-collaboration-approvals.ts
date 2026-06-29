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
const FOREIGN_TENANT_ID = 'tenant_collaboration_approval_smoke_foreign';
const FOREIGN_APPROVAL_ID = `approval_foreign_${runSafeId}`;

async function main() {
  const createdApprovalIds: string[] = [];

  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      const openApi = await request(`${apiPrefix}/docs-json`, {
        expected: [200],
      });
      assertOpenApiPath(openApi, '/api/collaboration/approvals');
      assertOpenApiPath(openApi, '/api/collaboration/approvals/{id}');
      assertOpenApiPath(openApi, '/api/collaboration/approvals/{id}/approve');
      assertOpenApiPath(openApi, '/api/collaboration/approvals/{id}/reject');
    }

    const loginResponse = await smoke.login();
    const token = assertString(loginResponse.accessToken, 'login accessToken');
    await seedForeignTenantApproval();
    await assertForeignTenantApprovalHidden(token);

    const pendingApprovals =
      await clients.collaboration.listApprovalLiteRequests(token, {
        approver: 'admin',
        status: 'pending',
      });
    assertPageContainsId(
      pendingApprovals,
      'approval_openforge_apply',
      'seeded pending approvals',
    );

    const seededDetail = await clients.collaboration.getApprovalLiteRequest(
      token,
      'approval_openforge_apply',
    );
    assertEqual(
      seededDetail.id,
      'approval_openforge_apply',
      'seeded approval id',
    );
    assertEqual(
      seededDetail.tenantId,
      ROOT_TENANT_ID,
      'seeded approval tenant id',
    );
    assertEqual(seededDetail.status, 'pending', 'seeded approval status');

    const created = await clients.collaboration.createApprovalLiteRequest(
      token,
      {
        approver: 'admin',
        businessId: runId,
        businessType: 'smoke',
        requester: username,
        title: `Smoke approval ${runId}`,
      },
    );
    const createdApprovalId = assertString(created.id, 'created approval id');
    createdApprovalIds.push(createdApprovalId);
    assertEqual(created.tenantId, ROOT_TENANT_ID, 'created approval tenant id');
    assertEqual(created.status, 'pending', 'created approval status');
    assertEqual(created.approver, 'admin', 'created approval approver');
    assertEqual(created.businessId, runId, 'created approval business id');
    assertTimelineAction(created, 'submitted', 'created approval timeline');

    const listedCreated = await clients.collaboration.listApprovalLiteRequests(
      token,
      {
        approver: 'admin',
        status: 'pending',
      },
    );
    assertPageContainsId(
      listedCreated,
      createdApprovalId,
      'created pending approvals',
    );

    const detail = await clients.collaboration.getApprovalLiteRequest(
      token,
      createdApprovalId,
    );
    assertEqual(detail.id, createdApprovalId, 'created approval detail id');

    const approved = await clients.collaboration.approveApprovalLiteRequest(
      token,
      createdApprovalId,
      {
        actor: 'admin',
        comment: 'Approved by smoke.',
      },
    );
    assertEqual(approved.status, 'approved', 'approved approval status');
    assertString(approved.decidedAt, 'approved approval decidedAt');
    assertEqual(approved.comment, 'Approved by smoke.', 'approved comment');
    assertTimelineAction(approved, 'approved', 'approved approval timeline');

    await smoke.apiRequest(
      `/collaboration/approvals/${encodeURIComponent(createdApprovalId)}/approve`,
      {
        body: { actor: 'admin' },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );

    await smoke.apiRequest(
      `/collaboration/approvals/${encodeURIComponent(createdApprovalId)}/reject`,
      {
        body: { actor: 'admin' },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );

    const listedApproved = await clients.collaboration.listApprovalLiteRequests(
      token,
      {
        status: 'approved',
      },
    );
    assertPageContainsId(
      listedApproved,
      createdApprovalId,
      'approved approvals',
    );

    const rejectTarget = await clients.collaboration.createApprovalLiteRequest(
      token,
      {
        approver: 'admin',
        businessId: `${runId}_reject`,
        businessType: 'smoke',
        requester: username,
        title: `Smoke reject approval ${runId}`,
      },
    );
    const rejectedApprovalId = assertString(
      rejectTarget.id,
      'rejected approval id',
    );
    createdApprovalIds.push(rejectedApprovalId);

    const rejected = await clients.collaboration.rejectApprovalLiteRequest(
      token,
      rejectedApprovalId,
      {
        actor: 'admin',
        comment: 'Rejected by smoke.',
      },
    );
    assertEqual(rejected.status, 'rejected', 'rejected approval status');
    assertString(rejected.decidedAt, 'rejected approval decidedAt');
    assertEqual(rejected.comment, 'Rejected by smoke.', 'rejected comment');
    assertTimelineAction(rejected, 'rejected', 'rejected approval timeline');

    const listedRejected = await clients.collaboration.listApprovalLiteRequests(
      token,
      {
        status: 'rejected',
      },
    );
    assertPageContainsId(
      listedRejected,
      rejectedApprovalId,
      'rejected approvals',
    );

    await cleanupCreatedApprovals(createdApprovalIds);
    createdApprovalIds.length = 0;

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
                'openapi.collaboration-approval-list-path',
                'openapi.collaboration-approval-detail-path',
                'openapi.collaboration-approval-approve-path',
                'openapi.collaboration-approval-reject-path',
              ]
            : []),
          'auth.login',
          'collaboration.approvals.foreign-hidden',
          'collaboration.approvals.seeded-list-detail',
          'collaboration.approvals.create',
          'collaboration.approvals.list-filter',
          'collaboration.approvals.detail',
          'collaboration.approvals.approve',
          'collaboration.approvals.terminal-approve-guard',
          'collaboration.approvals.terminal-reject-guard',
          'collaboration.approvals.approved-list',
          'collaboration.approvals.reject',
          'collaboration.approvals.rejected-list',
        ],
      }),
    );
  } catch (error) {
    await cleanupCreatedApprovals(createdApprovalIds);
    throw error;
  } finally {
    await cleanupForeignTenantApproval().catch(() => undefined);
    await disconnectSmokePrisma();
  }
}

async function cleanupCreatedApprovals(ids: readonly string[]) {
  if (ids.length === 0) {
    return;
  }

  await getSmokePrisma().collaborationApprovalLite.deleteMany({
    where: { id: { in: [...ids] } },
  });
}

async function seedForeignTenantApproval() {
  const prisma = getSmokePrisma();

  await cleanupForeignTenantApproval();
  await prisma.tenant.upsert({
    where: { id: FOREIGN_TENANT_ID },
    update: {
      code: 'collab-approval-smoke-foreign',
      slug: 'collab-approval-smoke-foreign',
      name: 'Collaboration Approval Smoke Foreign',
      status: 'active',
    },
    create: {
      id: FOREIGN_TENANT_ID,
      code: 'collab-approval-smoke-foreign',
      slug: 'collab-approval-smoke-foreign',
      name: 'Collaboration Approval Smoke Foreign',
      status: 'active',
    },
  });
  await prisma.collaborationApprovalLite.create({
    data: {
      id: FOREIGN_APPROVAL_ID,
      tenantId: FOREIGN_TENANT_ID,
      title: `Foreign smoke approval ${runId}`,
      requester: 'foreign-developer',
      approver: 'foreign-admin',
      businessType: 'smoke',
      businessId: runId,
      status: 'pending',
      timeline: [
        {
          at: new Date().toISOString(),
          actor: 'foreign-developer',
          action: 'submitted',
        },
      ],
    },
  });
}

async function assertForeignTenantApprovalHidden(rootToken: string) {
  const list = await clients.collaboration.listApprovalLiteRequests(rootToken, {
    status: 'pending',
  });
  assertPageExcludesId(list, FOREIGN_APPROVAL_ID, 'foreign approval list');

  await smoke.apiRequest(
    `/collaboration/approvals/${encodeURIComponent(FOREIGN_APPROVAL_ID)}`,
    { expected: [404], token: rootToken },
  );
  await smoke.apiRequest(
    `/collaboration/approvals/${encodeURIComponent(FOREIGN_APPROVAL_ID)}/approve`,
    {
      body: { actor: username },
      expected: [404],
      method: 'PATCH',
      token: rootToken,
    },
  );
  await smoke.apiRequest(
    `/collaboration/approvals/${encodeURIComponent(FOREIGN_APPROVAL_ID)}/reject`,
    {
      body: { actor: username },
      expected: [404],
      method: 'PATCH',
      token: rootToken,
    },
  );
  await assertForeignTenantApprovalPreserved();
}

async function assertForeignTenantApprovalPreserved() {
  const approval = await getSmokePrisma().collaborationApprovalLite.findUnique({
    where: { id: FOREIGN_APPROVAL_ID },
  });

  if (
    !approval ||
    approval.tenantId !== FOREIGN_TENANT_ID ||
    approval.status !== 'pending'
  ) {
    throw new Error('Foreign tenant collaboration approval was changed');
  }
}

async function cleanupForeignTenantApproval() {
  const prisma = getSmokePrisma();

  await prisma.collaborationApprovalLite.deleteMany({
    where: { id: FOREIGN_APPROVAL_ID },
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
