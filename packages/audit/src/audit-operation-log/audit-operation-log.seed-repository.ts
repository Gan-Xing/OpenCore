import { Injectable } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import {
  seedAuditOperationLogs,
  type AuditOperationLogRecord,
  type CreateAuditOperationLogRecord,
} from './audit-operation-log.records';
import {
  AuditOperationLogRepository,
  compareAuditOperationLogRecords,
  createAuditOperationLogPageResult,
  normalizeAuditOperationLogFilters,
  normalizeAuditOperationLogPageQuery,
  redactAuditMetadata,
  type AuditOperationLogQuery,
} from './audit-operation-log.repository';

@Injectable()
export class SeedAuditOperationLogRepository extends AuditOperationLogRepository {
  private operationLogs = seedAuditOperationLogs.map(cloneOperationLog);

  async listOperationLogs(
    query: AuditOperationLogQuery = {},
  ): Promise<PageResult<AuditOperationLogRecord>> {
    const filters = normalizeAuditOperationLogFilters(query);
    const filtered = this.operationLogs
      .filter(
        (log) =>
          (filters.actorUsername === undefined ||
            log.actorUsername.includes(filters.actorUsername)) &&
          (filters.action === undefined ||
            log.action.includes(filters.action)) &&
          (filters.resource === undefined ||
            log.resource.includes(filters.resource)),
      )
      .sort(compareAuditOperationLogRecords)
      .map((log) => ({
        ...log,
        metadata: redactAuditMetadata(log.metadata),
      }));
    const pagination = normalizeAuditOperationLogPageQuery(
      query,
      filtered.length,
    );
    const rows = filtered.slice(
      pagination.skip,
      pagination.skip + pagination.take,
    );

    return createAuditOperationLogPageResult(
      rows.map(cloneOperationLog),
      pagination,
    );
  }

  async recordOperation(record: CreateAuditOperationLogRecord): Promise<void> {
    this.operationLogs = [
      {
        id: `audit_${this.operationLogs.length + 1}`,
        ...record,
        metadata: redactAuditMetadata(record.metadata),
        createdAt: new Date().toISOString(),
      },
      ...this.operationLogs,
    ];
  }
}

function cloneOperationLog(
  log: AuditOperationLogRecord,
): AuditOperationLogRecord {
  return {
    ...log,
    metadata:
      log.metadata === undefined ? undefined : structuredClone(log.metadata),
  };
}
