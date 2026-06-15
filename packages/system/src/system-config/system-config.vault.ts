import { BadRequestException } from '@nestjs/common';
import { createApiErrorBody } from '@opencore/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

export const SYSTEM_CONFIG_SECRET_VALUE_PREFIX = 'opencore:vault:';
export const SYSTEM_CONFIG_SECRET_VALUE_V1_PREFIX = 'opencore:vault:v1:';
export const SYSTEM_CONFIG_SECRET_VALUE_V2_PREFIX = 'opencore:vault:v2:';
export const SYSTEM_CONFIG_SECRET_VALUE_V3_PREFIX = 'opencore:vault:v3:';
export const SYSTEM_CONFIG_REDACTED_SECRET_VALUE = '[REDACTED]';

export type SystemConfigVaultEnvelopeVersion = 'none' | 'v1' | 'v2' | 'v3';

export type SystemConfigVaultProvider = 'env' | 'opencore.http-json';

export type SystemConfigVaultProviderMode = 'local' | 'managed';

export type SystemConfigVaultEnvelopeInfo = {
  activeKey: boolean;
  encrypted: boolean;
  envelopeVersion: SystemConfigVaultEnvelopeVersion;
  keyId?: string;
  provider?: SystemConfigVaultProvider;
};

export type SystemConfigVaultBindingStatus = {
  activeKeyId: string;
  endpointHost?: string;
  externalEncryptionEnabled: boolean;
  keyIds: readonly string[];
  lastError?: string;
  legacyDecryptEnabled: boolean;
  mode: SystemConfigVaultProviderMode;
  provider: SystemConfigVaultProvider;
  ready: boolean;
  timeoutMs?: number;
};

type SecretValueEnvelopeV1 = {
  alg: 'aes-256-gcm';
  ciphertext: string;
  iv: string;
  tag: string;
};

type SecretValueEnvelopeV2 = SecretValueEnvelopeV1 & {
  keyId: string;
};

type SecretValueEnvelopeV3 = SecretValueEnvelopeV1 & {
  encryptedKey: string;
  keyId: string;
  provider: 'opencore.http-json';
};

type SystemConfigHttpJsonKmsOptions = {
  activeKeyId: string;
  allowedHosts: ReadonlySet<string>;
  authHeaderName?: string;
  authHeaderValue?: string;
  endpointHost?: string;
  lastError?: string;
  ready: boolean;
  timeoutMs: number;
  unwrapUrl?: URL;
  wrapUrl?: URL;
};

