#!/usr/bin/env node

import {
  assertArray,
  assertEqual,
  assertIncludes,
  assertNumberAtLeast,
  assertString,
  createSmokeRuntime,
  delay,
  formatBody,
} from './smoke-helpers.mjs';

const smoke = createSmokeRuntime();
const { apiPrefix, apiRequest, baseUrl, checkDocs, login, request, username } =
  smoke;

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const batchConfigKey = `opencore.smoke.audit.batch.${runId}`;
const cleanConfigKey = `opencore.smoke.audit.clean.${runId}`;
let token;
const createdConfigKeys = new Set();

try {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    await request(`${apiPrefix}/docs-json`, { expected: [200] });
  }

  const loginResponse = await login();

  token = assertString(loginResponse.accessToken, 'login accessToken');
  smoke.setToken(token);

  const listResponse = await apiRequest('/core/audit-logs?page=1&pageSize=10');
  assertArray(listResponse.items, 'audit log list items');

  await createSmokeConfig(batchConfigKey);

  const operationLog = await waitForCreatedConfigAuditLog(batchConfigKey);
  assertEqual(operationLog.actorUsername, username, 'audit log actor');
  assertEqual(operationLog.action, 'POST', 'audit log action');
  assertEqual(operationLog.resource, '/api/core/config', 'audit log resource');
  assertEqual(operationLog.method, 'POST', 'audit log method');
  assertEqual(operationLog.statusCode, 201, 'audit log status code');
  const operationLogLocation = assertString(
    operationLog.location,
    'audit log location',
  );
  assertNumberAtLeast(operationLog.durationMs, 0, 'audit log duration');
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
  assertEqual(
    detailLog.location,
    operationLogLocation,
    'detail audit log location',
  );
  assertNumberAtLeast(detailLog.durationMs, 0, 'detail audit log duration');

  const exportPreview = await apiRequest(
    `/core/audit-logs/export?action=POST&resource=${encodeURIComponent(
      '/api/core/config',
    )}`,
  );
  assertEqual(exportPreview.scope, 'current-page', 'audit log export scope');
  assertArray(exportPreview.columns, 'audit log export columns');
  assertIncludes(
    exportPreview.columns,
    'durationMs',
    'audit log export duration column',
  );
  assertIncludes(
    exportPreview.columns,
    'location',
    'audit log export location column',
  );
  const enrichedFilterPage = await apiRequest(
    `/core/audit-logs?page=1&pageSize=20&location=${encodeURIComponent(
      operationLogLocation,
    )}&minDurationMs=0&status=success&resource=${encodeURIComponent(
      '/api/core/config',
    )}`,
  );
  assertArray(enrichedFilterPage.items, 'enriched audit filter items');
  if (!enrichedFilterPage.items.some((item) => item.id === operationLog.id)) {
    throw new Error(
      `Expected enriched filters to include ${operationLog.id}, received ${formatBody(
        enrichedFilterPage.items,
      )}`,
    );
  }
  await apiRequest('/core/audit-logs?status=unknown', { expected: [400] });
  await apiRequest('/core/audit-logs?minDurationMs=50&maxDurationMs=10', {
    expected: [400],
  });

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

  const cleanResult = await apiRequest(
    '/core/audit-logs/clean?retentionDays=0',
    {
      method: 'DELETE',
    },
  );
  assertEqual(cleanResult.deleted, true, 'audit log clean result');
  assertEqual(cleanResult.retentionDays, 0, 'audit log clean retention days');
  assertString(cleanResult.cutoffBefore, 'audit log clean cutoff');
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
      `Expected retention clean to remove expired config audit logs, received ${formatBody(
        afterCleanConfigLogs.items,
      )}`,
    );
  }

  await waitForAuditLog({
    action: 'DELETE',
    label: 'audit log retention clean operation',
    resource: '/api/core/audit-logs/clean?retentionDays=0',
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
        'core.audit-log.enrichment-filters',
        'core.audit-log.batch-delete-guards',
        'core.audit-log.batch-delete',
        'core.audit-log.retention-clean',
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
