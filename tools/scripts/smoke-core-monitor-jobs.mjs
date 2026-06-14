#!/usr/bin/env node

import Redis from 'ioredis';

const DEFAULT_PORT = '39173';
const JOB_CODE = 'report.refresh';

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
const smokeCron = createSmokeCron(runId);
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379/1';
const redisKeyPrefix = normalizeRedisPrefix(
  process.env.REDIS_KEY_PREFIX || 'opencore',
);
const cacheSmokePrefix = `${redisKeyPrefix}monitor-cache-smoke:${runId}`;
const cacheSmokeName = `${redisKeyPrefix}monitor-cache-smoke`.replace(/:$/, '');
const cacheSmokeKey = `${cacheSmokePrefix}:value`;
const cacheSmokeSecretKey = `${cacheSmokePrefix}:secret-token`;
let redisClient;
let token;
let failed = false;

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
    assertOpenApiPath(openApi, '/api/monitor/jobs/registry');
    assertOpenApiPath(openApi, '/api/monitor/jobs/{code}/trigger');
    assertOpenApiPath(openApi, '/api/monitor/jobs/dispatch-due');
    assertOpenApiPath(openApi, '/api/monitor/jobs/worker/claim');
    assertOpenApiMethod(openApi, '/api/monitor/jobs/{code}/runs', 'delete');
    assertOpenApiPath(openApi, '/api/monitor/queues');
    assertOpenApiPath(openApi, '/api/monitor/queues/{name}/pause');
    assertOpenApiPath(openApi, '/api/monitor/queues/{name}/resume');
    assertOpenApiPath(openApi, '/api/monitor/version');
    assertOpenApiPath(openApi, '/api/monitor/cache/names');
    assertOpenApiPath(openApi, '/api/monitor/cache/value');
    assertOpenApiPath(openApi, '/api/monitor/cache/key/delete');
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');

  await verifyMonitorVersion();
  await seedRedisSmokeCache();
  await verifyMonitorCache();

  const summary = await apiRequest('/monitor/operations/summary');
  assertNumberAtLeast(summary.jobs.total, 1, 'scheduler summary job total');
  assertEqual(summary.cache.provider, 'redis', 'cache summary provider');
  assertNumberAtLeast(summary.cache.keyCount, 0, 'cache summary key count');

  const registry = await apiRequest('/monitor/jobs/registry');
  assertArray(registry, 'job registry items');
  const reportRegistry = registry.find((entry) => entry.code === JOB_CODE);
  const auditRetentionRegistry = registry.find(
    (entry) => entry.code === 'audit-log.retention-clean',
  );
  if (!reportRegistry) {
    throw new Error(`Expected scheduler registry to include ${JOB_CODE}`);
  }
  if (!auditRetentionRegistry) {
    throw new Error(
      'Expected scheduler registry to include audit-log.retention-clean',
    );
  }
  assertEqual(
    reportRegistry.handlerKey,
    'reports.refresh',
    'report refresh handler key',
  );
  assertEqual(
    reportRegistry.allowManualTrigger,
    true,
    'report refresh manual trigger policy',
  );
  assertEqual(
    auditRetentionRegistry.handlerKey,
    'maintenance.auditLogRetention',
    'audit retention handler key',
  );

  const queues = await apiRequest('/monitor/queues');
  assertArray(queues.queues, 'monitor queue items');
  assertIncludes(
    queues.queues.map((queue) => queue.name),
    'maintenance',
    'scheduler maintenance queue',
  );
  assertIncludes(
    queues.queues.map((queue) => queue.name),
    'reports',
    'scheduler reports queue',
  );
  await verifyQueueControl();

  const maintenanceJobs = await apiRequest(
    '/monitor/jobs?page=1&pageSize=20&enabled=true&queueName=maintenance',
  );
  assertArray(maintenanceJobs.items, 'maintenance job list items');
  assertIncludes(
    maintenanceJobs.items.map((job) => job.code),
    'openapi.drift-check',
    'maintenance job list',
  );
  assertIncludes(
    maintenanceJobs.items.map((job) => job.code),
    'audit-log.retention-clean',
    'maintenance retention job list',
  );

  const job = await upsertSmokeJob();
  assertEqual(job.code, JOB_CODE, 'smoke job code');
  assertEqual(job.queueName, 'reports', 'smoke job queue');
  assertEqual(job.enabled, true, 'smoke job initial enabled');

  await apiRequest(`/monitor/jobs/${encodeURIComponent(JOB_CODE)}`, {
    method: 'PATCH',
    expected: [400],
    body: { queueName: 'maintenance' },
  });
  await apiRequest(`/monitor/jobs/${encodeURIComponent(JOB_CODE)}`, {
    method: 'PATCH',
    expected: [400],
    body: { retryLimit: 99 },
  });

  const disabled = await apiRequest(
    `/monitor/jobs/${encodeURIComponent(JOB_CODE)}/disable`,
    { method: 'PATCH' },
  );
  assertEqual(disabled.enabled, false, 'disabled smoke job enabled flag');

  await apiRequest(`/monitor/jobs/${encodeURIComponent(JOB_CODE)}/trigger`, {
    method: 'POST',
    expected: [400],
    body: {
      actor: username,
      metadata: { source: 'monitor.jobs.disabled-trigger-smoke', runId },
    },
  });

  const enabled = await apiRequest(
    `/monitor/jobs/${encodeURIComponent(JOB_CODE)}/enable`,
    { method: 'PATCH' },
  );
  assertEqual(enabled.enabled, true, 'enabled smoke job enabled flag');

  const run = await apiRequest(
    `/monitor/jobs/${encodeURIComponent(JOB_CODE)}/trigger`,
    {
      method: 'POST',
      body: {
        actor: username,
        metadata: { source: 'monitor.jobs.run-now-smoke', runId },
      },
    },
  );
  assertEqual(run.jobCode, JOB_CODE, 'manual run job code');
  assertEqual(run.status, 'completed', 'manual run status');
  assertEqual(run.trigger, 'manual', 'manual run trigger');
  assertNumberAtLeast(run.durationMs, 0, 'manual run duration');
  assertEqual(run.metadata.actor, username, 'manual run actor');
  assertEqual(
    run.metadata.executionMode,
    'in-process',
    'manual run execution mode',
  );
  assertEqual(
    run.metadata.handlerKey,
    'reports.refresh',
    'manual run handler key',
  );
  assertEqual(run.metadata.result.refreshed, true, 'manual run handler result');

  const completedRuns = await apiRequest(
    `/monitor/jobs/${encodeURIComponent(JOB_CODE)}/runs?status=completed`,
  );
  assertArray(completedRuns.items, 'completed job run list items');
  assertIncludes(
    completedRuns.items.map((item) => item.id),
    run.id,
    'completed job run ids',
  );

  const runDetail = await apiRequest(
    `/monitor/jobs/${encodeURIComponent(JOB_CODE)}/runs/${encodeURIComponent(
      run.id,
    )}`,
  );
  assertEqual(runDetail.id, run.id, 'run detail id');
  assertEqual(
    runDetail.metadata.source,
    'monitor.jobs.run-now-smoke',
    'run detail metadata source',
  );
  assertEqual(
    runDetail.metadata.result.source,
    'monitor.jobs.smoke',
    'run detail handler source',
  );

  const failedJob = await apiRequest(
    `/monitor/jobs/${encodeURIComponent(JOB_CODE)}`,
    {
      method: 'PATCH',
      body: {
        enabled: true,
        retryLimit: 1,
        timeoutSeconds: 60,
        payload: {
          source: 'monitor.jobs.smoke',
          simulateFailure: true,
          runId,
        },
      },
    },
  );
  assertEqual(failedJob.enabled, true, 'failed smoke job remains enabled');

  const failedRun = await apiRequest(
    `/monitor/jobs/${encodeURIComponent(JOB_CODE)}/trigger`,
    {
      method: 'POST',
      body: {
        actor: username,
        metadata: { source: 'monitor.jobs.failure-smoke', runId },
      },
    },
  );
  assertEqual(failedRun.status, 'failed', 'failed run status');
  assertEqual(failedRun.attempts, 2, 'failed run retry attempts');
  assertString(failedRun.error, 'failed run error');
  assertEqual(
    failedRun.metadata.result.failed,
    true,
    'failed run handler result',
  );
  assertNumberAtLeast(failedRun.durationMs, 0, 'failed run duration');

  const failedRunDetail = await apiRequest(
    `/monitor/jobs/${encodeURIComponent(JOB_CODE)}/runs/${encodeURIComponent(
      failedRun.id,
    )}`,
  );
  assertEqual(failedRunDetail.id, failedRun.id, 'failed run detail id');
  assertEqual(
    failedRunDetail.error,
    'Report refresh failed by scheduler payload.',
    'failed run detail error',
  );

  const failedRuns = await apiRequest(
    `/monitor/jobs/${encodeURIComponent(JOB_CODE)}/runs?status=failed`,
  );
  assertArray(failedRuns.items, 'failed job run list items');
  assertIncludes(
    failedRuns.items.map((item) => item.id),
    failedRun.id,
    'failed job run ids',
  );

  await apiRequest(`/monitor/jobs/${encodeURIComponent(JOB_CODE)}`, {
    method: 'PATCH',
    body: {
      enabled: true,
      cron: smokeCron.cron,
      retryLimit: 2,
      timeoutSeconds: 60,
      payload: { source: 'monitor.jobs.smoke', runId },
    },
  });

  const dispatch = await apiRequest('/monitor/jobs/dispatch-due', {
    method: 'POST',
    body: {
      actor: username,
      limit: 1,
      metadata: { source: 'monitor.jobs.dispatch-smoke', runId },
      now: smokeCron.now,
    },
  });
  assertEqual(dispatch.dispatchedCount, 1, 'scheduler dispatch count');
  assertEqual(dispatch.skippedCount, 0, 'scheduler dispatch skipped count');
  assertArray(dispatch.queuedRuns, 'scheduler dispatch queued runs');
  const queuedRun = dispatch.queuedRuns[0];
  assertEqual(queuedRun.jobCode, JOB_CODE, 'scheduler queued run job code');
  assertEqual(queuedRun.status, 'queued', 'scheduler queued run status');
  assertEqual(queuedRun.trigger, 'schedule', 'scheduler queued run trigger');
  assertEqual(
    queuedRun.metadata.executionMode,
    'queued',
    'scheduler queued run execution mode',
  );

  const worker = await apiRequest('/monitor/jobs/worker/claim', {
    method: 'POST',
    body: {
      actor: username,
      limit: 1,
      metadata: { source: 'monitor.jobs.worker-smoke', runId },
      queueName: 'reports',
    },
  });
  assertEqual(worker.claimedCount, 1, 'scheduler worker claimed count');
  assertEqual(worker.completedCount, 1, 'scheduler worker completed count');
  assertEqual(worker.failedCount, 0, 'scheduler worker failed count');
  assertArray(worker.runs, 'scheduler worker runs');
  const workerRun = worker.runs[0];
  assertEqual(workerRun.id, queuedRun.id, 'scheduler worker run id');
  assertEqual(workerRun.status, 'completed', 'scheduler worker run status');
  assertEqual(workerRun.trigger, 'schedule', 'scheduler worker trigger');
  assertEqual(
    workerRun.metadata.executionMode,
    'worker',
    'scheduler worker execution mode',
  );
  assertEqual(
    workerRun.metadata.queuedRunId,
    queuedRun.id,
    'scheduler worker queued run id',
  );

  const workerRunDetail = await apiRequest(
    `/monitor/jobs/${encodeURIComponent(JOB_CODE)}/runs/${encodeURIComponent(
      workerRun.id,
    )}`,
  );
  assertEqual(workerRunDetail.id, workerRun.id, 'worker run detail id');
  assertEqual(
    workerRunDetail.metadata.source,
    'monitor.jobs.worker-smoke',
    'worker run detail source',
  );

  const postRunSummary = await apiRequest('/monitor/operations/summary');
  assertNumberAtLeast(
    postRunSummary.jobRuns.completed,
    summary.jobRuns.completed + 2,
    'scheduler completed run summary',
  );
  assertNumberAtLeast(
    postRunSummary.jobRuns.failed,
    summary.jobRuns.failed + 1,
    'scheduler failed run summary',
  );

  await apiRequest(
    `/monitor/jobs/${encodeURIComponent(JOB_CODE)}/runs?status=queued&retentionDays=0`,
    {
      method: 'DELETE',
      expected: [400],
    },
  );
  const cleanFailedRuns = await apiRequest(
    `/monitor/jobs/${encodeURIComponent(JOB_CODE)}/runs?status=failed&retentionDays=0`,
    { method: 'DELETE' },
  );
  assertEqual(cleanFailedRuns.deleted, true, 'scheduler run clean deleted');
  assertEqual(cleanFailedRuns.jobCode, JOB_CODE, 'scheduler run clean job');
  assertEqual(
    cleanFailedRuns.retentionDays,
    0,
    'scheduler run clean retention',
  );
  assertIncludes(
    cleanFailedRuns.statuses,
    'failed',
    'scheduler run clean statuses',
  );
  assertNumberAtLeast(
    cleanFailedRuns.affected,
    1,
    'scheduler run clean affected',
  );
  await apiRequest(
    `/monitor/jobs/${encodeURIComponent(JOB_CODE)}/runs/${encodeURIComponent(
      failedRun.id,
    )}`,
    { expected: [404] },
  );

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
              'openapi.monitor-job-registry-path',
              'openapi.monitor-job-trigger-path',
              'openapi.monitor-job-dispatch-path',
              'openapi.monitor-job-worker-path',
              'openapi.monitor-job-run-clean-method',
              'openapi.monitor-queues-path',
              'openapi.monitor-queue-pause-path',
              'openapi.monitor-queue-resume-path',
              'openapi.monitor-version-path',
              'openapi.monitor-cache-names-path',
              'openapi.monitor-cache-value-path',
              'openapi.monitor-cache-key-delete-path',
            ]
          : []),
        'auth.login',
        'monitor.version.live-runtime',
        'monitor.version.no-secret-leak',
        'monitor.cache.redis-list',
        'monitor.cache.names',
        'monitor.cache.safe-value-preview',
        'monitor.cache.secret-redaction',
        'monitor.cache.dry-run-clear',
        'monitor.cache.confirmed-key-delete',
        'monitor.cache.confirmed-prefix-clear',
        'monitor.job.registry',
        'monitor.job.audit-retention-registry',
        'monitor.job.scheduler-queues',
        'monitor.queue.pause',
        'monitor.queue.resume',
        'monitor.job.summary',
        'monitor.job.list',
        'monitor.job.upsert-whitelisted',
        'monitor.job.policy-guards',
        'monitor.job.disable',
        'monitor.job.disabled-trigger-blocked',
        'monitor.job.enable',
        'monitor.job.run-now',
        'monitor.job.handler-execution',
        'monitor.job.run-list',
        'monitor.job.run-detail',
        'monitor.job.failed-run-retry',
        'monitor.job.failed-run-detail',
        'monitor.job.cron-dispatch',
        'monitor.job.worker-claim',
        'monitor.job.run-clean-terminal-guard',
        'monitor.job.run-clean',
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
  failed = true;
} finally {
  await cleanupRedisSmokeCache();
  if (failed) {
    process.exit(1);
  }
}

