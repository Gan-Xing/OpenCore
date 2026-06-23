#!/usr/bin/env node

import type { LoginResponse, LoginResult } from '@opencore/sdk';

import {
  assertEqual,
  assertOpenApiPath,
  assertString,
  createTypedSmokeRuntime,
  HttpStatusError,
} from './runtime';
import { disconnectSmokePrisma, getSmokePrisma } from './prisma';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, checkDocs, clients, login, request } = smoke;
const runId = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
const hostTenantCode = `smoke.auth.${runId}`;
const hostTenantSlug = `smoke-auth-${runId}`;
const hostTenantName = 'Smoke Host Auth Tenant';

async function main() {
  try {
    await cleanupHostLoginTenant();
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

    const hostTenant = await createHostLoginTenant(loginResponse.user.id);
    const hostLogin = await loginWithHost(`${hostTenantSlug}.opencore.test`);
    const hostLoginToken = assertString(
      hostLogin.accessToken,
      'host login accessToken',
    );
    const hostLoginPayload = decodeTokenPayload(hostLoginToken);
    assertEqual(
      hostLoginPayload.tid,
      hostTenant.id,
      'host login token tenant id',
    );
    assertEqual(
      hostLoginPayload.mid,
      hostTenant.membershipId,
      'host login token membership id',
    );
    assertEqual(hostLoginPayload.am, 'tenant', 'host login token access mode');
    assertEqual(
      hostLogin.user.activeTenant?.code,
      hostTenantCode,
      'host login tenant code',
    );

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
  } finally {
    await cleanupHostLoginTenant().catch(() => undefined);
    await disconnectSmokePrisma().catch(() => undefined);
  }
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

async function loginWithHost(host: string): Promise<LoginResponse> {
  let lastError: unknown;

  for (const password of getPasswordCandidates()) {
    try {
      const response = await request<LoginResult>(`${apiPrefix}/auth/login`, {
        body: {
          password,
          username: smoke.username,
        },
        expected: [200, 201],
        headers: { 'x-forwarded-host': host },
        method: 'POST',
      });

      if (response.status !== 'authenticated') {
        throw new Error(`Expected host login for ${host} to authenticate.`);
      }

      return response;
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

  throw new Error(`Unable to authenticate smoke admin with host ${host}.`, {
    cause: lastError,
  });
}

async function createHostLoginTenant(userId: string): Promise<{
  id: string;
  membershipId: string;
}> {
  const client = getSmokePrisma();
  const tenant = await client.tenant.create({
    data: {
      code: hostTenantCode,
      createdByUserId: userId,
      name: hostTenantName,
      slug: hostTenantSlug,
      status: 'active',
    },
  });
  const membership = await client.tenantMembership.create({
    data: {
      isOwner: true,
      joinedAt: new Date(),
      status: 'active',
      tenantId: tenant.id,
      userId,
    },
  });

  return { id: tenant.id, membershipId: membership.id };
}

async function cleanupHostLoginTenant(): Promise<void> {
  const client = getSmokePrisma();
  await client.tenant.deleteMany({
    where: { code: { startsWith: 'smoke.auth.' } },
  });
}

function getPasswordCandidates(): readonly string[] {
  return [
    process.env.OPENCORE_SMOKE_ADMIN_PASSWORD,
    process.env.BOOTSTRAP_ADMIN_PASSWORD,
    'admin123',
  ].filter((candidate, index, candidates): candidate is string => {
    return Boolean(candidate) && candidates.indexOf(candidate) === index;
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
