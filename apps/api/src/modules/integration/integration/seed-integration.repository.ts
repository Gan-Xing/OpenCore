import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
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
  seedIntegrationOutbox,
  seedIntegrationOAuthTokens,
  seedIntegrationProviders,
  seedIntegrationTemplates,
  type IntegrationDesignRecord,
  type IntegrationOutboxRecord,
  type IntegrationProviderAuditLogRecord,
  type IntegrationProviderRecord,
  type IntegrationTemplateRecord,
  type OAuthCallbackAuditRecord,
  type OAuthCallbackContractRecord,
  type OAuthFlowRecord,
  type OAuthTokenRecord,
} from './integration.seed';
import {
  deliverOutboxMessage,
  evaluateProviderDeliveryHealth,
  type MailSmtpTransportFactory,
  type ProviderSecretResolver,
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
  isLegacySyntheticOAuthProfileAccount,
  matchesOAuthCallbackAuditQuery,
  matchesOAuthFlowQuery,
  matchesOptional,
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
  normalizeOptionalProviderCode,
  normalizeOptionalBoolean,
  toOAuthProfileAccountDto,
  toOAuthProfileProviderDto,
  normalizeProviderSecretRefStatus,
  normalizeProviderTestStatus,
  parseConfigSecretRef,
  resolveProviderSecretValue,
  normalizeProcessOutboxLimit,
  redactProviderConfig,
  renderTemplate,
  requireRecord,
  validateProviderSecretRef,
  type PageResult,
  type ProviderTestResult,
  type WebSocketRuntimeSink,
} from './integration.repository';

@Injectable()
export class SeedIntegrationRepository extends IntegrationRepository {
  private readonly websocketRuntime = new IntegrationWebSocketRuntimeStore();

  constructor(
    private readonly secretResolver?: ProviderSecretResolver,
    private readonly smtpTransportFactory?: MailSmtpTransportFactory,
  ) {
    super();
  }

  private providers: IntegrationProviderRecord[] =
    seedIntegrationProviders.map(cloneProvider);
  private providerAuditLogs: IntegrationProviderAuditLogRecord[] = [];
  private templates: IntegrationTemplateRecord[] = seedIntegrationTemplates.map(
    (template) => ({ ...template }),
  );
  private outbox: IntegrationOutboxRecord[] = seedIntegrationOutbox.map(
    (message) => ({ ...message }),
  );
  private oauthFlows: OAuthFlowRecord[] = [];
  private oauthCallbackAudits: OAuthCallbackAuditRecord[] = [];
  private oauthTokens: OAuthTokenRecord[] =
    seedIntegrationOAuthTokens.map(cloneOAuthToken);

