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
    for (const path of [
      '/api/integrations/oauth/tokens/summary',
      '/api/integrations/oauth/tokens',
      '/api/integrations/oauth/tokens/{id}',
      '/api/integrations/oauth/tokens/{id}/revoke',
    ]) {
      assertOpenApiPath(openApi, path);
    }
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');

  const beforeSummary = await apiRequest('/integrations/oauth/tokens/summary');
  assertAtLeast(beforeSummary.total, 3, 'OAuth token total');
  assertAtLeast(beforeSummary.active, 1, 'active OAuth token count');
  assertAtLeast(beforeSummary.expired, 1, 'expired OAuth token count');
  assertAtLeast(beforeSummary.revoked, 1, 'revoked OAuth token count');
  assertAtLeast(beforeSummary.providers, 1, 'OAuth token providers');
  assertString(beforeSummary.generatedAt, 'OAuth token summary generatedAt');

  const contract = await apiRequest('/integrations/oauth/callback-contract');
  assertEqual(
    contract.auditAction,
    'integration.oauth.callback',
    'OAuth callback audit action',
  );

  const activePage = await apiRequest(
    '/integrations/oauth/tokens?status=active',
  );
  assertAtLeast(activePage.total, 1, 'active OAuth token page total');
  assertArray(activePage.items, 'active OAuth token items');
  const activeToken = activePage.items[0];
  assertString(activeToken.id, 'active OAuth token id');
  assertEqual(activeToken.status, 'active', 'active OAuth token status');
  assertString(activeToken.accessTokenRef, 'active OAuth token ref');

  const detail = await apiRequest(
    `/integrations/oauth/tokens/${encodeURIComponent(activeToken.id)}`,
  );
  assertEqual(detail.id, activeToken.id, 'OAuth token detail id');
  assertEqual(detail.status, 'active', 'OAuth token detail status');

  const reason = `OpenCore OAuth token smoke revoke ${Date.now()}`;
  const revoked = await apiRequest(
    `/integrations/oauth/tokens/${encodeURIComponent(activeToken.id)}/revoke`,
    {
      method: 'PATCH',
      body: { reason },
    },
  );
  assertEqual(revoked.id, activeToken.id, 'revoked OAuth token id');
  assertEqual(revoked.status, 'revoked', 'revoked OAuth token status');
  assertEqual(revoked.revokeReason, reason, 'revoked OAuth token reason');
  assertString(revoked.revokedAt, 'revoked OAuth token revokedAt');

  const repeated = await apiRequest(
    `/integrations/oauth/tokens/${encodeURIComponent(activeToken.id)}/revoke`,
    {
      method: 'PATCH',
      body: { reason: 'second revoke must not replace first reason' },
    },
  );
  assertEqual(
    repeated.revokeReason,
    reason,
    'idempotent OAuth token revoke reason',
  );

  const afterSummary = await apiRequest('/integrations/oauth/tokens/summary');
  assertEqual(
    afterSummary.revoked,
    beforeSummary.revoked + 1,
    'OAuth token revoked summary increment',
  );

  const revokedPage = await apiRequest(
    '/integrations/oauth/tokens?status=revoked',
  );
  assertIncludes(
    revokedPage.items.map((item) => item.id),
    activeToken.id,
    'revoked OAuth token page',
  );

  assertNoSecretLeak({
    beforeSummary,
    activePage,
    detail,
    revoked,
    repeated,
    afterSummary,
    revokedPage,
  });

  console.log(
    JSON.stringify({
      status: 'pass',
      baseUrl,
      apiPrefix,
      checks: [
        'health.live',
        'health.ready',
        ...(checkDocs ? ['openapi.integration-oauth-token-management'] : []),
        'auth.login',
        'integration.oauth-token-summary',
        'integration.oauth-token-list-detail',
        'integration.oauth-token-revoke',
        'integration.oauth-token-revoke-idempotent',
        'integration.oauth-token-secret-leak-guard',
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
        body: {
          username,
          password,
        },
      });
    } catch (error) {
      lastError = error;
      if (!(error instanceof HttpStatusError)) {
        break;
      }
    }
  }

  throw lastError ?? new Error('Unable to login with configured credentials.');
}

async function request(path, options = {}) {
  const expected = options.expected || [200];
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!expected.includes(response.status)) {
    throw new HttpStatusError(
      `Expected ${path} to return ${expected.join('/')} but received ${
        response.status
      }: ${formatBody(body)}`,
      response.status,
    );
  }

  return body;
}

function assertOpenApiPath(openApi, path) {
  if (!openApi || typeof openApi !== 'object' || !openApi.paths?.[path]) {
    throw new Error(`OpenAPI docs-json does not include ${path}`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(
      `Expected ${label} to be an array, received ${formatBody(value)}`,
    );
  }
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Expected ${label} to be a non-empty string.`);
  }

  return value;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `Expected ${label} to be ${JSON.stringify(expected)}, received ${formatBody(actual)}`,
    );
  }
}

function assertAtLeast(actual, expected, label) {
  if (typeof actual !== 'number' || actual < expected) {
    throw new Error(
      `Expected ${label} to be at least ${expected}, received ${formatBody(actual)}`,
    );
  }
}

function assertIncludes(values, expected, label) {
  if (!values.includes(expected)) {
    throw new Error(
      `Expected ${label} to include ${JSON.stringify(expected)}, received ${formatBody(values)}`,
    );
  }
}

function assertNoSecretLeak(value) {
  const text = JSON.stringify(value);
  const forbidden = ['ghp_', 'github_pat_', 'refresh-token-value', 'unsafe'];
  for (const marker of forbidden) {
    if (text.includes(marker)) {
      throw new Error(`OAuth token smoke leaked secret marker: ${marker}`);
    }
  }
}

function formatBody(body) {
  return JSON.stringify(body).slice(0, 1000);
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function normalizeApiPrefix(value) {
  const trimmed = trimTrailingSlash(value.trim());

  if (!trimmed) {
    return '';
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function parseBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
