import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  SchedulerJobDefinitionRecord,
  SchedulerJobRegistryEntry,
} from './scheduler.records';

export type SchedulerJobExecutionInput = {
  actor: string;
  entry: SchedulerJobRegistryEntry;
  job: SchedulerJobDefinitionRecord;
  metadata?: Record<string, unknown>;
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
      throw new BadRequestException(
        `No scheduler handler registered: ${input.entry.handlerKey}`,
      );
    }

    const startedAtMs = Date.now();
    const startedAt = new Date(startedAtMs).toISOString();
    const maxAttempts = input.job.retryLimit + 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const result = await withTimeout(
          Promise.resolve(handler({ ...input, attempt })),
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
    executionMode: 'in-process',
    handlerKey: input.entry.handlerKey,
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
