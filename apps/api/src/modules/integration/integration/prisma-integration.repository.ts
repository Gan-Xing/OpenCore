import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  PrismaService,
  type PrismaTransactionClient,
} from '@opencore/database';
import type {
  CreateIntegrationProviderDto,
  CreateIntegrationTemplateDto,
  CreateOutboxMessageDto,
  FailOutboxMessageDto,
  IntegrationOutboxQueryDto,
  IntegrationProviderQueryDto,
  IntegrationTemplateQueryDto,
  ProcessOutboxDto,
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
  normalizeOutboxFailureError,
  normalizeOptionalProviderCode,
  normalizeProviderType,
  normalizeOptionalBoolean,
  normalizeProcessOutboxLimit,
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

  async markOutboxSent(
    channel: 'mail' | 'sms',
    id: string,
  ): Promise<IntegrationOutboxRecord> {
    const existing = await this.findOutboxRow(channel, id);
    if (existing.status === 'sent') {
      return toOutboxRecord(existing);
    }

    const now = new Date();
    const message = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.integrationOutbox.update({
        where: { id },
        data: {
          status: 'sent',
          error: null,
          sentAt: now,
        },
      });
      await syncNoticeDeliveryFromOutbox(tx, updated, {
        status: 'sent',
        now,
        previousOutboxStatus: normalizeOutboxStatus(existing.status),
      });

      return updated;
    });

    return toOutboxRecord(message);
  }

  async markOutboxFailed(
    channel: 'mail' | 'sms',
    id: string,
    body: FailOutboxMessageDto,
  ): Promise<IntegrationOutboxRecord> {
    const existing = await this.findOutboxRow(channel, id);
    if (existing.status === 'sent') {
      throw new BadRequestException(
        'Sent outbox messages cannot be marked failed.',
      );
    }
    const now = new Date();
    const error = normalizeOutboxFailureError(body.error);
    const shouldIncrementRetry = existing.status !== 'failed';
    const message = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.integrationOutbox.update({
        where: { id },
        data: {
          status: 'failed',
          retryCount: shouldIncrementRetry ? { increment: 1 } : undefined,
          error,
          sentAt: null,
        },
      });
      await syncNoticeDeliveryFromOutbox(tx, updated, {
        status: 'failed',
        error,
        now,
        previousOutboxStatus: normalizeOutboxStatus(existing.status),
      });

      return updated;
    });

    return toOutboxRecord(message);
  }

  async retryOutbox(
    channel: 'mail' | 'sms',
    id: string,
  ): Promise<IntegrationOutboxRecord> {
    const existing = await this.findOutboxRow(channel, id);
    if (existing.status !== 'failed') {
      throw new BadRequestException(
        'Only failed outbox messages can be retried.',
      );
    }

    const now = new Date();
    const message = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.integrationOutbox.update({
        where: { id },
        data: {
          status: 'queued',
          error: null,
          sentAt: null,
        },
      });
      await syncNoticeDeliveryFromOutbox(tx, updated, {
        status: 'queued',
        now,
        previousOutboxStatus: normalizeOutboxStatus(existing.status),
      });

      return updated;
    });

    return toOutboxRecord(message);
  }

  async processOutbox(channel: 'mail' | 'sms', body: ProcessOutboxDto = {}) {
    const limit = normalizeProcessOutboxLimit(body.limit);
    const providerCode = normalizeOptionalProviderCode(body.providerCode);
    const queuedRows = await this.prisma.integrationOutbox.findMany({
      where: { channel, status: 'queued', providerCode },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });

    if (queuedRows.length === 0) {
      return {
        channel,
        providerCode,
        attemptedCount: 0,
        sentCount: 0,
        skippedCount: 0,
        queuedCount: await this.countQueuedOutbox(channel, providerCode),
      };
    }

    for (const code of new Set(queuedRows.map((row) => row.providerCode))) {
      const provider = await this.findProvider(code);
      assertProviderReadyForOutbox({
        code: provider.code,
        type: provider.type,
        enabled: provider.enabled,
        channel,
      });
    }

    const now = new Date();
    const sentRows = await this.prisma.$transaction(async (tx) => {
      const updatedRows: OutboxRow[] = [];

      for (const row of queuedRows) {
        const updated = await tx.integrationOutbox.update({
          where: { id: row.id },
          data: {
            status: 'sent',
            error: null,
            sentAt: now,
          },
        });
        await syncNoticeDeliveryFromOutbox(tx, updated, {
          status: 'sent',
          now,
          previousOutboxStatus: 'queued',
        });
        updatedRows.push(updated);
      }

      return updatedRows;
    });

    return {
      channel,
      providerCode,
      attemptedCount: queuedRows.length,
      sentCount: sentRows.length,
      skippedCount: 0,
      queuedCount: await this.countQueuedOutbox(channel, providerCode),
    };
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

  private async findOutboxRow(
    channel: 'mail' | 'sms',
    id: string,
  ): Promise<OutboxRow> {
    return requireRecord(
      await this.prisma.integrationOutbox.findFirst({
        where: { id, channel },
      }),
      'Integration outbox message',
      id,
    );
  }

  private countQueuedOutbox(
    channel: 'mail' | 'sms',
    providerCode?: string,
  ): Promise<number> {
    return this.prisma.integrationOutbox.count({
      where: { channel, providerCode, status: 'queued' },
    });
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

async function syncNoticeDeliveryFromOutbox(
  tx: PrismaTransactionClient,
  outbox: OutboxRow,
  input: {
    status: IntegrationOutboxRecord['status'];
    now: Date;
    previousOutboxStatus: IntegrationOutboxRecord['status'];
    error?: string;
  },
): Promise<void> {
  const payload = normalizeRecord(outbox.payload) ?? {};
  const deliveryId =
    typeof payload.deliveryId === 'string' ? payload.deliveryId : undefined;
  if (!deliveryId) {
    return;
  }

  const attemptedNow = input.previousOutboxStatus !== input.status;
  if (input.status === 'sent') {
    await tx.systemNoticeDelivery.updateMany({
      where: { id: deliveryId, providerMessageId: outbox.id },
      data: {
        providerStatus: 'sent',
        lastAttemptAt: input.now,
        sentAt: input.now,
        lastError: null,
        ...(attemptedNow ? { attemptCount: { increment: 1 } } : {}),
      },
    });
    return;
  }

  if (input.status === 'failed') {
    await tx.systemNoticeDelivery.updateMany({
      where: { id: deliveryId, providerMessageId: outbox.id },
      data: {
        providerStatus: 'failed',
        lastAttemptAt: input.now,
        sentAt: null,
        lastError: input.error,
        ...(attemptedNow ? { attemptCount: { increment: 1 } } : {}),
      },
    });
    return;
  }

  await tx.systemNoticeDelivery.updateMany({
    where: { id: deliveryId, providerMessageId: outbox.id },
    data: {
      providerStatus: 'pending',
      sentAt: null,
      lastError: null,
    },
  });
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