type KmsFetch = (
  url: string,
  init?: {
    body?: string;
    headers?: Record<string, string>;
    method?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

const DEFAULT_VAULT_KEY_ID = 'local';
const VAULT_KEY_ID_PATTERN = /^[a-z][a-z0-9._-]{0,63}$/;

export function isEncryptedSystemConfigSecretValue(value: string): boolean {
  return value.startsWith(SYSTEM_CONFIG_SECRET_VALUE_PREFIX);
}

export function getSystemConfigVaultBindingStatus(): SystemConfigVaultBindingStatus {
  const provider = readSystemConfigVaultProvider();
  if (provider === 'opencore.http-json') {
    const kms = readHttpJsonKmsOptions();
    return {
      activeKeyId: kms.activeKeyId,
      endpointHost: kms.endpointHost,
      externalEncryptionEnabled: kms.ready,
      keyIds: [kms.activeKeyId],
      legacyDecryptEnabled: true,
      mode: 'managed',
      provider,
      ready: kms.ready,
      timeoutMs: kms.timeoutMs,
      ...(kms.lastError ? { lastError: kms.lastError } : {}),
    };
  }

  const keyring = readSystemConfigVaultKeyring();
  return {
    activeKeyId: getActiveSystemConfigVaultKeyId(),
    externalEncryptionEnabled: false,
    keyIds: [...keyring.keys()].sort(),
    legacyDecryptEnabled: true,
    mode: 'local',
    provider: 'env',
    ready: true,
  };
}

export function inspectSystemConfigSecretEnvelope(
  value: string,
): SystemConfigVaultEnvelopeInfo {
  if (value.startsWith(SYSTEM_CONFIG_SECRET_VALUE_V3_PREFIX)) {
    try {
      const envelope = parseSystemConfigSecretEnvelopeV3(value);
      return {
        activeKey: envelope.keyId === getActiveSystemConfigVaultKeyId(),
        encrypted: true,
        envelopeVersion: 'v3',
        keyId: envelope.keyId,
        provider: envelope.provider,
      };
    } catch {
      return {
        activeKey: false,
        encrypted: true,
        envelopeVersion: 'v3',
        provider: 'opencore.http-json',
      };
    }
  }

  if (value.startsWith(SYSTEM_CONFIG_SECRET_VALUE_V2_PREFIX)) {
    try {
      const envelope = parseSystemConfigSecretEnvelopeV2(value);
      return {
        activeKey: envelope.keyId === getActiveSystemConfigVaultKeyId(),
        encrypted: true,
        envelopeVersion: 'v2',
        keyId: envelope.keyId,
        provider: 'env',
      };
    } catch {
      return {
        activeKey: false,
        encrypted: true,
        envelopeVersion: 'v2',
      };
    }
  }

  if (value.startsWith(SYSTEM_CONFIG_SECRET_VALUE_V1_PREFIX)) {
    return {
      activeKey: false,
      encrypted: true,
      envelopeVersion: 'v1',
      provider: 'env',
    };
  }

  if (isEncryptedSystemConfigSecretValue(value)) {
    return {
      activeKey: false,
      encrypted: true,
      envelopeVersion: 'v1',
      provider: 'env',
    };
  }

  return {
    activeKey: false,
    encrypted: false,
    envelopeVersion: 'none',
  };
}

export function encryptSystemConfigSecretValue(
  key: string,
  plaintext: string,
): string {
  const iv = randomBytes(12);
  const keyId = getActiveSystemConfigVaultKeyId();
  const cipher = createCipheriv(
    'aes-256-gcm',
    getSystemConfigVaultKeyById(keyId),
    iv,
  );
  cipher.setAAD(createSystemConfigAad(key));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const envelope: SecretValueEnvelopeV2 = {
    alg: 'aes-256-gcm',
    ciphertext: ciphertext.toString('base64url'),
    iv: iv.toString('base64url'),
    keyId,
    tag: cipher.getAuthTag().toString('base64url'),
  };

  return `${SYSTEM_CONFIG_SECRET_VALUE_V2_PREFIX}${Buffer.from(
    JSON.stringify(envelope),
    'utf8',
  ).toString('base64url')}`;
}

export async function encryptSystemConfigSecretValueAsync(
  key: string,
  plaintext: string,
): Promise<string> {
  if (readSystemConfigVaultProvider() !== 'opencore.http-json') {
    return encryptSystemConfigSecretValue(key, plaintext);
  }

  const kms = readHttpJsonKmsOptions();
  assertHttpJsonKmsReady(kms);

  const dataKey = randomBytes(32);
  const aad = createSystemConfigAad(key);
  const wrappedKey = await wrapDataKeyWithHttpJsonKms(kms, dataKey, aad);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', dataKey, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const envelope: SecretValueEnvelopeV3 = {
    alg: 'aes-256-gcm',
    ciphertext: ciphertext.toString('base64url'),
    encryptedKey: wrappedKey,
    iv: iv.toString('base64url'),
    keyId: kms.activeKeyId,
    provider: 'opencore.http-json',
    tag: cipher.getAuthTag().toString('base64url'),
  };

  return `${SYSTEM_CONFIG_SECRET_VALUE_V3_PREFIX}${Buffer.from(
    JSON.stringify(envelope),
    'utf8',
  ).toString('base64url')}`;
}

export function decryptSystemConfigSecretValue(
  key: string,
  value: string,
): string {
  if (!isEncryptedSystemConfigSecretValue(value)) {
    return value;
  }

  try {
    let envelope: SecretValueEnvelopeV1;
    let vaultKey: Buffer;

    if (value.startsWith(SYSTEM_CONFIG_SECRET_VALUE_V2_PREFIX)) {
      const envelopeV2 = parseSystemConfigSecretEnvelopeV2(value);
      envelope = envelopeV2;
      vaultKey = getSystemConfigVaultKeyById(envelopeV2.keyId);
    } else {
      envelope = parseSystemConfigSecretEnvelopeV1(value);
      vaultKey = getLegacySystemConfigVaultKey();
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      vaultKey,
      Buffer.from(envelope.iv, 'base64url'),
    );
    decipher.setAAD(createSystemConfigAad(key));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64url')),
      decipher.final(),
    ]);

    return plaintext.toString('utf8');
  } catch (error) {
    throw systemConfigVaultBadRequest(
      'SYSTEM_CONFIG_VAULT_DECRYPT_FAILED',
      `System config secret value cannot be decrypted: ${key}`,
      { key },
      error,
    );
  }
}

