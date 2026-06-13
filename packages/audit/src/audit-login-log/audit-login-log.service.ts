import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type { SecurityLoginAttemptRecord } from '@opencore/security';
import type { BatchDeleteLoginLogsDto } from './audit-login-log.dto';
import type { AuditLoginLogRecord } from './audit-login-log.records';
import {
  AuditLoginLogRepository,
  createAuditLoginLogExportPreview,
  type AuditLoginLogBatchMutationRecord,
  type AuditLoginLogCleanRecord,
  type AuditLoginLogExportPreview,
  type AuditLoginLogQuery,
} from './audit-login-log.repository';

@Injectable()
export class AuditLoginLogService {
  constructor(private readonly repository: AuditLoginLogRepository) {}

  listLoginLogs(
    query: AuditLoginLogQuery = {},
  ): Promise<PageResult<AuditLoginLogRecord>> {
    return this.repository.listLoginLogs(query);
  }

  getLoginLog(id: string): Promise<AuditLoginLogRecord> {
    return this.repository.getLoginLog(id);
  }

  recordLoginAttempt(record: SecurityLoginAttemptRecord): Promise<void> {
    return this.repository.recordLoginAttempt(record);
  }

  deleteLoginLogs(
    body: BatchDeleteLoginLogsDto,
  ): Promise<AuditLoginLogBatchMutationRecord> {
    return this.repository.deleteLoginLogs(body);
  }

  cleanLoginLogs(): Promise<AuditLoginLogCleanRecord> {
    return this.repository.cleanLoginLogs();
  }

  async createExportPreview(
    query: AuditLoginLogQuery = {},
  ): Promise<AuditLoginLogExportPreview> {
    return createAuditLoginLogExportPreview(
      await this.repository.listLoginLogs(query),
    );
  }
}
