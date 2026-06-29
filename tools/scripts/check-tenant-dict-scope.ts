import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks: Array<{
  file: string;
  markers: readonly string[];
}> = [
  {
    file: 'prisma/schema.prisma',
    markers: [
      'dictTypes              DictType[]',
      'tenantId    String     @default("tenant_root")',
      '@@unique([tenantId, code])',
      '@@index([tenantId, deletedAt, createdAt])',
    ],
  },
  {
    file: 'prisma/migrations/20260623203000_tenant_scoped_dicts/migration.sql',
    markers: [
      'UPDATE "DictType"',
      'DictType_tenantId_code_key',
      'DictType_tenantId_fkey',
    ],
  },
  {
    file: 'packages/system/src/system-dict/system-dict.prisma-repository.ts',
    markers: [
      'getRequestContext',
      'resolveCurrentTenantId',
      'tenantId_code',
      'type: { tenantId',
    ],
  },
  {
    file: 'packages/system/src/system-dict/system-dict.spec.ts',
    markers: [
      'scopes Prisma dictionary operations to the request tenant',
      'runWithRequestContext',
      'otherTenantId',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-dict.ts',
    markers: [
      'FOREIGN_TENANT_ID',
      'assertForeignTenantDictHidden',
      'assertForeignTenantDictPreserved',
    ],
  },
  {
    file: 'apps/admin/src/pages/System/Dicts.tsx',
    markers: ['tenantId', 'pages.system.dicts.fields.tenantId'],
  },
  {
    file: 'packages/sdk/src/system-management-types.ts',
    markers: ['tenantId: string'],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-dict-scope', 'smoke:core-dict'],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: ['T4d', 'Dictionaries'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant dict marker(s): ${missing.join(', ')}`,
    );
  }
}

console.log('Tenant dict scope guard passed.');
