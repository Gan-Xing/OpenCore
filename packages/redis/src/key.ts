export type RedisKeyPart = string | number | boolean;

export function createRedisKey(
  keyPrefix: string,
  ...parts: readonly RedisKeyPart[]
): string {
  const normalizedPrefix = normalizeRedisPrefix(keyPrefix);
  const normalizedParts = parts.map(normalizeRedisKeyPart).filter(Boolean);

  return `${normalizedPrefix}${normalizedParts.join(':')}`;
}

export function createRedisKeyFactory(
  keyPrefix: string,
  namespace: RedisKeyPart,
): (...parts: readonly RedisKeyPart[]) => string {
  return (...parts) => createRedisKey(keyPrefix, namespace, ...parts);
}

export function normalizeRedisPrefix(prefix: string): string {
  const trimmed = prefix.trim();

  if (!trimmed) {
    return '';
  }

  return trimmed.endsWith(':') ? trimmed : `${trimmed}:`;
}

export function normalizeRedisKeyPart(part: RedisKeyPart): string {
  return String(part)
    .trim()
    .replaceAll(/[^a-zA-Z0-9_.-]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .toLowerCase();
}

export function assertRedisKeyPrefixAllowed(prefix: string): void {
  const normalized = normalizeRedisPrefix(prefix).toLowerCase();

  if (!normalized || normalized === ':' || normalized === '*:') {
    throw new Error('Redis key prefix must be explicit.');
  }

  if (normalized.startsWith('nestweb:')) {
    throw new Error('Redis key prefix must not reuse a NestWeb prefix.');
  }
}
