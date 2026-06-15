#!/usr/bin/env node

import {
  assertArray,
  assertEqual,
  assertIncludes,
  assertString,
  createSmokeRuntime,
} from './smoke-helpers.mjs';

const smoke = createSmokeRuntime();
const { apiPrefix, apiRequest, baseUrl, checkDocs, login, request } = smoke;

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const parentKey = `system.smoke-menu-${runId}`;
const childKey = `${parentKey}.child`;
let token;
const createdKeys = [];

try {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    await request(`${apiPrefix}/docs-json`, { expected: [200] });
  }

  const loginResponse = await login();

  token = assertString(loginResponse.accessToken, 'login accessToken');
  smoke.setToken(token);

  const menus = await apiRequest('/core/menus');
  assertArray(menus, 'menu list');

  const systemRoot = findMenu(menus, 'system');
  assertEqual(systemRoot.type, 'directory', 'system root type');
  assertEqual(systemRoot.path, '/system', 'system root path');
  assertEqual(systemRoot.status, 'enabled', 'system root status');

  const systemMenus = findMenu(menus, 'system.menus');
  assertEqual(systemMenus.parentKey, 'system', 'system.menus parent');
  assertEqual(systemMenus.type, 'menu', 'system.menus type');
  assertEqual(systemMenus.component, 'System/Menus', 'system.menus component');
  assertEqual(systemMenus.hidden, false, 'system.menus visibility');

  const createdParent = await apiRequest('/core/menus', {
    method: 'POST',
    body: {
      key: parentKey,
      parentKey: 'system',
      title: 'Smoke Menu Parent',
      type: 'menu',
      path: `/system/smoke-menu-${runId}`,
      icon: 'AppstoreOutlined',
      component: 'System/SmokeMenu',
      permissionCode: 'core:menu:read',
      order: 997,
      status: 'enabled',
      cache: true,
      hidden: false,
    },
  });
  createdKeys.push(parentKey);
  assertEqual(createdParent.parentKey, 'system', 'created parent parentKey');
  assertEqual(createdParent.cache, true, 'created parent cache');
  assertEqual(createdParent.hidden, false, 'created parent hidden');

  const createdChild = await apiRequest('/core/menus', {
    method: 'POST',
    body: {
      key: childKey,
      parentKey,
      title: 'Smoke Menu Child',
      type: 'menu',
      path: `/system/smoke-menu-${runId}/child`,
      component: 'System/SmokeMenuChild',
      permissionCode: 'core:menu:read',
      order: 998,
      status: 'enabled',
      cache: false,
      hidden: false,
    },
  });
  createdKeys.push(childKey);
  assertEqual(createdChild.parentKey, parentKey, 'created child parentKey');

  const fetchedParent = await apiRequest(
    `/core/menus/${encodeURIComponent(parentKey)}`,
  );
  assertEqual(fetchedParent.key, parentKey, 'detail menu key');
  assertEqual(fetchedParent.component, 'System/SmokeMenu', 'detail component');

  await apiRequest(`/core/menus/${encodeURIComponent(parentKey)}`, {
    method: 'DELETE',
    expected: [400],
  });

  const updatedChild = await apiRequest(
    `/core/menus/${encodeURIComponent(childKey)}`,
    {
      method: 'PATCH',
      body: {
        component: 'System/SmokeMenuChildUpdated',
        permissionCode: null,
        status: 'disabled',
        cache: true,
        hidden: true,
      },
    },
  );
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

  const exportPreview = await apiRequest('/core/menus/export');
  assertEqual(exportPreview.scope, 'current-page', 'menu export scope');
  assertArray(exportPreview.columns, 'menu export columns');
  assertIncludes(exportPreview.columns, 'parentKey', 'menu export parentKey');
  assertIncludes(exportPreview.columns, 'component', 'menu export component');
  assertIncludes(exportPreview.columns, 'status', 'menu export status');

  await cleanupCreatedMenus();

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
  await cleanupCreatedMenus().catch(() => undefined);
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

async function cleanupCreatedMenus() {
  if (!token) {
    return;
  }

  for (const key of [...createdKeys].reverse()) {
    await apiRequest(`/core/menus/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      expected: [200, 404],
    });
  }

  createdKeys.length = 0;
}

function findMenu(menus, key) {
  const menu = menus.find((candidate) => candidate.key === key);
  if (!menu) {
    throw new Error(`Expected menu list to include ${key}`);
  }
  return menu;
}
