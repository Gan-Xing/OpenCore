import { Inject, Injectable } from '@nestjs/common';
import {
  RUNTIME_DIAGNOSTICS,
  type RuntimeDiagnostics,
} from './runtime-diagnostics.service';

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

@Injectable()
export class MonitoringRepository {
  constructor(
    @Inject(RUNTIME_DIAGNOSTICS)
    private readonly diagnostics: RuntimeDiagnostics,
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
    return {
      name: 'opencore-api',
      version: process.env.npm_package_version ?? '0.0.0',
      commit: process.env.GIT_COMMIT ?? 'unknown',
      buildTime: process.env.BUILD_TIME ?? 'unknown',
      nodeVersion: process.version,
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
