import { createIntegrationClient } from './integration-client';
import type { SdkRequest } from './rbac-client';

describe('createIntegrationClient', () => {
  it('uses stable S12 integration API paths', async () => {
    const calls: Array<{ path: string; method?: string }> = [];
    const request: SdkRequest = async (path, options) => {
      calls.push({ path, method: options?.method });
      return {} as never;
    };
    const client = createIntegrationClient(request);

    await client.getSummary('token');
    await client.listProviders('token', {
      page: 1,
      pageSize: 10,
      type: 'mail',
      enabled: false,
    });
    await client.getProvider('token', 'mail.sandbox');
    await client.createProvider('token', {
      code: 'mail.sandbox',
      type: 'mail',
      name: 'Mail Sandbox',
      secretRef: 'secret://integration/mail/sandbox',
      config: {},
    });
    await client.updateProvider('token', 'mail.sandbox', {
      enabled: true,
    });
    await client.enableProvider('token', 'mail.sandbox');
    await client.disableProvider('token', 'mail.sandbox');
    await client.checkProviderHealth('token', 'mail.sandbox');
    await client.listMailTemplates('token', { enabled: true });
    await client.getMailTemplate('token', 'mail.welcome');
    await client.createMailTemplate('token', {
      code: 'mail.welcome',
      name: 'Welcome',
      subject: 'Welcome',
      body: 'Hello',
    });
    await client.previewMailTemplate('token', {
      templateCode: 'mail.welcome',
      payload: { name: 'Admin' },
    });
    await client.listMailOutbox('token', {
      status: 'queued',
      providerCode: 'mail.sandbox',
    });
    await client.getMailOutboxMessage('token', 'outbox_mail_1');
    await client.enqueueMail('token', {
      providerCode: 'mail.sandbox',
      recipient: 'admin@example.test',
      payload: { name: 'Admin' },
    });
    await client.markMailOutboxFailed('token', 'outbox_mail_1', {
      error: 'SMTP rejected',
    });
    await client.retryMailOutbox('token', 'outbox_mail_1');
    await client.markMailOutboxSent('token', 'outbox_mail_1');
    await client.listSmsTemplates('token', { enabled: true });
    await client.getSmsTemplate('token', 'sms.otp');
    await client.createSmsTemplate('token', {
      code: 'sms.otp',
      name: 'OTP',
      body: 'Code {{code}}',
    });
    await client.previewSmsTemplate('token', {
      templateCode: 'sms.otp',
      payload: { code: '123456' },
    });
    await client.listSmsOutbox('token', { status: 'queued' });
    await client.getSmsOutboxMessage('token', 'outbox_sms_1');
    await client.enqueueSms('token', {
      providerCode: 'sms.sandbox',
      recipient: '+15551234567',
      payload: { code: '123456' },
    });
    await client.markSmsOutboxFailed('token', 'outbox_sms_1', {
      error: 'Gateway throttled',
    });
    await client.retrySmsOutbox('token', 'outbox_sms_1');
    await client.markSmsOutboxSent('token', 'outbox_sms_1');
    await client.listOAuthProviders('token', { enabled: true });
    await client.getOAuthCallbackContract('token');
    await client.getWeChatDesign('token');
    await client.getWebSocketDesign('token');
    await client.getPaymentDesign('token');

    expect(calls).toEqual([
      { path: '/integrations/summary' },
      {
        path: '/integrations/providers?page=1&pageSize=10&type=mail&enabled=false',
      },
      { path: '/integrations/providers/mail.sandbox' },
      { path: '/integrations/providers', method: 'POST' },
      { path: '/integrations/providers/mail.sandbox', method: 'PATCH' },
      { path: '/integrations/providers/mail.sandbox/enable', method: 'PATCH' },
      {
        path: '/integrations/providers/mail.sandbox/disable',
        method: 'PATCH',
      },
      {
        path: '/integrations/providers/mail.sandbox/health-check',
        method: 'POST',
      },
      { path: '/integrations/mail/templates?enabled=true' },
      { path: '/integrations/mail/templates/mail.welcome' },
      { path: '/integrations/mail/templates', method: 'POST' },
      { path: '/integrations/mail/preview', method: 'POST' },
      {
        path: '/integrations/mail/outbox?status=queued&providerCode=mail.sandbox',
      },
      { path: '/integrations/mail/outbox/outbox_mail_1' },
      { path: '/integrations/mail/outbox', method: 'POST' },
      {
        path: '/integrations/mail/outbox/outbox_mail_1/failed',
        method: 'PATCH',
      },
      {
        path: '/integrations/mail/outbox/outbox_mail_1/retry',
        method: 'PATCH',
      },
      {
        path: '/integrations/mail/outbox/outbox_mail_1/sent',
        method: 'PATCH',
      },
      { path: '/integrations/sms/templates?enabled=true' },
      { path: '/integrations/sms/templates/sms.otp' },
      { path: '/integrations/sms/templates', method: 'POST' },
      { path: '/integrations/sms/preview', method: 'POST' },
      { path: '/integrations/sms/outbox?status=queued' },
      { path: '/integrations/sms/outbox/outbox_sms_1' },
      { path: '/integrations/sms/outbox', method: 'POST' },
      {
        path: '/integrations/sms/outbox/outbox_sms_1/failed',
        method: 'PATCH',
      },
      {
        path: '/integrations/sms/outbox/outbox_sms_1/retry',
        method: 'PATCH',
      },
      {
        path: '/integrations/sms/outbox/outbox_sms_1/sent',
        method: 'PATCH',
      },
      { path: '/integrations/oauth/providers?enabled=true' },
      { path: '/integrations/oauth/callback-contract' },
      { path: '/integrations/designs/wechat' },
      { path: '/integrations/designs/websocket' },
      { path: '/integrations/designs/pay' },
    ]);
  });
});
