import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createApiErrorBody } from '@opencore/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  CreateIntegrationProviderDto,
  CreateIntegrationTemplateDto,
  CreateOutboxMessageDto,
  FailOutboxMessageDto,
  IntegrationOutboxCallbackDto,
  IntegrationOutboxProcessResultDto,
  IntegrationOutboxScheduleResultDto,
  IntegrationOutboxAttachmentDto,
  IntegrationProviderAuditAction,
  IntegrationProviderHealthAuditDto,
  IntegrationOutboxQueryDto,
  IntegrationProviderDiagnosticsDto,
  IntegrationProviderQueryDto,
  IntegrationProviderSecretRefStatus,
  IntegrationProviderTestStatus,
  IntegrationProviderType,
  IntegrationSummaryDto,
  IntegrationTemplateQueryDto,
  OAuthProfileBindingIssue,
  OAuthCallbackAuditQueryDto,
  OAuthCallbackAuditStatus,
  OAuthFlowQueryDto,
  OAuthFlowStatus,
  OAuthProviderCallbackDto,
  OAuthProfileProviderDto,
  OAuthTokenInventorySummaryDto,
  OAuthTokenQueryDto,
  OAuthTokenStatus,
  OAuthProfileAccountDto,
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
  WebSocketRuntimeDiagnosticsDto,
  WebSocketRuntimeStreamQueryDto,
} from './integration.dto';
import type {
  IntegrationDesignRecord,
  IntegrationOutboxRecord,
  IntegrationProviderAuditLogRecord,
  IntegrationProviderRecord,
  IntegrationTemplateRecord,
  OAuthCallbackAuditRecord,
  OAuthCallbackContractRecord,
  OAuthFlowRecord,
  OAuthTokenRecord,
  WebSocketRuntimeConnectionRecord,
  WebSocketRuntimeEventRecord,
  WebSocketRuntimeSubscriptionRecord,
} from './integration.seed';

export type PageResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type NormalizedOutboxCallback = {
  channel: 'mail' | 'sms';
  providerCode: string;
  messageId: string;
  status: 'failed' | 'sent';
  error?: string;
  signature: string;
};

export type NormalizedOutboxSchedule = {
  channels: readonly ('mail' | 'sms')[];
  providerCode?: string;
  limit: number;
  retryFailed: boolean;
  maxRetryCount: number;
};

export type ProviderSecretResolver = (secretRef: string) => Promise<string>;

export type ProviderSecretRefValidation = {
  status: IntegrationProviderSecretRefStatus;
  message: string;
};

export type ProviderTestResult = {
  provider: IntegrationProviderRecord;
  status: IntegrationProviderTestStatus;
  secretRefStatus: IntegrationProviderSecretRefStatus;
  message: string;
  testedAt: string;
};

export type NormalizedOAuthStartFlow = {
  providerCode: string;
  subjectType: string;
  subjectId: string;
  scopes: readonly string[];
  redirectUri?: string;
};

export type NormalizedOAuthCallback = {
  providerCode: string;
  state: string;
  code?: string;
  error?: string;
  providerAccountId?: string;
  scopes?: readonly string[];
  expiresInSeconds: number | null;
};

export type WebSocketRuntimeConnectionHandle = {
  connection: WebSocketRuntimeConnectionRecord;
  subscription: WebSocketRuntimeSubscriptionRecord;
  close: (reason?: string) => void;
  heartbeat: () => void;
};

export type WebSocketRuntimeSink = (event: WebSocketRuntimeEventRecord) => void;

export abstract class IntegrationRepository {
  abstract getSummary(): Promise<IntegrationSummaryDto>;

  abstract listProviders(
    query?: IntegrationProviderQueryDto,
  ): Promise<PageResult<IntegrationProviderRecord>>;
  abstract getProvider(code: string): Promise<IntegrationProviderRecord>;
  abstract getProviderForOAuthExchange(
    code: string,
  ): Promise<IntegrationProviderRecord>;
  abstract createProvider(
    body: CreateIntegrationProviderDto,
  ): Promise<IntegrationProviderRecord>;
  abstract updateProvider(
    code: string,
    body: UpdateIntegrationProviderDto,
  ): Promise<IntegrationProviderRecord>;
  abstract enableProvider(code: string): Promise<IntegrationProviderRecord>;
  abstract disableProvider(code: string): Promise<IntegrationProviderRecord>;
  abstract checkProviderHealth(
    code: string,
  ): Promise<IntegrationProviderRecord>;
  abstract testProvider(
    code: string,
    body?: TestIntegrationProviderDto,
  ): Promise<ProviderTestResult>;
  abstract getProviderDiagnostics(
    code: string,
  ): Promise<IntegrationProviderDiagnosticsDto>;
  abstract getProviderHealthAudit(): Promise<IntegrationProviderHealthAuditDto>;
  abstract listProviderAuditLogs(
    code: string,
    query?: PageQueryDto,
  ): Promise<PageResult<IntegrationProviderAuditLogRecord>>;

  abstract listTemplates(
    channel: 'mail' | 'sms',
    query?: IntegrationTemplateQueryDto,
  ): Promise<PageResult<IntegrationTemplateRecord>>;
  abstract getTemplate(
    channel: 'mail' | 'sms',
    code: string,
  ): Promise<IntegrationTemplateRecord>;
  abstract createTemplate(
    channel: 'mail' | 'sms',
    body: CreateIntegrationTemplateDto,
  ): Promise<IntegrationTemplateRecord>;
  abstract previewTemplate(
    channel: 'mail' | 'sms',
    body: PreviewTemplateDto,
  ): Promise<{
    channel: 'mail' | 'sms';
    templateCode: string;
    subject?: string;
    body: string;
  }>;
  abstract enqueueOutbox(
    channel: 'mail' | 'sms',
    body: CreateOutboxMessageDto,
  ): Promise<IntegrationOutboxRecord>;
  abstract sendTestOutbox(
    channel: 'mail' | 'sms',
    body: TestOutboxMessageDto,
  ): Promise<{
    channel: 'mail' | 'sms';
    providerCode: string;
    message: IntegrationOutboxRecord;
    status: 'failed' | 'sent';
    error?: string;
    testedAt: string;
  }>;
  abstract listOutbox(
    channel: 'mail' | 'sms',
    query?: IntegrationOutboxQueryDto,
  ): Promise<PageResult<IntegrationOutboxRecord>>;
  abstract getOutboxMessage(
    channel: 'mail' | 'sms',
    id: string,
  ): Promise<IntegrationOutboxRecord>;
  abstract markOutboxSent(
    channel: 'mail' | 'sms',
    id: string,
  ): Promise<IntegrationOutboxRecord>;
  abstract markOutboxFailed(
    channel: 'mail' | 'sms',
    id: string,
    body: FailOutboxMessageDto,
  ): Promise<IntegrationOutboxRecord>;
  abstract retryOutbox(
    channel: 'mail' | 'sms',
    id: string,
  ): Promise<IntegrationOutboxRecord>;
  abstract processOutbox(
    channel: 'mail' | 'sms',
    body?: ProcessOutboxDto,
  ): Promise<IntegrationOutboxProcessResultDto>;
  abstract runOutboxSchedule(
    body?: ScheduleOutboxDto,
  ): Promise<IntegrationOutboxScheduleResultDto>;
  abstract callbackOutbox(
    channel: 'mail' | 'sms',
    body: IntegrationOutboxCallbackDto,
  ): Promise<IntegrationOutboxRecord>;

