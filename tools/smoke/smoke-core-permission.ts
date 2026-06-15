import type { PermissionSummary } from '@opencore/sdk';

import {
  assertArray,
  assertEqual,
  assertIncludes,
  assertNumberAtLeast,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request } = smoke;

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const permissionCode = `core:smoke-permission-${runId}:read`;

async function main() {
  let createdPermission = false;
  let token: string | undefined;

  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      await request(`${apiPrefix}/docs-json`, { expected: [200] });
    }

    const loginResponse = await smoke.login();
    token = assertString(loginResponse.accessToken, 'login accessToken');

    const list = await clients.rbac.listPermissions(token);
    assertPermission(findPermission(list, 'core:permission:read'), {
      code: 'core:permission:read',
      system: true,
    });

    const detail = await clients.rbac.getPermission(
      token,
      'core:permission:read',
    );
    assertPermission(detail, {
      code: 'core:permission:read',
      system: true,
    });

    await smoke.apiRequest(
      `/core/permissions/${encodeURIComponent('core:permission:read')}`,
      {
        body: { title: 'Renamed System Permission' },
        expected: [400],
        method: 'PATCH',
        token,
      },
    );

    await smoke.apiRequest(
      `/core/permissions/${encodeURIComponent('core:permission:read')}`,
      {
        expected: [400],
        method: 'DELETE',
        token,
      },
    );

    const created = await clients.rbac.createPermission(token, {
      code: permissionCode,
      title: 'Smoke Permission Read',
    });
    createdPermission = true;
    assertPermission(created, { code: permissionCode, system: false });

    const fetched = await clients.rbac.getPermission(token, permissionCode);
    assertPermission(fetched, { code: permissionCode, system: false });

    const updated = await clients.rbac.updatePermission(token, permissionCode, {
      title: 'Smoke Permission Read Updated',
    });
    assertEqual(
      updated.title,
      'Smoke Permission Read Updated',
      'updated permission title',
    );

    const exportPreview = await clients.rbac.exportPermissions(token);
    assertEqual(exportPreview.scope, 'current-page', 'permission export scope');
    assertString(exportPreview.filename, 'permission export filename');
    assertNumberAtLeast(
      exportPreview.rowCount,
      1,
      'permission export rowCount',
    );
    assertArray(exportPreview.columns, 'permission export columns');
    assertIncludes(exportPreview.columns, 'code', 'permission export code');
    assertIncludes(exportPreview.columns, 'title', 'permission export title');

    await cleanupCreatedPermission(token, createdPermission);
    createdPermission = false;

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
    await cleanupCreatedPermission(token, createdPermission).catch(
      () => undefined,
    );
    throw error;
  }
}

async function cleanupCreatedPermission(
  token: string | undefined,
  createdPermission: boolean,
) {
  if (!token || !createdPermission) {
    return;
  }

  await smoke.apiRequest(
    `/core/permissions/${encodeURIComponent(permissionCode)}`,
    {
      expected: [200, 404],
      method: 'DELETE',
      token,
    },
  );
}

function findPermission(
  permissions: readonly PermissionSummary[],
  code: string,
) {
  const permission = permissions.find((candidate) => candidate.code === code);
  if (!permission) {
    throw new Error(`Expected permission list to include ${code}`);
  }
  return permission;
}

function assertPermission(
  value: PermissionSummary,
  expectations: { code: string; system?: boolean },
) {
  assertEqual(value.code, expectations.code, `${expectations.code} code`);
  assertString(value.title, `${expectations.code} title`);
  assertString(value.stage, `${expectations.code} stage`);

  if (expectations.system !== undefined) {
    assertEqual(
      value.system,
      expectations.system,
      `${expectations.code} system`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      status: 'fail',
      baseUrl,
      apiPrefix,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});
