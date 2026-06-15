import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  PrismaService,
  type PrismaTransactionClient,
} from '@opencore/database';
import { SystemConfigService } from '@opencore/system';
import type {
  CreateIntegrationProviderDto,
  CreateIntegrationTemplateDto,
  CreateOutboxMessageDto,
  FailOutboxMessageDto,
  IntegrationOutboxCallbackDto,
  IntegrationOutboxQueryDto,
  IntegrationOutboxScheduleChannelResultDto,
  IntegrationProviderAuditAction,
  IntegrationProviderQueryDto,
  IntegrationTemplateQueryDto,
  OAuthTokenQueryDto,
  PageQueryDto,
  ProcessOutboxDto,
  PreviewTemplateDto,
  RevokeOAuthTokenDto,
  ScheduleOutboxDto,
  TestIntegrationProviderDto,
  UpdateIntegrationProviderDto,
} from './integration.dto';
import {
  integrationDesigns,
  oauthCallbackContract,
  type IntegrationDesignRecord,
  type IntegrationOutboxRecord,
  type IntegrationProviderAuditLogRecord,
  type IntegrationProviderRecord,
  type IntegrationTemplateRecord,
  type OAuthCallbackContractRecord,
  type OAuthTokenRecord,
} from './integration.seed';
import {
  deliverOutboxMessage,
  evaluateProviderDeliveryHealth,
  type OutboxDeliveryResult,
} from './integration.delivery-adapter';
import {
  assertOutboxCallbackProviderMatch,
  assertOutboxCallbackSignature,
  assertProviderReadyForOutbox,
  assertSecretRef,
  assertSmsSafety,
  assertTemplateEnabled,
  buildProviderTestResult,
  buildProviderHealthAudit,
  buildProviderDiagnostics,
  buildIntegrationSummary,
  buildOAuthTokenSummary,
  createOutboxScheduleResult,
  createPage,
  IntegrationRepository,
  matchesOAuthTokenQuery,
  normalizeOutboxCallback,
  normalizeOutboxAttachments,
  normalizeOutboxFailureError,
  normalizeOutboxSchedule,
  normalizeOutboxSubject,
  normalizeOAuthRevokeReason,
  normalizeOAuthTokenRecord,
  normalizeOAuthTokenStatus,
  normalizeOptionalProviderCode,
  parseConfigSecretRef,
  normalizeProviderAuditAction,
  normalizeProviderSecretRefStatus,
  normalizeProviderTestStatus,
  normalizeProviderType,
  normalizeOptionalBoolean,
  normalizeProcessOutboxLimit,
  redactProviderConfig,
  renderTemplate,
  requireRecord,
  validateProviderSecretRef,
  type PageResult,
  type ProviderTestResult,
} from './integration.repository';

type ProviderRow = {
  id: string;
  code: string;
  type: string;
  name: string;
  enabled: boolean;
  secretRef: string;
  secretRefStatus: string;
  config: unknown;
  configVersion: number;
  healthStatus: string;
  lastCheckedAt: Date | null;
  lastTestStatus: string | null;
  lastTestMessage: string | null;
  lastTestedAt: Date | null;
};

type ProviderAuditLogRow = {
  id: string;
  providerCode: string;
  action: string;
  actor: string;
  reason: string | null;
  beforeConfigVersion: number | null;
  afterConfigVersion: number | null;
  beforeSecretRefStatus: string | null;
  afterSecretRefStatus: string | null;
  testStatus: string | null;
  message: string | null;
  summary: unknown;
  createdAt: Date;
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
  subject: string | null;
  payload: unknown;
  attachments: unknown;
  status: string;
  retryCount: number;
  preview: string | null;
  error: string | null;
  sentAt: Date | null;
  createdAt: Date;
};