  abstract listOAuthProviders(
    query?: IntegrationProviderQueryDto,
  ): Promise<PageResult<IntegrationProviderRecord>>;
  abstract getOAuthCallbackContract(): OAuthCallbackContractRecord;
  abstract startOAuthFlow(body: StartOAuthFlowDto): Promise<OAuthFlowRecord>;
  abstract listOAuthFlows(
    query?: OAuthFlowQueryDto,
  ): Promise<PageResult<OAuthFlowRecord>>;
  abstract callbackOAuthProvider(
    providerCode: string,
    body: OAuthProviderCallbackDto,
  ): Promise<{
    providerCode: string;
    flowId?: string;
    subjectType?: string;
    state: string;
    status: OAuthCallbackAuditStatus;
    message: string;
    audit: OAuthCallbackAuditRecord;
    token?: OAuthTokenRecord;
    completedAt?: string;
  }>;
  abstract listOAuthCallbackAudits(
    query?: OAuthCallbackAuditQueryDto,
  ): Promise<PageResult<OAuthCallbackAuditRecord>>;
  abstract getOAuthTokenSummary(): Promise<OAuthTokenInventorySummaryDto>;
  abstract listOAuthTokens(
    query?: OAuthTokenQueryDto,
  ): Promise<PageResult<OAuthTokenRecord>>;
  abstract getOAuthToken(id: string): Promise<OAuthTokenRecord>;
  abstract revokeOAuthToken(
    id: string,
    body?: RevokeOAuthTokenDto,
  ): Promise<OAuthTokenRecord>;
  abstract listProfileOAuthProviders(): Promise<
    readonly OAuthProfileProviderDto[]
  >;
  abstract listProfileOAuthAccounts(
    subjectId: string,
  ): Promise<readonly OAuthProfileAccountDto[]>;
  abstract startProfileOAuthFlow(
    subjectId: string,
    body: StartOAuthProfileFlowDto,
  ): Promise<OAuthFlowRecord>;
  abstract unbindProfileOAuthAccount(
    subjectId: string,
    id: string,
    actor: string,
    body?: RevokeOAuthTokenDto,
  ): Promise<OAuthProfileAccountDto>;
  abstract getDesign(
    topic: 'pay' | 'websocket' | 'wechat',
  ): IntegrationDesignRecord;
  abstract getWebSocketRuntimeDiagnostics(): Promise<WebSocketRuntimeDiagnosticsDto>;
  abstract publishWebSocketRuntimeEvent(
    body: PublishWebSocketRuntimeEventDto,
  ): Promise<WebSocketRuntimeEventRecord>;
  abstract openWebSocketRuntimeConnection(input: {
    subjectId: string;
    query?: WebSocketRuntimeStreamQueryDto;
    emit: WebSocketRuntimeSink;
  }): WebSocketRuntimeConnectionHandle;
}

export function integrationBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

export function integrationNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, message, details }));
}

export function buildIntegrationSummary(input: {
  providers: readonly IntegrationProviderRecord[];
  outbox: readonly IntegrationOutboxRecord[];
  oauthTokens: readonly OAuthTokenRecord[];
  designs: readonly IntegrationDesignRecord[];
}): IntegrationSummaryDto {
  const mailOutbox = input.outbox.filter(
    (message) => message.channel === 'mail',
  );
  const smsOutbox = input.outbox.filter((message) => message.channel === 'sms');

  return {
    providers: {
      total: input.providers.length,
      enabled: input.providers.filter((provider) => provider.enabled).length,
      disabled: input.providers.filter((provider) => !provider.enabled).length,
      unknown: countByStatus(input.providers, 'unknown', 'healthStatus'),
      healthy: countByStatus(input.providers, 'healthy', 'healthStatus'),
      degraded: countByStatus(input.providers, 'degraded', 'healthStatus'),
    },
    mailOutbox: buildOutboxSummary(mailOutbox),
    smsOutbox: buildOutboxSummary(smsOutbox),
    oauthProviders: input.providers.filter(
      (provider) => provider.type === 'oauth',
    ).length,
    oauthTokens: buildOAuthTokenSummary(input.oauthTokens),
    designs: {
      designOnlyTopics: input.designs.filter(
        (design) => design.status === 'design-only',
      ).length,
      topics: input.designs.map((design) => design.topic),
    },
  };
}

export function buildOAuthTokenSummary(
  rows: readonly OAuthTokenRecord[],
  generatedAt = new Date().toISOString(),
): OAuthTokenInventorySummaryDto {
  const normalizedRows = rows.map((token) => normalizeOAuthTokenRecord(token));
  return {
    total: normalizedRows.length,
    active: countByStatus(normalizedRows, 'active', 'status'),
    expired: countByStatus(normalizedRows, 'expired', 'status'),
    revoked: countByStatus(normalizedRows, 'revoked', 'status'),
    expiringSoon: normalizedRows.filter((token) =>
      isOAuthTokenExpiringSoon(token, generatedAt),
    ).length,
    providers: new Set(normalizedRows.map((token) => token.providerCode)).size,
    generatedAt,
  };
}

export function buildProviderDiagnostics(input: {
  provider: IntegrationProviderRecord;
  outbox: readonly IntegrationOutboxRecord[];
  generatedAt?: string;
}): IntegrationProviderDiagnosticsDto {
  const channel =
    input.provider.type === 'mail' || input.provider.type === 'sms'
      ? input.provider.type
      : undefined;
  const providerOutbox = input.outbox.filter(
    (message) =>
      message.providerCode === input.provider.code &&
      (channel === undefined || message.channel === channel),
  );
  const failedRows = providerOutbox.filter(
    (message) => message.status === 'failed',
  );
  const lastFailure = [...failedRows].sort(
    (left, right) =>
      Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
      right.id.localeCompare(left.id),
  )[0];
  const checks: Array<IntegrationProviderDiagnosticsDto['checks'][number]> = [];
  const actions: string[] = [];

  const addCheck = (
    code: string,
    status: IntegrationProviderDiagnosticsDto['checks'][number]['status'],
    message: string,
  ) => {
    checks.push({ code, status, message });
  };

  if (!channel) {
    addCheck(
      'provider.delivery-channel',
      'warn',
      `Provider type ${input.provider.type} has no delivery outbox diagnostics.`,
    );
    actions.push(
      'Use provider diagnostics only for mail and sms delivery providers.',
    );
  } else if (input.provider.type === channel) {
    addCheck(
      'provider.delivery-channel',
      'pass',
      `Provider type matches ${channel} delivery outbox.`,
    );
  }

  if (!input.provider.enabled) {
    addCheck('provider.enabled', 'fail', 'Provider is disabled.');
    actions.push('Enable the provider before processing outbox messages.');
  } else {
    addCheck('provider.enabled', 'pass', 'Provider is enabled.');
  }

  if (input.provider.healthStatus === 'healthy') {
    addCheck('provider.health', 'pass', 'Provider health check is healthy.');
  } else if (input.provider.healthStatus === 'degraded') {
    addCheck('provider.health', 'fail', 'Provider health check is degraded.');
    actions.push('Run health-check and inspect provider configuration.');
  } else if (input.provider.healthStatus === 'disabled') {
    addCheck('provider.health', 'fail', 'Provider health status is disabled.');
    actions.push('Run provider health-check after enabling the provider.');
  } else {
    addCheck(
      'provider.health',
      'warn',
      'Provider health has not been checked.',
    );
    actions.push('Run provider health-check before scheduled processing.');
  }

  if (input.provider.lastCheckedAt) {
    addCheck(
      'provider.last-check',
      'pass',
      `Last checked at ${input.provider.lastCheckedAt}.`,
    );
  } else {
    addCheck(
      'provider.last-check',
      'warn',
      'Provider has no health-check timestamp.',
    );
  }

  if (input.provider.secretRef.startsWith(CONFIG_SECRET_REF_PREFIX)) {
    addCheck(
      'provider.secret-ref',
      'pass',
      'Provider secretRef resolves through the config vault.',
    );
  } else {
    addCheck(
      'provider.secret-ref',
      'warn',
      'Provider secretRef is not backed by the config vault.',
    );
    actions.push('Move runtime provider credentials to secret://config/<key>.');
  }

  const adapter =
    typeof input.provider.config.adapter === 'string'
      ? input.provider.config.adapter
      : undefined;
  const supportedAdapters =
    channel === 'mail'
      ? ['sandbox', 'smtp']
      : channel === 'sms'
        ? ['sandbox', 'http']
        : [];
  if (!channel) {
    addCheck(
      'provider.adapter',
      'warn',
      'No delivery adapter check is available.',
    );
  } else if (adapter && supportedAdapters.includes(adapter)) {
    addCheck(
      'provider.adapter',
      'pass',
      `Provider uses supported ${channel} adapter ${adapter}.`,
    );
  } else {
    addCheck(
      'provider.adapter',
      'fail',
      `Provider adapter must be one of ${supportedAdapters.join(', ')}.`,
    );
    actions.push('Fix provider adapter configuration before sending.');
  }

  if (channel === 'sms' && adapter === 'http') {
    const secretInjections = listProviderSecretInjections(
      input.provider.config.secretInjections,
    );
    if (secretInjections.length === 0) {
      addCheck(
        'provider.secret-injections',
        'warn',
        'SMS HTTP provider has no config-vault secret injections.',
      );
      actions.push(
        'Configure SMS HTTP secretInjections for auth headers, query or body fields.',
      );
    } else if (
      secretInjections.some(
        (injection) =>
          !injection.secretRef.startsWith(CONFIG_SECRET_REF_PREFIX),
      )
    ) {
      addCheck(
        'provider.secret-injections',
        'fail',
        'SMS HTTP provider secretInjections must use secret://config/<key>.',
      );
      actions.push('Move SMS HTTP injected secrets to secret://config/<key>.');
    } else {
      addCheck(
        'provider.secret-injections',
        'pass',
        `SMS HTTP provider has ${secretInjections.length} config-vault secret injection(s).`,
      );
    }
  }

  if (failedRows.length > 0) {
    addCheck(
      'outbox.failed',
      'fail',
      `${failedRows.length} failed outbox message(s) require attention.`,
    );
    actions.push('Inspect and retry failed outbox messages.');
  } else {
    addCheck('outbox.failed', 'pass', 'No failed outbox messages.');
  }

  const queuedCount = providerOutbox.filter(
    (message) => message.status === 'queued',
  ).length;
  if (queuedCount > 0) {
    addCheck(
      'outbox.queued',
      'warn',
      `${queuedCount} queued outbox message(s) are pending processing.`,
    );
    actions.push('Run outbox process or the retry schedule for this provider.');
  } else {
    addCheck('outbox.queued', 'pass', 'No queued outbox backlog.');
  }

  if (actions.length === 0) {
    actions.push('No immediate operator action required.');
  }

  return {
    provider: {
      ...input.provider,
      config: redactProviderConfig(input.provider.config),
    },
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
      queued: queuedCount,
      sent: providerOutbox.filter((message) => message.status === 'sent')
        .length,
      failed: failedRows.length,
      retryableFailed: failedRows.filter((message) => message.retryCount < 3)
        .length,
      lastFailure: lastFailure
        ? {
            id: lastFailure.id,
            error: lastFailure.error,
            retryCount: lastFailure.retryCount,
            createdAt: lastFailure.createdAt,
          }
        : undefined,
    },
    checks,
    actions: [...new Set(actions)],
    generatedAt: input.generatedAt ?? new Date().toISOString(),
  };
}

