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
      'systemNotices',
      'noticeTemplates',
      '@@unique([tenantId, id])',
      '@@unique([tenantId, code])',
      '@@unique([tenantId, noticeId, userId])',
      '@@unique([tenantId, noticeId, userId, channel])',
    ],
  },
  {
    file: 'prisma/migrations/20260623235000_tenant_scoped_system_notices/migration.sql',
    markers: [
      'UPDATE "SystemNotice"',
      'SystemNotice_tenantId_status_type_idx',
      'SystemNoticeTemplate_tenantId_code_key',
      'SystemNoticeReadReceipt_tenantId_noticeId_userId_key',
      'SystemNoticeDelivery_tenantId_noticeId_userId_channel_key',
    ],
  },
  {
    file: 'packages/system/src/system-notice/system-notice.prisma-repository.ts',
    markers: [
      'getRequestContext',
      'resolveCurrentTenantId',
      'tenantId_code',
      'tenantId: notice.tenantId',
      'findNoticeRecipients(notice.tenantId)',
    ],
  },
  {
    file: 'packages/system/src/system-notice/system-notice.spec.ts',
    markers: [
      'scopes notices, deliveries, inbox, and templates by tenant',
      'runWithRequestContext',
      'otherTenantId',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-notice.ts',
    markers: [
      'FOREIGN_TENANT_ID',
      'assertForeignTenantNoticeHidden',
      'assertForeignTenantNoticePreserved',
      'core.notice.foreign-hidden',
    ],
  },
  {
    file: 'apps/admin/src/pages/System/Notices.tsx',
    markers: ['tenantId', 'pages.system.notices.fields.tenantId'],
  },
  {
    file: 'packages/sdk/src/system-management-types.ts',
    markers: ['tenantId: string'],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-notice-scope', 'smoke:core-notice'],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: ['T4g', 'System notices'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant notice marker(s): ${missing.join(', ')}`,
    );
  }
}

console.log('Tenant notice scope guard passed.');
