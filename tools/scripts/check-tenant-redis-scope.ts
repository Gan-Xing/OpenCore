import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks: Array<{
  file: string;
  markers: readonly string[];
}> = [
  {
    file: 'packages/redis/src/key.ts',
    markers: ['createTenantRedisKey', "'tenant'"],
  },
  {
    file: 'packages/redis/src/redis.service.ts',
    markers: ['tenantKey', 'createTenantRedisKey'],
  },
  {
    file: 'apps/api/src/modules/monitor/operations/prisma-operations.repository.ts',
    markers: [
      'getRequestContext',
      'resolveTenantRedisPrefix',
      'normalizeTenantCacheKey',
      'this.redis.scan(cursor',
      'match = `${normalizedPrefix}*`',
    ],
  },
  {
    file: 'apps/api/src/modules/monitor/operations/seed-operations.repository.ts',
    markers: [
      'getRequestContext',
      'getTenantCacheKeys',
      'normalizeTenantCacheKey',
      'normalizeTenantCachePrefix',
      'createTenantRedisPrefix',
    ],
  },
  {
    file: 'apps/api/src/modules/monitor/operations/operations.seed.ts',
    markers: [
      'opencore:tenant:tenant_foreign:admin:shell',
      "tenantId: 'tenant_foreign'",
    ],
  },
  {
    file: 'apps/api/src/modules/monitor/operations/operations.repository.spec.ts',
    markers: [
      'runWithRequestContext',
      'FOREIGN_TENANT_ID',
      'foreignSystemKey',
      'opencore:tenant:tenant_foreign:admin:shell',
      'MONITOR_OPERATIONS_CACHE_KEY_NOT_FOUND',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-monitor-jobs.ts',
    markers: [
      'FOREIGN_CACHE_TENANT_ID',
      'foreignCacheSmokeKey',
      'monitor.cache.foreign-tenant-hidden',
      'foreign cache key after root clear',
    ],
  },
  {
    file: 'apps/admin/src/pages/Monitor/Cache.tsx',
    markers: ['tenantId', 'pages.monitor.cache.fields.tenantId'],
  },
  {
    file: 'packages/sdk/src/operations-types.ts',
    markers: ['tenantId: string', 'opencore:tenant:tenant_root:admin:shell'],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-redis-scope', 'smoke:core-monitor-jobs'],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: ['T5b', 'Redis cache namespace scoped by active tenant'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant Redis marker(s): ${missing.join(', ')}`,
    );
  }
}

console.log('Tenant Redis scope guard passed.');
