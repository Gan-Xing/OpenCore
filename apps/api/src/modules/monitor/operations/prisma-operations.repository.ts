import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@opencore/database';
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
  type CacheKeyRecord,
  type ExportJobDesignRecord,
  type ReportDefinitionRecord,
} from './operations.seed';
import {
  applyCacheClearPolicy,
  buildOperationsSummary,
  createPage,
  normalizeOptionalBoolean,
  OperationsRepository,
  requireRecord,
  type CacheClearResult,
  type PageResult,
} from './operations.repository';

type ReportRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  querySchema: unknown;
  enabled: boolean;
  owner: string;
};

@Injectable()
export class PrismaOperationsRepository extends OperationsRepository {
  private cacheKeys: CacheKeyRecord[] = seedCacheKeys.map((key) => ({
    ...key,
  }));

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getSummary(
    scheduler: SchedulerSummaryDto,
    onlineUsers: OnlineUserSummaryDto,
  ) {
    const reports = await this.prisma.reportDefinition.findMany();

    return buildOperationsSummary({
      scheduler,
      cacheKeys: this.cacheKeys,
      onlineUsers,
      reports: reports.map(toReportRecord),
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
    const rows = await this.prisma.reportDefinition.findMany({
      where: { enabled, owner: query.owner },
      orderBy: [{ code: 'asc' }],
    });

    return createPage(rows.map(toReportRecord), query);
  }

  async getReport(code: string): Promise<ReportDefinitionRecord> {
    return this.findReport(code);
  }

  async createReport(
    body: CreateReportDefinitionDto,
  ): Promise<ReportDefinitionRecord> {
    const report = await this.prisma.reportDefinition.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description,
        querySchema: toInputJson(body.querySchema),
        enabled: body.enabled ?? true,
        owner: body.owner,
      },
    });

    return toReportRecord(report);
  }

  getExportJobDesign(): ExportJobDesignRecord {
    return { ...exportJobDesign };
  }

  private async findReport(code: string): Promise<ReportDefinitionRecord> {
    return requireRecord(
      await this.prisma.reportDefinition
        .findUnique({ where: { code } })
        .then((report) => (report ? toReportRecord(report) : undefined)),
      'Report definition',
      code,
    );
  }
}

function toReportRecord(row: ReportRow): ReportDefinitionRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    querySchema: normalizeRecord(row.querySchema) ?? {},
    enabled: row.enabled,
    owner: row.owner,
  };
}

function normalizeRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
