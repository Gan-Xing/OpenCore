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
const postCode = `smoke_post_${runId}`;
const batchPostCodes = [`${postCode}_batch_a`, `${postCode}_batch_b`];
const orderPostCodes = [`${postCode}_order_a`, `${postCode}_order_b`];
let token;
const createdPostCodes = [];

try {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    await request(`${apiPrefix}/docs-json`, { expected: [200] });
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');
  smoke.setToken(token);

  const seededOptions = await publicPostOptions();
  assertOptionCodesInclude(
    seededOptions,
    ['admin', 'engineer'],
    'seeded posts',
  );

  await apiRequest('/core/posts', {
    method: 'POST',
    expected: [400],
    body: {
      code: `${postCode}_bad`,
      name: 'OpenCore Bad Smoke Post',
      order: -1,
    },
  });

  const createdPost = await apiRequest('/core/posts', {
    method: 'POST',
    body: {
      code: postCode,
      name: 'OpenCore Smoke Post',
      order: 30,
      description: 'Post simple-list smoke',
      enabled: false,
    },
  });
  createdPostCodes.push(postCode);
  assertEqual(createdPost.code, postCode, 'created post code');
  assertEqual(createdPost.enabled, false, 'created post enabled');

  const disabledList = await apiRequest('/core/posts?enabled=false');
  assertPageItemsContain(disabledList, postCode, 'disabled post list');

  const postDetail = await apiRequest(
    `/core/posts/${encodeURIComponent(postCode)}`,
  );
  assertEqual(postDetail.code, postCode, 'post detail code');

  assertOptionCodesExclude(
    await publicPostOptions(),
    [postCode],
    'disabled simple-list options',
  );

  const enabledPost = await apiRequest(
    `/core/posts/${encodeURIComponent(postCode)}`,
    {
      method: 'PATCH',
      body: {
        enabled: true,
        name: 'OpenCore Smoke Post Enabled',
        order: 5,
      },
    },
  );
  assertEqual(enabledPost.enabled, true, 'enabled post update');
  assertEqual(enabledPost.order, 5, 'enabled post order');

  const enabledOptions = await publicPostOptions();
  const smokeOption = findOption(enabledOptions, postCode);
  assertEqual(
    smokeOption.name,
    'OpenCore Smoke Post Enabled',
    'simple-list option name',
  );
  assertEqual(smokeOption.order, 5, 'simple-list option order');
  assertEqual('id' in smokeOption, false, 'simple-list option id exposure');
  assertEqual(
    'enabled' in smokeOption,
    false,
    'simple-list option enabled exposure',
  );

  const exportPreview = await apiRequest('/core/posts/export?enabled=true');
  assertEqual(exportPreview.scope, 'current-page', 'post export scope');
  assertArray(exportPreview.columns, 'post export columns');

  await apiRequest('/core/posts/batch', {
    method: 'DELETE',
    expected: [400],
    body: { codes: [] },
  });
  await apiRequest('/core/posts/batch', {
    method: 'DELETE',
    expected: [400],
    body: { codes: [postCode, postCode] },
  });
  await apiRequest('/core/posts/batch', {
    method: 'DELETE',
    expected: [404],
    body: { codes: [postCode, `missing_${postCode}`] },
  });
  await apiRequest(`/core/posts/${encodeURIComponent(postCode)}`);

  for (const [index, code] of batchPostCodes.entries()) {
    await apiRequest('/core/posts', {
      method: 'POST',
      body: {
        code,
        name: `OpenCore Batch Smoke Post ${index + 1}`,
        order: 6 + index,
        description: 'Post batch-delete smoke',
        enabled: true,
      },
    });
    createdPostCodes.push(code);
  }

  assertOptionCodesInclude(
    await publicPostOptions(),
    batchPostCodes,
    'batch-delete simple-list setup',
  );

  const batchDeleteResult = await apiRequest('/core/posts/batch', {
    method: 'DELETE',
    body: { codes: [batchPostCodes[1], batchPostCodes[0]] },
  });
  assertEqual(batchDeleteResult.deleted, true, 'batch-delete result deleted');
  assertEqual(batchDeleteResult.affected, 2, 'batch-delete result affected');
  assertArray(batchDeleteResult.codes, 'batch-delete result codes');
  assertEqual(
    batchDeleteResult.codes.join(','),
    [...batchPostCodes].sort().join(','),
    'batch-delete result code order',
  );

  for (const code of batchPostCodes) {
    forgetCreatedPostCode(code);
    await apiRequest(`/core/posts/${encodeURIComponent(code)}`, {
      expected: [404],
    });
  }
  assertOptionCodesExclude(
    await publicPostOptions(),
    batchPostCodes,
    'batch-delete simple-list options',
  );

  for (const [index, code] of orderPostCodes.entries()) {
    await apiRequest('/core/posts', {
      method: 'POST',
      body: {
        code,
        name: `OpenCore Order Smoke Post ${index + 1}`,
        order: 40 + index,
        description: 'Post order smoke',
        enabled: true,
      },
    });
    createdPostCodes.push(code);
  }

  await apiRequest('/core/posts/order', {
    method: 'PATCH',
    expected: [400],
    body: { items: [{ code: orderPostCodes[0], order: '1' }] },
  });
  await apiRequest('/core/posts/order', {
    method: 'PATCH',
    expected: [400],
    body: {
      items: [
        { code: orderPostCodes[0], order: 10 },
        { code: orderPostCodes[0], order: 20 },
      ],
    },
  });
  await apiRequest('/core/posts/order', {
    method: 'PATCH',
    expected: [404],
    body: {
      items: [
        { code: orderPostCodes[0], order: 10 },
        { code: `${postCode}_missing_order`, order: 20 },
      ],
    },
  });

  const orderUpdate = await apiRequest('/core/posts/order', {
    method: 'PATCH',
    body: {
      items: [
        { code: orderPostCodes[1], order: 10 },
        { code: orderPostCodes[0], order: 20 },
      ],
    },
  });
  assertEqual(orderUpdate.updatedCount, 2, 'post order update count');
  assertRelativeOrder(
    orderUpdate.items,
    orderPostCodes[1],
    orderPostCodes[0],
    'post order update result',
  );
  assertRelativeOrder(
    (await apiRequest('/core/posts?page=1&pageSize=100&enabled=true')).items,
    orderPostCodes[1],
    orderPostCodes[0],
    'post order list',
  );
  assertRelativeOrder(
    await publicPostOptions(),
    orderPostCodes[1],
    orderPostCodes[0],
    'post order simple-list',
  );

  await cleanupCreatedPosts();
  assertOptionCodesExclude(
    await publicPostOptions(),
    [postCode],
    'post-delete simple-list options',
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
        'core.post.simple-list.public-consumer',
        'core.post.bad-order-rejected',
        'core.post.create-disabled',
        'core.post.list-disabled',
        'core.post.detail',
        'core.post.simple-list.disabled-filtered',
        'core.post.update-enabled',
        'core.post.simple-list.option-shape',
        'core.post.export',
        'core.post.batch-delete.empty-guard',
        'core.post.batch-delete.duplicate-guard',
        'core.post.batch-delete.missing-guard',
        'core.post.batch-delete',
        'core.post.batch-delete.simple-list-cleanup',
        'core.post.order.bad-order-guard',
        'core.post.order.duplicate-guard',
        'core.post.order.missing-guard',
        'core.post.order.update',
        'core.post.order.list-order',
        'core.post.order.simple-list-order',
        'core.post.delete',
      ],
    }),
  );
} catch (error) {
  await cleanupCreatedPosts().catch(() => undefined);
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

async function publicPostOptions() {
  const options = await request(`${apiPrefix}/core/posts/simple-list`, {
    expected: [200],
  });
  assertArray(options, 'post simple-list options');
  return options;
}

function findOption(options, code) {
  const option = options.find((candidate) => candidate.code === code);

  if (!option) {
    throw new Error(`Expected post option ${code} to be present`);
  }

  return option;
}

function assertOptionCodesInclude(options, expectedCodes, label) {
  const actualCodes = options.map((option) => option.code);

  for (const code of expectedCodes) {
    if (!actualCodes.includes(code)) {
      throw new Error(`${label} must include post option ${code}`);
    }
  }

  for (const option of options) {
    assertString(option.code, `${label} option code`);
    assertString(option.name, `${label} option name`);
    assertNumber(option.order, `${label} option order`);
  }
}

function assertOptionCodesExclude(options, expectedMissingCodes, label) {
  const actualCodes = options.map((option) => option.code);

  for (const code of expectedMissingCodes) {
    if (actualCodes.includes(code)) {
      throw new Error(`${label} must exclude post option ${code}`);
    }
  }
}

function assertPageItemsContain(page, code, label) {
  assertArray(page.items, `${label} items`);

  if (!page.items.some((item) => item.code === code)) {
    throw new Error(`${label} must contain post ${code}`);
  }
}

function assertRelativeOrder(items, firstCode, secondCode, label) {
  assertArray(items, `${label} items`);

  const codes = items.map((item) => item.code);
  const firstIndex = codes.indexOf(firstCode);
  const secondIndex = codes.indexOf(secondCode);

  if (firstIndex < 0 || secondIndex < 0) {
    throw new Error(
      `${label} must include posts ${firstCode} and ${secondCode}`,
    );
  }

  if (firstIndex >= secondIndex) {
    throw new Error(`${label} must order ${firstCode} before ${secondCode}`);
  }
}

async function cleanupCreatedPosts() {
  if (!token) {
    return;
  }

  for (const code of [...createdPostCodes].reverse()) {
    await apiRequest(`/core/posts/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      expected: [200, 404],
    });
  }

  createdPostCodes.length = 0;
}

function forgetCreatedPostCode(code) {
  const index = createdPostCodes.indexOf(code);

  if (index >= 0) {
    createdPostCodes.splice(index, 1);
  }
}
