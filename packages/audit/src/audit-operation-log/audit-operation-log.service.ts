import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import type {
  AuditOperationLogRecord,
  CreateAuditOperationLogRecord,
} from './audit-operation-log.records';
import type { BatchDeleteAuditLogsDto } from './audit-operation-log.dto';
import {
  AuditOperationLogRepository,
  createAuditOperationLogExportPreview,
  type AuditOperationLogBatchMutationRecord,
  type AuditOperationLogCleanRecord,
  type AuditOperationLogExportPreview,
  type AuditOperationLogQuery,
} from './audit-operation-log.repository';

@Injectable()
export class AuditOperationLogService {
  constructor(private readonly repository: AuditOperationLogRepository) {}

  listOperationLogs(
    query: AuditOperationLogQuery = {},
  ): Promise<PageResult<AuditOperationLogRecord>> {
    return this.repository.listOperationLogs(query);
  }

  getOperationLog(id: string): Promise<AuditOperationLogRecord> {
    return this.repository.getOperationLog(id);
  }

  recordOperation(record: CreateAuditOperationLogRecord): Promise<void> {
    return this.repository.recordOperation(record);
  }

  deleteOperationLogs(
    body: BatchDeleteAuditLogsDto,
  ): Promise<AuditOperationLogBatchMutationRecord> {
    return this.repository.deleteOperationLogs(body);
  }

  cleanOperationLogs(): Promise<AuditOperationLogCleanRecord> {
    return this.repository.cleanOperationLogs();
  }

  async createExportPreview(
    query: AuditOperationLogQuery = {},
  ): Promise<AuditOperationLogExportPreview> {
    return createAuditOperationLogExportPreview(
      await this.repository.listOperationLogs(query),
    );
  }
}
