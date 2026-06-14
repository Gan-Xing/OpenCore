import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { statfsSync } from 'node:fs';
import { arch, cpus, freemem, loadavg, platform, totalmem } from 'node:os';
import {
  MONITOR_RUNTIME_DIAGNOSTICS,
  type MonitorRuntimeDiagnostics,
} from './monitor.runtime-diagnostics.service';
import { monitorQueueNames, type MonitorQueueName } from './monitor.records';

export type DependencyStatus = {
  name: string;
  status: 'degraded' | 'ok';
  latencyMs: number;
  message: string;
};

export type SystemStatus = {
  status: 'degraded' | 'ok';
  checkedAt: string;
  uptimeSeconds: number;
  runtime: RuntimeResourceStatus;
  dependencies: readonly DependencyStatus[];
};

export type RuntimeCpuStatus = {
  logicalCores: number;
  loadAverage1m: number;
  loadAverage5m: number;
  loadAverage15m: number;
  processUserMicros: number;
  processSystemMicros: number;
};

export type RuntimeMemoryStatus = {
  rssBytes: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  externalBytes: number;
  systemTotalBytes: number;
  systemFreeBytes: number;
  processRssRatio: number;
  systemUsedRatio: number;
};

export type RuntimeDiskStatus = {
  path: string;
  totalBytes: number;
  freeBytes: number;
  usedBytes: number;
  usedRatio: number;
};

export type RuntimeProcessStatus = {
  pid: number;
  nodeVersion: string;
  platform: string;
  arch: string;
  uptimeSeconds: number;
  startedAt: string;
};

export type RuntimeResourceStatus = {
  sampledAt: string;
  process: RuntimeProcessStatus;
  cpu: RuntimeCpuStatus;
  memory: RuntimeMemoryStatus;
  disk: RuntimeDiskStatus;
};

export type VersionInfo = {
  name: string;
  version: string;
  commit: string;
  buildTime: string;
  nodeVersion: string;
  runtime: string;
  environment: string;
  platform: string;
  arch: string;
  processId: number;
  uptimeSeconds: number;
  startedAt: string;
  timezone: string;
  deploymentId: string;
};

export type QueueStatus = {
  name: string;
  driver: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  paused: boolean;
  controlMode: 'managed' | 'unavailable';
};

export type QueueControlAction = 'pause' | 'resume';

export type QueueControlResult = {
  name: MonitorQueueName;
  action: QueueControlAction;
  appliedAt: string;
  queue: QueueStatus;
};

const processStartedAt = new Date().toISOString();

@Injectable()
export class MonitorRepository {
  constructor(
    @Inject(MONITOR_RUNTIME_DIAGNOSTICS)
    private readonly diagnostics: MonitorRuntimeDiagnostics,
  ) {}

  async getSystemStatus(): Promise<SystemStatus> {
    const [database, redis, queue, s3] = await Promise.all([
      this.diagnostics.checkDatabase(),
      this.diagnostics.checkRedis(),
      this.diagnostics.listQueues(),
      this.diagnostics.checkS3(),
    ]);
    const dependencies: DependencyStatus[] = [
      {
        name: 'api',
        status: 'ok',
        latencyMs: 1,
        message: 'NestJS application is responding.',
      },
      database,
      redis,
      {
        name: 'queue',
        status: queue.status,
        latencyMs: queue.latencyMs,
        message: queue.message,
      },
      s3,
      {
        name: 'file-assets',
        status: 'ok',
        latencyMs: 0,
        message: 'Generic file asset metadata uses the OpenCore S3 prefix.',
      },
    ];

    return {
      status: dependencies.every((dependency) => dependency.status === 'ok')
        ? 'ok'
        : 'degraded',
      checkedAt: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      runtime: createRuntimeResourceStatus(),
      dependencies,
    };
  }

