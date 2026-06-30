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

type TicketSlaReminderRow = {
  id: string;
  tenantId: string;
  number: string;
  title: string;
  createdBy: string;
  assignee: string | null;
};

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
  'collaboration.ticketSlaReminders': async ({ job, prisma, tenantId }) => {
    const result = await sendTicketSlaRemindersForTenant({
      actor: normalizeOptionalText(job.payload?.actor) ?? 'system',
      prisma,
      tenantId,
    });

    return {
      metadata: {
        ...result,
        source:
          normalizeOptionalText(job.payload?.source) ??
          'collaboration.tickets.sla',
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

export async function sendTicketSlaRemindersForTenant(input: {
  actor: string;
  prisma?: PrismaService;
  tenantId: string;
}): Promise<{
  dryRun: boolean;
  markedOverdue: number;
  notified: number;
  scanned: number;
}> {
  if (!input.prisma) {
    return {
      dryRun: true,
      markedOverdue: 0,
      notified: 0,
      scanned: 0,
    };
  }

  const now = new Date();
  const overdue = await input.prisma.ticket.findMany({
    where: {
      tenantId: input.tenantId,
      archivedAt: null,
      status: { in: ['new', 'processing', 'pending_confirmation'] },
      slaNotifiedAt: null,
      OR: buildTicketOverdueConditions(now),
    },
    select: {
      assignee: true,
      createdBy: true,
      id: true,
      number: true,
      tenantId: true,
      title: true,
    },
  });
  let notified = 0;

  for (const ticket of overdue) {
    await input.prisma.ticket.update({
      where: { tenantId_id: { tenantId: input.tenantId, id: ticket.id } },
      data: { slaBreached: true, slaNotifiedAt: now },
    });

    const delivered = await notifyTicketUser(input.prisma, ticket, {
      action: 'sla-overdue',
      actor: input.actor,
      content: `${ticket.number} ${ticket.title} is overdue.`,
    });
    if (delivered) {
      notified += 1;
    }
  }

  return {
    dryRun: false,
    markedOverdue: overdue.length,
    notified,
    scanned: overdue.length,
  };
}

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

function buildTicketOverdueConditions(now: Date) {
  return [
    {
      firstRespondedAt: null,
      responseDueAt: { lt: now },
    },
    {
      resolutionDueAt: { lt: now },
    },
    {
      dueAt: { lt: now },
    },
  ];
}

async function notifyTicketUser(
  prisma: PrismaService,
  ticket: TicketSlaReminderRow,
  event: { action: string; actor: string; content: string },
): Promise<boolean> {
  const username = normalizeOptionalText(ticket.assignee ?? ticket.createdBy);

  if (!username) {
    return false;
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return false;
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: {
      tenantId_userId: { tenantId: ticket.tenantId, userId: user.id },
    },
  });
  if (!membership || membership.status !== 'active') {
    return false;
  }

  const now = new Date();
  const notice = await prisma.systemNotice.create({
    data: {
      tenantId: ticket.tenantId,
      title: `Ticket ${event.action}: ${ticket.number}`,
      content: event.content,
      type: 'announcement',
      status: 'published',
      audience: 'admin',
      publishedAt: now,
      createdBy: event.actor,
    },
  });

  await prisma.systemNoticeDelivery.create({
    data: {
      tenantId: ticket.tenantId,
      noticeId: notice.id,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      title: notice.title,
      content: notice.content,
      type: notice.type,
      audience: notice.audience,
      providerStatus: 'sent',
      deliveredAt: now,
      sentAt: now,
    },
  });

  return true;
}

function normalizeOptionalText(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : undefined;
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