export async function decryptSystemConfigSecretValueAsync(
  key: string,
  value: string,
): Promise<string> {
  if (!isEncryptedSystemConfigSecretValue(value)) {
    return value;
  }

  if (!value.startsWith(SYSTEM_CONFIG_SECRET_VALUE_V3_PREFIX)) {
    return decryptSystemConfigSecretValue(key, value);
  }

  try {
    const envelope = parseSystemConfigSecretEnvelopeV3(value);
    const kms = readHttpJsonKmsOptions();
    assertHttpJsonKmsReady(kms);
    const aad = createSystemConfigAad(key);
    const dataKey = await unwrapDataKeyWithHttpJsonKms(
      kms,
      envelope.encryptedKey,
      aad,
    );
    const decipher = createDecipheriv(
      'aes-256-gcm',
      dataKey,
      Buffer.from(envelope.iv, 'base64url'),
    );
    decipher.setAAD(aad);
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64url')),
      decipher.final(),
    ]);

    return plaintext.toString('utf8');
  } catch (error) {
    throw systemConfigVaultBadRequest(
      'SYSTEM_CONFIG_VAULT_DECRYPT_FAILED',
      `System config secret value cannot be decrypted: ${key}`,
      { key },
      error,
    );
  }
}

function parseSystemConfigSecretEnvelopeV1(
  value: string,
): SecretValueEnvelopeV1 {
  const payload = value.startsWith(SYSTEM_CONFIG_SECRET_VALUE_V1_PREFIX)
    ? value.slice(SYSTEM_CONFIG_SECRET_VALUE_V1_PREFIX.length)
    : value.slice(SYSTEM_CONFIG_SECRET_VALUE_PREFIX.length);
  const envelope = JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8'),
  ) as Partial<SecretValueEnvelopeV1>;

  assertSystemConfigSecretEnvelope(envelope);

  return envelope;
}

function parseSystemConfigSecretEnvelopeV2(
  value: string,
): SecretValueEnvelopeV2 {
  const payload = value.slice(SYSTEM_CONFIG_SECRET_VALUE_V2_PREFIX.length);
  const rawEnvelope = JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8'),
  ) as Partial<SecretValueEnvelopeV2>;

  assertSystemConfigSecretEnvelope(rawEnvelope);
  const keyId = (rawEnvelope as { keyId?: unknown }).keyId;
  if (typeof keyId !== 'string' || !VAULT_KEY_ID_PATTERN.test(keyId)) {
    throw new Error('Malformed secret envelope key id.');
  }

  return {
    alg: rawEnvelope.alg,
    ciphertext: rawEnvelope.ciphertext,
    iv: rawEnvelope.iv,
    keyId,
    tag: rawEnvelope.tag,
  };
}

