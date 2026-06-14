import { BadRequestException } from '@nestjs/common';
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
      providers: { total: 4, enabled: 0, disabled: 4, degraded: 0 },
      mailOutbox: { total: 1, queued: 1 },
      smsOutbox: { total: 0, queued: 0 },
      oauthProviders: 0,
      designs: { designOnlyTopics: 3 },
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
    ).resolves.toMatchObject({ total: 0 });
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
    await expect(
      repository.createProvider({
        code: 'mail.invalid',
        type: 'mail',
        name: 'Invalid',
        secretRef: 'plain-secret',
        config: {},
      }),
    ).rejects.toThrow(BadRequestException);
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
        total: 4,
        blocked: 4,
        failed: 1,
        retryableFailed: 1,
        configVaultBacked: 2,
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
    await expect(
      repository.markOutboxFailed('mail', queued.id, { error: ' ' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      repository.markOutboxSent('mail', queued.id),
    ).resolves.toMatchObject({
      id: queued.id,
      status: 'sent',
      error: undefined,
      sentAt: expect.any(String),
    });
    await expect(repository.retryOutbox('mail', queued.id)).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      repository.markOutboxFailed('mail', queued.id, { error: 'too late' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      repository.markOutboxFailed('sms', queued.id, { error: 'wrong channel' }),
    ).rejects.toThrow('Integration outbox message not found');
  });

  it('processes queued outbox messages through the provider reliability loop', async () => {
    const repository = new SeedIntegrationRepository();

    await expect(
      repository.processOutbox('mail', { providerCode: 'mail.sandbox' }),
    ).rejects.toThrow(BadRequestException);
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
    await expect(
      repository.markOutboxFailed('mail', processed.id, { error: 'too late' }),
    ).rejects.toThrow(BadRequestException);
    await expect(repository.retryOutbox('mail', processed.id)).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      repository.processOutbox('mail', { providerCode: ' ' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      repository.processOutbox('mail', { limit: 0 }),
    ).rejects.toThrow(BadRequestException);
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

    await expect(
      repository.runOutboxSchedule({ channels: ['push' as never] }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      repository.runOutboxSchedule({
        channels: ['sms'],
        providerCode: 'mail.sandbox',
      }),
    ).rejects.toThrow(BadRequestException);
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

    await expect(
      repository.callbackOutbox('mail', {
        ...callback,
        signature: '0'.repeat(64),
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      repository.callbackOutbox('mail', {
        providerCode: 'mail.sandbox',
        messageId: queued.id,
        status: 'failed',
        error: ' ',
        signature,
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      repository.callbackOutbox('sms', {
        ...callback,
        signature,
      }),
    ).rejects.toThrow(BadRequestException);

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

    await expect(
      repository.enqueueOutbox('mail', {
        providerCode: 'mail.sandbox',
        templateCode: 'mail.welcome',
        recipient: 'admin@example.test',
        payload: { name: 'Admin' },
      }),
    ).rejects.toThrow(BadRequestException);

    await repository.enableProvider('mail.sandbox');
    await expect(
      repository.enqueueOutbox('sms', {
        providerCode: 'mail.sandbox',
        recipient: '+15551234567',
        payload: { code: '123456' },
      }),
    ).rejects.toThrow(BadRequestException);

    await repository.enableProvider('sms.sandbox');
    await expect(
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
    ).rejects.toThrow(BadRequestException);

    await repository.createTemplate('mail', {
      code: 'mail.disabled',
      name: 'Disabled mail',
      body: 'Disabled',
      enabled: false,
    });
    await expect(
      repository.enqueueOutbox('mail', {
        providerCode: 'mail.sandbox',
        templateCode: 'mail.disabled',
        recipient: 'admin@example.test',
        payload: {},
      }),
    ).rejects.toThrow(BadRequestException);
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
    await expect(
      repository.enqueueOutbox('sms', {
        providerCode: 'sms.sandbox',
        recipient: 'not-a-phone',
        payload: { code: '1' },
      }),
    ).rejects.toThrow(BadRequestException);
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
});
