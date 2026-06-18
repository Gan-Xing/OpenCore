import type { MailSmtpTransportFactory } from './integration.delivery-adapter';
import { createOutboxCallbackSignature } from './integration.repository';
import {
  createMapProviderSecretResolver,
  SeedIntegrationRepository,
} from './seed-integration.repository';

describe('IntegrationRepository', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds a bounded integration center summary', async () => {
    const repository = new SeedIntegrationRepository();

    expect(await repository.getSummary()).toMatchObject({
      providers: { total: 5, enabled: 1, disabled: 4, degraded: 0 },
      mailOutbox: { total: 1, queued: 1 },
      smsOutbox: { total: 1, queued: 0 },
      oauthProviders: 1,
      oauthTokens: { total: 4, active: 2, expired: 1, revoked: 1 },
      designs: { designOnlyTopics: 2 },
    });
  });

  it('filters integration lists by bounded query fields', async () => {
    const repository = new SeedIntegrationRepository();

    await expect(
      repository.listProviders({
        type: 'mail',
        enabled: false,
        healthStatus: 'disabled',
      }),
    ).resolves.toMatchObject({ total: 2 });
    await expect(
      repository.listTemplates('mail', { enabled: true }),
    ).resolves.toMatchObject({ total: 1 });
    await expect(
      repository.listOutbox('mail', {
        status: 'queued',
        providerCode: 'mail.sandbox',
      }),
    ).resolves.toMatchObject({ total: 1 });
    await expect(
      repository.listOAuthProviders({ enabled: true }),
    ).resolves.toMatchObject({ total: 1 });
  });

  it('stores providers with secret refs and redacts credential config', async () => {
    const repository = new SeedIntegrationRepository();

    await expect(
      repository.createProvider({
        code: 'oauth.github',
        type: 'oauth',
        name: 'GitHub OAuth',
        enabled: true,
        secretRef: 'secret://integration/oauth/github',
        config: {
          clientId: 'github-client',
          clientSecret: 'unsafe',
        },
      }),
    ).resolves.toMatchObject({
      code: 'oauth.github',
      secretRef: 'secret://integration/oauth/github',
      config: {
        clientId: 'github-client',
        clientSecret: '[REDACTED]',
      },
    });
    await expect(repository.getProvider('oauth.github')).resolves.toMatchObject(
      {
        code: 'oauth.github',
        config: {
          clientSecret: '[REDACTED]',
        },
      },
    );
    expect(JSON.stringify(await repository.listProviders())).not.toContain(
      'unsafe',
    );
    await expectHttpExceptionCode(
      repository.createProvider({
        code: 'mail.invalid',
        type: 'mail',
        name: 'Invalid',
        secretRef: 'plain-secret',
        config: {},
      }),
      'INTEGRATION_SECRET_REF_INVALID',
    );
  });

  it('checks provider health and supports enable/disable state', async () => {
    const repository = new SeedIntegrationRepository();

    await expect(
      repository.enableProvider('mail.sandbox'),
    ).resolves.toMatchObject({
      enabled: true,
    });
    await expect(
      repository.checkProviderHealth('mail.sandbox'),
    ).resolves.toMatchObject({
      healthStatus: 'healthy',
      lastCheckedAt: expect.any(String),
    });
    await expect(
      repository.disableProvider('mail.sandbox'),
    ).resolves.toMatchObject({
      enabled: false,
      healthStatus: 'disabled',
    });
  });

  it('versions provider config, validates secret refs, and records audit logs', async () => {
    const secretKey = 'integration.mail.smtp.password.secret';
    const repository = new SeedIntegrationRepository(
      createMapProviderSecretResolver(new Map([[secretKey, 'smtp-password']])),
      jest.fn<
        ReturnType<MailSmtpTransportFactory>,
        Parameters<MailSmtpTransportFactory>
      >(() => ({
        close: jest.fn(),
        sendMail: jest.fn().mockResolvedValue({}),
        verify: jest.fn().mockResolvedValue(true),
      })),
    );

    const initialProvider = await repository.getProvider('mail.smtp');
    expect(initialProvider).toMatchObject({
      code: 'mail.smtp',
      configVersion: 1,
      secretRefStatus: 'unchecked',
    });
    expect(initialProvider).not.toHaveProperty('lastTestStatus');
    await expect(
      repository.updateProvider('mail.smtp', {
        config: {
          adapter: 'smtp',
          authMethod: 'PLAIN',
          from: 'no-reply@opencore.test',
          host: 'smtp.gateway.test',
          tlsMode: 'starttls-required',
          username: 'smtp-user',
        },
      }),
    ).resolves.toMatchObject({
      configVersion: 2,
      secretRefStatus: 'unchecked',
    });
    await expect(
      repository.testProvider('mail.smtp', {
        reason: 'Repository provider credential audit',
      }),
    ).resolves.toMatchObject({
      status: 'passed',
      secretRefStatus: 'valid',
      provider: {
        code: 'mail.smtp',
        configVersion: 2,
        secretRefStatus: 'valid',
        lastTestStatus: 'passed',
        lastTestedAt: expect.any(String),
      },
    });
    await expect(
      repository.testProvider('mail.sandbox'),
    ).resolves.toMatchObject({
      status: 'warning',
      secretRefStatus: 'unsupported',
      provider: {
        code: 'mail.sandbox',
        lastTestStatus: 'warning',
      },
    });

    const auditLogs = await repository.listProviderAuditLogs('mail.smtp');
    expect(auditLogs.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'tested',
          afterConfigVersion: 2,
          afterSecretRefStatus: 'valid',
          reason: 'Repository provider credential audit',
          testStatus: 'passed',
        }),
        expect.objectContaining({
          action: 'updated',
          beforeConfigVersion: 1,
          afterConfigVersion: 2,
        }),
      ]),
    );
    expect(JSON.stringify(auditLogs)).not.toContain('smtp-password');
  });

  it('builds provider diagnostics from health, secret, and outbox state', async () => {
    const repository = new SeedIntegrationRepository();

    await expect(
      repository.getProviderDiagnostics('mail.sandbox'),
    ).resolves.toMatchObject({
      channel: 'mail',
      readiness: 'blocked',
      provider: {
        code: 'mail.sandbox',
        config: { clientSecret: '[REDACTED]' },
      },
      outbox: {
        total: 1,
        queued: 1,
        failed: 0,
        retryableFailed: 0,
      },
      checks: expect.arrayContaining([
        expect.objectContaining({ code: 'provider.enabled', status: 'fail' }),
        expect.objectContaining({ code: 'outbox.queued', status: 'warn' }),
      ]),
      actions: expect.arrayContaining([
        'Enable the provider before processing outbox messages.',
        'Move runtime provider credentials to secret://config/<key>.',
      ]),
    });

    await repository.enableProvider('mail.sandbox');
    await repository.checkProviderHealth('mail.sandbox');
    await repository.markOutboxFailed('mail', 'outbox_mail_1', {
      error: 'Sandbox SMTP rejected the notice',
    });

    await expect(
      repository.getProviderDiagnostics('mail.sandbox'),
    ).resolves.toMatchObject({
      readiness: 'blocked',
      outbox: {
        failed: 1,
        retryableFailed: 1,
        lastFailure: {
          id: 'outbox_mail_1',
          error: 'Sandbox SMTP rejected the notice',
          retryCount: 1,
        },
      },
      checks: expect.arrayContaining([
        expect.objectContaining({ code: 'provider.health', status: 'pass' }),
        expect.objectContaining({ code: 'outbox.failed', status: 'fail' }),
      ]),
      actions: expect.arrayContaining([
        'Inspect and retry failed outbox messages.',
      ]),
    });
  });

  it('builds a provider health audit across readiness and config debt', async () => {
    const repository = new SeedIntegrationRepository();

    await repository.enableProvider('mail.sandbox');
    await repository.checkProviderHealth('mail.sandbox');
    await repository.markOutboxFailed('mail', 'outbox_mail_1', {
      error: 'Sandbox SMTP rejected the notice',
    });

    await expect(repository.getProviderHealthAudit()).resolves.toMatchObject({
      totals: {
        total: 5,
        blocked: 4,
        unsupported: 1,
        failed: 1,
        retryableFailed: 1,
        configVaultBacked: 3,
        configVaultMissing: 2,
      },
      providers: expect.arrayContaining([
        expect.objectContaining({
          provider: expect.objectContaining({
            code: 'mail.sandbox',
            config: expect.objectContaining({ clientSecret: '[REDACTED]' }),
          }),
          outbox: expect.objectContaining({
            failed: 1,
            lastFailure: expect.objectContaining({
              error: 'Sandbox SMTP rejected the notice',
            }),
          }),
        }),
        expect.objectContaining({
          provider: expect.objectContaining({ code: 'sms.http' }),
          checks: expect.arrayContaining([
            expect.objectContaining({
              code: 'provider.secret-injections',
              status: 'pass',
            }),
          ]),
        }),
      ]),
      actions: expect.arrayContaining([
        'Inspect and retry failed outbox messages.',
        'Move runtime provider credentials to secret://config/<key>.',
      ]),
    });
    expect(
      JSON.stringify(await repository.getProviderHealthAudit()),
    ).not.toContain('unsafe');
  });

  it('renders mail templates and queues outbox messages with retry metadata', async () => {
    const repository = new SeedIntegrationRepository();

    await expect(
      repository.previewTemplate('mail', {
        templateCode: 'mail.welcome',
        payload: { name: 'Admin' },
      }),
    ).resolves.toMatchObject({
      subject: 'Welcome Admin',
      body: 'Hello Admin, welcome to OpenCore.',
    });
    await expect(
      repository.getTemplate('mail', 'mail.welcome'),
    ).resolves.toMatchObject({
      code: 'mail.welcome',
      enabled: true,
    });
    await repository.enableProvider('mail.sandbox');
    await expect(
      repository.enqueueOutbox('mail', {
        providerCode: 'mail.sandbox',
        templateCode: 'mail.welcome',
        recipient: 'admin@example.test',
        payload: { name: 'Admin' },
      }),
    ).resolves.toMatchObject({
      status: 'queued',
      retryCount: 0,
      subject: 'Welcome Admin',
      preview: 'Hello Admin, welcome to OpenCore.',
    });
    const message = (await repository.listOutbox('mail')).items[0];
    await expect(
      repository.getOutboxMessage('mail', message.id),
    ).resolves.toMatchObject({
      id: message.id,
      channel: 'mail',
    });
  });

  it('moves outbox messages through failed, retry, and sent states', async () => {
    const repository = new SeedIntegrationRepository();

    await repository.enableProvider('mail.sandbox');
    const queued = await repository.enqueueOutbox('mail', {
      providerCode: 'mail.sandbox',
      templateCode: 'mail.welcome',
      recipient: 'admin@example.test',
      payload: { name: 'Admin' },
    });

    await expect(
      repository.markOutboxFailed('mail', queued.id, {
        error: 'Sandbox SMTP rejected the message',
      }),
    ).resolves.toMatchObject({
      id: queued.id,
      status: 'failed',
      retryCount: 1,
      error: 'Sandbox SMTP rejected the message',
      sentAt: undefined,
    });
    await expect(
      repository.retryOutbox('mail', queued.id),
    ).resolves.toMatchObject({
      id: queued.id,
      status: 'queued',
      retryCount: 1,
      error: undefined,
    });
    await expectHttpExceptionCode(
      repository.markOutboxFailed('mail', queued.id, { error: ' ' }),
      'INTEGRATION_OUTBOX_FAILURE_ERROR_REQUIRED',
    );
    await expect(
      repository.markOutboxSent('mail', queued.id),
    ).resolves.toMatchObject({
      id: queued.id,
      status: 'sent',
      error: undefined,
      sentAt: expect.any(String),
    });
    await expectHttpExceptionCode(
      repository.retryOutbox('mail', queued.id),
      'INTEGRATION_OUTBOX_RETRY_STATUS_INVALID',
    );
    await expectHttpExceptionCode(
      repository.markOutboxFailed('mail', queued.id, { error: 'too late' }),
      'INTEGRATION_OUTBOX_ALREADY_SENT',
    );
    await expectHttpExceptionCode(
      repository.markOutboxFailed('sms', queued.id, { error: 'wrong channel' }),
      'INTEGRATION_RESOURCE_NOT_FOUND',
    );
  });

  it('sends isolated mail and SMS provider test messages through outbox', async () => {
    const repository = new SeedIntegrationRepository();

    await repository.enableProvider('mail.sandbox');
    await expect(
      repository.sendTestOutbox('mail', {
        providerCode: 'mail.sandbox',
        templateCode: 'mail.welcome',
        recipient: 'admin@example.test',
        payload: { name: 'Admin' },
        reason: 'Repository mail test-send',
      }),
    ).resolves.toMatchObject({
      channel: 'mail',
      providerCode: 'mail.sandbox',
      status: 'sent',
      message: {
        providerCode: 'mail.sandbox',
        status: 'sent',
        subject: 'Welcome Admin',
        preview: 'Hello Admin, welcome to OpenCore.',
        sentAt: expect.any(String),
      },
      testedAt: expect.any(String),
    });

    await repository.enableProvider('sms.sandbox');
    await expect(
      repository.sendTestOutbox('sms', {
        providerCode: 'sms.sandbox',
        templateCode: 'sms.otp',
        recipient: '+15551234567',
        payload: { code: '123456' },
        reason: 'Repository SMS test-send',
      }),
    ).resolves.toMatchObject({
      channel: 'sms',
      providerCode: 'sms.sandbox',
      status: 'sent',
      message: {
        providerCode: 'sms.sandbox',
        status: 'sent',
        preview: 'Your verification code is 123456.',
        sentAt: expect.any(String),
      },
    });

    await expect(
      repository.listOutbox('mail', {
        status: 'sent',
        providerCode: 'mail.sandbox',
      }),
    ).resolves.toMatchObject({ total: 1 });
    await expectHttpExceptionCode(
      repository.sendTestOutbox('sms', {
        providerCode: 'sms.sandbox',
        recipient: 'bad-phone',
        payload: { code: '123456' },
      }),
      'INTEGRATION_SMS_RECIPIENT_INVALID',
    );
  });

  it('processes queued outbox messages through the provider reliability loop', async () => {
    const repository = new SeedIntegrationRepository();

    await expectHttpExceptionCode(
      repository.processOutbox('mail', { providerCode: 'mail.sandbox' }),
      'INTEGRATION_PROVIDER_DISABLED',
    );
    await repository.enableProvider('mail.sandbox');

    const result = await repository.processOutbox('mail', {
      providerCode: 'mail.sandbox',
      limit: 1,
    });
    expect(result).toMatchObject({
      channel: 'mail',
      providerCode: 'mail.sandbox',
      attemptedCount: 1,
      sentCount: 1,
      failedCount: 0,
    });

    const processed = (await repository.listOutbox('mail', { status: 'sent' }))
      .items[0];
    expect(processed.sentAt).toEqual(expect.any(String));
    await expectHttpExceptionCode(
      repository.markOutboxFailed('mail', processed.id, { error: 'too late' }),
      'INTEGRATION_OUTBOX_ALREADY_SENT',
    );
    await expectHttpExceptionCode(
      repository.retryOutbox('mail', processed.id),
      'INTEGRATION_OUTBOX_RETRY_STATUS_INVALID',
    );
    await expectHttpExceptionCode(
      repository.processOutbox('mail', { providerCode: ' ' }),
      'INTEGRATION_OUTBOX_PROVIDER_CODE_REQUIRED',
    );
    await expectHttpExceptionCode(
      repository.processOutbox('mail', { limit: 0 }),
      'INTEGRATION_OUTBOX_PROCESS_LIMIT_INVALID',
    );
  });

  it('runs the outbox retry schedule with bounded retry policy', async () => {
    const repository = new SeedIntegrationRepository();
    await repository.enableProvider('mail.sandbox');
    await repository.markOutboxFailed('mail', 'outbox_mail_1', {
      error: 'Transient SMTP failure',
    });

    await expect(
      repository.runOutboxSchedule({
        channels: ['mail'],
        providerCode: 'mail.sandbox',
        maxRetryCount: 3,
      }),
    ).resolves.toMatchObject({
      retryFailed: true,
      maxRetryCount: 3,
      retriedCount: 1,
      attemptedCount: 1,
      sentCount: 1,
      failedCount: 0,
      queuedCount: 0,
      channels: [
        {
          channel: 'mail',
          providerCode: 'mail.sandbox',
          retriedCount: 1,
          process: {
            channel: 'mail',
            providerCode: 'mail.sandbox',
            attemptedCount: 1,
            sentCount: 1,
            failedCount: 0,
            queuedCount: 0,
          },
        },
      ],
    });
    await expect(
      repository.getOutboxMessage('mail', 'outbox_mail_1'),
    ).resolves.toMatchObject({
      status: 'sent',
      retryCount: 1,
      error: undefined,
      sentAt: expect.any(String),
    });

    const capped = new SeedIntegrationRepository();
    await capped.enableProvider('mail.sandbox');
    await capped.markOutboxFailed('mail', 'outbox_mail_1', {
      error: 'Retry cap reached',
    });
    await expect(
      capped.runOutboxSchedule({
        channels: ['mail'],
        providerCode: 'mail.sandbox',
        maxRetryCount: 1,
      }),
    ).resolves.toMatchObject({
      retriedCount: 0,
      attemptedCount: 0,
      sentCount: 0,
      failedCount: 0,
    });
    await expect(
      capped.getOutboxMessage('mail', 'outbox_mail_1'),
    ).resolves.toMatchObject({
      status: 'failed',
      retryCount: 1,
      error: 'Retry cap reached',
    });

    await expectHttpExceptionCode(
      repository.runOutboxSchedule({ channels: ['push' as never] }),
      'INTEGRATION_OUTBOX_SCHEDULE_CHANNEL_INVALID',
    );
    await expectHttpExceptionCode(
      repository.runOutboxSchedule({
        channels: ['sms'],
        providerCode: 'mail.sandbox',
      }),
      'INTEGRATION_PROVIDER_TYPE_MISMATCH',
    );
  });

  it('delivers mail outbox through the authenticated SMTP adapter', async () => {
    const smtpSecretKey = 'integration.mail.smtp.password.secret';
    const transportFactory = jest.fn<
      ReturnType<MailSmtpTransportFactory>,
      Parameters<MailSmtpTransportFactory>
    >(() => ({
      close: jest.fn(),
      sendMail: jest.fn().mockResolvedValue({ messageId: 'smtp-message-1' }),
      verify: jest.fn().mockResolvedValue(true),
    }));
    const repository = new SeedIntegrationRepository(
      createMapProviderSecretResolver(
        new Map([[smtpSecretKey, 'smtp-password']]),
      ),
      transportFactory,
    );

    await repository.createProvider({
      code: 'mail.smtp',
      type: 'mail',
      name: 'Mail SMTP',
      enabled: true,
      secretRef: `secret://config/${smtpSecretKey}`,
      config: {
        adapter: 'smtp',
        authMethod: 'PLAIN',
        from: 'no-reply@opencore.test',
        host: 'smtp.gateway.test',
        port: 2525,
        tlsMode: 'starttls-required',
        timeoutMs: 1000,
        username: 'smtp-user',
      },
    });
    await expect(
      repository.checkProviderHealth('mail.smtp'),
    ).resolves.toMatchObject({
      healthStatus: 'healthy',
    });
    const queued = await repository.enqueueOutbox('mail', {
      providerCode: 'mail.smtp',
      recipient: 'admin@example.test',
      subject: 'Welcome through SMTP',
      attachments: [
        {
          filename: 'welcome.txt',
          contentType: 'text/plain',
          contentBase64: 'U01UUCBhdHRhY2htZW50IGJvZHkgZm9yIEFkbWluCg==',
        },
      ],
      payload: { body: 'SMTP body for Admin' },
    });
    expect(queued).toMatchObject({
      attachments: [
        {
          filename: 'welcome.txt',
          contentType: 'text/plain',
          sizeBytes: 31,
        },
      ],
      subject: 'Welcome through SMTP',
    });

    await expect(
      repository.processOutbox('mail', { providerCode: 'mail.smtp' }),
    ).resolves.toMatchObject({
      attemptedCount: 1,
      failedCount: 0,
      sentCount: 1,
    });

    expect(transportFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: {
          method: 'PLAIN',
          pass: 'smtp-password',
          user: 'smtp-user',
        },
        host: 'smtp.gateway.test',
        ignoreTLS: false,
        port: 2525,
        requireTLS: true,
        secure: false,
      }),
    );
    const sendMail = transportFactory.mock.results[1]?.value.sendMail;
    expect(sendMail).toHaveBeenCalledWith({
      attachments: [
        {
          content: Buffer.from('SMTP attachment body for Admin\n'),
          contentType: 'text/plain',
          filename: 'welcome.txt',
        },
      ],
      from: 'no-reply@opencore.test',
      to: 'admin@example.test',
      subject: 'Welcome through SMTP',
      text: 'SMTP body for Admin',
    });
    await expect(
      repository.getOutboxMessage('mail', queued.id),
    ).resolves.toMatchObject({
      attachments: [
        {
          filename: 'welcome.txt',
          sizeBytes: 31,
        },
      ],
      status: 'sent',
      retryCount: 0,
      error: undefined,
      sentAt: expect.any(String),
    });
  });

  it('requires config-backed SMTP secrets before sending mail', async () => {
    const transportFactory = jest.fn<
      ReturnType<MailSmtpTransportFactory>,
      Parameters<MailSmtpTransportFactory>
    >(() => ({
      close: jest.fn(),
      sendMail: jest.fn().mockResolvedValue({}),
      verify: jest.fn().mockResolvedValue(true),
    }));
    const repository = new SeedIntegrationRepository(
      undefined,
      transportFactory,
    );

    await repository.createProvider({
      code: 'mail.bad-smtp',
      type: 'mail',
      name: 'Bad Mail SMTP',
      enabled: true,
      secretRef: 'secret://integration/mail/bad-smtp',
      config: {
        adapter: 'smtp',
        from: 'no-reply@opencore.test',
        host: 'smtp.gateway.test',
        tlsMode: 'starttls-required',
        username: 'smtp-user',
      },
    });
    await expect(
      repository.checkProviderHealth('mail.bad-smtp'),
    ).resolves.toMatchObject({
      healthStatus: 'degraded',
      lastCheckedAt: expect.any(String),
    });
    const queued = await repository.enqueueOutbox('mail', {
      providerCode: 'mail.bad-smtp',
      templateCode: 'mail.welcome',
      recipient: 'admin@example.test',
      payload: { name: 'Admin' },
    });
    await expect(
      repository.processOutbox('mail', { providerCode: 'mail.bad-smtp' }),
    ).resolves.toMatchObject({
      attemptedCount: 1,
      failedCount: 1,
      sentCount: 0,
    });
    expect(transportFactory).not.toHaveBeenCalled();
    await expect(
      repository.getOutboxMessage('mail', queued.id),
    ).resolves.toMatchObject({
      status: 'failed',
      retryCount: 1,
      error: expect.stringContaining('secret://config/<key>'),
    });
  });

  it('rejects deprecated SMTP TLS booleans before sending mail', async () => {
    const transportFactory = jest.fn<
      ReturnType<MailSmtpTransportFactory>,
      Parameters<MailSmtpTransportFactory>
    >(() => ({
      close: jest.fn(),
      sendMail: jest.fn().mockResolvedValue({}),
      verify: jest.fn().mockResolvedValue(true),
    }));
    const repository = new SeedIntegrationRepository(
      createMapProviderSecretResolver(
        new Map([['integration.mail.smtp.password.secret', 'smtp-password']]),
      ),
      transportFactory,
    );

    await repository.createProvider({
      code: 'mail.deprecated-tls',
      type: 'mail',
      name: 'Deprecated SMTP TLS',
      enabled: true,
      secretRef: 'secret://config/integration.mail.smtp.password.secret',
      config: {
        adapter: 'smtp',
        from: 'no-reply@opencore.test',
        host: 'smtp.gateway.test',
        requireTls: true,
        username: 'smtp-user',
      },
    });
    await expect(
      repository.checkProviderHealth('mail.deprecated-tls'),
    ).resolves.toMatchObject({
      healthStatus: 'degraded',
    });
    const queued = await repository.enqueueOutbox('mail', {
      providerCode: 'mail.deprecated-tls',
      recipient: 'admin@example.test',
      payload: { body: 'SMTP body for Admin' },
    });
    await expect(
      repository.processOutbox('mail', {
        providerCode: 'mail.deprecated-tls',
      }),
    ).resolves.toMatchObject({
      attemptedCount: 1,
      failedCount: 1,
      sentCount: 0,
    });
    expect(transportFactory).not.toHaveBeenCalled();
    await expect(
      repository.getOutboxMessage('mail', queued.id),
    ).resolves.toMatchObject({
      status: 'failed',
      error: expect.stringContaining('SMTP tlsMode replaces'),
    });
  });

  it('delivers SMS outbox through the bounded HTTP adapter', async () => {
    const repository = new SeedIntegrationRepository();
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('', {
        status: 202,
      }),
    );

    await repository.createProvider({
      code: 'sms.http',
      type: 'sms',
      name: 'SMS HTTP',
      enabled: true,
      secretRef: 'secret://integration/sms/http',
      config: {
        adapter: 'http',
        endpoint: 'https://sms.gateway.test/send',
        allowedHosts: ['sms.gateway.test'],
        method: 'POST',
        successStatus: 202,
        timeoutMs: 1000,
        headers: {
          'x-provider': 'opencore-smoke',
        },
      },
    });
    const queued = await repository.enqueueOutbox('sms', {
      providerCode: 'sms.http',
      templateCode: 'sms.otp',
      recipient: '+15551234567',
      payload: { code: '123456' },
    });

    await expect(
      repository.processOutbox('sms', { providerCode: 'sms.http' }),
    ).resolves.toMatchObject({
      channel: 'sms',
      providerCode: 'sms.http',
      attemptedCount: 1,
      sentCount: 1,
      failedCount: 0,
      queuedCount: 0,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      }),
    );
    const requestBody = JSON.parse(
      String((fetchMock.mock.calls[0]?.[1] as RequestInit).body),
    ) as Record<string, unknown>;
    expect(requestBody).toMatchObject({
      messageId: queued.id,
      providerCode: 'sms.http',
      recipient: '+15551234567',
      message: 'Your verification code is 123456.',
    });
    await expect(
      repository.getOutboxMessage('sms', queued.id),
    ).resolves.toMatchObject({
      status: 'sent',
      retryCount: 0,
      error: undefined,
      sentAt: expect.any(String),
    });

    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));
    const failed = await repository.enqueueOutbox('sms', {
      providerCode: 'sms.http',
      templateCode: 'sms.otp',
      recipient: '+15557654321',
      payload: { code: '654321' },
    });
    await expect(
      repository.processOutbox('sms', { providerCode: 'sms.http' }),
    ).resolves.toMatchObject({
      attemptedCount: 1,
      sentCount: 0,
      failedCount: 1,
      queuedCount: 0,
    });
    await expect(
      repository.getOutboxMessage('sms', failed.id),
    ).resolves.toMatchObject({
      status: 'failed',
      retryCount: 1,
      error: 'SMS HTTP provider returned status 500.',
      sentAt: undefined,
    });

    fetchMock.mockRestore();
  });

  it('injects config-vault secrets into SMS HTTP headers, query, and body', async () => {
    const smsSecretKey = 'integration.sms.http.api-key.secret';
    const repository = new SeedIntegrationRepository(
      createMapProviderSecretResolver(new Map([[smsSecretKey, 'sms-api-key']])),
    );
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('', {
        status: 202,
      }),
    );

    await repository.createProvider({
      code: 'sms.http-secret',
      type: 'sms',
      name: 'SMS HTTP Secret',
      enabled: true,
      secretRef: `secret://config/${smsSecretKey}`,
      config: {
        adapter: 'http',
        endpoint: 'https://sms.gateway.test/send',
        allowedHosts: ['sms.gateway.test'],
        method: 'POST',
        successStatus: 202,
        timeoutMs: 1000,
        headers: {
          'x-provider': 'opencore-smoke',
        },
        secretInjections: [
          {
            target: 'header',
            name: 'Authorization',
            secretRef: `secret://config/${smsSecretKey}`,
            prefix: 'Bearer ',
          },
          {
            target: 'query',
            name: 'api_key',
            secretRef: `secret://config/${smsSecretKey}`,
          },
          {
            target: 'body',
            name: 'apiToken',
            secretRef: `secret://config/${smsSecretKey}`,
          },
        ],
      },
    });
    await expect(
      repository.checkProviderHealth('sms.http-secret'),
    ).resolves.toMatchObject({
      healthStatus: 'healthy',
    });
    await expect(
      repository.getProviderDiagnostics('sms.http-secret'),
    ).resolves.toMatchObject({
      checks: expect.arrayContaining([
        expect.objectContaining({
          code: 'provider.secret-injections',
          status: 'pass',
        }),
      ]),
    });
    const queued = await repository.enqueueOutbox('sms', {
      providerCode: 'sms.http-secret',
      templateCode: 'sms.otp',
      recipient: '+15551234567',
      payload: { code: '123456' },
    });

    await expect(
      repository.processOutbox('sms', { providerCode: 'sms.http-secret' }),
    ).resolves.toMatchObject({
      attemptedCount: 1,
      sentCount: 1,
      failedCount: 0,
    });

    const calledUrl = fetchMock.mock.calls[0]?.[0];
    expect(calledUrl).toBeInstanceOf(URL);
    expect((calledUrl as URL).searchParams.get('api_key')).toBe('sms-api-key');
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(requestInit.headers).toMatchObject({
      Authorization: 'Bearer sms-api-key',
      'x-provider': 'opencore-smoke',
    });
    const requestBody = JSON.parse(String(requestInit.body)) as Record<
      string,
      unknown
    >;
    expect(requestBody).toMatchObject({
      apiToken: 'sms-api-key',
      messageId: queued.id,
      providerCode: 'sms.http-secret',
      recipient: '+15551234567',
    });
    expect(
      JSON.stringify(await repository.getProvider('sms.http-secret')),
    ).not.toContain('sms-api-key');

    fetchMock.mockRestore();
  });

  it('requires config-backed SMS HTTP secret injection before delivery', async () => {
    const repository = new SeedIntegrationRepository(
      createMapProviderSecretResolver(new Map()),
    );
    const fetchMock = jest.spyOn(globalThis, 'fetch');

    await expectHttpExceptionCode(
      createMapProviderSecretResolver(new Map())('secret://config/missing.key'),
      'INTEGRATION_CONFIG_SECRET_NOT_FOUND',
    );

    await repository.createProvider({
      code: 'sms.bad-secret-http',
      type: 'sms',
      name: 'Bad SMS HTTP Secret',
      enabled: true,
      secretRef: 'secret://integration/sms/bad-secret-http',
      config: {
        adapter: 'http',
        endpoint: 'https://sms.gateway.test/send',
        allowedHosts: ['sms.gateway.test'],
        secretInjections: [
          {
            target: 'header',
            name: 'Authorization',
            secretRef: 'secret://integration/sms/bad-secret-http',
            prefix: 'Bearer ',
          },
        ],
      },
    });
    await expect(
      repository.checkProviderHealth('sms.bad-secret-http'),
    ).resolves.toMatchObject({
      healthStatus: 'degraded',
      lastCheckedAt: expect.any(String),
    });
    const queued = await repository.enqueueOutbox('sms', {
      providerCode: 'sms.bad-secret-http',
      templateCode: 'sms.otp',
      recipient: '+15551230000',
      payload: { code: '123456' },
    });
    await expect(
      repository.processOutbox('sms', { providerCode: 'sms.bad-secret-http' }),
    ).resolves.toMatchObject({
      attemptedCount: 1,
      sentCount: 0,
      failedCount: 1,
      queuedCount: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(
      repository.getOutboxMessage('sms', queued.id),
    ).resolves.toMatchObject({
      status: 'failed',
      retryCount: 1,
      error: expect.stringContaining('secret://config/<key>'),
    });

    fetchMock.mockRestore();
  });

  it('marks invalid SMS HTTP provider config degraded and fails delivery', async () => {
    const repository = new SeedIntegrationRepository();
    const fetchMock = jest.spyOn(globalThis, 'fetch');

    await repository.createProvider({
      code: 'sms.bad-http',
      type: 'sms',
      name: 'Bad SMS HTTP',
      enabled: true,
      secretRef: 'secret://integration/sms/bad-http',
      config: {
        adapter: 'http',
        endpoint: 'https://sms.gateway.test/send',
        allowedHosts: ['other.test'],
      },
    });
    await expect(
      repository.checkProviderHealth('sms.bad-http'),
    ).resolves.toMatchObject({
      healthStatus: 'degraded',
      lastCheckedAt: expect.any(String),
    });
    const queued = await repository.enqueueOutbox('sms', {
      providerCode: 'sms.bad-http',
      templateCode: 'sms.otp',
      recipient: '+15551230000',
      payload: { code: '123456' },
    });
    await expect(
      repository.processOutbox('sms', { providerCode: 'sms.bad-http' }),
    ).resolves.toMatchObject({
      attemptedCount: 1,
      sentCount: 0,
      failedCount: 1,
      queuedCount: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(
      repository.getOutboxMessage('sms', queued.id),
    ).resolves.toMatchObject({
      status: 'failed',
      retryCount: 1,
      error: expect.stringContaining('host is not allowlisted'),
    });

    fetchMock.mockRestore();
  });

  it('accepts only signed outbox provider callbacks', async () => {
    const repository = new SeedIntegrationRepository();
    await repository.enableProvider('mail.sandbox');
    const queued = await repository.enqueueOutbox('mail', {
      providerCode: 'mail.sandbox',
      templateCode: 'mail.welcome',
      recipient: 'admin@example.test',
      payload: { name: 'Admin' },
    });
    const callback = {
      channel: 'mail' as const,
      providerCode: 'mail.sandbox',
      messageId: queued.id,
      status: 'sent' as const,
    };
    const signature = createOutboxCallbackSignature(
      callback,
      'secret://integration/mail/sandbox',
    );

    await expectHttpExceptionCode(
      repository.callbackOutbox('mail', {
        ...callback,
        signature: '0'.repeat(64),
      }),
      'INTEGRATION_OUTBOX_CALLBACK_SIGNATURE_INVALID',
    );
    await expectHttpExceptionCode(
      repository.callbackOutbox('mail', {
        providerCode: 'mail.sandbox',
        messageId: queued.id,
        status: 'failed',
        error: ' ',
        signature,
      }),
      'INTEGRATION_OUTBOX_FAILURE_ERROR_REQUIRED',
    );
    await expectHttpExceptionCode(
      repository.callbackOutbox('sms', {
        ...callback,
        signature,
      }),
      'INTEGRATION_PROVIDER_TYPE_MISMATCH',
    );

    await expect(
      repository.callbackOutbox('mail', { ...callback, signature }),
    ).resolves.toMatchObject({
      id: queued.id,
      status: 'sent',
      error: undefined,
      sentAt: expect.any(String),
    });
  });

  it('guards outbox enqueue by enabled provider, channel, and template state', async () => {
    const repository = new SeedIntegrationRepository();

    await expectHttpExceptionCode(
      repository.enqueueOutbox('mail', {
        providerCode: 'mail.sandbox',
        templateCode: 'mail.welcome',
        recipient: 'admin@example.test',
        payload: { name: 'Admin' },
      }),
      'INTEGRATION_PROVIDER_DISABLED',
    );

    await repository.enableProvider('mail.sandbox');
    await expectHttpExceptionCode(
      repository.enqueueOutbox('sms', {
        providerCode: 'mail.sandbox',
        recipient: '+15551234567',
        payload: { code: '123456' },
      }),
      'INTEGRATION_PROVIDER_TYPE_MISMATCH',
    );

    await repository.enableProvider('sms.sandbox');
    await expectHttpExceptionCode(
      repository.enqueueOutbox('sms', {
        providerCode: 'sms.sandbox',
        recipient: '+15551234567',
        attachments: [
          {
            filename: 'otp.txt',
            contentType: 'text/plain',
            contentBase64: 'MTIzNDU2',
          },
        ],
        payload: { code: '123456' },
      }),
      'INTEGRATION_OUTBOX_SMS_ATTACHMENTS_UNSUPPORTED',
    );

    await repository.createTemplate('mail', {
      code: 'mail.disabled',
      name: 'Disabled mail',
      body: 'Disabled',
      enabled: false,
    });
    await expectHttpExceptionCode(
      repository.enqueueOutbox('mail', {
        providerCode: 'mail.sandbox',
        templateCode: 'mail.disabled',
        recipient: 'admin@example.test',
        payload: {},
      }),
      'INTEGRATION_TEMPLATE_DISABLED',
    );
  });

  it('enforces SMS recipient and verification-code safety', async () => {
    const repository = new SeedIntegrationRepository();
    await repository.enableProvider('sms.sandbox');

    await expect(
      repository.enqueueOutbox('sms', {
        providerCode: 'sms.sandbox',
        templateCode: 'sms.otp',
        recipient: '+15551234567',
        payload: { code: '123456' },
      }),
    ).resolves.toMatchObject({
      channel: 'sms',
      status: 'queued',
    });
    await expectHttpExceptionCode(
      repository.enqueueOutbox('sms', {
        providerCode: 'sms.sandbox',
        recipient: 'not-a-phone',
        payload: { code: '1' },
      }),
      'INTEGRATION_SMS_RECIPIENT_INVALID',
    );
  });

  it('exposes OAuth callback contract and integration design boundaries', () => {
    const repository = new SeedIntegrationRepository();

    expect(repository.getOAuthCallbackContract()).toMatchObject({
      stateTtlSeconds: 300,
      auditAction: 'integration.oauth.callback',
    });
    expect(repository.getDesign('wechat')).toMatchObject({
      status: 'design-only',
      documentPath: 'docs/development/integration-wechat-design.md',
    });
    expect(repository.getDesign('websocket').boundaries).toEqual(
      expect.arrayContaining(['auth required during connection upgrade']),
    );
    expect(repository.getDesign('pay').boundaries.join(' ')).toContain(
      'callback idempotency',
    );
  });

  it('runs OAuth callback flow with state validation, audit, and token archive', async () => {
    const repository = new SeedIntegrationRepository();

    const flow = await repository.startOAuthFlow({
      providerCode: 'oauth.github',
      subjectId: 'user_oauth_flow',
      scopes: ['read:user'],
    });
    expect(flow).toMatchObject({
      providerCode: 'oauth.github',
      subjectType: 'system-user',
      subjectId: 'user_oauth_flow',
      scopes: ['read:user'],
      status: 'pending',
    });
    expect(flow.authorizationUrl).toContain('state=');
    expect(flow.authorizationUrl).toContain('client_id=opencore-github');

    await expect(repository.listOAuthFlows()).resolves.toMatchObject({
      total: 1,
      items: [expect.objectContaining({ state: flow.state })],
    });

    const accepted = await repository.callbackOAuthProvider('github', {
      state: flow.state,
      code: 'oauth-callback-code',
      providerAccountId: 'github:opencore-flow',
      scopes: 'read:user user:email',
      expiresInSeconds: 3600,
    });
    expect(accepted).toMatchObject({
      providerCode: 'oauth.github',
      flowId: flow.id,
      state: flow.state,
      status: 'accepted',
      token: expect.objectContaining({
        providerCode: 'oauth.github',
        subjectId: 'user_oauth_flow',
        providerAccountId: 'github:opencore-flow',
        status: 'active',
        accessTokenRef:
          'secret://config/integration.oauth.github.user-oauth-flow.github-opencore-flow.access-token',
        refreshTokenRef:
          'secret://config/integration.oauth.github.user-oauth-flow.github-opencore-flow.refresh-token',
      }),
    });
    expect(accepted.audit.callbackCodeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(accepted)).not.toContain('oauth-callback-code');

    await expect(
      repository.listOAuthFlows({ status: 'completed' }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        expect.objectContaining({
          state: flow.state,
          status: 'completed',
          tokenId: accepted.token?.id,
        }),
      ],
    });
    await expect(
      repository.listOAuthCallbackAudits({ status: 'accepted' }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        expect.objectContaining({
          flowId: flow.id,
          status: 'accepted',
          tokenId: accepted.token?.id,
        }),
      ],
    });

    const repeated = await repository.callbackOAuthProvider('oauth.github', {
      state: flow.state,
      code: 'second-code',
    });
    expect(repeated).toMatchObject({
      status: 'rejected',
      message: 'OAuth callback state is completed.',
    });
    await expect(
      repository.listOAuthCallbackAudits({ status: 'rejected' }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        expect.objectContaining({
          flowId: flow.id,
          reason: 'OAuth callback state is completed.',
        }),
      ],
    });
  });

  it('exposes profile OAuth providers and bindings without secrets', async () => {
    const repository = new SeedIntegrationRepository(async () => 'secret');
    await repository.createProvider({
      code: 'oauth.ready',
      type: 'oauth',
      name: 'Ready OAuth',
      enabled: true,
      secretRef: 'secret://config/integration.oauth.ready.client-secret',
      config: {
        adapter: 'oauth2',
        clientId: 'ready-client-id',
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        callbackPath: '/api/integrations/oauth/callback/ready',
        scopes: ['read:user'],
      },
    });
    await repository.testProvider('oauth.ready');

    const providers = await repository.listProfileOAuthProviders();
    expect(providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bindingIssue: 'placeholder_client',
          bindingStatus: 'requires_configuration',
          code: 'oauth.github',
          name: 'GitHub OAuth',
          type: 'oauth',
        }),
        expect.objectContaining({
          bindingStatus: 'ready',
          code: 'oauth.ready',
          name: 'Ready OAuth',
          type: 'oauth',
        }),
      ]),
    );
    expect(JSON.stringify(providers)).not.toContain('secret');
    expect(JSON.stringify(providers)).not.toContain('clientId');
    await expect(
      repository.startProfileOAuthFlow('user_profile', {
        providerCode: 'oauth.github',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'INTEGRATION_OAUTH_PROFILE_PROVIDER_NOT_READY',
      }),
    });

    const flow = await repository.startProfileOAuthFlow('user_profile', {
      providerCode: 'oauth.ready',
    });
    expect(flow).toMatchObject({
      providerCode: 'oauth.ready',
      subjectType: 'user',
      subjectId: 'user_profile',
      status: 'pending',
    });

    const callback = await repository.callbackOAuthProvider('oauth.ready', {
      state: flow.state,
      code: 'profile-oauth-code',
      providerAccountId: 'ready:profile-user',
    });
    expect(callback.status).toBe('accepted');

    const accounts = await repository.listProfileOAuthAccounts('user_profile');
    expect(accounts).toEqual([
      expect.objectContaining({
        providerCode: 'oauth.ready',
        providerAccountId: 'ready:profile-user',
        status: 'active',
      }),
    ]);
    expect(JSON.stringify(accounts)).not.toContain('accessTokenRef');
    expect(JSON.stringify(accounts)).not.toContain('refreshTokenRef');

    const unbound = await repository.unbindProfileOAuthAccount(
      'user_profile',
      accounts[0].tokenId,
      'admin',
      { reason: 'profile self-service test' },
    );
    expect(unbound).toMatchObject({
      status: 'revoked',
      revokeReason: 'profile self-service test',
    });
  });

  it('tracks WebSocket runtime connections, subscriptions, and diagnostic events', async () => {
    const repository = new SeedIntegrationRepository();
    const delivered: unknown[] = [];
    const handle = repository.openWebSocketRuntimeConnection({
      subjectId: 'user_admin',
      query: {
        eventTypes: 'diagnostic.ping',
        room: 'integration.diagnostics',
      },
      emit: (event) => delivered.push(event),
    });

    await expect(
      repository.getWebSocketRuntimeDiagnostics(),
    ).resolves.toMatchObject({
      summary: {
        activeConnections: 1,
        activeSubscriptions: 1,
        recentEvents: 0,
        totalConnections: 1,
      },
      connections: [
        expect.objectContaining({
          id: handle.connection.id,
          status: 'connected',
          subjectId: 'user_admin',
          transport: 'sse',
        }),
      ],
      subscriptions: [
        expect.objectContaining({
          connectionId: handle.connection.id,
          eventTypes: ['diagnostic.ping'],
          room: 'integration.diagnostics',
          status: 'active',
        }),
      ],
    });

    const event = await repository.publishWebSocketRuntimeEvent({
      room: 'integration.diagnostics',
      type: 'diagnostic.ping',
      payload: {
        clientSecret: 'unsafe',
        message: 'runtime smoke',
      },
      traceId: 'trace-websocket-runtime',
    });
    expect(event).toMatchObject({
      deliveredCount: 1,
      payloadPreview: {
        clientSecret: '[REDACTED]',
        message: 'runtime smoke',
      },
      status: 'delivered',
      traceId: 'trace-websocket-runtime',
      type: 'diagnostic.ping',
    });
    expect(delivered).toHaveLength(1);
    expect(
      JSON.stringify(await repository.getWebSocketRuntimeDiagnostics()),
    ).not.toContain('unsafe');

    handle.heartbeat();
    handle.close('test_complete');
    await expect(
      repository.getWebSocketRuntimeDiagnostics(),
    ).resolves.toMatchObject({
      summary: {
        activeConnections: 0,
        activeSubscriptions: 0,
        recentEvents: 1,
      },
      connections: [
        expect.objectContaining({
          closeReason: 'test_complete',
          status: 'closed',
        }),
      ],
    });
    const skipped = await repository.publishWebSocketRuntimeEvent({
      room: 'integration.diagnostics',
      type: 'diagnostic.ping',
    });
    expect(skipped.status).toBe('no_subscribers');
    expect(delivered).toHaveLength(1);

    await expectHttpExceptionCode(
      repository.publishWebSocketRuntimeEvent({
        room: 'integration.diagnostics',
        type: 'chat.message',
      }),
      'INTEGRATION_WEBSOCKET_PUBLISH_EVENT_TYPE_INVALID',
    );
  });

  it('manages OAuth token inventory and revoke lifecycle', async () => {
    const repository = new SeedIntegrationRepository();

    await expect(repository.getOAuthTokenSummary()).resolves.toMatchObject({
      total: 4,
      active: 2,
      expired: 1,
      revoked: 1,
      providers: 1,
    });
    await expect(
      repository.listOAuthTokens({ providerCode: 'oauth.github' }),
    ).resolves.toMatchObject({
      total: 4,
      items: expect.arrayContaining([
        expect.objectContaining({
          id: 'oauth_token_github_admin_active',
          status: 'active',
          accessTokenRef:
            'secret://config/integration.oauth.github.admin.access-token',
        }),
      ]),
    });
    await expect(
      repository.listOAuthTokens({ status: 'expired' }),
    ).resolves.toMatchObject({
      total: 1,
      items: [
        expect.objectContaining({
          id: 'oauth_token_github_ops_expired',
          status: 'expired',
        }),
      ],
    });

    await expect(
      repository.revokeOAuthToken('oauth_token_github_admin_active', {
        reason: 'Round92 smoke revoke',
      }),
    ).resolves.toMatchObject({
      id: 'oauth_token_github_admin_active',
      status: 'revoked',
      revokedBy: 'admin',
      revokeReason: 'Round92 smoke revoke',
      revokedAt: expect.any(String),
    });
    await expect(
      repository.getOAuthToken('oauth_token_github_admin_active'),
    ).resolves.toMatchObject({
      status: 'revoked',
      revokeReason: 'Round92 smoke revoke',
    });
    await expect(repository.getOAuthTokenSummary()).resolves.toMatchObject({
      active: 1,
      expired: 1,
      revoked: 2,
    });
    await expect(
      repository.revokeOAuthToken('oauth_token_github_admin_active', {
        reason: 'second click',
      }),
    ).resolves.toMatchObject({
      revokeReason: 'Round92 smoke revoke',
    });
    await expectHttpExceptionCode(
      repository.revokeOAuthToken('oauth_token_github_ops_expired', {
        reason: ' ',
      }),
      'INTEGRATION_OAUTH_REVOKE_REASON_REQUIRED',
    );
    expect(JSON.stringify(await repository.listOAuthTokens())).not.toContain(
      'ghp_',
    );
  });
});

async function expectHttpExceptionCode(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(getHttpExceptionResponse(error)).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected HTTP exception code ${code}`);
}

function getHttpExceptionResponse(error: unknown): unknown {
  if (
    error &&
    typeof error === 'object' &&
    'getResponse' in error &&
    typeof error.getResponse === 'function'
  ) {
    return error.getResponse();
  }

  return undefined;
}
