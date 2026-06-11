import { Injectable } from '@nestjs/common';
import type {
  CreateIntegrationProviderDto,
  CreateIntegrationTemplateDto,
  CreateOutboxMessageDto,
  IntegrationOutboxQueryDto,
  IntegrationProviderQueryDto,
  IntegrationTemplateQueryDto,
  PreviewTemplateDto,
  UpdateIntegrationProviderDto,
} from './integration.dto';
import {
  integrationDesigns,
  oauthCallbackContract,
  seedIntegrationOutbox,
  seedIntegrationProviders,
  seedIntegrationTemplates,
  type IntegrationDesignRecord,
  type IntegrationOutboxRecord,
  type IntegrationProviderRecord,
  type IntegrationTemplateRecord,
  type OAuthCallbackContractRecord,
} from './integration.seed';
import {
  assertProviderReadyForOutbox,
  assertSecretRef,
  assertSmsSafety,
  assertTemplateEnabled,
  buildIntegrationSummary,
  createPage,
  IntegrationRepository,
  matchesOptional,
  normalizeOptionalBoolean,
  redactProviderConfig,
  renderTemplate,
  requireRecord,
  type PageResult,
} from './integration.repository';

@Injectable()
export class SeedIntegrationRepository extends IntegrationRepository {
  private providers: IntegrationProviderRecord[] =
    seedIntegrationProviders.map(cloneProvider);
  private templates: IntegrationTemplateRecord[] = seedIntegrationTemplates.map(
    (template) => ({ ...template }),
  );
  private outbox: IntegrationOutboxRecord[] = seedIntegrationOutbox.map(
    (message) => ({ ...message }),
  );

  async getSummary() {
    return buildIntegrationSummary({
      providers: this.providers,
      outbox: this.outbox,
      designs: integrationDesigns,
    });
  }

  async listProviders(
    query: IntegrationProviderQueryDto = {},
  ): Promise<PageResult<IntegrationProviderRecord>> {
    const enabled = normalizeOptionalBoolean(query.enabled);
    return createPage(
      this.providers
        .filter(
          (provider) =>
            matchesOptional(provider.type, query.type) &&
            matchesOptional(provider.enabled, enabled) &&
            matchesOptional(provider.healthStatus, query.healthStatus),
        )
        .map(redactProvider),
      query,
    );
  }

  async createProvider(
    body: CreateIntegrationProviderDto,
  ): Promise<IntegrationProviderRecord> {
    assertSecretRef(body.secretRef);
    const provider: IntegrationProviderRecord = {
      id: `provider_${body.code.replace(/[^a-zA-Z0-9]+/g, '_')}`,
      code: body.code,
      type: body.type,
      name: body.name,
      enabled: body.enabled ?? false,
      secretRef: body.secretRef,
      config: body.config,
      healthStatus: body.enabled ? 'unknown' : 'disabled',
    };
    this.providers = [provider, ...this.providers];
    return redactProvider(provider);
  }

  async getProvider(code: string): Promise<IntegrationProviderRecord> {
    return redactProvider(this.findProvider(code));
  }

  async updateProvider(
    code: string,
    body: UpdateIntegrationProviderDto,
  ): Promise<IntegrationProviderRecord> {
    const provider = this.findProvider(code);

    if (body.secretRef) {
      assertSecretRef(body.secretRef);
    }

    Object.assign(provider, {
      name: body.name ?? provider.name,
      enabled: body.enabled ?? provider.enabled,
      secretRef: body.secretRef ?? provider.secretRef,
      config: body.config ?? provider.config,
      healthStatus: body.enabled === false ? 'disabled' : provider.healthStatus,
    });
    return redactProvider(provider);
  }

  async enableProvider(code: string): Promise<IntegrationProviderRecord> {
    return this.updateProvider(code, { enabled: true });
  }

  async disableProvider(code: string): Promise<IntegrationProviderRecord> {
    return this.updateProvider(code, { enabled: false });
  }

  async checkProviderHealth(code: string): Promise<IntegrationProviderRecord> {
    const provider = this.findProvider(code);
    provider.healthStatus = provider.enabled ? 'healthy' : 'disabled';
    provider.lastCheckedAt = new Date().toISOString();
    return redactProvider(provider);
  }

  async listTemplates(
    channel: 'mail' | 'sms',
    query: IntegrationTemplateQueryDto = {},
  ): Promise<PageResult<IntegrationTemplateRecord>> {
    const enabled = normalizeOptionalBoolean(query.enabled);
    return createPage(
      this.templates.filter(
        (template) =>
          template.channel === channel &&
          matchesOptional(template.enabled, enabled),
      ),
      query,
    );
  }

