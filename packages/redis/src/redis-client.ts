import Redis, { type RedisOptions } from 'ioredis';
import { type RedisOptionsConfig } from './redis-options';

export type RedisClientLike = {
  connect: () => Promise<void>;
  disconnect: () => void;
  ping: () => Promise<string>;
  get: (key: string) => Promise<string | null>;
  set: (
    key: string,
    value: string,
    mode?: 'EX',
    ttlSeconds?: number,
  ) => Promise<'OK' | null>;
  del: (...keys: string[]) => Promise<number>;
  scan: (
    cursor: string,
    ...args: readonly string[]
  ) => Promise<[cursor: string, keys: string[]]>;
  ttl: (key: string) => Promise<number>;
  type: (key: string) => Promise<string>;
  memoryUsage: (key: string) => Promise<number | null>;
};

export function createRedisClient(options: RedisOptionsConfig): Redis {
  return new Redis(options.url, createRedisConnectionOptions(options));
}

export function createRedisClientAdapter(
  options: RedisOptionsConfig,
): RedisClientLike {
  const client = createRedisClient(options);

  return {
    connect: () => client.connect(),
    disconnect: () => {
      client.disconnect();
    },
    ping: () => client.ping(),
    get: (key) => client.get(key),
    set: (key, value, mode, ttlSeconds) => {
      if (mode === 'EX' && ttlSeconds !== undefined) {
        return client.set(key, value, 'EX', ttlSeconds);
      }

      return client.set(key, value);
    },
    del: (...keys) => client.del(...keys),
    scan: (cursor, ...args) =>
      (
        client.scan as unknown as (
          cursor: string,
          ...args: string[]
        ) => Promise<[cursor: string, keys: string[]]>
      )(cursor, ...args),
    ttl: (key) => client.ttl(key),
    type: (key) => client.type(key),
    memoryUsage: (key) => client.memory('USAGE', key) as Promise<number | null>,
  };
}

export function createRedisConnectionOptions(
  options: RedisOptionsConfig,
): RedisOptions {
  return {
    lazyConnect: true,
    connectTimeout: options.connectTimeoutMs,
    commandTimeout: options.commandTimeoutMs,
    maxRetriesPerRequest: options.maxRetriesPerRequest,
    enableOfflineQueue: false,
    retryStrategy: () => null,
  };
}

export function createBullMqRedisConnectionOptions(
  options: RedisOptionsConfig,
): RedisOptions & { url: string } {
  return {
    ...createRedisConnectionOptions(options),
    url: options.url,
  };
}
