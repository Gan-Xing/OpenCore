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
    assertOpenApiPath(openApi, '/api/collaboration/approvals');
    assertOpenApiPath(openApi, '/api/collaboration/approvals/{id}');
    assertOpenApiPath(openApi, '/api/collaboration/approvals/{id}/approve');
    assertOpenApiPath(openApi, '/api/collaboration/approvals/{id}/reject');
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');

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

function assertTimelineAction(approval, action, label) {
  assertArray(approval.timeline, label);
  if (!approval.timeline.some((entry) => entry.action === action)) {
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
