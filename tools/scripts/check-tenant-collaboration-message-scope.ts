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
      'collaborationMessages  CollaborationMessage[]',
      'tenantId     String    @default("tenant_root")',
      'tenant       Tenant',
      '@@index([tenantId, recipient, status, createdAt])',
      '@@index([tenantId, sender, createdAt])',
      '@@index([tenantId, businessType, businessId])',
      '@@index([tenantId, deletedAt])',
    ],
  },
  {
    file: 'prisma/migrations/20260624023000_tenant_scoped_collaboration_messages/migration.sql',
    markers: [
      'UPDATE "CollaborationMessage"',
      'CollaborationMessage_tenantId_recipient_status_createdAt_idx',
      'CollaborationMessage_tenantId_sender_createdAt_idx',
      'CollaborationMessage_tenantId_businessType_businessId_idx',
      'CollaborationMessage_tenantId_deletedAt_idx',
      'CollaborationMessage_tenantId_fkey',
    ],
  },
  {
    file: 'apps/api/src/modules/collaboration/collaboration/prisma-collaboration.repository.ts',
    markers: [
      'getRequestContext',
      'resolveCurrentTenantId',
      'where: { tenantId, deletedAt: null }',
      'findFirst({ where: { id, tenantId } })',
      'tenantId: row.tenantId',
    ],
  },
  {
    file: 'apps/api/src/modules/collaboration/collaboration/seed-collaboration.repository.ts',
    markers: [
      'getRequestContext',
      'resolveCurrentTenantId',
      'message.tenantId === tenantId',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-collaboration-messages.ts',
    markers: [
      'FOREIGN_TENANT_ID',
      'assertForeignTenantMessageHidden',
      'assertForeignTenantMessagePreserved',
      'collaboration.messages.foreign-hidden',
    ],
  },
  {
    file: 'apps/admin/src/pages/Collaboration/Messages.tsx',
    markers: ['tenantId', 'pages.collaboration.messages.fields.tenantId'],
  },
  {
    file: 'packages/sdk/src/collaboration-types.ts',
    markers: ['tenantId: string', "tenantId: 'tenant_root'"],
  },
  {
    file: 'package.json',
    markers: [
      'guard:tenant-collaboration-message-scope',
      'smoke:core-collaboration-messages',
    ],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: ['T7a', 'Collaboration messages'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant collaboration message marker(s): ${missing.join(
        ', ',
      )}`,
    );
  }
}

console.log('Tenant collaboration message scope guard passed.');
