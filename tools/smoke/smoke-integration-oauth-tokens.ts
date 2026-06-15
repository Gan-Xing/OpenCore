import { findOAuthTokenFixture, type OAuthTokenSummary } from '@opencore/sdk';
import type { Prisma } from '@prisma/client';

import { disconnectSmokePrisma, getSmokePrisma } from './prisma';
import {
  assertArray,
  assertAtLeast,
  assertDefined,
  assertEqual,
  assertIncludes,
  assertOpenApiPath,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request } = smoke;

const SMOKE_TOKEN_ID = 'oauth_token_github_smoke_revoke';
const SMOKE_FLOW_SUBJECT_ID = 'user_smoke_oauth_flow';
const SMOKE_FLOW_PROVIDER_ACCOUNT_ID = 'github:opencore-smoke-flow';
const SMOKE_TOKEN_SEED = assertDefined(
  findOAuthTokenFixture(SMOKE_TOKEN_ID),
  `OAuth token fixture ${SMOKE_TOKEN_ID}`,
);

async function main() {
  await resetSmokeOAuthToken();
  await resetSmokeOAuthFlow();
  let checks: string[] = [];

  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      const openApi = await request(`${apiPrefix}/docs-json`, {
        expected: [200],
      });
      for (const path of [
        '/api/integrations/oauth/tokens/summary',
        '/api/integrations/oauth/flows',
        '/api/integrations/oauth/callback/{providerCode}',
        '/api/integrations/oauth/callback-audits',
        '/api/integrations/oauth/tokens',
        '/api/integrations/oauth/tokens/{id}',
        '/api/integrations/oauth/tokens/{id}/revoke',
      ]) {
        assertOpenApiPath(openApi, path);
      }
    }

    const loginResponse = await smoke.login();
    const token = assertString(loginResponse.accessToken, 'login accessToken');

    const beforeSummary = await clients.integration.getOAuthTokenSummary(token);
    assertAtLeast(beforeSummary.total, 3, 'OAuth token total');
    assertAtLeast(beforeSummary.active, 1, 'active OAuth token count');
    assertAtLeast(beforeSummary.expired, 1, 'expired OAuth token count');
    assertAtLeast(beforeSummary.revoked, 1, 'revoked OAuth token count');
    assertAtLeast(beforeSummary.providers, 1, 'OAuth token providers');
    assertString(beforeSummary.generatedAt, 'OAuth token summary generatedAt');

    const contract = await clients.integration.getOAuthCallbackContract(token);
    assertEqual(
      contract.auditAction,
      'integration.oauth.callback',
      'OAuth callback audit action',
    );

    const flow = await clients.integration.startOAuthFlow(token, {
      providerCode: 'oauth.github',
      subjectId: SMOKE_FLOW_SUBJECT_ID,
      scopes: ['read:user'],
    });
    assertEqual(flow.providerCode, 'oauth.github', 'OAuth flow provider');
    assertEqual(flow.status, 'pending', 'OAuth flow initial status');
    assertString(flow.state, 'OAuth flow state');
    assertEqual(
      new URL(flow.authorizationUrl, baseUrl).searchParams.get('state'),
      flow.state,
      'OAuth authorization URL state',
    );

    const callbackCode = `smoke-oauth-code-${Date.now()}`;
    const callbackResult = await clients.integration.callbackOAuthProvider(
      'github',
      {
        state: flow.state,
        code: callbackCode,
        providerAccountId: SMOKE_FLOW_PROVIDER_ACCOUNT_ID,
        scopes: 'read:user',
      },
    );
    assertEqual(callbackResult.status, 'accepted', 'OAuth callback status');
    assertEqual(callbackResult.flowId, flow.id, 'OAuth callback flow binding');
    assertDefined(callbackResult.token, 'OAuth callback archived token');
    assertEqual(
      callbackResult.token?.subjectId,
      SMOKE_FLOW_SUBJECT_ID,
      'OAuth callback token subject',
    );
    assertString(
      callbackResult.token?.accessTokenRef,
      'OAuth callback access token ref',
    );
    assertString(
      callbackResult.audit.callbackCodeHash,
      'OAuth callback code hash',
    );

    const completedFlows = await clients.integration.listOAuthFlows(token, {
      subjectId: SMOKE_FLOW_SUBJECT_ID,
      status: 'completed',
    });
    assertAtLeast(completedFlows.total, 1, 'completed OAuth flow total');
    assertIncludes(
      completedFlows.items.map((item) => item.id),
      flow.id,
      'completed OAuth flow list',
    );

    const acceptedAudits = await clients.integration.listOAuthCallbackAudits(
      token,
      {
        providerCode: 'oauth.github',
        status: 'accepted',
      },
    );
    assertIncludes(
      acceptedAudits.items.map((item) => item.flowId ?? ''),
      flow.id,
      'accepted OAuth callback audit list',
    );

    const repeatedCallback = await clients.integration.callbackOAuthProvider(
      'oauth.github',
      {
        state: flow.state,
        code: 'smoke-oauth-code-repeat',
      },
    );
    assertEqual(
      repeatedCallback.status,
      'rejected',
      'OAuth repeated callback status',
    );
    if (!repeatedCallback.message.includes('completed')) {
      throw new Error(
        `Expected OAuth repeated callback rejection reason to include completed, received ${repeatedCallback.message}`,
      );
    }

    const activePage = await clients.integration.listOAuthTokens(token, {
      status: 'active',
    });
    assertAtLeast(activePage.total, 1, 'active OAuth token page total');
    assertArray(activePage.items, 'active OAuth token items');
    const activeToken = activePage.items.find(
      (item) => item.id === SMOKE_TOKEN_ID,
    );
    if (!activeToken) {
      throw new Error(`Expected active OAuth smoke token ${SMOKE_TOKEN_ID}.`);
    }
    assertString(activeToken.id, 'active OAuth token id');
    assertEqual(activeToken.status, 'active', 'active OAuth token status');
    assertString(activeToken.accessTokenRef, 'active OAuth token ref');

    const detail = await clients.integration.getOAuthToken(
      token,
      activeToken.id,
    );
    assertEqual(detail.id, activeToken.id, 'OAuth token detail id');
    assertEqual(detail.status, 'active', 'OAuth token detail status');

    const reason = `OpenCore OAuth token smoke revoke ${Date.now()}`;
    const revoked = await clients.integration.revokeOAuthToken(
      token,
      activeToken.id,
      { reason },
    );
    assertEqual(revoked.id, activeToken.id, 'revoked OAuth token id');
    assertEqual(revoked.status, 'revoked', 'revoked OAuth token status');
    assertEqual(revoked.revokeReason, reason, 'revoked OAuth token reason');
    assertString(revoked.revokedAt, 'revoked OAuth token revokedAt');

    const repeated = await clients.integration.revokeOAuthToken(
      token,
      activeToken.id,
      { reason: 'second revoke must not replace first reason' },
    );
    assertEqual(
      repeated.revokeReason,
      reason,
      'idempotent OAuth token revoke reason',
    );

    const afterSummary = await clients.integration.getOAuthTokenSummary(token);
    assertEqual(
      afterSummary.revoked,
      beforeSummary.revoked + 1,
      'OAuth token revoked summary increment',
    );

    const revokedPage = await clients.integration.listOAuthTokens(token, {
      status: 'revoked',
    });
    assertIncludes(
      revokedPage.items.map((item) => item.id),
      activeToken.id,
      'revoked OAuth token page',
    );

    assertNoSecretLeak({
      activePage,
      afterSummary,
      beforeSummary,
      callbackResult,
      completedFlows,
      detail,
      repeatedCallback,
      repeated,
      revoked,
      revokedPage,
    });

    checks = [
      'health.live',
      'health.ready',
      ...(checkDocs ? ['openapi.integration-oauth-token-management'] : []),
      'auth.login',
      'integration.oauth-token-reset-before',
      'integration.oauth-token-summary',
      'integration.oauth-flow-start',
      'integration.oauth-callback-accept',
      'integration.oauth-callback-audit',
      'integration.oauth-callback-reject-repeat',
      'integration.oauth-token-list-detail',
      'integration.oauth-token-revoke',
      'integration.oauth-token-revoke-idempotent',
      'integration.oauth-token-secret-leak-guard',
    ];
  } finally {
    await resetSmokeOAuthFlow();
    await resetSmokeOAuthToken();
    await disconnectSmokePrisma();
  }

  console.log(
    JSON.stringify({
      status: 'pass',
      baseUrl,
      apiPrefix,
      checks: [...checks, 'integration.oauth-token-reset-after'],
    }),
  );
}

