import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../core/rbac/permissions.decorator';
import { IntegrationController } from './integration.controller';

describe('IntegrationController permission matrix', () => {
  it('guards provider, mail, SMS, OAuth, and design routes', () => {
    const expected: Array<[keyof IntegrationController, string[]]> = [
      ['listProviders', ['integration:provider:read']],
      ['getProviderHealthAudit', ['integration:provider:read']],
      ['getProvider', ['integration:provider:read']],
      ['createProvider', ['integration:provider:create']],
      ['updateProvider', ['integration:provider:update']],
      ['enableProvider', ['integration:provider:update']],
      ['disableProvider', ['integration:provider:update']],
      ['checkProviderHealth', ['integration:provider:manage']],
      ['testProvider', ['integration:provider:manage']],
      ['getProviderDiagnostics', ['integration:provider:read']],
      ['listProviderAuditLogs', ['integration:provider:read']],
      ['runOutboxSchedule', ['integration:provider:manage']],
      ['listMailTemplates', ['integration:mail:read']],
      ['getMailTemplate', ['integration:mail:read']],
      ['createMailTemplate', ['integration:mail:create']],
      ['previewMailTemplate', ['integration:mail:read']],
      ['listMailOutbox', ['integration:mail:read']],
      ['getMailOutboxMessage', ['integration:mail:read']],
      ['enqueueMail', ['integration:mail:manage']],
      ['sendMailTest', ['integration:mail:manage']],
      ['markMailOutboxSent', ['integration:mail:manage']],
      ['markMailOutboxFailed', ['integration:mail:manage']],
      ['retryMailOutbox', ['integration:mail:manage']],
      ['processMailOutbox', ['integration:mail:manage']],
      ['callbackMailOutbox', ['integration:mail:manage']],
      ['listSmsTemplates', ['integration:sms:read']],
      ['getSmsTemplate', ['integration:sms:read']],
      ['createSmsTemplate', ['integration:sms:create']],
      ['previewSmsTemplate', ['integration:sms:read']],
      ['listSmsOutbox', ['integration:sms:read']],
      ['getSmsOutboxMessage', ['integration:sms:read']],
      ['enqueueSms', ['integration:sms:manage']],
      ['sendSmsTest', ['integration:sms:manage']],
      ['markSmsOutboxSent', ['integration:sms:manage']],
      ['markSmsOutboxFailed', ['integration:sms:manage']],
      ['retrySmsOutbox', ['integration:sms:manage']],
      ['processSmsOutbox', ['integration:sms:manage']],
      ['callbackSmsOutbox', ['integration:sms:manage']],
      ['listOAuthProviders', ['integration:oauth:read']],
      ['getOAuthCallbackContract', ['integration:oauth:read']],
      ['getOAuthTokenSummary', ['integration:oauth:read']],
      ['listOAuthTokens', ['integration:oauth:read']],
      ['getOAuthToken', ['integration:oauth:read']],
      ['revokeOAuthToken', ['integration:oauth:manage']],
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