function parseSystemConfigSecretEnvelopeV3(
  value: string,
): SecretValueEnvelopeV3 {
  const payload = value.slice(SYSTEM_CONFIG_SECRET_VALUE_V3_PREFIX.length);
  const rawEnvelope = JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8'),
  ) as Partial<SecretValueEnvelopeV3>;

  assertSystemConfigSecretEnvelope(rawEnvelope);
  const keyId = (rawEnvelope as { keyId?: unknown }).keyId;
  const encryptedKey = (rawEnvelope as { encryptedKey?: unknown }).encryptedKey;
  const provider = (rawEnvelope as { provider?: unknown }).provider;
  if (typeof keyId !== 'string' || !VAULT_KEY_ID_PATTERN.test(keyId)) {
    throw new Error('Malformed secret envelope key id.');
  }

  if (typeof encryptedKey !== 'string' || !encryptedKey.trim()) {
    throw new Error('Malformed managed KMS envelope encrypted key.');
  }

  if (provider !== 'opencore.http-json') {
    throw new Error('Malformed managed KMS envelope provider.');
  }

  return {
    alg: rawEnvelope.alg,
    ciphertext: rawEnvelope.ciphertext,
    encryptedKey,
    iv: rawEnvelope.iv,
    keyId,
    provider,
    tag: rawEnvelope.tag,
  };
}

function assertSystemConfigSecretEnvelope(
  envelope: Partial<SecretValueEnvelopeV1>,
): asserts envelope is SecretValueEnvelopeV1 {
  if (
    envelope.alg !== 'aes-256-gcm' ||
    typeof envelope.iv !== 'string' ||
    typeof envelope.ciphertext !== 'string' ||
    typeof envelope.tag !== 'string'
  ) {
    throw new Error('Malformed secret envelope.');
  }
}

function getSystemConfigVaultKeyById(keyId: string): Buffer {
  const material = readSystemConfigVaultKeyring().get(
    normalizeVaultKeyId(keyId),
  );

  if (!material) {
    throw systemConfigVaultBadRequest(
      'SYSTEM_CONFIG_VAULT_KEY_NOT_CONFIGURED',
      `System config vault key is not configured: ${keyId}`,
      { keyId },
    );
  }

  return deriveSystemConfigVaultKey(normalizeVaultKeyId(keyId), material);
}

function getLegacySystemConfigVaultKey(): Buffer {
  const material =
    process.env.OPENCORE_CONFIG_KMS_KEY ||
    process.env.CONFIG_KMS_MASTER_KEY ||
    process.env.AUTH_TOKEN_SECRET ||
    'opencore-development-config-vault-key';

  return createHash('sha256')
    .update(`opencore-system-config-vault:${material}`, 'utf8')
    .digest();
}

function deriveSystemConfigVaultKey(keyId: string, material: string): Buffer {
  return createHash('sha256')
    .update(`opencore-system-config-vault:${keyId}:${material}`, 'utf8')
    .digest();
}

function readSystemConfigVaultKeyring(): Map<string, string> {
  const activeKeyId = getActiveSystemConfigVaultKeyId();
  const keyring = new Map<string, string>();
  const rawKeyring = process.env.OPENCORE_CONFIG_KMS_KEYRING?.trim();

  if (rawKeyring) {
    const parsed = JSON.parse(rawKeyring) as unknown;

    if (!isPlainStringRecord(parsed)) {
      throw systemConfigVaultBadRequest(
        'SYSTEM_CONFIG_VAULT_KEYRING_INVALID',
        'OPENCORE_CONFIG_KMS_KEYRING must be a JSON object of keyId to key material.',
      );
    }

    for (const [keyId, material] of Object.entries(parsed)) {
      keyring.set(
        normalizeVaultKeyId(keyId),
        normalizeVaultKeyMaterial(material),
      );
    }
  } else {
    const material =
      process.env.OPENCORE_CONFIG_KMS_KEY ||
      process.env.CONFIG_KMS_MASTER_KEY ||
      process.env.AUTH_TOKEN_SECRET ||
      'opencore-development-config-vault-key';
    keyring.set(activeKeyId, normalizeVaultKeyMaterial(material));
  }

  if (!keyring.has(activeKeyId)) {
    throw systemConfigVaultBadRequest(
      'SYSTEM_CONFIG_VAULT_ACTIVE_KEY_MISSING',
      `OPENCORE_CONFIG_KMS_ACTIVE_KEY_ID is not present in OPENCORE_CONFIG_KMS_KEYRING: ${activeKeyId}`,
      { activeKeyId },
    );
  }

  return keyring;
}

