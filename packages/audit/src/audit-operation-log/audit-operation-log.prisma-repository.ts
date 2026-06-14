import { Injectable, NotFoundException } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import { Prisma } from '@prisma/client';
import type {
  AuditOperationLogRecord,
  CreateAuditOperationLogRecord,
} from './audit-operation-log.records';
import type {
  BatchDeleteAuditLogsDto,
  CleanAuditLogsDto,
} from './audit-operation-log.dto';
import {
  AuditOperationLogRepository,
  createAuditOperationLogPageResult,
  normalizeBatchDeleteAuditOperationLogIds,
  normalizeAuditOperationLogFilters,
  normalizeAuditOperationLogPageQuery,
  normalizeAuditOperationLogRetentionPolicy,
  redactAuditMetadata,
  resolveAuditOperationLogLocation,
  type AuditOperationLogBatchMutationRecord,
  type AuditOperationLogCleanRecord,
  type AuditOperationLogQuery,
} from './audit-operation-log.repository';

type PrismaAuditLog = {
  id: string;
  actorUsername: string;
  action: string;
  resource: string;
  resourceId: string | null;
  method: string;
  path: string;
  statusCode: number;
  ip: string;
  location: string;
  userAgent: string;
  requestId: string;
  durationMs: number;
  metadata: unknown;
  createdAt: Date;
};

@Injectable()
export class PrismaAuditOperationLogRepository extends AuditOperationLogRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listOperationLogs(
    query: AuditOperationLogQuery = {},
  ): Promise<PageResult<AuditOperationLogRecord>> {
    const filters = normalizeAuditOperationLogFilters(query);
    const where = {
      ...(filters.actorUsername === undefined
        ? {}
        : { actorUsername: { contains: filters.actorUsername } }),
      ...(filters.action === undefined
        ? {}
        : { action: { contains: filters.action } }),
      ...(filters.resource === undefined
        ? {}
        : { resource: { contains: filters.resource } }),
      ...(filters.location === undefined
        ? {}
        : { location: { contains: filters.location } }),
      ...(filters.status === undefined
        ? {}
        : filters.status === 'success'
          ? { statusCode: { lt: 400 } }
          : { statusCode: { gte: 400 } }),
      ...(filters.createdFrom === undefined && filters.createdTo === undefined
        ? {}
        : {
            createdAt: {
              ...(filters.createdFrom === undefined
                ? {}
                : { gte: filters.createdFrom }),
              ...(filters.createdTo === undefined
                ? {}
                : { lte: filters.createdTo }),
            },
          }),
      ...(filters.minDurationMs === undefined &&
      filters.maxDurationMs === undefined
        ? {}
        : {
            durationMs: {
              ...(filters.minDurationMs === undefined
                ? {}
                : { gte: filters.minDurationMs }),
              ...(filters.maxDurationMs === undefined
                ? {}
                : { lte: filters.maxDurationMs }),
            },
          }),
    } satisfies Prisma.AuditLogWhereInput;
    const total = await this.prisma.auditLog.count({ where });
    const pagination = normalizeAuditOperationLogPageQuery(query, total);
    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createAuditOperationLogPageResult(
      rows.map(toAuditOperationLogRecord),
      pagination,
    );
  }

  async getOperationLog(id: string): Promise<AuditOperationLogRecord> {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new NotFoundException(`Audit log not found: ${id}`);
    }

    return toAuditOperationLogRecord(log);
  }

  async recordOperation(record: CreateAuditOperationLogRecord): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUsername: record.actorUsername,
        action: record.action,
        resource: record.resource,
        resourceId: record.resourceId,
        method: record.method,
        path: record.path,
        statusCode: record.statusCode,
        ip: record.ip,
        location:
          record.location || resolveAuditOperationLogLocation(record.ip),
        userAgent: record.userAgent,
        requestId: record.requestId,
        durationMs: record.durationMs,
        metadata: redactAuditMetadata(record.metadata) as Prisma.InputJsonValue,
      },
    });
  }

  async deleteOperationLogs(
    body: BatchDeleteAuditLogsDto,
  ): Promise<AuditOperationLogBatchMutationRecord> {
    const ids = normalizeBatchDeleteAuditOperationLogIds(body);
    const logs = await this.prisma.auditLog.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true },
    });
    const existingIds = new Set(logs.map((log) => log.id));
    const missing = ids.find((id) => !existingIds.has(id));

    if (missing) {
      throw new NotFoundException(`Audit log not found: ${missing}`);
    }

    await this.prisma.auditLog.deleteMany({
      where: { id: { in: [...ids] } },
    });

    return {
      deleted: true,
      affected: ids.length,
      ids,
    };
  }

  async cleanOperationLogs(
    policy: CleanAuditLogsDto = {},
  ): Promise<AuditOperationLogCleanRecord> {
    const retention = normalizeAuditOperationLogRetentionPolicy(policy);
    const result = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: retention.cutoffBefore } },
    });

    return {
      deleted: true,
      affected: result.count,
      cutoffBefore: retention.cutoffBefore.toISOString(),
      retentionDays: retention.retentionDays,
    };
  }
}

function toAuditOperationLogRecord(
  log: PrismaAuditLog,
): AuditOperationLogRecord {
  return {
    id: log.id,
    actorUsername: log.actorUsername,
    action: log.action,
    resource: log.resource,
    resourceId: log.resourceId ?? undefined,
    method: log.method,
    path: log.path,
    statusCode: log.statusCode,
    ip: log.ip,
    location: log.location,
    userAgent: log.userAgent,
    requestId: log.requestId,
    durationMs: log.durationMs,
    metadata: redactAuditMetadata(log.metadata),
    createdAt: log.createdAt.toISOString(),
  };
}
