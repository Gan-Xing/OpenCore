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
const username = `tenant_member_${runId}`;
const password = 'TenantMemberSmoke1!';
let userId: string | undefined;

async function main() {
  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      await request(`${apiPrefix}/docs-json`, { expected: [200] });
    }

    const loginResponse = await login();
    const token = assertString(loginResponse.accessToken, 'login accessToken');
    smoke.setToken(token);

    const activeTenantCode = assertString(
      loginResponse.user.activeTenant?.code,
      'login active tenant code',
    );

    const createdUser = await apiRequest('/core/users', {
      method: 'POST',
      body: {
        username,
        displayName: 'Tenant Member Smoke User',
        password,
        roleCodes: ['viewer'],
        deptId: 'dept_headquarters',
        postCodes: ['admin'],
        enabled: true,
      },
    });
    userId = assertString(createdUser.id, 'created user id');

    const membersBefore = await apiRequest('/core/tenancy/members');
    assertArray(membersBefore, 'tenant members before');
    const member = findMemberByUsername(membersBefore, username);

    const updated = await apiRequest(
      `/core/tenancy/members/${encodeURIComponent(member.id)}/assignments`,
      {
        method: 'PATCH',
        body: {
          deptId: 'dept_operations',
          postCodes: ['engineer'],
          roleCodes: ['viewer'],
          status: 'suspended',
          tenantId: 'tenant_malicious_ignored',
        },
      },
    );
    assertEqual(updated.id, member.id, 'updated member id');
    assertEqual(updated.deptId, 'dept_operations', 'updated member dept');
    assertEqual(updated.status, 'suspended', 'updated member status');
    assertIncludes(updated.roleCodes, 'viewer', 'updated member roles');
    assertIncludes(updated.postCodes, 'engineer', 'updated member posts');

    const membersAfter = await apiRequest('/core/tenancy/members');
    const refreshed = findMemberByUsername(membersAfter, username);
    assertEqual(refreshed.deptId, 'dept_operations', 'listed member dept');
    assertEqual(refreshed.status, 'suspended', 'listed member status');
    const memberPage = await apiRequest(
      `/core/tenancy/members/page?deptId=dept_operations&keyword=${encodeURIComponent(username)}&page=1&pageSize=5&postCode=engineer&roleCode=viewer&status=suspended`,
    );
    assertEqual(memberPage.total, 1, 'tenant member page total');
    assertEqual(memberPage.items[0]?.id, member.id, 'tenant member page item');

    const userDetail = await apiRequest(
      `/core/users/${encodeURIComponent(userId)}`,
    );
    assertEqual(userDetail.enabled, false, 'legacy user enabled bridge');
    assertEqual(
      userDetail.deptId,
      'dept_operations',
      'legacy user dept bridge',
    );
    assertIncludes(userDetail.roleCodes, 'viewer', 'legacy user role bridge');
    assertIncludes(userDetail.postCodes, 'engineer', 'legacy user post bridge');

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
          'core.tenant-member.list',
          'core.tenant-member.page',
          'core.tenant-member.update',
          'core.tenant-member.body-tenant-ignored',
          'core.tenant-member.root-legacy-bridge',
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
  if (!userId) {
    return;
  }

  await apiRequest(`/core/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    expected: [200, 404],
  }).catch(() => undefined);
  userId = undefined;
}

function findMemberByUsername(members: readonly any[], value: string) {
  const member = members.find((item) => item.username === value);

  if (!member) {
    throw new Error(`Tenant member not found for ${value}`);
  }

  return member;
}
