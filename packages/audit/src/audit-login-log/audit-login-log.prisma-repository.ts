import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import type { SecurityLoginAttemptRecord } from '@opencore/security';
import type { AuditLoginLogRecord } from './audit-login-log.records';
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
      ...(filters.success === undefined ? {} : { success: filters.success }),
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
}

function toAuditLoginLogRecord(log: PrismaLoginLog): AuditLoginLogRecord {
  return {
    id: log.id,
    username: log.username,
    success: log.success,
    failureReason: log.failureReason ?? undefined,
    ip: log.ip,
    userAgent: log.userAgent,
    requestId: log.requestId,
    createdAt: log.createdAt.toISOString(),
  };
}
