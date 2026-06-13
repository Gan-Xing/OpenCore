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
const smokeUsername = `user_security_${runId}`;
const smokePassword = `UserSecuritySmoke-${runId}`;
const resetPassword = `UserSecurityReset-${runId}`;
const selfPassword = `UserSecuritySelf-${runId}`;
let adminToken;
let smokeUserId;
let smokeUserToken;
let originalAdminDisplayName;

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

  await request(`${apiPrefix}/core/users/simple-list`, {
    expected: [401],
  });

  const loginResponse = await loginAdmin();
  adminToken = assertString(loginResponse.accessToken, 'login accessToken');

  const adminProfile = await apiRequest('/core/users/profile');
  const adminUserId = assertString(adminProfile.id, 'admin profile id');
  originalAdminDisplayName = assertString(
    adminProfile.displayName,
    'admin profile displayName',
  );
  assertEqual(adminProfile.username, username, 'admin profile username');

  const profileDisplayName = `OpenCore Admin Smoke ${runId}`;
  const updatedProfile = await apiRequest('/core/users/profile', {
    method: 'PATCH',
    body: {
      displayName: profileDisplayName,
    },
  });
  assertEqual(
    updatedProfile.displayName,
    profileDisplayName,
    'updated admin profile displayName',
  );
  assertEqual(updatedProfile.system, true, 'updated admin profile system flag');

  const refreshedSession = await request(`${apiPrefix}/auth/me`, {
    token: adminToken,
    expected: [200, 201],
  });
  assertEqual(
    refreshedSession.user.displayName,
    profileDisplayName,
    'auth/me refreshed profile displayName',
  );
  await apiRequest('/core/users/profile', {
    method: 'PATCH',
    expected: [400],
    body: {
      displayName: '',
    },
  });
  await apiRequest(`/core/users/${encodeURIComponent(adminUserId)}`, {
    method: 'PATCH',
    expected: [400],
    body: {
      displayName: 'Management Update Must Still Fail',
    },
  });

  await apiRequest('/core/users', {
    method: 'POST',
    expected: [404],
    body: {
      username: `${smokeUsername}_bad_post`,
      displayName: 'Smoke User Bad Post',
      password: smokePassword,
      roleCodes: ['viewer'],
      postCodes: ['missing_post'],
      enabled: true,
    },
  });
  await apiRequest('/core/users?deptId=missing_dept', {
    expected: [404],
  });
  await apiRequest('/core/users/simple-list?deptId=missing_dept', {
    expected: [404],
  });

  const createdUser = await apiRequest('/core/users', {
    method: 'POST',
    body: {
      username: smokeUsername,
      displayName: 'Smoke User Security',
      password: smokePassword,
      roleCodes: ['viewer'],
      deptId: 'dept_operations',
      postCodes: ['engineer'],
      enabled: true,
    },
  });
  smokeUserId = assertString(createdUser.id, 'created smoke user id');
  assertEqual(createdUser.deptId, 'dept_operations', 'created user department');
  assertIncludes(createdUser.postCodes, 'engineer', 'created user posts');
  const operationUserOptions = await apiRequest(
    '/core/users/simple-list?deptId=dept_operations',
  );
  assertUserOptionIncludesUsername(
    operationUserOptions,
    smokeUsername,
    'operations department user options',
  );
  const smokeOption = findUserOption(operationUserOptions, smokeUsername);
  assertEqual(smokeOption.id, smokeUserId, 'simple-list option id');
  assertEqual(
    smokeOption.displayName,
    'Smoke User Security',
    'simple-list option displayName',
  );
  assertEqual(
    smokeOption.deptId,
    'dept_operations',
    'simple-list option department',
  );
  assertIncludes(
    smokeOption.postCodes,
    'engineer',
    'simple-list option post codes',
  );
  assertEqual(
    'roleCodes' in smokeOption,
    false,
    'simple-list option roleCodes exposure',
  );
  assertEqual(
    'enabled' in smokeOption,
    false,
    'simple-list option enabled exposure',
  );
  assertEqual(
    'system' in smokeOption,
    false,
    'simple-list option system exposure',
  );
  assertUserListIncludesUsername(
    await apiRequest('/core/users?deptId=dept_operations'),
    smokeUsername,
    'operations department user list',
  );
  assertUserListIncludesUsername(
    await apiRequest('/core/users?deptId=dept_headquarters'),
    smokeUsername,
    'headquarters subtree user list',
  );
  assertUserListNotIncludesUsername(
    await apiRequest('/core/users?deptId=dept_engineering'),
    smokeUsername,
    'engineering department user list',
  );
  assertUserOptionNotIncludesUsername(
    await apiRequest('/core/users/simple-list?deptId=dept_engineering'),
    smokeUsername,
    'engineering department user options',
  );

  const initialLogin = await loginSmokeUser(smokePassword, [200, 201]);
  smokeUserToken = assertString(
    initialLogin.accessToken,
    'initial smoke user accessToken',
  );
  assertIncludes(
    initialLogin.user.roleCodes,
    'viewer',
    'initial smoke user roles',
  );

  const disabledUser = await apiRequest(
    `/core/users/${encodeURIComponent(smokeUserId)}/status`,
    {
      method: 'PATCH',
      body: { enabled: false },
    },
  );
  assertEqual(disabledUser.enabled, false, 'disabled user status');
  assertUserOptionNotIncludesUsername(
    await apiRequest('/core/users/simple-list'),
    smokeUsername,
    'disabled simple-list user options',
  );
  assertEqual(
    disabledUser.revokedSessionCount,
    1,
    'disable user revoked session count',
  );
  await request(`${apiPrefix}/auth/me`, {
    token: smokeUserToken,
    expected: [401],
  });
  await loginSmokeUser(smokePassword, [401]);

  const enabledUser = await apiRequest(
    `/core/users/${encodeURIComponent(smokeUserId)}/status`,
    {
      method: 'PATCH',
      body: { enabled: true },
    },
  );
  assertEqual(enabledUser.enabled, true, 'enabled user status');
  assertUserOptionIncludesUsername(
    await apiRequest('/core/users/simple-list'),
    smokeUsername,
    'enabled simple-list user options',
  );

  const reenabledLogin = await loginSmokeUser(smokePassword, [200, 201]);
  smokeUserToken = assertString(
    reenabledLogin.accessToken,
    'reenabled smoke user accessToken',
  );

  const passwordResetUser = await apiRequest(
    `/core/users/${encodeURIComponent(smokeUserId)}/reset-password`,
    {
      method: 'POST',
      body: { password: resetPassword },
    },
  );
  assertEqual(
    passwordResetUser.revokedSessionCount,
    1,
    'reset password revoked session count',
  );
  await request(`${apiPrefix}/auth/me`, {
    token: smokeUserToken,
    expected: [401],
  });
  await loginSmokeUser(smokePassword, [401]);

  const resetLogin = await loginSmokeUser(resetPassword, [200, 201]);
  smokeUserToken = assertString(
    resetLogin.accessToken,
    'reset-password smoke user accessToken',
  );

  await request(`${apiPrefix}/core/users/profile/password`, {
    method: 'PATCH',
    token: smokeUserToken,
    expected: [401],
    body: {
      oldPassword: 'wrong-password',
      newPassword: selfPassword,
    },
  });
  await request(`${apiPrefix}/core/users/profile/password`, {
    method: 'PATCH',
    token: smokeUserToken,
    expected: [400],
    body: {
      oldPassword: resetPassword,
      newPassword: resetPassword,
    },
  });
  const selfPasswordUpdate = await request(
    `${apiPrefix}/core/users/profile/password`,
    {
      method: 'PATCH',
      token: smokeUserToken,
      body: {
        oldPassword: resetPassword,
        newPassword: selfPassword,
      },
    },
  );
  assertEqual(selfPasswordUpdate.changed, true, 'self password changed result');
  assertEqual(
    selfPasswordUpdate.revokedSessionCount,
    1,
    'self password change revoked session count',
  );
  await request(`${apiPrefix}/auth/me`, {
    token: smokeUserToken,
    expected: [401],
  });
  await loginSmokeUser(resetPassword, [401]);
  const selfPasswordLogin = await loginSmokeUser(selfPassword, [200, 201]);
  smokeUserToken = assertString(
    selfPasswordLogin.accessToken,
    'self-password smoke user accessToken',
  );

  const updatedUser = await apiRequest(
    `/core/users/${encodeURIComponent(smokeUserId)}`,
    {
      method: 'PATCH',
      body: {
        displayName: 'Smoke User Security Updated',
        roleCodes: [],
        deptId: null,
        postCodes: [],
        enabled: true,
      },
    },
  );
  assertEqual(
    updatedUser.revokedSessionCount,
    1,
    'update user revoked session count',
  );
  assertNotIncludes(updatedUser.roleCodes, 'viewer', 'updated user roles');
  assertNotIncludes(updatedUser.postCodes, 'engineer', 'updated user posts');
  await request(`${apiPrefix}/auth/me`, {
    token: smokeUserToken,
    expected: [401],
  });

  const updatedLogin = await loginSmokeUser(selfPassword, [200, 201]);
  smokeUserToken = assertString(
    updatedLogin.accessToken,
    'updated smoke user accessToken',
  );
  assertNotIncludes(
    updatedLogin.user.roleCodes,
    'viewer',
    'updated login roles',
  );

  const deletedUser = await apiRequest(
    `/core/users/${encodeURIComponent(smokeUserId)}`,
    {
      method: 'DELETE',
    },
  );
  assertEqual(deletedUser.deleted, true, 'deleted user result');
  assertEqual(
    deletedUser.revokedSessionCount,
    1,
    'delete user revoked session count',
  );
  await request(`${apiPrefix}/auth/me`, {
    token: smokeUserToken,
    expected: [401],
  });
  await loginSmokeUser(selfPassword, [401]);
  smokeUserId = undefined;

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
        'core.user.simple-list.auth-guard',
        'auth.login',
        'core.user.profile.get',
        'core.user.profile.update',
        'core.user.profile.auth-me-refresh',
        'core.user.profile.invalid-display-name-guard',
        'core.user.profile.management-system-user-guard',
        'core.user.post.unknown-rejected',
        'core.user.dept.unknown-rejected',
        'core.user.simple-list.dept.unknown-rejected',
        'core.user.create',
        'core.user.simple-list.authenticated-consumer',
        'core.user.simple-list.option-shape',
        'core.user.dept.create',
        'core.user.dept.filter',
        'core.user.dept.subtree-filter',
        'core.user.simple-list.dept-filter',
        'core.user.post.create',
        'core.user.status.disable',
        'core.user.simple-list.disabled-filtered',
        'core.user.status.revoke-session',
        'core.user.status.login-blocked',
        'core.user.status.enable',
        'core.user.simple-list.enabled-filter',
        'core.user.reset-password',
        'core.user.reset-password.revoke-session',
        'core.user.reset-password.old-password-blocked',
        'core.user.profile.password.wrong-old-password-guard',
        'core.user.profile.password.same-password-guard',
        'core.user.profile.password.update',
        'core.user.profile.password.revoke-session',
        'core.user.profile.password.old-password-blocked',
        'core.user.profile.password.new-password-login',
        'core.user.post.clear',
        'core.user.update.revoke-session',
        'core.user.delete.revoke-session',
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

