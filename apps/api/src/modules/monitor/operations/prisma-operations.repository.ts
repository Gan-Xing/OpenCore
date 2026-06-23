import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getRequestContext } from '@opencore/core';
import { PrismaService } from '@opencore/database';
import type { OnlineUserSummaryDto } from '@opencore/online-user';
import { RedisService } from '@opencore/redis';
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
  type CacheKeyRecord,
  type ExportJobDesignRecord,
  type ReportDefinitionRecord,
} from './operations.seed';
import {
  applyCacheClearPolicy,
  applyCacheKeyDeletePolicy,
  buildOperationsSummary,
  createPage,
  normalizeCacheKey,
  normalizeCachePrefix,
  normalizeOptionalBoolean,
  operationsBadRequest,
  operationsNotFound,
  OperationsRepository,
  requireRecord,
  type CacheClearResult,
  type CacheKeyDeleteResult,
  type PageResult,
} from './operations.repository';

const CACHE_SCAN_LIMIT = 2_000;
const CACHE_SCAN_COUNT = 100;
const CACHE_VALUE_PREVIEW_LIMIT = 2_048;
const ROOT_TENANT_ID = 'tenant_root';
const SENSITIVE_CACHE_KEY_PATTERN =
  /(^|[:._-])(secret|token|password|credential|session|auth|authorization|private-key|api-key)($|[:._-])/i;
const SENSITIVE_VALUE_FIELD_PATTERN =
  /^(accessToken|apiKey|authorization|clientSecret|credential|password|privateKey|refreshToken|secret|token)$/i;
const SENSITIVE_VALUE_TEXT_PATTERN =
  /(bearer\s+[a-z0-9._~+/-]{12,}|password\s*[:=]|secret\s*[:=]|token\s*[:=]|authorization\s*[:=])/i;

type ReportRow = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  querySchema: unknown;
  enabled: boolean;
  owner: string;
};

