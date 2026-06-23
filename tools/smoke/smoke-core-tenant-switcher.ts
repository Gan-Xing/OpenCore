#!/usr/bin/env node
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import {
  assertEqual,
  assertOpenApiPath,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, login, request } = smoke;

const runId = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
const tenantCode = `smoke.switch.${runId}`;
const tenantSlug = `smoke-switch-${runId}`;
let prisma: PrismaClient | undefined;

async function main() {
  try {
    await cleanupSmokeSwitchTenants();
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      const openApi = await request(`${apiPrefix}/docs-json`, {
        expected: [200],
      });
      assertOpenApiPath(openApi, '/api/auth/switch-tenant');
    }

    const loginResponse = await login();
    const rootToken = assertString(loginResponse.accessToken, 'root token');
    const rootMembershipId = assertString(
      loginResponse.user.activeMembership?.id,
      'root membership id',
    );
    const tenant = await createSwitchTenant(loginResponse.user.id);

    const switched = await clients.rbac.switchTenant(rootToken, {
      membershipId: tenant.membershipId,
    });
    const switchedToken = assertString(
      switched.accessToken,
      'switched accessToken',
    );

    assertEqual(
      switched.user.activeTenant?.code,
      tenantCode,
      'switched active tenant code',
    );
    assertEqual(
      switched.user.activeMembership?.id,
      tenant.membershipId,
      'switched membership id',
    );
    assertTenantOption(switched.user.tenantOptions, rootMembershipId, 'root');
    assertTenantOption(
      switched.user.tenantOptions,
      tenant.membershipId,
      tenantCode,
    );

    await request(`${apiPrefix}/auth/me`, {
      expected: [401, 403],
      token: rootToken,
    });
    const me = await request<any>(`${apiPrefix}/auth/me`, {
      expected: [200],
      token: switchedToken,
    });
    assertEqual(
      me.user.activeTenant?.code,
      tenantCode,
      'auth/me switched tenant code',
    );

    await cleanupSmokeSwitchTenants();

    console.log(
      JSON.stringify({
        status: 'pass',
        baseUrl,
        apiPrefix,
        checks: [
          'health.live',
          'health.ready',
          ...(checkDocs ? ['openapi.auth.switch-tenant'] : []),
          'auth.login',
          'admin.tenant-switch.fixture',
          'auth.switch-tenant',
          'auth.switch-tenant.old-token-revoked',
          'auth.switch-tenant.new-token-bound',
          'admin.tenant-switch.cleanup',
        ],
      }),
    );
  } catch (error) {
    await cleanupSmokeSwitchTenants().catch(() => undefined);
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
    await prisma?.$disconnect().catch(() => undefined);
  }
}

void main();

async function createSwitchTenant(userId: string): Promise<{
  id: string;
  membershipId: string;
}> {
  const client = await getSmokePrisma();
  const tenant = await client.tenant.create({
    data: {
      code: tenantCode,
      createdByUserId: userId,
      name: 'Smoke Switch Tenant',
      slug: tenantSlug,
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

async function cleanupSmokeSwitchTenants() {
  const client = await getSmokePrisma();
  await client.tenant.deleteMany({
    where: { code: { startsWith: 'smoke.switch.' } },
  });
}

async function getSmokePrisma(): Promise<PrismaClient> {
  if (!prisma) {
    const connectionString = assertString(
      process.env.DATABASE_URL,
      'DATABASE_URL',
    );
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  return prisma;
}

function assertTenantOption(
  options: readonly { code: string; membershipId: string }[],
  membershipId: string,
  label: string,
) {
  if (!options.some((option) => option.membershipId === membershipId)) {
    throw new Error(`Expected tenant options to include ${label}`);
  }
}
