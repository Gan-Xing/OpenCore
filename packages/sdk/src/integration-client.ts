import type {
  CreateIntegrationProviderRequest,
  CreateIntegrationTemplateRequest,
  CreateOutboxMessageRequest,
  FailOutboxMessageRequest,
  IntegrationDesignSummary,
  IntegrationOutboxPage,
  IntegrationOutboxProcessResult,
  IntegrationOutboxQueryRequest,
  IntegrationOutboxSummary,
  IntegrationProviderPage,
  IntegrationProviderQueryRequest,
  IntegrationProviderSummary,
  IntegrationSummary,
  IntegrationTemplatePage,
  IntegrationTemplateQueryRequest,
  IntegrationTemplateSummary,
  OAuthCallbackContractSummary,
  OutboxCallbackRequest,
  PageRequest,
  ProcessOutboxRequest,
  PreviewTemplateRequest,
  TemplatePreviewSummary,
  UpdateIntegrationProviderRequest,
} from './integration-types';
import type { SdkRequest } from './rbac-client';

export type IntegrationClient = {
  getSummary: (token: string) => Promise<IntegrationSummary>;
  listProviders: (
    token: string,
    query?: IntegrationProviderQueryRequest,
  ) => Promise<IntegrationProviderPage>;
  getProvider: (
    token: string,
    code: string,
  ) => Promise<IntegrationProviderSummary>;
  createProvider: (
    token: string,
    body: CreateIntegrationProviderRequest,
  ) => Promise<IntegrationProviderSummary>;
  updateProvider: (
    token: string,
    code: string,
    body: UpdateIntegrationProviderRequest,
  ) => Promise<IntegrationProviderSummary>;
  enableProvider: (
    token: string,
    code: string,
  ) => Promise<IntegrationProviderSummary>;
  disableProvider: (
    token: string,
    code: string,
  ) => Promise<IntegrationProviderSummary>;
  checkProviderHealth: (
    token: string,
    code: string,
  ) => Promise<IntegrationProviderSummary>;
  listMailTemplates: (
    token: string,
    query?: IntegrationTemplateQueryRequest,
  ) => Promise<IntegrationTemplatePage>;
  getMailTemplate: (
    token: string,
    code: string,
  ) => Promise<IntegrationTemplateSummary>;
  createMailTemplate: (
    token: string,
    body: CreateIntegrationTemplateRequest,
  ) => Promise<IntegrationTemplateSummary>;
  previewMailTemplate: (
    token: string,
    body: PreviewTemplateRequest,
  ) => Promise<TemplatePreviewSummary>;
  listMailOutbox: (
    token: string,
    query?: IntegrationOutboxQueryRequest,
  ) => Promise<IntegrationOutboxPage>;
  getMailOutboxMessage: (
    token: string,
    id: string,
  ) => Promise<IntegrationOutboxSummary>;
  enqueueMail: (
    token: string,
    body: CreateOutboxMessageRequest,
  ) => Promise<IntegrationOutboxSummary>;
  markMailOutboxSent: (
    token: string,
    id: string,
  ) => Promise<IntegrationOutboxSummary>;
  markMailOutboxFailed: (
    token: string,
    id: string,
    body: FailOutboxMessageRequest,
  ) => Promise<IntegrationOutboxSummary>;
  retryMailOutbox: (
    token: string,
    id: string,
  ) => Promise<IntegrationOutboxSummary>;
  processMailOutbox: (
    token: string,
    body?: ProcessOutboxRequest,
  ) => Promise<IntegrationOutboxProcessResult>;
  callbackMailOutbox: (
    token: string,
    body: OutboxCallbackRequest,
  ) => Promise<IntegrationOutboxSummary>;
  listSmsTemplates: (
    token: string,
    query?: IntegrationTemplateQueryRequest,
  ) => Promise<IntegrationTemplatePage>;
  getSmsTemplate: (
    token: string,
    code: string,
  ) => Promise<IntegrationTemplateSummary>;
  createSmsTemplate: (
    token: string,
    body: CreateIntegrationTemplateRequest,
  ) => Promise<IntegrationTemplateSummary>;
  previewSmsTemplate: (
    token: string,
    body: PreviewTemplateRequest,
  ) => Promise<TemplatePreviewSummary>;
  listSmsOutbox: (
    token: string,
    query?: IntegrationOutboxQueryRequest,
  ) => Promise<IntegrationOutboxPage>;
  getSmsOutboxMessage: (
    token: string,
    id: string,
  ) => Promise<IntegrationOutboxSummary>;
  enqueueSms: (
    token: string,
    body: CreateOutboxMessageRequest,
  ) => Promise<IntegrationOutboxSummary>;
  markSmsOutboxSent: (
    token: string,
    id: string,
  ) => Promise<IntegrationOutboxSummary>;
  markSmsOutboxFailed: (
    token: string,
    id: string,
    body: FailOutboxMessageRequest,
  ) => Promise<IntegrationOutboxSummary>;
  retrySmsOutbox: (
    token: string,
    id: string,
  ) => Promise<IntegrationOutboxSummary>;
  processSmsOutbox: (
    token: string,
    body?: ProcessOutboxRequest,
  ) => Promise<IntegrationOutboxProcessResult>;
  callbackSmsOutbox: (
    token: string,
    body: OutboxCallbackRequest,
  ) => Promise<IntegrationOutboxSummary>;
  listOAuthProviders: (
    token: string,
    query?: IntegrationProviderQueryRequest,
  ) => Promise<IntegrationProviderPage>;
  getOAuthCallbackContract: (
    token: string,
  ) => Promise<OAuthCallbackContractSummary>;
  getWeChatDesign: (token: string) => Promise<IntegrationDesignSummary>;
  getWebSocketDesign: (token: string) => Promise<IntegrationDesignSummary>;
  getPaymentDesign: (token: string) => Promise<IntegrationDesignSummary>;
};

