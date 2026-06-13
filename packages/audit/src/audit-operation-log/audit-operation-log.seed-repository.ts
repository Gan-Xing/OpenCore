import { Injectable, NotFoundException } from '@nestjs/common';
import type { PageResult } from '@opencore/common';
import {
  seedAuditOperationLogs,
  type AuditOperationLogRecord,
  type CreateAuditOperationLogRecord,
} from './audit-operation-log.records';
import type { BatchDeleteAuditLogsDto } from './audit-operation-log.dto';
import {
  AuditOperationLogRepository,
  compareAuditOperationLogRecords,
  createAuditOperationLogPageResult,
  normalizeBatchDeleteAuditOperationLogIds,
  normalizeAuditOperationLogFilters,
  normalizeAuditOperationLogPageQuery,
  redactAuditMetadata,
  type AuditOperationLogBatchMutationRecord,
  type AuditOperationLogCleanRecord,
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

  async getOperationLog(id: string): Promise<AuditOperationLogRecord> {
    const log = this.operationLogs.find((entry) => entry.id === id);

    if (!log) {
      throw new NotFoundException(`Audit log not found: ${id}`);
    }

    return cloneOperationLog({
      ...log,
      metadata: redactAuditMetadata(log.metadata),
    });
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

  async deleteOperationLogs(
    body: BatchDeleteAuditLogsDto,
  ): Promise<AuditOperationLogBatchMutationRecord> {
    const ids = normalizeBatchDeleteAuditOperationLogIds(body);
    const selected = ids.map((id) => this.findOperationLog(id));
    const selectedIds = new Set(selected.map((log) => log.id));

    this.operationLogs = this.operationLogs.filter(
      (log) => !selectedIds.has(log.id),
    );

    return {
      deleted: true,
      affected: selected.length,
      ids,
    };
  }

  async cleanOperationLogs(): Promise<AuditOperationLogCleanRecord> {
    const affected = this.operationLogs.length;
    this.operationLogs = [];

    return {
      deleted: true,
      affected,
    };
  }

  private findOperationLog(id: string): AuditOperationLogRecord {
    const log = this.operationLogs.find((entry) => entry.id === id);

    if (!log) {
      throw new NotFoundException(`Audit log not found: ${id}`);
    }

    return log;
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
