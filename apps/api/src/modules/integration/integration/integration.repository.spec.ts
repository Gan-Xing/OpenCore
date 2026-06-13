import { BadRequestException } from '@nestjs/common';
import { createOutboxCallbackSignature } from './integration.repository';
import { SeedIntegrationRepository } from './seed-integration.repository';

describe('IntegrationRepository', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds a bounded integration center summary', async () => {
    const repository = new SeedIntegrationRepository();

    expect(await repository.getSummary()).toMatchObject({
      providers: { total: 2, enabled: 0, disabled: 2, degraded: 0 },
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
    ).resolves.toMatchObject({ total: 1 });
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