async function loginSmokeUser(password, expected) {
  return request(`${apiPrefix}/auth/login`, {
    method: 'POST',
    expected,
    body: {
      username: smokeUsername,
      password,
    },
  });
}

async function cleanup() {
  if (!adminToken) {
    return;
  }

  await cleanupSmokeUserSessions();
  await restoreAdminProfile();

  if (smokeUserId) {
    await apiRequest(`/core/users/${encodeURIComponent(smokeUserId)}`, {
      method: 'DELETE',
      expected: [200, 404],
    }).catch(() => undefined);
    smokeUserId = undefined;
  }
}

async function restoreAdminProfile() {
  if (!originalAdminDisplayName) {
    return;
  }

  await apiRequest('/core/users/profile', {
    method: 'PATCH',
    expected: [200, 201],
    body: {
      displayName: originalAdminDisplayName,
    },
  }).catch(() => undefined);
  originalAdminDisplayName = undefined;
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
      actor: 'core.user.smoke',
      reason: 'cleanup smoke user security sessions',
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

function assertUserListIncludesUsername(users, expectedUsername, label) {
  if (!Array.isArray(users)) {
    throw new Error(`Expected ${label} to be an array`);
  }

  if (!users.some((user) => user.username === expectedUsername)) {
    throw new Error(`Expected ${label} to include ${expectedUsername}`);
  }
}

function assertUserListNotIncludesUsername(users, expectedUsername, label) {
  if (!Array.isArray(users)) {
    throw new Error(`Expected ${label} to be an array`);
  }

  if (users.some((user) => user.username === expectedUsername)) {
    throw new Error(`Expected ${label} not to include ${expectedUsername}`);
  }
}

function findUserOption(options, username) {
  assertArray(options, 'user options');
  const option = options.find((user) => user.username === username);

  if (!option) {
    throw new Error(`Expected user options to include ${username}`);
  }

  return option;
}

function assertUserOptionIncludesUsername(options, expectedUsername, label) {
  assertArray(options, label);

  if (!options.some((user) => user.username === expectedUsername)) {
    throw new Error(`Expected ${label} to include ${expectedUsername}`);
  }
}

function assertUserOptionNotIncludesUsername(options, expectedUsername, label) {
  assertArray(options, label);

  if (options.some((user) => user.username === expectedUsername)) {
    throw new Error(`Expected ${label} not to include ${expectedUsername}`);
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

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an array`);
  }
}

function formatBody(body) {
  if (typeof body === 'string') {
    return body.slice(0, 500);
  }

  return JSON.stringify(body).slice(0, 500);
}
