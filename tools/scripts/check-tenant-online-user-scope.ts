#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks: Array<{
  file: string;
  markers: readonly string[];
}> = [
  {
    file: 'packages/online-user/src/online-user/online-user.prisma-repository.ts',
    markers: [
      'getRequestContext',
      'resolveCurrentTenantId',
      'tenantId,',
      'findScopedSession',
      'where: { tenantId }',
    ],
  },
  {
    file: 'packages/online-user/src/online-user/online-user.spec.ts',
    markers: [
      'scopes Prisma monitor operations to the request tenant',
      'runWithRequestContext',
      'otherTenantId',
    ],
  },
  {
    file: 'packages/online-user/src/online-user/online-user.records.ts',
    markers: ["tenantId: 'tenant_root'", "accessMode: 'tenant'"],
  },
  {
    file: 'packages/sdk/src/operations-types.ts',
    markers: ["tenantId: 'tenant_root'", "accessMode: 'tenant'"],
  },
  {
    file: 'apps/admin/src/pages/Monitor/OnlineUsers.tsx',
    markers: [
      'pages.monitor.onlineUsers.fields.accessMode',
      'pages.monitor.onlineUsers.fields.tenantId',
      'pages.monitor.onlineUsers.fields.membershipId',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-online-user.ts',
    markers: [
      'FOREIGN_TENANT_ID',
      'assertForeignTenantHidden',
      'assertForeignExpiredSessionPreserved',
      'foreign-tenant-kick-skipped',
    ],
  },
  {
    file: 'tools/scripts/run-local-api-smoke.sh',
    markers: ['smoke-core-online-user.ts'],
  },
  {
    file: 'tools/scripts/deploy-local-opencore.sh',
    markers: ['smoke-core-online-user.ts'],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-online-user-scope', 'smoke:core-online-user'],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: ['T4a', 'Online sessions'],
  },
  {
    file: 'docs/quality-cycle/cycle-022/backlog.md',
    markers: ['T4a', 'online sessions'],
  },
  {
    file: 'docs/quality-cycle/cycle-022/handoff.md',
    markers: ['T4a', 'online-session'],
  },
  {
    file: 'docs/quality-cycle/cycle-022/productization-waterline-audit.md',
    markers: ['Online session tenant isolation', 'Done'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant online-user marker(s): ${missing.join(
        ', ',
      )}`,
    );
  }
}

console.log('Tenant online-user scope guard passed.');
