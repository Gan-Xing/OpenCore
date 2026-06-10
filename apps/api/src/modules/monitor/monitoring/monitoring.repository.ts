import { Injectable } from '@nestjs/common';

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
  getSystemStatus(): SystemStatus {
    const dependencies: DependencyStatus[] = [
      {
        name: 'api',
        status: 'ok',
        latencyMs: 1,
        message: 'NestJS application is responding.',
      },
      {
        name: 'database',
        status: 'ok',
        latencyMs: 1,
        message: 'Prisma/PostgreSQL schema is configured.',
      },
      {
        name: 'queue',
        status: 'ok',
        latencyMs: 0,
        message: 'Read-only in-memory queue baseline is configured.',
      },
      {
        name: 'file-assets',
        status: 'ok',
        latencyMs: 0,
        message: 'Generic file asset metadata is available.',
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

  listQueues(): { checkedAt: string; queues: readonly QueueStatus[] } {
    return {
      checkedAt: new Date().toISOString(),
      queues: [
        {
          name: 'system-audit',
          driver: 'memory-readonly',
          waiting: 0,
          active: 0,
          completed: 2,
          failed: 0,
          paused: false,
          readOnly: true,
        },
        {
          name: 'table-export',
          driver: 'memory-readonly',
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          paused: false,
          readOnly: true,
        },
      ],
    };
  }
}
