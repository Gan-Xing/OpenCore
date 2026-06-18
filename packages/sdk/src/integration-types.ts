import type { PageRequest, PageResponse } from './system-management-types';

export type { PageRequest, PageResponse };

export type IntegrationProviderType =
  | 'mail'
  | 'oauth'
  | 'pay'
  | 'sms'
  | 'websocket'
  | 'wechat';

export type IntegrationProviderSecretRefStatus =
  | 'invalid'
  | 'missing'
  | 'unchecked'
  | 'unsupported'
  | 'valid';

export type IntegrationProviderTestStatus =
  | 'failed'
  | 'not_run'
  | 'passed'
  | 'warning';

export type IntegrationProviderAuditAction =
  | 'created'
  | 'disabled'
  | 'enabled'
  | 'health_checked'
  | 'tested'
  | 'updated';

export type IntegrationMailSmtpTlsMode =
  | 'implicit-tls'
  | 'plain'
  | 'starttls-optional'
  | 'starttls-required';

export type IntegrationProviderSummary = {
  id: string;
  code: string;
  type: IntegrationProviderType;
  name: string;
  enabled: boolean;
  secretRef: string;
  secretRefStatus: IntegrationProviderSecretRefStatus;
  configVersion: number;
  config: Record<string, unknown>;
  healthStatus: 'degraded' | 'disabled' | 'healthy' | 'unknown';
  lastCheckedAt?: string;
  lastTestStatus?: IntegrationProviderTestStatus;
  lastTestMessage?: string;
  lastTestedAt?: string;
};

export type IntegrationProviderTestResult = {
  provider: IntegrationProviderSummary;
  status: IntegrationProviderTestStatus;
  secretRefStatus: IntegrationProviderSecretRefStatus;
  message: string;
  testedAt: string;
};

export type IntegrationProviderAuditLogSummary = {
  id: string;
  providerCode: string;
  action: IntegrationProviderAuditAction;
  actor: string;
  reason?: string;
  beforeConfigVersion?: number;
  afterConfigVersion?: number;
  beforeSecretRefStatus?: IntegrationProviderSecretRefStatus;
  afterSecretRefStatus?: IntegrationProviderSecretRefStatus;
  testStatus?: IntegrationProviderTestStatus;
  message?: string;
  summary?: Record<string, unknown>;
  createdAt: string;
};

export type IntegrationProviderDiagnosticCheck = {
  code: string;
  status: 'fail' | 'pass' | 'warn';
  message: string;
};

export type IntegrationProviderDiagnosticLastFailure = {
  id: string;
  error?: string;
  retryCount: number;
  createdAt: string;
};

export type IntegrationProviderDiagnosticOutbox = {
  total: number;
  queued: number;
  sent: number;
  failed: number;
  retryableFailed: number;
  lastFailure?: IntegrationProviderDiagnosticLastFailure;
};

export type IntegrationProviderDiagnosticsSummary = {
  provider: IntegrationProviderSummary;
  channel?: 'mail' | 'sms';
  readiness: 'attention' | 'blocked' | 'ready' | 'unsupported';
  outbox: IntegrationProviderDiagnosticOutbox;
  checks: readonly IntegrationProviderDiagnosticCheck[];
  actions: readonly string[];
  generatedAt: string;
};

export type IntegrationProviderHealthAuditTotals = {
  total: number;
  ready: number;
  attention: number;
  blocked: number;
  unsupported: number;
  queued: number;
  failed: number;
  retryableFailed: number;
  unchecked: number;
  configVaultBacked: number;
  configVaultMissing: number;
};

export type IntegrationProviderHealthAuditSummary = {
  generatedAt: string;
  totals: IntegrationProviderHealthAuditTotals;
  providers: readonly IntegrationProviderDiagnosticsSummary[];
  actions: readonly string[];
};

export type IntegrationTemplateSummary = {
  id: string;
  code: string;
  channel: 'mail' | 'sms';
  name: string;
  subject?: string;
  body: string;
  enabled: boolean;
};

export type IntegrationOutboxAttachmentSummary = {
  filename: string;
  contentType: string;
  contentBase64: string;
  sizeBytes: number;
};