type OAuthTokenRow = {
  id: string;
  providerCode: string;
  subjectType: string;
  subjectId: string;
  providerAccountId: string;
  scopes: unknown;
  accessTokenRef: string;
  refreshTokenRef: string | null;
  status: string;
  expiresAt: Date | null;
  lastRotatedAt: Date | null;
  revokedAt: Date | null;
  revokedBy: string | null;
  revokeReason: string | null;
  createdAt: Date;
};

@Injectable()
export class PrismaIntegrationRepository extends IntegrationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfig: SystemConfigService,
  ) {
    super();
  }

  private readonly resolveProviderSecret = async (
    secretRef: string,
  ): Promise<string> => {
    const key = parseConfigSecretRef(secretRef);
    const secret = await this.systemConfig.resolveSecretConfigValue(key);
    return secret.value;
  };

  async getSummary() {
    const [providers, outbox, oauthTokens] = await Promise.all([
      this.prisma.integrationProvider.findMany(),
      this.prisma.integrationOutbox.findMany(),
      this.prisma.integrationOAuthToken.findMany(),
    ]);

    return buildIntegrationSummary({
      providers: providers.map(toProviderRecord),
      outbox: outbox.map(toOutboxRecord),
      oauthTokens: oauthTokens.map(toOAuthTokenRecord),
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
    const provider = await this.prisma.$transaction(async (tx) => {
      const created = await tx.integrationProvider.create({
        data: {
          code: body.code,
          type: body.type,
          name: body.name,
          enabled: body.enabled ?? false,
          secretRef: body.secretRef,
          secretRefStatus: 'unchecked',
          config: toInputJson(body.config),
          configVersion: 1,
          healthStatus: body.enabled ? 'unknown' : 'disabled',
        },
      });
      await createProviderAuditLog(tx, {
        providerCode: created.code,
        action: 'created',
        afterConfigVersion: created.configVersion,
        afterSecretRefStatus: created.secretRefStatus,
        message: 'Integration provider created.',
        summary: {
          enabled: created.enabled,
          type: created.type,
        },
      });

      return created;
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
    return this.updateProviderConfig(code, body, 'updated');
  }

  async enableProvider(code: string): Promise<IntegrationProviderRecord> {
    return this.updateProviderConfig(code, { enabled: true }, 'enabled');
  }

  async disableProvider(code: string): Promise<IntegrationProviderRecord> {
    return this.updateProviderConfig(code, { enabled: false }, 'disabled');
  }

  async checkProviderHealth(code: string): Promise<IntegrationProviderRecord> {
    const existing = await this.findProvider(code);
    const health = await evaluateProviderDeliveryHealth(existing, {
      secretResolver: this.resolveProviderSecret,
    });
    const provider = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.integrationProvider.update({
        where: { code },
        data: {
          healthStatus: health.status,
          lastCheckedAt: new Date(),
        },
      });
      await createProviderAuditLog(tx, {
        providerCode: code,
        action: 'health_checked',
        beforeConfigVersion: existing.configVersion,
        afterConfigVersion: updated.configVersion,
        beforeSecretRefStatus: existing.secretRefStatus,
        afterSecretRefStatus: updated.secretRefStatus,
        message:
          health.error ??
          `Integration provider health check completed: ${health.status}.`,
        summary: { healthStatus: health.status },
      });

      return updated;
    });

    return redactProvider(toProviderRecord(provider));
  }

  async testProvider(
    code: string,
    body: TestIntegrationProviderDto = {},
  ): Promise<ProviderTestResult> {
    const existing = await this.findProvider(code);
    const [secret, adapter] = await Promise.all([
      validateProviderSecretRef(existing.secretRef, this.resolveProviderSecret),
      evaluateProviderDeliveryHealth(
        { ...existing, enabled: true },
        { secretResolver: this.resolveProviderSecret },
      ),
    ]);
    const testedAt = new Date();
    const result = buildProviderTestResult({
      provider: existing,
      secret,
      adapter,
      testedAt: testedAt.toISOString(),
    });
    const provider = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.integrationProvider.update({
        where: { code },
        data: {
          secretRefStatus: result.secretRefStatus,
          lastTestStatus: result.status,
          lastTestMessage: result.message,
          lastTestedAt: testedAt,
        },
      });
      await createProviderAuditLog(tx, {
        providerCode: code,
        action: 'tested',
        reason: normalizeOptionalWhereText(body.reason),
        beforeConfigVersion: existing.configVersion,
        afterConfigVersion: updated.configVersion,
        beforeSecretRefStatus: existing.secretRefStatus,
        afterSecretRefStatus: updated.secretRefStatus,
        testStatus: result.status,
        message: result.message,
        summary: {
          adapterStatus: adapter.status,
          secretRefStatus: result.secretRefStatus,
        },
      });

      return updated;
    });

    return {
      ...result,
      provider: redactProvider(toProviderRecord(provider)),
    };
  }

  async listProviderAuditLogs(
    code: string,
    query: PageQueryDto = {},
  ): Promise<PageResult<IntegrationProviderAuditLogRecord>> {
    await this.findProvider(code);
    const rows = await this.prisma.integrationProviderAuditLog.findMany({
      where: { providerCode: code },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return createPage(rows.map(toProviderAuditLogRecord), query);
  }

  private async updateProviderConfig(
    code: string,
    body: UpdateIntegrationProviderDto,
    action: IntegrationProviderAuditAction,
  ): Promise<IntegrationProviderRecord> {
    const existing = await this.findProvider(code);
    if (body.secretRef) {
      assertSecretRef(body.secretRef);
    }

    const changedFields = listProviderChangedFields(body);
    const configVersion =
      changedFields.length > 0
        ? existing.configVersion + 1
        : existing.configVersion;
    const provider = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.integrationProvider.update({
        where: { code },
        data: {
          name: body.name ?? existing.name,
          enabled: body.enabled ?? existing.enabled,
          secretRef: body.secretRef ?? existing.secretRef,
          secretRefStatus: body.secretRef ? 'unchecked' : undefined,
          config: body.config ? toInputJson(body.config) : undefined,
          configVersion,
          healthStatus:
            body.enabled === false ? 'disabled' : existing.healthStatus,
          lastTestStatus: body.secretRef || body.config ? null : undefined,
          lastTestMessage: body.secretRef || body.config ? null : undefined,
          lastTestedAt: body.secretRef || body.config ? null : undefined,
        },
      });
      await createProviderAuditLog(tx, {
        providerCode: code,
        action,
        beforeConfigVersion: existing.configVersion,
        afterConfigVersion: updated.configVersion,
        beforeSecretRefStatus: existing.secretRefStatus,
        afterSecretRefStatus: updated.secretRefStatus,
        message: `Integration provider ${action.replace('_', ' ')}.`,
        summary: { changedFields },
      });

      return updated;
    });

    return redactProvider(toProviderRecord(provider));
  }

  async getProviderDiagnostics(code: string) {
    const provider = await this.findProvider(code);
    const outbox = await this.prisma.integrationOutbox.findMany({
      where: { providerCode: code },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });

    return buildProviderDiagnostics({
      provider,
      outbox: outbox.map(toOutboxRecord),
    });
  }

  async getProviderHealthAudit() {
    const [providers, outbox] = await Promise.all([
      this.prisma.integrationProvider.findMany({
        orderBy: [{ type: 'asc' }, { code: 'asc' }],
      }),
      this.prisma.integrationOutbox.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
    ]);

    return buildProviderHealthAudit({
      providers: providers.map(toProviderRecord),
      outbox: outbox.map(toOutboxRecord),
    });
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
    const rendered = template
      ? renderTemplate(template, body.payload)
      : undefined;
    const subject = normalizeOutboxSubject(
      channel,
      rendered?.subject ?? body.subject,
    );
    const attachments = normalizeOutboxAttachments(channel, body.attachments);
    const message = await this.prisma.integrationOutbox.create({
      data: {
        channel,
        providerCode: body.providerCode,
        templateCode: body.templateCode,
        recipient: body.recipient,
        subject,
        payload: toInputJson(body.payload),
        attachments: attachments ? toInputJson(attachments) : undefined,
        status: 'queued',
        retryCount: 0,
        preview: rendered?.body,
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
        failedCount: 0,
        skippedCount: 0,
        queuedCount: await this.countQueuedOutbox(channel, providerCode),
      };
    }

    const providers = new Map<string, IntegrationProviderRecord>();
    for (const code of new Set(queuedRows.map((row) => row.providerCode))) {
      const provider = await this.findProvider(code);
      assertProviderReadyForOutbox({
        code: provider.code,
        type: provider.type,
        enabled: provider.enabled,
        channel,
      });
      providers.set(code, provider);
    }

    const deliveries: Array<{
      row: OutboxRow;
      result: OutboxDeliveryResult;
    }> = [];
    for (const row of queuedRows) {
      const provider = requireRecord(
        providers.get(row.providerCode),
        'Integration provider',
        row.providerCode,
      );
      deliveries.push({
        row,
        result: await deliverOutboxMessage({
          channel,
          provider,
          message: toOutboxRecord(row),
          secretResolver: this.resolveProviderSecret,
        }),
      });
    }

    const now = new Date();
    const updatedRows = await this.prisma.$transaction(async (tx) => {
      const updatedRows: OutboxRow[] = [];

      for (const delivery of deliveries) {
        const deliveryFailed = delivery.result.status === 'failed';
        const error = delivery.result.error ?? 'Provider delivery failed.';
        const updated = await tx.integrationOutbox.update({
          where: { id: delivery.row.id },
          data: deliveryFailed
            ? {
                status: 'failed',
                retryCount: { increment: 1 },
                error,
                sentAt: null,
              }
            : {
                status: 'sent',
                error: null,
                sentAt: now,
              },
        });
        await syncNoticeDeliveryFromOutbox(tx, updated, {
          status: deliveryFailed ? 'failed' : 'sent',
          now,
          previousOutboxStatus: 'queued',
          error: deliveryFailed ? error : undefined,
        });
        updatedRows.push(updated);
      }

      return updatedRows;
    });

    return {
      channel,
      providerCode,
      attemptedCount: queuedRows.length,
      sentCount: updatedRows.filter((row) => row.status === 'sent').length,
      failedCount: updatedRows.filter((row) => row.status === 'failed').length,
      skippedCount: 0,
      queuedCount: await this.countQueuedOutbox(channel, providerCode),
    };
  }

  async runOutboxSchedule(body: ScheduleOutboxDto = {}) {
    const schedule = normalizeOutboxSchedule(body);
    const channels: IntegrationOutboxScheduleChannelResultDto[] = [];

    for (const channel of schedule.channels) {
      if (schedule.providerCode) {
        await this.assertScheduleProviderReady(channel, schedule.providerCode);
      }
      const retriedCount = schedule.retryFailed
        ? await this.retryEligibleFailedOutbox(channel, schedule)
        : 0;
      const process = await this.processOutbox(channel, {
        providerCode: schedule.providerCode,
        limit: schedule.limit,
      });
      channels.push({
        channel,
        providerCode: schedule.providerCode,
        retriedCount,
        process,
      });
    }

    return createOutboxScheduleResult({ schedule, channels });
  }

  async callbackOutbox(
    channel: 'mail' | 'sms',
    body: IntegrationOutboxCallbackDto,
  ): Promise<IntegrationOutboxRecord> {
    const callback = normalizeOutboxCallback(channel, body);
    const provider = await this.findProvider(callback.providerCode);
    assertProviderReadyForOutbox({
      code: provider.code,
      type: provider.type,
      enabled: provider.enabled,
      channel,
    });
    const existing = await this.findOutboxRow(channel, callback.messageId);
    assertOutboxCallbackProviderMatch({
      expectedProviderCode: callback.providerCode,
      actualProviderCode: existing.providerCode,
      messageId: existing.id,
    });
    assertOutboxCallbackSignature(callback, provider);

    return callback.status === 'sent'
      ? this.markOutboxSent(channel, existing.id)
      : this.markOutboxFailed(channel, existing.id, {
          error: callback.error ?? '',
        });
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

  async getOAuthTokenSummary() {
    const rows = await this.prisma.integrationOAuthToken.findMany({
      orderBy: [{ providerCode: 'asc' }, { subjectId: 'asc' }],
    });

    return buildOAuthTokenSummary(rows.map(toOAuthTokenRecord));
  }

  async listOAuthTokens(
    query: OAuthTokenQueryDto = {},
  ): Promise<PageResult<OAuthTokenRecord>> {
    const rows = await this.prisma.integrationOAuthToken.findMany({
      where: {
        providerCode: normalizeOptionalWhereText(query.providerCode),
        subjectId: normalizeOptionalWhereText(query.subjectId),
      },
      orderBy: [{ providerCode: 'asc' }, { subjectId: 'asc' }],
    });

    return createPage(
      rows
        .map(toOAuthTokenRecord)
        .map((token) => normalizeOAuthTokenRecord(token))
        .filter((token) => matchesOAuthTokenQuery(token, query)),
      query,
    );
  }

  async getOAuthToken(id: string): Promise<OAuthTokenRecord> {
    return normalizeOAuthTokenRecord(
      requireRecord(
        await this.prisma.integrationOAuthToken
          .findUnique({ where: { id } })
          .then((token) => (token ? toOAuthTokenRecord(token) : undefined)),
        'OAuth token',
        id,
      ),
    );
  }

  async revokeOAuthToken(
    id: string,
    body: RevokeOAuthTokenDto = {},
  ): Promise<OAuthTokenRecord> {
    const existing = await this.getOAuthToken(id);

    if (existing.status === 'revoked') {
      return existing;
    }

    const revoked = await this.prisma.integrationOAuthToken.update({
      where: { id },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy: 'admin',
        revokeReason: normalizeOAuthRevokeReason(body.reason),
      },
    });

    return normalizeOAuthTokenRecord(toOAuthTokenRecord(revoked));
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

  private async assertScheduleProviderReady(
    channel: 'mail' | 'sms',
    providerCode: string,
  ): Promise<void> {
    const provider = await this.findProvider(providerCode);
    assertProviderReadyForOutbox({
      code: provider.code,
      type: provider.type,
      enabled: provider.enabled,
      channel,
    });
  }

  private async retryEligibleFailedOutbox(
    channel: 'mail' | 'sms',
    schedule: ReturnType<typeof normalizeOutboxSchedule>,
  ): Promise<number> {
    const failedRows = await this.prisma.integrationOutbox.findMany({
      where: {
        channel,
        status: 'failed',
        providerCode: schedule.providerCode,
        retryCount: { lt: schedule.maxRetryCount },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: schedule.limit,
    });

    if (failedRows.length === 0) {
      return 0;
    }

    for (const code of new Set(failedRows.map((row) => row.providerCode))) {
      await this.assertScheduleProviderReady(channel, code);
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      for (const row of failedRows) {
        const updated = await tx.integrationOutbox.update({
          where: { id: row.id },
          data: {
            status: 'queued',
            error: null,
            sentAt: null,
          },
        });
        await syncNoticeDeliveryFromOutbox(tx, updated, {
          status: 'queued',
          now,
          previousOutboxStatus: 'failed',
        });
      }
    });

    return failedRows.length;
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
    secretRefStatus: normalizeProviderSecretRefStatus(row.secretRefStatus),
    configVersion: row.configVersion,
    config: normalizeRecord(row.config) ?? {},
    healthStatus: normalizeHealthStatus(row.healthStatus),
    lastCheckedAt: row.lastCheckedAt?.toISOString(),
    lastTestStatus: normalizeProviderTestStatus(row.lastTestStatus),
    lastTestMessage: row.lastTestMessage ?? undefined,
    lastTestedAt: row.lastTestedAt?.toISOString(),
  };
}

function toProviderAuditLogRecord(
  row: ProviderAuditLogRow,
): IntegrationProviderAuditLogRecord {
  return {
    id: row.id,
    providerCode: row.providerCode,
    action: normalizeProviderAuditAction(row.action),
    actor: row.actor,
    reason: row.reason ?? undefined,
    beforeConfigVersion: row.beforeConfigVersion ?? undefined,
    afterConfigVersion: row.afterConfigVersion ?? undefined,
    beforeSecretRefStatus: row.beforeSecretRefStatus
      ? normalizeProviderSecretRefStatus(row.beforeSecretRefStatus)
      : undefined,
    afterSecretRefStatus: row.afterSecretRefStatus
      ? normalizeProviderSecretRefStatus(row.afterSecretRefStatus)
      : undefined,
    testStatus: normalizeProviderTestStatus(row.testStatus),
    message: row.message ?? undefined,
    summary: normalizeRecord(row.summary),
    createdAt: row.createdAt.toISOString(),
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
    subject: row.subject ?? undefined,
    payload: normalizeRecord(row.payload) ?? {},
    attachments: normalizeOutboxAttachments(
      row.channel === 'sms' ? 'sms' : 'mail',
      row.attachments,
    ),
    status: normalizeOutboxStatus(row.status),
    retryCount: row.retryCount,
    preview: row.preview ?? undefined,
    error: row.error ?? undefined,
    sentAt: row.sentAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function toOAuthTokenRecord(row: OAuthTokenRow): OAuthTokenRecord {
  return {
    id: row.id,
    providerCode: row.providerCode,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    providerAccountId: row.providerAccountId,
    scopes: normalizeScopes(row.scopes),
    accessTokenRef: row.accessTokenRef,
    refreshTokenRef: row.refreshTokenRef ?? undefined,
    status: normalizeOAuthTokenStatus(row.status),
    expiresAt: row.expiresAt?.toISOString(),
    lastRotatedAt: row.lastRotatedAt?.toISOString(),
    revokedAt: row.revokedAt?.toISOString(),
    revokedBy: row.revokedBy ?? undefined,
    revokeReason: row.revokeReason ?? undefined,
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

function normalizeScopes(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function normalizeOptionalWhereText(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const text = String(value).trim();
  return text ? text : undefined;
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

function listProviderChangedFields(
  body: UpdateIntegrationProviderDto,
): string[] {
  return (['name', 'enabled', 'secretRef', 'config'] as const).filter(
    (field) => body[field] !== undefined,
  );
}

async function createProviderAuditLog(
  tx: PrismaTransactionClient,
  input: {
    providerCode: string;
    action: IntegrationProviderAuditAction;
    actor?: string;
    reason?: string;
    beforeConfigVersion?: number;
    afterConfigVersion?: number;
    beforeSecretRefStatus?: string;
    afterSecretRefStatus?: string;
    testStatus?: string;
    message?: string;
    summary?: Record<string, unknown>;
  },
): Promise<void> {
  await tx.integrationProviderAuditLog.create({
    data: {
      providerCode: input.providerCode,
      action: input.action,
      actor: input.actor ?? 'admin',
      reason: input.reason,
      beforeConfigVersion: input.beforeConfigVersion,
      afterConfigVersion: input.afterConfigVersion,
      beforeSecretRefStatus: input.beforeSecretRefStatus,
      afterSecretRefStatus: input.afterSecretRefStatus,
      testStatus: input.testStatus,
      message: input.message,
      summary: input.summary ? toInputJson(input.summary) : undefined,
    },
  });
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