export function buildProviderHealthAudit(input: {
  providers: readonly IntegrationProviderRecord[];
  outbox: readonly IntegrationOutboxRecord[];
  generatedAt?: string;
}): IntegrationProviderHealthAuditDto {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const providers = input.providers
    .map((provider) =>
      buildProviderDiagnostics({
        provider,
        outbox: input.outbox,
        generatedAt,
      }),
    )
    .sort(
      (left, right) =>
        readinessRank(left.readiness) - readinessRank(right.readiness) ||
        left.provider.type.localeCompare(right.provider.type) ||
        left.provider.code.localeCompare(right.provider.code),
    );
  const configVaultBacked = providers.filter((item) =>
    item.provider.secretRef.startsWith(CONFIG_SECRET_REF_PREFIX),
  ).length;

  return {
    generatedAt,
    totals: {
      total: providers.length,
      ready: countByReadiness(providers, 'ready'),
      attention: countByReadiness(providers, 'attention'),
      blocked: countByReadiness(providers, 'blocked'),
      unsupported: countByReadiness(providers, 'unsupported'),
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
        providers
          .flatMap((item) => item.actions)
          .filter(
            (action) => action !== 'No immediate operator action required.',
          ),
      ),
    ],
  };
}

export async function validateProviderSecretRef(
  secretRef: string,
  resolver?: ProviderSecretResolver,
): Promise<ProviderSecretRefValidation> {
  try {
    assertSecretRef(secretRef);
  } catch {
    return {
      status: 'invalid',
      message: 'Provider secretRef must start with secret://.',
    };
  }

  if (!secretRef.startsWith(CONFIG_SECRET_REF_PREFIX)) {
    return {
      status: 'unsupported',
      message: 'Provider secretRef is not backed by the config vault.',
    };
  }

  if (!resolver) {
    return {
      status: 'unchecked',
      message: 'Provider secretRef could not be resolved in this runtime.',
    };
  }

  try {
    const secret = await resolver(secretRef);
    if (!secret.trim()) {
      return {
        status: 'missing',
        message: 'Provider secretRef resolves to an empty secret.',
      };
    }

    return {
      status: 'valid',
      message: 'Provider secretRef resolves through the config vault.',
    };
  } catch {
    return {
      status: 'missing',
      message: 'Provider secretRef does not resolve to an active secret.',
    };
  }
}

export function buildProviderTestResult(input: {
  provider: IntegrationProviderRecord;
  secret: ProviderSecretRefValidation;
  adapter: { status: 'degraded' | 'disabled' | 'healthy'; error?: string };
  testedAt?: string;
}): ProviderTestResult {
  const adapterMessage =
    input.adapter.status === 'healthy'
      ? 'Provider adapter configuration passed.'
      : input.adapter.error
        ? `Provider adapter configuration failed: ${input.adapter.error}`
        : `Provider adapter configuration status is ${input.adapter.status}.`;
  const status =
    input.secret.status === 'invalid' ||
    input.secret.status === 'missing' ||
    input.adapter.status === 'degraded'
      ? 'failed'
      : input.secret.status === 'valid' && input.adapter.status === 'healthy'
        ? 'passed'
        : 'warning';
  const testedAt = input.testedAt ?? new Date().toISOString();

  return {
    provider: input.provider,
    status,
    secretRefStatus: input.secret.status,
    message: `${input.secret.message} ${adapterMessage}`,
    testedAt,
  };
}

export function normalizeProviderAuditAction(
  value: string,
): IntegrationProviderAuditAction {
  if (
    [
      'created',
      'disabled',
      'enabled',
      'health_checked',
      'tested',
      'updated',
    ].includes(value)
  ) {
    return value as IntegrationProviderAuditAction;
  }

  return 'updated';
}

export function normalizeProviderSecretRefStatus(
  value: string | null | undefined,
): IntegrationProviderSecretRefStatus {
  if (
    value &&
    ['invalid', 'missing', 'unchecked', 'unsupported', 'valid'].includes(value)
  ) {
    return value as IntegrationProviderSecretRefStatus;
  }

  return 'unchecked';
}

export function normalizeProviderTestStatus(
  value: string | null | undefined,
): IntegrationProviderTestStatus | undefined {
  if (value && ['failed', 'not_run', 'passed', 'warning'].includes(value)) {
    return value as IntegrationProviderTestStatus;
  }

  return undefined;
}

const SECRET_KEY_PATTERN =
  /(authorization|clientSecret|password|secret|token)/i;
const CONFIG_SECRET_REF_PREFIX = 'secret://config/';

function readinessRank(
  readiness: IntegrationProviderDiagnosticsDto['readiness'],
): number {
  return (
    {
      blocked: 0,
      attention: 1,
      unsupported: 2,
      ready: 3,
    } satisfies Record<IntegrationProviderDiagnosticsDto['readiness'], number>
  )[readiness];
}