export type IntegrationOutboxSummary = {
  id: string;
  channel: 'mail' | 'sms';
  providerCode: string;
  templateCode?: string;
  recipient: string;
  subject?: string;
  payload: Record<string, unknown>;
  attachments?: readonly IntegrationOutboxAttachmentSummary[];
  status: 'failed' | 'queued' | 'sent';
  retryCount: number;
  preview?: string;
  error?: string;
  sentAt?: string;
  createdAt: string;
};

export type IntegrationOutboxTestResult = {
  channel: 'mail' | 'sms';
  providerCode: string;
  message: IntegrationOutboxSummary;
  status: 'failed' | 'sent';
  error?: string;
  testedAt: string;
};

export type OAuthCallbackContractSummary = {
  callbackPath: string;
  stateTtlSeconds: number;
  securityChecks: readonly string[];
  accountBinding: readonly string[];
  auditAction: string;
};

export type OAuthFlowStatus = 'completed' | 'expired' | 'failed' | 'pending';
export type OAuthCallbackAuditStatus = 'accepted' | 'rejected';

export type OAuthFlowSummary = {
  id: string;
  providerCode: string;
  state: string;
  subjectType: string;
  subjectId: string;
  scopes: readonly string[];
  redirectUri?: string;
  authorizationUrl: string;
  status: OAuthFlowStatus;
  expiresAt: string;
  callbackCodeHash?: string;
  callbackError?: string;
  tokenId?: string;
  completedAt?: string;
  createdAt: string;
};

export type OAuthCallbackAuditSummary = {
  id: string;
  providerCode: string;
  flowId?: string;
  state: string;
  status: OAuthCallbackAuditStatus;
  reason?: string;
  callbackCodeHash?: string;
  callbackError?: string;
  providerAccountId?: string;
  tokenId?: string;
  createdAt: string;
};

export type OAuthTokenStatus = 'active' | 'expired' | 'revoked';

export type OAuthTokenSummary = {
  id: string;
  providerCode: string;
  subjectType: string;
  subjectId: string;
  providerAccountId: string;
  scopes: readonly string[];
  accessTokenRef: string;
  refreshTokenRef?: string;
  status: OAuthTokenStatus;
  expiresAt?: string;
  lastRotatedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
  createdAt: string;
};

export type OAuthTokenInventorySummary = {
  total: number;
  active: number;
  expired: number;
  revoked: number;
  expiringSoon: number;
  providers: number;
  generatedAt: string;
};

export type IntegrationDesignSummary = {
  topic: 'pay' | 'websocket' | 'wechat';
  status: 'design-only' | 'runtime-active';
  boundaries: readonly string[];
  documentPath: string;
};

export type IntegrationSummary = {
  providers: {
    total: number;
    enabled: number;
    disabled: number;
    unknown: number;
    healthy: number;
    degraded: number;
  };
  mailOutbox: {
    total: number;
    queued: number;
    sent: number;
    failed: number;
  };
  smsOutbox: {
    total: number;
    queued: number;
    sent: number;
    failed: number;
  };
  oauthProviders: number;
  oauthTokens: OAuthTokenInventorySummary;
  designs: {
    designOnlyTopics: number;
    topics: readonly string[];
  };
};

export type CreateIntegrationProviderRequest = Omit<
  IntegrationProviderSummary,
  | 'configVersion'
  | 'enabled'
  | 'healthStatus'
  | 'id'
  | 'lastCheckedAt'
  | 'lastTestMessage'
  | 'lastTestStatus'
  | 'lastTestedAt'
  | 'secretRefStatus'
> & {
  enabled?: boolean;
};

export type UpdateIntegrationProviderRequest = Partial<
  Pick<IntegrationProviderSummary, 'config' | 'enabled' | 'name' | 'secretRef'>
>;

export type TestIntegrationProviderRequest = {
  reason?: string;
};

export type CreateIntegrationTemplateRequest = Omit<
  IntegrationTemplateSummary,
  'channel' | 'enabled' | 'id'
> & {
  enabled?: boolean;
};

export type PreviewTemplateRequest = {
  templateCode: string;
  payload: Record<string, unknown>;
};

