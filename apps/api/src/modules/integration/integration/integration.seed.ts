import type {
  IntegrationDesignDto,
  IntegrationOutboxDto,
  IntegrationProviderAuditLogDto,
  OAuthCallbackAuditDto,
  OAuthTokenDto,
  OAuthFlowDto,
  WebSocketRuntimeConnectionDto,
  WebSocketRuntimeEventDto,
  WebSocketRuntimeSubscriptionDto,
  IntegrationProviderDto,
  IntegrationTemplateDto,
  OAuthCallbackContractDto,
} from './integration.dto';

export type IntegrationProviderRecord = IntegrationProviderDto;
export type IntegrationProviderAuditLogRecord = IntegrationProviderAuditLogDto;
export type IntegrationTemplateRecord = IntegrationTemplateDto;
export type IntegrationOutboxRecord = IntegrationOutboxDto;
export type OAuthCallbackContractRecord = OAuthCallbackContractDto;
export type OAuthFlowRecord = OAuthFlowDto;
export type OAuthCallbackAuditRecord = OAuthCallbackAuditDto;
export type OAuthTokenRecord = OAuthTokenDto;
export type WebSocketRuntimeConnectionRecord = WebSocketRuntimeConnectionDto;
export type WebSocketRuntimeSubscriptionRecord =
  WebSocketRuntimeSubscriptionDto;
export type WebSocketRuntimeEventRecord = WebSocketRuntimeEventDto;
export type IntegrationDesignRecord = IntegrationDesignDto;

const ROOT_TENANT_ID = 'tenant_root';

function withRootTenant<T extends object>(record: T): T & { tenantId: string } {
  return { tenantId: ROOT_TENANT_ID, ...record };
}