function getActiveSystemConfigVaultKeyId(): string {
  return normalizeVaultKeyId(
    process.env.OPENCORE_CONFIG_KMS_ACTIVE_KEY_ID || DEFAULT_VAULT_KEY_ID,
  );
}

function readSystemConfigVaultProvider(): SystemConfigVaultProvider {
  const provider = process.env.OPENCORE_CONFIG_KMS_PROVIDER?.trim();
  if (
    provider === 'http-json' ||
    provider === 'managed-http-json' ||
    provider === 'opencore.http-json'
  ) {
    return 'opencore.http-json';
  }

  return 'env';
}

function readHttpJsonKmsOptions(): SystemConfigHttpJsonKmsOptions {
  const activeKeyId = getActiveSystemConfigVaultKeyId();
  const wrapUrl = parseKmsEndpoint(
    process.env.OPENCORE_CONFIG_KMS_WRAP_URL ??
      process.env.OPENCORE_CONFIG_KMS_ENDPOINT_URL,
  );
  const unwrapUrl = parseKmsEndpoint(
    process.env.OPENCORE_CONFIG_KMS_UNWRAP_URL ??
      process.env.OPENCORE_CONFIG_KMS_ENDPOINT_URL,
  );
  const allowedHosts = new Set(
    parseCsv(process.env.OPENCORE_CONFIG_KMS_ALLOWED_HOSTS).map((host) =>
      host.toLowerCase(),
    ),
  );
  const timeoutMs = clampTimeout(
    parsePositiveInteger(process.env.OPENCORE_CONFIG_KMS_TIMEOUT_MS, 3000),
  );
  const endpointHost = wrapUrl?.hostname ?? unwrapUrl?.hostname;
  const lastError = validateHttpJsonKmsConfig({
    allowedHosts,
    fetchImpl: globalThis.fetch as KmsFetch | undefined,
    unwrapUrl,
    wrapUrl,
  });

  return {
    activeKeyId,
    allowedHosts,
    authHeaderName: process.env.OPENCORE_CONFIG_KMS_AUTH_HEADER_NAME,
    authHeaderValue: process.env.OPENCORE_CONFIG_KMS_AUTH_HEADER_VALUE,
    endpointHost,
    lastError,
    ready: !lastError,
    timeoutMs,
    unwrapUrl,
    wrapUrl,
  };
}

async function wrapDataKeyWithHttpJsonKms(
  kms: SystemConfigHttpJsonKmsOptions,
  dataKey: Buffer,
  aad: Buffer,
): Promise<string> {
  const payload = await requestHttpJsonKms(kms, 'wrap', {
    context: { aad: aad.toString('base64url') },
    keyId: kms.activeKeyId,
    plaintextKey: dataKey.toString('base64url'),
  });
  const encryptedKey = readNonEmptyString(payload, [
    'encryptedKey',
    'ciphertextKey',
    'wrappedKey',
  ]);

  if (!encryptedKey) {
    throw new Error('Managed KMS wrap response is missing encryptedKey.');
  }

  return encryptedKey;
}

async function unwrapDataKeyWithHttpJsonKms(
  kms: SystemConfigHttpJsonKmsOptions,
  encryptedKey: string,
  aad: Buffer,
): Promise<Buffer> {
  const payload = await requestHttpJsonKms(kms, 'unwrap', {
    context: { aad: aad.toString('base64url') },
    encryptedKey,
    keyId: kms.activeKeyId,
  });
  const plaintextKey = readNonEmptyString(payload, ['plaintextKey', 'dataKey']);

  if (!plaintextKey) {
    throw new Error('Managed KMS unwrap response is missing plaintextKey.');
  }

  return Buffer.from(plaintextKey, 'base64url');
}

