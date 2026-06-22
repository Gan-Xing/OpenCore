#!/usr/bin/env node

import {
  assertEqual,
  assertOpenApiPath,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, checkDocs, clients, login, request } = smoke;

async function main() {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    const openApi = await request(`${apiPrefix}/docs-json`, {
      expected: [200],
    });
    assertOpenApiPath(openApi, '/api/auth/select-tenant');
    assertOpenApiPath(openApi, '/api/auth/switch-tenant');
  }

  const loginResponse = await login();
  const token = assertString(loginResponse.accessToken, 'login accessToken');
  const loginPayload = decodeTokenPayload(token);

  assertEqual(loginPayload.tid, 'tenant_root', 'login token tenant id');
  assertString(loginPayload.mid, 'login token membership id');
  assertEqual(loginPayload.am, 'tenant', 'login token access mode');
  assertEqual(loginResponse.user.activeTenant?.code, 'root', 'login tenant');
  assertEqual(
    loginResponse.user.activeMembership?.id,
    loginPayload.mid,
    'login membership id',
  );

  smoke.setToken(token);

  const summary = await clients.tenancy.getFoundationSummary(token);
  assertEqual(
    summary.requestContext?.tenantId,
    'tenant_root',
    'foundation request context tenant',
  );
  assertEqual(
    summary.requestContext?.membershipId,
    loginPayload.mid,
    'foundation request context membership',
  );

  const tampered = await request<typeof summary>(
    `${apiPrefix}/core/tenancy/foundation`,
    {
      headers: { 'tenant-id': 'tenant_forged' },
      token,
    },
  );
  assertEqual(
    tampered.requestContext?.tenantId,
    'tenant_root',
    'tampered header request context tenant',
  );

  const me = await clients.rbac.me(token);
  assertEqual(me.user.activeTenant?.code, 'root', 'me active tenant');
  assertEqual(me.user.accessMode, 'tenant', 'me access mode');

  const switched = await clients.rbac.switchTenant(token, {
    tenantCode: 'root',
  });
  const switchedToken = assertString(
    switched.accessToken,
    'switched accessToken',
  );
  const switchedPayload = decodeTokenPayload(switchedToken);
  assertEqual(switchedPayload.tid, 'tenant_root', 'switched token tenant id');
  assertEqual(switchedPayload.am, 'tenant', 'switched token access mode');

  await request(`${apiPrefix}/auth/me`, {
    expected: [401, 403],
    token,
  });
  await request(`${apiPrefix}/auth/me`, {
    expected: [200],
    token: switchedToken,
  });
}

function decodeTokenPayload(token: string): {
  tid?: string;
  mid?: string;
  am?: string;
} {
  const payload = token.split('.')[0];

  if (!payload) {
    throw new Error('Expected bearer token payload');
  }

  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    tid?: string;
    mid?: string;
    am?: string;
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
