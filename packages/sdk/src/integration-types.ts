import type { PageRequest, PageResponse } from './system-management-types';

export type { PageRequest, PageResponse };

export type IntegrationProviderType =
  | 'mail'
  | 'oauth'
  | 'pay'
  | 'sms'
  | 'websocket'
  | 'wechat';

export type IntegrationProviderSummary = {
  id: string;
  code: string;
  type: IntegrationProviderType;
  name: string;
  enabled: boolean;
  secretRef: string;
  config: Record<string, unknown>;
  healthStatus: 'degraded' | 'disabled' | 'healthy' | 'unknown';
  lastCheckedAt?: string;
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

export type IntegrationTemplateSummary = {
  id: string;
  code: string;
  channel: 'mail' | 'sms';
  name: string;
  subject?: string;
  body: string;
  enabled: boolean;
};

export type IntegrationOutboxSummary = {
  id: string;
  channel: 'mail' | 'sms';
  providerCode: string;
  templateCode?: string;
  recipient: string;
  subject?: string;
  payload: Record<string, unknown>;
  status: 'failed' | 'queued' | 'sent';
  retryCount: number;
  preview?: string;
  error?: string;
  sentAt?: string;
  createdAt: string;
};

export type OAuthCallbackContractSummary = {
  callbackPath: string;
  stateTtlSeconds: number;
  securityChecks: readonly string[];
  accountBinding: readonly string[];
  auditAction: string;
};

export type IntegrationDesignSummary = {
  topic: 'pay' | 'websocket' | 'wechat';
  status: 'design-only';
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
  designs: {
    designOnlyTopics: number;
    topics: readonly string[];
  };
};

export type CreateIntegrationProviderRequest = Omit<
  IntegrationProviderSummary,
  'enabled' | 'healthStatus' | 'id' | 'lastCheckedAt'
> & {
  enabled?: boolean;
};

export type UpdateIntegrationProviderRequest = Partial<
  Pick<IntegrationProviderSummary, 'config' | 'enabled' | 'name' | 'secretRef'>
>;

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
  payload: Record<string, unknown>;
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

export type IntegrationTemplateQueryRequest = PageRequest & {
  enabled?: boolean;
};

export type IntegrationOutboxQueryRequest = PageRequest & {
  status?: IntegrationOutboxSummary['status'];
  providerCode?: string;
};

export type IntegrationFixtures = {
  summary: IntegrationSummary;
  providers: readonly IntegrationProviderSummary[];
  providerDiagnostics: readonly IntegrationProviderDiagnosticsSummary[];
  mailTemplates: readonly IntegrationTemplateSummary[];
  smsTemplates: readonly IntegrationTemplateSummary[];
  outbox: readonly IntegrationOutboxSummary[];
  oauthContract: OAuthCallbackContractSummary;
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
      config: {
        adapter: 'smtp',
        authMethod: 'PLAIN',
        from: 'no-reply@opencore.test',
        host: 'smtp.example.test',
        port: 587,
        requireTls: true,
        secure: false,
        timeoutMs: 10000,
        username: 'smtp-user',
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
      status: 'queued',
      retryCount: 0,
      preview: 'Hello Admin, welcome to OpenCore.',
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
  const designs: readonly IntegrationDesignSummary[] = [
    {
      topic: 'wechat',
      status: 'design-only',
      boundaries: ['provider config and health check only'],
      documentPath: 'docs/development/integration-wechat-design.md',
    },
    {
      topic: 'websocket',
      status: 'design-only',
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
      designs: {
        designOnlyTopics: designs.filter(
          (design) => design.status === 'design-only',
        ).length,
        topics: designs.map((design) => design.topic),
      },
    },
    providers,
    providerDiagnostics,
    mailTemplates,
    smsTemplates,
    outbox,
    oauthContract,
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

export function findIntegrationDesignFixture(
  topic: IntegrationDesignSummary['topic'],
): IntegrationDesignSummary | undefined {
  return createIntegrationFixtures().designs.find(
    (design) => design.topic === topic,
  );
}

export type IntegrationProviderPage = PageResponse<IntegrationProviderSummary>;
export type IntegrationTemplatePage = PageResponse<IntegrationTemplateSummary>;
export type IntegrationOutboxPage = PageResponse<IntegrationOutboxSummary>;

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

function buildOutboxSummary(rows: readonly IntegrationOutboxSummary[]) {
  return {
    total: rows.length,
    queued: countByField(rows, 'status', 'queued'),
    sent: countByField(rows, 'status', 'sent'),
    failed: countByField(rows, 'status', 'failed'),
  };
}

function countByField<T, K extends keyof T>(
  rows: readonly T[],
  field: K,
  value: string,
): number {
  return rows.filter((row) => row[field] === value).length;
}