  async createTemplate(
    channel: 'mail' | 'sms',
    body: CreateIntegrationTemplateDto,
  ): Promise<IntegrationTemplateRecord> {
    const template: IntegrationTemplateRecord = {
      id: `template_${body.code.replace(/[^a-zA-Z0-9]+/g, '_')}`,
      code: body.code,
      channel,
      name: body.name,
      subject: channel === 'mail' ? body.subject : undefined,
      body: body.body,
      enabled: body.enabled ?? true,
    };
    this.templates = [template, ...this.templates];
    return { ...template };
  }

  async getTemplate(
    channel: 'mail' | 'sms',
    code: string,
  ): Promise<IntegrationTemplateRecord> {
    return { ...this.findTemplate(channel, code) };
  }

  async previewTemplate(channel: 'mail' | 'sms', body: PreviewTemplateDto) {
    const template = this.findTemplate(channel, body.templateCode);
    const rendered = renderTemplate(template, body.payload);

    return {
      channel,
      templateCode: template.code,
      subject: rendered.subject,
      body: rendered.body,
    };
  }

  async enqueueOutbox(
    channel: 'mail' | 'sms',
    body: CreateOutboxMessageDto,
  ): Promise<IntegrationOutboxRecord> {
    const provider = this.findProvider(body.providerCode);
    assertProviderReadyForOutbox({
      code: provider.code,
      type: provider.type,
      enabled: provider.enabled,
      channel,
    });

    if (channel === 'sms') {
      assertSmsSafety(body.recipient, body.payload);
    }

    const template = body.templateCode
      ? this.findTemplate(channel, body.templateCode)
      : undefined;
    if (template) {
      assertTemplateEnabled(template);
    }
    const preview = template
      ? renderTemplate(template, body.payload).body
      : undefined;
    const message: IntegrationOutboxRecord = {
      id: `outbox_${this.outbox.length + 1}`,
      channel,
      providerCode: body.providerCode,
      templateCode: body.templateCode,
      recipient: body.recipient,
      payload: body.payload,
      status: 'queued',
      retryCount: 0,
      preview,
      createdAt: new Date().toISOString(),
    };
    this.outbox = [message, ...this.outbox];
    return { ...message };
  }

  async listOutbox(
    channel: 'mail' | 'sms',
    query: IntegrationOutboxQueryDto = {},
  ): Promise<PageResult<IntegrationOutboxRecord>> {
    return createPage(
      this.outbox.filter(
        (message) =>
          message.channel === channel &&
          matchesOptional(message.status, query.status) &&
          matchesOptional(message.providerCode, query.providerCode),
      ),
      query,
    );
  }

  async getOutboxMessage(
    channel: 'mail' | 'sms',
    id: string,
  ): Promise<IntegrationOutboxRecord> {
    return {
      ...requireRecord(
        this.outbox.find(
          (message) => message.channel === channel && message.id === id,
        ),
        'Integration outbox message',
        id,
      ),
    };
  }

  async listOAuthProviders(
    query: IntegrationProviderQueryDto = {},
  ): Promise<PageResult<IntegrationProviderRecord>> {
    const enabled = normalizeOptionalBoolean(query.enabled);
    return createPage(
      this.providers
        .filter(
          (provider) =>
            provider.type === 'oauth' &&
            matchesOptional(provider.enabled, enabled) &&
            matchesOptional(provider.healthStatus, query.healthStatus),
        )
        .map(redactProvider),
      query,
    );
  }

  getOAuthCallbackContract(): OAuthCallbackContractRecord {
    return { ...oauthCallbackContract };
  }

  getDesign(topic: 'pay' | 'websocket' | 'wechat'): IntegrationDesignRecord {
    return requireRecord(
      integrationDesigns.find((design) => design.topic === topic),
      'Integration design',
      topic,
    );
  }

  private findProvider(code: string): IntegrationProviderRecord {
    return requireRecord(
      this.providers.find((provider) => provider.code === code),
      'Integration provider',
      code,
    );
  }

  private findTemplate(
    channel: 'mail' | 'sms',
    code: string,
  ): IntegrationTemplateRecord {
    return requireRecord(
      this.templates.find(
        (template) => template.channel === channel && template.code === code,
      ),
      'Integration template',
      code,
    );
  }
}

function redactProvider(
  provider: IntegrationProviderRecord,
): IntegrationProviderRecord {
  return {
    ...provider,
    config: redactProviderConfig(provider.config),
  };
}

function cloneProvider(
  provider: IntegrationProviderRecord,
): IntegrationProviderRecord {
  return {
    ...provider,
    config: { ...provider.config },
  };
}
