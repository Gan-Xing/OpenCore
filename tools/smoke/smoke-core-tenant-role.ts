#!/usr/bin/env node

import {
  assertArray,
  assertEqual,
  assertIncludes,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, login } = smoke;
const apiRequest = smoke.apiRequest as any;
const request = smoke.request as any;

const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const roleCode = `role_tenant_scope_${runId}`;
let adminToken: string | undefined;
let roleCreated = false;

async function main() {
  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      await request(`${apiPrefix}/docs-json`, { expected: [200] });
    }

    const loginResponse = await login();

    adminToken = assertString(loginResponse.accessToken, 'login accessToken');
    smoke.setToken(adminToken);

    const activeTenantCode = assertString(
      loginResponse.user.activeTenant?.code,
      'login active tenant code',
    );

    const createdRole = await apiRequest('/core/roles', {
      method: 'POST',
      body: {
        code: roleCode,
        name: 'Smoke Tenant Scoped Role',
        permissionCodes: ['core:role:read'],
        dataScope: 'self',
      },
    });
    roleCreated = true;
    assertEqual(createdRole.code, roleCode, 'created role code');
    assertIncludes(
      createdRole.permissionCodes,
      'core:role:read',
      'created role permission codes',
    );

    const roles = await apiRequest('/core/roles');
    assertArray(roles, 'role list');
    assertIncludes(
      roles.map((role) => role.code),
      roleCode,
      'active-tenant role list',
    );

    const fetchedRole = await apiRequest(
      `/core/roles/${encodeURIComponent(roleCode)}`,
    );
    assertEqual(fetchedRole.code, roleCode, 'fetched role code');

    const duplicate = await apiRequest('/core/roles', {
      method: 'POST',
      body: {
        code: roleCode,
        name: 'Duplicate Tenant Scoped Role',
        permissionCodes: [],
        dataScope: 'self',
      },
      expected: [409],
    });
    assertEqual(
      duplicate.error?.code,
      'SYSTEM_ROLE_ALREADY_EXISTS',
      'duplicate role error code',
    );

    const updatedRole = await apiRequest(
      `/core/roles/${encodeURIComponent(roleCode)}`,
      {
        method: 'PATCH',
        body: {
          name: 'Smoke Tenant Scoped Role Updated',
          permissionCodes: ['core:dashboard:read'],
        },
      },
    );
    assertEqual(
      updatedRole.name,
      'Smoke Tenant Scoped Role Updated',
      'updated role name',
    );
    assertIncludes(
      updatedRole.permissionCodes,
      'core:dashboard:read',
      'updated role permission codes',
    );

    await cleanup();

    console.log(
      JSON.stringify({
        status: 'pass',
        baseUrl,
        apiPrefix,
        tenantCode: activeTenantCode,
        checks: [
          'health.live',
          'health.ready',
          ...(checkDocs ? ['openapi.docs-json'] : []),
          'auth.login',
          'core.tenant-role.create',
          'core.tenant-role.list',
          'core.tenant-role.get',
          'core.tenant-role.duplicate-conflict',
          'core.tenant-role.update',
          'core.tenant-role.delete',
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
  if (!adminToken || !roleCreated) {
    return;
  }

  await apiRequest(`/core/roles/${encodeURIComponent(roleCode)}`, {
    method: 'DELETE',
    expected: [200, 404],
  }).catch(() => undefined);
  roleCreated = false;
}
