#!/usr/bin/env node

import {
  assertArray,
  assertEqual,
  assertNumberAtLeast,
  assertOpenApiPath,
  assertString,
  createTypedSmokeRuntime,
  delay,
  formatBody,
} from './runtime';
import { disconnectSmokePrisma, getSmokePrisma } from './prisma';

const TARGET_SESSION_ID = 'session_operator';
const FOREIGN_TENANT_ID = 'tenant_online_user_smoke_foreign';
const FOREIGN_SESSION_ID = 'session_online_user_smoke_foreign';
const FOREIGN_EXPIRED_SESSION_ID = 'session_online_user_smoke_foreign_expired';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, login, username } = smoke;
const apiRequest = smoke.apiRequest as any;
const request = smoke.request as any;

let token;
let kickedDuringRun = false;
let realTokenRevoked = false;
let foreignTenantSeeded = false;

async function main() {
  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      const openApi = await request(`${apiPrefix}/docs-json`, {
        expected: [200],
      });
      assertOpenApiPath(openApi, '/api/monitor/online-users/summary');
      assertOpenApiPath(openApi, '/api/monitor/online-users/expired');
    }

    const loginResponse = await login();
    const revocationLoginResponse = await login();

    token = assertString(loginResponse.accessToken, 'login accessToken');
    smoke.setToken(token);
    await seedForeignTenantSessions();
    foreignTenantSeeded = true;
    const tokenId = parseBearerTokenId(token);
    const revocationToken = assertString(
      revocationLoginResponse.accessToken,
      'revocation login accessToken',
    );
    const revocationTokenId = parseBearerTokenId(revocationToken);

    const summary = await apiRequest('/monitor/online-users/summary');
    assertNumberAtLeast(summary.total, 1, 'online user summary total');
    assertNumberAtLeast(summary.active, 1, 'online user summary active');
    assertNumberAtLeast(
      summary.activeUsers,
      1,
      'online user summary activeUsers',
    );
    assertNumberAtLeast(summary.revoked, 0, 'online user summary revoked');
    assertNumberAtLeast(summary.expired, 0, 'online user summary expired');
    assertNumberAtLeast(
      summary.cleanupEligible,
      0,
      'online user summary cleanupEligible',
    );

    const cleanupExpired = await apiRequest('/monitor/online-users/expired', {
      method: 'DELETE',
    });
    assertEqual(cleanupExpired.deleted, true, 'expired cleanup deleted flag');
    assertNumberAtLeast(cleanupExpired.affected, 0, 'expired cleanup affected');
    assertString(cleanupExpired.expiredBefore, 'expired cleanup cutoff');
    await assertForeignExpiredSessionPreserved();

    const page = await apiRequest('/monitor/online-users?page=1&pageSize=20');
    assertArray(page.items, 'online user list items');
    assertForeignTenantHidden(page.items, 'online user list');

    await apiRequest(
      `/monitor/online-users/${encodeURIComponent(FOREIGN_SESSION_ID)}`,
      { expected: [404] },
    );
    await apiRequest(
      `/monitor/online-users/${encodeURIComponent(FOREIGN_SESSION_ID)}/kick-out`,
      {
        method: 'POST',
        expected: [404],
        body: {
          actor: username,
          reason: 'foreign tenant smoke should stay hidden',
        },
      },
    );
    const foreignBatchKick = await apiRequest(
      '/monitor/online-users/kick-out',
      {
        method: 'POST',
        body: {
          ids: [FOREIGN_SESSION_ID],
          actor: username,
          reason: 'foreign tenant smoke should be skipped',
        },
      },
    );
    assertEqual(foreignBatchKick.requested, 1, 'foreign batch requested count');
    assertEqual(foreignBatchKick.kicked, 0, 'foreign batch kicked count');
    assertEqual(foreignBatchKick.skipped, 1, 'foreign batch skipped count');
    await assertForeignSessionNotRevoked();

    const adminActivePage = await apiRequest(
      '/monitor/online-users?page=1&pageSize=100&active=true&username=admin',
    );
    assertArray(adminActivePage.items, 'active admin session items');
    const adminSession = adminActivePage.items.find(
      (session) => session.tokenId === tokenId && !session.revokedAt,
    );
    if (!adminSession) {
      throw new Error('Expected current admin online session to remain active');
    }
    const revocationSession = adminActivePage.items.find(
      (session) => session.tokenId === revocationTokenId && !session.revokedAt,
    );
    if (!revocationSession) {
      throw new Error('Expected second login token to be listed as active');
    }
    assertString(revocationSession.browser, 'revocation session browser');
    assertString(revocationSession.os, 'revocation session os');

    const forceLogoutCreatedFrom = new Date(Date.now() - 1000).toISOString();
    const batchKick = await apiRequest('/monitor/online-users/kick-out', {
      method: 'POST',
      body: {
        ids: [revocationSession.id],
        actor: username,
        reason: 'OpenCore online-user smoke token revoke',
      },
    });
    assertEqual(batchKick.requested, 1, 'batch requested count');
    assertEqual(batchKick.kicked, 1, 'batch kicked count');
    assertEqual(batchKick.skipped, 0, 'batch skipped count');
    const forceLogoutLog = await waitForLoginLog({
      label: 'force logout',
      logType: 'logout.force',
      result: 'success',
      success: true,
      username,
      createdFrom: forceLogoutCreatedFrom,
    });
    assertEqual(forceLogoutLog.username, username, 'force logout username');
    assertEqual(
      forceLogoutLog.logType,
      'logout.force',
      'force logout log type',
    );
    assertEqual(forceLogoutLog.result, 'success', 'force logout result');
    assertEqual(forceLogoutLog.success, true, 'force logout success flag');
    assertEqual(forceLogoutLog.actorUsername, username, 'force logout actor');
    assertEqual(
      forceLogoutLog.reason,
      'OpenCore online-user smoke token revoke',
      'force logout reason',
    );
    assertEqual(
      forceLogoutLog.failureReason,
      undefined,
      'force logout failureReason',
    );

    await request(`${apiPrefix}/auth/me`, {
      token: revocationToken,
      expected: [401],
    });
    realTokenRevoked = true;

    const targetBefore = await apiRequest(
      `/monitor/online-users/${encodeURIComponent(TARGET_SESSION_ID)}`,
    );
    assertEqual(
      targetBefore.username,
      'operator',
      'target online user username',
    );

    if (!targetBefore.revokedAt) {
      const activeOperatorPage = await apiRequest(
        '/monitor/online-users?page=1&pageSize=20&active=true&username=operator',
      );
      assertArray(activeOperatorPage.items, 'active operator session items');
      if (
        !activeOperatorPage.items.some(
          (session) => session.id === TARGET_SESSION_ID && !session.revokedAt,
        )
      ) {
        throw new Error('Expected operator session before kick-out');
      }

      const kicked = await apiRequest(
        `/monitor/online-users/${encodeURIComponent(TARGET_SESSION_ID)}/kick-out`,
        {
          method: 'POST',
          body: {
            actor: username,
            reason: 'OpenCore online-user smoke kick-out',
          },
        },
      );
      kickedDuringRun = true;
      assertEqual(kicked.id, TARGET_SESSION_ID, 'kicked session id');
      assertString(kicked.revokedAt, 'kicked revokedAt');
      assertEqual(kicked.revokedBy, username, 'kicked revokedBy');
      assertEqual(
        kicked.revokedReason,
        'OpenCore online-user smoke kick-out',
        'kicked revokedReason',
      );
    }

    const targetAfter = await apiRequest(
      `/monitor/online-users/${encodeURIComponent(TARGET_SESSION_ID)}`,
    );
    assertString(targetAfter.revokedAt, 'detail revokedAt');

    await apiRequest(
      `/monitor/online-users/${encodeURIComponent(TARGET_SESSION_ID)}/kick-out`,
      {
        method: 'POST',
        expected: [400],
        body: {
          actor: username,
          reason: 'repeat smoke kick-out',
        },
      },
    );

    const revokedOperatorPage = await apiRequest(
      '/monitor/online-users?page=1&pageSize=20&active=false&username=operator',
    );
    assertArray(revokedOperatorPage.items, 'revoked operator session items');
    if (
      !revokedOperatorPage.items.some(
        (session) => session.id === TARGET_SESSION_ID && session.revokedAt,
      )
    ) {
      throw new Error('Expected revoked operator session after kick-out');
    }

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
                'openapi.docs-json',
                'openapi.online-user-summary-path',
                'openapi.online-user-expired-cleanup-path',
              ]
            : []),
          'auth.login',
          'monitor.online-user.summary',
          'monitor.online-user.expired-cleanup',
          'monitor.online-user.foreign-tenant-cleanup-preserved',
          'monitor.online-user.foreign-tenant-hidden',
          'monitor.online-user.foreign-tenant-kick-skipped',
          'monitor.online-user.list',
          'monitor.online-user.detail',
          'monitor.online-user.batch-kick-out',
          'core.login-log.logout-force-recorded',
          'core.login-log.logout-force-actor-reason',
          realTokenRevoked
            ? 'monitor.online-user.revoked-token-rejected'
            : 'monitor.online-user.revoked-token-unchecked',
          kickedDuringRun
            ? 'monitor.online-user.kick-out'
            : 'monitor.online-user.already-revoked',
          'monitor.online-user.repeat-kick-blocked',
          'monitor.online-user.admin-session-preserved',
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
    if (foreignTenantSeeded) {
      await cleanupForeignTenantSessions().catch(() => undefined);
    }
    await disconnectSmokePrisma();
  }
}