async function requestHttpJsonKms(
  kms: SystemConfigHttpJsonKmsOptions,
  operation: 'unwrap' | 'wrap',
  payload: Record<string, unknown>,
): Promise<unknown> {
  const fetchImpl = globalThis.fetch as KmsFetch | undefined;
  if (!fetchImpl) {
    throw new Error('Fetch runtime is unavailable.');
  }

  const url = operation === 'wrap' ? kms.wrapUrl : kms.unwrapUrl;
  if (!url) {
    throw new Error(`Managed KMS ${operation} endpoint is not configured.`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), kms.timeoutMs);
  try {
    const response = await fetchImpl(url.href, {
      body: JSON.stringify(payload),
      headers: {
        'content-type': 'application/json',
        ...createKmsAuthHeaders(kms),
      },
      method: 'POST',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(
        `Managed KMS ${operation} returned HTTP ${response.status}.`,
      );
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function assertHttpJsonKmsReady(kms: SystemConfigHttpJsonKmsOptions): void {
  if (!kms.ready) {
    throw systemConfigVaultBadRequest(
      'SYSTEM_CONFIG_KMS_NOT_READY',
      `Managed KMS provider is not ready: ${kms.lastError}`,
      { lastError: kms.lastError, provider: 'opencore.http-json' },
    );
  }
}

function validateHttpJsonKmsConfig(input: {
  allowedHosts: ReadonlySet<string>;
  fetchImpl?: KmsFetch;
  unwrapUrl?: URL;
  wrapUrl?: URL;
}): string | undefined {
  if (!input.wrapUrl || !input.unwrapUrl) {
    return 'Managed KMS wrap and unwrap URLs are required.';
  }

  for (const url of [input.wrapUrl, input.unwrapUrl]) {
    if (!['http:', 'https:'].includes(url.protocol)) {
      return 'Managed KMS endpoint protocol must be HTTP or HTTPS.';
    }

    if (
      input.allowedHosts.size === 0 ||
      !input.allowedHosts.has(url.hostname.toLowerCase())
    ) {
      return 'Managed KMS endpoint host is not allowlisted.';
    }
  }

  if (!input.fetchImpl) {
    return 'Fetch runtime is unavailable.';
  }

  return undefined;
}

function parseKmsEndpoint(value: string | undefined): URL | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return new URL(trimmed);
  } catch {
    return undefined;
  }
}

function createKmsAuthHeaders(
  kms: SystemConfigHttpJsonKmsOptions,
): Record<string, string> {
  const name = kms.authHeaderName?.trim();
  const value = kms.authHeaderValue?.trim();
  return name && value ? { [name]: value } : {};
}

function readNonEmptyString(
  payload: unknown,
  keys: readonly string[],
): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  for (const key of keys) {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function parseCsv(value: string | undefined): readonly string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clampTimeout(value: number): number {
  return Math.min(Math.max(value, 250), 10_000);
}

function normalizeVaultKeyId(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!VAULT_KEY_ID_PATTERN.test(normalized)) {
    throw systemConfigVaultBadRequest(
      'SYSTEM_CONFIG_VAULT_KEY_ID_INVALID',
      'System config vault key id must start with a letter and contain only lowercase letters, numbers, dots, underscores or hyphens.',
      { keyId: value },
    );
  }

  return normalized;
}

function normalizeVaultKeyMaterial(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw systemConfigVaultBadRequest(
      'SYSTEM_CONFIG_VAULT_KEY_MATERIAL_INVALID',
      'System config vault key material must be a non-empty string.',
    );
  }

  return value;
}

function isPlainStringRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  );
}

function createSystemConfigAad(key: string): Buffer {
  return Buffer.from(`system-config:${key}`, 'utf8');
}

function systemConfigVaultBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  cause?: unknown,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
    cause === undefined ? undefined : { cause },
  );
}
