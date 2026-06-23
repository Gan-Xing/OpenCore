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

const ROOT_TENANT_ID = 'tenant_root';
const FOREIGN_TENANT_ID = 'tenant_integration_oauth_smoke';
const FOREIGN_TOKEN_ID = 'oauth_token_foreign_smoke_hidden';
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
  await seedForeignOAuthRows();
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
    assertEqual(flow.tenantId, ROOT_TENANT_ID, 'OAuth flow tenant');
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
    assertEqual(
      callbackResult.audit.tenantId,
      ROOT_TENANT_ID,
      'OAuth callback audit tenant',
    );
    assertDefined(callbackResult.token, 'OAuth callback archived token');
    assertEqual(
      callbackResult.token?.tenantId,
      ROOT_TENANT_ID,
      'OAuth callback token tenant',
    );
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
    for (const completedFlow of completedFlows.items) {
      assertEqual(
        completedFlow.tenantId,
        ROOT_TENANT_ID,
        'completed OAuth flow tenant',
      );
    }

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
    for (const audit of acceptedAudits.items) {
      assertEqual(
        audit.tenantId,
        ROOT_TENANT_ID,
        'OAuth callback audit list tenant',
      );
    }

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
      pageSize: 100,
      status: 'active',
    });
    assertAtLeast(activePage.total, 1, 'active OAuth token page total');
    assertArray(activePage.items, 'active OAuth token items');
    const activeToken = await findOAuthTokenById(
      token,
      'active',
      SMOKE_TOKEN_ID,
      'active OAuth smoke token',
    );
    assertString(activeToken.id, 'active OAuth token id');
    assertEqual(
      activeToken.tenantId,
      ROOT_TENANT_ID,
      'active OAuth token tenant',
    );
    assertEqual(activeToken.status, 'active', 'active OAuth token status');
    assertString(activeToken.accessTokenRef, 'active OAuth token ref');

    const detail = await clients.integration.getOAuthToken(
      token,
      activeToken.id,
    );
    assertEqual(detail.id, activeToken.id, 'OAuth token detail id');
    assertEqual(detail.tenantId, ROOT_TENANT_ID, 'OAuth token detail tenant');
    assertEqual(detail.status, 'active', 'OAuth token detail status');
    await request(
      `${apiPrefix}/integrations/oauth/tokens/${FOREIGN_TOKEN_ID}`,
      {
        expected: [404],
        token,
      },
    );
    await assertForeignOAuthRowsPreserved();

    const reason = `OpenCore OAuth token smoke revoke ${Date.now()}`;
    const revoked = await clients.integration.revokeOAuthToken(
      token,
      activeToken.id,
      { reason },
    );
    assertEqual(revoked.id, activeToken.id, 'revoked OAuth token id');
    assertEqual(revoked.tenantId, ROOT_TENANT_ID, 'revoked OAuth token tenant');
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

    const revokedToken = await findOAuthTokenById(
      token,
      'revoked',
      activeToken.id,
      'revoked OAuth token page',
    );
    assertEqual(
      revokedToken.id,
      activeToken.id,
      'revoked OAuth token page token id',
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
      revokedToken,
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
      'integration.oauth-tenant-fields',
      'integration.oauth-callback-reject-repeat',
      'integration.oauth-token-list-detail',
      'integration.oauth-token.foreign-hidden',
      'integration.oauth-foreign-preserved',
      'integration.oauth-token-revoke',
      'integration.oauth-token-revoke-idempotent',
      'integration.oauth-token-secret-leak-guard',
    ];
  } finally {
    await cleanupForeignOAuthRows();
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
  await db.integrationOAuthCallbackAudit.deleteMany({
    where: {
      OR: [
        { providerAccountId: { startsWith: 'profile-smoke-' } },
        { providerAccountId: { startsWith: 'github:social-smoke-' } },
      ],
    },
  });
  await db.integrationOAuthToken.deleteMany({
    where: {
      OR: [
        { providerAccountId: { startsWith: 'profile-smoke-' } },
        { providerAccountId: { startsWith: 'github:social-smoke-' } },
      ],
    },
  });
  await db.integrationOAuthToken.upsert({
    where: { id: SMOKE_TOKEN_ID },
    update: toPrismaOAuthToken(SMOKE_TOKEN_SEED),
    create: {
      id: SMOKE_TOKEN_ID,
      ...toPrismaOAuthToken(SMOKE_TOKEN_SEED),
    },
  });
}

async function seedForeignOAuthRows() {
  const db = getSmokePrisma();
  await cleanupForeignOAuthRows();
  await db.tenant.upsert({
    where: { id: FOREIGN_TENANT_ID },
    update: { status: 'active' },
    create: {
      id: FOREIGN_TENANT_ID,
      code: FOREIGN_TENANT_ID,
      slug: FOREIGN_TENANT_ID,
      name: 'Integration OAuth Smoke Foreign Tenant',
      status: 'active',
    },
  });
  await db.integrationOAuthToken.create({
    data: {
      id: FOREIGN_TOKEN_ID,
      tenantId: FOREIGN_TENANT_ID,
      providerCode: 'oauth.github',
      subjectType: 'system-user',
      subjectId: 'foreign_oauth_smoke_subject',
      providerAccountId: 'github:foreign-oauth-smoke',
      scopes: ['read:user'],
      accessTokenRef:
        'secret://config/foreign.integration.oauth.github.access-token',
      refreshTokenRef:
        'secret://config/foreign.integration.oauth.github.refresh-token',
      status: 'active',
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      lastRotatedAt: new Date(),
    },
  });
}

async function assertForeignOAuthRowsPreserved() {
  const db = getSmokePrisma();
  const token = await db.integrationOAuthToken.findUnique({
    where: { id: FOREIGN_TOKEN_ID },
  });
  assertEqual(
    token?.tenantId,
    FOREIGN_TENANT_ID,
    'foreign OAuth token preserved',
  );
}

async function cleanupForeignOAuthRows() {
  const db = getSmokePrisma();
  await db.integrationOAuthToken.deleteMany({
    where: { id: FOREIGN_TOKEN_ID },
  });
  await db.tenant.deleteMany({ where: { id: FOREIGN_TENANT_ID } });
}

async function findOAuthTokenById(
  token: string,
  status: 'active' | 'expired' | 'revoked',
  id: string,
  label: string,
): Promise<OAuthTokenSummary> {
  let page = 1;
  let totalPages = 1;
  const seen: string[] = [];

  while (page <= totalPages) {
    const result = await clients.integration.listOAuthTokens(token, {
      page,
      pageSize: 100,
      status,
    });
    totalPages = result.totalPages;
    seen.push(...result.items.map((item) => item.id));
    const found = result.items.find((item) => item.id === id);
    if (found) {
      return found;
    }
    page += 1;
  }

  throw new Error(
    `Expected ${label} to include ${JSON.stringify(id)}, received ${JSON.stringify(
      seen,
    )}`,
  );
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
    tenantId: token.tenantId,
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
  void cleanupForeignOAuthRows()
    .catch(() => undefined)
    .finally(() => {
      void disconnectSmokePrisma().catch(() => undefined);
    });
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
