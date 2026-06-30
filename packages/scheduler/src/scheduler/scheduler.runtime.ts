import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { runWithRequestContext } from '@opencore/core';
import { PrismaService } from '@opencore/database';
import { SchedulerService } from './scheduler.service';

export type SchedulerRuntimeTickSummary = {
  checkedAt: string;
  claimedCount: number;
  completedCount: number;
  dispatchedCount: number;
  failedCount: number;
  skippedCount: number;
  tenants: number;
};

type SchedulerRuntimeConfig = {
  actor: string;
  enabled: boolean;
  intervalMs: number;
  limit: number;
  queueNames: readonly string[];
};

const DEFAULT_RUNTIME_QUEUE_NAMES = ['collaboration'];

@Injectable()
export class SchedulerRuntimeService implements OnModuleInit, OnModuleDestroy {
  private readonly config = resolveSchedulerRuntimeConfig();
  private running = false;
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly scheduler: SchedulerService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    if (!this.config.enabled) {
      return;
    }

    void this.runOnce();
    this.timer = setInterval(() => void this.runOnce(), this.config.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async runOnce(now = new Date()): Promise<SchedulerRuntimeTickSummary> {
    const checkedAt = now.toISOString();
    const summary: SchedulerRuntimeTickSummary = {
      checkedAt,
      claimedCount: 0,
      completedCount: 0,
      dispatchedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      tenants: 0,
    };

    if (this.running) {
      summary.skippedCount = 1;
      return summary;
    }

    this.running = true;
    try {
      const tenantIds = await this.listScheduledTenantIds();
      summary.tenants = tenantIds.length;

      for (const tenantId of tenantIds) {
        const tenantSummary = await runWithRequestContext(
          {
            accessMode: 'tenant',
            requestId: `scheduler-runtime:${tenantId}:${checkedAt}`,
            tenantId,
            traceId: `scheduler-runtime:${tenantId}:${checkedAt}`,
          },
          () => this.runTenantQueues(tenantId, checkedAt),
        );
        summary.claimedCount += tenantSummary.claimedCount;
        summary.completedCount += tenantSummary.completedCount;
        summary.dispatchedCount += tenantSummary.dispatchedCount;
        summary.failedCount += tenantSummary.failedCount;
        summary.skippedCount += tenantSummary.skippedCount;
      }

      return summary;
    } finally {
      this.running = false;
    }
  }

  private async listScheduledTenantIds(): Promise<string[]> {
    const rows = await this.prisma.jobDefinition.findMany({
      where: {
        cron: { not: null },
        enabled: true,
        ...(this.config.queueNames.length === 0
          ? {}
          : { queueName: { in: [...this.config.queueNames] } }),
      },
      select: { tenantId: true },
    });

    return Array.from(new Set(rows.map((row) => row.tenantId))).sort();
  }

  private async runTenantQueues(
    tenantId: string,
    checkedAt: string,
  ): Promise<Omit<SchedulerRuntimeTickSummary, 'checkedAt' | 'tenants'>> {
    const queueNames =
      this.config.queueNames.length === 0
        ? [undefined]
        : this.config.queueNames;
    const summary = {
      claimedCount: 0,
      completedCount: 0,
      dispatchedCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };

    for (const queueName of queueNames) {
      const metadata = {
        source: 'scheduler.runtime',
        tenantId,
        runtimeQueueName: queueName ?? 'all',
      };
      const dispatch = await this.scheduler.dispatchDueJobs({
        actor: this.config.actor,
        limit: this.config.limit,
        metadata,
        now: checkedAt,
        queueName,
      });
      const worker = await this.scheduler.claimQueuedJobs({
        actor: this.config.actor,
        limit: this.config.limit,
        metadata: { ...metadata, dispatchedAt: checkedAt },
        queueName,
      });

      summary.dispatchedCount += dispatch.dispatchedCount;
      summary.skippedCount += dispatch.skippedCount + worker.skippedCount;
      summary.claimedCount += worker.claimedCount;
      summary.completedCount += worker.completedCount;
      summary.failedCount += worker.failedCount;
    }

    return summary;
  }
}

function resolveSchedulerRuntimeConfig(): SchedulerRuntimeConfig {
  return {
    actor:
      normalizeText(process.env.OPENCORE_SCHEDULER_RUNTIME_ACTOR) ??
      'scheduler-runtime',
    enabled: resolveRuntimeEnabled(),
    intervalMs: normalizeInteger(
      process.env.OPENCORE_SCHEDULER_RUNTIME_INTERVAL_MS,
      60_000,
      10_000,
      300_000,
    ),
    limit: normalizeInteger(
      process.env.OPENCORE_SCHEDULER_RUNTIME_LIMIT,
      20,
      1,
      100,
    ),
    queueNames: resolveRuntimeQueueNames(),
  };
}

function resolveRuntimeEnabled(): boolean {
  if (process.env.OPENCORE_SCHEDULER_RUNTIME_ENABLED === 'true') {
    return true;
  }

  if (process.env.OPENCORE_SCHEDULER_RUNTIME_DISABLED === 'true') {
    return false;
  }

  return process.env.NODE_ENV !== 'test';
}

function resolveRuntimeQueueNames(): readonly string[] {
  const raw = normalizeText(process.env.OPENCORE_SCHEDULER_RUNTIME_QUEUES);
  if (!raw) {
    return DEFAULT_RUNTIME_QUEUE_NAMES;
  }
  if (raw === '*') {
    return [];
  }

  return Array.from(
    new Set(
      raw
        .split(',')
        .map((value) => normalizeText(value))
        .filter(Boolean),
    ),
  ) as string[];
}

function normalizeInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const normalized = Number(value ?? fallback);

  if (!Number.isInteger(normalized) || normalized < min || normalized > max) {
    return fallback;
  }

  return normalized;
}

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}
