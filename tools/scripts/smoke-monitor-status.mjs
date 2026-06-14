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
let token;

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
    const openApi = await request(`${apiPrefix}/docs-json`, {
      expected: [200],
    });
    assertOpenApiPath(openApi, '/api/monitor/status');
    assertOpenApiSchema(openApi, 'RuntimeResourceStatusDto');
    assertOpenApiSchema(openApi, 'RuntimeCpuStatusDto');
    assertOpenApiSchema(openApi, 'RuntimeMemoryStatusDto');
    assertOpenApiSchema(openApi, 'RuntimeDiskStatusDto');
    assertOpenApiSchema(openApi, 'RuntimeProcessStatusDto');
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');

  const status = await apiRequest('/monitor/status');
  assertIncludes(['ok', 'degraded'], status.status, 'overall status');
  assertString(status.checkedAt, 'monitor status checkedAt');
  assertNumberAtLeast(status.uptimeSeconds, 0, 'monitor status uptime');
  assertArray(status.dependencies, 'monitor status dependencies');
  assertIncludes(
    status.dependencies.map((dependency) => dependency.name),
    'api',
    'monitor status dependency names',
  );
  assertIncludes(
    status.dependencies.map((dependency) => dependency.name),
    'database',
    'monitor status dependency names',
  );
  assertIncludes(
    status.dependencies.map((dependency) => dependency.name),
    'redis',
    'monitor status dependency names',
  );
  assertIncludes(
    status.dependencies.map((dependency) => dependency.name),
    'queue',
    'monitor status dependency names',
  );

  assertRuntimeResources(status.runtime);
  assertNoSecretLeak(status);

  console.log(
    JSON.stringify({
      status: 'pass',
      baseUrl,
      apiPrefix,
      checks: [
        'health.live',
        'health.ready',
        ...(checkDocs
          ? [
              'openapi.monitor-status-path',
              'openapi.monitor-runtime-resource-schemas',
            ]
          : []),
        'auth.login',
        'monitor.status.dependencies',
        'monitor.status.runtime-process',
        'monitor.status.runtime-cpu',
        'monitor.status.runtime-memory',
        'monitor.status.runtime-disk',
        'monitor.status.no-secret-leak',
      ],
    }),
  );
} catch (error) {
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

function assertRuntimeResources(runtime) {
  if (!runtime || typeof runtime !== 'object') {
    throw new Error(`Expected monitor status runtime resources.`);
  }

  assertString(runtime.sampledAt, 'runtime sampledAt');
  assertNumberAtLeast(runtime.process?.pid, 1, 'runtime process pid');
  assertString(runtime.process?.nodeVersion, 'runtime process node version');
  assertString(runtime.process?.platform, 'runtime process platform');
  assertString(runtime.process?.arch, 'runtime process arch');
  assertNumberAtLeast(
    runtime.process?.uptimeSeconds,
    0,
    'runtime process uptime',
  );
  assertString(runtime.process?.startedAt, 'runtime process startedAt');
  assertNumberAtLeast(runtime.cpu?.logicalCores, 1, 'runtime cpu cores');
  assertNumber(runtime.cpu?.loadAverage1m, 'runtime cpu load 1m');
  assertNumber(runtime.cpu?.loadAverage5m, 'runtime cpu load 5m');
  assertNumber(runtime.cpu?.loadAverage15m, 'runtime cpu load 15m');
  assertNumberAtLeast(
    runtime.cpu?.processUserMicros,
    0,
    'runtime process user cpu',
  );
  assertNumberAtLeast(
    runtime.cpu?.processSystemMicros,
    0,
    'runtime process system cpu',
  );
  assertNumberAtLeast(runtime.memory?.rssBytes, 1, 'runtime memory rss');
  assertNumberAtLeast(
    runtime.memory?.heapUsedBytes,
    1,
    'runtime memory heap used',
  );
  assertNumberAtLeast(
    runtime.memory?.heapTotalBytes,
    1,
    'runtime memory heap total',
  );
  assertNumberAtLeast(
    runtime.memory?.systemTotalBytes,
    1,
    'runtime memory system total',
  );
  assertNumberAtLeast(
    runtime.memory?.systemFreeBytes,
    0,
    'runtime memory system free',
  );
  assertRatio(runtime.memory?.processRssRatio, 'runtime memory RSS ratio');
  assertRatio(runtime.memory?.systemUsedRatio, 'runtime memory used ratio');
  assertString(runtime.disk?.path, 'runtime disk path');
  assertNumberAtLeast(runtime.disk?.totalBytes, 0, 'runtime disk total');
  assertNumberAtLeast(runtime.disk?.freeBytes, 0, 'runtime disk free');
  assertNumberAtLeast(runtime.disk?.usedBytes, 0, 'runtime disk used');
  assertRatio(runtime.disk?.usedRatio, 'runtime disk used ratio');
}

function assertOpenApiPath(openApi, path) {
  if (!openApi || typeof openApi !== 'object' || !openApi.paths?.[path]) {
    throw new Error(`OpenAPI docs-json does not include ${path}`);
  }
}

function assertOpenApiSchema(openApi, schema) {
  if (!openApi?.components?.schemas?.[schema]) {
    throw new Error(`OpenAPI docs-json does not include schema ${schema}`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(
      `Expected ${label} to be an array, received ${formatBody(value)}`,
    );
  }
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Expected ${label} to be a non-empty string.`);
  }

  return value;
}

function assertNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Expected ${label} to be a finite number.`);
  }
}

function assertNumberAtLeast(actual, expected, label) {
  if (typeof actual !== 'number' || actual < expected) {
    throw new Error(
      `Expected ${label} to be at least ${expected}, received ${formatBody(actual)}`,
    );
  }
}

function assertRatio(value, label) {
  assertNumber(value, label);
  if (value < 0 || value > 1) {
    throw new Error(
      `Expected ${label} to be between 0 and 1, received ${value}`,
    );
  }
}

function assertIncludes(values, expected, label) {
  if (!Array.isArray(values) || !values.includes(expected)) {
    throw new Error(
      `Expected ${label} to include ${JSON.stringify(expected)}, received ${formatBody(values)}`,
    );
  }
}

function assertNoSecretLeak(value) {
  const payload = JSON.stringify(value);
  for (const marker of [
    'DATABASE_URL',
    'AUTH_TOKEN_SECRET',
    'postgresql://',
    'redis://',
    'secret-token-value',
  ]) {
    if (payload.includes(marker)) {
      throw new Error(`Monitor status runtime smoke leaked ${marker}.`);
    }
  }
}

function formatBody(body) {
  return JSON.stringify(body).slice(0, 1000);
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

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
