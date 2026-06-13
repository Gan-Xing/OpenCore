import { createTransport } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import type {
  IntegrationOutboxRecord,
  IntegrationProviderRecord,
} from './integration.seed';

export type OutboxDeliveryResult = {
  status: 'failed' | 'sent';
  error?: string;
};

export type ProviderDeliveryHealth = {
  status: 'degraded' | 'disabled' | 'healthy';
  error?: string;
};

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;
export type ProviderSecretResolver = (secretRef: string) => Promise<string>;

export type MailSmtpTransport = {
  close?: () => void;
  sendMail: (message: {
    attachments?: Array<{
      content: Buffer;
      contentType: string;
      filename: string;
    }>;
    from: string;
    subject: string;
    text: string;
    to: string;
  }) => Promise<unknown>;
  verify?: () => Promise<unknown>;
};

export type MailSmtpTransportFactory = (
  options: SMTPTransport.Options,
) => MailSmtpTransport;

type SmsHttpProviderConfig = {
  endpoint: URL;
  method: 'GET' | 'POST';
  successStatuses: ReadonlySet<number>;
  timeoutMs: number;
  headers: Record<string, string>;
  secretInjections: readonly SmsHttpSecretInjection[];
};

type MailSmtpProviderConfig = {
  authMethod?: 'LOGIN' | 'PLAIN';
  ehloName: string;
  from: string;
  host: string;
  port: number;
  rejectUnauthorized: boolean;
  requireTls: boolean;
  secure: boolean;
  timeoutMs: number;
  username?: string;
};

type SmsHttpSecretInjectionTarget = 'body' | 'header' | 'query';

type SmsHttpSecretInjection = {
  target: SmsHttpSecretInjectionTarget;
  name: string;
  secretRef: string;
  prefix: string;
  suffix: string;
};

type SmsHttpResolvedSecretInjection = SmsHttpSecretInjection & {
  value: string;
};

type SmsHttpPayload = {
  messageId: string;
  providerCode: string;
  recipient: string;
  templateCode?: string;
  message: string;
  payload: Record<string, unknown>;
} & Record<string, unknown>;

const DEFAULT_HTTP_SUCCESS_STATUSES = [200, 201, 202, 204] as const;
const DEFAULT_SMTP_TIMEOUT_MS = 10000;
const CONFIG_SECRET_REF_PREFIX = 'secret://config/';
const SENSITIVE_HTTP_HEADER_PATTERN =
  /^(authorization|cookie|proxy-authorization|x-api-key|api-key|.*token.*|.*secret.*)$/i;
const FORBIDDEN_SECRET_INJECTION_HEADERS = new Set([
  'connection',
  'content-length',
  'content-type',
  'host',
]);
const RESERVED_SMS_HTTP_PAYLOAD_FIELDS = new Set([
  'message',
  'messageId',
  'payload',
  'providerCode',
  'recipient',
  'templateCode',
]);

export async function evaluateProviderDeliveryHealth(
  provider: IntegrationProviderRecord,
  options: {
    secretResolver?: ProviderSecretResolver;
    smtpTransportFactory?: MailSmtpTransportFactory;
  } = {},
): Promise<ProviderDeliveryHealth> {
  if (!provider.enabled) {
    return { status: 'disabled' };
  }

  try {
    await assertDeliveryAdapterConfig(provider, options);
    return { status: 'healthy' };
  } catch (error) {
    return {
      status: 'degraded',
      error: formatAdapterError(error),
    };
  }
}

export async function deliverOutboxMessage(input: {
  channel: 'mail' | 'sms';
  provider: IntegrationProviderRecord;
  message: IntegrationOutboxRecord;
  fetchImpl?: FetchLike;
  secretResolver?: ProviderSecretResolver;
  smtpTransportFactory?: MailSmtpTransportFactory;
}): Promise<OutboxDeliveryResult> {
  const adapter = getProviderAdapter(input.provider);

  if (adapter === 'sandbox') {
    return { status: 'sent' };
  }

  if (input.channel === 'sms' && adapter === 'http') {
    return deliverSmsHttpMessage(input);
  }

  if (input.channel === 'mail' && adapter === 'smtp') {
    return deliverMailSmtpMessage(input);
  }

  return {
    status: 'failed',
    error: truncateAdapterError(
      `Provider adapter is not implemented for ${input.channel}: ${adapter}.`,
    ),
  };
}