function countByReadiness(
  providers: readonly IntegrationProviderDiagnosticsDto[],
  readiness: IntegrationProviderDiagnosticsDto['readiness'],
): number {
  return providers.filter((provider) => provider.readiness === readiness)
    .length;
}

export function createPage<T>(
  rows: readonly T[],
  query: { page?: number | string; pageSize?: number | string } = {},
): PageResult<T> {
  const page = normalizePositiveInteger(query.page, 1);
  const pageSize = Math.min(normalizePositiveInteger(query.pageSize, 10), 100);
  const total = rows.length;
  const totalPages = Math.ceil(total / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;

  return {
    items: rows.slice(skip, skip + pageSize).map(clone),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}

export function normalizeOptionalBoolean(
  value: boolean | string | undefined,
): boolean | undefined {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

export function matchesOptional<T>(
  value: T | undefined,
  expected: T | undefined,
): boolean {
  return expected === undefined || value === expected;
}

export function redactProviderConfig(
  config: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => [
      key,
      SECRET_KEY_PATTERN.test(key)
        ? '[REDACTED]'
        : value && typeof value === 'object' && !Array.isArray(value)
          ? redactProviderConfig(value as Record<string, unknown>)
          : value,
    ]),
  );
}

function listProviderSecretInjections(
  value: unknown,
): Array<{ secretRef: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) =>
      item && typeof item === 'object' && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : undefined,
    )
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => item.secretRef)
    .filter((secretRef): secretRef is string => typeof secretRef === 'string')
    .map((secretRef) => ({ secretRef }));
}

export function assertSecretRef(secretRef: string): void {
  if (!secretRef.startsWith('secret://')) {
    throw integrationBadRequest(
      'INTEGRATION_SECRET_REF_INVALID',
      'Integration credentials must be stored as secret:// references.',
      { secretRef },
    );
  }
}

export function parseConfigSecretRef(secretRef: string): string {
  assertSecretRef(secretRef);
  if (!secretRef.startsWith(CONFIG_SECRET_REF_PREFIX)) {
    throw integrationBadRequest(
      'INTEGRATION_SECRET_REF_CONFIG_INVALID',
      'Integration provider secretRef must use secret://config/<key> for runtime secret resolution.',
      { secretRef },
    );
  }

  const key = decodeURIComponent(
    secretRef.slice(CONFIG_SECRET_REF_PREFIX.length),
  ).trim();
  if (!key) {
    throw integrationBadRequest(
      'INTEGRATION_SECRET_REF_CONFIG_KEY_REQUIRED',
      'Integration provider config secret key is required.',
      { secretRef },
    );
  }

  return key;
}

export function resolveProviderSecretValue(value: string): string {
  const normalized = value.trim();
  const envMatch = /^env:([A-Z_][A-Z0-9_]*)$/.exec(normalized);
  if (!envMatch) {
    return value;
  }

  const envName = envMatch[1];
  const envValue = process.env[envName];
  if (!envValue?.trim()) {
    throw integrationBadRequest(
      'INTEGRATION_CONFIG_SECRET_ENV_MISSING',
      'Integration provider environment secret is not configured.',
      { envName },
    );
  }

  return envValue;
}

export function assertProviderReadyForOutbox(input: {
  code: string;
  type: IntegrationProviderType;
  enabled: boolean;
  channel: 'mail' | 'sms';
}): void {
  if (input.type !== input.channel) {
    throw integrationBadRequest(
      'INTEGRATION_PROVIDER_TYPE_MISMATCH',
      `Provider ${input.code} is not a ${input.channel} provider.`,
      { channel: input.channel, code: input.code, type: input.type },
    );
  }

  if (!input.enabled) {
    throw integrationBadRequest(
      'INTEGRATION_PROVIDER_DISABLED',
      `Provider ${input.code} is disabled and cannot enqueue outbox messages.`,
      { channel: input.channel, code: input.code },
    );
  }
}

export function assertTemplateEnabled(input: {
  code: string;
  enabled: boolean;
}): void {
  if (!input.enabled) {
    throw integrationBadRequest(
      'INTEGRATION_TEMPLATE_DISABLED',
      `Integration template is disabled: ${input.code}`,
      { code: input.code },
    );
  }
}

export function normalizeProviderType(value: string): IntegrationProviderType {
  if (['mail', 'oauth', 'pay', 'sms', 'websocket', 'wechat'].includes(value)) {
    return value as IntegrationProviderType;
  }

  return 'mail';
}

export function normalizeOAuthTokenStatus(value: string): OAuthTokenStatus {
  return value === 'expired' || value === 'revoked' ? value : 'active';
}

export function normalizeOAuthTokenRecord(
  token: OAuthTokenRecord,
  now = new Date(),
): OAuthTokenRecord {
  const status =
    token.revokedAt || token.status === 'revoked'
      ? 'revoked'
      : token.expiresAt && Date.parse(token.expiresAt) <= now.getTime()
        ? 'expired'
        : normalizeOAuthTokenStatus(token.status);

  return {
    ...token,
    scopes: normalizeOAuthTokenScopes(token.scopes),
    status,
  };
}

export function normalizeOAuthFlowStatus(
  flow: Pick<OAuthFlowRecord, 'expiresAt' | 'status'>,
  now = new Date(),
): OAuthFlowStatus {
  if (flow.status === 'completed' || flow.status === 'failed') {
    return flow.status;
  }

  if (Date.parse(flow.expiresAt) <= now.getTime()) {
    return 'expired';
  }

  return 'pending';
}

export function normalizeOAuthFlowRecord(
  flow: OAuthFlowRecord,
  now = new Date(),
): OAuthFlowRecord {
  return {
    ...flow,
    scopes: normalizeOAuthTokenScopes(flow.scopes),
    status: normalizeOAuthFlowStatus(flow, now),
  };
}

export function matchesOAuthTokenQuery(
  token: OAuthTokenRecord,
  query: OAuthTokenQueryDto = {},
): boolean {
  const normalized = normalizeOAuthTokenRecord(token);
  return (
    matchesOptional(
      normalized.providerCode,
      normalizeOptionalText(query.providerCode),
    ) &&
    matchesOptional(
      normalized.subjectId,
      normalizeOptionalText(query.subjectId),
    ) &&
    matchesOptional(normalized.status, query.status)
  );
}

export function matchesOAuthFlowQuery(
  flow: OAuthFlowRecord,
  query: OAuthFlowQueryDto = {},
): boolean {
  const normalized = normalizeOAuthFlowRecord(flow);
  return (
    matchesOptional(
      normalized.providerCode,
      normalizeOptionalText(query.providerCode),
    ) &&
    matchesOptional(
      normalized.subjectId,
      normalizeOptionalText(query.subjectId),
    ) &&
    matchesOptional(normalized.status, query.status)
  );
}

export function matchesOAuthCallbackAuditQuery(
  audit: OAuthCallbackAuditRecord,
  query: OAuthCallbackAuditQueryDto = {},
): boolean {
  return (
    matchesOptional(
      audit.providerCode,
      normalizeOptionalText(query.providerCode),
    ) && matchesOptional(audit.status, query.status)
  );
}

export function normalizeOAuthStartFlow(
  body: StartOAuthFlowDto,
  provider: IntegrationProviderRecord,
): NormalizedOAuthStartFlow {
  const providerCode = normalizeOAuthProviderCode(body.providerCode);
  if (provider.code !== providerCode) {
    throw integrationBadRequest(
      'INTEGRATION_OAUTH_PROVIDER_MISMATCH',
      `OAuth provider mismatch: expected ${provider.code}.`,
      { actualProviderCode: providerCode, expectedProviderCode: provider.code },
    );
  }
  assertOAuthProviderReady(provider);

  return {
    providerCode,
    subjectType: normalizeOptionalText(body.subjectType) ?? 'system-user',
    subjectId: normalizeRequiredString(
      body.subjectId,
      'OAuth flow subjectId is required.',
    ),
    scopes: normalizeOAuthRequestedScopes(body.scopes, provider.config.scopes),
    redirectUri: normalizeOptionalText(body.redirectUri),
  };
}

