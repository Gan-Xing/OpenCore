#!/usr/bin/env node

const DEFAULT_PORT = '39173';
const SCHEMA_PATH = 'tools/generator/examples/core.dict.v1.schema.json';
const CONFIG_PATH = 'tools/generator/examples/openforge.v1.config.json';

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
    assertOpenApiPath(openApi, '/api/tools/openforge/status');
    assertOpenApiPath(openApi, '/api/tools/openforge/plan');
    assertOpenApiPath(openApi, '/api/tools/openforge/apply/dry-run');
    assertOpenApiPath(openApi, '/api/tools/openforge/manifests/preview');
    assertOpenApiPath(openApi, '/api/tools/openforge/manifests/{manifestId}');
    assertOpenApiPath(openApi, '/api/tools/openforge/rollback/dry-run');
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');

  const status = await apiRequest('/tools/openforge/status');
  assertEqual(status.status, 'workspace-ready', 'openforge status');
  assertEqual(status.workspace.noWrite, true, 'openforge workspace noWrite');
  assertEqual(
    status.generatorCore.noWrite,
    true,
    'openforge generator-core noWrite',
  );
  assertEqual(
    status.operationPolicy.dryRunOnly,
    true,
    'openforge operation dry-run policy',
  );
  assertEqual(
    status.operationPolicy.confirmationText,
    'OPENFORGE DRY RUN',
    'openforge operation confirmation text',
  );

  const doctor = await apiRequest('/tools/openforge/doctor');
  assertEqual(doctor.valid, true, 'openforge doctor valid');
  assertArray(doctor.checks, 'openforge doctor checks');
  assertIncludes(
    doctor.checks.map((check) => check.id),
    'template-packs',
    'openforge doctor checks',
  );

  const plan = await apiRequest('/tools/openforge/plan', {
    method: 'POST',
    body: { schemaPath: SCHEMA_PATH },
  });
  assertEqual(plan.moduleCode, 'core.dict', 'openforge plan module');
  assertEqual(plan.safety.noWrite, true, 'openforge plan noWrite');
  assertIncludes(
    plan.artifacts.map((artifact) => artifact.kind),
    'prisma.hint',
    'openforge plan artifact kinds',
  );

  const diff = await apiRequest('/tools/openforge/diff', {
    method: 'POST',
    body: { schemaPath: SCHEMA_PATH },
  });
  assertEqual(diff.moduleCode, 'core.dict', 'openforge diff module');
  assertIncludes(
    diff.entries.map((entry) => entry.status),
    'protected-conflict',
    'openforge diff statuses',
  );

  const preflight = await apiRequest('/tools/openforge/check', {
    method: 'POST',
    body: { schemaPath: SCHEMA_PATH },
  });
  assertEqual(preflight.noWrite, true, 'openforge preflight noWrite');
  assertEqual(
    preflight.safety.blockPrismaSchemaWrites,
    true,
    'openforge preflight prisma guard',
  );

  const applyDryRun = await apiRequest('/tools/openforge/apply/dry-run', {
    method: 'POST',
    body: {
      schemaPath: SCHEMA_PATH,
      configPath: CONFIG_PATH,
      confirmationText: status.operationPolicy.confirmationText,
      requestedMode: 'dry-run',
    },
  });
  assertEqual(applyDryRun.mode, 'dry-run', 'openforge apply mode');
  assertEqual(applyDryRun.applied, false, 'openforge apply dry-run applied');
  assertEqual(
    applyDryRun.manifest.moduleCode,
    'core.dict',
    'openforge apply manifest module',
  );
  assertArray(applyDryRun.entries, 'openforge apply dry-run entries');
  assertArray(applyDryRun.errors, 'openforge apply dry-run errors');

  const manifests = await apiRequest('/tools/openforge/manifests');
  assertArray(manifests.manifests, 'openforge manifests');

  const manifestPreview = await apiRequest(
    '/tools/openforge/manifests/preview',
    {
      method: 'POST',
      body: { schemaPath: SCHEMA_PATH, configPath: CONFIG_PATH },
    },
  );
  assertEqual(
    manifestPreview.manifest.moduleCode,
    'core.dict',
    'openforge manifest preview module',
  );
  assertEqual(
    manifestPreview.manifestPath,
    `dry-run:${manifestPreview.manifest.id}`,
    'openforge manifest preview path',
  );

  const rollbackDryRun = await apiRequest('/tools/openforge/rollback/dry-run', {
    method: 'POST',
    body: {
      manifestId: 'missing-openforge-smoke-manifest',
      confirmationText: status.operationPolicy.confirmationText,
      requestedMode: 'dry-run',
    },
  });
  assertEqual(rollbackDryRun.mode, 'dry-run', 'openforge rollback mode');
  assertEqual(
    rollbackDryRun.rolledBack,
    false,
    'openforge rollback dry-run result',
  );
  assertArray(rollbackDryRun.errors, 'openforge rollback dry-run errors');
  if (rollbackDryRun.errors.length < 1) {
    throw new Error('Expected missing rollback manifest to return errors.');
  }

  await apiRequest('/tools/openforge/plan', {
    method: 'POST',
    body: { schemaPath: 'prisma/schema.prisma' },
    expected: [400],
  });
  await apiRequest('/tools/openforge/apply/dry-run', {
    method: 'POST',
    body: {
      schemaPath: SCHEMA_PATH,
      configPath: '.env.opencore.local',
      confirmationText: status.operationPolicy.confirmationText,
    },
    expected: [400],
  });
  await apiRequest('/tools/openforge/apply/dry-run', {
    method: 'POST',
    body: { schemaPath: SCHEMA_PATH, configPath: CONFIG_PATH },
    expected: [400],
  });
  await apiRequest('/tools/openforge/apply/dry-run', {
    method: 'POST',
    body: {
      schemaPath: SCHEMA_PATH,
      configPath: CONFIG_PATH,
      confirmationText: status.operationPolicy.confirmationText,
      requestedMode: 'write',
    },
    expected: [400],
  });
  await apiRequest('/tools/openforge/rollback/dry-run', {
    method: 'POST',
    body: { manifestId: 'missing-openforge-smoke-manifest' },
    expected: [400],
  });
  await apiRequest('/tools/openforge/manifests/bad%24id', {
    expected: [400],
  });

  console.log(
    JSON.stringify({
      status: 'pass',
      baseUrl,
      apiPrefix,
      checks: [
        'health.live',
        'health.ready',
        ...(checkDocs ? ['openapi.tool-openforge-paths'] : []),
        'auth.login',
        'tool.openforge.status',
        'tool.openforge.doctor',
        'tool.openforge.plan',
        'tool.openforge.diff',
        'tool.openforge.check',
        'tool.openforge.apply-dry-run',
        'tool.openforge.manifests',
        'tool.openforge.manifest-preview',
        'tool.openforge.rollback-dry-run',
        'tool.openforge.confirmation-guards',
        'tool.openforge.path-guards',
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
      if (!(error instanceof HttpStatusError)) {
        break;
      }
    }
  }

  throw lastError ?? new Error('Unable to login with configured credentials.');
}

async function request(path, options = {}) {
  const expected = options.expected || [200];
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!expected.includes(response.status)) {
    throw new HttpStatusError(
      `Expected ${path} to return ${expected.join('/')} but received ${
        response.status
      }: ${formatBody(body)}`,
      response.status,
    );
  }

  return body;
}

function assertOpenApiPath(openApi, path) {
  if (!openApi || typeof openApi !== 'object' || !openApi.paths?.[path]) {
    throw new Error(`OpenAPI docs-json does not include ${path}`);
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

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(
      `Expected ${label} to be ${JSON.stringify(expected)}, received ${formatBody(actual)}`,
    );
  }
}

function assertIncludes(values, expected, label) {
  if (!values.includes(expected)) {
    throw new Error(
      `Expected ${label} to include ${JSON.stringify(expected)}, received ${formatBody(values)}`,
    );
  }
}

function formatBody(body) {
  return JSON.stringify(body).slice(0, 1000);
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function normalizeApiPrefix(value) {
  const trimmed = trimTrailingSlash(value.trim());

  if (!trimmed) {
    return '';
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function parseBoolean(value, fallback) {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}