async function assertDeliveryAdapterConfig(
  provider: IntegrationProviderRecord,
  options: {
    secretResolver?: ProviderSecretResolver;
    smtpTransportFactory?: MailSmtpTransportFactory;
  },
): Promise<void> {
  const adapter = getProviderAdapter(provider);

  if (adapter === 'sandbox') {
    return;
  }

  if (provider.type === 'sms' && adapter === 'http') {
    const config = normalizeSmsHttpProviderConfig(provider);
    await resolveSmsHttpSecretInjections(config, options.secretResolver);
    return;
  }

  if (provider.type === 'mail' && adapter === 'smtp') {
    const config = normalizeMailSmtpProviderConfig(provider);
    await resolveMailSmtpPassword(provider, config, options.secretResolver);
    await verifyMailSmtpTransport(provider, config, options);
    return;
  }

  throw new Error(
    `Unsupported provider adapter for ${provider.type}: ${adapter}.`,
  );
}

async function deliverSmsHttpMessage(input: {
  provider: IntegrationProviderRecord;
  message: IntegrationOutboxRecord;
  fetchImpl?: FetchLike;
  secretResolver?: ProviderSecretResolver;
}): Promise<OutboxDeliveryResult> {
  let config: SmsHttpProviderConfig;
  let secretInjections: readonly SmsHttpResolvedSecretInjection[];
  try {
    config = normalizeSmsHttpProviderConfig(input.provider);
    secretInjections = await resolveSmsHttpSecretInjections(
      config,
      input.secretResolver,
    );
  } catch (error) {
    return {
      status: 'failed',
      error: truncateAdapterError(
        `SMS HTTP provider config invalid: ${formatAdapterError(error)}`,
      ),
    };
  }

  const fetchImpl = input.fetchImpl ?? globalThis.fetch?.bind(globalThis);
  if (!fetchImpl) {
    return {
      status: 'failed',
      error: 'SMS HTTP provider fetch runtime is unavailable.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const url = new URL(config.endpoint.toString());
    const headers: Record<string, string> = { ...config.headers };
    const payload = buildSmsHttpPayload(input.provider, input.message);
    const init: RequestInit = {
      method: config.method,
      headers,
      signal: controller.signal,
    };

    if (config.method === 'GET') {
      appendSmsHttpQuery(url, payload);
    } else {
      Object.assign(headers, {
        'content-type': 'application/json',
      });
      init.body = JSON.stringify(payload);
    }
    applySmsHttpSecretInjections({
      headers,
      payload,
      secretInjections,
      url,
    });
    if (config.method === 'POST') {
      init.body = JSON.stringify(payload);
    }

    const response = await fetchImpl(url, init);
    if (config.successStatuses.has(response.status)) {
      return { status: 'sent' };
    }

    return {
      status: 'failed',
      error: `SMS HTTP provider returned status ${response.status}.`,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? `SMS HTTP provider timed out after ${config.timeoutMs}ms.`
        : `SMS HTTP provider request failed: ${formatAdapterError(error)}`;

    return {
      status: 'failed',
      error: truncateAdapterError(message),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function deliverMailSmtpMessage(input: {
  provider: IntegrationProviderRecord;
  message: IntegrationOutboxRecord;
  secretResolver?: ProviderSecretResolver;
  smtpTransportFactory?: MailSmtpTransportFactory;
}): Promise<OutboxDeliveryResult> {
  let config: MailSmtpProviderConfig;
  let password: string | undefined;
  try {
    config = normalizeMailSmtpProviderConfig(input.provider);
    password = await resolveMailSmtpPassword(
      input.provider,
      config,
      input.secretResolver,
    );
  } catch (error) {
    return {
      status: 'failed',
      error: truncateAdapterError(
        `Mail SMTP provider config invalid: ${formatAdapterError(error)}`,
      ),
    };
  }

  const transport = createMailSmtpTransport(
    config,
    password,
    input.smtpTransportFactory,
  );
  const attachments = buildMailAttachments(input.message);
  try {
    await transport.sendMail({
      ...(attachments.length > 0 ? { attachments } : {}),
      from: config.from,
      to: input.message.recipient,
      subject: getMailSubject(input.message),
      text: getMessageText(input.message),
    });
    return { status: 'sent' };
  } catch (error) {
    return {
      status: 'failed',
      error: truncateAdapterError(
        `Mail SMTP provider request failed: ${formatAdapterError(error)}`,
      ),
    };
  } finally {
    transport.close?.();
  }
}

async function verifyMailSmtpTransport(
  provider: IntegrationProviderRecord,
  config: MailSmtpProviderConfig,
  options: {
    secretResolver?: ProviderSecretResolver;
    smtpTransportFactory?: MailSmtpTransportFactory;
  },
): Promise<void> {
  const password = await resolveMailSmtpPassword(
    provider,
    config,
    options.secretResolver,
  );
  const transport = createMailSmtpTransport(
    config,
    password,
    options.smtpTransportFactory,
  );
  try {
    await transport.verify?.();
  } finally {
    transport.close?.();
  }
}

function createMailSmtpTransport(
  config: MailSmtpProviderConfig,
  password: string | undefined,
  factory: MailSmtpTransportFactory | undefined,
): MailSmtpTransport {
  const options: SMTPTransport.Options = {
    auth:
      config.username && password
        ? {
            method: config.authMethod,
            pass: password,
            user: config.username,
          }
        : undefined,
    connectionTimeout: config.timeoutMs,
    greetingTimeout: config.timeoutMs,
    host: config.host,
    name: config.ehloName,
    port: config.port,
    requireTLS: config.requireTls,
    secure: config.secure,
    socketTimeout: config.timeoutMs,
    tls: {
      rejectUnauthorized: config.rejectUnauthorized,
      servername: config.host,
    },
  };

  return factory ? factory(options) : createTransport(options);
}

async function resolveMailSmtpPassword(
  provider: IntegrationProviderRecord,
  config: MailSmtpProviderConfig,
  secretResolver: ProviderSecretResolver | undefined,
): Promise<string | undefined> {
  if (!config.username) {
    return undefined;
  }

  assertConfigSecretRef(provider.secretRef);
  if (!secretResolver) {
    throw new Error('Mail SMTP provider secret resolver is unavailable.');
  }

  const password = await secretResolver(provider.secretRef);
  if (!password.trim()) {
    throw new Error('Mail SMTP provider secret is empty.');
  }

  return password;
}

function appendSmsHttpQuery(url: URL, payload: SmsHttpPayload): void {
  url.searchParams.set('messageId', payload.messageId);
  url.searchParams.set('providerCode', payload.providerCode);
  url.searchParams.set('recipient', payload.recipient);
  url.searchParams.set('message', payload.message);
}

function buildSmsHttpPayload(
  provider: IntegrationProviderRecord,
  message: IntegrationOutboxRecord,
): SmsHttpPayload {
  return {
    messageId: message.id,
    providerCode: provider.code,
    recipient: message.recipient,
    templateCode: message.templateCode,
    message: getMessageText(message),
    payload: message.payload,
  };
}

function getMessageText(message: IntegrationOutboxRecord): string {
  if (message.preview?.trim()) {
    return message.preview;
  }

  for (const key of ['message', 'text', 'body', 'content']) {
    const value = message.payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return JSON.stringify(message.payload);
}

function getMailSubject(message: IntegrationOutboxRecord): string {
  if (message.subject?.trim()) {
    return message.subject;
  }

  return message.templateCode ?? 'OpenCore notification';
}

function buildMailAttachments(message: IntegrationOutboxRecord): Array<{
  content: Buffer;
  contentType: string;
  filename: string;
}> {
  return (message.attachments ?? []).map((attachment) => ({
    content: Buffer.from(attachment.contentBase64, 'base64'),
    contentType: attachment.contentType,
    filename: attachment.filename,
  }));
}

function normalizeMailSmtpProviderConfig(
  provider: IntegrationProviderRecord,
): MailSmtpProviderConfig {
  const config = provider.config;
  const secure = normalizeBoolean(config.secure, false, 'SMTP secure');
  const requireTls = normalizeBoolean(
    config.requireTls ?? config.startTls,
    false,
    'SMTP requireTls',
  );
  const username = normalizeOptionalTrimmedString(
    config.username,
    'SMTP username',
    200,
  );

  return {
    authMethod: normalizeSmtpAuthMethod(config.authMethod, username),
    ehloName: normalizeSmtpEhloName(config.ehloName),
    from: normalizeEmailAddress(config.from, 'SMTP from address'),
    host: normalizeSmtpHost(config.host),
    port: normalizePort(
      config.port,
      secure ? 465 : requireTls ? 587 : 25,
      'SMTP port',
    ),
    rejectUnauthorized: normalizeBoolean(
      config.rejectUnauthorized,
      true,
      'SMTP rejectUnauthorized',
    ),
    requireTls,
    secure,
    timeoutMs: normalizeTimeoutMs(config.timeoutMs, DEFAULT_SMTP_TIMEOUT_MS),
    username,
  };
}

function normalizeSmsHttpProviderConfig(
  provider: IntegrationProviderRecord,
): SmsHttpProviderConfig {
  const config = provider.config;
  const endpoint = normalizeHttpEndpoint(config.endpoint);
  assertEndpointAllowed(endpoint, config.allowedHosts);
  const method = normalizeHttpMethod(config.method);
  const headers = normalizeHttpHeaders(config.headers);
  const secretInjections = normalizeSmsHttpSecretInjections(
    config.secretInjections,
  );
  assertSmsHttpSecretInjectionsAllowedForMethod(method, secretInjections);
  assertNoStaticHeaderSecretInjectionConflict(headers, secretInjections);

  return {
    endpoint,
    method,
    successStatuses: normalizeSuccessStatuses(config.successStatus),
    timeoutMs: normalizeTimeoutMs(config.timeoutMs, 3000),
    headers,
    secretInjections,
  };
}

function normalizeHttpEndpoint(value: unknown): URL {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('SMS HTTP adapter endpoint is required.');
  }

  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    throw new Error('SMS HTTP adapter endpoint must be an absolute URL.');
  }

  if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
    throw new Error('SMS HTTP adapter endpoint must use http or https.');
  }

  return endpoint;
}

function assertEndpointAllowed(endpoint: URL, value: unknown): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('SMS HTTP adapter allowedHosts must be non-empty.');
  }

  const allowedHosts = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (allowedHosts.length === 0) {
    throw new Error('SMS HTTP adapter allowedHosts must contain host names.');
  }

  const host = endpoint.host.toLowerCase();
  const hostname = endpoint.hostname.toLowerCase();
  if (!allowedHosts.includes(host) && !allowedHosts.includes(hostname)) {
    throw new Error(
      `SMS HTTP adapter endpoint host is not allowlisted: ${endpoint.host}.`,
    );
  }
}

function normalizeHttpMethod(value: unknown): 'GET' | 'POST' {
  if (value === undefined || value === null || value === '') {
    return 'POST';
  }

  const method = String(value).trim().toUpperCase();
  if (method === 'GET' || method === 'POST') {
    return method;
  }

  throw new Error('SMS HTTP adapter method must be GET or POST.');
}

function normalizeSuccessStatuses(value: unknown): ReadonlySet<number> {
  const rawStatuses =
    value === undefined || value === null
      ? DEFAULT_HTTP_SUCCESS_STATUSES
      : Array.isArray(value)
        ? value
        : [value];

  const statuses = rawStatuses.map((status) => Number(status));
  if (
    statuses.length === 0 ||
    statuses.some(
      (status) => !Number.isInteger(status) || status < 100 || status > 599,
    )
  ) {
    throw new Error(
      'SMS HTTP adapter successStatus must contain valid HTTP status codes.',
    );
  }

  return new Set(statuses);
}

function normalizeTimeoutMs(value: unknown, defaultValue: number): number {
  const timeoutMs = Number(value ?? defaultValue);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
    throw new Error(
      'Provider adapter timeoutMs must be an integer between 100 and 30000.',
    );
  }

  return timeoutMs;
}

