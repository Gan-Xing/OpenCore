#!/usr/bin/env node

import {
  assertArray,
  assertEqual,
  assertIncludes,
  assertNumber,
  assertNumberAtLeast,
  assertOpenApiPath,
  assertOpenApiSchema,
  assertString,
  formatBody,
  createSmokeRuntime,
} from './smoke-helpers.mjs';

const smoke = createSmokeRuntime();
const { apiPrefix, apiRequest, baseUrl, checkDocs, login, request } = smoke;
let token;

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
  smoke.setToken(token);

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

function assertRatio(value, label) {
  assertNumber(value, label);
  if (value < 0 || value > 1) {
    throw new Error(
      `Expected ${label} to be between 0 and 1, received ${value}`,
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
