#!/usr/bin/env node
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import {
  assertArray,
  assertEqual,
  assertString,
  createTypedSmokeRuntime,
  delay,
  formatBody,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, login, request } = smoke;

const runId = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
const tenantCode = `smoke.tenant.${runId}`;
const updatedTenantCode = `smoke.tenant.updated.${runId}`;
const tenantSlug = `smoke-tenant-${runId}`;
const updatedTenantSlug = `smoke-tenant-updated-${runId}`;
let token: string | undefined;
let prisma: PrismaClient | undefined;

async function main() {
  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      await request(`${apiPrefix}/docs-json`, { expected: [200] });
    }

    const loginResponse = await login();
    token = assertString(loginResponse.accessToken, 'login accessToken');
    smoke.setToken(token);

    const initialTenants = await clients.tenancy.listTenants(token);
    assertArray(initialTenants, 'tenant list');
    const rootTenant = initialTenants.find((tenant) => tenant.code === 'root');
    if (!rootTenant) {
      throw new Error('Expected root tenant');
    }

    const created = await request<any>(`${apiPrefix}/core/tenancy/tenants`, {
      body: {
        accountLimit: 8,
        code: tenantCode,
        contactName: 'Smoke Tenant Owner',
        name: 'Smoke Tenant',
        planCode: 'system.full',
        slug: tenantSlug,
        tenantId: 'tenant_malicious_ignored',
      },
      expected: [201],
      method: 'POST',
      token,
    });
    assertEqual(created.code, tenantCode, 'created tenant code');
    assertEqual(created.slug, tenantSlug, 'created tenant slug');
    assertEqual(created.planCode, 'system.full', 'created tenant plan');
    assertEqual(created.membershipCount, 0, 'created tenant members');

    const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
    const updated = await clients.tenancy.updateTenant(token, created.id, {
      accountLimit: 10,
      code: updatedTenantCode,
      contactMobile: '15500002222',
      contactName: null,
      expiresAt,
      name: 'Smoke Tenant Updated',
      planCode: null,
      slug: updatedTenantSlug,
    });
    assertEqual(updated.code, updatedTenantCode, 'updated tenant code');
    assertEqual(updated.planCode, null, 'updated tenant plan cleared');
    assertEqual(updated.accountLimit, 10, 'updated tenant account limit');

    const suspended = await clients.tenancy.setTenantStatus(token, updated.id, {
      status: 'suspended',
    });
    assertEqual(suspended.status, 'suspended', 'suspended tenant status');

    const active = await clients.tenancy.setTenantStatus(token, updated.id, {
      status: 'active',
    });
    assertEqual(active.status, 'active', 'reactivated tenant status');
    assertEqual(active.expiresAt, null, 'reactivated tenant expiry');

    const detail = await clients.tenancy.getTenant(token, updated.id);
    assertEqual(detail.id, updated.id, 'tenant detail id');
    const tenantsAfter = await clients.tenancy.listTenants(token);
    if (!tenantsAfter.some((tenant) => tenant.id === updated.id)) {
      throw new Error('Expected updated tenant in list');
    }
    const tenantPage = await clients.tenancy.listTenantsPage(token, {
      keyword: updatedTenantCode,
      orderBy: 'code',
      orderDirection: 'desc',
      page: 1,
      pageSize: 5,
      status: 'active',
    });
    assertEqual(tenantPage.total, 1, 'tenant page total');
    assertEqual(tenantPage.items[0]?.id, updated.id, 'tenant page item');
    await assertTenantAudit(updated.id);

    const missingPlan = await request<unknown>(
      `${apiPrefix}/core/tenancy/tenants`,
      {
        body: {
          code: `${tenantCode}.missing`,
          name: 'Missing Plan Tenant',
          planCode: 'missing.plan',
          slug: `${tenantSlug}-missing`,
        },
        expected: [404],
        method: 'POST',
        token,
      },
    );
    assertEqual(
      getApiErrorCode(missingPlan),
      'TENANT_PLAN_NOT_FOUND',
      'missing plan error code',
    );

    const rootStatus = await request<unknown>(
      `${apiPrefix}/core/tenancy/tenants/${encodeURIComponent(rootTenant.id)}/status`,
      {
        body: { status: 'suspended' },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );
    assertEqual(
      getApiErrorCode(rootStatus),
      'TENANT_ROOT_STATUS_IMMUTABLE',
      'root status error code',
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
          ...(checkDocs ? ['openapi.docs-json'] : []),
          'auth.login',
          'core.tenant.list',
          'core.tenant.create',
          'core.tenant.body-tenant-ignored',
          'core.tenant.update',
          'core.tenant.status-suspend',
          'core.tenant.status-activate',
          'core.tenant.detail',
          'core.tenant.page',
          'core.tenant.audit-recorded',
          'core.tenant.missing-plan-guard',
          'core.tenant.root-status-guard',
          'core.tenant.cleanup',
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

async function assertTenantAudit(tenantId: string) {
  const client = await getSmokePrisma();
  let latestRows: unknown[] = [];

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const rows = await client.auditLog.findMany({
      where: {
        resource: 'core.tenancy.tenant',
        resourceId: tenantId,
        tenantId: 'tenant_root',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    latestRows = rows;

    const actions = new Set(rows.map((row) => row.action));
    if (actions.has('update') && actions.has('set-status')) {
      return;
    }

    await delay(250);
  }

  throw new Error(
    `Tenant lifecycle audit log was not recorded; latest rows=${formatBody(
      latestRows,
    )}`,
  );
}

async function cleanup() {
  const client = await getSmokePrisma();
  await client.tenant.deleteMany({
    where: { code: { in: [tenantCode, updatedTenantCode] } },
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

function getApiErrorCode(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  if ('code' in value && typeof value.code === 'string') {
    return value.code;
  }

  if (
    'error' in value &&
    value.error &&
    typeof value.error === 'object' &&
    'code' in value.error &&
    typeof value.error.code === 'string'
  ) {
    return value.error.code;
  }

  return undefined;
}
