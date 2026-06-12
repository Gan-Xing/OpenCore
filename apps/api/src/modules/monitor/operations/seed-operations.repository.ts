import { Injectable } from '@nestjs/common';
import type { OnlineUserSummaryDto } from '@opencore/online-user';
import type { SchedulerSummaryDto } from '@opencore/scheduler';
import type {
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
  buildOperationsSummary,
  createPage,
  matchesOptional,
  normalizeOptionalBoolean,
  OperationsRepository,
  requireRecord,
  type CacheClearResult,
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

  async listCacheKeys(
    query: CacheKeyQueryDto = {},
  ): Promise<PageResult<CacheKeyRecord>> {
    return createPage(
      this.cacheKeys.filter((key) =>
        query.prefix ? key.key.startsWith(query.prefix) : true,
      ),
      query,
    );
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