function normalizeSmtpHost(value: unknown): string {
  const host = normalizeTrimmedString(value, 'SMTP host', 253);
  if (
    !/^[A-Za-z0-9.-]+$/.test(host) ||
    host.startsWith('.') ||
    host.endsWith('.') ||
    host.includes('..')
  ) {
    throw new Error('SMTP host must be a hostname or IP address.');
  }

  return host;
}

function normalizeSmtpEhloName(value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return 'opencore.local';
  }

  return normalizeSmtpHost(value);
}

function normalizePort(
  value: unknown,
  defaultValue: number,
  label: string,
): number {
  const port = Number(value ?? defaultValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${label} must be an integer between 1 and 65535.`);
  }

  return port;
}

function normalizeSmtpAuthMethod(
  value: unknown,
  username: string | undefined,
): 'LOGIN' | 'PLAIN' | undefined {
  if (!username) {
    return undefined;
  }

  if (value === undefined || value === null || value === '') {
    return 'PLAIN';
  }

  const method = String(value).trim().toUpperCase();
  if (method === 'LOGIN' || method === 'PLAIN') {
    return method;
  }

  throw new Error('SMTP authMethod must be PLAIN or LOGIN.');
}

function normalizeBoolean(
  value: unknown,
  defaultValue: boolean,
  label: string,
): boolean {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  throw new Error(`${label} must be a boolean.`);
}

function normalizeEmailAddress(value: unknown, label: string): string {
  const address = normalizeTrimmedString(value, label, 320);
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(address)) {
    throw new Error(`${label} must be an email address.`);
  }

  return address;
}

function normalizeOptionalTrimmedString(
  value: unknown,
  label: string,
  maxLength: number,
): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return normalizeTrimmedString(value, label, maxLength);
}

function normalizeTrimmedString(
  value: unknown,
  label: string,
  maxLength: number,
): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string.`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  if (normalized.length > maxLength || /[\r\n]/.test(normalized)) {
    throw new Error(`${label} is invalid.`);
  }

  return normalized;
}

function assertConfigSecretRef(secretRef: string): void {
  if (
    !secretRef.startsWith(CONFIG_SECRET_REF_PREFIX) ||
    secretRef.length === CONFIG_SECRET_REF_PREFIX.length
  ) {
    throw new Error(
      'Mail SMTP provider secretRef must use secret://config/<key>.',
    );
  }
}

async function resolveSmsHttpSecretInjections(
  config: SmsHttpProviderConfig,
  secretResolver: ProviderSecretResolver | undefined,
): Promise<readonly SmsHttpResolvedSecretInjection[]> {
  if (config.secretInjections.length === 0) {
    return [];
  }

  if (!secretResolver) {
    throw new Error('SMS HTTP provider secret resolver is unavailable.');
  }

  return Promise.all(
    config.secretInjections.map(async (injection) => ({
      ...injection,
      value: normalizeSecretInjectionValue(
        injection,
        await secretResolver(injection.secretRef),
      ),
    })),
  );
}

function applySmsHttpSecretInjections(input: {
  headers: Record<string, string>;
  payload: SmsHttpPayload;
  secretInjections: readonly SmsHttpResolvedSecretInjection[];
  url: URL;
}): void {
  for (const injection of input.secretInjections) {
    if (injection.target === 'header') {
      input.headers[injection.name] = injection.value;
    } else if (injection.target === 'query') {
      input.url.searchParams.set(injection.name, injection.value);
    } else {
      input.payload[injection.name] = injection.value;
    }
  }
}

function normalizeHttpHeaders(value: unknown): Record<string, string> {
  if (value === undefined || value === null) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error('SMS HTTP adapter headers must be an object.');
  }

  return Object.fromEntries(
    Object.entries(value).map(([rawName, rawValue]) => {
      const name = normalizeHttpHeaderName(rawName);
      if (SENSITIVE_HTTP_HEADER_PATTERN.test(name)) {
        throw new Error(
          `SMS HTTP adapter header must use secretRef injection, not config: ${name}.`,
        );
      }
      if (typeof rawValue !== 'string' || /[\r\n]/.test(rawValue)) {
        throw new Error(
          `SMS HTTP adapter header value must be a safe string: ${name}.`,
        );
      }

      return [name, rawValue] as const;
    }),
  );
}