async function seedRedisSmokeCache() {
  redisClient = new Redis(redisUrl, {
    lazyConnect: true,
    connectTimeout: timeoutMs,
    commandTimeout: timeoutMs,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
  await redisClient.connect();
  await redisClient.set(
    cacheSmokeKey,
    JSON.stringify({
      source: 'monitor-cache-smoke',
      runId,
      password: 'must-not-leak',
    }),
    'EX',
    300,
  );
  await redisClient.set(cacheSmokeSecretKey, 'must-not-leak', 'EX', 300);
}

async function verifyMonitorVersion() {
  const versionInfo = await apiRequest('/monitor/version');
  assertEqual(versionInfo.name, 'opencore-api', 'monitor version name');
  assertString(versionInfo.version, 'monitor version app version');
  assertString(versionInfo.commit, 'monitor version commit');
  assertString(versionInfo.buildTime, 'monitor version build time');
  assertString(versionInfo.nodeVersion, 'monitor version node version');
  assertEqual(versionInfo.runtime, 'node', 'monitor version runtime');
  assertString(versionInfo.environment, 'monitor version environment');
  assertString(versionInfo.platform, 'monitor version platform');
  assertString(versionInfo.arch, 'monitor version arch');
  assertNumberAtLeast(versionInfo.processId, 1, 'monitor version process id');
  assertNumberAtLeast(versionInfo.uptimeSeconds, 0, 'monitor version uptime');
  assertString(versionInfo.startedAt, 'monitor version started at');
  assertString(versionInfo.timezone, 'monitor version timezone');
  assertString(versionInfo.deploymentId, 'monitor version deployment id');

  const payload = JSON.stringify(versionInfo);
  assertNotIncludes(payload, 'DATABASE_URL', 'monitor version payload');
  assertNotIncludes(payload, 'AUTH_TOKEN_SECRET', 'monitor version payload');
  assertNotIncludes(payload, 'postgresql://', 'monitor version payload');
  assertNotIncludes(payload, 'redis://', 'monitor version payload');
}

async function verifyQueueControl() {
  let needsResume = false;

  try {
    const resumedBefore = await apiRequest(
      '/monitor/queues/maintenance/resume',
      {
        method: 'POST',
      },
    );
    assertEqual(resumedBefore.name, 'maintenance', 'queue pre-resume name');
    assertEqual(resumedBefore.action, 'resume', 'queue pre-resume action');
    assertEqual(resumedBefore.queue.paused, false, 'queue pre-resume paused');
    assertEqual(
      resumedBefore.queue.controlMode,
      'managed',
      'queue pre-resume control mode',
    );

    const paused = await apiRequest('/monitor/queues/maintenance/pause', {
      method: 'POST',
    });
    needsResume = true;
    assertEqual(paused.name, 'maintenance', 'queue pause name');
    assertEqual(paused.action, 'pause', 'queue pause action');
    assertString(paused.appliedAt, 'queue pause appliedAt');
    assertEqual(paused.queue.paused, true, 'queue paused state');
    assertEqual(paused.queue.controlMode, 'managed', 'queue pause mode');

    const resumed = await apiRequest('/monitor/queues/maintenance/resume', {
      method: 'POST',
    });
    needsResume = false;
    assertEqual(resumed.name, 'maintenance', 'queue resume name');
    assertEqual(resumed.action, 'resume', 'queue resume action');
    assertString(resumed.appliedAt, 'queue resume appliedAt');
    assertEqual(resumed.queue.paused, false, 'queue resumed state');
    assertEqual(resumed.queue.controlMode, 'managed', 'queue resume mode');

    const queues = await apiRequest('/monitor/queues');
    const maintenance = queues.queues.find(
      (queue) => queue.name === 'maintenance',
    );
    if (!maintenance) {
      throw new Error('Expected maintenance queue after resume.');
    }
    assertEqual(maintenance.paused, false, 'queue list resumed state');
  } finally {
    if (needsResume) {
      await apiRequest('/monitor/queues/maintenance/resume', {
        method: 'POST',
      }).catch(() => undefined);
    }
  }
}

async function cleanupRedisSmokeCache() {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.del(cacheSmokeKey, cacheSmokeSecretKey);
  } finally {
    redisClient.disconnect();
  }
}

async function verifyMonitorCache() {
  const cacheKeys = await apiRequest(
    `/monitor/cache?prefix=${encodeURIComponent(cacheSmokePrefix)}`,
  );
  assertEqual(cacheKeys.scanComplete, true, 'cache key scan complete');
  assertArray(cacheKeys.items, 'cache key list items');
  assertIncludes(
    cacheKeys.items.map((item) => item.key),
    cacheSmokeKey,
    'cache key list',
  );
  assertIncludes(
    cacheKeys.items.map((item) => item.key),
    cacheSmokeSecretKey,
    'cache key list',
  );

  const cacheNames = await apiRequest('/monitor/cache/names');
  assertArray(cacheNames.items, 'cache namespace list items');
  assertIncludes(
    cacheNames.items.map((item) => item.name),
    cacheSmokeName,
    'cache namespace list',
  );

  const cacheValue = await apiRequest(
    `/monitor/cache/value?key=${encodeURIComponent(cacheSmokeKey)}`,
  );
  assertEqual(cacheValue.key, cacheSmokeKey, 'cache value key');
  assertEqual(cacheValue.encoding, 'string', 'cache value encoding');
  assertEqual(cacheValue.sensitive, true, 'cache value redacted JSON flag');
  assertIncludes(
    [cacheValue.valuePreview.includes('"password":"[redacted]"')],
    true,
    'cache value password redaction',
  );
  if (cacheValue.valuePreview.includes('must-not-leak')) {
    throw new Error('Cache value preview leaked a redacted secret.');
  }

  const secretValue = await apiRequest(
    `/monitor/cache/value?key=${encodeURIComponent(cacheSmokeSecretKey)}`,
  );
  assertEqual(secretValue.sensitive, true, 'cache secret value redacted flag');
  assertEqual(
    secretValue.valuePreview,
    '[redacted sensitive cache value]',
    'cache secret value preview',
  );

  const dryRun = await apiRequest('/monitor/cache/clear', {
    method: 'POST',
    body: {
      prefix: cacheSmokePrefix,
      dryRun: true,
    },
  });
  assertEqual(dryRun.matchedKeys, 2, 'cache dry-run matched keys');
  assertEqual(dryRun.clearedKeys, 0, 'cache dry-run cleared keys');

  const keyDelete = await apiRequest('/monitor/cache/key/delete', {
    method: 'POST',
    body: {
      key: cacheSmokeSecretKey,
      dryRun: false,
      confirmed: true,
    },
  });
  assertEqual(keyDelete.existed, true, 'cache key delete existed');
  assertEqual(keyDelete.deleted, true, 'cache key delete deleted');
  await apiRequest(
    `/monitor/cache/value?key=${encodeURIComponent(cacheSmokeSecretKey)}`,
    { expected: [404] },
  );

  const clear = await apiRequest('/monitor/cache/clear', {
    method: 'POST',
    body: {
      prefix: cacheSmokePrefix,
      dryRun: false,
      confirmed: true,
    },
  });
  assertNumberAtLeast(clear.clearedKeys, 1, 'cache confirmed clear keys');
}

async function upsertSmokeJob() {
  const detail = await apiRequest(
    `/monitor/jobs/${encodeURIComponent(JOB_CODE)}`,
    {
      expected: [200, 404],
    },
  );
  const body = {
    name: `Smoke Report Refresh ${runId}`,
    queueName: 'reports',
    cron: smokeCron.cron,
    enabled: true,
    retryLimit: 2,
    timeoutSeconds: 60,
    payload: { source: 'monitor.jobs.smoke', runId },
  };

  if (detail?.code === JOB_CODE) {
    return apiRequest(`/monitor/jobs/${encodeURIComponent(JOB_CODE)}`, {
      method: 'PATCH',
      body,
    });
  }

  return apiRequest('/monitor/jobs', {
    method: 'POST',
    body: {
      code: JOB_CODE,
      ...body,
    },
  });
}

function createSmokeCron(value) {
  const [timestampPart, randomPart = '0'] = value.split('-');
  const timestamp = Number.parseInt(timestampPart, 10);
  const random = Number.parseInt(randomPart, 36);
  const seed =
    ((Number.isFinite(timestamp) ? timestamp : Date.now()) +
      (Number.isFinite(random) ? random : 0)) %
    (365 * 24 * 59);
  const minute = 1 + (seed % 59);
  const hour = Math.floor(seed / 59) % 24;
  const dayOffset = Math.floor(seed / (59 * 24)) % 365;
  const now = new Date(Date.UTC(2099, 0, 1 + dayOffset, hour, minute, 0, 0));

  const day = now.getUTCDate();
  const month = now.getUTCMonth() + 1;

  return {
    cron: `${minute} ${hour} ${day} ${month} *`,
    now: now.toISOString(),
  };
}

async function apiRequest(path, options = {}) {
  return request(`${apiPrefix}${path}`, {
    token,
    ...options,
  });
}

async function login() {
  let lastError;

  for (const password of passwordCandidates) {
    try {
      return await request(`${apiPrefix}/auth/login`, {
        method: 'POST',
        body: { username, password },
        expected: [200, 201],
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
  const expected = options.expected ?? [200, 201];
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
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
        `${options.method || 'GET'} ${url} returned ${
          response.status
        }: ${formatBody(responseBody)}`,
        response.status,
      );
    }

    return responseBody;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${options.method || 'GET'} ${url} timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function assertOpenApiPath(openApi, path) {
  if (!openApi?.paths?.[path]) {
    throw new Error(`Expected OpenAPI docs to include ${path}`);
  }
}

function assertOpenApiMethod(openApi, path, method) {
  assertOpenApiPath(openApi, path);
  if (!openApi.paths[path]?.[method]) {
    throw new Error(
      `Expected OpenAPI docs to include ${method.toUpperCase()} ${path}`,
    );
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(
      `Expected ${label} to be an array, received ${formatBody(value)}`,
    );
  }
  return value;
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Expected ${label} to be a non-empty string.`);
  }
  return value;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `Expected ${label} to equal ${formatBody(expected)}, received ${formatBody(
        actual,
      )}`,
    );
  }
}

function assertIncludes(values, expected, label) {
  if (!values.includes(expected)) {
    throw new Error(
      `Expected ${label} to include ${formatBody(expected)}, received ${formatBody(
        values,
      )}`,
    );
  }
}

function assertNotIncludes(value, expected, label) {
  if (value.includes(expected)) {
    throw new Error(`Expected ${label} not to include ${formatBody(expected)}`);
  }
}

function assertNumberAtLeast(value, minimum, label) {
  if (typeof value !== 'number' || value < minimum) {
    throw new Error(
      `Expected ${label} to be at least ${minimum}, received ${formatBody(value)}`,
    );
  }
}

function normalizeApiPrefix(value) {
  const trimmed = trimTrailingSlash(value || '/api');
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function normalizeRedisPrefix(value) {
  const trimmed = String(value || 'opencore').trim();
  return trimmed.endsWith(':') ? trimmed : `${trimmed}:`;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function parseBoolean(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function formatBody(value) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}
