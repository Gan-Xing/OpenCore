import type { IntegrationProviderDiagnosticsSummary } from '@opencore/sdk';

import {
  assertArray,
  assertAtLeast,
  assertEqual,
  assertIncludes,
  assertNumber,
  assertOpenApiPath,
  assertString,
  createTypedSmokeRuntime,
} from './runtime';

const smoke = createTypedSmokeRuntime();
const { apiPrefix, baseUrl, checkDocs, clients, request } = smoke;

async function main() {
  await request('/health/live', { expected: [200] });
  await request('/health/ready', { expected: [200] });

  if (checkDocs) {
    const openApi = await request(`${apiPrefix}/docs-json`, {
      expected: [200],
    });
    assertOpenApiPath(openApi, '/api/integrations/providers/health-audit');
    assertOpenApiPath(openApi, '/api/integrations/providers/{code}/test');
    assertOpenApiPath(openApi, '/api/integrations/providers/{code}/audit-logs');
    assertOpenApiPath(openApi, '/api/integrations/mail/test-send');
    assertOpenApiPath(openApi, '/api/integrations/sms/test-send');
  }

  const loginResponse = await smoke.login();
  const token = assertString(loginResponse.accessToken, 'login accessToken');

  const audit = await clients.integration.getProviderHealthAudit(token);
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

  assertNumber(
    mailSandbox.provider.configVersion,
    'mail sandbox config version',
  );
  assertString(
    mailSandbox.provider.secretRefStatus,
    'mail sandbox secret ref status',
  );
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

  const diagnostics = await clients.integration.getProviderDiagnostics(
    token,
    'mail.sandbox',
  );
  assertEqual(
    diagnostics.readiness,
    mailSandbox.readiness,
    'mail diagnostics readiness parity',
  );

  const providerTest = await clients.integration.testProvider(
    token,
    'mail.sandbox',
    {
      reason: 'smoke provider credential audit',
    },
  );
  assertEqual(
    providerTest.status,
    'warning',
    'mail sandbox provider test status',
  );
  assertEqual(
    providerTest.secretRefStatus,
    'unsupported',
    'mail sandbox provider test secretRefStatus',
  );
  assertString(providerTest.testedAt, 'mail sandbox provider test testedAt');
  assertString(
    providerTest.provider.lastTestedAt,
    'mail sandbox provider lastTestedAt',
  );

  const auditLogs = await clients.integration.listProviderAuditLogs(
    token,
    'mail.sandbox',
    { page: 1, pageSize: 20 },
  );
  assertAtLeast(auditLogs.items.length, 1, 'mail sandbox provider audit logs');
  assertIncludes(
    auditLogs.items.map((log) => log.action),
    'tested',
    'mail sandbox provider audit action',
  );

  const mailProviderBefore = await clients.integration.getProvider(
    token,
    'mail.sandbox',
  );
  if (!mailProviderBefore.enabled) {
    await clients.integration.enableProvider(token, 'mail.sandbox');
  }
  const mailTestSend = await clients.integration.sendMailTest(token, {
    providerCode: 'mail.sandbox',
    templateCode: 'mail.welcome',
    recipient: 'admin@example.test',
    payload: { name: 'Admin' },
    reason: 'smoke mail test-send',
  });
  assertEqual(mailTestSend.status, 'sent', 'mail test-send status');
  assertEqual(
    mailTestSend.message.status,
    'sent',
    'mail test-send outbox status',
  );
  assertString(mailTestSend.message.sentAt, 'mail test-send sentAt');
  if (!mailProviderBefore.enabled) {
    await clients.integration.disableProvider(token, 'mail.sandbox');
  }

  const smsProviderBefore = await clients.integration.getProvider(
    token,
    'sms.sandbox',
  );
  if (!smsProviderBefore.enabled) {
    await clients.integration.enableProvider(token, 'sms.sandbox');
  }
  const smsTestSend = await clients.integration.sendSmsTest(token, {
    providerCode: 'sms.sandbox',
    templateCode: 'sms.otp',
    recipient: '+15551234567',
    payload: { code: '123456' },
    reason: 'smoke SMS test-send',
  });
  assertEqual(smsTestSend.status, 'sent', 'SMS test-send status');
  assertEqual(
    smsTestSend.message.status,
    'sent',
    'SMS test-send outbox status',
  );
  assertString(smsTestSend.message.sentAt, 'SMS test-send sentAt');
  if (!smsProviderBefore.enabled) {
    await clients.integration.disableProvider(token, 'sms.sandbox');
  }

  assertNoSecretLeak(audit);
  assertNoSecretLeak(providerTest);
  assertNoSecretLeak(auditLogs);
  assertNoSecretLeak(mailTestSend);
  assertNoSecretLeak(smsTestSend);

  console.log(
    JSON.stringify({
      status: 'pass',
      baseUrl,
      apiPrefix,
      checks: [
        'health.live',
        'health.ready',
        ...(checkDocs ? ['openapi.integration-health-audit'] : []),
        ...(checkDocs ? ['openapi.integration-provider-test'] : []),
        ...(checkDocs ? ['openapi.integration-provider-audit-logs'] : []),
        ...(checkDocs ? ['openapi.integration-mail-test-send'] : []),
        ...(checkDocs ? ['openapi.integration-sms-test-send'] : []),
        'auth.login',
        'integration.provider-health-audit',
        'integration.provider-diagnostics-parity',
        'integration.provider-credential-test',
        'integration.provider-audit-logs',
        'integration.mail-test-send',
        'integration.sms-test-send',
        'integration.config-vault-audit',
        'integration.failure-history',
        'integration.secret-leak-guard',
      ],
    }),
  );
}

function assertProvider(
  byCode: ReadonlyMap<string, IntegrationProviderDiagnosticsSummary>,
  code: string,
) {
  const provider = byCode.get(code);
  if (!provider) {
    throw new Error(`Expected health audit provider ${code}.`);
  }

  return provider;
}

function assertNoSecretLeak(value: unknown) {
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

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      status: 'fail',
      baseUrl,
      apiPrefix,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});
