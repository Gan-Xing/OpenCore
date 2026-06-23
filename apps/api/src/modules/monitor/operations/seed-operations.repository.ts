import { Injectable } from '@nestjs/common';
import { getRequestContext } from '@opencore/core';
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
  normalizeCacheKey,
  normalizeCachePrefix,
  normalizeOptionalBoolean,
  OperationsRepository,
  requireRecord,
  type CacheClearResult,
  type CacheKeyDeleteResult,
  type PageResult,
} from './operations.repository';

const ROOT_TENANT_ID = 'tenant_root';
const REDIS_KEY_PREFIX = 'opencore:';

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
    const cacheKeys = this.getTenantCacheKeys();

    return buildOperationsSummary({
      scheduler,
      cacheKeys,
      onlineUsers,
      reports: this.reports,
      exportJobDesign,
    });
  }

  async listCacheKeys(query: CacheKeyQueryDto = {}): Promise<CacheKeyPageDto> {
    const tenantPrefix = createTenantRedisPrefix(resolveCurrentTenantId());
    const prefix = query.prefix
      ? normalizeTenantCachePrefix(query.prefix, tenantPrefix)
      : tenantPrefix;

    return {
      ...createPage(
        this.getTenantCacheKeys().filter((key) => key.key.startsWith(prefix)),
        query,
      ),
      scanLimit: this.getTenantCacheKeys().length,
      scanComplete: true,
    };
  }

  async listCacheNames(): Promise<CacheNameListDto> {
    const cacheKeys = this.getTenantCacheKeys();
    const items = Array.from(
      cacheKeys.reduce((names, key) => {
        const current = names.get(key.name) ?? {
          tenantId: key.tenantId,
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
      scanLimit: cacheKeys.length,
      scanComplete: true,
    };
  }

  async getCacheValue(key: string): Promise<CacheValueDto> {
    const tenantPrefix = createTenantRedisPrefix(resolveCurrentTenantId());
    const normalizedKey = normalizeTenantCacheKey(key, tenantPrefix);
    const record = requireRecord(
      this.getTenantCacheKeys().find(
        (cacheKey) => cacheKey.key === normalizedKey,
      ),
      'Cache key',
      normalizedKey,
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
    const tenantPrefix = createTenantRedisPrefix(resolveCurrentTenantId());
    const prefix = normalizeTenantCachePrefix(body.prefix, tenantPrefix);
    const tenantCacheKeys = this.getTenantCacheKeys();
    const result = applyCacheClearPolicy(tenantCacheKeys, {
      ...body,
      prefix,
    });

    if (!result.dryRun) {
      this.cacheKeys = this.cacheKeys.filter(
        (key) => !key.key.startsWith(result.prefix),
      );
    }

    return result;
  }

  async deleteCacheKey(body: DeleteCacheKeyDto): Promise<CacheKeyDeleteResult> {
    const tenantPrefix = createTenantRedisPrefix(resolveCurrentTenantId());
    const key = normalizeTenantCacheKey(body.key, tenantPrefix);
    const result = applyCacheKeyDeletePolicy(
      this.getTenantCacheKeys().some((cacheKey) => cacheKey.key === key),
      { ...body, key },
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

  private getTenantCacheKeys(): CacheKeyRecord[] {
    const tenantId = resolveCurrentTenantId();
    const tenantPrefix = createTenantRedisPrefix(tenantId);
    return this.cacheKeys.filter(
      (key) => key.tenantId === tenantId && key.key.startsWith(tenantPrefix),
    );
  }

  private findReport(code: string): ReportDefinitionRecord {
    return requireRecord(
      this.reports.find((report) => report.code === code),
      'Report definition',
      code,
    );
  }
}

function resolveCurrentTenantId(): string {
  return getRequestContext()?.tenantId ?? ROOT_TENANT_ID;
}

function createTenantRedisPrefix(tenantId: string): string {
  return `${REDIS_KEY_PREFIX}tenant:${tenantId}:`;
}

function normalizeTenantCachePrefix(prefix: string, tenantPrefix: string) {
  return normalizeTenantCacheKey(normalizeCachePrefix(prefix), tenantPrefix);
}

function normalizeTenantCacheKey(key: string, tenantPrefix: string): string {
  const normalized = normalizeCacheKey(key);
  if (normalized.startsWith(tenantPrefix)) {
    return normalized;
  }

  const suffix = normalized.startsWith(REDIS_KEY_PREFIX)
    ? normalized.slice(REDIS_KEY_PREFIX.length)
    : normalized;

  return `${tenantPrefix}${suffix}`;
}
