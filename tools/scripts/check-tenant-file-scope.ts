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
      'fileAssets             FileAsset[]',
      'tenant       Tenant',
      '@@unique([tenantId, storageKey])',
      '@@index([tenantId, createdAt])',
    ],
  },
  {
    file: 'prisma/migrations/20260623233000_tenant_scoped_file_assets/migration.sql',
    markers: [
      'UPDATE "FileAsset"',
      'FileAsset_tenantId_storageKey_key',
      'FileAsset_tenantId_createdAt_idx',
      'FileAsset_tenantId_fkey',
    ],
  },
  {
    file: 'apps/api/src/modules/core/system-management/prisma-system-management.repository.ts',
    markers: [
      'resolveCurrentTenantId',
      'createTenantStoragePrefix',
      'tenantId_storageKey',
      'where: { id, tenantId }',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-file.ts',
    markers: [
      'FOREIGN_TENANT_ID',
      'assertForeignTenantFileHidden',
      'assertForeignTenantFilePreserved',
      'core.file.foreign-hidden',
    ],
  },
  {
    file: 'apps/admin/src/pages/System/Files.tsx',
    markers: ['tenantId', 'pages.system.files.fields.tenantId'],
  },
  {
    file: 'packages/sdk/src/system-management-types.ts',
    markers: ['tenantId: string'],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-file-scope', 'smoke:core-file'],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: ['T4f', 'File assets'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant file marker(s): ${missing.join(', ')}`,
    );
  }
}

console.log('Tenant file scope guard passed.');
