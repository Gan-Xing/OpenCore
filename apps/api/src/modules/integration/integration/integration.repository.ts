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
