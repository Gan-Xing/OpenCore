import {
  assertRedisKeyPrefixAllowed,
  createBullMqRedisConnectionOptions,
  createRedisKey,
  createRedisKeyFactory,
  normalizeRedisPrefix,
  normalizeTtlSeconds,
  readRedisOptionsFromEnv,
  REDIS_TTL_SECONDS,
  RedisService,
  type RedisClientLike,
} from './index';

describe('@opencore/redis', () => {
  it('normalizes options from env with safe defaults', () => {
    expect(readRedisOptionsFromEnv({})).toEqual({
      url: 'redis://localhost:6379/1',
      keyPrefix: 'opencore:',
      connectTimeoutMs: 1500,
      commandTimeoutMs: 1500,
      maxRetriesPerRequest: 1,
      bullmqQueuePrefix: 'opencore',
    });
    expect(
      readRedisOptionsFromEnv({
        REDIS_URL: ' redis://redis:6379/2 ',
        REDIS_KEY_PREFIX: 'tenant-a',
        BULLMQ_QUEUE_PREFIX: 'tenant-a',
        REDIS_CONNECT_TIMEOUT_MS: '250',
        REDIS_COMMAND_TIMEOUT_MS: '300',
        REDIS_MAX_RETRIES_PER_REQUEST: '0',
      }),
    ).toMatchObject({
      url: 'redis://redis:6379/2',
      keyPrefix: 'tenant-a:',
      bullmqQueuePrefix: 'tenant-a',
      connectTimeoutMs: 250,
      commandTimeoutMs: 300,
      maxRetriesPerRequest: 0,
    });
  });

  it('creates deterministic Redis keys and rejects unsafe prefixes', () => {
    expect(normalizeRedisPrefix('opencore')).toBe('opencore:');
    expect(createRedisKey('opencore:', 'Admin Shell', 42, true)).toBe(
      'opencore:admin-shell:42:true',
    );
    expect(
      createRedisKeyFactory('opencore:', 'system')('config', 'theme'),
    ).toBe('opencore:system:config:theme');
    expect(() => assertRedisKeyPrefixAllowed('nestweb:')).toThrow(
      'Redis key prefix must not reuse a NestWeb prefix.',
    );
  });

  it('normalizes TTL policy values', () => {
    expect(normalizeTtlSeconds(REDIS_TTL_SECONDS.medium)).toBe(300);
    expect(normalizeTtlSeconds(999, { maxTtlSeconds: 60 })).toBe(60);
    expect(normalizeTtlSeconds('never')).toBeUndefined();
    expect(normalizeTtlSeconds(0)).toBeUndefined();
  });

  it('builds Redis and BullMQ connection options without exposing credentials', () => {
    expect(
      createBullMqRedisConnectionOptions({
        url: 'redis://:secret@localhost:6379/1',
        keyPrefix: 'opencore:',
        bullmqQueuePrefix: 'opencore',
        connectTimeoutMs: 123,
        commandTimeoutMs: 456,
        maxRetriesPerRequest: 0,
      }),
    ).toMatchObject({
      url: 'redis://:secret@localhost:6379/1',
      lazyConnect: true,
      connectTimeout: 123,
      commandTimeout: 456,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
    });
  });

  it('reads and writes JSON cache values through RedisService', async () => {
    const client = createRedisClientMock();
    const service = new RedisService(
      {
        url: 'redis://localhost:6379/1',
        keyPrefix: 'opencore:',
        connectTimeoutMs: 1500,
        commandTimeoutMs: 1500,
        maxRetriesPerRequest: 1,
        bullmqQueuePrefix: 'opencore',
      },
      () => client,
    );
    const key = service.key('test', 'value');

    await service.connect();
    await service.setJson(key, { ok: true }, { ttlSeconds: 60 });

    await expect(service.getJson<{ ok: boolean }>(key)).resolves.toEqual({
      ok: true,
    });
    await expect(service.delete(key)).resolves.toBe(1);
    await expect(service.getJson(key)).resolves.toBeUndefined();
    await expect(
      service.scan('0', { match: 'opencore:*', count: 10 }),
    ).resolves.toEqual(['0', []]);
    await expect(service.ttl(key)).resolves.toBe(-2);
    await expect(service.type(key)).resolves.toBe('none');
    await expect(service.memoryUsage(key)).resolves.toBeNull();

    expect(client.setCalls).toEqual([
      { key, value: '{"ok":true}', mode: 'EX', ttlSeconds: 60 },
    ]);
  });
});

function createRedisClientMock(): RedisClientLike & {
  setCalls: Array<{
    key: string;
    value: string;
    mode?: 'EX';
    ttlSeconds?: number;
  }>;
} {
  const values = new Map<string, string>();
  const setCalls: Array<{
    key: string;
    value: string;
    mode?: 'EX';
    ttlSeconds?: number;
  }> = [];

  return {
    setCalls,
    connect: async () => undefined,
    disconnect: () => undefined,
    ping: async () => 'PONG',
    get: async (key) => values.get(key) ?? null,
    set: async (key, value, mode, ttlSeconds) => {
      setCalls.push({ key, value, mode, ttlSeconds });
      values.set(key, value);
      return 'OK';
    },
    del: async (...keys) => {
      let deleted = 0;

      for (const key of keys) {
        if (values.delete(key)) {
          deleted += 1;
        }
      }

      return deleted;
    },
    scan: async () => ['0', [...values.keys()]],
    ttl: async (key) => (values.has(key) ? -1 : -2),
    type: async (key) => (values.has(key) ? 'string' : 'none'),
    memoryUsage: async (key) =>
      values.has(key) ? Buffer.byteLength(values.get(key) ?? '') : null,
  };
}