export function normalizeOAuthCallback(
  providerCode: string,
  body: OAuthProviderCallbackDto,
): NormalizedOAuthCallback {
  const error = normalizeOptionalText(body.error);
  const code = normalizeOptionalText(body.code);
  if (!error && !code) {
    throw integrationBadRequest(
      'INTEGRATION_OAUTH_CALLBACK_CODE_REQUIRED',
      'OAuth callback code is required.',
      { providerCode },
    );
  }

  return {
    providerCode: normalizeOAuthProviderCode(providerCode),
    state: normalizeRequiredString(
      body.state,
      'OAuth callback state is required.',
    ),
    code: error ? undefined : code,
    error,
    providerAccountId: normalizeOptionalText(body.providerAccountId),
    scopes: normalizeOAuthCallbackScopes(body.scopes),
    expiresInSeconds: normalizeOAuthExpiresInSeconds(body.expiresInSeconds),
  };
}

export function normalizeOAuthProviderCode(value: unknown): string {
  const code = normalizeRequiredString(
    value,
    'OAuth providerCode is required.',
  );
  return code.startsWith('oauth.') ? code : `oauth.${code}`;
}

export function assertOAuthProviderReady(
  provider: IntegrationProviderRecord,
): void {
  if (provider.type !== 'oauth') {
    throw integrationBadRequest(
      'INTEGRATION_OAUTH_PROVIDER_TYPE_INVALID',
      `Provider ${provider.code} is not an OAuth provider.`,
      { code: provider.code, type: provider.type },
    );
  }

  if (!provider.enabled) {
    throw integrationBadRequest(
      'INTEGRATION_OAUTH_PROVIDER_DISABLED',
      `OAuth provider ${provider.code} is disabled.`,
      { code: provider.code },
    );
  }
}

export function buildOAuthAuthorizationUrl(input: {
  provider: IntegrationProviderRecord;
  state: string;
  start: NormalizedOAuthStartFlow;
}): string {
  const authorizationUrl = normalizeRequiredString(
    input.provider.config.authorizationUrl,
    `OAuth provider ${input.provider.code} authorizationUrl is required.`,
  );
  const clientId = normalizeRequiredString(
    input.provider.config.clientId,
    `OAuth provider ${input.provider.code} clientId is required.`,
  );
  const redirectUri =
    input.start.redirectUri ??
    normalizeRequiredString(
      input.provider.config.callbackPath,
      `OAuth provider ${input.provider.code} callbackPath is required.`,
    );

  let url: URL;
  try {
    url = new URL(authorizationUrl);
  } catch {
    throw integrationBadRequest(
      'INTEGRATION_OAUTH_AUTHORIZATION_URL_INVALID',
      `OAuth provider ${input.provider.code} authorizationUrl is invalid.`,
      { providerCode: input.provider.code },
    );
  }

  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', input.start.scopes.join(' '));
  url.searchParams.set('state', input.state);
  return url.toString();
}

export function createOAuthProviderAccountId(input: {
  providerCode: string;
  subjectId: string;
  providerAccountId?: string;
}): string {
  return (
    input.providerAccountId ??
    `${input.providerCode}:${slugForRef(input.subjectId)}`
  );
}

export function createOAuthTokenSecretRefs(input: {
  providerCode: string;
  subjectId: string;
  providerAccountId: string;
}): { accessTokenRef: string; refreshTokenRef: string } {
  const provider = slugForRef(input.providerCode.replace(/^oauth\./, ''));
  const subject = slugForRef(input.subjectId);
  const account = slugForRef(input.providerAccountId);
  const base = `secret://config/integration.oauth.${provider}.${subject}.${account}`;
  return {
    accessTokenRef: `${base}.access-token`,
    refreshTokenRef: `${base}.refresh-token`,
  };
}

export function createOAuthTokenId(input: {
  providerCode: string;
  subjectId: string;
  providerAccountId: string;
}): string {
  return `oauth_token_${slugForRef(input.providerCode)}_${slugForRef(
    input.subjectId,
  )}_${slugForRef(input.providerAccountId)}`;
}

export function toOAuthProfileAccountDto(
  token: OAuthTokenRecord,
  provider?: Pick<IntegrationProviderRecord, 'code' | 'name'>,
): OAuthProfileAccountDto {
  const normalized = normalizeOAuthTokenRecord(token);

  return {
    tokenId: normalized.id,
    providerCode: normalized.providerCode,
    providerName: provider?.name ?? normalized.providerCode,
    providerAccountId: normalized.providerAccountId,
    scopes: [...normalized.scopes],
    status: normalized.status,
    expiresAt: normalized.expiresAt,
    lastRotatedAt: normalized.lastRotatedAt,
    revokedAt: normalized.revokedAt,
    revokeReason: normalized.revokeReason,
    createdAt: normalized.createdAt,
  };
}

export function isLegacySyntheticOAuthProfileAccount(
  token: Pick<
    OAuthTokenRecord,
    'providerAccountId' | 'providerCode' | 'subjectType'
  >,
): boolean {
  return (
    token.subjectType === 'user' &&
    token.providerAccountId.startsWith(`${token.providerCode}:`)
  );
}

export function toOAuthProfileProviderDto(
  provider: IntegrationProviderRecord,
): OAuthProfileProviderDto {
  const bindingIssue = getOAuthProfileBindingIssue(provider);

  return {
    bindingIssue,
    bindingStatus: bindingIssue ? 'requires_configuration' : 'ready',
    code: provider.code,
    name: provider.name,
    type: 'oauth',
  };
}

export function assertOAuthProfileProviderBindable(
  provider: IntegrationProviderRecord,
): void {
  const bindingIssue = getOAuthProfileBindingIssue(provider);
  if (!bindingIssue) {
    return;
  }

  throw integrationBadRequest(
    'INTEGRATION_OAUTH_PROFILE_PROVIDER_NOT_READY',
    `OAuth provider ${provider.code} is not ready for profile binding.`,
    { bindingIssue, providerCode: provider.code },
  );
}

function getOAuthProfileBindingIssue(
  provider: IntegrationProviderRecord,
): OAuthProfileBindingIssue | undefined {
  if (!provider.enabled) {
    return 'disabled';
  }

  const authorizationUrl =
    typeof provider.config.authorizationUrl === 'string'
      ? provider.config.authorizationUrl.trim()
      : '';
  const callbackPath =
    typeof provider.config.callbackPath === 'string'
      ? provider.config.callbackPath.trim()
      : '';
  const clientId =
    typeof provider.config.clientId === 'string'
      ? provider.config.clientId.trim()
      : '';

  if (!authorizationUrl || !callbackPath || !clientId) {
    return 'missing_config';
  }

  if (/^opencore[-_]/i.test(clientId)) {
    return 'placeholder_client';
  }

  if (provider.secretRefStatus !== 'valid') {
    return 'secret_unverified';
  }
}

export function assertOAuthTokenBelongsToSubject(input: {
  subjectId: string;
  token: OAuthTokenRecord;
}): void {
  if (
    input.token.subjectType !== 'user' ||
    input.token.subjectId !== input.subjectId
  ) {
    throw integrationBadRequest(
      'INTEGRATION_OAUTH_PROFILE_ACCOUNT_FORBIDDEN',
      'OAuth profile account does not belong to the authenticated user.',
      { tokenId: input.token.id },
    );
  }
}

export class IntegrationWebSocketRuntimeStore {
  private readonly connections = new Map<
    string,
    WebSocketRuntimeConnectionRecord
  >();
  private readonly subscriptions = new Map<
    string,
    WebSocketRuntimeSubscriptionRecord
  >();
  private readonly sinks = new Map<
    string,
    { emit: WebSocketRuntimeSink; subscriptionId: string }
  >();
  private events: WebSocketRuntimeEventRecord[] = [];
  private sequence = 0;

