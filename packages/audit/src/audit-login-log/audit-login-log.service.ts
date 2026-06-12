import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type { SecurityLoginAttemptRecord } from '@opencore/security';
import type { AuditLoginLogRecord } from './audit-login-log.records';
import {
  AuditLoginLogRepository,
  createAuditLoginLogExportPreview,
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

  recordLoginAttempt(record: SecurityLoginAttemptRecord): Promise<void> {
    return this.repository.recordLoginAttempt(record);
  }

  async createExportPreview(
    query: AuditLoginLogQuery = {},
  ): Promise<AuditLoginLogExportPreview> {
    return createAuditLoginLogExportPreview(
      await this.repository.listLoginLogs(query),
    );
  }
}
