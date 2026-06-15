#!/usr/bin/env node

import {
  assertArray,
  assertEqual,
  assertNumber,
  assertString,
  createSmokeRuntime,
} from './smoke-helpers.mjs';

const smoke = createSmokeRuntime();
const { apiPrefix, apiRequest, baseUrl, checkDocs, login, request } = smoke;

const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const deptCode = `smoke_dept_${runId}`;
const siblingDeptCode = `smoke_dept_sibling_${runId}`;
const boundUsername = `dept_user_${runId}`;
const boundPassword = `DeptSmokePassword1!`;
let token;
const createdDeptIds = [];
const createdUserIds = [];

try {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    await request(`${apiPrefix}/docs-json`, { expected: [200] });
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');
  smoke.setToken(token);

  const seededOptions = await publicDeptOptions();
  assertOptionIdsInclude(
    seededOptions,
    ['dept_headquarters', 'dept_engineering', 'dept_operations'],
    'seeded departments',
  );

  await apiRequest('/core/depts', {
    method: 'POST',
    expected: [400],
    body: {
      code: `${deptCode}_bad`,
      name: 'OpenCore Bad Smoke Dept',
      order: -1,
    },
  });

  const createdDept = await apiRequest('/core/depts', {
    method: 'POST',
    body: {
      code: deptCode,
      name: 'OpenCore Smoke Dept',
      parentId: 'dept_operations',
      order: 35,
      leader: 'Smoke Lead',
      enabled: false,
    },
  });
  createdDeptIds.push(assertString(createdDept.id, 'created dept id'));
  assertEqual(createdDept.code, deptCode, 'created dept code');
  assertEqual(createdDept.enabled, false, 'created dept enabled');

  assertDeptTreeContains(
    await apiRequest('/core/depts?enabled=false'),
    createdDept.id,
    'disabled dept list',
  );
  const deptDetail = await apiRequest(
    `/core/depts/${encodeURIComponent(createdDept.id)}`,
  );
  assertEqual(deptDetail.id, createdDept.id, 'dept detail id');

  assertOptionIdsExclude(
    await publicDeptOptions(),
    [createdDept.id],
    'disabled simple-list options',
  );

  const enabledDept = await apiRequest(
    `/core/depts/${encodeURIComponent(createdDept.id)}`,
    {
      method: 'PATCH',
      body: {
        enabled: true,
        name: 'OpenCore Smoke Dept Enabled',
        order: 5,
      },
    },
  );
  assertEqual(enabledDept.enabled, true, 'enabled dept update');
  assertEqual(enabledDept.order, 5, 'enabled dept order');

  const enabledOptions = await publicDeptOptions();
  const smokeOption = findOption(enabledOptions, createdDept.id);
  assertEqual(
    smokeOption.name,
    'OpenCore Smoke Dept Enabled',
    'simple-list option name',
  );
  assertEqual(
    smokeOption.parentId,
    'dept_operations',
    'simple-list option parentId',
  );
  assertEqual(smokeOption.order, 5, 'simple-list option order');
  assertEqual('code' in smokeOption, false, 'simple-list option code exposure');
  assertEqual(
    'enabled' in smokeOption,
    false,
    'simple-list option enabled exposure',
  );
  assertEqual(
    'children' in smokeOption,
    false,
    'simple-list option children exposure',
  );

  const siblingDept = await apiRequest('/core/depts', {
    method: 'POST',
    body: {
      code: siblingDeptCode,
      name: 'OpenCore Smoke Dept Sibling',
      parentId: 'dept_operations',
      order: 6,
      enabled: true,
    },
  });
  createdDeptIds.push(assertString(siblingDept.id, 'sibling dept id'));

  await apiRequest('/core/depts/order', {
    method: 'PATCH',
    expected: [400],
    body: {
      items: [
        { id: createdDept.id, order: 10 },
        { id: createdDept.id, order: 20 },
      ],
    },
  });
  await apiRequest('/core/depts/order', {
    method: 'PATCH',
    expected: [404],
    body: {
      items: [{ id: `missing_${createdDept.id}`, order: 10 }],
    },
  });
  await apiRequest('/core/depts/order', {
    method: 'PATCH',
    expected: [400],
    body: {
      items: [
        { id: createdDept.id, order: 10 },
        { id: 'dept_engineering', order: 20 },
      ],
    },
  });
  await apiRequest('/core/depts/order', {
    method: 'PATCH',
    expected: [400],
    body: {
      items: [{ id: createdDept.id, order: '1' }],
    },
  });

  const orderUpdate = await apiRequest('/core/depts/order', {
    method: 'PATCH',
    body: {
      items: [
        { id: siblingDept.id, order: 1 },
        { id: createdDept.id, order: 2 },
      ],
    },
  });
  assertEqual(orderUpdate.updatedCount, 2, 'dept order updated count');
  assertRelativeOrder(
    orderUpdate.items.map((item) => item.id),
    [siblingDept.id, createdDept.id],
    'dept order mutation items',
  );
  assertRelativeOrder(
    getSiblingIds(await apiRequest('/core/depts'), 'dept_operations'),
    [siblingDept.id, createdDept.id],
    'dept tree sibling order',
  );
  assertRelativeOrder(
    (await publicDeptOptions()).map((option) => option.id),
    [siblingDept.id, createdDept.id],
    'dept simple-list sibling order',
  );

  const exportPreview = await apiRequest('/core/depts/export?enabled=true');
  assertEqual(exportPreview.scope, 'current-page', 'dept export scope');
  assertArray(exportPreview.columns, 'dept export columns');

  const boundUser = await apiRequest('/core/users', {
    method: 'POST',
    body: {
      username: boundUsername,
      displayName: 'Dept Bound Smoke User',
      password: boundPassword,
      roleCodes: ['viewer'],
      deptId: createdDept.id,
      postCodes: ['engineer'],
      enabled: true,
    },
  });
  createdUserIds.push(assertString(boundUser.id, 'dept bound user id'));
  await apiRequest(`/core/depts/${encodeURIComponent(createdDept.id)}`, {
    method: 'DELETE',
    expected: [400],
  });
  const boundUserDetail = await apiRequest(
    `/core/users/${encodeURIComponent(boundUser.id)}`,
  );
  assertEqual(
    boundUserDetail.deptId,
    createdDept.id,
    'dept-bound user department after failed delete',
  );

  await cleanupCreatedUsers();
  await cleanupCreatedDepts();
  assertOptionIdsExclude(
    await publicDeptOptions(),
    [createdDept.id, siblingDept.id],
    'dept-delete simple-list options',
  );

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
        'core.dept.simple-list.public-consumer',
        'core.dept.bad-order-rejected',
        'core.dept.create-disabled',
        'core.dept.list-disabled',
        'core.dept.detail',
        'core.dept.simple-list.disabled-filtered',
        'core.dept.update-enabled',
        'core.dept.simple-list.option-shape',
        'core.dept.order.duplicate-guard',
        'core.dept.order.missing-guard',
        'core.dept.order.same-parent-guard',
        'core.dept.order.bad-order-guard',
        'core.dept.order.update',
        'core.dept.order.tree-order',
        'core.dept.order.simple-list-order',
        'core.dept.export',
        'core.dept.delete.assigned-user-guard',
        'core.dept.delete.assigned-user-preserved',
        'core.dept.delete',
      ],
    }),
  );
} catch (error) {
  await cleanupCreatedUsers().catch(() => undefined);
  await cleanupCreatedDepts().catch(() => undefined);
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

async function publicDeptOptions() {
  const options = await request(`${apiPrefix}/core/depts/simple-list`, {
    expected: [200],
  });
  assertArray(options, 'dept simple-list options');
  return options;
}

function findOption(options, id) {
  const option = options.find((candidate) => candidate.id === id);

  if (!option) {
    throw new Error(`Expected dept option ${id} to be present`);
  }

  return option;
}

function assertOptionIdsInclude(options, expectedIds, label) {
  const actualIds = options.map((option) => option.id);

  for (const id of expectedIds) {
    if (!actualIds.includes(id)) {
      throw new Error(`${label} must include dept option ${id}`);
    }
  }

  for (const option of options) {
    assertString(option.id, `${label} option id`);
    assertString(option.name, `${label} option name`);
    assertNumber(option.order, `${label} option order`);
  }
}

function assertOptionIdsExclude(options, expectedMissingIds, label) {
  const actualIds = options.map((option) => option.id);

  for (const id of expectedMissingIds) {
    if (actualIds.includes(id)) {
      throw new Error(`${label} must exclude dept option ${id}`);
    }
  }
}

function assertDeptTreeContains(tree, id, label) {
  assertArray(tree, `${label} rows`);

  if (!flattenDeptTree(tree).some((dept) => dept.id === id)) {
    throw new Error(`${label} must contain dept ${id}`);
  }
}

function getSiblingIds(tree, parentId) {
  const parent = flattenDeptTree(tree).find((dept) => dept.id === parentId);

  if (!parent || !Array.isArray(parent.children)) {
    throw new Error(`Expected parent department ${parentId} to have children`);
  }

  return parent.children.map((dept) => dept.id);
}

function assertRelativeOrder(actualIds, expectedIds, label) {
  let previousIndex = -1;

  for (const id of expectedIds) {
    const index = actualIds.indexOf(id);
    if (index === -1) {
      throw new Error(`${label} must include ${id}`);
    }
    if (index <= previousIndex) {
      throw new Error(`${label} must keep ${expectedIds.join(' before ')}`);
    }
    previousIndex = index;
  }
}

function flattenDeptTree(tree) {
  return tree.flatMap((dept) => [
    dept,
    ...flattenDeptTree(Array.isArray(dept.children) ? dept.children : []),
  ]);
}

async function cleanupCreatedDepts() {
  for (const id of [...createdDeptIds].reverse()) {
    await apiRequest(`/core/depts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      expected: [200, 404],
    }).catch(() => undefined);
  }
  createdDeptIds.length = 0;
}

async function cleanupCreatedUsers() {
  for (const id of [...createdUserIds].reverse()) {
    await apiRequest(`/core/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      expected: [200, 404],
    }).catch(() => undefined);
  }
  createdUserIds.length = 0;
}
