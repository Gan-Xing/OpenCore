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
const tenantCode = `smoke.visit.${runId}`;
const tenantSlug = `smoke-visit-${runId}`;
let prisma: PrismaClient | undefined;

async function main() {
  try {
    await cleanup();
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      const openApi = await request(`${apiPrefix}/docs-json`, {
        expected: [200],
      });
      assertOpenApiPath(openApi, '/api/auth/platform-visit');
    }

    const loginResponse = await login();
    const rootToken = assertString(loginResponse.accessToken, 'root token');
    const tenant = await clients.tenancy.createTenant(rootToken, {
      code: tenantCode,
      name: 'Smoke Visit Tenant',
      slug: tenantSlug,
    });

    const visit = await clients.rbac.visitTenantAsPlatform(rootToken, {
      reason: 'platform visit smoke',
      tenantId: tenant.id,
    });
    const visitToken = assertString(visit.accessToken, 'visit accessToken');

    assertEqual(visit.user.accessMode, 'platform-visit', 'visit access mode');
    assertEqual(visit.user.activeTenant?.code, tenantCode, 'visit tenant code');
    assertEqual(
      visit.user.activeMembership?.id,
      undefined,
      'visit active membership',
    );

    await request(`${apiPrefix}/auth/me`, {
      expected: [401, 403],
      token: rootToken,
    });
    const me = await request<any>(`${apiPrefix}/auth/me`, {
      expected: [200],
      token: visitToken,
    });
    assertEqual(me.user.accessMode, 'platform-visit', 'auth/me visit mode');
    assertEqual(
      me.user.activeTenant?.code,
      tenantCode,
      'auth/me visit tenant code',
    );

    const foundation = await clients.tenancy.getFoundationSummary(visitToken);
    assertEqual(
      foundation.requestContext?.tenantId,
      tenant.id,
      'platform visit request tenant',
    );
    assertEqual(
      foundation.requestContext?.accessMode,
      'platform-visit',
      'platform visit request mode',
    );

    await cleanup();

    console.log(
      JSON.stringify({
        status: 'pass',
        baseUrl,
        apiPrefix,
        checks: [
          'health.live',
          'health.ready',
          ...(checkDocs ? ['openapi.auth.platform-visit'] : []),
          'auth.login',
          'core.platform-visit.tenant-create',
          'auth.platform-visit',
          'auth.platform-visit.old-token-revoked',
          'auth.platform-visit.me-preserves-mode',
          'auth.platform-visit.request-context',
          'core.platform-visit.cleanup',
        ],
      }),
    );
  } catch (error) {
    await cleanup().catch(() => undefined);
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

async function cleanup() {
  const client = await getSmokePrisma();
  await client.tenant.deleteMany({
    where: { code: { startsWith: 'smoke.visit.' } },
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