function normalizeSmsHttpSecretInjections(
  value: unknown,
): readonly SmsHttpSecretInjection[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error('SMS HTTP adapter secretInjections must be an array.');
  }

  if (value.length > 20) {
    throw new Error(
      'SMS HTTP adapter secretInjections must contain at most 20 entries.',
    );
  }

  const seen = new Set<string>();
  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(
        `SMS HTTP adapter secret injection at index ${index} must be an object.`,
      );
    }

    const target = normalizeSmsHttpSecretInjectionTarget(item.target, index);
    const name =
      target === 'header'
        ? normalizeHttpHeaderName(item.name)
        : normalizeSmsHttpSecretInjectionFieldName(item.name, target, index);
    const key = `${target}:${name.toLowerCase()}`;
    if (seen.has(key)) {
      throw new Error(
        `SMS HTTP adapter secret injection is duplicated: ${target}:${name}.`,
      );
    }
    seen.add(key);

    return {
      target,
      name,
      secretRef: normalizeSmsHttpSecretInjectionRef(item.secretRef, index),
      prefix: normalizeSecretInjectionAffix(item.prefix, 'prefix', index),
      suffix: normalizeSecretInjectionAffix(item.suffix, 'suffix', index),
    };
  });
}

function normalizeSmsHttpSecretInjectionTarget(
  value: unknown,
  index: number,
): SmsHttpSecretInjectionTarget {
  const target = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (target === 'body' || target === 'header' || target === 'query') {
    return target;
  }

  throw new Error(
    `SMS HTTP adapter secret injection target at index ${index} must be header, query or body.`,
  );
}

