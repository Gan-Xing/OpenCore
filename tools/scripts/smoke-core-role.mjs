#!/usr/bin/env node

import {
  assertArray,
  assertEqual,
  assertIncludes,
  assertNotIncludes,
  assertString,
  createSmokeRuntime,
} from './smoke-helpers.mjs';

const smoke = createSmokeRuntime();
const { apiPrefix, apiRequest, baseUrl, checkDocs, login, request } = smoke;

const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const roleCode = `role_smoke_menu_${runId}`;
const smokeUsername = `role_menu_user_${runId}`;
const smokePassword = `RoleMenuSmoke-${runId}`;
let adminToken;
let smokeUserId;
let smokeUserToken;

try {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    await request(`${apiPrefix}/docs-json`, { expected: [200] });
  }

  const loginResponse = await login();

  adminToken = assertString(loginResponse.accessToken, 'login accessToken');
  smoke.setToken(adminToken);

  const initialAssignment = await apiRequest('/core/roles/admin/menus');
  assertArray(initialAssignment.menus, 'role menu assignment menus');
  assertIncludes(
    initialAssignment.menus.map((menu) => menu.key),
    'system.users',
    'assignment menus',
  );

  await apiRequest('/core/roles', {
    method: 'POST',
    body: {
      code: roleCode,
      name: 'Smoke Role Menu Assignment',
      permissionCodes: ['core:role:update'],
      dataScope: 'self',
    },
  });

  const createdUser = await apiRequest('/core/users', {
    method: 'POST',
    body: {
      username: smokeUsername,
      displayName: 'Smoke Role Menu User',
      password: smokePassword,
      roleCodes: [roleCode],
      enabled: true,
    },
  });
  smokeUserId = assertString(createdUser.id, 'created smoke user id');

  const smokeLogin = await request(`${apiPrefix}/auth/login`, {
    method: 'POST',
    expected: [200, 201],
    body: {
      username: smokeUsername,
      password: smokePassword,
    },
  });
  smokeUserToken = assertString(
    smokeLogin.accessToken,
    'smoke user accessToken',
  );
  assertIncludes(
    smokeLogin.user.permissionCodes,
    'core:role:update',
    'initial smoke user permissions',
  );

  const updatedAssignment = await apiRequest(
    `/core/roles/${encodeURIComponent(roleCode)}/menus`,
    {
      method: 'PATCH',
      body: {
        menuKeys: ['system.users', 'system.roles'],
      },
    },
  );
  assertEqual(
    updatedAssignment.revokedSessionCount,
    1,
    'role menu assignment revoked session count',
  );
  assertIncludes(
    updatedAssignment.menuKeys,
    'system.users',
    'updated role menu keys',
  );
  assertIncludes(
    updatedAssignment.permissionCodes,
    'core:user:read',
    'updated role menu permission codes',
  );
  assertIncludes(
    updatedAssignment.preservedPermissionCodes,
    'core:role:update',
    'preserved non-menu role permissions',
  );

  await request(`${apiPrefix}/auth/me`, {
    token: smokeUserToken,
    expected: [401],
  });

  const relogin = await request(`${apiPrefix}/auth/login`, {
    method: 'POST',
    expected: [200, 201],
    body: {
      username: smokeUsername,
      password: smokePassword,
    },
  });
  smokeUserToken = assertString(relogin.accessToken, 'relogin accessToken');
  assertIncludes(
    relogin.user.permissionCodes,
    'core:user:read',
    'relogin smoke user permissions',
  );
  assertIncludes(
    relogin.user.permissionCodes,
    'core:role:update',
    'relogin preserved role permissions',
  );

  const initialUserAssignment = await apiRequest(
    `/core/roles/${encodeURIComponent(roleCode)}/users`,
  );
  assertIncludes(
    initialUserAssignment.assignedUserIds,
    smokeUserId,
    'initial role user assignment',
  );

  const removedUserAssignment = await apiRequest(
    `/core/roles/${encodeURIComponent(roleCode)}/users`,
    {
      method: 'PATCH',
      body: {
        userIds: [],
      },
    },
  );
  assertEqual(
    removedUserAssignment.revokedSessionCount,
    1,
    'role user unassignment revoked session count',
  );
  assertNotIncludes(
    removedUserAssignment.assignedUserIds,
    smokeUserId,
    'removed role user assignment',
  );
  await request(`${apiPrefix}/auth/me`, {
    token: smokeUserToken,
    expected: [401],
  });

  const noRoleLogin = await request(`${apiPrefix}/auth/login`, {
    method: 'POST',
    expected: [200, 201],
    body: {
      username: smokeUsername,
      password: smokePassword,
    },
  });
  smokeUserToken = assertString(
    noRoleLogin.accessToken,
    'no-role relogin accessToken',
  );
  assertNotIncludes(
    noRoleLogin.user.roleCodes,
    roleCode,
    'no-role relogin role codes',
  );

  const reassignedUserAssignment = await apiRequest(
    `/core/roles/${encodeURIComponent(roleCode)}/users`,
    {
      method: 'PATCH',
      body: {
        userIds: [smokeUserId],
      },
    },
  );
  assertEqual(
    reassignedUserAssignment.revokedSessionCount,
    1,
    'role user assignment revoked session count',
  );
  assertIncludes(
    reassignedUserAssignment.assignedUserIds,
    smokeUserId,
    'reassigned role user assignment',
  );
  await request(`${apiPrefix}/auth/me`, {
    token: smokeUserToken,
    expected: [401],
  });

  const roleRelogin = await request(`${apiPrefix}/auth/login`, {
    method: 'POST',
    expected: [200, 201],
    body: {
      username: smokeUsername,
      password: smokePassword,
    },
  });
  smokeUserToken = assertString(
    roleRelogin.accessToken,
    'role relogin accessToken',
  );
  assertIncludes(roleRelogin.user.roleCodes, roleCode, 'role relogin roles');
  assertIncludes(
    roleRelogin.user.permissionCodes,
    'core:user:read',
    'role relogin permissions',
  );

  const disabledRole = await apiRequest(
    `/core/roles/${encodeURIComponent(roleCode)}/status`,
    {
      method: 'PATCH',
      body: {
        enabled: false,
      },
    },
  );
  assertEqual(
    disabledRole.revokedSessionCount,
    1,
    'role status disable revoked session count',
  );
  assertEqual(disabledRole.enabled, false, 'disabled role enabled flag');
  await request(`${apiPrefix}/auth/me`, {
    token: smokeUserToken,
    expected: [401],
  });

  const disabledRoleLogin = await request(`${apiPrefix}/auth/login`, {
    method: 'POST',
    expected: [200, 201],
    body: {
      username: smokeUsername,
      password: smokePassword,
    },
  });
  smokeUserToken = assertString(
    disabledRoleLogin.accessToken,
    'disabled-role relogin accessToken',
  );
  assertNotIncludes(
    disabledRoleLogin.user.roleCodes,
    roleCode,
    'disabled-role relogin role codes',
  );
  assertNotIncludes(
    disabledRoleLogin.user.permissionCodes,
    'core:user:read',
    'disabled-role relogin permissions',
  );

  const enabledRole = await apiRequest(
    `/core/roles/${encodeURIComponent(roleCode)}/status`,
    {
      method: 'PATCH',
      body: {
        enabled: true,
      },
    },
  );
  assertEqual(
    enabledRole.revokedSessionCount,
    1,
    'role status enable revoked session count',
  );
  assertEqual(enabledRole.enabled, true, 'enabled role enabled flag');
  await request(`${apiPrefix}/auth/me`, {
    token: smokeUserToken,
    expected: [401],
  });

  const enabledRoleLogin = await request(`${apiPrefix}/auth/login`, {
    method: 'POST',
    expected: [200, 201],
    body: {
      username: smokeUsername,
      password: smokePassword,
    },
  });
  smokeUserToken = assertString(
    enabledRoleLogin.accessToken,
    'enabled-role relogin accessToken',
  );
  assertIncludes(
    enabledRoleLogin.user.roleCodes,
    roleCode,
    'enabled-role relogin roles',
  );
  assertIncludes(
    enabledRoleLogin.user.permissionCodes,
    'core:user:read',
    'enabled-role relogin permissions',
  );

  const updatedRole = await apiRequest(
    `/core/roles/${encodeURIComponent(roleCode)}`,
    {
      method: 'PATCH',
      body: {
        name: 'Smoke Role Security Assignment',
      },
    },
  );
  assertEqual(
    updatedRole.revokedSessionCount,
    1,
    'role update revoked session count',
  );
  await request(`${apiPrefix}/auth/me`, {
    token: smokeUserToken,
    expected: [401],
  });

  const updatedRoleLogin = await request(`${apiPrefix}/auth/login`, {
    method: 'POST',
    expected: [200, 201],
    body: {
      username: smokeUsername,
      password: smokePassword,
    },
  });
  smokeUserToken = assertString(
    updatedRoleLogin.accessToken,
    'updated-role relogin accessToken',
  );
  assertIncludes(
    updatedRoleLogin.user.roleCodes,
    roleCode,
    'updated-role relogin roles',
  );

  const deletedRole = await apiRequest(
    `/core/roles/${encodeURIComponent(roleCode)}`,
    {
      method: 'DELETE',
    },
  );
  assertEqual(
    deletedRole.revokedSessionCount,
    1,
    'role delete revoked session count',
  );
  await request(`${apiPrefix}/auth/me`, {
    token: smokeUserToken,
    expected: [401],
  });

  const deletedRoleLogin = await request(`${apiPrefix}/auth/login`, {
    method: 'POST',
    expected: [200, 201],
    body: {
      username: smokeUsername,
      password: smokePassword,
    },
  });
  smokeUserToken = assertString(
    deletedRoleLogin.accessToken,
    'deleted-role relogin accessToken',
  );
  assertNotIncludes(
    deletedRoleLogin.user.roleCodes,
    roleCode,
    'deleted-role relogin roles',
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
        'core.role.menu-assignment.get',
        'core.role.menu-assignment.patch',
        'core.role.menu-assignment.preserve-non-menu-permission',
        'core.role.menu-assignment.revoke-session',
        'core.role.menu-assignment.relogin-refresh',
        'core.role.user-assignment.get',
        'core.role.user-assignment.unassign',
        'core.role.user-assignment.assign',
        'core.role.user-assignment.revoke-session',
        'core.role.user-assignment.relogin-refresh',
        'core.role.status.disable',
        'core.role.status.disabled-role-filtered',
        'core.role.status.enable',
        'core.role.update.revoke-session',
        'core.role.delete.revoke-session',
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

async function cleanup() {
  if (!adminToken) {
    return;
  }

  await cleanupSmokeUserSessions();

  if (smokeUserId) {
    await apiRequest(`/core/users/${encodeURIComponent(smokeUserId)}`, {
      method: 'DELETE',
      expected: [200, 404],
    }).catch(() => undefined);
    smokeUserId = undefined;
  }

  await apiRequest(`/core/roles/${encodeURIComponent(roleCode)}`, {
    method: 'DELETE',
    expected: [200, 404],
  }).catch(() => undefined);
}

async function cleanupSmokeUserSessions() {
  const page = await apiRequest(
    `/monitor/online-users?username=${encodeURIComponent(
      smokeUsername,
    )}&active=true&page=1&pageSize=100`,
    {
      expected: [200, 404],
    },
  ).catch(() => undefined);

  if (!page || !Array.isArray(page.items)) {
    return;
  }

  const ids = page.items
    .filter((session) => session.username === smokeUsername)
    .map((session) => session.id);

  if (ids.length === 0) {
    return;
  }

  await apiRequest('/monitor/online-users/kick-out', {
    method: 'POST',
    body: {
      ids,
      actor: 'core.role.smoke',
      reason: 'cleanup smoke role menu assignment sessions',
    },
    expected: [200, 404],
  }).catch(() => undefined);
}
