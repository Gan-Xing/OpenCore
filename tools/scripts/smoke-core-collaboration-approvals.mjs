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
    assertOpenApiPath(openApi, '/api/collaboration/approvals');
    assertOpenApiPath(openApi, '/api/collaboration/approvals/{id}');
    assertOpenApiPath(openApi, '/api/collaboration/approvals/{id}/approve');
    assertOpenApiPath(openApi, '/api/collaboration/approvals/{id}/reject');
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');
  smoke.setToken(token);

  const pendingApprovals = await apiRequest(
    '/collaboration/approvals?status=pending&approver=admin',
  );
  assertPageContainsId(
    pendingApprovals,
    'approval_openforge_apply',
    'seeded pending approvals',
  );

  const seededDetail = await apiRequest(
    '/collaboration/approvals/approval_openforge_apply',
  );
  assertEqual(
    seededDetail.id,
    'approval_openforge_apply',
    'seeded approval id',
  );
  assertEqual(seededDetail.status, 'pending', 'seeded approval status');

  const created = await apiRequest('/collaboration/approvals', {
    method: 'POST',
    body: {
      title: `Smoke approval ${runId}`,
      requester: username,
      approver: 'admin',
      businessType: 'smoke',
      businessId: runId,
    },
  });
  const createdApprovalId = assertString(created.id, 'created approval id');
  assertEqual(created.status, 'pending', 'created approval status');
  assertEqual(created.approver, 'admin', 'created approval approver');
  assertEqual(created.businessId, runId, 'created approval business id');
  assertTimelineAction(created, 'submitted', 'created approval timeline');

  const listedCreated = await apiRequest(
    '/collaboration/approvals?status=pending&approver=admin',
  );
  assertPageContainsId(
    listedCreated,
    createdApprovalId,
    'created pending approvals',
  );

  const detail = await apiRequest(
    `/collaboration/approvals/${encodeURIComponent(createdApprovalId)}`,
  );
  assertEqual(detail.id, createdApprovalId, 'created approval detail id');

  const approved = await apiRequest(
    `/collaboration/approvals/${encodeURIComponent(createdApprovalId)}/approve`,
    {
      method: 'PATCH',
      body: {
        actor: 'admin',
        comment: 'Approved by smoke.',
      },
    },
  );
  assertEqual(approved.status, 'approved', 'approved approval status');
  assertString(approved.decidedAt, 'approved approval decidedAt');
  assertEqual(approved.comment, 'Approved by smoke.', 'approved comment');
  assertTimelineAction(approved, 'approved', 'approved approval timeline');

  await apiRequest(
    `/collaboration/approvals/${encodeURIComponent(createdApprovalId)}/approve`,
    {
      method: 'PATCH',
      body: { actor: 'admin' },
      expected: [400],
    },
  );

  await apiRequest(
    `/collaboration/approvals/${encodeURIComponent(createdApprovalId)}/reject`,
    {
      method: 'PATCH',
      body: { actor: 'admin' },
      expected: [400],
    },
  );

  const listedApproved = await apiRequest(
    '/collaboration/approvals?status=approved',
  );
  assertPageContainsId(listedApproved, createdApprovalId, 'approved approvals');

  const rejectTarget = await apiRequest('/collaboration/approvals', {
    method: 'POST',
    body: {
      title: `Smoke reject approval ${runId}`,
      requester: username,
      approver: 'admin',
      businessType: 'smoke',
      businessId: `${runId}_reject`,
    },
  });
  const rejectedApprovalId = assertString(
    rejectTarget.id,
    'rejected approval id',
  );

  const rejected = await apiRequest(
    `/collaboration/approvals/${encodeURIComponent(rejectedApprovalId)}/reject`,
    {
      method: 'PATCH',
      body: {
        actor: 'admin',
        comment: 'Rejected by smoke.',
      },
    },
  );
  assertEqual(rejected.status, 'rejected', 'rejected approval status');
  assertString(rejected.decidedAt, 'rejected approval decidedAt');
  assertEqual(rejected.comment, 'Rejected by smoke.', 'rejected comment');
  assertTimelineAction(rejected, 'rejected', 'rejected approval timeline');

  const listedRejected = await apiRequest(
    '/collaboration/approvals?status=rejected',
  );
  assertPageContainsId(
    listedRejected,
    rejectedApprovalId,
    'rejected approvals',
  );

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

function assertTimelineAction(approval, action, label) {
  assertArray(approval.timeline, label);
  if (!approval.timeline.some((entry) => entry.action === action)) {
    throw new Error(`${label} must include ${action}`);
  }
}
