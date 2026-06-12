import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  createBullMqRedisConnectionOptions,
  createRedisClientAdapter,
  type RedisClientLike,
} from './redis-client';
import {
  readRedisOptionsFromEnv,
  type RedisOptionsConfig,
} from './redis-options';
import { normalizeTtlSeconds, type TtlInput } from './ttl';
import { createRedisKey } from './key';

export type RedisCacheSetOptions = {
  ttlSeconds?: TtlInput;
};

export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly client: RedisClientLike;

  constructor(
    readonly options: RedisOptionsConfig = readRedisOptionsFromEnv(),
    clientFactory: (
      options: RedisOptionsConfig,
    ) => RedisClientLike = createRedisClientAdapter,
  ) {
    this.client = clientFactory(options);
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    this.disconnect();
  }

  connect(): Promise<void> {
    return this.client.connect();
  }

  disconnect(): void {
    this.client.disconnect();
  }

  ping(): Promise<string> {
    return this.client.ping();
  }

  key(...parts: readonly (string | number | boolean)[]): string {
    return createRedisKey(this.options.keyPrefix, ...parts);
  }

  createBullMqConnectionOptions() {
    return createBullMqRedisConnectionOptions(this.options);
  }

  async getJson<T>(key: string): Promise<T | undefined> {
    const value = await this.client.get(key);

    if (value === null) {
      return undefined;
    }

    return JSON.parse(value) as T;
  }

  async setJson<T>(
    key: string,
    value: T,
    options: RedisCacheSetOptions = {},
  ): Promise<void> {
    const encoded = JSON.stringify(value);
    const ttlSeconds = normalizeTtlSeconds(options.ttlSeconds);

    if (ttlSeconds === undefined) {
      await this.client.set(key, encoded);
      return;
    }

    await this.client.set(key, encoded, 'EX', ttlSeconds);
  }

  async delete(...keys: readonly string[]): Promise<number> {
    if (keys.length === 0) {
      return 0;
    }

    return this.client.del(...keys);
  }
}