  async getSummary() {
    return buildIntegrationSummary({
      providers: this.providers,
      outbox: this.outbox,
      oauthTokens: this.oauthTokens,
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
      secretRefStatus: 'unchecked',
      configVersion: 1,
      config: body.config,
      healthStatus: body.enabled ? 'unknown' : 'disabled',
    };
    this.providers = [provider, ...this.providers];
    this.addProviderAuditLog({
      providerCode: provider.code,
      action: 'created',
      afterConfigVersion: provider.configVersion,
      afterSecretRefStatus: provider.secretRefStatus,
      message: 'Integration provider created.',
      summary: {
        enabled: provider.enabled,
        type: provider.type,
      },
    });
    return redactProvider(provider);
  }

  async getProvider(code: string): Promise<IntegrationProviderRecord> {
    return redactProvider(this.findProvider(code));
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
    const provider = this.findProvider(code);
    const before = { ...provider };
    const health = await evaluateProviderDeliveryHealth(provider, {
      secretResolver: this.secretResolver,
      smtpTransportFactory: this.smtpTransportFactory,
    });
    provider.healthStatus = health.status;
    provider.lastCheckedAt = new Date().toISOString();
    this.addProviderAuditLog({
      providerCode: provider.code,
      action: 'health_checked',
      beforeConfigVersion: before.configVersion,
      afterConfigVersion: provider.configVersion,
      beforeSecretRefStatus: before.secretRefStatus,
      afterSecretRefStatus: provider.secretRefStatus,
      message:
        health.error ??
        `Integration provider health check completed: ${health.status}.`,
      summary: { healthStatus: health.status },
    });
    return redactProvider(provider);
  }

  async testProvider(
    code: string,
    body: TestIntegrationProviderDto = {},
  ): Promise<ProviderTestResult> {
    const provider = this.findProvider(code);
    const before = { ...provider };
    const [secret, adapter] = await Promise.all([
      validateProviderSecretRef(provider.secretRef, this.secretResolver),
      evaluateProviderDeliveryHealth(
        { ...provider, enabled: true },
        {
          secretResolver: this.secretResolver,
          smtpTransportFactory: this.smtpTransportFactory,
        },
      ),
    ]);
    const result = buildProviderTestResult({
      provider,
      secret,
      adapter,
    });
    Object.assign(provider, {
      secretRefStatus: result.secretRefStatus,
      lastTestStatus: result.status,
      lastTestMessage: result.message,
      lastTestedAt: result.testedAt,
    });
    this.addProviderAuditLog({
      providerCode: provider.code,
      action: 'tested',
      reason: normalizeOptionalText(body.reason),
      beforeConfigVersion: before.configVersion,
      afterConfigVersion: provider.configVersion,
      beforeSecretRefStatus: before.secretRefStatus,
      afterSecretRefStatus: provider.secretRefStatus,
      testStatus: result.status,
      message: result.message,
      summary: {
        adapterStatus: adapter.status,
        secretRefStatus: result.secretRefStatus,
      },
    });

    return {
      ...result,
      provider: redactProvider(provider),
    };
  }

  async getProviderDiagnostics(code: string) {
    const provider = this.findProvider(code);

    return buildProviderDiagnostics({
      provider,
      outbox: this.outbox,
    });
  }

  async getProviderHealthAudit() {
    return buildProviderHealthAudit({
      providers: this.providers,
      outbox: this.outbox,
    });
  }

  async listProviderAuditLogs(
    code: string,
    query: PageQueryDto = {},
  ): Promise<PageResult<IntegrationProviderAuditLogRecord>> {
    this.findProvider(code);
    return createPage(
      this.providerAuditLogs.filter((log) => log.providerCode === code),
      query,
    );
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
    const rendered = template
      ? renderTemplate(template, body.payload)
      : undefined;
    const subject = normalizeOutboxSubject(
      channel,
      rendered?.subject ?? body.subject,
    );
    const attachments = normalizeOutboxAttachments(channel, body.attachments);
    const message: IntegrationOutboxRecord = {
      id: `outbox_${this.outbox.length + 1}`,
      channel,
      providerCode: body.providerCode,
      templateCode: body.templateCode,
      recipient: body.recipient,
      subject,
      payload: body.payload,
      attachments,
      status: 'queued',
      retryCount: 0,
      preview: rendered?.body,
      createdAt: new Date().toISOString(),
    };
    this.outbox = [message, ...this.outbox];
    return { ...message };
  }

  async sendTestOutbox(channel: 'mail' | 'sms', body: TestOutboxMessageDto) {
    const queued = await this.enqueueOutbox(channel, body);
    const provider = this.findProvider(body.providerCode);
    const message = this.findOutboxMessage(channel, queued.id);
    const delivery = await deliverOutboxMessage({
      channel,
      provider,
      message,
      secretResolver: this.secretResolver,
      smtpTransportFactory: this.smtpTransportFactory,
    });
    const testedAt = new Date().toISOString();

    if (delivery.status === 'sent') {
      Object.assign(message, {
        status: 'sent' as const,
        error: undefined,
        sentAt: testedAt,
      });
    } else {
      Object.assign(message, {
        status: 'failed' as const,
        retryCount: message.retryCount + 1,
        error: delivery.error ?? 'Provider test delivery failed.',
        sentAt: undefined,
      });
    }

    return {
      channel,
      providerCode: body.providerCode,
      message: { ...message },
      status: delivery.status,
      error: delivery.error,
      testedAt,
    };
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

  async markOutboxSent(
    channel: 'mail' | 'sms',
    id: string,
  ): Promise<IntegrationOutboxRecord> {
    const message = this.findOutboxMessage(channel, id);
    if (message.status !== 'sent') {
      Object.assign(message, {
        status: 'sent' as const,
        error: undefined,
        sentAt: new Date().toISOString(),
      });
    }

    return { ...message };
  }

  async markOutboxFailed(
    channel: 'mail' | 'sms',
    id: string,
    body: FailOutboxMessageDto,
  ): Promise<IntegrationOutboxRecord> {
    const message = this.findOutboxMessage(channel, id);
    if (message.status === 'sent') {
      throw integrationBadRequest(
        'INTEGRATION_OUTBOX_ALREADY_SENT',
        'Sent outbox messages cannot be marked failed.',
      );
    }
    const error = normalizeOutboxFailureError(body.error);
    const retryCount =
      message.status === 'failed' ? message.retryCount : message.retryCount + 1;
    Object.assign(message, {
      status: 'failed' as const,
      retryCount,
      error,
      sentAt: undefined,
    });

    return { ...message };
  }

  async retryOutbox(
    channel: 'mail' | 'sms',
    id: string,
  ): Promise<IntegrationOutboxRecord> {
    const message = this.findOutboxMessage(channel, id);
    if (message.status !== 'failed') {
      throw integrationBadRequest(
        'INTEGRATION_OUTBOX_RETRY_STATUS_INVALID',
        'Only failed outbox messages can be retried.',
      );
    }
    Object.assign(message, {
      status: 'queued' as const,
      error: undefined,
      sentAt: undefined,
    });

    return { ...message };
  }

  async processOutbox(channel: 'mail' | 'sms', body: ProcessOutboxDto = {}) {
    const limit = normalizeProcessOutboxLimit(body.limit);
    const providerCode = normalizeOptionalProviderCode(body.providerCode);
    const queued = this.outbox
      .filter(
        (message) =>
          message.channel === channel &&
          message.status === 'queued' &&
          matchesOptional(message.providerCode, providerCode),
      )
      .slice(0, limit);

    if (queued.length === 0) {
      return {
        channel,
        providerCode,
        attemptedCount: 0,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        queuedCount: this.countQueuedOutbox(channel, providerCode),
      };
    }

    for (const code of new Set(queued.map((message) => message.providerCode))) {
      const provider = this.findProvider(code);
      assertProviderReadyForOutbox({
        code: provider.code,
        type: provider.type,
        enabled: provider.enabled,
        channel,
      });
    }

    const providers = new Map(
      [...new Set(queued.map((message) => message.providerCode))].map(
        (code) => [code, this.findProvider(code)] as const,
      ),
    );
    let sentCount = 0;
    let failedCount = 0;
    const sentAt = new Date().toISOString();
    for (const message of queued) {
      const provider = requireRecord(
        providers.get(message.providerCode),
        'Integration provider',
        message.providerCode,
      );
      const delivery = await deliverOutboxMessage({
        channel,
        provider,
        message,
        secretResolver: this.secretResolver,
        smtpTransportFactory: this.smtpTransportFactory,
      });
      if (delivery.status === 'sent') {
        Object.assign(message, {
          status: 'sent' as const,
          error: undefined,
          sentAt,
        });
        sentCount += 1;
      } else {
        Object.assign(message, {
          status: 'failed' as const,
          retryCount: message.retryCount + 1,
          error: delivery.error ?? 'Provider delivery failed.',
          sentAt: undefined,
        });
        failedCount += 1;
      }
    }

    return {
      channel,
      providerCode,
      attemptedCount: queued.length,
      sentCount,
      failedCount,
      skippedCount: 0,
      queuedCount: this.countQueuedOutbox(channel, providerCode),
    };
  }

  async runOutboxSchedule(body: ScheduleOutboxDto = {}) {
    const schedule = normalizeOutboxSchedule(body);
    const channels: IntegrationOutboxScheduleChannelResultDto[] = [];

    for (const channel of schedule.channels) {
      if (schedule.providerCode) {
        this.assertScheduleProviderReady(channel, schedule.providerCode);
      }
      const retriedCount = schedule.retryFailed
        ? this.retryEligibleFailedOutbox(channel, schedule)
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
    const provider = this.findProvider(callback.providerCode);
    assertProviderReadyForOutbox({
      code: provider.code,
      type: provider.type,
      enabled: provider.enabled,
      channel,
    });
    const message = this.findOutboxMessage(channel, callback.messageId);
    assertOutboxCallbackProviderMatch({
      expectedProviderCode: callback.providerCode,
      actualProviderCode: message.providerCode,
      messageId: message.id,
    });
    assertOutboxCallbackSignature(callback, provider);

    return callback.status === 'sent'
      ? this.markOutboxSent(channel, message.id)
      : this.markOutboxFailed(channel, message.id, {
          error: callback.error ?? '',
        });
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

  async listProfileOAuthProviders() {
    return this.providers
      .filter((provider) => provider.type === 'oauth' && provider.enabled)
      .map(toOAuthProfileProviderDto);
  }

  getOAuthCallbackContract(): OAuthCallbackContractRecord {
    return { ...oauthCallbackContract };
  }

  async startOAuthFlow(body: StartOAuthFlowDto): Promise<OAuthFlowRecord> {
    const provider = this.findProvider(
      normalizeOAuthProviderCode(body.providerCode),
    );
    const start = normalizeOAuthStartFlow(body, provider);
    const state = randomBytes(24).toString('base64url');
    const expiresAt = new Date(
      Date.now() + oauthCallbackContract.stateTtlSeconds * 1000,
    ).toISOString();
    const flow: OAuthFlowRecord = {
      id: `oauth_flow_${state}`,
      providerCode: start.providerCode,
      state,
      subjectType: start.subjectType,
      subjectId: start.subjectId,
      scopes: [...start.scopes],
      redirectUri: start.redirectUri,
      authorizationUrl: buildOAuthAuthorizationUrl({
        provider,
        state,
        start,
      }),
      status: 'pending',
      expiresAt,
      createdAt: new Date().toISOString(),
    };
    this.oauthFlows = [flow, ...this.oauthFlows];

    return normalizeOAuthFlowRecord(flow);
  }

  async listOAuthFlows(
    query: OAuthFlowQueryDto = {},
  ): Promise<PageResult<OAuthFlowRecord>> {
    return createPage(
      this.oauthFlows
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
    const provider = this.findProvider(callback.providerCode);
    if (provider.type !== 'oauth' || !provider.enabled) {
      const reason =
        provider.type !== 'oauth'
          ? `Provider ${provider.code} is not an OAuth provider.`
          : `OAuth provider ${provider.code} is disabled.`;
      const audit = this.addOAuthCallbackAudit({
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

    const flow = this.oauthFlows.find((item) => item.state === callback.state);
    if (!flow || flow.providerCode !== callback.providerCode) {
      const audit = this.addOAuthCallbackAudit({
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

    const normalizedFlow = normalizeOAuthFlowRecord(flow);
    if (normalizedFlow.status !== 'pending') {
      const audit = this.addOAuthCallbackAudit({
        providerCode: callback.providerCode,
        flowId: flow.id,
        state: callback.state,
        status: 'rejected',
        reason: `OAuth callback state is ${normalizedFlow.status}.`,
        tokenId: flow.tokenId,
      });
      return {
        providerCode: callback.providerCode,
        flowId: flow.id,
        subjectType: flow.subjectType,
        state: callback.state,
        status: 'rejected' as const,
        message: audit.reason ?? 'OAuth callback rejected.',
        audit,
      };
    }

    const completedAt = new Date().toISOString();
    if (callback.error) {
      Object.assign(flow, {
        status: 'failed' as const,
        callbackError: callback.error,
        completedAt,
      });
      const audit = this.addOAuthCallbackAudit({
        providerCode: callback.providerCode,
        flowId: flow.id,
        state: callback.state,
        status: 'rejected',
        reason: `OAuth provider returned error: ${callback.error}`,
        callbackError: callback.error,
      });
      return {
        providerCode: callback.providerCode,
        flowId: flow.id,
        subjectType: flow.subjectType,
        state: callback.state,
        status: 'rejected' as const,
        message: audit.reason ?? 'OAuth callback rejected.',
        audit,
        completedAt,
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
    const tokenId = createOAuthTokenId({
      providerCode: callback.providerCode,
      subjectId: flow.subjectId,
      providerAccountId,
    });
    const expiresAt =
      callback.expiresInSeconds === null
        ? undefined
        : new Date(Date.now() + callback.expiresInSeconds * 1000).toISOString();
    const token: OAuthTokenRecord = {
      id: tokenId,
      providerCode: callback.providerCode,
      subjectType: flow.subjectType,
      subjectId: flow.subjectId,
      providerAccountId,
      scopes:
        callback.scopes && callback.scopes.length > 0
          ? [...callback.scopes]
          : [...flow.scopes],
      accessTokenRef: tokenRefs.accessTokenRef,
      refreshTokenRef: tokenRefs.refreshTokenRef,
      status: 'active',
      expiresAt,
      lastRotatedAt: completedAt,
      createdAt: completedAt,
    };
    const existingIndex = this.oauthTokens.findIndex(
      (item) =>
        item.providerCode === token.providerCode &&
        item.subjectId === token.subjectId &&
        item.providerAccountId === token.providerAccountId,
    );
    let archivedToken: OAuthTokenRecord;
    if (existingIndex >= 0) {
      archivedToken = {
        ...this.oauthTokens[existingIndex],
        ...token,
        createdAt: this.oauthTokens[existingIndex].createdAt,
        revokedAt: undefined,
        revokedBy: undefined,
        revokeReason: undefined,
      };
      this.oauthTokens[existingIndex] = archivedToken;
    } else {
      archivedToken = token;
      this.oauthTokens = [archivedToken, ...this.oauthTokens];
    }
    Object.assign(flow, {
      status: 'completed' as const,
      callbackCodeHash,
      callbackError: undefined,
      tokenId: archivedToken.id,
      completedAt,
    });
    const audit = this.addOAuthCallbackAudit({
      providerCode: callback.providerCode,
      flowId: flow.id,
      subjectType: flow.subjectType,
      state: callback.state,
      status: 'accepted',
      reason: 'OAuth callback accepted and token reference archived.',
      callbackCodeHash,
      providerAccountId,
      tokenId: archivedToken.id,
    });

    return {
      providerCode: callback.providerCode,
      flowId: flow.id,
      subjectType: flow.subjectType,
      state: callback.state,
      status: 'accepted' as const,
      message: audit.reason ?? 'OAuth callback accepted.',
      audit,
      token: normalizeOAuthTokenRecord(archivedToken),
      completedAt,
    };
  }

  async listOAuthCallbackAudits(
    query: OAuthCallbackAuditQueryDto = {},
  ): Promise<PageResult<OAuthCallbackAuditRecord>> {
    return createPage(
      this.oauthCallbackAudits.filter((audit) =>
        matchesOAuthCallbackAuditQuery(audit, query),
      ),
      query,
    );
  }

  async getOAuthTokenSummary() {
    return buildOAuthTokenSummary(this.oauthTokens);
  }

  async listOAuthTokens(
    query: OAuthTokenQueryDto = {},
  ): Promise<PageResult<OAuthTokenRecord>> {
    return createPage(
      this.oauthTokens
        .map((token) => normalizeOAuthTokenRecord(token))
        .filter((token) => matchesOAuthTokenQuery(token, query)),
      query,
    );
  }

  async getOAuthToken(id: string): Promise<OAuthTokenRecord> {
    return normalizeOAuthTokenRecord(this.findOAuthToken(id));
  }

  async revokeOAuthToken(
    id: string,
    body: RevokeOAuthTokenDto = {},
  ): Promise<OAuthTokenRecord> {
    const token = this.findOAuthToken(id);

    if (token.revokedAt || token.status === 'revoked') {
      return normalizeOAuthTokenRecord(token);
    }

    Object.assign(token, {
      status: 'revoked' as const,
      revokedAt: new Date().toISOString(),
      revokedBy: 'admin',
      revokeReason: normalizeOAuthRevokeReason(body.reason),
    });

    return normalizeOAuthTokenRecord(token);
  }

  async listProfileOAuthAccounts(subjectId: string) {
    return this.oauthTokens
      .map((token) => normalizeOAuthTokenRecord(token))
      .filter(
        (token) =>
          token.subjectType === 'user' && token.subjectId === subjectId,
      )
      .filter((token) => !isLegacySyntheticOAuthProfileAccount(token))
      .map((token) =>
        toOAuthProfileAccountDto(
          token,
          this.providers.find(
            (provider) => provider.code === token.providerCode,
          ),
        ),
      );
  }

  async startProfileOAuthFlow(
    subjectId: string,
    body: StartOAuthProfileFlowDto,
  ): Promise<OAuthFlowRecord> {
    const provider = this.findProvider(
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
    const token = this.findOAuthToken(id);
    assertOAuthTokenBelongsToSubject({ subjectId, token });

    if (!token.revokedAt && token.status !== 'revoked') {
      Object.assign(token, {
        status: 'revoked' as const,
        revokedAt: new Date().toISOString(),
        revokedBy: actor,
        revokeReason: normalizeOAuthRevokeReason(
          body.reason ?? 'Self-service OAuth account unbind.',
        ),
      });
    }

    return toOAuthProfileAccountDto(
      token,
      this.providers.find((provider) => provider.code === token.providerCode),
    );
  }

  getDesign(topic: 'pay' | 'websocket' | 'wechat'): IntegrationDesignRecord {
    return requireRecord(
      integrationDesigns.find((design) => design.topic === topic),
      'Integration design',
      topic,
    );
  }

  async getWebSocketRuntimeDiagnostics() {
    return this.websocketRuntime.getDiagnostics();
  }

  async publishWebSocketRuntimeEvent(body: PublishWebSocketRuntimeEventDto) {
    return this.websocketRuntime.publish(body);
  }

  openWebSocketRuntimeConnection(input: {
    subjectId: string;
    query?: WebSocketRuntimeStreamQueryDto;
    emit: WebSocketRuntimeSink;
  }) {
    return this.websocketRuntime.openConnection(input);
  }

  private updateProviderConfig(
    code: string,
    body: UpdateIntegrationProviderDto,
    action: IntegrationProviderAuditAction,
  ): IntegrationProviderRecord {
    const provider = this.findProvider(code);
    const before = { ...provider };

    if (body.secretRef) {
      assertSecretRef(body.secretRef);
    }

    const changedFields = listProviderChangedFields(body);
    Object.assign(provider, {
      name: body.name ?? provider.name,
      enabled: body.enabled ?? provider.enabled,
      secretRef: body.secretRef ?? provider.secretRef,
      secretRefStatus: body.secretRef
        ? 'unchecked'
        : normalizeProviderSecretRefStatus(provider.secretRefStatus),
      config: body.config ?? provider.config,
      configVersion:
        changedFields.length > 0
          ? provider.configVersion + 1
          : provider.configVersion,
      healthStatus: body.enabled === false ? 'disabled' : provider.healthStatus,
      lastTestStatus:
        body.secretRef || body.config ? undefined : provider.lastTestStatus,
      lastTestMessage:
        body.secretRef || body.config ? undefined : provider.lastTestMessage,
      lastTestedAt:
        body.secretRef || body.config ? undefined : provider.lastTestedAt,
    });
    this.addProviderAuditLog({
      providerCode: provider.code,
      action,
      beforeConfigVersion: before.configVersion,
      afterConfigVersion: provider.configVersion,
      beforeSecretRefStatus: before.secretRefStatus,
      afterSecretRefStatus: provider.secretRefStatus,
      message: `Integration provider ${action.replace('_', ' ')}.`,
      summary: { changedFields },
    });

    return redactProvider(provider);
  }

  private addProviderAuditLog(input: {
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
  }): void {
    this.providerAuditLogs = [
      {
        id: `provider_audit_${this.providerAuditLogs.length + 1}`,
        providerCode: input.providerCode,
        action: input.action,
        actor: input.actor ?? 'admin',
        reason: input.reason,
        beforeConfigVersion: input.beforeConfigVersion,
        afterConfigVersion: input.afterConfigVersion,
        beforeSecretRefStatus: input.beforeSecretRefStatus
          ? normalizeProviderSecretRefStatus(input.beforeSecretRefStatus)
          : undefined,
        afterSecretRefStatus: input.afterSecretRefStatus
          ? normalizeProviderSecretRefStatus(input.afterSecretRefStatus)
          : undefined,
        testStatus: normalizeProviderTestStatus(input.testStatus),
        message: input.message,
        summary: input.summary,
        createdAt: new Date().toISOString(),
      },
      ...this.providerAuditLogs,
    ];
  }

  private addOAuthCallbackAudit(input: {
    providerCode: string;
    flowId?: string;
    state: string;
    status: 'accepted' | 'rejected';
    reason?: string;
    callbackCodeHash?: string;
    callbackError?: string;
    providerAccountId?: string;
    tokenId?: string;
  }): OAuthCallbackAuditRecord {
    const entry: OAuthCallbackAuditRecord = {
      id: `oauth_callback_audit_${this.oauthCallbackAudits.length + 1}`,
      providerCode: input.providerCode,
      flowId: input.flowId,
      state: input.state,
      status: input.status,
      reason: input.reason,
      callbackCodeHash: input.callbackCodeHash,
      callbackError: input.callbackError,
      providerAccountId: input.providerAccountId,
      tokenId: input.tokenId,
      createdAt: new Date().toISOString(),
    };
    this.oauthCallbackAudits = [entry, ...this.oauthCallbackAudits];
    return entry;
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

  private findOutboxMessage(
    channel: 'mail' | 'sms',
    id: string,
  ): IntegrationOutboxRecord {
    return requireRecord(
      this.outbox.find(
        (message) => message.channel === channel && message.id === id,
      ),
      'Integration outbox message',
      id,
    );
  }

  private findOAuthToken(id: string): OAuthTokenRecord {
    return requireRecord(
      this.oauthTokens.find((token) => token.id === id),
      'OAuth token',
      id,
    );
  }

  private countQueuedOutbox(
    channel: 'mail' | 'sms',
    providerCode?: string,
  ): number {
    return this.outbox.filter(
      (message) =>
        message.channel === channel &&
        message.status === 'queued' &&
        matchesOptional(message.providerCode, providerCode),
    ).length;
  }

  private assertScheduleProviderReady(
    channel: 'mail' | 'sms',
    providerCode: string,
  ): void {
    const provider = this.findProvider(providerCode);
    assertProviderReadyForOutbox({
      code: provider.code,
      type: provider.type,
      enabled: provider.enabled,
      channel,
    });
  }

  private retryEligibleFailedOutbox(
    channel: 'mail' | 'sms',
    schedule: ReturnType<typeof normalizeOutboxSchedule>,
  ): number {
    const eligible = this.outbox
      .filter(
        (message) =>
          message.channel === channel &&
          message.status === 'failed' &&
          message.retryCount < schedule.maxRetryCount &&
          matchesOptional(message.providerCode, schedule.providerCode),
      )
      .slice(0, schedule.limit);

    for (const code of new Set(
      eligible.map((message) => message.providerCode),
    )) {
      this.assertScheduleProviderReady(channel, code);
    }

    for (const message of eligible) {
      Object.assign(message, {
        status: 'queued' as const,
        error: undefined,
        sentAt: undefined,
      });
    }

    return eligible.length;
  }
}

export function createMapProviderSecretResolver(
  secrets: ReadonlyMap<string, string>,
): ProviderSecretResolver {
  return async (secretRef: string) => {
    const key = parseConfigSecretRef(secretRef);
    const value = secrets.get(key);
    if (value === undefined) {
      throw integrationBadRequest(
        'INTEGRATION_CONFIG_SECRET_NOT_FOUND',
        `System config secret not found: ${key}`,
        { key },
      );
    }

    return resolveProviderSecretValue(value);
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

function cloneProvider(
  provider: IntegrationProviderRecord,
): IntegrationProviderRecord {
  return {
    ...provider,
    config: { ...provider.config },
  };
}

function cloneOAuthToken(token: OAuthTokenRecord): OAuthTokenRecord {
  return {
    ...token,
    scopes: [...token.scopes],
  };
}

function hashOAuthCallbackCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function listProviderChangedFields(
  body: UpdateIntegrationProviderDto,
): string[] {
  return (['name', 'enabled', 'secretRef', 'config'] as const).filter(
    (field) => body[field] !== undefined,
  );
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const text = String(value).trim();
  return text ? text : undefined;
}
