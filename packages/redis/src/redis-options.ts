import { assertRedisKeyPrefixAllowed, normalizeRedisPrefix } from './key';
import { loadLocalRedisEnv } from './env';

export const DEFAULT_REDIS_URL = 'redis://localhost:6379/1';
export const DEFAULT_REDIS_KEY_PREFIX = 'opencore:';
export const DEFAULT_BULLMQ_QUEUE_PREFIX = 'opencore';
export const DEFAULT_REDIS_TIMEOUT_MS = 1_500;

export const REDIS_OPTIONS = Symbol('OPENCORE_REDIS_OPTIONS');

export type RedisOptionsConfig = {
  url: string;
  keyPrefix: string;
  connectTimeoutMs: number;
  commandTimeoutMs: number;
  maxRetriesPerRequest: number;
  bullmqQueuePrefix: string;
};

export function readRedisOptionsFromEnv(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): RedisOptionsConfig {
  if (env === process.env) {
    loadLocalRedisEnv();
  }

  const keyPrefix = normalizeRedisPrefix(
    readOptionalEnv(env.REDIS_KEY_PREFIX, DEFAULT_REDIS_KEY_PREFIX),
  );
  assertRedisKeyPrefixAllowed(keyPrefix);

  return {
    url: readOptionalEnv(env.REDIS_URL, DEFAULT_REDIS_URL),
    keyPrefix,
    connectTimeoutMs: readPositiveInteger(
      env.REDIS_CONNECT_TIMEOUT_MS,
      DEFAULT_REDIS_TIMEOUT_MS,
    ),
    commandTimeoutMs: readPositiveInteger(
      env.REDIS_COMMAND_TIMEOUT_MS,
      DEFAULT_REDIS_TIMEOUT_MS,
    ),
    maxRetriesPerRequest: readNonNegativeInteger(
      env.REDIS_MAX_RETRIES_PER_REQUEST,
      1,
    ),
    bullmqQueuePrefix: readOptionalEnv(
      env.BULLMQ_QUEUE_PREFIX,
      DEFAULT_BULLMQ_QUEUE_PREFIX,
    ),
  };
}

function readOptionalEnv(
  value: string | undefined,
  defaultValue: string,
): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : defaultValue;
}

function readPositiveInteger(
  value: string | undefined,
  defaultValue: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
}

function readNonNegativeInteger(
  value: string | undefined,
  defaultValue: number,
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : defaultValue;
}