export type TemplatePreviewSummary = {
  channel: 'mail' | 'sms';
  templateCode: string;
  subject?: string;
  body: string;
};

export type CreateOutboxMessageRequest = {
  providerCode: string;
  templateCode?: string;
  recipient: string;
  subject?: string;
  attachments?: readonly Omit<
    IntegrationOutboxAttachmentSummary,
    'sizeBytes'
  >[];
  payload: Record<string, unknown>;
};

export type TestOutboxMessageRequest = CreateOutboxMessageRequest & {
  reason?: string;
};

export type FailOutboxMessageRequest = {
  error: string;
};

export type ProcessOutboxRequest = {
  providerCode?: string;
  limit?: number;
};

export type ScheduleOutboxRequest = {
  channels?: readonly ('mail' | 'sms')[];
  providerCode?: string;
  limit?: number;
  retryFailed?: boolean;
  maxRetryCount?: number;
};

export type OutboxCallbackRequest = {
  providerCode: string;
  messageId: string;
  status: 'failed' | 'sent';
  error?: string;
  signature: string;
};

export type IntegrationOutboxProcessResult = {
  channel: 'mail' | 'sms';
  providerCode?: string;
  attemptedCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  queuedCount: number;
};

export type IntegrationOutboxScheduleChannelResult = {
  channel: 'mail' | 'sms';
  providerCode?: string;
  retriedCount: number;
  process: IntegrationOutboxProcessResult;
};

export type IntegrationOutboxScheduleResult = {
  retryFailed: boolean;
  maxRetryCount: number;
  channels: readonly IntegrationOutboxScheduleChannelResult[];
  retriedCount: number;
  attemptedCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  queuedCount: number;
};

export type IntegrationProviderQueryRequest = PageRequest & {
  type?: IntegrationProviderType;
  enabled?: boolean;
  healthStatus?: IntegrationProviderSummary['healthStatus'];
};

export type IntegrationProviderAuditLogQueryRequest = PageRequest;

export type IntegrationTemplateQueryRequest = PageRequest & {
  enabled?: boolean;
};

export type IntegrationOutboxQueryRequest = PageRequest & {
  status?: IntegrationOutboxSummary['status'];
  providerCode?: string;
};

export type OAuthTokenQueryRequest = PageRequest & {
  providerCode?: string;
  subjectId?: string;
  status?: OAuthTokenStatus;
};

export type StartOAuthFlowRequest = {
  providerCode: string;
  subjectType?: string;
  subjectId: string;
  scopes?: readonly string[];
  redirectUri?: string;
};

export type StartOAuthProfileFlowRequest = {
  providerCode: string;
  redirectUri?: string;
};

export type OAuthFlowQueryRequest = PageRequest & {
  providerCode?: string;
  subjectId?: string;
  status?: OAuthFlowStatus;
};

export type OAuthProviderCallbackRequest = {
  state: string;
  code?: string;
  error?: string;
  providerAccountId?: string;
  scopes?: string;
  expiresInSeconds?: number;
};

export type OAuthCallbackAuditQueryRequest = PageRequest & {
  providerCode?: string;
  status?: OAuthCallbackAuditStatus;
};

export type RevokeOAuthTokenRequest = {
  reason?: string;
};

export type OAuthProfileAccountSummary = {
  tokenId: string;
  providerCode: string;
  providerName: string;
  providerAccountId: string;
  scopes: readonly string[];
  status: OAuthTokenStatus;
  expiresAt?: string;
  lastRotatedAt?: string;
  revokedAt?: string;
  revokeReason?: string;
  createdAt: string;
};

export type OAuthProfileProviderSummary = {
  code: string;
  name: string;
  type: 'oauth';
};

export type UnbindOAuthProfileAccountRequest = {
  reason?: string;
};

export type OAuthCallbackResult = {
  providerCode: string;
  flowId?: string;
  state: string;
  status: OAuthCallbackAuditStatus;
  message: string;
  audit: OAuthCallbackAuditSummary;
  token?: OAuthTokenSummary;
  completedAt?: string;
};

export type WebSocketRuntimeConnectionStatus = 'closed' | 'connected';
export type WebSocketRuntimeSubscriptionStatus = 'active' | 'closed';
export type WebSocketRuntimeEventDeliveryStatus =
  | 'delivered'
  | 'no_subscribers';

