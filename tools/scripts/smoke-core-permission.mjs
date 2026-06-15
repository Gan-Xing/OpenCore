#!/usr/bin/env node

import {
  assertArray,
  assertEqual,
  assertIncludes,
  assertNumberAtLeast,
  assertString,
  createSmokeRuntime,
} from './smoke-helpers.mjs';

const smoke = createSmokeRuntime();
const { apiPrefix, apiRequest, baseUrl, checkDocs, login, request } = smoke;

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const permissionCode = `core:smoke-permission-${runId}:read`;
let token;
let createdPermission = false;

try {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    await request(`${apiPrefix}/docs-json`, { expected: [200] });
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');
  smoke.setToken(token);

  const list = await apiRequest('/core/permissions');
  assertArray(list, 'permission list');
  assertPermission(
    findPermission(list, 'core:permission:read'),
    'core:permission:read',
    { system: true },
  );

  const detail = await apiRequest(
    `/core/permissions/${encodeURIComponent('core:permission:read')}`,
  );
  assertPermission(detail, 'core:permission:read', { system: true });

  await apiRequest(
    `/core/permissions/${encodeURIComponent('core:permission:read')}`,
    {
      method: 'PATCH',
      expected: [400],
      body: { title: 'Renamed System Permission' },
    },
  );

  await apiRequest(
    `/core/permissions/${encodeURIComponent('core:permission:read')}`,
    {
      method: 'DELETE',
      expected: [400],
    },
  );

  const created = await apiRequest('/core/permissions', {
    method: 'POST',
    body: {
      code: permissionCode,
      title: 'Smoke Permission Read',
    },
  });
  createdPermission = true;
  assertPermission(created, permissionCode, { system: false });

  const fetched = await apiRequest(
    `/core/permissions/${encodeURIComponent(permissionCode)}`,
  );
  assertPermission(fetched, permissionCode, { system: false });

  const updated = await apiRequest(
    `/core/permissions/${encodeURIComponent(permissionCode)}`,
    {
      method: 'PATCH',
      body: { title: 'Smoke Permission Read Updated' },
    },
  );
  assertEqual(
    updated.title,
    'Smoke Permission Read Updated',
    'updated permission title',
  );

  const exportPreview = await apiRequest('/core/permissions/export');
  assertEqual(exportPreview.scope, 'current-page', 'permission export scope');
  assertString(exportPreview.filename, 'permission export filename');
  assertNumberAtLeast(exportPreview.rowCount, 1, 'permission export rowCount');
  assertArray(exportPreview.columns, 'permission export columns');
  assertIncludes(exportPreview.columns, 'code', 'permission export code');
  assertIncludes(exportPreview.columns, 'title', 'permission export title');

  await cleanupCreatedPermission();

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
        'core.permission.list',
        'core.permission.system-detail',
        'core.permission.system-update-guard',
        'core.permission.system-delete-guard',
        'core.permission.create',
        'core.permission.detail',
        'core.permission.update',
        'core.permission.export',
        'core.permission.delete',
      ],
    }),
  );
} catch (error) {
  await cleanupCreatedPermission().catch(() => undefined);
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

async function cleanupCreatedPermission() {
  if (!token || !createdPermission) {
    return;
  }

  await apiRequest(`/core/permissions/${encodeURIComponent(permissionCode)}`, {
    method: 'DELETE',
    expected: [200, 404],
  });
  createdPermission = false;
}

function findPermission(permissions, code) {
  const permission = permissions.find((candidate) => candidate.code === code);
  if (!permission) {
    throw new Error(`Expected permission list to include ${code}`);
  }
  return permission;
}

function assertPermission(value, code, expectations = {}) {
  if (!value || typeof value !== 'object') {
    throw new Error(`Expected permission ${code} to be an object`);
  }
  assertEqual(value.code, code, `${code} code`);
  assertString(value.title, `${code} title`);
  assertString(value.stage, `${code} stage`);

  for (const [key, expected] of Object.entries(expectations)) {
    assertEqual(value[key], expected, `${code} ${key}`);
  }
}
