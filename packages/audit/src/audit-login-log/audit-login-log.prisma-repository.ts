import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import { PrismaService } from '@opencore/database';
import type { SecurityLoginAttemptRecord } from '@opencore/security';
import type { BatchDeleteLoginLogsDto } from './audit-login-log.dto';
import {
  enrichAuditLoginLogRecord,
  type AuditLoginLogRecord,
} from './audit-login-log.records';
import {
  AuditLoginLogRepository,
  auditLoginLogNotFound,
  createAuditLoginLogPageResult,
  normalizeBatchDeleteLoginLogIds,
  normalizeAuditLoginLogFilters,
  normalizeAuditLoginLogPageQuery,
  resolveAuditLoginLogLocation,
  type AuditLoginLogBatchMutationRecord,
  type AuditLoginLogCleanRecord,
  type AuditLoginLogQuery,
} from './audit-login-log.repository';

type PrismaLoginLog = {
  id: string;
  username: string;
  logType: string;
  result: string;
  success: boolean;
  failureReason: string | null;
  actorUsername: string | null;
  reason: string | null;
  ip: string;
  location: string;
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
      ...(filters.actorUsername === undefined
        ? {}
        : { actorUsername: { contains: filters.actorUsername } }),
      ...(filters.logType === undefined ? {} : { logType: filters.logType }),
      ...(filters.result === undefined ? {} : { result: filters.result }),
      ...(filters.ip === undefined ? {} : { ip: { contains: filters.ip } }),
      ...(filters.location === undefined
        ? {}
        : { location: { contains: filters.location } }),
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
        logType: record.logType ?? 'login.username',
        result:
          record.result ?? (record.success ? 'success' : 'bad_credentials'),
        success: record.success,
        failureReason: record.failureReason,
        actorUsername: record.actorUsername,
        reason: record.reason,
        ip: record.ip,
        location: resolveAuditLoginLogLocation(record.ip),
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
      throw auditLoginLogNotFound(
        'AUDIT_LOGIN_LOG_NOT_FOUND',
        `Login log not found: ${id}`,
        { id },
      );
    }

    return toAuditLoginLogRecord(log);
  }

  async deleteLoginLogs(
    body: BatchDeleteLoginLogsDto,
  ): Promise<AuditLoginLogBatchMutationRecord> {
    const ids = normalizeBatchDeleteLoginLogIds(body);
    const logs = await this.prisma.loginLog.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true },
    });
    const existingIds = new Set(logs.map((log) => log.id));
    const missing = ids.find((id) => !existingIds.has(id));

    if (missing) {
      throw auditLoginLogNotFound(
        'AUDIT_LOGIN_LOG_NOT_FOUND',
        `Login log not found: ${missing}`,
        { id: missing },
      );
    }

    await this.prisma.loginLog.deleteMany({
      where: { id: { in: [...ids] } },
    });

    return {
      deleted: true,
      affected: ids.length,
      ids,
    };
  }

  async cleanLoginLogs(): Promise<AuditLoginLogCleanRecord> {
    const result = await this.prisma.loginLog.deleteMany();

    return {
      deleted: true,
      affected: result.count,
    };
  }
}

function toAuditLoginLogRecord(log: PrismaLoginLog): AuditLoginLogRecord {
  return enrichAuditLoginLogRecord({
    id: log.id,
    username: log.username,
    logType:
      log.logType === 'login.mobile' ||
      log.logType === 'login.sms' ||
      log.logType === 'login.social' ||
      log.logType === 'login.username' ||
      log.logType === 'logout.force' ||
      log.logType === 'logout.self'
        ? log.logType
        : 'login.username',
    result:
      log.result === 'account_locked' ||
      log.result === 'bad_credentials' ||
      log.result === 'captcha_code_error' ||
      log.result === 'captcha_not_found' ||
      log.result === 'success' ||
      log.result === 'user_disabled'
        ? log.result
        : log.success
          ? 'success'
          : 'bad_credentials',
    success: log.success,
    failureReason: log.failureReason ?? undefined,
    actorUsername: log.actorUsername ?? undefined,
    reason: log.reason ?? undefined,
    ip: log.ip,
    location: log.location,
    userAgent: log.userAgent,
    requestId: log.requestId,
    createdAt: log.createdAt.toISOString(),
  });
}