export type WebSocketRuntimeConnectionSummary = {
  id: string;
  subjectId: string;
  transport: 'sse';
  status: WebSocketRuntimeConnectionStatus;
  rooms: readonly string[];
  connectedAt: string;
  lastSeenAt: string;
  closedAt?: string;
  closeReason?: string;
};

export type WebSocketRuntimeSubscriptionSummary = {
  id: string;
  connectionId: string;
  room: string;
  eventTypes: readonly string[];
  status: WebSocketRuntimeSubscriptionStatus;
  subscribedAt: string;
  closedAt?: string;
};

export type WebSocketRuntimeEventSummary = {
  id: string;
  room: string;
  type: string;
  payloadPreview: Record<string, unknown>;
  traceId?: string;
  deliveredCount: number;
  status: WebSocketRuntimeEventDeliveryStatus;
  createdAt: string;
};

export type WebSocketRuntimeSummary = {
  activeConnections: number;
  totalConnections: number;
  activeSubscriptions: number;
  recentEvents: number;
  lastEventAt?: string;
  generatedAt: string;
};

export type WebSocketRuntimeDiagnosticsSummary = {
  summary: WebSocketRuntimeSummary;
  connections: readonly WebSocketRuntimeConnectionSummary[];
  subscriptions: readonly WebSocketRuntimeSubscriptionSummary[];
  events: readonly WebSocketRuntimeEventSummary[];
};

export type PublishWebSocketRuntimeEventRequest = {
  room?: string;
  type: string;
  payload?: Record<string, unknown>;
  traceId?: string;
};

export type IntegrationFixtures = {
  summary: IntegrationSummary;
  providers: readonly IntegrationProviderSummary[];
  providerDiagnostics: readonly IntegrationProviderDiagnosticsSummary[];
  providerHealthAudit: IntegrationProviderHealthAuditSummary;
  mailTemplates: readonly IntegrationTemplateSummary[];
  smsTemplates: readonly IntegrationTemplateSummary[];
  outbox: readonly IntegrationOutboxSummary[];
  oauthContract: OAuthCallbackContractSummary;
  oauthFlows: readonly OAuthFlowSummary[];
  oauthCallbackAudits: readonly OAuthCallbackAuditSummary[];
  oauthTokenSummary: OAuthTokenInventorySummary;
  oauthTokens: readonly OAuthTokenSummary[];
  designs: readonly IntegrationDesignSummary[];
};

