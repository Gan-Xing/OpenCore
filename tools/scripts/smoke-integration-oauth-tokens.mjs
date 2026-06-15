#!/usr/bin/env node

import {
  assertArray,
  assertAtLeast,
  assertEqual,
  assertIncludes,
  assertOpenApiPath,
  assertString,
  createSmokeRuntime,
} from './smoke-helpers.mjs';

const smoke = createSmokeRuntime();
const { apiPrefix, apiRequest, baseUrl, checkDocs, login, request } = smoke;
const smokeTokenId = 'oauth_token_github_smoke_revoke';
let token;

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
  smoke.setToken(token);

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
  const activeToken = activePage.items.find((item) => item.id === smokeTokenId);
  if (!activeToken) {
    throw new Error(`Expected active OAuth smoke token ${smokeTokenId}.`);
  }
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

function assertNoSecretLeak(value) {
  const text = JSON.stringify(value);
  const forbidden = ['ghp_', 'github_pat_', 'refresh-token-value', 'unsafe'];
  for (const marker of forbidden) {
    if (text.includes(marker)) {
      throw new Error(`OAuth token smoke leaked secret marker: ${marker}`);
    }
  }
}
