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
      'systemConfigs   SystemConfig[]',
      '@@unique([tenantId, key])',
      '@@unique([tenantId, key, environment])',
      '@@unique([tenantId, key, version])',
    ],
  },
  {
    file: 'prisma/migrations/20260623223000_tenant_scoped_system_config/migration.sql',
    markers: [
      'UPDATE "SystemConfig"',
      'SystemConfig_tenantId_key_key',
      'SystemConfigEnvironmentOverride_tenantId_key_environment_key',
      'SystemConfigSecretVersion_tenantId_key_version_key',
    ],
  },
  {
    file: 'packages/system/src/system-config/system-config.prisma-repository.ts',
    markers: [
      'getRequestContext',
      'resolveCurrentTenantId',
      'tenantId_key',
      'tenantId_key_environment',
      'tenantId_key_version',
    ],
  },
  {
    file: 'packages/system/src/system-config/system-config.service.ts',
    markers: ['getRequestContext', 'createConfigValueCacheKey', 'tenantId'],
  },
  {
    file: 'packages/system/src/system-config/system-config.spec.ts',
    markers: [
      'scopes Prisma config operations to the request tenant',
      'runWithRequestContext',
      'otherTenantId',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-config.ts',
    markers: [
      'FOREIGN_TENANT_ID',
      'assertForeignTenantConfigHidden',
      'assertForeignTenantConfigPreserved',
    ],
  },
  {
    file: 'apps/admin/src/pages/System/Config.tsx',
    markers: ['tenantId', 'pages.system.config.fields.tenantId'],
  },
  {
    file: 'packages/sdk/src/system-management-types.ts',
    markers: ['tenantId: string'],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-config-scope', 'smoke:core-config'],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: ['T4e', 'System config'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant config marker(s): ${missing.join(', ')}`,
    );
  }
}

console.log('Tenant config scope guard passed.');
