import type {
  IntegrationDesignDto,
  IntegrationOutboxDto,
  IntegrationProviderDto,
  IntegrationTemplateDto,
  OAuthCallbackContractDto,
} from './integration.dto';

export type IntegrationProviderRecord = IntegrationProviderDto;
export type IntegrationTemplateRecord = IntegrationTemplateDto;
export type IntegrationOutboxRecord = IntegrationOutboxDto;
export type OAuthCallbackContractRecord = OAuthCallbackContractDto;
export type IntegrationDesignRecord = IntegrationDesignDto;

export const seedIntegrationProviders: readonly IntegrationProviderRecord[] = [
  {
    id: 'provider_mail_sandbox',
    code: 'mail.sandbox',
    type: 'mail',
    name: 'Mail Sandbox',
    enabled: false,
    secretRef: 'secret://integration/mail/sandbox',
    config: {
      adapter: 'sandbox',
      host: 'smtp.example.test',
      port: 587,
      clientSecret: '[REDACTED]',
    },
    healthStatus: 'disabled',
  },
  {
    id: 'provider_sms_sandbox',
    code: 'sms.sandbox',
    type: 'sms',
    name: 'SMS Sandbox',
    enabled: false,
    secretRef: 'secret://integration/sms/sandbox',
    config: {
      adapter: 'sandbox',
      endpoint: 'https://sms.example.test',
      token: '[REDACTED]',
    },
    healthStatus: 'disabled',
  },
];

export const seedIntegrationTemplates: readonly IntegrationTemplateRecord[] = [
  {
    id: 'template_mail_welcome',
    code: 'mail.welcome',
    channel: 'mail',
    name: 'Welcome Mail',
    subject: 'Welcome {{name}}',
    body: 'Hello {{name}}, welcome to OpenCore.',
    enabled: true,
  },
  {
    id: 'template_sms_otp',
    code: 'sms.otp',
    channel: 'sms',
    name: 'OTP SMS',
    body: 'Your verification code is {{code}}.',
    enabled: true,
  },
];

export const seedIntegrationOutbox: readonly IntegrationOutboxRecord[] = [
  {
    id: 'outbox_mail_1',
    channel: 'mail',
    providerCode: 'mail.sandbox',
    templateCode: 'mail.welcome',
    recipient: 'admin@example.test',
    payload: { name: 'Admin' },
    status: 'queued',
    retryCount: 0,
    preview: 'Hello Admin, welcome to OpenCore.',
    createdAt: '2026-06-10T00:00:00.000Z',
  },
];

export const oauthCallbackContract: OAuthCallbackContractRecord = {
  callbackPath: '/api/integrations/oauth/callback/:providerCode',
  stateTtlSeconds: 300,
  securityChecks: [
    'state is single-use and expires quickly',
    'callback validates provider code against enabled config',
    'account binding requires authenticated user session',
    'provider tokens are stored only through secret references',
  ],
  accountBinding: ['user id', 'provider code', 'provider account id'],
  auditAction: 'integration.oauth.callback',
};

export const integrationDesigns: readonly IntegrationDesignRecord[] = [
  {
    topic: 'wechat',
    status: 'design-only',
    boundaries: [
      'provider config and health check only',
      'no complete WeChat business workflow in core',
      'callbacks must be audited and signature-validated before use',
    ],
    documentPath: 'docs/development/integration-wechat-design.md',
  },
  {
    topic: 'websocket',
    status: 'design-only',
    boundaries: [
      'auth required during connection upgrade',
      'rooms are permission scoped',
      'events declare audit and retention policy',
    ],
    documentPath: 'docs/development/integration-websocket-design.md',
  },
  {
    topic: 'pay',
    status: 'design-only',
    boundaries: [
      'mock/sandbox providers only',
      'no real payment until callback idempotency is complete',
      'refund and reconciliation are required before production use',
    ],
    documentPath: 'docs/development/integration-payment-provider-design.md',
  },
];
