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
      'posts                  SystemPost[]',
      'tenant            Tenant',
      '@@unique([tenantId, code])',
      '@@unique([tenantId, id])',
    ],
  },
  {
    file: 'prisma/migrations/20260623113000_tenant_scoped_posts/migration.sql',
    markers: [
      'UPDATE "SystemPost"',
      'CREATE UNIQUE INDEX "SystemPost_tenantId_code_key"',
      'TenantMembershipPost_tenantId_postId_fkey',
    ],
  },
  {
    file: 'packages/system/src/system-post/system-post.prisma-repository.ts',
    markers: [
      'getRequestContext',
      'resolveCurrentTenantId',
      'tenantId_code',
      'where: { tenantId',
    ],
  },
  {
    file: 'packages/system/src/system-user/system-user.prisma-repository.ts',
    markers: ['tenantId: ROOT_TENANT_ID', 'tenantId_code'],
  },
  {
    file: 'prisma/seed.ts',
    markers: ['tenantId: ROOT_TENANT_ID', 'tenantId_code'],
  },
  {
    file: 'tools/smoke/smoke-core-post.ts',
    markers: ['active tenant code', 'tenantCode'],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-post-scope', 'smoke:core-tenant-post'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant post marker(s): ${missing.join(', ')}`,
    );
  }
}

console.log('Tenant post scope guard passed.');
