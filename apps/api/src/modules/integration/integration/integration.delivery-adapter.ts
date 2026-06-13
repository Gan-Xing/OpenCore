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

type SmsHttpProviderConfig = {
  endpoint: URL;
  method: 'GET' | 'POST';
  successStatuses: ReadonlySet<number>;
  timeoutMs: number;
  headers: Record<string, string>;
};

const DEFAULT_HTTP_SUCCESS_STATUSES = [200, 201, 202, 204] as const;
const SENSITIVE_HTTP_HEADER_PATTERN =
  /^(authorization|cookie|proxy-authorization|x-api-key|api-key|.*token.*|.*secret.*)$/i;

export function evaluateProviderDeliveryHealth(
  provider: IntegrationProviderRecord,
): ProviderDeliveryHealth {
  if (!provider.enabled) {
    return { status: 'disabled' };
  }

  try {
    assertDeliveryAdapterConfig(provider);
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
}): Promise<OutboxDeliveryResult> {
  const adapter = getProviderAdapter(input.provider);

  if (adapter === 'sandbox') {
    return { status: 'sent' };
  }

  if (input.channel === 'sms' && adapter === 'http') {
    return deliverSmsHttpMessage(input);
  }

  return {
    status: 'failed',
    error: truncateAdapterError(
      `Provider adapter is not implemented for ${input.channel}: ${adapter}.`,
    ),
  };
}

function assertDeliveryAdapterConfig(
  provider: IntegrationProviderRecord,
): void {
  const adapter = getProviderAdapter(provider);

  if (adapter === 'sandbox') {
    return;
  }

  if (provider.type === 'sms' && adapter === 'http') {
    normalizeSmsHttpProviderConfig(provider);
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
}): Promise<OutboxDeliveryResult> {
  let config: SmsHttpProviderConfig;
  try {
    config = normalizeSmsHttpProviderConfig(input.provider);
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
    const init: RequestInit = {
      method: config.method,
      headers: config.headers,
      signal: controller.signal,
    };

    if (config.method === 'GET') {
      appendSmsHttpQuery(url, input.provider, input.message);
    } else {
      init.headers = {
        'content-type': 'application/json',
        ...config.headers,
      };
      init.body = JSON.stringify(
        buildSmsHttpPayload(input.provider, input.message),
      );
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

function appendSmsHttpQuery(
  url: URL,
  provider: IntegrationProviderRecord,
  message: IntegrationOutboxRecord,
): void {
  const payload = buildSmsHttpPayload(provider, message);
  url.searchParams.set('messageId', payload.messageId);
  url.searchParams.set('providerCode', payload.providerCode);
  url.searchParams.set('recipient', payload.recipient);
  url.searchParams.set('message', payload.message);
}

function buildSmsHttpPayload(
  provider: IntegrationProviderRecord,
  message: IntegrationOutboxRecord,
): {
  messageId: string;
  providerCode: string;
  recipient: string;
  templateCode?: string;
  message: string;
  payload: Record<string, unknown>;
} {
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

function normalizeSmsHttpProviderConfig(
  provider: IntegrationProviderRecord,
): SmsHttpProviderConfig {
  const config = provider.config;
  const endpoint = normalizeHttpEndpoint(config.endpoint);
  assertEndpointAllowed(endpoint, config.allowedHosts);

  return {
    endpoint,
    method: normalizeHttpMethod(config.method),
    successStatuses: normalizeSuccessStatuses(config.successStatus),
    timeoutMs: normalizeTimeoutMs(config.timeoutMs),
    headers: normalizeHttpHeaders(config.headers),
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

function normalizeTimeoutMs(value: unknown): number {
  const timeoutMs = Number(value ?? 3000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
    throw new Error(
      'SMS HTTP adapter timeoutMs must be an integer between 100 and 30000.',
    );
  }

  return timeoutMs;
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
      const name = rawName.trim();
      if (!name) {
        throw new Error('SMS HTTP adapter header names must not be blank.');
      }
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