async function resetSmokeOAuthToken() {
  const db = getSmokePrisma();
  await db.integrationOAuthToken.upsert({
    where: { id: SMOKE_TOKEN_ID },
    update: toPrismaOAuthToken(SMOKE_TOKEN_SEED),
    create: {
      id: SMOKE_TOKEN_ID,
      ...toPrismaOAuthToken(SMOKE_TOKEN_SEED),
    },
  });
}

async function resetSmokeOAuthFlow() {
  const db = getSmokePrisma();
  const flows = await db.integrationOAuthFlow.findMany({
    select: { id: true },
    where: { subjectId: SMOKE_FLOW_SUBJECT_ID },
  });
  const flowIds = flows.map((flow) => flow.id);
  await db.integrationOAuthCallbackAudit.deleteMany({
    where: {
      OR: [
        { providerAccountId: SMOKE_FLOW_PROVIDER_ACCOUNT_ID },
        ...(flowIds.length > 0 ? [{ flowId: { in: flowIds } }] : []),
      ],
    },
  });
  await db.integrationOAuthFlow.deleteMany({
    where: { subjectId: SMOKE_FLOW_SUBJECT_ID },
  });
  await db.integrationOAuthToken.deleteMany({
    where: { subjectId: SMOKE_FLOW_SUBJECT_ID },
  });
}

function toPrismaOAuthToken(token: OAuthTokenSummary) {
  return {
    accessTokenRef: token.accessTokenRef,
    createdAt: new Date(token.createdAt),
    expiresAt: token.expiresAt ? new Date(token.expiresAt) : null,
    lastRotatedAt: token.lastRotatedAt ? new Date(token.lastRotatedAt) : null,
    providerAccountId: token.providerAccountId,
    providerCode: token.providerCode,
    refreshTokenRef: token.refreshTokenRef ?? null,
    revokeReason: token.revokeReason ?? null,
    revokedAt: token.revokedAt ? new Date(token.revokedAt) : null,
    revokedBy: token.revokedBy ?? null,
    scopes: token.scopes as unknown as Prisma.InputJsonValue,
    status: token.status,
    subjectId: token.subjectId,
    subjectType: token.subjectType,
  };
}

function assertNoSecretLeak(value: unknown) {
  const text = JSON.stringify(value);
  const forbidden = [
    'ghp_',
    'github_pat_',
    'refresh-token-value',
    'smoke-oauth-code',
    'unsafe',
  ];
  for (const marker of forbidden) {
    if (text.includes(marker)) {
      throw new Error(`OAuth token smoke leaked secret marker: ${marker}`);
    }
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