@Injectable()
export class PrismaOperationsRepository extends OperationsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async getSummary(
    scheduler: SchedulerSummaryDto,
    onlineUsers: OnlineUserSummaryDto,
  ) {
    const tenantId = resolveCurrentTenantId();
    const [reports, cache] = await Promise.all([
      this.prisma.reportDefinition.findMany({ where: { tenantId } }),
      this.collectCacheRecords(),
    ]);

    return buildOperationsSummary({
      scheduler,
      cacheKeys: cache.records,
      cacheScanLimit: cache.scanLimit,
      cacheScanComplete: cache.scanComplete,
      onlineUsers,
      reports: reports.map(toReportRecord),
      exportJobDesign,
    });
  }

  async listCacheKeys(query: CacheKeyQueryDto = {}): Promise<CacheKeyPageDto> {
    const cache = await this.collectCacheRecords(query.prefix);

    return {
      ...createPage(cache.records, query),
      scanLimit: cache.scanLimit,
      scanComplete: cache.scanComplete,
    };
  }

  async listCacheNames(): Promise<CacheNameListDto> {
    const cache = await this.collectCacheRecords();
    const items = Array.from(
      cache.records.reduce((names, record) => {
        const current = names.get(record.name) ?? {
          tenantId: record.tenantId,
          name: record.name,
          prefix: record.prefix,
          keyCount: 0,
          totalSizeBytes: 0,
          expiringKeys: 0,
          persistentKeys: 0,
          sampleKey: record.key,
        };

        current.keyCount += 1;
        current.totalSizeBytes += record.sizeBytes;

        if (record.ttlSeconds >= 0) {
          current.expiringKeys += 1;
        } else {
          current.persistentKeys += 1;
        }

        names.set(record.name, current);
        return names;
      }, new Map<string, CacheNameListDto['items'][number]>()),
      ([, value]) => value,
    ).sort((left, right) => left.name.localeCompare(right.name));

    return {
      items,
      total: items.length,
      scanLimit: cache.scanLimit,
      scanComplete: cache.scanComplete,
    };
  }

  async getCacheValue(key: string): Promise<CacheValueDto> {
    const tenantId = resolveCurrentTenantId();
    const tenantPrefix = this.resolveTenantRedisPrefix(tenantId);
    const normalizedKey = this.normalizeTenantCacheKey(key, tenantPrefix);
    const record = await this.getCacheRecord(normalizedKey);

    if (record.type === 'none') {
      throwCacheNotFound(normalizedKey);
    }

    if (record.type !== 'string') {
      return {
        ...record,
        valuePreview: `[non-string redis value: ${record.type}]`,
        encoding: 'non-string',
        sensitive: false,
        truncated: false,
      };
    }

    const value = await this.redis.get(normalizedKey);

    if (value === null) {
      throwCacheNotFound(normalizedKey);
    }

    const preview = createSafeCacheValuePreview(normalizedKey, value);

    return {
      ...record,
      valuePreview: preview.valuePreview,
      encoding: 'string',
      sensitive: preview.sensitive,
      truncated: preview.truncated,
    };
  }

  async clearCache(body: ClearCacheDto): Promise<CacheClearResult> {
    const tenantPrefix = this.resolveTenantRedisPrefix(
      resolveCurrentTenantId(),
    );
    const prefix = this.normalizeTenantCachePrefix(body.prefix, tenantPrefix);
    const cache = await this.collectCacheRecords(prefix);
    const result = applyCacheClearPolicy(cache.records, {
      ...body,
      prefix,
    });

    if (!result.dryRun && !cache.scanComplete) {
      throw operationsBadRequest(
        'MONITOR_OPERATIONS_CACHE_CLEAR_SCAN_LIMIT_EXCEEDED',
        'Cache clear matched the scan limit; narrow the prefix before confirmed deletion.',
        { prefix },
      );
    }

    if (!result.dryRun) {
      result.clearedKeys = await this.redis.delete(
        ...cache.records.map((key) => key.key),
      );
    }

    return result;
  }

  async deleteCacheKey(body: DeleteCacheKeyDto): Promise<CacheKeyDeleteResult> {
    const tenantPrefix = this.resolveTenantRedisPrefix(
      resolveCurrentTenantId(),
    );
    const key = this.normalizeTenantCacheKey(body.key, tenantPrefix);
    const exists = (await this.redis.type(key)) !== 'none';
    const result = applyCacheKeyDeletePolicy(exists, {
      ...body,
      key,
    });

    if (!result.dryRun && exists) {
      result.deleted = (await this.redis.delete(key)) === 1;
    }

    return result;
  }

  async listReports(
    query: ReportQueryDto = {},
  ): Promise<PageResult<ReportDefinitionRecord>> {
    const tenantId = resolveCurrentTenantId();
    const enabled = normalizeOptionalBoolean(query.enabled);
    const rows = await this.prisma.reportDefinition.findMany({
      where: { tenantId, enabled, owner: query.owner },
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
    const tenantId = resolveCurrentTenantId();
    const report = await this.prisma.reportDefinition.create({
      data: {
        tenant: { connect: { id: tenantId } },
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

  private async collectCacheRecords(prefix?: string): Promise<{
    records: CacheKeyRecord[];
    scanLimit: number;
    scanComplete: boolean;
  }> {
    const tenantId = resolveCurrentTenantId();
    const tenantPrefix = this.resolveTenantRedisPrefix(tenantId);
    const normalizedPrefix = prefix
      ? this.normalizeTenantCachePrefix(prefix, tenantPrefix)
      : tenantPrefix;
    const match = `${normalizedPrefix}*`;
    const seen = new Set<string>();
    const records: CacheKeyRecord[] = [];
    let cursor = '0';
    let scanComplete = true;

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, {
        match,
        count: CACHE_SCAN_COUNT,
      });
      cursor = nextCursor;

      for (const key of keys) {
        if (seen.has(key)) {
          continue;
        }

        seen.add(key);

        if (records.length >= CACHE_SCAN_LIMIT) {
          scanComplete = false;
          break;
        }

        records.push(await this.getCacheRecord(key, tenantId, tenantPrefix));
      }

      if (!scanComplete) {
        break;
      }
    } while (cursor !== '0');

    records.sort((left, right) => left.key.localeCompare(right.key));

    return {
      records,
      scanLimit: CACHE_SCAN_LIMIT,
      scanComplete,
    };
  }

  private async getCacheRecord(
    key: string,
    tenantId = resolveCurrentTenantId(),
    tenantPrefix = this.resolveTenantRedisPrefix(tenantId),
  ): Promise<CacheKeyRecord> {
    const [ttlSeconds, type, memoryUsage] = await Promise.all([
      this.redis.ttl(key),
      this.redis.type(key),
      this.redis.memoryUsage(key),
    ]);

    const name = deriveCacheName(key, tenantPrefix);

    return {
      tenantId,
      key,
      name,
      prefix: `${tenantPrefix}${name}`,
      ttlSeconds,
      sizeBytes: memoryUsage ?? 0,
      type,
    };
  }

  private resolveTenantRedisPrefix(tenantId: string): string {
    return `${this.redis.tenantKey(tenantId)}:`;
  }

  private normalizeTenantCachePrefix(
    prefix: string,
    tenantPrefix: string,
  ): string {
    return this.normalizeTenantCacheKey(
      normalizeCachePrefix(prefix),
      tenantPrefix,
    );
  }

  private normalizeTenantCacheKey(key: string, tenantPrefix: string): string {
    const normalized = normalizeCacheKey(key);

    if (normalized.startsWith(tenantPrefix)) {
      return normalized;
    }

    const redisPrefix = this.redis.key();
    const suffix =
      redisPrefix && normalized.startsWith(redisPrefix)
        ? normalized.slice(redisPrefix.length)
        : normalized;

    return `${tenantPrefix}${suffix}`;
  }

  private async findReport(code: string): Promise<ReportDefinitionRecord> {
    const tenantId = resolveCurrentTenantId();
    return requireRecord(
      await this.prisma.reportDefinition
        .findFirst({ where: { tenantId, code } })
        .then((report) => (report ? toReportRecord(report) : undefined)),
      'Report definition',
      code,
    );
  }
}

function toReportRecord(row: ReportRow): ReportDefinitionRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
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

function deriveCacheName(key: string, tenantPrefix: string): string {
  const scopedKey = key.startsWith(tenantPrefix)
    ? key.slice(tenantPrefix.length)
    : key;
  const segments = scopedKey.split(':').filter(Boolean);

  return segments[0] ?? key;
}

function resolveCurrentTenantId(): string {
  return getRequestContext()?.tenantId ?? ROOT_TENANT_ID;
}

function createSafeCacheValuePreview(
  key: string,
  value: string,
): { valuePreview: string; sensitive: boolean; truncated: boolean } {
  if (SENSITIVE_CACHE_KEY_PATTERN.test(key)) {
    return {
      valuePreview: '[redacted sensitive cache value]',
      sensitive: true,
      truncated: false,
    };
  }

  const redactedJson = tryRedactJsonValue(value);
  const source = redactedJson.preview ?? value;

  if (redactedJson.sensitive || SENSITIVE_VALUE_TEXT_PATTERN.test(source)) {
    return truncateCacheValuePreview(
      redactedJson.preview ?? '[redacted sensitive cache value]',
      true,
    );
  }

  return truncateCacheValuePreview(source, false);
}

function tryRedactJsonValue(value: string): {
  preview?: string;
  sensitive: boolean;
} {
  try {
    const redacted = redactSensitiveFields(JSON.parse(value));
    return {
      preview: JSON.stringify(redacted.value),
      sensitive: redacted.sensitive,
    };
  } catch {
    return { sensitive: false };
  }
}

function redactSensitiveFields(value: unknown): {
  value: unknown;
  sensitive: boolean;
} {
  if (Array.isArray(value)) {
    let sensitive = false;
    const redacted = value.map((item) => {
      const result = redactSensitiveFields(item);
      sensitive = sensitive || result.sensitive;
      return result.value;
    });

    return { value: redacted, sensitive };
  }

  if (value && typeof value === 'object') {
    let sensitive = false;
    const redacted: Record<string, unknown> = {};

    for (const [field, fieldValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (SENSITIVE_VALUE_FIELD_PATTERN.test(field)) {
        redacted[field] = '[redacted]';
        sensitive = true;
        continue;
      }

      const result = redactSensitiveFields(fieldValue);
      redacted[field] = result.value;
      sensitive = sensitive || result.sensitive;
    }

    return { value: redacted, sensitive };
  }

  return { value, sensitive: false };
}

function truncateCacheValuePreview(
  value: string,
  sensitive: boolean,
): { valuePreview: string; sensitive: boolean; truncated: boolean } {
  const truncated = value.length > CACHE_VALUE_PREVIEW_LIMIT;

  return {
    valuePreview: truncated ? value.slice(0, CACHE_VALUE_PREVIEW_LIMIT) : value,
    sensitive,
    truncated,
  };
}

function throwCacheNotFound(key: string): never {
  throw operationsNotFound(
    'MONITOR_OPERATIONS_CACHE_KEY_NOT_FOUND',
    `Cache key not found: ${key}`,
    { key },
  );
}