  getDiagnostics(): WebSocketRuntimeDiagnosticsDto {
    const connections = [...this.connections.values()].sort(
      compareConnectedDesc,
    );
    const subscriptions = [...this.subscriptions.values()].sort(
      compareSubscribedDesc,
    );
    const events = [...this.events].sort(compareCreatedDesc);

    return {
      summary: {
        activeConnections: connections.filter(
          (connection) => connection.status === 'connected',
        ).length,
        totalConnections: connections.length,
        activeSubscriptions: subscriptions.filter(
          (subscription) => subscription.status === 'active',
        ).length,
        recentEvents: events.length,
        lastEventAt: events[0]?.createdAt,
        generatedAt: new Date().toISOString(),
      },
      connections: connections.slice(0, 50).map(clone),
      subscriptions: subscriptions.slice(0, 100).map(clone),
      events: events.slice(0, 100).map(clone),
    };
  }

  openConnection(input: {
    subjectId: string;
    query?: WebSocketRuntimeStreamQueryDto;
    emit: WebSocketRuntimeSink;
  }): WebSocketRuntimeConnectionHandle {
    const now = new Date().toISOString();
    const room = normalizeWebSocketRuntimeRoom(input.query?.room);
    const eventTypes = normalizeWebSocketRuntimeEventTypes(
      input.query?.eventTypes,
    );
    const connection: WebSocketRuntimeConnectionRecord = {
      id: this.nextId('ws_conn'),
      subjectId: normalizeRequiredString(
        input.subjectId,
        'WebSocket runtime subjectId is required.',
      ),
      transport: 'sse',
      status: 'connected',
      rooms: [room],
      connectedAt: now,
      lastSeenAt: now,
    };
    const subscription: WebSocketRuntimeSubscriptionRecord = {
      id: this.nextId('ws_sub'),
      connectionId: connection.id,
      room,
      eventTypes,
      status: 'active',
      subscribedAt: now,
    };
    this.connections.set(connection.id, connection);
    this.subscriptions.set(subscription.id, subscription);
    this.sinks.set(connection.id, {
      emit: input.emit,
      subscriptionId: subscription.id,
    });

    return {
      connection: clone(connection),
      subscription: clone(subscription),
      close: (reason = 'client_closed') =>
        this.closeConnection(connection.id, reason),
      heartbeat: () => this.touchConnection(connection.id),
    };
  }

  publish(body: PublishWebSocketRuntimeEventDto): WebSocketRuntimeEventRecord {
    const room = normalizeWebSocketRuntimeRoom(body.room);
    const type = normalizeWebSocketRuntimePublishEventType(body.type);
    const event: WebSocketRuntimeEventRecord = {
      id: this.nextId('ws_evt'),
      room,
      type,
      payloadPreview: redactWebSocketRuntimePayload(body.payload ?? {}),
      traceId: normalizeOptionalText(body.traceId),
      deliveredCount: 0,
      status: 'no_subscribers',
      createdAt: new Date().toISOString(),
    };

    for (const [connectionId, sink] of this.sinks) {
      const connection = this.connections.get(connectionId);
      const subscription = this.subscriptions.get(sink.subscriptionId);
      if (
        !connection ||
        !subscription ||
        connection.status !== 'connected' ||
        subscription.status !== 'active' ||
        subscription.room !== room ||
        !matchesWebSocketRuntimeEventType(subscription.eventTypes, type)
      ) {
        continue;
      }

      sink.emit(clone(event));
      event.deliveredCount += 1;
      connection.lastSeenAt = event.createdAt;
    }

    event.status = event.deliveredCount > 0 ? 'delivered' : 'no_subscribers';
    this.events = [event, ...this.events].slice(0, 100);
    return clone(event);
  }

  private closeConnection(connectionId: string, reason: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.status === 'closed') {
      return;
    }

    const closedAt = new Date().toISOString();
    connection.status = 'closed';
    connection.closedAt = closedAt;
    connection.closeReason = normalizeOptionalText(reason) ?? 'closed';
    connection.lastSeenAt = closedAt;

    for (const subscription of this.subscriptions.values()) {
      if (
        subscription.connectionId === connectionId &&
        subscription.status === 'active'
      ) {
        subscription.status = 'closed';
        subscription.closedAt = closedAt;
      }
    }

