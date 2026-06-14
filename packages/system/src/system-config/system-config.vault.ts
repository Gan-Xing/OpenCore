import { BadRequestException } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

export const SYSTEM_CONFIG_SECRET_VALUE_PREFIX = 'opencore:vault:';
export const SYSTEM_CONFIG_SECRET_VALUE_V1_PREFIX = 'opencore:vault:v1:';
export const SYSTEM_CONFIG_SECRET_VALUE_V2_PREFIX = 'opencore:vault:v2:';
export const SYSTEM_CONFIG_REDACTED_SECRET_VALUE = '[REDACTED]';

export type SystemConfigVaultEnvelopeVersion = 'none' | 'v1' | 'v2';

export type SystemConfigVaultEnvelopeInfo = {
  activeKey: boolean;
  encrypted: boolean;
  envelopeVersion: SystemConfigVaultEnvelopeVersion;
  keyId?: string;
};

export type SystemConfigVaultBindingStatus = {
  activeKeyId: string;
  keyIds: readonly string[];
  legacyDecryptEnabled: boolean;
  provider: 'env';
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

const DEFAULT_VAULT_KEY_ID = 'local';
const VAULT_KEY_ID_PATTERN = /^[a-z][a-z0-9._-]{0,63}$/;

export function isEncryptedSystemConfigSecretValue(value: string): boolean {
  return value.startsWith(SYSTEM_CONFIG_SECRET_VALUE_PREFIX);
}

export function getSystemConfigVaultBindingStatus(): SystemConfigVaultBindingStatus {
  const keyring = readSystemConfigVaultKeyring();

  return {
    activeKeyId: getActiveSystemConfigVaultKeyId(),
    keyIds: [...keyring.keys()].sort(),
    legacyDecryptEnabled: true,
    provider: 'env',
  };
}

export function inspectSystemConfigSecretEnvelope(
  value: string,
): SystemConfigVaultEnvelopeInfo {
  if (value.startsWith(SYSTEM_CONFIG_SECRET_VALUE_V2_PREFIX)) {
    try {
      const envelope = parseSystemConfigSecretEnvelopeV2(value);
      return {
        activeKey: envelope.keyId === getActiveSystemConfigVaultKeyId(),
        encrypted: true,
        envelopeVersion: 'v2',
        keyId: envelope.keyId,
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
    };
  }

  if (isEncryptedSystemConfigSecretValue(value)) {
    return {
      activeKey: false,
      encrypted: true,
      envelopeVersion: 'v1',
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
    throw new BadRequestException(
      `System config secret value cannot be decrypted: ${key}`,
      { cause: error },
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
    throw new BadRequestException(
      `System config vault key is not configured: ${keyId}`,
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
      throw new BadRequestException(
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
    throw new BadRequestException(
      `OPENCORE_CONFIG_KMS_ACTIVE_KEY_ID is not present in OPENCORE_CONFIG_KMS_KEYRING: ${activeKeyId}`,
    );
  }

  return keyring;
}

function getActiveSystemConfigVaultKeyId(): string {
  return normalizeVaultKeyId(
    process.env.OPENCORE_CONFIG_KMS_ACTIVE_KEY_ID || DEFAULT_VAULT_KEY_ID,
  );
}

function normalizeVaultKeyId(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!VAULT_KEY_ID_PATTERN.test(normalized)) {
    throw new BadRequestException(
      'System config vault key id must start with a letter and contain only lowercase letters, numbers, dots, underscores or hyphens.',
    );
  }

  return normalized;
}

function normalizeVaultKeyMaterial(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BadRequestException(
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
