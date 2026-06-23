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
import { createRedisKey, createTenantRedisKey } from './key';

export type RedisCacheSetOptions = {
  ttlSeconds?: TtlInput;
};

export type RedisScanOptions = {
  match?: string;
  count?: number;
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

  tenantKey(
    tenantId: string | number | boolean,
    ...parts: readonly (string | number | boolean)[]
  ): string {
    return createTenantRedisKey(this.options.keyPrefix, tenantId, ...parts);
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

  get(key: string): Promise<string | null> {
    return this.client.get(key);
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

  scan(
    cursor: string,
    options: RedisScanOptions = {},
  ): Promise<[cursor: string, keys: string[]]> {
    const args: string[] = [];

    if (options.match) {
      args.push('MATCH', options.match);
    }

    if (options.count !== undefined) {
      args.push('COUNT', String(options.count));
    }

    return this.client.scan(cursor, ...args);
  }

  ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  type(key: string): Promise<string> {
    return this.client.type(key);
  }

  memoryUsage(key: string): Promise<number | null> {
    return this.client.memoryUsage(key);
  }
}
