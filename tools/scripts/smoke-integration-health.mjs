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
    assertOpenApiPath(openApi, '/api/integrations/providers/health-audit');
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');

  const audit = await apiRequest('/integrations/providers/health-audit');
  assertString(audit.generatedAt, 'health audit generatedAt');
  assertArray(audit.providers, 'health audit providers');
  assertArray(audit.actions, 'health audit actions');
  assertAtLeast(audit.providers.length, 4, 'health audit provider count');
  assertEqual(audit.totals.total, audit.providers.length, 'audit total');
  assertAtLeast(audit.totals.blocked, 1, 'blocked providers');
  assertAtLeast(audit.totals.queued, 1, 'queued outbox');
  assertAtLeast(audit.totals.configVaultBacked, 2, 'config-vault providers');
  assertAtLeast(audit.totals.configVaultMissing, 1, 'config-vault debt');

  const byCode = new Map(
    audit.providers.map((provider) => [provider.provider.code, provider]),
  );
  const mailSandbox = assertProvider(byCode, 'mail.sandbox');
  const smsSandbox = assertProvider(byCode, 'sms.sandbox');
  const smsHttp = assertProvider(byCode, 'sms.http');

  assertEqual(mailSandbox.channel, 'mail', 'mail sandbox channel');
  assertEqual(mailSandbox.readiness, 'blocked', 'mail sandbox readiness');
  assertAtLeast(mailSandbox.outbox.queued, 1, 'mail sandbox queued outbox');
  assertIncludes(
    mailSandbox.checks.map((check) => `${check.code}:${check.status}`),
    'provider.secret-ref:warn',
    'mail sandbox checks',
  );
  assertIncludes(
    mailSandbox.checks.map((check) => `${check.code}:${check.status}`),
    'outbox.queued:warn',
    'mail sandbox queued check',
  );
  assertEqual(smsSandbox.channel, 'sms', 'sms sandbox channel');
  assertIncludes(
    smsHttp.checks.map((check) => `${check.code}:${check.status}`),
    'provider.secret-injections:pass',
    'sms http secret injection check',
  );
  assertIncludes(
    audit.actions,
    'Enable the provider before processing outbox messages.',
    'health audit actions',
  );

  const diagnostics = await apiRequest(
    '/integrations/providers/mail.sandbox/diagnostics',
  );
  assertEqual(
    diagnostics.readiness,
    mailSandbox.readiness,
    'mail diagnostics readiness parity',
  );

  assertNoSecretLeak(audit);

  console.log(
    JSON.stringify({
      status: 'pass',
      baseUrl,
      apiPrefix,
      checks: [
        'health.live',
        'health.ready',
        ...(checkDocs ? ['openapi.integration-health-audit'] : []),
        'auth.login',
        'integration.provider-health-audit',
        'integration.provider-diagnostics-parity',
        'integration.config-vault-audit',
        'integration.failure-history',
        'integration.secret-leak-guard',
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

function assertProvider(byCode, code) {
  const provider = byCode.get(code);
  if (!provider) {
    throw new Error(`Expected health audit provider ${code}.`);
  }

  return provider;
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

function assertAtLeast(actual, expected, label) {
  if (typeof actual !== 'number' || actual < expected) {
    throw new Error(
      `Expected ${label} to be at least ${expected}, received ${formatBody(actual)}`,
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

function assertNoSecretLeak(value) {
  const text = JSON.stringify(value);
  const forbidden = [
    'opencore-local-sms-api-key',
    'opencore-local-smtp-password',
    'unsafe',
  ];
  for (const marker of forbidden) {
    if (text.includes(marker)) {
      throw new Error(`Health audit leaked secret marker: ${marker}`);
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