function normalizeSmsHttpSecretInjectionFieldName(
  value: unknown,
  target: Exclude<SmsHttpSecretInjectionTarget, 'header'>,
  index: number,
): string {
  const name = normalizeTrimmedString(
    value,
    `SMS HTTP adapter ${target} secret injection name at index ${index}`,
    100,
  );
  if (!/^[A-Za-z0-9_.-]+$/.test(name)) {
    throw new Error(
      `SMS HTTP adapter ${target} secret injection name at index ${index} is invalid.`,
    );
  }

  if (RESERVED_SMS_HTTP_PAYLOAD_FIELDS.has(name)) {
    throw new Error(
      `SMS HTTP adapter ${target} secret injection cannot override payload field: ${name}.`,
    );
  }

  return name;
}

function normalizeSmsHttpSecretInjectionRef(
  value: unknown,
  index: number,
): string {
  const secretRef = normalizeTrimmedString(
    value,
    `SMS HTTP adapter secret injection secretRef at index ${index}`,
    300,
  );
  if (
    !secretRef.startsWith(CONFIG_SECRET_REF_PREFIX) ||
    secretRef.length === CONFIG_SECRET_REF_PREFIX.length
  ) {
    throw new Error(
      'SMS HTTP provider secret injection secretRef must use secret://config/<key>.',
    );
  }

  return secretRef;
}