void main();

async function waitForLoginLog({
  label,
  logType,
  result,
  success,
  username,
  createdFrom,
}) {
  let lastItems = [];

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const page = await apiRequest(
      `/core/login-logs?page=1&pageSize=10&username=${encodeURIComponent(
        username,
      )}&logType=${encodeURIComponent(logType)}&result=${encodeURIComponent(
        result,
      )}&success=${encodeURIComponent(
        String(success),
      )}&createdFrom=${encodeURIComponent(createdFrom)}`,
    );
    assertArray(page.items, `filtered ${label} login log items`);
    lastItems = page.items;

    const match = page.items.find(
      (item) =>
        item.username === username &&
        item.logType === logType &&
        item.result === result &&
        item.success === success,
    );

    if (match) {
      return match;
    }

    await delay(250);
  }

  throw new Error(
    `${label} login log was not recorded for ${username}; latest rows=${formatBody(
      lastItems,
    )}`,
  );
}

async function seedForeignTenantSessions() {
  const prisma = getSmokePrisma();

  await cleanupForeignTenantSessions();
  await prisma.tenant.upsert({
    where: { id: FOREIGN_TENANT_ID },
    update: {
      code: 'online-user-smoke-foreign',
      slug: 'online-user-smoke-foreign',
      name: 'Online User Smoke Foreign',
      status: 'active',
    },
    create: {
      id: FOREIGN_TENANT_ID,
      code: 'online-user-smoke-foreign',
      slug: 'online-user-smoke-foreign',
      name: 'Online User Smoke Foreign',
      status: 'active',
    },
  });
  await prisma.onlineUserSession.createMany({
    data: [
      {
        id: FOREIGN_SESSION_ID,
        username: 'foreign-online-user-smoke',
        tokenId: 'token_online_user_smoke_foreign',
        tenantId: FOREIGN_TENANT_ID,
        accessMode: 'tenant',
        ip: '127.0.0.200',
        userAgent: 'OpenCore foreign online-user smoke',
        lastSeenAt: new Date('2026-06-10T00:00:00.000Z'),
        expiresAt: new Date('2099-06-10T01:00:00.000Z'),
      },
      {
        id: FOREIGN_EXPIRED_SESSION_ID,
        username: 'foreign-expired-online-user-smoke',
        tokenId: 'token_online_user_smoke_foreign_expired',
        tenantId: FOREIGN_TENANT_ID,
        accessMode: 'tenant',
        ip: '127.0.0.201',
        userAgent: 'OpenCore foreign expired online-user smoke',
        lastSeenAt: new Date('2026-06-10T00:00:00.000Z'),
        expiresAt: new Date('2026-06-10T01:00:00.000Z'),
      },
    ],
  });
}