export function createIntegrationClient(
  request: SdkRequest,
): IntegrationClient {
  return {
    getSummary: (token) =>
      request<IntegrationSummary>('/integrations/summary', { token }),
    listProviders: (token, query) =>
      request<IntegrationProviderPage>(
        withQuery('/integrations/providers', query),
        { token },
      ),
    getProvider: (token, code) =>
      request<IntegrationProviderSummary>(
        `/integrations/providers/${encodeURIComponent(code)}`,
        { token },
      ),
    createProvider: (token, body) =>
      request<IntegrationProviderSummary>('/integrations/providers', {
        method: 'POST',
        body,
        token,
      }),
    updateProvider: (token, code, body) =>
      request<IntegrationProviderSummary>(
        `/integrations/providers/${encodeURIComponent(code)}`,
        { method: 'PATCH', body, token },
      ),
    enableProvider: (token, code) =>
      request<IntegrationProviderSummary>(
        `/integrations/providers/${encodeURIComponent(code)}/enable`,
        { method: 'PATCH', token },
      ),
    disableProvider: (token, code) =>
      request<IntegrationProviderSummary>(
        `/integrations/providers/${encodeURIComponent(code)}/disable`,
        { method: 'PATCH', token },
      ),
    checkProviderHealth: (token, code) =>
      request<IntegrationProviderSummary>(
        `/integrations/providers/${encodeURIComponent(code)}/health-check`,
        { method: 'POST', token },
      ),
    listMailTemplates: (token, query) =>
      request<IntegrationTemplatePage>(
        withQuery('/integrations/mail/templates', query),
        { token },
      ),
    getMailTemplate: (token, code) =>
      request<IntegrationTemplateSummary>(
        `/integrations/mail/templates/${encodeURIComponent(code)}`,
        { token },
      ),
    createMailTemplate: (token, body) =>
      request<IntegrationTemplateSummary>('/integrations/mail/templates', {
        method: 'POST',
        body,
        token,
      }),
    previewMailTemplate: (token, body) =>
      request<TemplatePreviewSummary>('/integrations/mail/preview', {
        method: 'POST',
        body,
        token,
      }),
    listMailOutbox: (token, query) =>
      request<IntegrationOutboxPage>(
        withQuery('/integrations/mail/outbox', query),
        { token },
      ),
    getMailOutboxMessage: (token, id) =>
      request<IntegrationOutboxSummary>(
        `/integrations/mail/outbox/${encodeURIComponent(id)}`,
        { token },
      ),
    enqueueMail: (token, body) =>
      request<IntegrationOutboxSummary>('/integrations/mail/outbox', {
        method: 'POST',
        body,
        token,
      }),
    markMailOutboxSent: (token, id) =>
      request<IntegrationOutboxSummary>(
        `/integrations/mail/outbox/${encodeURIComponent(id)}/sent`,
        { method: 'PATCH', token },
      ),
    markMailOutboxFailed: (token, id, body) =>
      request<IntegrationOutboxSummary>(
        `/integrations/mail/outbox/${encodeURIComponent(id)}/failed`,
        { method: 'PATCH', body, token },
      ),
    retryMailOutbox: (token, id) =>
      request<IntegrationOutboxSummary>(
        `/integrations/mail/outbox/${encodeURIComponent(id)}/retry`,
        { method: 'PATCH', token },
      ),
    processMailOutbox: (token, body) =>
      request<IntegrationOutboxProcessResult>(
        '/integrations/mail/outbox/process',
        { method: 'POST', body: body ?? {}, token },
      ),
    callbackMailOutbox: (token, body) =>
      request<IntegrationOutboxSummary>('/integrations/mail/outbox/callback', {
        method: 'POST',
        body,
        token,
      }),
    listSmsTemplates: (token, query) =>
      request<IntegrationTemplatePage>(
        withQuery('/integrations/sms/templates', query),
        { token },
      ),
    getSmsTemplate: (token, code) =>
      request<IntegrationTemplateSummary>(
        `/integrations/sms/templates/${encodeURIComponent(code)}`,
        { token },
      ),
    createSmsTemplate: (token, body) =>
      request<IntegrationTemplateSummary>('/integrations/sms/templates', {
        method: 'POST',
        body,
        token,
      }),
    previewSmsTemplate: (token, body) =>
      request<TemplatePreviewSummary>('/integrations/sms/preview', {
        method: 'POST',
        body,
        token,
      }),
    listSmsOutbox: (token, query) =>
      request<IntegrationOutboxPage>(
        withQuery('/integrations/sms/outbox', query),
        { token },
      ),
    getSmsOutboxMessage: (token, id) =>
      request<IntegrationOutboxSummary>(
        `/integrations/sms/outbox/${encodeURIComponent(id)}`,
        { token },
      ),
    enqueueSms: (token, body) =>
      request<IntegrationOutboxSummary>('/integrations/sms/outbox', {
        method: 'POST',
        body,
        token,
      }),
    markSmsOutboxSent: (token, id) =>
      request<IntegrationOutboxSummary>(
        `/integrations/sms/outbox/${encodeURIComponent(id)}/sent`,
        { method: 'PATCH', token },
      ),
    markSmsOutboxFailed: (token, id, body) =>
      request<IntegrationOutboxSummary>(
        `/integrations/sms/outbox/${encodeURIComponent(id)}/failed`,
        { method: 'PATCH', body, token },
      ),
    retrySmsOutbox: (token, id) =>
      request<IntegrationOutboxSummary>(
        `/integrations/sms/outbox/${encodeURIComponent(id)}/retry`,
        { method: 'PATCH', token },
      ),
    processSmsOutbox: (token, body) =>
      request<IntegrationOutboxProcessResult>(
        '/integrations/sms/outbox/process',
        { method: 'POST', body: body ?? {}, token },
      ),
    callbackSmsOutbox: (token, body) =>
      request<IntegrationOutboxSummary>('/integrations/sms/outbox/callback', {
        method: 'POST',
        body,
        token,
      }),
    listOAuthProviders: (token, query) =>
      request<IntegrationProviderPage>(
        withQuery('/integrations/oauth/providers', query),
        { token },
      ),
    getOAuthCallbackContract: (token) =>
      request<OAuthCallbackContractSummary>(
        '/integrations/oauth/callback-contract',
        { token },
      ),
    getWeChatDesign: (token) =>
      request<IntegrationDesignSummary>('/integrations/designs/wechat', {
        token,
      }),
    getWebSocketDesign: (token) =>
      request<IntegrationDesignSummary>('/integrations/designs/websocket', {
        token,
      }),
    getPaymentDesign: (token) =>
      request<IntegrationDesignSummary>('/integrations/designs/pay', { token }),
  };
}

function withQuery(
  path: `/${string}`,
  query: PageRequest & Record<string, unknown> = {},
): `/${string}` {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}
