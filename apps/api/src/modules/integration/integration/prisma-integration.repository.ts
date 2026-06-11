import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';
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
  normalizeProviderType,
  normalizeOptionalBoolean,
  redactProviderConfig,
  renderTemplate,
  requireRecord,
  type PageResult,
} from './integration.repository';

type ProviderRow = {
  id: string;
  code: string;
  type: string;
  name: string;
  enabled: boolean;
  secretRef: string;
  config: unknown;
  healthStatus: string;
  lastCheckedAt: Date | null;
};

type TemplateRow = {
  id: string;
  code: string;
  channel: string;
  name: string;
  subject: string | null;
  body: string;
  enabled: boolean;
};

type OutboxRow = {
  id: string;
  channel: string;
  providerCode: string;
  templateCode: string | null;
  recipient: string;
  payload: unknown;
  status: string;
  retryCount: number;
  preview: string | null;
  error: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class PrismaIntegrationRepository extends IntegrationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getSummary() {
    const [providers, outbox] = await Promise.all([
      this.prisma.integrationProvider.findMany(),
      this.prisma.integrationOutbox.findMany(),
    ]);

    return buildIntegrationSummary({
      providers: providers.map(toProviderRecord),
      outbox: outbox.map(toOutboxRecord),
      designs: integrationDesigns,
    });
  }

  async listProviders(
    query: IntegrationProviderQueryDto = {},
  ): Promise<PageResult<IntegrationProviderRecord>> {
    const enabled = normalizeOptionalBoolean(query.enabled);
    const rows = await this.prisma.integrationProvider.findMany({
      where: {
        type: query.type,
        enabled,
        healthStatus: query.healthStatus,
      },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });

    return createPage(rows.map(toProviderRecord).map(redactProvider), query);
  }

  async createProvider(
    body: CreateIntegrationProviderDto,
  ): Promise<IntegrationProviderRecord> {
    assertSecretRef(body.secretRef);
    const provider = await this.prisma.integrationProvider.create({
      data: {
        code: body.code,
        type: body.type,
        name: body.name,
        enabled: body.enabled ?? false,
        secretRef: body.secretRef,
        config: toInputJson(body.config),
        healthStatus: body.enabled ? 'unknown' : 'disabled',
      },
    });

    return redactProvider(toProviderRecord(provider));
  }

  async getProvider(code: string): Promise<IntegrationProviderRecord> {
    return redactProvider(await this.findProvider(code));
  }

  async updateProvider(
    code: string,
    body: UpdateIntegrationProviderDto,
  ): Promise<IntegrationProviderRecord> {
    const existing = await this.findProvider(code);

    if (body.secretRef) {
      assertSecretRef(body.secretRef);
    }

    const provider = await this.prisma.integrationProvider.update({
      where: { code },
      data: {
        name: body.name ?? existing.name,
        enabled: body.enabled ?? existing.enabled,
        secretRef: body.secretRef ?? existing.secretRef,
        config: body.config ? toInputJson(body.config) : undefined,
        healthStatus:
          body.enabled === false ? 'disabled' : existing.healthStatus,
      },
    });

    return redactProvider(toProviderRecord(provider));
  }

  async enableProvider(code: string): Promise<IntegrationProviderRecord> {
    return this.updateProvider(code, { enabled: true });
  }

  async disableProvider(code: string): Promise<IntegrationProviderRecord> {
    return this.updateProvider(code, { enabled: false });
  }

  async checkProviderHealth(code: string): Promise<IntegrationProviderRecord> {
    const existing = await this.findProvider(code);
    const provider = await this.prisma.integrationProvider.update({
      where: { code },
      data: {
        healthStatus: existing.enabled ? 'healthy' : 'disabled',
        lastCheckedAt: new Date(),
      },
    });

    return redactProvider(toProviderRecord(provider));
  }

  async listTemplates(
    channel: 'mail' | 'sms',
    query: IntegrationTemplateQueryDto = {},
  ): Promise<PageResult<IntegrationTemplateRecord>> {
    const enabled = normalizeOptionalBoolean(query.enabled);
    const rows = await this.prisma.integrationTemplate.findMany({
      where: { channel, enabled },
      orderBy: [{ code: 'asc' }],
    });

    return createPage(rows.map(toTemplateRecord), query);
  }

  async createTemplate(
    channel: 'mail' | 'sms',
    body: CreateIntegrationTemplateDto,
  ): Promise<IntegrationTemplateRecord> {
    const template = await this.prisma.integrationTemplate.create({
      data: {
        code: body.code,
        channel,
        name: body.name,
        subject: channel === 'mail' ? body.subject : undefined,
        body: body.body,
        enabled: body.enabled ?? true,
      },
    });

    return toTemplateRecord(template);
  }

  async getTemplate(
    channel: 'mail' | 'sms',
    code: string,
  ): Promise<IntegrationTemplateRecord> {
    return this.findTemplate(channel, code);
  }

  async previewTemplate(channel: 'mail' | 'sms', body: PreviewTemplateDto) {
    const template = await this.findTemplate(channel, body.templateCode);
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
    const provider = await this.findProvider(body.providerCode);
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
      ? await this.findTemplate(channel, body.templateCode)
      : undefined;
    if (template) {
      assertTemplateEnabled(template);
    }
    const preview = template
      ? renderTemplate(template, body.payload).body
      : undefined;
    const message = await this.prisma.integrationOutbox.create({
      data: {
        channel,
        providerCode: body.providerCode,
        templateCode: body.templateCode,
        recipient: body.recipient,
        payload: toInputJson(body.payload),
        status: 'queued',
        retryCount: 0,
        preview,
      },
    });

    return toOutboxRecord(message);
  }

  async listOutbox(
    channel: 'mail' | 'sms',
    query: IntegrationOutboxQueryDto = {},
  ): Promise<PageResult<IntegrationOutboxRecord>> {
    const rows = await this.prisma.integrationOutbox.findMany({
      where: {
        channel,
        status: query.status,
        providerCode: query.providerCode,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return createPage(rows.map(toOutboxRecord), query);
  }

  async getOutboxMessage(
    channel: 'mail' | 'sms',
    id: string,
  ): Promise<IntegrationOutboxRecord> {
    return requireRecord(
      await this.prisma.integrationOutbox
        .findFirst({ where: { id, channel } })
        .then((message) => (message ? toOutboxRecord(message) : undefined)),
      'Integration outbox message',
      id,
    );
  }

  async listOAuthProviders(
    query: IntegrationProviderQueryDto = {},
  ): Promise<PageResult<IntegrationProviderRecord>> {
    const enabled = normalizeOptionalBoolean(query.enabled);
    const rows = await this.prisma.integrationProvider.findMany({
      where: { type: 'oauth', enabled, healthStatus: query.healthStatus },
      orderBy: [{ code: 'asc' }],
    });

    return createPage(rows.map(toProviderRecord).map(redactProvider), query);
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

  private async findProvider(code: string): Promise<IntegrationProviderRecord> {
    return requireRecord(
      await this.prisma.integrationProvider
        .findUnique({ where: { code } })
        .then((provider) =>
          provider ? toProviderRecord(provider) : undefined,
        ),
      'Integration provider',
      code,
    );
  }

  private async findTemplate(
    channel: 'mail' | 'sms',
    code: string,
  ): Promise<IntegrationTemplateRecord> {
    return requireRecord(
      await this.prisma.integrationTemplate
        .findUnique({ where: { code } })
        .then((template) =>
          template && template.channel === channel
            ? toTemplateRecord(template)
            : undefined,
        ),
      'Integration template',
      code,
    );
  }
}

function toProviderRecord(row: ProviderRow): IntegrationProviderRecord {
  return {
    id: row.id,
    code: row.code,
    type: normalizeProviderType(row.type),
    name: row.name,
    enabled: row.enabled,
    secretRef: row.secretRef,
    config: normalizeRecord(row.config) ?? {},
    healthStatus: normalizeHealthStatus(row.healthStatus),
    lastCheckedAt: row.lastCheckedAt?.toISOString(),
  };
}

function toTemplateRecord(row: TemplateRow): IntegrationTemplateRecord {
  return {
    id: row.id,
    code: row.code,
    channel: row.channel === 'sms' ? 'sms' : 'mail',
    name: row.name,
    subject: row.subject ?? undefined,
    body: row.body,
    enabled: row.enabled,
  };
}

function toOutboxRecord(row: OutboxRow): IntegrationOutboxRecord {
  return {
    id: row.id,
    channel: row.channel === 'sms' ? 'sms' : 'mail',
    providerCode: row.providerCode,
    templateCode: row.templateCode ?? undefined,
    recipient: row.recipient,
    payload: normalizeRecord(row.payload) ?? {},
    status: normalizeOutboxStatus(row.status),
    retryCount: row.retryCount,
    preview: row.preview ?? undefined,
    error: row.error ?? undefined,
    sentAt: row.sentAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function redactProvider(
  provider: IntegrationProviderRecord,
): IntegrationProviderRecord {
  return {
    ...provider,
    config: redactProviderConfig(provider.config),
  };
}

function normalizeRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function normalizeHealthStatus(
  value: string,
): IntegrationProviderRecord['healthStatus'] {
  return ['unknown', 'healthy', 'degraded', 'disabled'].includes(value)
    ? (value as IntegrationProviderRecord['healthStatus'])
    : 'unknown';
}

function normalizeOutboxStatus(
  value: string,
): IntegrationOutboxRecord['status'] {
  return ['queued', 'sent', 'failed'].includes(value)
    ? (value as IntegrationOutboxRecord['status'])
    : 'queued';
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
