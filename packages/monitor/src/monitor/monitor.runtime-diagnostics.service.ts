import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '@opencore/database';
import {
  assertS3PrefixReadable,
  readFileStorageOptionsFromEnv,
} from '@opencore/file';
import {
  createBullMqRedisConnectionOptions,
  createRedisClient,
  readRedisOptionsFromEnv,
  type RedisOptionsConfig,
} from '@opencore/redis';
import { monitorQueueNames, type MonitorQueueName } from './monitor.records';
import type { DependencyStatus, QueueStatus } from './monitor.repository';

export type RuntimeQueueProbe = {
  status: DependencyStatus['status'];
  latencyMs: number;
  message: string;
  queues: readonly QueueStatus[];
};

export type MonitorRuntimeDiagnostics = {
  checkDatabase: () => Promise<DependencyStatus>;
  checkRedis: () => Promise<DependencyStatus>;
  checkS3: () => Promise<DependencyStatus>;
  listQueues: () => Promise<RuntimeQueueProbe>;
  pauseQueue: (name: MonitorQueueName) => Promise<QueueStatus>;
  resumeQueue: (name: MonitorQueueName) => Promise<QueueStatus>;
};

export const MONITOR_RUNTIME_DIAGNOSTICS = Symbol(
  'MONITOR_RUNTIME_DIAGNOSTICS',
);

const DATABASE_TIMEOUT_MS = 1_500;
const S3_TIMEOUT_MS = 2_000;

@Injectable()
export class MonitorRuntimeDiagnosticsService implements MonitorRuntimeDiagnostics {
  private readonly redisOptions = readRedisOptionsFromEnv();
  private readonly fileOptions = readFileStorageOptionsFromEnv();

  constructor(private readonly prisma: PrismaService) {}

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
      await assertS3PrefixReadable(this.fileOptions.s3, {
        timeoutMs: S3_TIMEOUT_MS,
      });

      return 'S3 bucket is reachable and the OpenCore object prefix is listable.';
    });
  }

  async listQueues(): Promise<RuntimeQueueProbe> {
    const startedAt = Date.now();

    try {
      const queues = await Promise.all(
        monitorQueueNames.map((name) => this.readQueue(name)),
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
          'BullMQ managed queue probe failed without exposing Redis details.',
        queues: monitorQueueNames.map((name) => ({
          name,
          driver: 'bullmq-redis-unavailable',
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          paused: false,
          controlMode: 'unavailable',
        })),
      };
    }
  }

  async pauseQueue(name: MonitorQueueName): Promise<QueueStatus> {
    return this.controlQueue(name, 'pause');
  }

  async resumeQueue(name: MonitorQueueName): Promise<QueueStatus> {
    return this.controlQueue(name, 'resume');
  }

  private async readQueue(name: MonitorQueueName): Promise<QueueStatus> {
    const queue = this.createQueue(name);

    try {
      return await this.readQueueStatus(name, queue);
    } finally {
      await queue.close();
    }
  }

  private async controlQueue(
    name: MonitorQueueName,
    action: 'pause' | 'resume',
  ): Promise<QueueStatus> {
    const queue = this.createQueue(name);

    try {
      if (action === 'pause') {
        await queue.pause();
      } else {
        await queue.resume();
      }

      return await this.readQueueStatus(name, queue);
    } finally {
      await queue.close();
    }
  }

  private async readQueueStatus(
    name: MonitorQueueName,
    queue: Queue,
  ): Promise<QueueStatus> {
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
    );
    const paused = await queue.isPaused();

    return {
      name,
      driver: 'bullmq-redis-managed',
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      paused,
      controlMode: 'managed',
    };
  }

  private createQueue(name: MonitorQueueName): Queue {
    const queue = new Queue(name, {
      connection: this.createBullMqRedisOptions(),
      prefix: this.redisOptions.bullmqQueuePrefix,
      skipMetasUpdate: true,
      skipVersionCheck: false,
    });
    queue.on('error', () => undefined);

    return queue;
  }

  private createRedisClient() {
    return createRedisClient(this.createRedisOptions());
  }

  private createBullMqRedisOptions() {
    return createBullMqRedisConnectionOptions(this.createRedisOptions());
  }

  private createRedisOptions(): RedisOptionsConfig {
    return {
      ...this.redisOptions,
      connectTimeoutMs: 1_500,
      commandTimeoutMs: 1_500,
      maxRetriesPerRequest: 1,
    };
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
