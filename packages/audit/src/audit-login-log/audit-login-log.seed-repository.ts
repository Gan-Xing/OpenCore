import { Injectable, NotFoundException } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type { SecurityLoginAttemptRecord } from '@opencore/security';
import {
  seedAuditLoginLogs,
  type AuditLoginLogRecord,
} from './audit-login-log.records';
import {
  AuditLoginLogRepository,
  compareAuditLoginLogRecords,
  createAuditLoginLogPageResult,
  normalizeAuditLoginLogFilters,
  normalizeAuditLoginLogPageQuery,
  type AuditLoginLogQuery,
} from './audit-login-log.repository';

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
          (filters.username === undefined ||
            log.username.includes(filters.username)) &&
          (filters.success === undefined || log.success === filters.success),
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
      {
        id: `login_${this.loginLogs.length + 1}`,
        ...record,
        createdAt: new Date().toISOString(),
      },
      ...this.loginLogs,
    ];
  }

  async getLoginLog(id: string): Promise<AuditLoginLogRecord> {
    const log = this.loginLogs.find((candidate) => candidate.id === id);

    if (!log) {
      throw new NotFoundException(`Login log not found: ${id}`);
    }

    return cloneLoginLog(log);
  }
}

function cloneLoginLog(log: AuditLoginLogRecord): AuditLoginLogRecord {
  return { ...log };
}
