import { BadRequestException } from '@nestjs/common';
import { SeedIntegrationRepository } from './seed-integration.repository';

describe('IntegrationRepository', () => {
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