    this.sinks.delete(connectionId);
  }

  private touchConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection?.status === 'connected') {
      connection.lastSeenAt = new Date().toISOString();
    }
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}_${Date.now().toString(36)}_${this.sequence}`;
  }
}

export function normalizeOAuthRevokeReason(value: unknown): string {
  const reason =
    typeof value === 'string' ? value.trim() : 'Revoked from OpenCore Admin.';

  if (!reason) {
    throw integrationBadRequest(
      'INTEGRATION_OAUTH_REVOKE_REASON_REQUIRED',
      'OAuth token revoke reason must not be blank.',
    );
  }

  if (reason.length > 300) {
    throw integrationBadRequest(
      'INTEGRATION_OAUTH_REVOKE_REASON_TOO_LONG',
      'OAuth token revoke reason must be at most 300 characters.',
      { maxLength: 300 },
    );
  }

  return reason;
}

export function renderTemplate(
  template: IntegrationTemplateRecord,
  payload: Record<string, unknown>,
): { subject?: string; body: string } {
  const render = (source: string | undefined): string | undefined =>
    source?.replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (_match, key: string) => {
      const value = payload[key];

      return value === undefined || value === null ? '' : String(value);
    });

  return {
    subject: render(template.subject),
    body: render(template.body) ?? '',
  };
}

export function normalizeOutboxSubject(
  channel: 'mail' | 'sms',
  value: unknown,
): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (channel === 'sms') {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_SMS_SUBJECT_UNSUPPORTED',
      'SMS outbox messages do not support subject.',
      { channel },
    );
  }

  if (typeof value !== 'string') {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_SUBJECT_INVALID_TYPE',
      'Mail outbox subject must be a string.',
      { channel },
    );
  }

  const subject = value.trim();
  if (!subject) {
    return undefined;
  }

  if (subject.length > 200) {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_SUBJECT_TOO_LONG',
      'Mail outbox subject must be at most 200 characters.',
      { maxLength: 200 },
    );
  }

  return subject;
}

export function normalizeOutboxAttachments(
  channel: 'mail' | 'sms',
  value: unknown,
): readonly IntegrationOutboxAttachmentDto[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (channel === 'sms') {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_SMS_ATTACHMENTS_UNSUPPORTED',
      'SMS outbox messages do not support attachments.',
      { channel },
    );
  }

  if (!Array.isArray(value)) {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_ATTACHMENTS_INVALID',
      'Mail outbox attachments must be an array.',
    );
  }

  if (value.length === 0) {
    return undefined;
  }

  if (value.length > 5) {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_ATTACHMENTS_TOO_MANY',
      'Mail outbox attachments must contain at most 5 files.',
      { maxItems: 5 },
    );
  }

  let totalSizeBytes = 0;
  const attachments = value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw integrationBadRequest(
        'INTEGRATION_OUTBOX_ATTACHMENT_INVALID',
        `Mail outbox attachment at index ${index} must be an object.`,
        { index },
      );
    }
    const record = item as Record<string, unknown>;
    const filename = normalizeAttachmentFilename(record.filename, index);
    const contentType = normalizeAttachmentContentType(
      record.contentType,
      index,
    );
    const { contentBase64, sizeBytes } = normalizeAttachmentContentBase64(
      record.contentBase64,
      index,
    );
    totalSizeBytes += sizeBytes;

    if (totalSizeBytes > 256 * 1024) {
      throw integrationBadRequest(
        'INTEGRATION_OUTBOX_ATTACHMENTS_TOTAL_SIZE_TOO_LARGE',
        'Mail outbox attachments total size must be at most 256KB.',
        { maxBytes: 256 * 1024 },
      );
    }

    return {
      filename,
      contentType,
      contentBase64,
      sizeBytes,
    };
  });

  return attachments;
}

export function assertSmsSafety(
  recipient: string,
  payload: Record<string, unknown>,
): void {
  if (!/^\+?[0-9]{6,20}$/.test(recipient)) {
    throw integrationBadRequest(
      'INTEGRATION_SMS_RECIPIENT_INVALID',
      'SMS recipient must be a phone-like number.',
      { recipient },
    );
  }

  if ('code' in payload && String(payload.code).length < 4) {
    throw integrationBadRequest(
      'INTEGRATION_SMS_VERIFICATION_CODE_TOO_SHORT',
      'SMS verification code must be at least 4 chars.',
      { minLength: 4 },
    );
  }
}

export function normalizeOutboxFailureError(value: unknown): string {
  const error = typeof value === 'string' ? value.trim() : '';

  if (error.length === 0) {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_FAILURE_ERROR_REQUIRED',
      'Outbox failure error is required.',
    );
  }

  if (error.length > 500) {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_FAILURE_ERROR_TOO_LONG',
      'Outbox failure error must be at most 500 characters.',
      { maxLength: 500 },
    );
  }

  return error;
}

export function normalizeProcessOutboxLimit(value: unknown): number {
  const parsed = Number(value ?? 100);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_PROCESS_LIMIT_INVALID',
      'Outbox process limit must be an integer between 1 and 100.',
      { maximum: 100, minimum: 1, value },
    );
  }

  return parsed;
}

export function normalizeOutboxSchedule(
  body: ScheduleOutboxDto = {},
): NormalizedOutboxSchedule {
  return {
    channels: normalizeOutboxScheduleChannels(body.channels),
    providerCode: normalizeOptionalProviderCode(body.providerCode),
    limit: normalizeProcessOutboxLimit(body.limit),
    retryFailed: normalizeOptionalScheduleBoolean(body.retryFailed, true),
    maxRetryCount: normalizeOutboxScheduleMaxRetryCount(body.maxRetryCount),
  };
}

export function createOutboxScheduleResult(input: {
  schedule: NormalizedOutboxSchedule;
  channels: IntegrationOutboxScheduleResultDto['channels'];
}): IntegrationOutboxScheduleResultDto {
  return {
    retryFailed: input.schedule.retryFailed,
    maxRetryCount: input.schedule.maxRetryCount,
    channels: input.channels,
    retriedCount: input.channels.reduce(
      (sum, channel) => sum + channel.retriedCount,
      0,
    ),
    attemptedCount: input.channels.reduce(
      (sum, channel) => sum + channel.process.attemptedCount,
      0,
    ),
    sentCount: input.channels.reduce(
      (sum, channel) => sum + channel.process.sentCount,
      0,
    ),
    failedCount: input.channels.reduce(
      (sum, channel) => sum + channel.process.failedCount,
      0,
    ),
    skippedCount: input.channels.reduce(
      (sum, channel) => sum + channel.process.skippedCount,
      0,
    ),
    queuedCount: input.channels.reduce(
      (sum, channel) => sum + channel.process.queuedCount,
      0,
    ),
  };
}

export function normalizeOptionalProviderCode(
  value: unknown,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const providerCode = String(value).trim();
  if (providerCode.length === 0) {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_PROVIDER_CODE_REQUIRED',
      'Outbox providerCode must not be blank.',
    );
  }

  return providerCode;
}

export function normalizeOutboxCallback(
  channel: 'mail' | 'sms',
  body: IntegrationOutboxCallbackDto,
): NormalizedOutboxCallback {
  const providerCode = normalizeRequiredString(
    body.providerCode,
    'Outbox callback providerCode is required.',
  );
  const messageId = normalizeRequiredString(
    body.messageId,
    'Outbox callback messageId is required.',
  );
  const signature = normalizeOutboxCallbackSignature(body.signature);

  if (body.status !== 'sent' && body.status !== 'failed') {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_CALLBACK_STATUS_INVALID',
      'Outbox callback status must be sent or failed.',
      { status: body.status },
    );
  }

  return {
    channel,
    providerCode,
    messageId,
    status: body.status,
    error:
      body.status === 'failed'
        ? normalizeOutboxFailureError(body.error)
        : undefined,
    signature,
  };
}

export function assertOutboxCallbackProviderMatch(input: {
  expectedProviderCode: string;
  actualProviderCode: string;
  messageId: string;
}): void {
  if (input.expectedProviderCode !== input.actualProviderCode) {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_CALLBACK_PROVIDER_MISMATCH',
      `Outbox callback provider mismatch for message ${input.messageId}.`,
      input,
    );
  }
}

export function assertOutboxCallbackSignature(
  callback: NormalizedOutboxCallback,
  provider: IntegrationProviderRecord,
): void {
  const signingKey = resolveOutboxCallbackSigningKey(provider);
  const expected = Buffer.from(
    createOutboxCallbackSignature(callback, signingKey),
    'hex',
  );
  const actual = Buffer.from(callback.signature, 'hex');

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_CALLBACK_SIGNATURE_INVALID',
      'Outbox callback signature is invalid.',
      { messageId: callback.messageId, providerCode: callback.providerCode },
    );
  }
}

export function createOutboxCallbackSignature(
  input: Omit<NormalizedOutboxCallback, 'signature'>,
  signingKey: string,
): string {
  return createHmac('sha256', signingKey)
    .update(createOutboxCallbackCanonicalPayload(input))
    .digest('hex');
}

export function createOutboxCallbackCanonicalPayload(
  input: Omit<NormalizedOutboxCallback, 'signature'>,
): string {
  return [
    input.channel,
    input.providerCode,
    input.messageId,
    input.status,
    input.error ?? '',
  ].join('\n');
}

export function requireRecord<T>(
  record: T | null | undefined,
  resource: string,
  id: string,
): T {
  if (!record) {
    throw integrationNotFound(
      'INTEGRATION_RESOURCE_NOT_FOUND',
      `${resource} not found: ${id}`,
      { id, resource },
    );
  }

  return record;
}

function normalizeRequiredString(value: unknown, message: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (normalized.length === 0) {
    throw integrationBadRequest(
      'INTEGRATION_REQUIRED_STRING_MISSING',
      message,
      { message },
    );
  }

  return normalized;
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const text = String(value).trim();
  return text ? text : undefined;
}

function normalizeOAuthTokenScopes(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function normalizeOAuthRequestedScopes(
  requested: unknown,
  fallback: unknown,
): readonly string[] {
  const scopes = normalizeOAuthTokenScopes(requested);
  const fallbackScopes = normalizeOAuthTokenScopes(fallback);
  const selected = scopes.length > 0 ? scopes : fallbackScopes;

  if (selected.length === 0) {
    throw integrationBadRequest(
      'INTEGRATION_OAUTH_SCOPES_REQUIRED',
      'OAuth flow scopes are required.',
    );
  }

  return [...new Set(selected)];
}

function normalizeOAuthCallbackScopes(
  value: unknown,
): readonly string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return normalizeOAuthTokenScopes(value);
  }

  return String(value)
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOAuthExpiresInSeconds(value: unknown): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number(value ?? 3600);

  if (!Number.isInteger(parsed) || parsed < 60 || parsed > 90 * 24 * 60 * 60) {
    throw integrationBadRequest(
      'INTEGRATION_OAUTH_EXPIRES_IN_INVALID',
      'OAuth callback expiresInSeconds must be an integer between 60 and 7776000.',
      { maximum: 90 * 24 * 60 * 60, minimum: 60, value },
    );
  }

  return parsed;
}

function normalizeWebSocketRuntimeRoom(value: unknown): string {
  const room = normalizeOptionalText(value) ?? 'integration.diagnostics';
  if (
    room.length > 120 ||
    !room.startsWith('integration.') ||
    !/^[a-z0-9][a-z0-9._:-]+$/.test(room)
  ) {
    throw integrationBadRequest(
      'INTEGRATION_WEBSOCKET_ROOM_INVALID',
      'WebSocket runtime room must be an integration.* identifier.',
      { room },
    );
  }

  return room;
}

function normalizeWebSocketRuntimeEventTypes(
  value: unknown,
): readonly string[] {
  const raw =
    typeof value === 'string'
      ? value.split(/[,\s]+/)
      : Array.isArray(value)
        ? value
        : ['*'];
  const eventTypes = raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);

  if (eventTypes.length === 0) {
    return ['*'];
  }

  return [...new Set(eventTypes.map(normalizeWebSocketRuntimeEventType))];
}

function normalizeWebSocketRuntimePublishEventType(value: unknown): string {
  const type = normalizeWebSocketRuntimeEventType(value);
  if (!type.startsWith('diagnostic.')) {
    throw integrationBadRequest(
      'INTEGRATION_WEBSOCKET_PUBLISH_EVENT_TYPE_INVALID',
      'WebSocket runtime only accepts diagnostic.* events.',
      { type },
    );
  }

  return type;
}

function normalizeWebSocketRuntimeEventType(value: unknown): string {
  const type = normalizeRequiredString(
    value,
    'WebSocket runtime event type is required.',
  );
  if (
    type !== '*' &&
    (type.length > 120 || !/^[a-z0-9][a-z0-9.-]+$/.test(type))
  ) {
    throw integrationBadRequest(
      'INTEGRATION_WEBSOCKET_EVENT_TYPE_INVALID',
      'WebSocket runtime event type must be a safe event identifier.',
      { type },
    );
  }

  return type;
}

function matchesWebSocketRuntimeEventType(
  subscriptionEventTypes: readonly string[],
  type: string,
): boolean {
  return (
    subscriptionEventTypes.includes('*') ||
    subscriptionEventTypes.includes(type)
  );
}

function redactWebSocketRuntimePayload(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const redacted = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SECRET_KEY_PATTERN.test(key)
        ? '[REDACTED]'
        : item && typeof item === 'object' && !Array.isArray(item)
          ? redactWebSocketRuntimePayload(item as Record<string, unknown>)
          : item,
    ]),
  );
  const serialized = JSON.stringify(redacted);
  if (serialized.length <= 1000) {
    return redacted;
  }

  return {
    truncated: true,
    preview: `${serialized.slice(0, 997)}...`,
  };
}

function compareCreatedDesc<T extends { createdAt: string }>(
  left: T,
  right: T,
): number {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt);
}

function compareConnectedDesc(
  left: WebSocketRuntimeConnectionRecord,
  right: WebSocketRuntimeConnectionRecord,
): number {
  return Date.parse(right.connectedAt) - Date.parse(left.connectedAt);
}

function compareSubscribedDesc(
  left: WebSocketRuntimeSubscriptionRecord,
  right: WebSocketRuntimeSubscriptionRecord,
): number {
  return Date.parse(right.subscribedAt) - Date.parse(left.subscribedAt);
}

function slugForRef(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'value';
}

function isOAuthTokenExpiringSoon(
  token: OAuthTokenRecord,
  generatedAt: string,
): boolean {
  if (token.status !== 'active' || !token.expiresAt) {
    return false;
  }

  const now = Date.parse(generatedAt);
  const expiresAt = Date.parse(token.expiresAt);
  return expiresAt > now && expiresAt - now <= 7 * 24 * 60 * 60 * 1000;
}

function normalizeAttachmentFilename(value: unknown, index: number): string {
  const filename = normalizeRequiredString(
    value,
    `Mail outbox attachment filename at index ${index} is required.`,
  );
  if (
    filename.length > 120 ||
    filename === '.' ||
    filename === '..' ||
    /[\\/]/.test(filename) ||
    hasAsciiControlCharacter(filename)
  ) {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_ATTACHMENT_FILENAME_INVALID',
      `Mail outbox attachment filename at index ${index} is invalid.`,
      { filename, index },
    );
  }

  return filename;
}

function hasAsciiControlCharacter(value: string): boolean {
  return [...value].some((character) => character.charCodeAt(0) < 32);
}

function normalizeAttachmentContentType(value: unknown, index: number): string {
  const contentType = normalizeRequiredString(
    value,
    `Mail outbox attachment contentType at index ${index} is required.`,
  ).toLowerCase();
  if (
    contentType.length > 120 ||
    !/^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/.test(contentType)
  ) {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_ATTACHMENT_CONTENT_TYPE_INVALID',
      `Mail outbox attachment contentType at index ${index} is invalid.`,
      { contentType, index },
    );
  }

  return contentType;
}

function normalizeAttachmentContentBase64(
  value: unknown,
  index: number,
): { contentBase64: string; sizeBytes: number } {
  const contentBase64 = normalizeRequiredString(
    value,
    `Mail outbox attachment contentBase64 at index ${index} is required.`,
  );
  if (
    contentBase64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(contentBase64)
  ) {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_ATTACHMENT_CONTENT_BASE64_INVALID',
      `Mail outbox attachment contentBase64 at index ${index} must be valid base64.`,
      { index },
    );
  }

  const sizeBytes = Buffer.from(contentBase64, 'base64').length;
  if (sizeBytes < 1 || sizeBytes > 64 * 1024) {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_ATTACHMENT_SIZE_INVALID',
      `Mail outbox attachment at index ${index} must be between 1 byte and 64KB.`,
      { index, maxBytes: 64 * 1024, minBytes: 1, sizeBytes },
    );
  }

  return { contentBase64, sizeBytes };
}

function normalizeOutboxCallbackSignature(value: unknown): string {
  const signature = normalizeRequiredString(
    value,
    'Outbox callback signature is required.',
  ).replace(/^sha256=/i, '');

  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_CALLBACK_SIGNATURE_FORMAT_INVALID',
      'Outbox callback signature must be a SHA-256 hex digest.',
    );
  }

  return signature.toLowerCase();
}

function normalizeOutboxScheduleChannels(
  value: ScheduleOutboxDto['channels'],
): readonly ('mail' | 'sms')[] {
  const rawValues =
    value === undefined
      ? ['mail', 'sms']
      : Array.isArray(value)
        ? value
        : [value];
  const channels: ('mail' | 'sms')[] = [];

  for (const raw of rawValues) {
    if (raw !== 'mail' && raw !== 'sms') {
      throw integrationBadRequest(
        'INTEGRATION_OUTBOX_SCHEDULE_CHANNEL_INVALID',
        'Outbox schedule channels must contain only mail or sms.',
        { channel: raw },
      );
    }
    if (!channels.includes(raw)) {
      channels.push(raw);
    }
  }

  if (channels.length === 0) {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_SCHEDULE_CHANNELS_EMPTY',
      'Outbox schedule channels must not be empty.',
    );
  }

  return channels;
}

function normalizeOptionalScheduleBoolean(
  value: boolean | string | undefined,
  fallback: boolean,
): boolean {
  if (value === undefined) return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;

  throw integrationBadRequest(
    'INTEGRATION_OUTBOX_SCHEDULE_RETRY_FAILED_INVALID',
    'Outbox schedule retryFailed must be boolean.',
    { value },
  );
}

function normalizeOutboxScheduleMaxRetryCount(value: unknown): number {
  const parsed = Number(value ?? 3);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
    throw integrationBadRequest(
      'INTEGRATION_OUTBOX_SCHEDULE_MAX_RETRY_INVALID',
      'Outbox schedule maxRetryCount must be an integer between 1 and 20.',
      { maximum: 20, minimum: 1, value },
    );
  }

  return parsed;
}

function resolveOutboxCallbackSigningKey(
  provider: IntegrationProviderRecord,
): string {
  const configured = provider.config.callbackSigningSecret;

  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim();
  }

  return provider.secretRef;
}

function normalizePositiveInteger(
  value: number | string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildOutboxSummary(
  rows: readonly IntegrationOutboxRecord[],
): IntegrationSummaryDto['mailOutbox'] {
  return {
    total: rows.length,
    queued: countByStatus(rows, 'queued', 'status'),
    sent: countByStatus(rows, 'sent', 'status'),
    failed: countByStatus(rows, 'failed', 'status'),
  };
}

function countByStatus<T, K extends keyof T>(
  rows: readonly T[],
  status: string,
  field: K,
): number {
  return rows.filter((row) => row[field] === status).length;
}
