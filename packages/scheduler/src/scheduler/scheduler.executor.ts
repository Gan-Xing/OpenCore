import { Injectable } from '@nestjs/common';
import { getRequestContext, runWithRequestContext } from '@opencore/core';
import type { PrismaService } from '@opencore/database';
import { schedulerBadRequest } from './scheduler.repository';
import type {
  SchedulerJobDefinitionRecord,
  SchedulerJobRegistryEntry,
} from './scheduler.records';

export type SchedulerJobExecutionInput = {
  actor: string;
  entry: SchedulerJobRegistryEntry;
  executionMode?: 'in-process' | 'worker';
  job: SchedulerJobDefinitionRecord;
  metadata?: Record<string, unknown>;
  prisma?: PrismaService;
  tenantId: string;
};

export type SchedulerJobHandlerInput = SchedulerJobExecutionInput & {
  attempt: number;
};

export type SchedulerJobHandlerResult = {
  metadata?: Record<string, unknown>;
};

export type SchedulerJobExecutionResult = {
  attempts: number;
  durationMs: number;
  error?: string;
  finishedAt: string;
  metadata: Record<string, unknown>;
  startedAt: string;
  status: 'completed' | 'failed';
};

export type SchedulerJobHandler = (
  input: SchedulerJobHandlerInput,
) => Promise<SchedulerJobHandlerResult> | SchedulerJobHandlerResult;

@Injectable()
export class SchedulerJobExecutor {
  private readonly handlers = defaultSchedulerJobHandlers;

  async execute(
    input: SchedulerJobExecutionInput,
  ): Promise<SchedulerJobExecutionResult> {
    const handler = this.handlers[input.entry.handlerKey];

    if (!handler) {
      throw schedulerBadRequest(
        'SCHEDULER_HANDLER_NOT_FOUND',
        `No scheduler handler registered: ${input.entry.handlerKey}`,
        { handlerKey: input.entry.handlerKey },
      );
    }

    const startedAtMs = Date.now();
    const startedAt = new Date(startedAtMs).toISOString();
    const maxAttempts = input.job.retryLimit + 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const result = await withTimeout(
          executeHandlerWithTenantContext(handler, input, attempt),
          input.job.timeoutSeconds,
          input.entry.handlerKey,
        );
        const finishedAtMs = Date.now();

        return {
          attempts: attempt,
          durationMs: finishedAtMs - startedAtMs,
          finishedAt: new Date(finishedAtMs).toISOString(),
          metadata: createExecutionMetadata(input, attempt, result.metadata),
          startedAt,
          status: 'completed',
        };
      } catch (error) {
        lastError = error;
      }
    }

    const finishedAtMs = Date.now();
    const errorMessage = normalizeExecutionError(lastError);

    return {
      attempts: maxAttempts,
      durationMs: finishedAtMs - startedAtMs,
      error: errorMessage,
      finishedAt: new Date(finishedAtMs).toISOString(),
      metadata: createExecutionMetadata(input, maxAttempts, {
        failed: true,
        lastError: errorMessage,
      }),
      startedAt,
      status: 'failed',
    };
  }
}

export const defaultSchedulerJobHandlers: Readonly<
  Record<string, SchedulerJobHandler>
> = {
  'maintenance.openapiDriftCheck': ({ job }) => ({
    metadata: {
      command:
        typeof job.payload?.command === 'string'
          ? job.payload.command
          : 'pnpm openapi:check',
      driftCheck: 'configured',
    },
  }),
  'maintenance.auditLogRetention': async ({ job, prisma, tenantId }) => {
    const retentionDays = normalizeRetentionDays(job.payload?.retentionDays);
    const cutoffBefore = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000,
    );
    const result = prisma
      ? await prisma.auditLog.deleteMany({
          where: { createdAt: { lt: cutoffBefore }, tenantId },
        })
      : { count: 0 };

    return {
      metadata: {
        affected: result.count,
        cutoffBefore: cutoffBefore.toISOString(),
        dryRun: !prisma,
        retentionDays,
      },
    };
  },
  'reports.refresh': async ({ job }) => {
    if (job.payload?.simulateFailure === true) {
      throw new Error('Report refresh failed by scheduler payload.');
    }

    const delayMs =
      typeof job.payload?.delayMs === 'number'
        ? Math.max(0, Math.min(job.payload.delayMs, 10_000))
        : 0;

    if (delayMs > 0) {
      await sleep(delayMs);
    }

    return {
      metadata: {
        refreshed: true,
        reportCode:
          typeof job.payload?.reportCode === 'string'
            ? job.payload.reportCode
            : 'runtime.health',
        source:
          typeof job.payload?.source === 'string'
            ? job.payload.source
            : 'monitor.status',
      },
    };
  },
};

function executeHandlerWithTenantContext(
  handler: SchedulerJobHandler,
  input: SchedulerJobExecutionInput,
  attempt: number,
): Promise<SchedulerJobHandlerResult> {
  const currentContext = getRequestContext();

  return runWithRequestContext(
    {
      requestId:
        currentContext?.requestId ??
        `scheduler:${input.tenantId}:${input.job.code}`,
      traceId:
        currentContext?.traceId ??
        `scheduler:${input.tenantId}:${input.job.id}`,
      actorUserId: currentContext?.actorUserId,
      accessMode: currentContext?.accessMode ?? 'tenant',
      membershipId: currentContext?.membershipId,
      tenantId: input.tenantId,
    },
    () => Promise.resolve(handler({ ...input, attempt })),
  );
}

function normalizeRetentionDays(value: unknown): number {
  const normalized = Number(value ?? 90);

  if (!Number.isInteger(normalized) || normalized < 0 || normalized > 3650) {
    throw new Error(
      'Audit log retentionDays must be an integer between 0 and 3650.',
    );
  }

  return normalized;
}

function createExecutionMetadata(
  input: SchedulerJobExecutionInput,
  attempts: number,
  resultMetadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return {
    ...(input.metadata ?? {}),
    actor: input.actor,
    adapter: input.job.adapter,
    attempts,
    executionMode: input.executionMode ?? 'in-process',
    handlerKey: input.entry.handlerKey,
    tenantId: input.tenantId,
    result: resultMetadata ?? {},
  };
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutSeconds: number,
  handlerKey: string,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(
            new Error(
              `Scheduler handler ${handlerKey} timed out after ${timeoutSeconds} seconds.`,
            ),
          );
        }, timeoutSeconds * 1000);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function normalizeExecutionError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
