import { Injectable } from '@nestjs/common';
import type { OnlineUserSummaryDto } from '@opencore/online-user';
import type { SchedulerSummaryDto } from '@opencore/scheduler';
import type {
  CacheNameListDto,
  CacheValueDto,
  DeleteCacheKeyDto,
  CacheKeyPageDto,
  CacheKeyQueryDto,
  ClearCacheDto,
  CreateReportDefinitionDto,
  ReportQueryDto,
} from './operations.dto';
import {
  exportJobDesign,
  seedCacheKeys,
  seedReports,
  type CacheKeyRecord,
  type ExportJobDesignRecord,
  type ReportDefinitionRecord,
} from './operations.seed';
import {
  applyCacheClearPolicy,
  applyCacheKeyDeletePolicy,
  buildOperationsSummary,
  createPage,
  matchesOptional,
  normalizeOptionalBoolean,
  OperationsRepository,
  requireRecord,
  type CacheClearResult,
  type CacheKeyDeleteResult,
  type PageResult,
} from './operations.repository';

@Injectable()
export class SeedOperationsRepository extends OperationsRepository {
  private cacheKeys: CacheKeyRecord[] = seedCacheKeys.map((key) => ({
    ...key,
  }));
  private reports: ReportDefinitionRecord[] = seedReports.map((report) => ({
    ...report,
  }));

  async getSummary(
    scheduler: SchedulerSummaryDto,
    onlineUsers: OnlineUserSummaryDto,
  ) {
    return buildOperationsSummary({
      scheduler,
      cacheKeys: this.cacheKeys,
      onlineUsers,
      reports: this.reports,
      exportJobDesign,
    });
  }

  async listCacheKeys(query: CacheKeyQueryDto = {}): Promise<CacheKeyPageDto> {
    return {
      ...createPage(
        this.cacheKeys.filter((key) =>
          query.prefix ? key.key.startsWith(query.prefix) : true,
        ),
        query,
      ),
      scanLimit: this.cacheKeys.length,
      scanComplete: true,
    };
  }

  async listCacheNames(): Promise<CacheNameListDto> {
    const items = Array.from(
      this.cacheKeys.reduce((names, key) => {
        const current = names.get(key.name) ?? {
          name: key.name,
          prefix: key.prefix,
          keyCount: 0,
          totalSizeBytes: 0,
          expiringKeys: 0,
          persistentKeys: 0,
          sampleKey: key.key,
        };

        current.keyCount += 1;
        current.totalSizeBytes += key.sizeBytes;

        if (key.ttlSeconds >= 0) {
          current.expiringKeys += 1;
        } else {
          current.persistentKeys += 1;
        }

        names.set(key.name, current);
        return names;
      }, new Map<string, CacheNameListDto['items'][number]>()),
      ([, value]) => value,
    );

    return {
      items,
      total: items.length,
      scanLimit: this.cacheKeys.length,
      scanComplete: true,
    };
  }

  async getCacheValue(key: string): Promise<CacheValueDto> {
    const record = requireRecord(
      this.cacheKeys.find((cacheKey) => cacheKey.key === key),
      'Cache key',
      key,
    );

    return {
      ...record,
      valuePreview: JSON.stringify({ key: record.key, fixture: true }),
      encoding: 'string',
      sensitive: false,
      truncated: false,
    };
  }

  async clearCache(body: ClearCacheDto): Promise<CacheClearResult> {
    const result = applyCacheClearPolicy(this.cacheKeys, body);

    if (!result.dryRun) {
      this.cacheKeys = this.cacheKeys.filter(
        (key) => !key.key.startsWith(result.prefix),
      );
    }

    return result;
  }

  async deleteCacheKey(body: DeleteCacheKeyDto): Promise<CacheKeyDeleteResult> {
    const result = applyCacheKeyDeletePolicy(
      this.cacheKeys.some((key) => key.key === body.key.trim()),
      body,
    );

    if (!result.dryRun && result.existed) {
      this.cacheKeys = this.cacheKeys.filter((key) => key.key !== result.key);
    }

    return result;
  }

  async listReports(
    query: ReportQueryDto = {},
  ): Promise<PageResult<ReportDefinitionRecord>> {
    const enabled = normalizeOptionalBoolean(query.enabled);
    return createPage(
      this.reports.filter(
        (report) =>
          matchesOptional(report.enabled, enabled) &&
          matchesOptional(report.owner, query.owner),
      ),
      query,
    );
  }

  async getReport(code: string): Promise<ReportDefinitionRecord> {
    return { ...this.findReport(code) };
  }

  async createReport(
    body: CreateReportDefinitionDto,
  ): Promise<ReportDefinitionRecord> {
    const report: ReportDefinitionRecord = {
      id: `report_${body.code.replace(/[^a-zA-Z0-9]+/g, '_')}`,
      code: body.code,
      name: body.name,
      description: body.description,
      querySchema: body.querySchema,
      enabled: body.enabled ?? true,
      owner: body.owner,
    };
    this.reports = [report, ...this.reports];
    return { ...report };
  }

  getExportJobDesign(): ExportJobDesignRecord {
    return { ...exportJobDesign };
  }

  private findReport(code: string): ReportDefinitionRecord {
    return requireRecord(
      this.reports.find((report) => report.code === code),
      'Report definition',
      code,
    );
  }
}
