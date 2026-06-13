import { BadRequestException } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

export const SYSTEM_CONFIG_SECRET_VALUE_PREFIX = 'opencore:vault:v1:';
export const SYSTEM_CONFIG_REDACTED_SECRET_VALUE = '[REDACTED]';

type SecretValueEnvelope = {
  alg: 'aes-256-gcm';
  ciphertext: string;
  iv: string;
  tag: string;
};

export function isEncryptedSystemConfigSecretValue(value: string): boolean {
  return value.startsWith(SYSTEM_CONFIG_SECRET_VALUE_PREFIX);
}

export function encryptSystemConfigSecretValue(
  key: string,
  plaintext: string,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getSystemConfigVaultKey(), iv);
  cipher.setAAD(createSystemConfigAad(key));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const envelope: SecretValueEnvelope = {
    alg: 'aes-256-gcm',
    ciphertext: ciphertext.toString('base64url'),
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
  };

  return `${SYSTEM_CONFIG_SECRET_VALUE_PREFIX}${Buffer.from(
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
    const payload = value.slice(SYSTEM_CONFIG_SECRET_VALUE_PREFIX.length);
    const envelope = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Partial<SecretValueEnvelope>;

    if (
      envelope.alg !== 'aes-256-gcm' ||
      typeof envelope.iv !== 'string' ||
      typeof envelope.ciphertext !== 'string' ||
      typeof envelope.tag !== 'string'
    ) {
      throw new Error('Malformed secret envelope.');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      getSystemConfigVaultKey(),
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

function getSystemConfigVaultKey(): Buffer {
  const material =
    process.env.OPENCORE_CONFIG_KMS_KEY ||
    process.env.CONFIG_KMS_MASTER_KEY ||
    process.env.AUTH_TOKEN_SECRET ||
    'opencore-development-config-vault-key';

  return createHash('sha256')
    .update(`opencore-system-config-vault:${material}`, 'utf8')
    .digest();
}

function createSystemConfigAad(key: string): Buffer {
  return Buffer.from(`system-config:${key}`, 'utf8');
}
