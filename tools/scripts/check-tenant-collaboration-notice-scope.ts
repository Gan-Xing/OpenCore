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
      'collaborationNotices   CollaborationNotice[]',
      'tenantId       String    @default("tenant_root")',
      'tenant         Tenant',
      '@@index([tenantId, status, createdAt])',
      '@@index([tenantId, createdBy, createdAt])',
    ],
  },
  {
    file: 'prisma/migrations/20260624033000_tenant_scoped_collaboration_notices/migration.sql',
    markers: [
      'UPDATE "CollaborationNotice"',
      'CollaborationNotice_tenantId_status_createdAt_idx',
      'CollaborationNotice_tenantId_createdBy_createdAt_idx',
      'CollaborationNotice_tenantId_fkey',
    ],
  },
  {
    file: 'apps/api/src/modules/collaboration/collaboration/prisma-collaboration.repository.ts',
    markers: [
      'resolveCurrentTenantId',
      'collaborationNotice.findMany({ where: { tenantId } })',
      'where: { tenantId, status: query.status }',
      'findFirst({ where: { id, tenantId } })',
      'tenantId: row.tenantId',
    ],
  },
  {
    file: 'apps/api/src/modules/collaboration/collaboration/seed-collaboration.repository.ts',
    markers: [
      'notice.tenantId === tenantId',
      'tenantId,',
      'resolveCurrentTenantId',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-collaboration-notices.ts',
    markers: [
      'FOREIGN_TENANT_ID',
      'assertForeignTenantNoticeHidden',
      'assertForeignTenantNoticePreserved',
      'collaboration.notices.foreign-hidden',
    ],
  },
  {
    file: 'apps/admin/src/pages/Collaboration/Notices.tsx',
    markers: ['tenantId', 'pages.collaboration.notices.fields.tenantId'],
  },
  {
    file: 'packages/sdk/src/collaboration-types.ts',
    markers: ['tenantId: string', "tenantId: 'tenant_root'"],
  },
  {
    file: 'package.json',
    markers: [
      'guard:tenant-collaboration-notice-scope',
      'smoke:core-collaboration-notices',
    ],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: ['T7b', 'Collaboration notices'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant collaboration notice marker(s): ${missing.join(
        ', ',
      )}`,
    );
  }
}

console.log('Tenant collaboration notice scope guard passed.');
