import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getRequestContext } from '@opencore/core';
import {
  PrismaService,
  type PrismaTransactionClient,
} from '@opencore/database';
import {
  createBusinessDbPage,
  createBusinessPage,
  normalizeBusinessPageWindow,
} from '../core/business.repository';
import {
  BUSINESS_ASSIGNMENT_ACTIONS,
  BUSINESS_LIFECYCLE_STAGES,
  BUSINESS_POOL_STATUSES,
  BUSINESS_POOL_TARGET_TYPES,
  type AssignBusinessPoolEntryDto,
  type BusinessAssignmentAction,
  type BusinessAssignmentEventDto,
  type BusinessAssignmentEventPageDto,
  type BusinessAssignmentEventQueryDto,
  type BusinessDuplicateGroupDto,
  type BusinessDuplicateGroupPageDto,
  type BusinessLifecycleCustomerDto,
  type BusinessLifecycleCustomerPageDto,
  type BusinessLifecycleCustomerQueryDto,
  type BusinessLifecycleEventDto,
  type BusinessLifecycleEventPageDto,
  type BusinessLifecycleEventQueryDto,
  type BusinessLifecycleExportPreviewDto,
  type BusinessLifecycleExportQueryDto,
  type BusinessLifecycleStage,
  type BusinessLifecycleSummaryDto,
  type BusinessLifecycleTimelineEventDto,
  type BusinessLifecycleTimelinePageDto,
  type BusinessPoolEntryDto,
  type BusinessPoolEntryPageDto,
  type BusinessPoolEntryQueryDto,
  type BusinessPoolStatus,
  type BusinessPoolTargetType,
  type ChangeBusinessLifecycleStageDto,
  type ClaimBusinessPoolEntryDto,
  type EnterBusinessPoolDto,
  type RecycleBusinessPoolEntryDto,
} from './lifecycle.dto';
import {
  BusinessLifecycleRepository,
  lifecycleBadRequest,
  lifecycleNotFound,
} from './lifecycle.repository';

const ROOT_TENANT_ID = 'tenant_root';
const CSV_CONTENT_TYPE = 'text/csv;charset=utf-8';
const ACTIVE_POOL_STATUSES: BusinessPoolStatus[] = [
  'available',
  'claimed',
  'assigned',
  'recycled',
];
const OPEN_OPPORTUNITY_STAGES = ['qualification', 'proposal', 'negotiation'];

const LIFECYCLE_CUSTOMER_INCLUDE = {
  _count: {
    select: {
      contacts: true,
      contracts: true,
      opportunities: true,
      quotes: true,
      receivables: true,
    },
  },
};

type LifecycleCustomerRow = Prisma.BusinessCustomerGetPayload<{
  include: typeof LIFECYCLE_CUSTOMER_INCLUDE;
}>;
type PoolTargetSnapshot = {
  displayName: string;
  duplicateKey: string | null;
  owner: string;
  source: string;
};
type TimelineRow = BusinessLifecycleTimelineEventDto;

