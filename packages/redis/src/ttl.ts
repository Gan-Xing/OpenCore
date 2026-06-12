export type TtlInput = number | 'never' | undefined;

export const REDIS_TTL_SECONDS = {
  short: 60,
  medium: 300,
  long: 900,
  day: 86_400,
} as const;

export function normalizeTtlSeconds(
  ttlSeconds: TtlInput,
  options: {
    maxTtlSeconds?: number;
  } = {},
): number | undefined {
  if (ttlSeconds === undefined || ttlSeconds === 'never') {
    return undefined;
  }

  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    return undefined;
  }

  const maxTtlSeconds = options.maxTtlSeconds ?? REDIS_TTL_SECONDS.day;

  return Math.min(ttlSeconds, maxTtlSeconds);
}
