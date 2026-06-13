import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../core/rbac/permissions.decorator';
import { IntegrationController } from './integration.controller';

describe('IntegrationController permission matrix', () => {
  it('guards provider, mail, SMS, OAuth, and design routes', () => {
    const expected: Array<[keyof IntegrationController, string[]]> = [
      ['listProviders', ['integration:provider:read']],
      ['getProvider', ['integration:provider:read']],
      ['createProvider', ['integration:provider:create']],
      ['updateProvider', ['integration:provider:update']],
      ['enableProvider', ['integration:provider:update']],
      ['disableProvider', ['integration:provider:update']],
      ['checkProviderHealth', ['integration:provider:manage']],
      ['listMailTemplates', ['integration:mail:read']],
      ['getMailTemplate', ['integration:mail:read']],
      ['createMailTemplate', ['integration:mail:create']],
      ['previewMailTemplate', ['integration:mail:read']],
      ['listMailOutbox', ['integration:mail:read']],
      ['getMailOutboxMessage', ['integration:mail:read']],
      ['enqueueMail', ['integration:mail:manage']],
      ['markMailOutboxSent', ['integration:mail:manage']],
      ['markMailOutboxFailed', ['integration:mail:manage']],
      ['retryMailOutbox', ['integration:mail:manage']],
      ['processMailOutbox', ['integration:mail:manage']],
      ['listSmsTemplates', ['integration:sms:read']],
      ['getSmsTemplate', ['integration:sms:read']],
      ['createSmsTemplate', ['integration:sms:create']],
      ['previewSmsTemplate', ['integration:sms:read']],
      ['listSmsOutbox', ['integration:sms:read']],
      ['getSmsOutboxMessage', ['integration:sms:read']],
      ['enqueueSms', ['integration:sms:manage']],
      ['markSmsOutboxSent', ['integration:sms:manage']],
      ['markSmsOutboxFailed', ['integration:sms:manage']],
      ['retrySmsOutbox', ['integration:sms:manage']],
      ['processSmsOutbox', ['integration:sms:manage']],
      ['listOAuthProviders', ['integration:oauth:read']],
      ['getOAuthCallbackContract', ['integration:oauth:read']],
      ['getWeChatDesign', ['integration:wechat:read']],
      ['getWebSocketDesign', ['integration:websocket:read']],
      ['getPaymentDesign', ['integration:billing-design:read']],
    ];

    for (const [method, permissions] of expected) {
      expect(
        Reflect.getMetadata(
          REQUIRED_PERMISSIONS_KEY,
          IntegrationController.prototype[method],
        ),
      ).toEqual(permissions);
    }
  });
});
