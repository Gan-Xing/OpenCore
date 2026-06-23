import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type { SecurityLoginAttemptRecord } from '@opencore/security';
import {
  enrichAuditLoginLogRecord,
  seedAuditLoginLogs,
  type AuditLoginLogRecord,
} from './audit-login-log.records';
import {
  AuditLoginLogRepository,
  auditLoginLogNotFound,
  compareAuditLoginLogRecords,
  createAuditLoginLogPageResult,
  normalizeBatchDeleteLoginLogIds,
  normalizeAuditLoginLogFilters,
  normalizeAuditLoginLogPageQuery,
  resolveAuditLoginLogLocation,
  type AuditLoginLogBatchMutationRecord,
  type AuditLoginLogCleanRecord,
  type AuditLoginLogQuery,
} from './audit-login-log.repository';
import type { BatchDeleteLoginLogsDto } from './audit-login-log.dto';

@Injectable()
export class SeedAuditLoginLogRepository extends AuditLoginLogRepository {
  private loginLogs = seedAuditLoginLogs.map(cloneLoginLog);

  async listLoginLogs(
    query: AuditLoginLogQuery = {},
  ): Promise<PageResult<AuditLoginLogRecord>> {
    const filters = normalizeAuditLoginLogFilters(query);
    const filtered = this.loginLogs
      .filter(
        (log) =>
          (filters.actorUsername === undefined ||
            (log.actorUsername ?? '').includes(filters.actorUsername)) &&
          (filters.username === undefined ||
            log.username.includes(filters.username)) &&
          (filters.logType === undefined || log.logType === filters.logType) &&
          (filters.result === undefined || log.result === filters.result) &&
          (filters.ip === undefined || log.ip.includes(filters.ip)) &&
          (filters.location === undefined ||
            log.location.includes(filters.location)) &&
          (filters.success === undefined || log.success === filters.success),
      )
      .filter(
        (log) =>
          (filters.createdFrom === undefined ||
            log.createdAt >= filters.createdFrom) &&
          (filters.createdTo === undefined ||
            log.createdAt <= filters.createdTo),
      )
      .sort(compareAuditLoginLogRecords);
    const pagination = normalizeAuditLoginLogPageQuery(query, filtered.length);
    const rows = filtered.slice(
      pagination.skip,
      pagination.skip + pagination.take,
    );

    return createAuditLoginLogPageResult(rows.map(cloneLoginLog), pagination);
  }

  async recordLoginAttempt(record: SecurityLoginAttemptRecord): Promise<void> {
    this.loginLogs = [
      enrichAuditLoginLogRecord({
        id: `login_${this.loginLogs.length + 1}`,
        tenantId: record.tenantId ?? 'tenant_root',
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
        createdAt: new Date().toISOString(),
      }),
      ...this.loginLogs,
    ];
  }

  async getLoginLog(id: string): Promise<AuditLoginLogRecord> {
    const log = this.loginLogs.find((candidate) => candidate.id === id);

    if (!log) {
      throw auditLoginLogNotFound(
        'AUDIT_LOGIN_LOG_NOT_FOUND',
        `Login log not found: ${id}`,
        { id },
      );
    }

    return cloneLoginLog(log);
  }

  async deleteLoginLogs(
    body: BatchDeleteLoginLogsDto,
  ): Promise<AuditLoginLogBatchMutationRecord> {
    const ids = normalizeBatchDeleteLoginLogIds(body);
    const selected = ids.map((id) => this.findLoginLog(id));
    const selectedIds = new Set(selected.map((log) => log.id));

    this.loginLogs = this.loginLogs.filter((log) => !selectedIds.has(log.id));

    return {
      deleted: true,
      affected: selected.length,
      ids,
    };
  }

  async cleanLoginLogs(): Promise<AuditLoginLogCleanRecord> {
    const affected = this.loginLogs.length;
    this.loginLogs = [];

    return {
      deleted: true,
      affected,
    };
  }

  private findLoginLog(id: string): AuditLoginLogRecord {
    const log = this.loginLogs.find((candidate) => candidate.id === id);

    if (!log) {
      throw auditLoginLogNotFound(
        'AUDIT_LOGIN_LOG_NOT_FOUND',
        `Login log not found: ${id}`,
        { id },
      );
    }

    return log;
  }
}

function cloneLoginLog(log: AuditLoginLogRecord): AuditLoginLogRecord {
  return { ...log };
}
