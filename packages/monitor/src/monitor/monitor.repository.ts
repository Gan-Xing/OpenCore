import { Inject, Injectable } from '@nestjs/common';
import {
  MONITOR_RUNTIME_DIAGNOSTICS,
  type MonitorRuntimeDiagnostics,
} from './monitor.runtime-diagnostics.service';

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
  dependencies: readonly DependencyStatus[];
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
  readOnly: true;
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
}
