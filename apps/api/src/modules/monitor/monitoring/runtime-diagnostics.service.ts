import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis, { type RedisOptions } from 'ioredis';
import { Client as MinioClient } from 'minio';
import { PrismaService } from '../../../platform/database/prisma.service';
import {
  loadRuntimeConfig,
  type RuntimeConfig,
} from '../../../platform/config/runtime-config';
import type { DependencyStatus, QueueStatus } from './monitoring.repository';

type RuntimeQueueProbe = {
  status: DependencyStatus['status'];
  latencyMs: number;
  message: string;
  queues: readonly QueueStatus[];
};

export type RuntimeDiagnostics = {
  checkDatabase: () => Promise<DependencyStatus>;
  checkRedis: () => Promise<DependencyStatus>;
  checkS3: () => Promise<DependencyStatus>;
  listQueues: () => Promise<RuntimeQueueProbe>;
};

export const RUNTIME_DIAGNOSTICS = Symbol('RUNTIME_DIAGNOSTICS');

const QUEUE_NAMES = ['system-audit', 'table-export'] as const;
const DATABASE_TIMEOUT_MS = 1_500;
const REDIS_TIMEOUT_MS = 1_500;
const S3_TIMEOUT_MS = 2_000;

@Injectable()
export class RuntimeDiagnosticsService implements RuntimeDiagnostics {
  private readonly config: RuntimeConfig;

  constructor(private readonly prisma: PrismaService) {
    this.config = loadRuntimeConfig();
  }

  async checkDatabase(): Promise<DependencyStatus> {
    return measureDependency('database', async () => {
      await withTimeout(this.prisma.$queryRaw`SELECT 1`, DATABASE_TIMEOUT_MS);

      return 'PostgreSQL responded to a read-only health query.';
    });
  }

  async checkRedis(): Promise<DependencyStatus> {
    return measureDependency('redis', async () => {
      const redis = this.createRedisClient();

      try {
        await redis.connect();
        await redis.ping();

        return 'Redis responded to PING with the OpenCore key prefix configured.';
      } finally {
        redis.disconnect();
      }
    });
  }

  async checkS3(): Promise<DependencyStatus> {
    return measureDependency('s3', async () => {
      const client = this.createS3Client();
      const exists = await withTimeout(
        client.bucketExists(this.config.s3.bucket),
        S3_TIMEOUT_MS,
      );

      if (!exists) {
        throw new Error('OpenCore S3 bucket is missing');
      }

      await withTimeout(
        consumeObjectPrefix(
          client,
          this.config.s3.bucket,
          this.config.s3.prefix,
        ),
        S3_TIMEOUT_MS,
      );

      return 'S3 bucket is reachable and the OpenCore object prefix is listable.';
    });
  }

  async listQueues(): Promise<RuntimeQueueProbe> {
    const startedAt = Date.now();

    try {
      const queues = await Promise.all(
        QUEUE_NAMES.map((name) => this.readQueue(name)),
      );

      return {
        status: 'ok',
        latencyMs: Date.now() - startedAt,
        message:
          'BullMQ queues were read from Redis using the OpenCore queue prefix.',
        queues,
      };
    } catch {
      return {
        status: 'degraded',
        latencyMs: Date.now() - startedAt,
        message:
          'BullMQ read-only queue probe failed without exposing Redis details.',
        queues: QUEUE_NAMES.map((name) => ({
          name,
          driver: 'bullmq-redis-readonly-unavailable',
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          paused: false,
          readOnly: true,
        })),
      };
    }
  }

  private async readQueue(
    name: (typeof QUEUE_NAMES)[number],
  ): Promise<QueueStatus> {
    const queue = new Queue(name, {
      connection: this.createBullMqRedisOptions(),
      prefix: this.config.bullmq.queuePrefix,
      skipMetasUpdate: true,
      skipVersionCheck: false,
    });
    queue.on('error', () => undefined);

    try {
      const counts = await queue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
      );
      const paused = await queue.isPaused();

      return {
        name,
        driver: 'bullmq-redis-readonly',
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
        paused,
        readOnly: true,
      };
    } finally {
      await queue.close();
    }
  }

  private createRedisClient(): Redis {
    return new Redis(this.config.redis.url, this.createRedisOptions());
  }

  private createBullMqRedisOptions(): RedisOptions & { url: string } {
    return {
      connectTimeout: REDIS_TIMEOUT_MS,
      commandTimeout: REDIS_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      url: this.config.redis.url,
    };
  }

  private createRedisOptions(): RedisOptions {
    return {
      lazyConnect: true,
      connectTimeout: REDIS_TIMEOUT_MS,
      commandTimeout: REDIS_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    };
  }

  private createS3Client(): MinioClient {
    const endpoint = new URL(this.config.s3.endpoint);
    const useSSL = endpoint.protocol === 'https:';

    return new MinioClient({
      endPoint: endpoint.hostname,
      port: endpoint.port ? Number(endpoint.port) : useSSL ? 443 : 80,
      useSSL,
      accessKey: this.config.s3.accessKeyId,
      secretKey: this.config.s3.secretAccessKey,
      region: this.config.s3.region,
      pathStyle: this.config.s3.forcePathStyle,
      retryOptions: { disableRetry: true },
    });
  }
}

async function measureDependency(
  name: DependencyStatus['name'],
  check: () => Promise<string>,
): Promise<DependencyStatus> {
  const startedAt = Date.now();

  try {
    const message = await check();

    return {
      name,
      status: 'ok',
      latencyMs: Date.now() - startedAt,
      message,
    };
  } catch {
    return {
      name,
      status: 'degraded',
      latencyMs: Date.now() - startedAt,
      message: `${name} health probe failed without exposing runtime details.`,
    };
  }
}

function consumeObjectPrefix(
  client: MinioClient,
  bucket: string,
  prefix: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = client.listObjectsV2(bucket, prefix, true);

    stream.on('data', () => undefined);
    stream.on('error', reject);
    stream.on('end', resolve);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('runtime probe timeout'));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}
