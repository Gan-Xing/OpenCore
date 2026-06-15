import type { MenuSummary } from '@opencore/sdk';

import {
  assertArray,
  assertEqual,
  assertIncludes,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request } = smoke;

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const parentKey = `system.smoke-menu-${runId}`;
const childKey = `${parentKey}.child`;
const createdKeys: string[] = [];

async function main() {
  let token: string | undefined;

  try {
    await request('/health/live', { expected: [200] });
    await request('/health/ready', { expected: [200] });

    if (checkDocs) {
      await request(`${apiPrefix}/docs-json`, { expected: [200] });
    }

    const loginResponse = await smoke.login();
    token = assertString(loginResponse.accessToken, 'login accessToken');

    const menus = await clients.rbac.listMenus(token);

    const systemRoot = findMenu(menus, 'system');
    assertEqual(systemRoot.type, 'directory', 'system root type');
    assertEqual(systemRoot.path, '/system', 'system root path');
    assertEqual(systemRoot.status, 'enabled', 'system root status');

    const systemMenus = findMenu(menus, 'system.menus');
    assertEqual(systemMenus.parentKey, 'system', 'system.menus parent');
    assertEqual(systemMenus.type, 'menu', 'system.menus type');
    assertEqual(
      systemMenus.component,
      'System/Menus',
      'system.menus component',
    );
    assertEqual(systemMenus.hidden, false, 'system.menus visibility');

    const createdParent = await clients.rbac.createMenu(token, {
      cache: true,
      component: 'System/SmokeMenu',
      hidden: false,
      icon: 'AppstoreOutlined',
      key: parentKey,
      order: 997,
      parentKey: 'system',
      path: `/system/smoke-menu-${runId}`,
      permissionCode: 'core:menu:read',
      status: 'enabled',
      title: 'Smoke Menu Parent',
      type: 'menu',
    });
    createdKeys.push(parentKey);
    assertEqual(createdParent.parentKey, 'system', 'created parent parentKey');
    assertEqual(createdParent.cache, true, 'created parent cache');
    assertEqual(createdParent.hidden, false, 'created parent hidden');

    const createdChild = await clients.rbac.createMenu(token, {
      cache: false,
      component: 'System/SmokeMenuChild',
      hidden: false,
      key: childKey,
      order: 998,
      parentKey,
      path: `/system/smoke-menu-${runId}/child`,
      permissionCode: 'core:menu:read',
      status: 'enabled',
      title: 'Smoke Menu Child',
      type: 'menu',
    });
    createdKeys.push(childKey);
    assertEqual(createdChild.parentKey, parentKey, 'created child parentKey');

    const fetchedParent = await clients.rbac.getMenu(token, parentKey);
    assertEqual(fetchedParent.key, parentKey, 'detail menu key');
    assertEqual(
      fetchedParent.component,
      'System/SmokeMenu',
      'detail component',
    );

    await smoke.apiRequest(`/core/menus/${encodeURIComponent(parentKey)}`, {
      expected: [400],
      method: 'DELETE',
      token,
    });

    const updatedChild = await clients.rbac.updateMenu(token, childKey, {
      cache: true,
      component: 'System/SmokeMenuChildUpdated',
      hidden: true,
      permissionCode: null,
      status: 'disabled',
    });
    assertEqual(
      updatedChild.component,
      'System/SmokeMenuChildUpdated',
      'updated child component',
    );
    assertEqual(updatedChild.status, 'disabled', 'updated child status');
    assertEqual(updatedChild.cache, true, 'updated child cache');
    assertEqual(updatedChild.hidden, true, 'updated child hidden');
    assertEqual(
      updatedChild.permissionCode,
      undefined,
      'updated child permission clear',
    );

    const exportPreview = await clients.rbac.exportMenus(token);
    assertEqual(exportPreview.scope, 'current-page', 'menu export scope');
    assertArray(exportPreview.columns, 'menu export columns');
    assertIncludes(exportPreview.columns, 'parentKey', 'menu export parentKey');
    assertIncludes(exportPreview.columns, 'component', 'menu export component');
    assertIncludes(exportPreview.columns, 'status', 'menu export status');

    await cleanupCreatedMenus(token);

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
          'core.menu.list',
          'core.menu.seed-tree-metadata',
          'core.menu.create-parent',
          'core.menu.create-child',
          'core.menu.delete-parent-guard',
          'core.menu.detail',
          'core.menu.update',
          'core.menu.export',
          'core.menu.delete',
        ],
      }),
    );
  } catch (error) {
    await cleanupCreatedMenus(token).catch(() => undefined);
    throw error;
  }
}

async function cleanupCreatedMenus(token: string | undefined) {
  if (!token) {
    return;
  }

  for (const key of [...createdKeys].reverse()) {
    await smoke.apiRequest(`/core/menus/${encodeURIComponent(key)}`, {
      expected: [200, 404],
      method: 'DELETE',
      token,
    });
  }

  createdKeys.length = 0;
}

function findMenu(menus: readonly MenuSummary[], key: string) {
  const menu = menus.find((candidate) => candidate.key === key);
  if (!menu) {
    throw new Error(`Expected menu list to include ${key}`);
  }
  return menu;
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
