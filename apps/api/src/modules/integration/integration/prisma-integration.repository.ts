import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
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
  OAuthCallbackAuditQueryDto,
  OAuthFlowQueryDto,
  OAuthProviderCallbackDto,
  OAuthTokenQueryDto,
  PageQueryDto,
  ProcessOutboxDto,
  PreviewTemplateDto,
  PublishWebSocketRuntimeEventDto,
  RevokeOAuthTokenDto,
  ScheduleOutboxDto,
  StartOAuthFlowDto,
  StartOAuthProfileFlowDto,
  TestIntegrationProviderDto,
  TestOutboxMessageDto,
  UpdateIntegrationProviderDto,
  WebSocketRuntimeStreamQueryDto,
} from './integration.dto';
import {
  integrationDesigns,
  oauthCallbackContract,
  type IntegrationDesignRecord,
  type IntegrationOutboxRecord,
  type IntegrationProviderAuditLogRecord,
  type IntegrationProviderRecord,
  type IntegrationTemplateRecord,
  type OAuthCallbackAuditRecord,
  type OAuthCallbackContractRecord,
  type OAuthFlowRecord,
  type OAuthTokenRecord,
  type WebSocketRuntimeEventRecord,
} from './integration.seed';
import {
  deliverOutboxMessage,
  evaluateProviderDeliveryHealth,
  type OutboxDeliveryResult,
} from './integration.delivery-adapter';
import {
  assertOutboxCallbackProviderMatch,
  assertOAuthProfileProviderBindable,
  assertOutboxCallbackSignature,
  assertOAuthTokenBelongsToSubject,
  assertProviderReadyForOutbox,
  assertSecretRef,
  assertSmsSafety,
  assertTemplateEnabled,
  buildProviderTestResult,
  buildProviderHealthAudit,
  buildProviderDiagnostics,
  buildIntegrationSummary,
  buildOAuthTokenSummary,
  buildOAuthAuthorizationUrl,
  createOAuthProviderAccountId,
  createOAuthTokenId,
  createOAuthTokenSecretRefs,
  createOutboxScheduleResult,
  IntegrationWebSocketRuntimeStore,
  createPage,
  integrationBadRequest,
  IntegrationRepository,
  matchesOAuthCallbackAuditQuery,
  matchesOAuthFlowQuery,
  matchesOAuthTokenQuery,
  normalizeOAuthCallback,
  normalizeOAuthFlowRecord,
  normalizeOAuthProviderCode,
  normalizeOAuthStartFlow,
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
  toOAuthProfileAccountDto,
  toOAuthProfileProviderDto,
  validateProviderSecretRef,
  type PageResult,
  type ProviderTestResult,
  type WebSocketRuntimeSink,
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

type OAuthFlowRow = {
  id: string;
  providerCode: string;
  state: string;
  subjectType: string;
  subjectId: string;
  scopes: unknown;
  redirectUri: string | null;
  authorizationUrl: string;
  status: string;
  expiresAt: Date;
  callbackCodeHash: string | null;
  callbackError: string | null;
  tokenId: string | null;
  completedAt: Date | null;
  createdAt: Date;
};

type OAuthCallbackAuditRow = {
  id: string;
  providerCode: string;
  flowId: string | null;
  state: string;
  status: string;
  reason: string | null;
  callbackCodeHash: string | null;
  callbackError: string | null;
  providerAccountId: string | null;
  tokenId: string | null;
  createdAt: Date;
};

type WebSocketRuntimeEventRow = {
  id: string;
  room: string;
  type: string;
  payloadPreview: unknown;
  traceId: string | null;
  deliveredCount: number;
  status: string;
  createdAt: Date;
};

@Injectable()
export class PrismaIntegrationRepository extends IntegrationRepository {
  private readonly websocketRuntime = new IntegrationWebSocketRuntimeStore();

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

  async sendTestOutbox(channel: 'mail' | 'sms', body: TestOutboxMessageDto) {
    const queued = await this.enqueueOutbox(channel, body);
    const provider = await this.findProvider(body.providerCode);
    const delivery = await deliverOutboxMessage({
      channel,
      provider,
      message: queued,
      secretResolver: this.resolveProviderSecret,
    });
    const message =
      delivery.status === 'sent'
        ? await this.markOutboxSent(channel, queued.id)
        : await this.markOutboxFailed(channel, queued.id, {
            error: delivery.error ?? 'Provider test delivery failed.',
          });

    return {
      channel,
      providerCode: body.providerCode,
      message,
      status: delivery.status,
      error: delivery.error,
      testedAt: new Date().toISOString(),
    };
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
      throw integrationBadRequest(
        'INTEGRATION_OUTBOX_ALREADY_SENT',
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
      throw integrationBadRequest(
        'INTEGRATION_OUTBOX_RETRY_STATUS_INVALID',
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

  async listProfileOAuthProviders() {
    const rows = await this.prisma.integrationProvider.findMany({
      where: { type: 'oauth', enabled: true },
      orderBy: [{ code: 'asc' }],
    });

    return rows.map(toProviderRecord).map(toOAuthProfileProviderDto);
  }

  getOAuthCallbackContract(): OAuthCallbackContractRecord {
    return { ...oauthCallbackContract };
  }

  async startOAuthFlow(body: StartOAuthFlowDto): Promise<OAuthFlowRecord> {
    const provider = await this.findProvider(
      normalizeOAuthProviderCode(body.providerCode),
    );
    const start = normalizeOAuthStartFlow(body, provider);
    const state = randomBytes(24).toString('base64url');
    const expiresAt = new Date(
      Date.now() + oauthCallbackContract.stateTtlSeconds * 1000,
    );
    const authorizationUrl = buildOAuthAuthorizationUrl({
      provider,
      state,
      start,
    });

    const flow = await this.prisma.integrationOAuthFlow.create({
      data: {
        providerCode: start.providerCode,
        state,
        subjectType: start.subjectType,
        subjectId: start.subjectId,
        scopes: toInputJson([...start.scopes]),
        redirectUri: start.redirectUri,
        authorizationUrl,
        status: 'pending',
        expiresAt,
      },
    });

    return normalizeOAuthFlowRecord(toOAuthFlowRecord(flow));
  }

  async listOAuthFlows(
    query: OAuthFlowQueryDto = {},
  ): Promise<PageResult<OAuthFlowRecord>> {
    const rows = await this.prisma.integrationOAuthFlow.findMany({
      where: {
        providerCode: normalizeOptionalWhereText(query.providerCode),
        subjectId: normalizeOptionalWhereText(query.subjectId),
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return createPage(
      rows
        .map(toOAuthFlowRecord)
        .map((flow) => normalizeOAuthFlowRecord(flow))
        .filter((flow) => matchesOAuthFlowQuery(flow, query)),
      query,
    );
  }

  async callbackOAuthProvider(
    providerCode: string,
    body: OAuthProviderCallbackDto,
  ) {
    const callback = normalizeOAuthCallback(providerCode, body);
    const provider = await this.findProvider(callback.providerCode);
    if (provider.type !== 'oauth' || !provider.enabled) {
      const reason =
        provider.type !== 'oauth'
          ? `Provider ${provider.code} is not an OAuth provider.`
          : `OAuth provider ${provider.code} is disabled.`;
      const audit = await this.createOAuthCallbackAudit({
        providerCode: callback.providerCode,
        state: callback.state,
        status: 'rejected',
        reason,
      });
      return {
        providerCode: callback.providerCode,
        state: callback.state,
        status: 'rejected' as const,
        message: audit.reason ?? 'OAuth callback rejected.',
        audit,
      };
    }

    const now = new Date();
    const flow = await this.prisma.integrationOAuthFlow.findUnique({
      where: { state: callback.state },
    });

    if (!flow || flow.providerCode !== callback.providerCode) {
      const audit = await this.createOAuthCallbackAudit({
        providerCode: callback.providerCode,
        state: callback.state,
        status: 'rejected',
        reason: 'OAuth callback state is invalid for this provider.',
      });
      return {
        providerCode: callback.providerCode,
        state: callback.state,
        status: 'rejected' as const,
        message: audit.reason ?? 'OAuth callback rejected.',
        audit,
      };
    }

    const normalizedFlow = normalizeOAuthFlowRecord(toOAuthFlowRecord(flow));
    if (normalizedFlow.status !== 'pending') {
      const audit = await this.createOAuthCallbackAudit({
        providerCode: callback.providerCode,
        flowId: flow.id,
        state: callback.state,
        status: 'rejected',
        reason: `OAuth callback state is ${normalizedFlow.status}.`,
        tokenId: flow.tokenId ?? undefined,
      });
      return {
        providerCode: callback.providerCode,
        flowId: flow.id,
        state: callback.state,
        status: 'rejected' as const,
        message: audit.reason ?? 'OAuth callback rejected.',
        audit,
      };
    }

    if (callback.error) {
      const failed = await this.prisma.$transaction(async (tx) => {
        const updatedFlow = await tx.integrationOAuthFlow.update({
          where: { id: flow.id },
          data: {
            status: 'failed',
            callbackError: callback.error,
            completedAt: now,
          },
        });
        const audit = await tx.integrationOAuthCallbackAudit.create({
          data: {
            providerCode: callback.providerCode,
            flowId: flow.id,
            state: callback.state,
            status: 'rejected',
            reason: `OAuth provider returned error: ${callback.error}`,
            callbackError: callback.error,
          },
        });

        return { audit, flow: updatedFlow };
      });

      const audit = toOAuthCallbackAuditRecord(failed.audit);
      return {
        providerCode: callback.providerCode,
        flowId: flow.id,
        state: callback.state,
        status: 'rejected' as const,
        message: audit.reason ?? 'OAuth callback rejected.',
        audit,
        completedAt: failed.flow.completedAt?.toISOString(),
      };
    }

    const code = callback.code ?? '';
    const callbackCodeHash = hashOAuthCallbackCode(code);
    const providerAccountId = createOAuthProviderAccountId({
      providerCode: callback.providerCode,
      subjectId: flow.subjectId,
      providerAccountId: callback.providerAccountId,
    });
    const tokenRefs = createOAuthTokenSecretRefs({
      providerCode: callback.providerCode,
      subjectId: flow.subjectId,
      providerAccountId,
    });
    const scopes =
      callback.scopes && callback.scopes.length > 0
        ? callback.scopes
        : normalizeScopes(flow.scopes);
    const tokenExpiresAt = new Date(
      now.getTime() + callback.expiresInSeconds * 1000,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const token = await tx.integrationOAuthToken.upsert({
        where: {
          providerCode_subjectId_providerAccountId: {
            providerCode: callback.providerCode,
            subjectId: flow.subjectId,
            providerAccountId,
          },
        },
        create: {
          id: createOAuthTokenId({
            providerCode: callback.providerCode,
            subjectId: flow.subjectId,
            providerAccountId,
          }),
          providerCode: callback.providerCode,
          subjectType: flow.subjectType,
          subjectId: flow.subjectId,
          providerAccountId,
          scopes: toInputJson([...scopes]),
          accessTokenRef: tokenRefs.accessTokenRef,
          refreshTokenRef: tokenRefs.refreshTokenRef,
          status: 'active',
          expiresAt: tokenExpiresAt,
          lastRotatedAt: now,
        },
        update: {
          subjectType: flow.subjectType,
          scopes: toInputJson([...scopes]),
          accessTokenRef: tokenRefs.accessTokenRef,
          refreshTokenRef: tokenRefs.refreshTokenRef,
          status: 'active',
          expiresAt: tokenExpiresAt,
          lastRotatedAt: now,
          revokedAt: null,
          revokedBy: null,
          revokeReason: null,
        },
      });
      const updatedFlow = await tx.integrationOAuthFlow.update({
        where: { id: flow.id },
        data: {
          status: 'completed',
          callbackCodeHash,
          callbackError: null,
          tokenId: token.id,
          completedAt: now,
        },
      });
      const audit = await tx.integrationOAuthCallbackAudit.create({
        data: {
          providerCode: callback.providerCode,
          flowId: flow.id,
          state: callback.state,
          status: 'accepted',
          reason: 'OAuth callback accepted and token reference archived.',
          callbackCodeHash,
          providerAccountId,
          tokenId: token.id,
        },
      });

      return { audit, flow: updatedFlow, token };
    });

    const audit = toOAuthCallbackAuditRecord(result.audit);
    return {
      providerCode: callback.providerCode,
      flowId: flow.id,
      state: callback.state,
      status: 'accepted' as const,
      message: audit.reason ?? 'OAuth callback accepted.',
      audit,
      token: normalizeOAuthTokenRecord(toOAuthTokenRecord(result.token)),
      completedAt: result.flow.completedAt?.toISOString(),
    };
  }

  async listOAuthCallbackAudits(
    query: OAuthCallbackAuditQueryDto = {},
  ): Promise<PageResult<OAuthCallbackAuditRecord>> {
    const rows = await this.prisma.integrationOAuthCallbackAudit.findMany({
      where: {
        providerCode: normalizeOptionalWhereText(query.providerCode),
        status: normalizeOptionalWhereText(query.status),
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return createPage(
      rows
        .map(toOAuthCallbackAuditRecord)
        .filter((audit) => matchesOAuthCallbackAuditQuery(audit, query)),
      query,
    );
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

  async listProfileOAuthAccounts(subjectId: string) {
    const rows = await this.prisma.integrationOAuthToken.findMany({
      where: { subjectType: 'user', subjectId },
      orderBy: [{ providerCode: 'asc' }, { createdAt: 'desc' }],
    });
    const providers = await this.prisma.integrationProvider.findMany({
      where: {
        code: { in: [...new Set(rows.map((row) => row.providerCode))] },
      },
      select: { code: true, name: true },
    });
    const providersByCode = new Map(
      providers.map((provider) => [provider.code, provider]),
    );

    return rows.map((row) =>
      toOAuthProfileAccountDto(
        toOAuthTokenRecord(row),
        providersByCode.get(row.providerCode),
      ),
    );
  }

  async startProfileOAuthFlow(
    subjectId: string,
    body: StartOAuthProfileFlowDto,
  ): Promise<OAuthFlowRecord> {
    const provider = await this.findProvider(
      normalizeOAuthProviderCode(body.providerCode),
    );
    assertOAuthProfileProviderBindable(provider);

    return this.startOAuthFlow({
      providerCode: body.providerCode,
      subjectType: 'user',
      subjectId,
      redirectUri: body.redirectUri,
    });
  }

  async unbindProfileOAuthAccount(
    subjectId: string,
    id: string,
    actor: string,
    body: RevokeOAuthTokenDto = {},
  ) {
    const existing = await this.getOAuthToken(id);
    assertOAuthTokenBelongsToSubject({ subjectId, token: existing });

    const token =
      existing.status === 'revoked'
        ? existing
        : toOAuthTokenRecord(
            await this.prisma.integrationOAuthToken.update({
              where: { id },
              data: {
                status: 'revoked',
                revokedAt: new Date(),
                revokedBy: actor,
                revokeReason: normalizeOAuthRevokeReason(
                  body.reason ?? 'Self-service OAuth account unbind.',
                ),
              },
            }),
          );
    const provider = await this.prisma.integrationProvider.findUnique({
      where: { code: token.providerCode },
      select: { code: true, name: true },
    });

    return toOAuthProfileAccountDto(token, provider ?? undefined);
  }

  getDesign(topic: 'pay' | 'websocket' | 'wechat'): IntegrationDesignRecord {
    return requireRecord(
      integrationDesigns.find((design) => design.topic === topic),
      'Integration design',
      topic,
    );
  }

  async getWebSocketRuntimeDiagnostics() {
    const live = this.websocketRuntime.getDiagnostics();
    const persistedEvents =
      await this.prisma.integrationWebSocketRuntimeEvent.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: 100,
      });
    const events = persistedEvents.map(toWebSocketRuntimeEventRecord);

    return {
      ...live,
      summary: {
        ...live.summary,
        recentEvents: events.length,
        lastEventAt: events[0]?.createdAt,
        generatedAt: new Date().toISOString(),
      },
      events,
    };
  }

  async publishWebSocketRuntimeEvent(body: PublishWebSocketRuntimeEventDto) {
    const event = this.websocketRuntime.publish(body);
    await this.prisma.integrationWebSocketRuntimeEvent.create({
      data: {
        id: event.id,
        room: event.room,
        type: event.type,
        payloadPreview: toInputJson(event.payloadPreview),
        traceId: event.traceId,
        deliveredCount: event.deliveredCount,
        status: event.status,
        createdAt: new Date(event.createdAt),
      },
    });

    return event;
  }

  openWebSocketRuntimeConnection(input: {
    subjectId: string;
    query?: WebSocketRuntimeStreamQueryDto;
    emit: WebSocketRuntimeSink;
  }) {
    return this.websocketRuntime.openConnection(input);
  }

  private async createOAuthCallbackAudit(input: {
    providerCode: string;
    flowId?: string;
    state: string;
    status: 'accepted' | 'rejected';
    reason?: string;
    callbackCodeHash?: string;
    callbackError?: string;
    providerAccountId?: string;
    tokenId?: string;
  }): Promise<OAuthCallbackAuditRecord> {
    const audit = await this.prisma.integrationOAuthCallbackAudit.create({
      data: {
        providerCode: input.providerCode,
        flowId: input.flowId,
        state: input.state,
        status: input.status,
        reason: input.reason,
        callbackCodeHash: input.callbackCodeHash,
        callbackError: input.callbackError,
        providerAccountId: input.providerAccountId,
        tokenId: input.tokenId,
      },
    });

    return toOAuthCallbackAuditRecord(audit);
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

function toOAuthFlowRecord(row: OAuthFlowRow): OAuthFlowRecord {
  return {
    id: row.id,
    providerCode: row.providerCode,
    state: row.state,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    scopes: normalizeScopes(row.scopes),
    redirectUri: row.redirectUri ?? undefined,
    authorizationUrl: row.authorizationUrl,
    status:
      row.status === 'completed' ||
      row.status === 'expired' ||
      row.status === 'failed'
        ? row.status
        : 'pending',
    expiresAt: row.expiresAt.toISOString(),
    callbackCodeHash: row.callbackCodeHash ?? undefined,
    callbackError: row.callbackError ?? undefined,
    tokenId: row.tokenId ?? undefined,
    completedAt: row.completedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function toOAuthCallbackAuditRecord(
  row: OAuthCallbackAuditRow,
): OAuthCallbackAuditRecord {
  return {
    id: row.id,
    providerCode: row.providerCode,
    flowId: row.flowId ?? undefined,
    state: row.state,
    status: row.status === 'accepted' ? 'accepted' : 'rejected',
    reason: row.reason ?? undefined,
    callbackCodeHash: row.callbackCodeHash ?? undefined,
    callbackError: row.callbackError ?? undefined,
    providerAccountId: row.providerAccountId ?? undefined,
    tokenId: row.tokenId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function toWebSocketRuntimeEventRecord(
  row: WebSocketRuntimeEventRow,
): WebSocketRuntimeEventRecord {
  return {
    id: row.id,
    room: row.room,
    type: row.type,
    payloadPreview: normalizeRecord(row.payloadPreview) ?? {},
    traceId: row.traceId ?? undefined,
    deliveredCount: row.deliveredCount,
    status: row.status === 'delivered' ? 'delivered' : 'no_subscribers',
    createdAt: row.createdAt.toISOString(),
  };
}

function hashOAuthCallbackCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
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
