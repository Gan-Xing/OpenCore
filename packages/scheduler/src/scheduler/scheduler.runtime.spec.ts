import { getRequestContext } from '@opencore/core';
import type { PrismaService } from '@opencore/database';
import type { SchedulerService } from './scheduler.service';
import { SchedulerRuntimeService } from './scheduler.runtime';

describe('SchedulerRuntimeService', () => {
  it('dispatches and claims scheduled collaboration jobs per tenant context', async () => {
    const calls: Array<{
      kind: 'claim' | 'dispatch';
      queueName?: string;
      tenantId?: string;
    }> = [];
    const scheduler = {
      claimQueuedJobs: jest.fn(async (body) => {
        calls.push({
          kind: 'claim',
          queueName: body.queueName,
          tenantId: getRequestContext()?.tenantId,
        });

        return {
          checkedAt: '2026-06-30T10:30:00.000Z',
          claimedCount: 1,
          completedCount: 1,
          failedCount: 0,
          runs: [],
          skippedCount: 0,
        };
      }),
      dispatchDueJobs: jest.fn(async (body) => {
        calls.push({
          kind: 'dispatch',
          queueName: body.queueName,
          tenantId: getRequestContext()?.tenantId,
        });

        return {
          checkedAt: '2026-06-30T10:30:00.000Z',
          dispatchedCount: 1,
          queuedRuns: [],
          skippedCount: 0,
        };
      }),
    } as unknown as SchedulerService;
    const prisma = {
      jobDefinition: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { tenantId: 'tenant_z' },
            { tenantId: 'tenant_a' },
            { tenantId: 'tenant_a' },
          ]),
      },
    } as unknown as PrismaService;
    const runtime = new SchedulerRuntimeService(scheduler, prisma);

    await expect(
      runtime.runOnce(new Date('2026-06-30T10:30:00.000Z')),
    ).resolves.toEqual({
      checkedAt: '2026-06-30T10:30:00.000Z',
      claimedCount: 2,
      completedCount: 2,
      dispatchedCount: 2,
      failedCount: 0,
      skippedCount: 0,
      tenants: 2,
    });

    expect(prisma.jobDefinition.findMany).toHaveBeenCalledWith({
      where: {
        cron: { not: null },
        enabled: true,
        queueName: { in: ['collaboration'] },
      },
      select: { tenantId: true },
    });
    expect(calls).toEqual([
      { kind: 'dispatch', queueName: 'collaboration', tenantId: 'tenant_a' },
      { kind: 'claim', queueName: 'collaboration', tenantId: 'tenant_a' },
      { kind: 'dispatch', queueName: 'collaboration', tenantId: 'tenant_z' },
      { kind: 'claim', queueName: 'collaboration', tenantId: 'tenant_z' },
    ]);
  });
});
