import { Injectable, NotFoundException } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import type { SecurityLoginAttemptRecord } from '@opencore/security';
import {
  enrichAuditLoginLogRecord,
  type AuditLoginLogRecord,
} from './audit-login-log.records';
import {
  AuditLoginLogRepository,
  createAuditLoginLogPageResult,
  normalizeAuditLoginLogFilters,
  normalizeAuditLoginLogPageQuery,
  type AuditLoginLogQuery,
} from './audit-login-log.repository';

type PrismaLoginLog = {
  id: string;
  username: string;
  success: boolean;
  failureReason: string | null;
  ip: string;
  userAgent: string;
  requestId: string;
  createdAt: Date;
};

@Injectable()
export class PrismaAuditLoginLogRepository extends AuditLoginLogRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listLoginLogs(
    query: AuditLoginLogQuery = {},
  ): Promise<PageResult<AuditLoginLogRecord>> {
    const filters = normalizeAuditLoginLogFilters(query);
    const where = {
      ...(filters.username === undefined
        ? {}
        : { username: { contains: filters.username } }),
      ...(filters.ip === undefined ? {} : { ip: { contains: filters.ip } }),
      ...(filters.success === undefined ? {} : { success: filters.success }),
      ...(filters.createdFrom === undefined && filters.createdTo === undefined
        ? {}
        : {
            createdAt: {
              ...(filters.createdFrom === undefined
                ? {}
                : { gte: new Date(filters.createdFrom) }),
              ...(filters.createdTo === undefined
                ? {}
                : { lte: new Date(filters.createdTo) }),
            },
          }),
    };
    const total = await this.prisma.loginLog.count({ where });
    const pagination = normalizeAuditLoginLogPageQuery(query, total);
    const rows = await this.prisma.loginLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    });

    return createAuditLoginLogPageResult(
      rows.map(toAuditLoginLogRecord),
      pagination,
    );
  }

  async recordLoginAttempt(record: SecurityLoginAttemptRecord): Promise<void> {
    await this.prisma.loginLog.create({
      data: {
        username: record.username,
        success: record.success,
        failureReason: record.failureReason,
        ip: record.ip,
        userAgent: record.userAgent,
        requestId: record.requestId,
      },
    });
  }

  async getLoginLog(id: string): Promise<AuditLoginLogRecord> {
    const log = await this.prisma.loginLog.findUnique({
      where: { id },
    });

    if (!log) {
      throw new NotFoundException(`Login log not found: ${id}`);
    }

    return toAuditLoginLogRecord(log);
  }
}

function toAuditLoginLogRecord(log: PrismaLoginLog): AuditLoginLogRecord {
  return enrichAuditLoginLogRecord({
    id: log.id,
    username: log.username,
    success: log.success,
    failureReason: log.failureReason ?? undefined,
    ip: log.ip,
    userAgent: log.userAgent,
    requestId: log.requestId,
    createdAt: log.createdAt.toISOString(),
  });
}
