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
  payload: Record<string, unknown>;
};

export type FailOutboxMessageRequest = {
  error: string;
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
        host: 'smtp.example.test',
        clientSecret: '[REDACTED]',
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