export function createIntegrationFixtures(): IntegrationFixtures {
  const providers: readonly IntegrationProviderSummary[] = [
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
        allowedHosts: ['sms.example.test'],
        endpoint: 'https://sms.example.test/send',
        method: 'POST',
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
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        callbackPath: '/api/integrations/oauth/callback/github',
        clientId: 'opencore-github',
        clientSecret: '[REDACTED]',
        scopes: ['read:user', 'user:email'],
        tokenUrl: 'https://github.com/login/oauth/access_token',
      },
      healthStatus: 'unknown',
    },
  ];
  const mailTemplates: readonly IntegrationTemplateSummary[] = [
    {
      id: 'template_mail_welcome',
      code: 'mail.welcome',
      channel: 'mail',
      name: 'Welcome Mail',
      subject: 'Welcome {{name}}',
      body: 'Hello {{name}}, welcome to OpenCore.',
      enabled: true,
    },
  ];
  const smsTemplates: readonly IntegrationTemplateSummary[] = [
    {
      id: 'template_sms_otp',
      code: 'sms.otp',
      channel: 'sms',
      name: 'OTP SMS',
      body: 'Your verification code is {{code}}.',
      enabled: true,
    },
  ];
  const outbox: readonly IntegrationOutboxSummary[] = [
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
  ];
  const oauthContract: OAuthCallbackContractSummary = {
    callbackPath: '/api/integrations/oauth/callback/:providerCode',
    stateTtlSeconds: 300,
    securityChecks: ['state is single-use and expires quickly'],
    accountBinding: ['user id', 'provider code', 'provider account id'],
    auditAction: 'integration.oauth.callback',
  };
  const oauthFlows: readonly OAuthFlowSummary[] = [
    {
      id: 'oauth_flow_github_admin_pending',
      providerCode: 'oauth.github',
      state: 'seeded-oauth-state',
      subjectType: 'system-user',
      subjectId: 'user_admin',
      scopes: ['read:user', 'user:email'],
      authorizationUrl:
        'https://github.com/login/oauth/authorize?response_type=code&client_id=opencore-github&state=seeded-oauth-state',
      status: 'pending',
      expiresAt: '2099-01-01T00:00:00.000Z',
      createdAt: '2026-06-10T00:00:00.000Z',
    },
  ];
  const oauthCallbackAudits: readonly OAuthCallbackAuditSummary[] = [
    {
      id: 'oauth_callback_audit_github_admin',
      providerCode: 'oauth.github',
      flowId: 'oauth_flow_github_admin_pending',
      state: 'seeded-oauth-state',
      status: 'accepted',
      reason: 'Seeded OAuth callback audit.',
      callbackCodeHash:
        'f4f0df3a19be88c307f6a234a45c206ef18ac66d93f8feee56a2a97d3ef82f5f',
      providerAccountId: 'github:opencore-admin',
      tokenId: 'oauth_token_github_admin_active',
      createdAt: '2026-06-10T00:00:00.000Z',
    },
  ];
  const oauthTokens: readonly OAuthTokenSummary[] = [
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
  ];
  const oauthTokenSummary = buildOAuthTokenInventorySummaryFixture(oauthTokens);
  const designs: readonly IntegrationDesignSummary[] = [
    {
      topic: 'wechat',
      status: 'design-only',
      boundaries: ['provider config and health check only'],
      documentPath: 'docs/development/integration-wechat-design.md',
    },
    {
      topic: 'websocket',
      status: 'runtime-active',
      boundaries: ['auth required during connection upgrade'],
      documentPath: 'docs/development/integration-websocket-design.md',
    },
    {
      topic: 'pay',
      status: 'design-only',
      boundaries: ['mock/sandbox providers only'],
      documentPath: 'docs/development/integration-payment-provider-design.md',
    },
  ];
  const mailOutbox = outbox.filter((message) => message.channel === 'mail');
  const smsOutbox = outbox.filter((message) => message.channel === 'sms');
  const providerDiagnostics = providers.map((provider) =>
    buildProviderDiagnosticsFixture(provider, outbox),
  );
  const providerHealthAudit =
    buildProviderHealthAuditFixture(providerDiagnostics);

  return {
    summary: {
      providers: {
        total: providers.length,
        enabled: providers.filter((provider) => provider.enabled).length,
        disabled: providers.filter((provider) => !provider.enabled).length,
        unknown: countByField(providers, 'healthStatus', 'unknown'),
        healthy: countByField(providers, 'healthStatus', 'healthy'),
        degraded: countByField(providers, 'healthStatus', 'degraded'),
      },
      mailOutbox: buildOutboxSummary(mailOutbox),
      smsOutbox: buildOutboxSummary(smsOutbox),
      oauthProviders: providers.filter((provider) => provider.type === 'oauth')
        .length,
      oauthTokens: oauthTokenSummary,
      designs: {
        designOnlyTopics: designs.filter(
          (design) => design.status === 'design-only',
        ).length,
        topics: designs.map((design) => design.topic),
      },
    },
    providers,
    providerDiagnostics,
    providerHealthAudit,
    mailTemplates,
    smsTemplates,
    outbox,
    oauthContract,
    oauthFlows,
    oauthCallbackAudits,
    oauthTokenSummary,
    oauthTokens,
    designs,
  };
}

export function findIntegrationProviderFixture(
  code: string,
): IntegrationProviderSummary | undefined {
  return createIntegrationFixtures().providers.find(
    (provider) => provider.code === code,
  );
}

export function findIntegrationProviderDiagnosticsFixture(
  code: string,
): IntegrationProviderDiagnosticsSummary | undefined {
  return createIntegrationFixtures().providerDiagnostics.find(
    (diagnostics) => diagnostics.provider.code === code,
  );
}

