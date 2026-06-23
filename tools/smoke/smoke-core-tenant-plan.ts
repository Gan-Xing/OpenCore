#!/usr/bin/env node

import {
  assertArray,
  assertEqual,
  assertIncludes,
  assertNumberAtLeast,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, login, request } = smoke;

const runId = `${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
const planCode = `smoke.plan.${runId}`;
const updatedPlanCode = `smoke.plan.updated.${runId}`;
let token: string | undefined;
let createdPlanId: string | undefined;

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

    const initialPlans = await clients.tenancy.listTenantPlans(token);
    assertArray(initialPlans, 'tenant plan list');
    const rootPlan = initialPlans.find((plan) => plan.code === 'system.full');
    if (!rootPlan) {
      throw new Error('Expected system.full tenant plan');
    }
    assertNumberAtLeast(rootPlan.tenantCount, 1, 'system.full tenant count');

    const created = await clients.tenancy.createTenantPlan(token, {
      code: planCode,
      limits: { accountLimit: 7 },
      moduleCodes: ['core.tenant'],
      name: 'Smoke Tenant Plan',
      remark: 'created by smoke',
    });
    createdPlanId = created.id;
    assertEqual(created.code, planCode, 'created tenant plan code');
    assertEqual(created.tenantCount, 0, 'created tenant plan usage');
    assertIncludes(created.moduleCodes, 'core.tenant', 'created modules');

    const updated = await clients.tenancy.updateTenantPlan(token, created.id, {
      code: updatedPlanCode,
      enabled: false,
      limits: { accountLimit: 9 },
      moduleCodes: ['core.tenant', 'core.tenant-plan'],
      name: 'Smoke Tenant Plan Updated',
      remark: null,
    });
    assertEqual(updated.code, updatedPlanCode, 'updated tenant plan code');
    assertEqual(updated.enabled, false, 'updated tenant plan enabled');
    assertIncludes(updated.moduleCodes, 'core.tenant-plan', 'updated modules');

    const detail = await clients.tenancy.getTenantPlan(token, updated.id);
    assertEqual(detail.id, updated.id, 'tenant plan detail id');
    assertEqual(detail.tenantCount, 0, 'tenant plan detail usage');

    const invalidModule = await request<unknown>(
      `${apiPrefix}/core/tenancy/plans`,
      {
        body: {
          code: `smoke.plan.invalid.${runId}`,
          moduleCodes: ['core.missing'],
          name: 'Invalid Smoke Tenant Plan',
        },
        expected: [400],
        method: 'POST',
        token,
      },
    );
    assertEqual(
      getApiErrorCode(invalidModule),
      'TENANT_PLAN_MODULE_UNKNOWN',
      'invalid module error code',
    );

    const inUseDelete = await request<unknown>(
      `${apiPrefix}/core/tenancy/plans/${encodeURIComponent(rootPlan.id)}`,
      {
        expected: [400],
        method: 'DELETE',
        token,
      },
    );
    assertEqual(
      getApiErrorCode(inUseDelete),
      'TENANT_PLAN_IN_USE',
      'in-use plan delete error code',
    );

    const deleted = await clients.tenancy.deleteTenantPlan(token, updated.id);
    assertEqual(deleted.deleted, true, 'tenant plan deleted');
    createdPlanId = undefined;

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
          'core.tenant-plan.list',
          'core.tenant-plan.create',
          'core.tenant-plan.update',
          'core.tenant-plan.detail',
          'core.tenant-plan.module-guard',
          'core.tenant-plan.in-use-delete-blocked',
          'core.tenant-plan.delete',
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
  }
}

void main();

async function cleanup() {
  if (!token || !createdPlanId) {
    return;
  }

  await request(
    `${apiPrefix}/core/tenancy/plans/${encodeURIComponent(createdPlanId)}`,
    {
      expected: [200, 404],
      method: 'DELETE',
      token,
    },
  ).catch(() => undefined);
  createdPlanId = undefined;
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
