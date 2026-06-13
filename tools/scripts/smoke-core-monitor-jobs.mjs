#!/usr/bin/env node

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
    assertOpenApiPath(openApi, '/api/monitor/jobs/registry');
    assertOpenApiPath(openApi, '/api/monitor/jobs/{code}/trigger');
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');

  const summary = await apiRequest('/monitor/operations/summary');
  assertNumberAtLeast(summary.jobs.total, 1, 'scheduler summary job total');

  const registry = await apiRequest('/monitor/jobs/registry');
  assertArray(registry, 'job registry items');
  const reportRegistry = registry.find((entry) => entry.code === JOB_CODE);
  if (!reportRegistry) {
    throw new Error(`Expected scheduler registry to include ${JOB_CODE}`);
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

  const maintenanceJobs = await apiRequest(
    '/monitor/jobs?page=1&pageSize=20&enabled=true&queueName=maintenance',
  );
  assertArray(maintenanceJobs.items, 'maintenance job list items');
  assertIncludes(
    maintenanceJobs.items.map((job) => job.code),
    'openapi.drift-check',
    'maintenance job list',
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
      retryLimit: 2,
      timeoutSeconds: 60,
      payload: { source: 'monitor.jobs.smoke', runId },
    },
  });

  const postRunSummary = await apiRequest('/monitor/operations/summary');
  assertNumberAtLeast(
    postRunSummary.jobRuns.completed,
    summary.jobRuns.completed + 1,
    'scheduler completed run summary',
  );
  assertNumberAtLeast(
    postRunSummary.jobRuns.failed,
    summary.jobRuns.failed + 1,
    'scheduler failed run summary',
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
            ]
          : []),
        'auth.login',
        'monitor.job.registry',
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
  process.exit(1);
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