@Injectable()
export class PrismaLifecycleRepository extends BusinessLifecycleRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getSummary(): Promise<BusinessLifecycleSummaryDto> {
    const tenantId = resolveCurrentTenantId();
    const openReceivableWhere = {
      tenantId,
      status: { in: ['pending', 'partial', 'overdue'] },
    };
    const [
      poolByStatus,
      customers,
      lifecycleByStage,
      openOpportunities,
      activeContracts,
      openReceivableAmount,
      duplicateWarnings,
    ] = await Promise.all([
      this.prisma.businessPoolEntry.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: { tenantId, archivedAt: null },
      }),
      this.prisma.businessCustomer.count({
        where: { tenantId, archivedAt: null, status: { not: 'archived' } },
      }),
      this.prisma.businessCustomer.groupBy({
        by: ['lifecycleStage'],
        _count: { _all: true },
        where: { tenantId, archivedAt: null, status: { not: 'archived' } },
      }),
      this.prisma.salesOpportunity.count({
        where: {
          tenantId,
          archivedAt: null,
          stage: { in: OPEN_OPPORTUNITY_STAGES },
          customer: { archivedAt: null, status: { not: 'archived' } },
        },
      }),
      this.prisma.businessContract.count({
        where: { tenantId, archivedAt: null, status: 'active' },
      }),
      this.prisma.businessReceivable.aggregate({
        _sum: { amount: true, paidAmount: true },
        where: openReceivableWhere,
      }),
      this.countDuplicateWarnings(tenantId),
    ]);

    const poolCounts = new Map(
      poolByStatus.map((row) => [row.status, row._count._all]),
    );
    const receivableAmount =
      openReceivableAmount._sum.amount ?? new Prisma.Decimal(0);
    const paidAmount =
      openReceivableAmount._sum.paidAmount ?? new Prisma.Decimal(0);

    return {
      activeContracts,
      assignedPool: poolCounts.get('assigned') ?? 0,
      availablePool: poolCounts.get('available') ?? 0,
      claimedPool: poolCounts.get('claimed') ?? 0,
      customers,
      duplicateWarnings,
      lifecycleByStage: lifecycleByStage.map((row) => ({
        count: row._count._all,
        key: row.lifecycleStage,
      })),
      openOpportunities,
      receivableBalance: receivableAmount.minus(paidAmount).toFixed(2),
      recycledPool: poolCounts.get('recycled') ?? 0,
    };
  }

  async exportLifecycle(
    query: BusinessLifecycleExportQueryDto,
  ): Promise<BusinessLifecycleExportPreviewDto> {
    const resource = normalizeOptionalText(query.resource);
    if (!resource) {
      throw lifecycleBadRequest(
        'BUSINESS_LIFECYCLE_EXPORT_RESOURCE_REQUIRED',
        'business lifecycle export resource is required.',
      );
    }

    if (resource === 'pool') {
      const page = await this.listPoolEntries(query);
      return createCsvExportPreview(
        'opencore-business-pool.csv',
        [
          'targetType',
          'displayName',
          'source',
          'status',
          'owner',
          'assignedTo',
          'duplicateCount',
        ],
        page.items.map((row) => [
          row.targetType,
          row.displayName,
          row.source,
          row.status,
          row.owner ?? '',
          row.assignedTo ?? '',
          String(row.duplicateCount),
        ]),
      );
    }

    if (resource === 'customers') {
      const page = await this.listCustomers(query);
      return createCsvExportPreview(
        'opencore-business-lifecycle-customers.csv',
        [
          'number',
          'name',
          'owner',
          'status',
          'lifecycleStage',
          'opportunityCount',
          'contractCount',
          'receivableCount',
        ],
        page.items.map((row) => [
          row.number,
          row.name,
          row.owner,
          row.status,
          row.lifecycleStage,
          String(row.opportunityCount),
          String(row.contractCount),
          String(row.receivableCount),
        ]),
      );
    }

    if (resource === 'events') {
      const page = await this.listLifecycleEvents(query);
      return createCsvExportPreview(
        'opencore-business-lifecycle-events.csv',
        ['customerId', 'fromStage', 'toStage', 'actor', 'reason', 'createdAt'],
        page.items.map((row) => [
          row.customerId,
          row.fromStage ?? '',
          row.toStage,
          row.actor,
          row.reason ?? '',
          row.createdAt,
        ]),
      );
    }

    throw lifecycleBadRequest(
      'BUSINESS_LIFECYCLE_EXPORT_RESOURCE_INVALID',
      'business lifecycle export resource is invalid.',
      { resource },
    );
  }

  async listPoolEntries(
    query: BusinessPoolEntryQueryDto = {},
  ): Promise<BusinessPoolEntryPageDto> {
    const tenantId = resolveCurrentTenantId();
    const where = buildPoolWhere(tenantId, query);
    const page = normalizeBusinessPageWindow(query);
    const [rows, total, duplicateIndex] = await Promise.all([
      this.prisma.businessPoolEntry.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.businessPoolEntry.count({ where }),
      this.buildDuplicateIndex(tenantId),
    ]);

    return createBusinessDbPage(
      rows.map((row) => toPoolEntryRecord(row, duplicateIndex)),
      query,
      total,
    );
  }

  async enterPool(body: EnterBusinessPoolDto): Promise<BusinessPoolEntryDto> {
    const tenantId = resolveCurrentTenantId();
    const targetType = parseTargetType(body.targetType);
    const targetId = requireText(body.targetId, 'targetId');
    const actor = requireText(body.actor, 'actor');
    const reason = normalizeOptionalText(body.reason);
    const sourceOverride = normalizeOptionalText(body.source);
    const entry = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.businessPoolEntry.findFirst({
        where: {
          tenantId,
          targetType,
          targetId,
          archivedAt: null,
          status: { in: ACTIVE_POOL_STATUSES },
        },
      });
      if (existing) {
        throw lifecycleBadRequest(
          'BUSINESS_LIFECYCLE_POOL_ENTRY_EXISTS',
          'business target is already in assignment pool.',
          { targetId, targetType },
        );
      }

      const target = await loadTargetSnapshot(
        tx,
        tenantId,
        targetType,
        targetId,
      );
      const created = await tx.businessPoolEntry.create({
        data: {
          tenantId,
          targetType,
          targetId,
          displayName: target.displayName,
          source: sourceOverride ?? target.source,
          status: 'available',
          owner: target.owner,
          reason,
          duplicateKey: target.duplicateKey,
        },
      });
      await this.writeAssignmentEvent(tx, tenantId, {
        action: 'enter_pool',
        actor,
        fromOwner: target.owner,
        poolEntryId: created.id,
        reason,
        targetId,
        targetType,
      });
      await this.writeAudit(
        tx,
        tenantId,
        targetType,
        targetId,
        'enter-pool',
        actor,
        {
          poolEntryId: created.id,
        },
      );

      return created;
    });
    const duplicateIndex = await this.buildDuplicateIndex(tenantId);

    return toPoolEntryRecord(entry, duplicateIndex);
  }

  async claimPoolEntry(
    id: string,
    body: ClaimBusinessPoolEntryDto,
  ): Promise<BusinessPoolEntryDto> {
    const tenantId = resolveCurrentTenantId();
    const actor = requireText(body.actor, 'actor');
    const reason = normalizeOptionalText(body.reason);
    const entry = await this.prisma.$transaction(async (tx) => {
      const existing = await lockPoolEntry(tx, tenantId, id);
      assertPoolEntryAssignable(existing);
      const fromOwner = await updateTargetOwner(
        tx,
        tenantId,
        existing.targetType as BusinessPoolTargetType,
        existing.targetId,
        actor,
      );
      const updated = await tx.businessPoolEntry.update({
        where: { tenantId_id: { tenantId, id } },
        data: {
          assignedAt: null,
          assignedBy: null,
          assignedTo: null,
          claimedAt: new Date(),
          claimedBy: actor,
          owner: actor,
          reason,
          recycledAt: null,
          status: 'claimed',
        },
      });
      await tx.businessOwnerTransfer.create({
        data: {
          tenantId,
          targetType: updated.targetType,
          targetId: updated.targetId,
          fromOwner,
          toOwner: actor,
          actor,
          reason,
        },
      });
      await this.writeAssignmentEvent(tx, tenantId, {
        action: 'claim',
        actor,
        fromOwner,
        poolEntryId: updated.id,
        reason,
        targetId: updated.targetId,
        targetType: updated.targetType as BusinessPoolTargetType,
        toOwner: actor,
      });
      await this.writeAudit(
        tx,
        tenantId,
        updated.targetType as BusinessPoolTargetType,
        updated.targetId,
        'claim-pool-entry',
        actor,
        { fromOwner, poolEntryId: updated.id, toOwner: actor },
      );

      return updated;
    });
    const duplicateIndex = await this.buildDuplicateIndex(tenantId);

    return toPoolEntryRecord(entry, duplicateIndex);
  }

  async assignPoolEntry(
    id: string,
    body: AssignBusinessPoolEntryDto,
  ): Promise<BusinessPoolEntryDto> {
    return this.changePoolOwner(id, body, 'assign');
  }

  async transferPoolEntry(
    id: string,
    body: AssignBusinessPoolEntryDto,
  ): Promise<BusinessPoolEntryDto> {
    return this.changePoolOwner(id, body, 'transfer');
  }

  async recyclePoolEntry(
    id: string,
    body: RecycleBusinessPoolEntryDto,
  ): Promise<BusinessPoolEntryDto> {
    const tenantId = resolveCurrentTenantId();
    const actor = requireText(body.actor, 'actor');
    const reason = normalizeOptionalText(body.reason);
    const entry = await this.prisma.$transaction(async (tx) => {
      const existing = await lockPoolEntry(tx, tenantId, id);
      assertPoolEntryOpen(existing);
      const updated = await tx.businessPoolEntry.update({
        where: { tenantId_id: { tenantId, id } },
        data: {
          assignedAt: null,
          assignedBy: null,
          assignedTo: null,
          claimedAt: null,
          claimedBy: null,
          owner: null,
          reason,
          recycledAt: new Date(),
          status: 'recycled',
        },
      });
      await this.writeAssignmentEvent(tx, tenantId, {
        action: 'recycle',
        actor,
        fromOwner: existing.owner,
        poolEntryId: updated.id,
        reason,
        targetId: updated.targetId,
        targetType: updated.targetType as BusinessPoolTargetType,
      });
      await this.writeAudit(
        tx,
        tenantId,
        updated.targetType as BusinessPoolTargetType,
        updated.targetId,
        'recycle-pool-entry',
        actor,
        { fromOwner: existing.owner, poolEntryId: updated.id },
      );

      return updated;
    });
    const duplicateIndex = await this.buildDuplicateIndex(tenantId);

    return toPoolEntryRecord(entry, duplicateIndex);
  }

  async listCustomers(
    query: BusinessLifecycleCustomerQueryDto = {},
  ): Promise<BusinessLifecycleCustomerPageDto> {
    const tenantId = resolveCurrentTenantId();
    const where = buildLifecycleCustomerWhere(tenantId, query);
    const page = normalizeBusinessPageWindow(query);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.businessCustomer.findMany({
        where,
        include: LIFECYCLE_CUSTOMER_INCLUDE,
        orderBy: [
          { lifecycleChangedAt: 'desc' },
          { createdAt: 'desc' },
          { id: 'asc' },
        ],
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.businessCustomer.count({ where }),
    ]);

    return createBusinessDbPage(
      rows.map(toLifecycleCustomerRecord),
      query,
      total,
    );
  }

  async changeCustomerStage(
    id: string,
    body: ChangeBusinessLifecycleStageDto,
  ): Promise<BusinessLifecycleCustomerDto> {
    const tenantId = resolveCurrentTenantId();
    const toStage = parseLifecycleStage(body.toStage);
    const actor = requireText(body.actor, 'actor');
    const reason = normalizeOptionalText(body.reason);
    const customer = await this.prisma.$transaction(async (tx) => {
      const existing = await lockCustomer(tx, tenantId, id);
      const changedAt = new Date();
      const updated = await tx.businessCustomer.update({
        where: { tenantId_id: { tenantId, id } },
        data: {
          lifecycleChangedAt: changedAt,
          lifecycleReason: reason,
          lifecycleStage: toStage,
          status: deriveCustomerStatus(existing.status, toStage),
        },
        include: LIFECYCLE_CUSTOMER_INCLUDE,
      });
      await tx.businessLifecycleEvent.create({
        data: {
          tenantId,
          customerId: id,
          fromStage: existing.lifecycleStage,
          toStage,
          reason,
          actor,
          detail: toInputJson({ fromStage: existing.lifecycleStage, toStage }),
          createdAt: changedAt,
        },
      });
      await this.writeAudit(
        tx,
        tenantId,
        'customer',
        id,
        'change-lifecycle-stage',
        actor,
        {
          fromStage: existing.lifecycleStage,
          toStage,
        },
      );

      return updated;
    });

    return toLifecycleCustomerRecord(customer);
  }

  async listCustomerTimeline(
    customerId: string,
    query: BusinessLifecycleEventQueryDto = {},
  ): Promise<BusinessLifecycleTimelinePageDto> {
    const tenantId = resolveCurrentTenantId();
    await this.ensureCustomerExists(tenantId, customerId);
    const [
      lifecycleEvents,
      assignmentEvents,
      ownerTransfers,
      followUps,
      audits,
    ] = await Promise.all([
      this.prisma.businessLifecycleEvent.findMany({
        where: { tenantId, customerId },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.businessAssignmentEvent.findMany({
        where: { tenantId, targetType: 'customer', targetId: customerId },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.businessOwnerTransfer.findMany({
        where: { tenantId, targetType: 'customer', targetId: customerId },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.businessFollowUp.findMany({
        where: { tenantId, targetType: 'customer', targetId: customerId },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.businessAuditEvent.findMany({
        where: { tenantId, targetType: 'customer', targetId: customerId },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
    ]);

    const rows: TimelineRow[] = [
      ...lifecycleEvents.map((event) => ({
        actor: event.actor,
        createdAt: event.createdAt.toISOString(),
        eventType: 'lifecycle' as const,
        fromValue: event.fromStage ?? undefined,
        id: event.id,
        reason: event.reason ?? undefined,
        title: 'change-lifecycle-stage',
        toValue: event.toStage,
      })),
      ...assignmentEvents.map((event) => ({
        actor: event.actor,
        createdAt: event.createdAt.toISOString(),
        eventType: 'assignment' as const,
        fromValue: event.fromOwner ?? undefined,
        id: event.id,
        reason: event.reason ?? undefined,
        title: event.action,
        toValue: event.toOwner ?? undefined,
      })),
      ...ownerTransfers.map((event) => ({
        actor: event.actor,
        createdAt: event.createdAt.toISOString(),
        eventType: 'owner_transfer' as const,
        fromValue: event.fromOwner ?? undefined,
        id: event.id,
        reason: event.reason ?? undefined,
        title: 'owner-transfer',
        toValue: event.toOwner,
      })),
      ...followUps.map((event) => ({
        actor: event.createdBy,
        createdAt: event.createdAt.toISOString(),
        eventType: 'follow_up' as const,
        id: event.id,
        reason: event.outcome ?? undefined,
        title: event.content,
      })),
      ...audits.map((event) => ({
        actor: event.actor,
        createdAt: event.createdAt.toISOString(),
        eventType: 'audit' as const,
        id: event.id,
        title: event.action,
      })),
    ]
      .filter((row) => !query.actor || row.actor === query.actor)
      .sort((left, right) =>
        left.createdAt === right.createdAt
          ? left.id.localeCompare(right.id)
          : right.createdAt.localeCompare(left.createdAt),
      );

    return createBusinessPage(rows, query);
  }

  async listAssignmentEvents(
    query: BusinessAssignmentEventQueryDto = {},
  ): Promise<BusinessAssignmentEventPageDto> {
    const tenantId = resolveCurrentTenantId();
    const where = buildAssignmentEventWhere(tenantId, query);
    const page = normalizeBusinessPageWindow(query);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.businessAssignmentEvent.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.businessAssignmentEvent.count({ where }),
    ]);

    return createBusinessDbPage(
      rows.map(toAssignmentEventRecord),
      query,
      total,
    );
  }

  async listLifecycleEvents(
    query: BusinessLifecycleEventQueryDto = {},
  ): Promise<BusinessLifecycleEventPageDto> {
    const tenantId = resolveCurrentTenantId();
    const where = buildLifecycleEventWhere(tenantId, query);
    const page = normalizeBusinessPageWindow(query);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.businessLifecycleEvent.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.businessLifecycleEvent.count({ where }),
    ]);

    return createBusinessDbPage(rows.map(toLifecycleEventRecord), query, total);
  }

  async listDuplicateGroups(
    query: BusinessPoolEntryQueryDto = {},
  ): Promise<BusinessDuplicateGroupPageDto> {
    const tenantId = resolveCurrentTenantId();
    const where = {
      ...buildPoolWhere(tenantId, query),
      duplicateKey: { not: null },
    } satisfies Prisma.BusinessPoolEntryWhereInput;
    const [rows, duplicateIndex] = await Promise.all([
      this.prisma.businessPoolEntry.findMany({
        where,
        orderBy: [
          { duplicateKey: 'asc' },
          { createdAt: 'desc' },
          { id: 'asc' },
        ],
      }),
      this.buildDuplicateIndex(tenantId),
    ]);
    const groups = new Map<string, BusinessPoolEntryDto[]>();
    for (const row of rows) {
      if (!row.duplicateKey) continue;
      const duplicateCount = duplicateIndex.get(row.duplicateKey) ?? 1;
      if (duplicateCount < 2) continue;
      const entries = groups.get(row.duplicateKey) ?? [];
      entries.push(toPoolEntryRecord(row, duplicateIndex));
      groups.set(row.duplicateKey, entries);
    }
    const duplicateGroups: BusinessDuplicateGroupDto[] = [...groups.entries()]
      .map(([duplicateKey, entries]) => ({
        count: duplicateIndex.get(duplicateKey) ?? entries.length,
        duplicateKey,
        entries,
      }))
      .sort((left, right) =>
        right.count === left.count
          ? left.duplicateKey.localeCompare(right.duplicateKey)
          : right.count - left.count,
      );

    return createBusinessPage(duplicateGroups, query);
  }

  private async changePoolOwner(
    id: string,
    body: AssignBusinessPoolEntryDto,
    action: 'assign' | 'transfer',
  ): Promise<BusinessPoolEntryDto> {
    const tenantId = resolveCurrentTenantId();
    const actor = requireText(body.actor, 'actor');
    const toOwner = requireText(body.toOwner, 'toOwner');
    const reason = normalizeOptionalText(body.reason);
    const entry = await this.prisma.$transaction(async (tx) => {
      const existing = await lockPoolEntry(tx, tenantId, id);
      assertPoolEntryOpen(existing);
      const fromOwner = await updateTargetOwner(
        tx,
        tenantId,
        existing.targetType as BusinessPoolTargetType,
        existing.targetId,
        toOwner,
      );
      const updated = await tx.businessPoolEntry.update({
        where: { tenantId_id: { tenantId, id } },
        data: {
          assignedAt: new Date(),
          assignedBy: actor,
          assignedTo: toOwner,
          claimedAt: null,
          claimedBy: null,
          owner: toOwner,
          reason,
          recycledAt: null,
          status: 'assigned',
        },
      });
      await tx.businessOwnerTransfer.create({
        data: {
          tenantId,
          targetType: updated.targetType,
          targetId: updated.targetId,
          fromOwner,
          toOwner,
          actor,
          reason,
        },
      });
      await this.writeAssignmentEvent(tx, tenantId, {
        action,
        actor,
        fromOwner,
        poolEntryId: updated.id,
        reason,
        targetId: updated.targetId,
        targetType: updated.targetType as BusinessPoolTargetType,
        toOwner,
      });
      await this.writeAudit(
        tx,
        tenantId,
        updated.targetType as BusinessPoolTargetType,
        updated.targetId,
        `${action}-pool-entry`,
        actor,
        { fromOwner, poolEntryId: updated.id, toOwner },
      );

      return updated;
    });
    const duplicateIndex = await this.buildDuplicateIndex(tenantId);

    return toPoolEntryRecord(entry, duplicateIndex);
  }

  private async ensureCustomerExists(
    tenantId: string,
    customerId: string,
  ): Promise<void> {
    const id = requireText(customerId, 'customerId');
    const customer = await this.prisma.businessCustomer.findFirst({
      where: { tenantId, id, archivedAt: null, status: { not: 'archived' } },
      select: { id: true },
    });
    if (!customer) {
      throw lifecycleNotFound(
        'BUSINESS_LIFECYCLE_CUSTOMER_NOT_FOUND',
        'business lifecycle customer not found.',
        { id },
      );
    }
  }

  private async buildDuplicateIndex(
    tenantId: string,
  ): Promise<Map<string, number>> {
    const [leads, customers] = await Promise.all([
      this.prisma.salesLead.findMany({
        where: {
          tenantId,
          archivedAt: null,
          status: { notIn: ['archived', 'converted'] },
        },
        select: {
          company: true,
          email: true,
          mobile: true,
          name: true,
        },
      }),
      this.prisma.businessCustomer.findMany({
        where: { tenantId, archivedAt: null, status: { not: 'archived' } },
        select: {
          email: true,
          name: true,
          phone: true,
        },
      }),
    ]);
    const counts = new Map<string, number>();
    for (const lead of leads) {
      const key = duplicateKeyForLead(lead);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const customer of customers) {
      const key = duplicateKeyForCustomer(customer);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return counts;
  }

  private async countDuplicateWarnings(tenantId: string): Promise<number> {
    const duplicateIndex = await this.buildDuplicateIndex(tenantId);
    const entries = await this.prisma.businessPoolEntry.findMany({
      where: { tenantId, archivedAt: null, duplicateKey: { not: null } },
      select: { duplicateKey: true },
    });

    return entries.filter(
      (entry) =>
        entry.duplicateKey && (duplicateIndex.get(entry.duplicateKey) ?? 0) > 1,
    ).length;
  }

  private async writeAssignmentEvent(
    tx: PrismaTransactionClient,
    tenantId: string,
    input: {
      action: BusinessAssignmentAction;
      actor: string;
      fromOwner?: string | null;
      poolEntryId?: string | null;
      reason?: string | null;
      targetId: string;
      targetType: BusinessPoolTargetType;
      toOwner?: string | null;
    },
  ): Promise<void> {
    await tx.businessAssignmentEvent.create({
      data: {
        tenantId,
        targetType: input.targetType,
        targetId: input.targetId,
        action: input.action,
        fromOwner: normalizeOptionalText(input.fromOwner ?? undefined),
        toOwner: normalizeOptionalText(input.toOwner ?? undefined),
        actor: normalizeOptionalText(input.actor) ?? 'system',
        reason: normalizeOptionalText(input.reason ?? undefined),
        poolEntryId: normalizeOptionalText(input.poolEntryId ?? undefined),
      },
    });
  }

  private async writeAudit(
    tx: PrismaTransactionClient,
    tenantId: string,
    targetType: BusinessPoolTargetType,
    targetId: string,
    action: string,
    actor: string,
    detail: Record<string, unknown> = {},
  ): Promise<void> {
    await tx.businessAuditEvent.create({
      data: {
        tenantId,
        targetType,
        targetId,
        action,
        actor: normalizeOptionalText(actor) ?? 'system',
        detail: toInputJson(detail),
      },
    });
  }
}

function resolveCurrentTenantId(): string {
  return getRequestContext()?.tenantId ?? ROOT_TENANT_ID;
}

async function loadTargetSnapshot(
  tx: PrismaTransactionClient,
  tenantId: string,
  targetType: BusinessPoolTargetType,
  targetId: string,
): Promise<PoolTargetSnapshot> {
  if (targetType === 'lead') {
    const lead = await tx.salesLead.findFirst({
      where: {
        tenantId,
        id: targetId,
        archivedAt: null,
        status: { notIn: ['archived', 'converted'] },
      },
    });
    if (!lead) {
      throw lifecycleNotFound(
        'BUSINESS_LIFECYCLE_TARGET_NOT_FOUND',
        'business lifecycle target not found.',
        { targetId, targetType },
      );
    }

    return {
      displayName: lead.company ? `${lead.company} / ${lead.name}` : lead.name,
      duplicateKey: duplicateKeyForLead(lead),
      owner: lead.owner,
      source: lead.source,
    };
  }

  const customer = await tx.businessCustomer.findFirst({
    where: {
      tenantId,
      id: targetId,
      archivedAt: null,
      status: { not: 'archived' },
    },
  });
  if (!customer) {
    throw lifecycleNotFound(
      'BUSINESS_LIFECYCLE_TARGET_NOT_FOUND',
      'business lifecycle target not found.',
      { targetId, targetType },
    );
  }

  return {
    displayName: customer.name,
    duplicateKey: duplicateKeyForCustomer(customer),
    owner: customer.owner,
    source: customer.source,
  };
}

async function lockPoolEntry(
  tx: PrismaTransactionClient,
  tenantId: string,
  id: string,
): Promise<Prisma.BusinessPoolEntryGetPayload<Record<string, never>>> {
  const entry = await tx.businessPoolEntry.findFirst({
    where: { tenantId, id, archivedAt: null },
  });
  if (!entry) {
    throw lifecycleNotFound(
      'BUSINESS_LIFECYCLE_POOL_ENTRY_NOT_FOUND',
      'business pool entry not found.',
      { id },
    );
  }

  return entry;
}

async function lockCustomer(
  tx: PrismaTransactionClient,
  tenantId: string,
  id: string,
): Promise<Pick<LifecycleCustomerRow, 'id' | 'lifecycleStage' | 'status'>> {
  const customer = await tx.businessCustomer.findFirst({
    where: { tenantId, id, archivedAt: null, status: { not: 'archived' } },
    select: { id: true, lifecycleStage: true, status: true },
  });
  if (!customer) {
    throw lifecycleNotFound(
      'BUSINESS_LIFECYCLE_CUSTOMER_NOT_FOUND',
      'business lifecycle customer not found.',
      { id },
    );
  }

  return customer;
}

async function updateTargetOwner(
  tx: PrismaTransactionClient,
  tenantId: string,
  targetType: BusinessPoolTargetType,
  targetId: string,
  toOwner: string,
): Promise<string> {
  if (targetType === 'lead') {
    const lead = await tx.salesLead.findFirst({
      where: {
        tenantId,
        id: targetId,
        archivedAt: null,
        status: { notIn: ['archived', 'converted'] },
      },
    });
    if (!lead) {
      throw lifecycleNotFound(
        'BUSINESS_LIFECYCLE_TARGET_NOT_FOUND',
        'business lifecycle target not found.',
        { targetId, targetType },
      );
    }
    await tx.salesLead.update({
      where: { tenantId_id: { tenantId, id: targetId } },
      data: { owner: toOwner },
    });

    return lead.owner;
  }

  const customer = await tx.businessCustomer.findFirst({
    where: {
      tenantId,
      id: targetId,
      archivedAt: null,
      status: { not: 'archived' },
    },
  });
  if (!customer) {
    throw lifecycleNotFound(
      'BUSINESS_LIFECYCLE_TARGET_NOT_FOUND',
      'business lifecycle target not found.',
      { targetId, targetType },
    );
  }
  await tx.businessCustomer.update({
    where: { tenantId_id: { tenantId, id: targetId } },
    data: { owner: toOwner },
  });

  return customer.owner;
}

function buildPoolWhere(
  tenantId: string,
  query: BusinessPoolEntryQueryDto,
): Prisma.BusinessPoolEntryWhereInput {
  const targetType =
    query.targetType === undefined
      ? undefined
      : parseTargetType(query.targetType);
  const status =
    query.status === undefined ? undefined : parsePoolStatus(query.status);
  const keyword = normalizeOptionalText(query.keyword);

  return {
    tenantId,
    archivedAt: null,
    ...(targetType === undefined ? {} : { targetType }),
    ...(status === undefined ? {} : { status }),
    ...(normalizeOptionalText(query.owner) === undefined
      ? {}
      : { owner: normalizeOptionalText(query.owner) }),
    ...(normalizeOptionalText(query.assignedTo) === undefined
      ? {}
      : { assignedTo: normalizeOptionalText(query.assignedTo) }),
    ...(keyword === undefined
      ? {}
      : {
          OR: [
            { displayName: { contains: keyword, mode: 'insensitive' } },
            { source: { contains: keyword, mode: 'insensitive' } },
            { targetId: { contains: keyword, mode: 'insensitive' } },
          ],
        }),
  };
}

function buildLifecycleCustomerWhere(
  tenantId: string,
  query: BusinessLifecycleCustomerQueryDto,
): Prisma.BusinessCustomerWhereInput {
  const lifecycleStage =
    query.lifecycleStage === undefined
      ? undefined
      : parseLifecycleStage(query.lifecycleStage);
  const keyword = normalizeOptionalText(query.keyword);

  return {
    tenantId,
    archivedAt: null,
    status: { not: 'archived' },
    ...(lifecycleStage === undefined ? {} : { lifecycleStage }),
    ...(normalizeOptionalText(query.owner) === undefined
      ? {}
      : { owner: normalizeOptionalText(query.owner) }),
    ...(keyword === undefined
      ? {}
      : {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { number: { contains: keyword, mode: 'insensitive' } },
            { owner: { contains: keyword, mode: 'insensitive' } },
          ],
        }),
  };
}

function buildAssignmentEventWhere(
  tenantId: string,
  query: BusinessAssignmentEventQueryDto,
): Prisma.BusinessAssignmentEventWhereInput {
  const targetType =
    query.targetType === undefined
      ? undefined
      : parseTargetType(query.targetType);
  const action =
    query.action === undefined
      ? undefined
      : parseAssignmentAction(query.action);

  return {
    tenantId,
    ...(targetType === undefined ? {} : { targetType }),
    ...(normalizeOptionalText(query.targetId) === undefined
      ? {}
      : { targetId: normalizeOptionalText(query.targetId) }),
    ...(action === undefined ? {} : { action }),
    ...(normalizeOptionalText(query.actor) === undefined
      ? {}
      : { actor: normalizeOptionalText(query.actor) }),
  };
}

function buildLifecycleEventWhere(
  tenantId: string,
  query: BusinessLifecycleEventQueryDto,
): Prisma.BusinessLifecycleEventWhereInput {
  const toStage =
    query.toStage === undefined
      ? undefined
      : parseLifecycleStage(query.toStage);

  return {
    tenantId,
    ...(normalizeOptionalText(query.customerId) === undefined
      ? {}
      : { customerId: normalizeOptionalText(query.customerId) }),
    ...(toStage === undefined ? {} : { toStage }),
    ...(normalizeOptionalText(query.actor) === undefined
      ? {}
      : { actor: normalizeOptionalText(query.actor) }),
  };
}

function toPoolEntryRecord(
  row: Prisma.BusinessPoolEntryGetPayload<Record<string, never>>,
  duplicateIndex: ReadonlyMap<string, number>,
): BusinessPoolEntryDto {
  const duplicateCount = row.duplicateKey
    ? Math.max((duplicateIndex.get(row.duplicateKey) ?? 1) - 1, 0)
    : 0;

  return {
    archivedAt: row.archivedAt?.toISOString(),
    assignedAt: row.assignedAt?.toISOString(),
    assignedBy: row.assignedBy ?? undefined,
    assignedTo: row.assignedTo ?? undefined,
    claimedAt: row.claimedAt?.toISOString(),
    claimedBy: row.claimedBy ?? undefined,
    createdAt: row.createdAt.toISOString(),
    displayName: row.displayName,
    duplicateCount,
    duplicateKey: row.duplicateKey ?? undefined,
    id: row.id,
    owner: row.owner ?? undefined,
    reason: row.reason ?? undefined,
    recycledAt: row.recycledAt?.toISOString(),
    source: row.source,
    status: row.status as BusinessPoolStatus,
    targetId: row.targetId,
    targetType: row.targetType as BusinessPoolTargetType,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toAssignmentEventRecord(
  row: Prisma.BusinessAssignmentEventGetPayload<Record<string, never>>,
): BusinessAssignmentEventDto {
  return {
    action: row.action as BusinessAssignmentAction,
    actor: row.actor,
    createdAt: row.createdAt.toISOString(),
    fromOwner: row.fromOwner ?? undefined,
    id: row.id,
    poolEntryId: row.poolEntryId ?? undefined,
    reason: row.reason ?? undefined,
    targetId: row.targetId,
    targetType: row.targetType as BusinessPoolTargetType,
    tenantId: row.tenantId,
    toOwner: row.toOwner ?? undefined,
  };
}

function toLifecycleCustomerRecord(
  row: LifecycleCustomerRow,
): BusinessLifecycleCustomerDto {
  return {
    contactCount: row._count.contacts,
    contractCount: row._count.contracts,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    lifecycleChangedAt: row.lifecycleChangedAt?.toISOString(),
    lifecycleReason: row.lifecycleReason ?? undefined,
    lifecycleStage: row.lifecycleStage as BusinessLifecycleStage,
    level: row.level,
    name: row.name,
    number: row.number,
    opportunityCount: row._count.opportunities,
    owner: row.owner,
    quoteCount: row._count.quotes,
    receivableCount: row._count.receivables,
    source: row.source,
    status: row.status,
    tenantId: row.tenantId,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toLifecycleEventRecord(
  row: Prisma.BusinessLifecycleEventGetPayload<Record<string, never>>,
): BusinessLifecycleEventDto {
  return {
    actor: row.actor,
    createdAt: row.createdAt.toISOString(),
    customerId: row.customerId,
    detail: parseJsonObject(row.detail),
    fromStage: row.fromStage as BusinessLifecycleStage | undefined,
    id: row.id,
    reason: row.reason ?? undefined,
    tenantId: row.tenantId,
    toStage: row.toStage as BusinessLifecycleStage,
  };
}

function assertPoolEntryOpen(
  entry: Pick<
    Prisma.BusinessPoolEntryGetPayload<Record<string, never>>,
    'status'
  >,
): void {
  if (entry.status === 'archived') {
    throw lifecycleBadRequest(
      'BUSINESS_LIFECYCLE_POOL_ENTRY_CLOSED',
      'business pool entry is closed.',
      { status: entry.status },
    );
  }
}

function assertPoolEntryAssignable(
  entry: Pick<
    Prisma.BusinessPoolEntryGetPayload<Record<string, never>>,
    'status'
  >,
): void {
  if (!['available', 'recycled'].includes(entry.status)) {
    throw lifecycleBadRequest(
      'BUSINESS_LIFECYCLE_POOL_ENTRY_NOT_AVAILABLE',
      'business pool entry is not available for claim.',
      { status: entry.status },
    );
  }
}

function deriveCustomerStatus(
  currentStatus: string,
  toStage: BusinessLifecycleStage,
): string {
  if (toStage === 'lost') return 'churned';
  if (toStage === 'archived') return 'inactive';
  if (['churned', 'inactive'].includes(currentStatus)) return 'active';

  return currentStatus;
}

function duplicateKeyForLead(input: {
  company?: string | null;
  email?: string | null;
  mobile?: string | null;
  name: string;
}): string | null {
  return createDuplicateKey({
    email: input.email,
    name: input.company ?? input.name,
    phone: input.mobile,
  });
}

function duplicateKeyForCustomer(input: {
  email?: string | null;
  name: string;
  phone?: string | null;
}): string | null {
  return createDuplicateKey({
    email: input.email,
    name: input.name,
    phone: input.phone,
  });
}

function createDuplicateKey(input: {
  email?: string | null;
  name?: string | null;
  phone?: string | null;
}): string | null {
  const email = normalizeOptionalText(input.email)?.toLowerCase();
  if (email) return `email:${email}`;
  const phone = normalizeOptionalText(input.phone)?.replace(/\D/g, '');
  if (phone && phone.length >= 6) return `phone:${phone}`;
  const name = normalizeOptionalText(input.name)
    ?.toLowerCase()
    .replace(/\s+/g, ' ');
  if (name) return `name:${name}`;

  return null;
}

function parseTargetType(value: string): BusinessPoolTargetType {
  return parseChoice(value, BUSINESS_POOL_TARGET_TYPES, 'targetType');
}

function parsePoolStatus(value: string): BusinessPoolStatus {
  return parseChoice(value, BUSINESS_POOL_STATUSES, 'status');
}

function parseLifecycleStage(value: string): BusinessLifecycleStage {
  return parseChoice(value, BUSINESS_LIFECYCLE_STAGES, 'lifecycleStage');
}

function parseAssignmentAction(value: string): BusinessAssignmentAction {
  return parseChoice(value, BUSINESS_ASSIGNMENT_ACTIONS, 'action');
}

function parseChoice<T extends string>(
  value: string | undefined,
  choices: readonly T[],
  field: string,
): T {
  const normalized = requireText(value, field);
  if (!choices.includes(normalized as T)) {
    throw lifecycleBadRequest(
      'BUSINESS_LIFECYCLE_CHOICE_INVALID',
      'business lifecycle choice is invalid.',
      { field, value },
    );
  }

  return normalized as T;
}

function requireText(value: string | undefined, field: string): string {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    throw lifecycleBadRequest(
      'BUSINESS_LIFECYCLE_REQUIRED_FIELD',
      'business lifecycle required field is missing.',
      { field },
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | undefined {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : undefined;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function parseJsonObject(value: Prisma.JsonValue): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function createCsvExportPreview(
  filename: string,
  columns: readonly string[],
  rows: readonly (readonly string[])[],
): BusinessLifecycleExportPreviewDto {
  const csv = [
    columns.join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\n');

  return {
    columns,
    contentBase64: Buffer.from(csv, 'utf8').toString('base64'),
    contentType: CSV_CONTENT_TYPE,
    filename,
    generatedAt: new Date().toISOString(),
    rowCount: rows.length,
    scope: 'current-page',
  };
}

function escapeCsvCell(value: string): string {
  if (!/[",\n]/.test(value)) return value;

  return `"${value.replace(/"/g, '""')}"`;
}
