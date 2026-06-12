import { Injectable, NotFoundException } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import { Prisma } from '@prisma/client';
import type {
  AuditOperationLogRecord,
  CreateAuditOperationLogRecord,
} from './audit-operation-log.records';
import {
  AuditOperationLogRepository,
  createAuditOperationLogPageResult,
  normalizeAuditOperationLogFilters,
  normalizeAuditOperationLogPageQuery,
  redactAuditMetadata,
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
  userAgent: string;
  requestId: string;
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
    };
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
      throw new NotFoundException(`Audit operation log ${id} was not found`);
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
        userAgent: record.userAgent,
        requestId: record.requestId,
        metadata: redactAuditMetadata(record.metadata) as Prisma.InputJsonValue,
      },
    });
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
    userAgent: log.userAgent,
    requestId: log.requestId,
    metadata: redactAuditMetadata(log.metadata),
    createdAt: log.createdAt.toISOString(),
  };
}
