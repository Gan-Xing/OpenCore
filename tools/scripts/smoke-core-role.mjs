#!/usr/bin/env node

const DEFAULT_PORT = '39173';

const port = process.env.OPENCORE_SMOKE_PORT || DEFAULT_PORT;
const baseUrl = trimTrailingSlash(
  process.env.OPENCORE_SMOKE_BASE_URL || `http://127.0.0.1:${port}`,
);
const apiPrefix = normalizeApiPrefix(
  process.env.OPENCORE_SMOKE_API_PREFIX || '/api',
);
const checkDocs = parseBoolean(process.env.OPENCORE_SMOKE_CHECK_DOCS, true);
const username = process.env.OPENCORE_SMOKE_ADMIN_USERNAME || 'admin';
const passwordCandidates = [
  process.env.OPENCORE_SMOKE_ADMIN_PASSWORD,
  process.env.BOOTSTRAP_ADMIN_PASSWORD,
  'admin123',
].filter((candidate, index, candidates) => {
  return Boolean(candidate) && candidates.indexOf(candidate) === index;
});
const timeoutMs = Number(process.env.OPENCORE_SMOKE_TIMEOUT_MS || 10000);

const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const roleCode = `role_smoke_menu_${runId}`;
const smokeUsername = `role_menu_user_${runId}`;
const smokePassword = `RoleMenuSmoke-${runId}`;
let adminToken;
let smokeUserId;
let smokeUserToken;

class HttpStatusError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HttpStatusError';
    this.status = status;
  }
}

try {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    await request(`${apiPrefix}/docs-json`, { expected: [200] });
  }

  const loginResponse = await loginAdmin();

  adminToken = assertString(loginResponse.accessToken, 'login accessToken');

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

async function apiRequest(path, options = {}) {
  return request(`${apiPrefix}${path}`, {
    ...options,
    token: adminToken,
    expected: options.expected || [200, 201],
  });
}

async function loginAdmin() {
  let lastError;

  for (const password of passwordCandidates) {
    try {
      return await request(`${apiPrefix}/auth/login`, {
        method: 'POST',
        expected: [200, 201],
        body: {
          username,
          password,
        },
      });
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

  throw new Error(
    `Unable to authenticate smoke admin ${username}. Set OPENCORE_SMOKE_ADMIN_PASSWORD to the deployed admin password.`,
    { cause: lastError },
  );
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

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const expected = options.expected || [200];

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    const responseBody = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!expected.includes(response.status)) {
      throw new HttpStatusError(
        `${options.method || 'GET'} ${path} returned ${response.status}: ${formatBody(
          responseBody,
        )}`,
        response.status,
      );
    }

    return responseBody;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${options.method || 'GET'} ${path} timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function normalizeApiPrefix(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes'].includes(value.toLowerCase());
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Expected ${label} to be a non-empty string`);
  }
  return value;
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an array`);
  }
}

function assertIncludes(values, expected, label) {
  if (!values.includes(expected)) {
    throw new Error(`Expected ${label} to include ${expected}`);
  }
}

function assertNotIncludes(values, expected, label) {
  if (values.includes(expected)) {
    throw new Error(`Expected ${label} not to include ${expected}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `Expected ${label} to equal ${JSON.stringify(
        expected,
      )}, got ${JSON.stringify(actual)}`,
    );
  }
}

function formatBody(body) {
  if (typeof body === 'string') {
    return body.slice(0, 500);
  }

  return JSON.stringify(body).slice(0, 500);
}