export function createIntegrationProviderHealthAuditFixture(): IntegrationProviderHealthAuditSummary {
  return createIntegrationFixtures().providerHealthAudit;
}

export function findIntegrationTemplateFixture(
  channel: IntegrationTemplateSummary['channel'],
  code: string,
): IntegrationTemplateSummary | undefined {
  const fixtures = createIntegrationFixtures();
  const templates =
    channel === 'mail' ? fixtures.mailTemplates : fixtures.smsTemplates;

  return templates.find((template) => template.code === code);
}

export function findIntegrationOutboxFixture(
  channel: IntegrationOutboxSummary['channel'],
  id: string,
): IntegrationOutboxSummary | undefined {
  return createIntegrationFixtures().outbox.find(
    (message) => message.channel === channel && message.id === id,
  );
}

export function findOAuthCallbackContractFixture(
  callbackPath: string,
): OAuthCallbackContractSummary | undefined {
  const fixture = createIntegrationFixtures().oauthContract;
  return fixture.callbackPath === callbackPath ? fixture : undefined;
}

export function findOAuthFlowFixture(id: string): OAuthFlowSummary | undefined {
  return createIntegrationFixtures().oauthFlows.find((flow) => flow.id === id);
}

export function findOAuthCallbackAuditFixture(
  id: string,
): OAuthCallbackAuditSummary | undefined {
  return createIntegrationFixtures().oauthCallbackAudits.find(
    (audit) => audit.id === id,
  );
}

export function findOAuthTokenFixture(
  id: string,
): OAuthTokenSummary | undefined {
  return createIntegrationFixtures().oauthTokens.find(
    (token) => token.id === id,
  );
}

export function findIntegrationDesignFixture(
  topic: IntegrationDesignSummary['topic'],
): IntegrationDesignSummary | undefined {
  return createIntegrationFixtures().designs.find(
    (design) => design.topic === topic,
  );
}

export type IntegrationProviderPage = PageResponse<IntegrationProviderSummary>;
export type IntegrationProviderAuditLogPage =
  PageResponse<IntegrationProviderAuditLogSummary>;
export type IntegrationTemplatePage = PageResponse<IntegrationTemplateSummary>;
export type IntegrationOutboxPage = PageResponse<IntegrationOutboxSummary>;
export type OAuthFlowPage = PageResponse<OAuthFlowSummary>;
export type OAuthCallbackAuditPage = PageResponse<OAuthCallbackAuditSummary>;
export type OAuthTokenPage = PageResponse<OAuthTokenSummary>;

function buildProviderDiagnosticsFixture(
  provider: IntegrationProviderSummary,
  outbox: readonly IntegrationOutboxSummary[],
): IntegrationProviderDiagnosticsSummary {
  const channel =
    provider.type === 'mail' || provider.type === 'sms'
      ? provider.type
      : undefined;
  const providerOutbox = outbox.filter(
    (message) =>
      message.providerCode === provider.code &&
      (channel === undefined || message.channel === channel),
  );
  const failedRows = providerOutbox.filter(
    (message) => message.status === 'failed',
  );
  const queued = providerOutbox.filter(
    (message) => message.status === 'queued',
  ).length;
  const checks: IntegrationProviderDiagnosticCheck[] = [
    {
      code: 'provider.enabled',
      status: provider.enabled ? 'pass' : 'fail',
      message: provider.enabled
        ? 'Provider is enabled.'
        : 'Provider is disabled.',
    },
    {
      code: 'provider.health',
      status: provider.healthStatus === 'healthy' ? 'pass' : 'fail',
      message: `Provider health status is ${provider.healthStatus}.`,
    },
    {
      code: 'provider.secret-ref',
      status: provider.secretRef.startsWith('secret://config/')
        ? 'pass'
        : 'warn',
      message: provider.secretRef.startsWith('secret://config/')
        ? 'Provider secretRef resolves through the config vault.'
        : 'Provider secretRef is not backed by the config vault.',
    },
    {
      code: 'outbox.failed',
      status: failedRows.length > 0 ? 'fail' : 'pass',
      message:
        failedRows.length > 0
          ? `${failedRows.length} failed outbox message(s) require attention.`
          : 'No failed outbox messages.',
    },
    {
      code: 'outbox.queued',
      status: queued > 0 ? 'warn' : 'pass',
      message:
        queued > 0
          ? `${queued} queued outbox message(s) are pending processing.`
          : 'No queued outbox backlog.',
    },
  ];
  if (provider.type === 'sms' && provider.config.adapter === 'http') {
    const secretInjectionCount = Array.isArray(provider.config.secretInjections)
      ? provider.config.secretInjections.length
      : 0;
    checks.push({
      code: 'provider.secret-injections',
      status: secretInjectionCount > 0 ? 'pass' : 'warn',
      message:
        secretInjectionCount > 0
          ? `SMS HTTP provider has ${secretInjectionCount} config-vault secret injection(s).`
          : 'SMS HTTP provider has no config-vault secret injections.',
    });
  }

  return {
    provider,
    channel,
    readiness: !channel
      ? 'unsupported'
      : checks.some((check) => check.status === 'fail')
        ? 'blocked'
        : checks.some((check) => check.status === 'warn')
          ? 'attention'
          : 'ready',
    outbox: {
      total: providerOutbox.length,
      queued,
      sent: providerOutbox.filter((message) => message.status === 'sent')
        .length,
      failed: failedRows.length,
      retryableFailed: failedRows.filter((message) => message.retryCount < 3)
        .length,
      lastFailure: undefined,
    },
    checks,
    actions: provider.enabled
      ? ['Run provider health-check before scheduled processing.']
      : ['Enable the provider before processing outbox messages.'],
    generatedAt: '2026-06-10T00:00:00.000Z',
  };
}

