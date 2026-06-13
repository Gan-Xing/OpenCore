import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  CreateIntegrationProviderDto,
  CreateIntegrationTemplateDto,
  CreateOutboxMessageDto,
  FailOutboxMessageDto,
  IntegrationOutboxCallbackDto,
  IntegrationOutboxProcessResultDto,
  IntegrationOutboxScheduleResultDto,
  IntegrationOutboxQueryDto,
  IntegrationProviderDiagnosticsDto,
  IntegrationProviderQueryDto,
  IntegrationProviderType,
  IntegrationSummaryDto,
  IntegrationTemplateQueryDto,
  ProcessOutboxDto,
  PreviewTemplateDto,
  ScheduleOutboxDto,
  UpdateIntegrationProviderDto,
} from './integration.dto';
import type {
  IntegrationDesignRecord,
  IntegrationOutboxRecord,
  IntegrationProviderRecord,
  IntegrationTemplateRecord,
  OAuthCallbackContractRecord,
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

export abstract class IntegrationRepository {
  abstract getSummary(): Promise<IntegrationSummaryDto>;

  abstract listProviders(
    query?: IntegrationProviderQueryDto,
  ): Promise<PageResult<IntegrationProviderRecord>>;
  abstract getProvider(code: string): Promise<IntegrationProviderRecord>;
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
  abstract getProviderDiagnostics(
    code: string,
  ): Promise<IntegrationProviderDiagnosticsDto>;

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
  abstract getDesign(
    topic: 'pay' | 'websocket' | 'wechat',
  ): IntegrationDesignRecord;
}

export function buildIntegrationSummary(input: {
  providers: readonly IntegrationProviderRecord[];
  outbox: readonly IntegrationOutboxRecord[];
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
    designs: {
      designOnlyTopics: input.designs.filter(
        (design) => design.status === 'design-only',
      ).length,
      topics: input.designs.map((design) => design.topic),
    },
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

const SECRET_KEY_PATTERN =
  /(authorization|clientSecret|password|secret|token)/i;
const CONFIG_SECRET_REF_PREFIX = 'secret://config/';

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
    throw new BadRequestException(
      'Integration credentials must be stored as secret:// references.',
    );
  }
}

export function parseConfigSecretRef(secretRef: string): string {
  assertSecretRef(secretRef);
  if (!secretRef.startsWith(CONFIG_SECRET_REF_PREFIX)) {
    throw new BadRequestException(
      'Integration provider secretRef must use secret://config/<key> for runtime secret resolution.',
    );
  }

  const key = decodeURIComponent(
    secretRef.slice(CONFIG_SECRET_REF_PREFIX.length),
  ).trim();
  if (!key) {
    throw new BadRequestException(
      'Integration provider config secret key is required.',
    );
  }

  return key;
}

export function assertProviderReadyForOutbox(input: {
  code: string;
  type: IntegrationProviderType;
  enabled: boolean;
  channel: 'mail' | 'sms';
}): void {
  if (input.type !== input.channel) {
    throw new BadRequestException(
      `Provider ${input.code} is not a ${input.channel} provider.`,
    );
  }

  if (!input.enabled) {
    throw new BadRequestException(
      `Provider ${input.code} is disabled and cannot enqueue outbox messages.`,
    );
  }
}

export function assertTemplateEnabled(input: {
  code: string;
  enabled: boolean;
}): void {
  if (!input.enabled) {
    throw new BadRequestException(
      `Integration template is disabled: ${input.code}`,
    );
  }
}

export function normalizeProviderType(value: string): IntegrationProviderType {
  if (['mail', 'oauth', 'pay', 'sms', 'websocket', 'wechat'].includes(value)) {
    return value as IntegrationProviderType;
  }

  return 'mail';
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
    throw new BadRequestException(
      'SMS outbox messages do not support subject.',
    );
  }

  if (typeof value !== 'string') {
    throw new BadRequestException('Mail outbox subject must be a string.');
  }

  const subject = value.trim();
  if (!subject) {
    return undefined;
  }

  if (subject.length > 200) {
    throw new BadRequestException(
      'Mail outbox subject must be at most 200 characters.',
    );
  }

  return subject;
}

export function assertSmsSafety(
  recipient: string,
  payload: Record<string, unknown>,
): void {
  if (!/^\+?[0-9]{6,20}$/.test(recipient)) {
    throw new BadRequestException('SMS recipient must be a phone-like number.');
  }

  if ('code' in payload && String(payload.code).length < 4) {
    throw new BadRequestException(
      'SMS verification code must be at least 4 chars.',
    );
  }
}

export function normalizeOutboxFailureError(value: unknown): string {
  const error = typeof value === 'string' ? value.trim() : '';

  if (error.length === 0) {
    throw new BadRequestException('Outbox failure error is required.');
  }

  if (error.length > 500) {
    throw new BadRequestException(
      'Outbox failure error must be at most 500 characters.',
    );
  }

  return error;
}

export function normalizeProcessOutboxLimit(value: unknown): number {
  const parsed = Number(value ?? 100);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new BadRequestException(
      'Outbox process limit must be an integer between 1 and 100.',
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
    throw new BadRequestException('Outbox providerCode must not be blank.');
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
    throw new BadRequestException(
      'Outbox callback status must be sent or failed.',
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
    throw new BadRequestException(
      `Outbox callback provider mismatch for message ${input.messageId}.`,
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
    throw new BadRequestException('Outbox callback signature is invalid.');
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
    throw new NotFoundException(`${resource} not found: ${id}`);
  }

  return record;
}

function normalizeRequiredString(value: unknown, message: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (normalized.length === 0) {
    throw new BadRequestException(message);
  }

  return normalized;
}

function normalizeOutboxCallbackSignature(value: unknown): string {
  const signature = normalizeRequiredString(
    value,
    'Outbox callback signature is required.',
  ).replace(/^sha256=/i, '');

  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    throw new BadRequestException(
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
      throw new BadRequestException(
        'Outbox schedule channels must contain only mail or sms.',
      );
    }
    if (!channels.includes(raw)) {
      channels.push(raw);
    }
  }

  if (channels.length === 0) {
    throw new BadRequestException(
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

  throw new BadRequestException('Outbox schedule retryFailed must be boolean.');
}

function normalizeOutboxScheduleMaxRetryCount(value: unknown): number {
  const parsed = Number(value ?? 3);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
    throw new BadRequestException(
      'Outbox schedule maxRetryCount must be an integer between 1 and 20.',
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