async function cleanupForeignTenantSessions() {
  const prisma = getSmokePrisma();

  await prisma.onlineUserSession.deleteMany({
    where: { id: { in: [FOREIGN_SESSION_ID, FOREIGN_EXPIRED_SESSION_ID] } },
  });
  await prisma.tenant.deleteMany({ where: { id: FOREIGN_TENANT_ID } });
}

async function assertForeignExpiredSessionPreserved() {
  const session = await getSmokePrisma().onlineUserSession.findUnique({
    where: { id: FOREIGN_EXPIRED_SESSION_ID },
  });

  if (!session) {
    throw new Error(
      'Foreign tenant expired session was cleaned from root scope',
    );
  }
}

async function assertForeignSessionNotRevoked() {
  const session = await getSmokePrisma().onlineUserSession.findUnique({
    where: { id: FOREIGN_SESSION_ID },
  });

  if (!session || session.revokedAt) {
    throw new Error('Foreign tenant session was revoked from root scope');
  }
}

function assertForeignTenantHidden(items, label) {
  const ids = items.map((item) => item.id);

  if (
    ids.includes(FOREIGN_SESSION_ID) ||
    ids.includes(FOREIGN_EXPIRED_SESSION_ID)
  ) {
    throw new Error(`${label} leaked foreign tenant online sessions`);
  }
}

function parseBearerTokenId(accessToken) {
  const [payload] = accessToken.split('.');

  if (!payload) {
    throw new Error('Expected access token to include a payload');
  }

  const decoded = JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8'),
  );

  return assertString(decoded.jti, 'access token jti');
}