function buildProviderHealthAuditFixture(
  providers: readonly IntegrationProviderDiagnosticsSummary[],
): IntegrationProviderHealthAuditSummary {
  const configVaultBacked = providers.filter((item) =>
    item.provider.secretRef.startsWith('secret://config/'),
  ).length;

  return {
    generatedAt: '2026-06-10T00:00:00.000Z',
    totals: {
      total: providers.length,
      ready: countReadiness(providers, 'ready'),
      attention: countReadiness(providers, 'attention'),
      blocked: countReadiness(providers, 'blocked'),
      unsupported: countReadiness(providers, 'unsupported'),
      queued: providers.reduce((sum, item) => sum + item.outbox.queued, 0),
      failed: providers.reduce((sum, item) => sum + item.outbox.failed, 0),
      retryableFailed: providers.reduce(
        (sum, item) => sum + item.outbox.retryableFailed,
        0,
      ),
      unchecked: providers.filter((item) => !item.provider.lastCheckedAt)
        .length,
      configVaultBacked,
      configVaultMissing: providers.length - configVaultBacked,
    },
    providers,
    actions: [
      ...new Set(
        providers.flatMap((item) =>
          item.actions.filter(
            (action) => action !== 'No immediate operator action required.',
          ),
        ),
      ),
    ],
  };
}

function buildOutboxSummary(rows: readonly IntegrationOutboxSummary[]) {
  return {
    total: rows.length,
    queued: countByField(rows, 'status', 'queued'),
    sent: countByField(rows, 'status', 'sent'),
    failed: countByField(rows, 'status', 'failed'),
  };
}

function buildOAuthTokenInventorySummaryFixture(
  rows: readonly OAuthTokenSummary[],
): OAuthTokenInventorySummary {
  return {
    total: rows.length,
    active: countByField(rows, 'status', 'active'),
    expired: countByField(rows, 'status', 'expired'),
    revoked: countByField(rows, 'status', 'revoked'),
    expiringSoon: 0,
    providers: new Set(rows.map((token) => token.providerCode)).size,
    generatedAt: '2026-06-10T00:00:00.000Z',
  };
}

function countByField<T, K extends keyof T>(
  rows: readonly T[],
  field: K,
  value: string,
): number {
  return rows.filter((row) => row[field] === value).length;
}

function countReadiness(
  providers: readonly IntegrationProviderDiagnosticsSummary[],
  readiness: IntegrationProviderDiagnosticsSummary['readiness'],
): number {
  return providers.filter((provider) => provider.readiness === readiness)
    .length;
}
