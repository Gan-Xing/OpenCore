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

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const batchConfigKey = `opencore.smoke.audit.batch.${runId}`;
const cleanConfigKey = `opencore.smoke.audit.clean.${runId}`;
let token;
const createdConfigKeys = new Set();

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

  const listResponse = await apiRequest('/core/audit-logs?page=1&pageSize=10');
  assertArray(listResponse.items, 'audit log list items');

  await createSmokeConfig(batchConfigKey);

  const operationLog = await waitForCreatedConfigAuditLog(batchConfigKey);
  assertEqual(operationLog.actorUsername, username, 'audit log actor');
  assertEqual(operationLog.action, 'POST', 'audit log action');
  assertEqual(operationLog.resource, '/api/core/config', 'audit log resource');
  assertEqual(operationLog.method, 'POST', 'audit log method');
  assertEqual(operationLog.statusCode, 201, 'audit log status code');
  assertString(operationLog.requestId, 'audit log requestId');

  const detailLog = await apiRequest(
    `/core/audit-logs/${encodeURIComponent(operationLog.id)}`,
  );
  assertEqual(detailLog.id, operationLog.id, 'detail audit log id');
  assertEqual(detailLog.actorUsername, username, 'detail audit log actor');
  assertEqual(detailLog.action, 'POST', 'detail audit log action');
  assertEqual(
    detailLog.resource,
    '/api/core/config',
    'detail audit log resource',
  );
  assertEqual(detailLog.statusCode, 201, 'detail audit log status code');

  const exportPreview = await apiRequest(
    `/core/audit-logs/export?action=POST&resource=${encodeURIComponent(
      '/api/core/config',
    )}`,
  );
  assertEqual(exportPreview.scope, 'current-page', 'audit log export scope');
  assertArray(exportPreview.columns, 'audit log export columns');

  await apiRequest('/core/audit-logs/batch', {
    method: 'DELETE',
    body: { ids: [] },
    expected: [400],
  });
  await apiRequest('/core/audit-logs/batch', {
    method: 'DELETE',
    body: { ids: [operationLog.id, operationLog.id] },
    expected: [400],
  });
  await apiRequest('/core/audit-logs/batch', {
    method: 'DELETE',
    body: { ids: [operationLog.id, `missing_${runId}`] },
    expected: [404],
  });

  const deleteResult = await apiRequest('/core/audit-logs/batch', {
    method: 'DELETE',
    body: { ids: [operationLog.id] },
  });
  assertEqual(deleteResult.deleted, true, 'audit log batch delete result');
  assertEqual(deleteResult.affected, 1, 'audit log batch delete affected');
  assertArray(deleteResult.ids, 'audit log batch delete ids');
  assertEqual(
    deleteResult.ids[0],
    operationLog.id,
    'audit log batch delete id',
  );

  await apiRequest(`/core/audit-logs/${encodeURIComponent(operationLog.id)}`, {
    expected: [404],
  });
  await cleanupCreatedConfigs();

  await createSmokeConfig(cleanConfigKey);
  await waitForCreatedConfigAuditLog(cleanConfigKey);

  const cleanResult = await apiRequest('/core/audit-logs/clean', {
    method: 'DELETE',
  });
  assertEqual(cleanResult.deleted, true, 'audit log clean result');
  if (typeof cleanResult.affected !== 'number' || cleanResult.affected < 1) {
    throw new Error(
      `Expected audit log clean affected to be at least 1, received ${formatBody(
        cleanResult,
      )}`,
    );
  }

  const afterCleanConfigLogs = await apiRequest(
    `/core/audit-logs?page=1&pageSize=20&resource=${encodeURIComponent(
      '/api/core/config',
    )}`,
  );
  assertArray(afterCleanConfigLogs.items, 'audit logs after clean items');
  if (afterCleanConfigLogs.items.length !== 0) {
    throw new Error(
      `Expected clean-all to remove config audit logs, received ${formatBody(
        afterCleanConfigLogs.items,
      )}`,
    );
  }

  await waitForAuditLog({
    action: 'DELETE',
    label: 'audit log clean-all operation',
    resource: '/api/core/audit-logs/clean',
    statusCode: 200,
  });
  await cleanupCreatedConfigs();

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
        'auth.write-operation-recorded',
        'core.audit-log.list',
        'core.audit-log.detail',
        'core.audit-log.export',
        'core.audit-log.batch-delete-guards',
        'core.audit-log.batch-delete',
        'core.audit-log.clean',
        'core.config.cleanup',
      ],
    }),
  );
} catch (error) {
  await cleanupCreatedConfigs().catch(() => undefined);
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

async function createSmokeConfig(key) {
  const created = await apiRequest('/core/config', {
    method: 'POST',
    body: {
      key,
      value: 'true',
      valueType: 'boolean',
      description: 'OpenCore scripted audit smoke config',
      visibility: 'private',
    },
  });
  createdConfigKeys.add(key);
  assertEqual(created.key, key, 'created audit smoke config key');
}

async function waitForCreatedConfigAuditLog(key) {
  return waitForAuditLog({
    action: 'POST',
    label: `config ${key}`,
    metadataKey: key,
    resource: '/api/core/config',
    statusCode: 201,
  });
}

async function waitForAuditLog({
  action,
  label,
  metadataKey: expectedMetadataKey,
  resource,
  statusCode,
}) {
  let lastItems = [];

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const page = await apiRequest(
      `/core/audit-logs?page=1&pageSize=20&action=${encodeURIComponent(
        action,
      )}&resource=${encodeURIComponent(resource)}`,
    );
    assertArray(page.items, 'filtered audit log items');
    lastItems = page.items;

    const match = page.items.find((item) => {
      const metadataBody =
        item.metadata &&
        typeof item.metadata === 'object' &&
        'body' in item.metadata
          ? item.metadata.body
          : undefined;
      const actualMetadataKey =
        metadataBody &&
        typeof metadataBody === 'object' &&
        'key' in metadataBody
          ? metadataBody.key
          : undefined;

      return (
        item.actorUsername === username &&
        item.action === action &&
        item.resource === resource &&
        item.statusCode === statusCode &&
        (expectedMetadataKey === undefined ||
          actualMetadataKey === expectedMetadataKey)
      );
    });

    if (match) {
      return match;
    }

    await delay(250);
  }

  throw new Error(
    `Audit log was not recorded for ${label}; latest rows=${formatBody(lastItems)}`,
  );
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

async function cleanupCreatedConfigs() {
  if (!token || createdConfigKeys.size === 0) {
    return;
  }

  for (const key of [...createdConfigKeys]) {
    await apiRequest(`/core/config/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      expected: [200, 404],
    });
    createdConfigKeys.delete(key);
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

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `Expected ${label} to be ${JSON.stringify(
        expected,
      )}, received ${JSON.stringify(actual)}`,
    );
  }
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function formatBody(body) {
  if (typeof body === 'string') {
    return body.slice(0, 500);
  }

  return JSON.stringify(body).slice(0, 500);
}