function normalizeSecretInjectionAffix(
  value: unknown,
  field: 'prefix' | 'suffix',
  index: number,
): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new Error(
      `SMS HTTP adapter secret injection ${field} at index ${index} must be a string.`,
    );
  }

  if (value.length > 100 || /[\r\n]/.test(value)) {
    throw new Error(
      `SMS HTTP adapter secret injection ${field} at index ${index} is invalid.`,
    );
  }

  return value;
}

function normalizeSecretInjectionValue(
  injection: SmsHttpSecretInjection,
  secret: string,
): string {
  if (!secret.trim()) {
    throw new Error(
      `SMS HTTP adapter secret is empty for ${injection.target}:${injection.name}.`,
    );
  }

  const value = `${injection.prefix}${secret}${injection.suffix}`;
  if (value.length > 2000 || /[\r\n]/.test(value)) {
    throw new Error(
      `SMS HTTP adapter secret value is invalid for ${injection.target}:${injection.name}.`,
    );
  }

  return value;
}

function assertSmsHttpSecretInjectionsAllowedForMethod(
  method: 'GET' | 'POST',
  secretInjections: readonly SmsHttpSecretInjection[],
): void {
  if (
    method === 'GET' &&
    secretInjections.some((injection) => injection.target === 'body')
  ) {
    throw new Error(
      'SMS HTTP adapter body secret injections require POST method.',
    );
  }
}

function assertNoStaticHeaderSecretInjectionConflict(
  headers: Record<string, string>,
  secretInjections: readonly SmsHttpSecretInjection[],
): void {
  const staticHeaderNames = new Set(
    Object.keys(headers).map((name) => name.toLowerCase()),
  );
  for (const injection of secretInjections) {
    if (injection.target !== 'header') {
      continue;
    }
    const normalizedName = injection.name.toLowerCase();
    if (FORBIDDEN_SECRET_INJECTION_HEADERS.has(normalizedName)) {
      throw new Error(
        `SMS HTTP adapter cannot inject managed header: ${injection.name}.`,
      );
    }
    if (staticHeaderNames.has(normalizedName)) {
      throw new Error(
        `SMS HTTP adapter header secret injection conflicts with static header: ${injection.name}.`,
      );
    }
  }
}

function normalizeHttpHeaderName(value: unknown): string {
  const name = normalizeTrimmedString(
    value,
    'SMS HTTP adapter header name',
    100,
  );
  if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name)) {
    throw new Error(`SMS HTTP adapter header name is invalid: ${name}.`);
  }

  return name;
}

function getProviderAdapter(provider: IntegrationProviderRecord): string {
  const adapter = provider.config.adapter;
  return typeof adapter === 'string' && adapter.trim()
    ? adapter.trim().toLowerCase()
    : 'sandbox';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function formatAdapterError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function truncateAdapterError(value: string): string {
  return value.length > 500 ? `${value.slice(0, 497)}...` : value;
}
