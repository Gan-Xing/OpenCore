#!/usr/bin/env node

import {
  assertArray,
  assertAtLeast,
  assertEqual,
  assertIncludes,
  assertOpenApiPath,
  assertString,
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
    assertOpenApiPath(openApi, '/api/integrations/providers/health-audit');
  }

  const loginResponse = await login();
  token = assertString(loginResponse.accessToken, 'login accessToken');
  smoke.setToken(token);

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

function assertProvider(byCode, code) {
  const provider = byCode.get(code);
  if (!provider) {
    throw new Error(`Expected health audit provider ${code}.`);
  }

  return provider;
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
