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
      'tenantId      String?',
      'membershipId  String?',
      'accessMode    String',
      '@default("tenant")',
    ],
  },
  {
    file: 'packages/security/src/security-auth/security-bearer-token.service.ts',
    markers: [
      'signSession',
      'signLoginTicket',
      'verifyLoginTicket',
      'tid',
      'mid',
    ],
  },
  {
    file: 'packages/security/src/security-auth/security-auth.service.ts',
    markers: [
      'selectTenant',
      'switchTenant',
      'AUTH_TENANT_CONTEXT_MISSING',
      'AUTH_TENANT_CONTEXT_MISMATCH',
      'tenant_selection_required',
    ],
  },
  {
    file: 'packages/security/src/security-rbac/security-permission.guard.ts',
    markers: ['setRequestActorContext', 'activeTenant', 'activeMembership'],
  },
  {
    file: 'apps/api/src/modules/core/rbac/auth.controller.ts',
    markers: ["@Post('select-tenant')", "@Post('switch-tenant')"],
  },
  {
    file: 'tools/smoke/smoke-core-tenancy-auth.ts',
    markers: ['decodeTokenPayload', 'switchTenant', 'tenant_forged'],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-auth', 'smoke:core-tenancy-auth'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant auth marker(s): ${missing.join(', ')}`,
    );
  }
}

console.log('Tenant auth guard passed.');
