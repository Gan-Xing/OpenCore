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
      'collaborationApprovals CollaborationApprovalLite[]',
      'tenantId     String    @default("tenant_root")',
      'tenant       Tenant',
      '@@index([tenantId, requester, status, createdAt])',
      '@@index([tenantId, approver, status, createdAt])',
      '@@index([tenantId, businessType, businessId])',
    ],
  },
  {
    file: 'prisma/migrations/20260624053000_tenant_scoped_collaboration_approvals/migration.sql',
    markers: [
      'UPDATE "CollaborationApprovalLite"',
      'CollaborationApprovalLite_tenantId_requester_status_createdAt_idx',
      'CollaborationApprovalLite_tenantId_approver_status_createdAt_idx',
      'CollaborationApprovalLite_tenantId_businessType_businessId_idx',
      'CollaborationApprovalLite_tenantId_fkey',
    ],
  },
  {
    file: 'apps/api/src/modules/collaboration/collaboration/prisma-collaboration.repository.ts',
    markers: [
      'collaborationApprovalLite.findMany({ where: { tenantId } })',
      'tenantId,',
      'findFirst({ where: { id, tenantId } })',
      'tenantId: row.tenantId',
    ],
  },
  {
    file: 'apps/api/src/modules/collaboration/collaboration/seed-collaboration.repository.ts',
    markers: [
      'approval.tenantId === tenantId',
      'tenantId,',
      'resolveCurrentTenantId',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-collaboration-approvals.ts',
    markers: [
      'FOREIGN_TENANT_ID',
      'assertForeignTenantApprovalHidden',
      'assertForeignTenantApprovalPreserved',
      'collaboration.approvals.foreign-hidden',
    ],
  },
  {
    file: 'apps/admin/src/pages/Collaboration/Approvals.tsx',
    markers: ['tenantId', 'pages.collaboration.approvals.fields.tenantId'],
  },
  {
    file: 'packages/sdk/src/collaboration-types.ts',
    markers: ['tenantId: string', "tenantId: 'tenant_root'"],
  },
  {
    file: 'package.json',
    markers: [
      'guard:tenant-collaboration-approval-scope',
      'smoke:core-collaboration-approvals',
    ],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: ['T7d', 'Collaboration approval-lite'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant collaboration approval marker(s): ${missing.join(
        ', ',
      )}`,
    );
  }
}

console.log('Tenant collaboration approval scope guard passed.');
