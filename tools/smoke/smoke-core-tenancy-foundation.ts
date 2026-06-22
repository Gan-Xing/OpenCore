#!/usr/bin/env node

import {
  assertArray,
  assertEqual,
  assertIncludes,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, checkDocs, clients, login, request } = smoke;

async function main() {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    await request(`${apiPrefix}/docs-json`, { expected: [200] });
  }

  const loginResponse = await login();
  const token = assertString(loginResponse.accessToken, 'login accessToken');
  smoke.setToken(token);

  const summary = await clients.tenancy.getFoundationSummary(token);
  assertEqual(summary.rootTenantCode, 'root', 'root tenant code');
  assertEqual(
    summary.requestContext?.tenantId,
    'tenant_root',
    'foundation request context tenant',
  );
  assertArray(summary.tenants, 'tenant foundation tenants');
  assertArray(summary.plans, 'tenant foundation plans');
  assertArray(summary.platformRoles, 'tenant foundation platform roles');

  const rootTenant = summary.tenants.find((tenant) => tenant.code === 'root');
  if (!rootTenant) {
    throw new Error('Expected root tenant in foundation summary');
  }
  assertEqual(rootTenant.status, 'active', 'root tenant status');
  assertIncludes(rootTenant.ownerUsernames, 'admin', 'root tenant owners');

  const rootPlan = summary.plans.find((plan) => plan.code === 'system.full');
  if (!rootPlan) {
    throw new Error('Expected system.full tenant plan in foundation summary');
  }
  assertIncludes(rootPlan.moduleCodes, 'core.tenant', 'root plan modules');
  assertIncludes(rootPlan.moduleCodes, 'core.tenant-plan', 'root plan modules');
  assertIncludes(
    rootPlan.moduleCodes,
    'core.tenant-member',
    'root plan modules',
  );

  const platformAdmin = summary.platformRoles.find(
    (role) => role.code === 'platform-admin',
  );
  if (!platformAdmin) {
    throw new Error('Expected platform-admin role in foundation summary');
  }
  assertIncludes(
    platformAdmin.permissionCodes,
    'platform:tenant:read',
    'platform admin permissions',
  );
  assertIncludes(
    platformAdmin.permissionCodes,
    'platform:tenant:visit',
    'platform admin permissions',
  );

  assertEqual(
    summary.backfill.missingRootMembershipUsernames.length,
    0,
    'missing root memberships',
  );
  assertEqual(
    summary.backfill.rootMembershipCount,
    summary.backfill.userCount,
    'root membership backfill count',
  );
  assertEqual(
    summary.backfill.rootMembershipRoleCount,
    summary.backfill.userRoleCount,
    'root membership role backfill count',
  );
  assertEqual(
    summary.backfill.rootMembershipPostCount,
    summary.backfill.userPostCount,
    'root membership post backfill count',
  );

  const tampered = await request<typeof summary>(
    `${apiPrefix}/core/tenancy/foundation`,
    {
      headers: { 'tenant-id': 'tenant_not_allowed' },
      token,
    },
  );
  assertEqual(tampered.rootTenantCode, 'root', 'tampered header root tenant');
  assertEqual(
    tampered.requestContext?.tenantId,
    'tenant_root',
    'tampered header request context tenant',
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