  getVersionInfo(): VersionInfo {
    const commit =
      process.env.OPENCORE_GIT_COMMIT ?? process.env.GIT_COMMIT ?? 'unknown';
    const buildTime =
      process.env.OPENCORE_BUILD_TIME ?? process.env.BUILD_TIME ?? 'unknown';
    const deploymentId =
      process.env.OPENCORE_DEPLOYMENT_ID ??
      (commit !== 'unknown' || buildTime !== 'unknown'
        ? `${commit}:${buildTime}`
        : 'unknown');

    return {
      name: 'opencore-api',
      version:
        process.env.OPENCORE_APP_VERSION ??
        process.env.npm_package_version ??
        '0.0.0',
      commit,
      buildTime,
      nodeVersion: process.version,
      runtime: 'node',
      environment: process.env.NODE_ENV ?? 'development',
      platform: process.platform,
      arch: process.arch,
      processId: process.pid,
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt: processStartedAt,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
      deploymentId,
    };
  }

  async listQueues(): Promise<{
    checkedAt: string;
    queues: readonly QueueStatus[];
  }> {
    const queueProbe = await this.diagnostics.listQueues();

    return {
      checkedAt: new Date().toISOString(),
      queues: queueProbe.queues,
    };
  }

  async pauseQueue(name: string): Promise<QueueControlResult> {
    return this.controlQueue(assertMonitorQueueName(name), 'pause');
  }

  async resumeQueue(name: string): Promise<QueueControlResult> {
    return this.controlQueue(assertMonitorQueueName(name), 'resume');
  }

  private async controlQueue(
    name: MonitorQueueName,
    action: QueueControlAction,
  ): Promise<QueueControlResult> {
    try {
      const queue =
        action === 'pause'
          ? await this.diagnostics.pauseQueue(name)
          : await this.diagnostics.resumeQueue(name);

      return {
        name,
        action,
        appliedAt: new Date().toISOString(),
        queue,
      };
    } catch {
      throw new ServiceUnavailableException(
        'BullMQ queue control failed without exposing Redis details.',
      );
    }
  }
}

function createRuntimeResourceStatus(): RuntimeResourceStatus {
  const memory = process.memoryUsage();
  const systemTotalBytes = totalmem();
  const systemFreeBytes = freemem();
  const cpu = process.cpuUsage();
  const [loadAverage1m = 0, loadAverage5m = 0, loadAverage15m = 0] = loadavg();

  return {
    sampledAt: new Date().toISOString(),
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      platform: platform(),
      arch: arch(),
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt: processStartedAt,
    },
    cpu: {
      logicalCores: Math.max(1, cpus().length),
      loadAverage1m,
      loadAverage5m,
      loadAverage15m,
      processUserMicros: cpu.user,
      processSystemMicros: cpu.system,
    },
    memory: {
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
      externalBytes: memory.external,
      systemTotalBytes,
      systemFreeBytes,
      processRssRatio: safeRatio(memory.rss, systemTotalBytes),
      systemUsedRatio: safeRatio(
        systemTotalBytes - systemFreeBytes,
        systemTotalBytes,
      ),
    },
    disk: readDiskStatus(process.cwd()),
  };
}

function readDiskStatus(path: string): RuntimeDiskStatus {
  try {
    const stat = statfsSync(path);
    const totalBytes = stat.blocks * stat.bsize;
    const freeBytes = stat.bavail * stat.bsize;
    const usedBytes = Math.max(0, totalBytes - freeBytes);

    return {
      path,
      totalBytes,
      freeBytes,
      usedBytes,
      usedRatio: safeRatio(usedBytes, totalBytes),
    };
  } catch {
    return {
      path,
      totalBytes: 0,
      freeBytes: 0,
      usedBytes: 0,
      usedRatio: 0,
    };
  }
}

function safeRatio(numerator: number, denominator: number): number {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return 0;
  }

  return Number(Math.min(1, Math.max(0, numerator / denominator)).toFixed(6));
}

function assertMonitorQueueName(value: string): MonitorQueueName {
  if ((monitorQueueNames as readonly string[]).includes(value)) {
    return value as MonitorQueueName;
  }

  throw new BadRequestException(
    `Unsupported monitor queue "${value}". Allowed queues: ${monitorQueueNames.join(
      ', ',
    )}.`,
  );
}