export const seedIntegrationProviders: readonly IntegrationProviderRecord[] = (
  [
    {
      id: 'provider_mail_sandbox',
      code: 'mail.sandbox',
      type: 'mail',
      name: 'Mail Sandbox',
      enabled: false,
      secretRef: 'secret://integration/mail/sandbox',
      secretRefStatus: 'unchecked',
      configVersion: 1,
      config: {
        adapter: 'sandbox',
        host: 'smtp.example.test',
        port: 587,
        clientSecret: '[REDACTED]',
      },
      healthStatus: 'disabled',
    },
    {
      id: 'provider_mail_smtp',
      code: 'mail.smtp',
      type: 'mail',
      name: 'Mail SMTP',
      enabled: false,
      secretRef: 'secret://config/integration.mail.smtp.password.secret',
      secretRefStatus: 'unchecked',
      configVersion: 1,
      config: {
        adapter: 'smtp',
        authMethod: 'PLAIN',
        from: 'no-reply@opencore.test',
        host: 'smtp.example.test',
        port: 587,
        tlsMode: 'starttls-required',
        timeoutMs: 10000,
        username: 'smtp-user',
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
      secretRefStatus: 'unchecked',
      configVersion: 1,
      config: {
        adapter: 'sandbox',
        endpoint: 'https://sms.example.test',
        token: '[REDACTED]',
      },
      healthStatus: 'disabled',
    },
    {
      id: 'provider_sms_http',
      code: 'sms.http',
      type: 'sms',
      name: 'SMS HTTP',
      enabled: false,
      secretRef: 'secret://config/integration.sms.http.api-key.secret',
      secretRefStatus: 'unchecked',
      configVersion: 1,
      config: {
        adapter: 'http',
        endpoint: 'https://sms.example.test/send',
        allowedHosts: ['sms.example.test'],
        method: 'POST',
        headers: {
          'x-provider': 'opencore',
        },
        secretInjections: [
          {
            target: 'header',
            name: 'Authorization',
            secretRef: 'secret://config/integration.sms.http.api-key.secret',
            prefix: 'Bearer ',
          },
          {
            target: 'query',
            name: 'api_key',
            secretRef: 'secret://config/integration.sms.http.api-key.secret',
          },
          {
            target: 'body',
            name: 'apiToken',
            secretRef: 'secret://config/integration.sms.http.api-key.secret',
          },
        ],
        successStatus: 202,
        timeoutMs: 5000,
      },
      healthStatus: 'disabled',
    },
    {
      id: 'provider_oauth_github',
      code: 'oauth.github',
      type: 'oauth',
      name: 'GitHub OAuth',
      enabled: true,
      secretRef:
        'secret://config/integration.oauth.github.client-secret.secret',
      secretRefStatus: 'unchecked',
      configVersion: 1,
      config: {
        adapter: 'oauth2',
        clientId: 'opencore-github',
        clientSecret: '[REDACTED]',
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        callbackPath: '/api/integrations/oauth/callback/github',
        scopes: ['read:user', 'user:email'],
      },
      healthStatus: 'unknown',
    },
    {
      id: 'provider_oauth_google',
      code: 'oauth.google',
      type: 'oauth',
      name: 'Google OAuth',
      enabled: false,
      secretRef:
        'secret://config/integration.oauth.google.client-secret.secret',
      secretRefStatus: 'unchecked',
      configVersion: 1,
      config: {
        adapter: 'oauth2',
        clientId: 'opencore-google',
        clientSecret: '[REDACTED]',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        callbackPath: '/api/auth/social/callback/google',
        scopes: ['openid', 'email', 'profile'],
      },
      healthStatus: 'disabled',
    },
    {
      id: 'provider_oauth_microsoft',
      code: 'oauth.microsoft',
      type: 'oauth',
      name: 'Microsoft OAuth',
      enabled: false,
      secretRef:
        'secret://config/integration.oauth.microsoft.client-secret.secret',
      secretRefStatus: 'unchecked',
      configVersion: 1,
      config: {
        adapter: 'oauth2',
        clientId: 'opencore-microsoft',
        clientSecret: '[REDACTED]',
        authorizationUrl:
          'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        callbackPath: '/api/auth/social/callback/microsoft',
        scopes: ['openid', 'email', 'profile', 'User.Read'],
      },
      healthStatus: 'disabled',
    },
    {
      id: 'provider_oauth_wechat',
      code: 'oauth.wechat',
      type: 'oauth',
      name: 'WeChat OAuth',
      enabled: false,
      secretRef:
        'secret://config/integration.oauth.wechat.client-secret.secret',
      secretRefStatus: 'unchecked',
      configVersion: 1,
      config: {
        adapter: 'oauth2',
        clientId: 'opencore-wechat',
        clientSecret: '[REDACTED]',
        authorizationUrl: 'https://open.weixin.qq.com/connect/qrconnect',
        tokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
        callbackPath: '/api/auth/social/callback/wechat',
        scopes: ['snsapi_login'],
      },
      healthStatus: 'disabled',
    },
    {
      id: 'provider_oauth_alipay',
      code: 'oauth.alipay',
      type: 'oauth',
      name: 'Alipay OAuth',
      enabled: false,
      secretRef:
        'secret://config/integration.oauth.alipay.client-secret.secret',
      secretRefStatus: 'unchecked',
      configVersion: 1,
      config: {
        adapter: 'oauth2',
        clientId: 'opencore-alipay',
        clientSecret: '[REDACTED]',
        authorizationUrl:
          'https://openauth.alipay.com/oauth2/publicAppAuthorize.htm',
        tokenUrl: 'https://openapi.alipay.com/gateway.do',
        callbackPath: '/api/auth/social/callback/alipay',
        scopes: ['auth_user'],
      },
      healthStatus: 'disabled',
    },
    {
      id: 'provider_oauth_douyin',
      code: 'oauth.douyin',
      type: 'oauth',
      name: 'Douyin OAuth',
      enabled: false,
      secretRef:
        'secret://config/integration.oauth.douyin.client-secret.secret',
      secretRefStatus: 'unchecked',
      configVersion: 1,
      config: {
        adapter: 'oauth2',
        clientId: 'opencore-douyin',
        clientSecret: '[REDACTED]',
        authorizationUrl: 'https://open.douyin.com/platform/oauth/connect',
        tokenUrl: 'https://open.douyin.com/oauth/access_token',
        callbackPath: '/api/auth/social/callback/douyin',
        scopes: ['user_info'],
      },
      healthStatus: 'disabled',
    },
  ] as const
).map(withRootTenant);

export const seedIntegrationTemplates: readonly IntegrationTemplateRecord[] = (
  [
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
  ] as const
).map(withRootTenant);

export const seedIntegrationOutbox: readonly IntegrationOutboxRecord[] = (
  [
    {
      id: 'outbox_mail_1',
      channel: 'mail',
      providerCode: 'mail.sandbox',
      templateCode: 'mail.welcome',
      recipient: 'admin@example.test',
      subject: 'Welcome Admin',
      payload: { name: 'Admin' },
      attachments: [
        {
          filename: 'welcome.txt',
          contentType: 'text/plain',
          contentBase64: 'T3BlbkNvcmUgYXR0YWNobWVudCBmaXh0dXJlCg==',
          sizeBytes: 28,
        },
      ],
      status: 'queued',
      retryCount: 0,
      preview: 'Hello Admin, welcome to OpenCore.',
      createdAt: '2026-06-10T00:00:00.000Z',
    },
    {
      id: 'outbox_sms_otp_1',
      channel: 'sms',
      providerCode: 'sms.sandbox',
      templateCode: 'sms.otp',
      recipient: '+15551234567',
      payload: { code: '123456' },
      status: 'sent',
      retryCount: 0,
      preview: 'Your verification code is 123456.',
      sentAt: '2026-06-10T00:05:00.000Z',
      createdAt: '2026-06-10T00:00:00.000Z',
    },
  ] as const
).map(withRootTenant);

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

export const seedIntegrationOAuthTokens: readonly OAuthTokenRecord[] = (
  [
    {
      id: 'oauth_token_github_admin_active',
      providerCode: 'oauth.github',
      subjectType: 'system-user',
      subjectId: 'user_admin',
      providerAccountId: 'github:opencore-admin',
      scopes: ['read:user', 'user:email'],
      accessTokenRef:
        'secret://config/integration.oauth.github.admin.access-token',
      refreshTokenRef:
        'secret://config/integration.oauth.github.admin.refresh-token',
      status: 'active',
      expiresAt: '2099-01-01T00:00:00.000Z',
      lastRotatedAt: '2026-06-10T00:00:00.000Z',
      createdAt: '2026-06-10T00:00:00.000Z',
    },
    {
      id: 'oauth_token_github_ops_expired',
      providerCode: 'oauth.github',
      subjectType: 'system-user',
      subjectId: 'user_ops',
      providerAccountId: 'github:opencore-ops',
      scopes: ['read:user'],
      accessTokenRef:
        'secret://config/integration.oauth.github.ops.access-token',
      refreshTokenRef:
        'secret://config/integration.oauth.github.ops.refresh-token',
      status: 'expired',
      expiresAt: '2026-01-01T00:00:00.000Z',
      lastRotatedAt: '2025-12-01T00:00:00.000Z',
      createdAt: '2025-12-01T00:00:00.000Z',
    },
    {
      id: 'oauth_token_github_smoke_revoke',
      providerCode: 'oauth.github',
      subjectType: 'system-user',
      subjectId: 'user_smoke',
      providerAccountId: 'github:opencore-smoke',
      scopes: ['read:user'],
      accessTokenRef:
        'secret://config/integration.oauth.github.smoke.access-token',
      refreshTokenRef:
        'secret://config/integration.oauth.github.smoke.refresh-token',
      status: 'active',
      expiresAt: '2099-01-01T00:00:00.000Z',
      lastRotatedAt: '2026-06-10T00:00:00.000Z',
      createdAt: '2026-06-10T00:00:00.000Z',
    },
    {
      id: 'oauth_token_github_auditor_revoked',
      providerCode: 'oauth.github',
      subjectType: 'system-user',
      subjectId: 'user_auditor',
      providerAccountId: 'github:opencore-auditor',
      scopes: ['read:user'],
      accessTokenRef:
        'secret://config/integration.oauth.github.auditor.access-token',
      status: 'revoked',
      expiresAt: '2099-01-01T00:00:00.000Z',
      lastRotatedAt: '2026-06-01T00:00:00.000Z',
      revokedAt: '2026-06-12T00:00:00.000Z',
      revokedBy: 'admin',
      revokeReason: 'Seeded revoked OAuth token',
      createdAt: '2026-06-01T00:00:00.000Z',
    },
  ] as const
).map(withRootTenant);

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
    status: 'runtime-active',
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
