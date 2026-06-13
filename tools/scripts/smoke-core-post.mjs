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
const postCode = `smoke_post_${runId}`;
const batchPostCodes = [`${postCode}_batch_a`, `${postCode}_batch_b`];
let token;
const createdPostCodes = [];

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

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');

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

async function apiRequest(path, options = {}) {
  return request(`${apiPrefix}${path}`, {
    ...options,
    token,
    expected: options.expected || [200, 201],
  });
}

async function login() {
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
        `${options.method || 'GET'} ${path} returned ${response.status}: ${JSON.stringify(responseBody)}`,
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

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `${label} mismatch: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

function assertNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`);
  }
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function normalizeApiPrefix(value) {
  const trimmed = value.trim();

  if (!trimmed || trimmed === '/') {
    return '';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return trimTrailingSlash(withLeadingSlash);
}

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  if (value === 'true' || value === '1') {
    return true;
  }

  if (value === 'false' || value === '0') {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
}
