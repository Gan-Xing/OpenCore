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
      'integrationProviders   IntegrationProvider[]',
      'tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)',
      '@@unique([tenantId, code])',
      '@@unique([tenantId, providerCode, subjectId, providerAccountId])',
      '@@index([tenantId, providerCode, createdAt])',
    ],
  },
  {
    file: 'apps/api/src/modules/integration/integration/prisma-integration.repository.ts',
    markers: [
      'resolveIntegrationRequestTenantId()',
      'tenantId_code: { tenantId, code }',
      'tenantId_providerCode_subjectId_providerAccountId',
      'const tenantId = flow?.tenantId ?? resolveIntegrationRequestTenantId()',
      'where: { tenantId, id, channel }',
      'tenantId: outbox.tenantId',
    ],
  },
  {
    file: 'apps/api/src/modules/integration/integration/integration.dto.ts',
    markers: [
      'tenantId!: string',
      'export class IntegrationProviderDto',
      'export class IntegrationOutboxDto',
      'export class OAuthTokenDto',
    ],
  },
  {
    file: 'apps/api/src/modules/integration/integration/prisma-integration.repository.spec.ts',
    markers: [
      'tenant-scoped integration persistence',
      'foreignTenantId',
      'callbackOAuthProvider(providerCode',
      'tenantId: foreignTenantId',
    ],
  },
  {
    file: 'tools/smoke/smoke-integration-health.ts',
    markers: [
      'FOREIGN_TENANT_ID',
      'integration.provider.tenant-field',
      'integration.outbox.foreign-hidden',
      'integration.provider.forged-tenant-ignored',
    ],
  },
  {
    file: 'tools/smoke/smoke-integration-oauth-tokens.ts',
    markers: [
      'FOREIGN_TOKEN_ID',
      'integration.oauth-tenant-fields',
      'integration.oauth-token.foreign-hidden',
      'integration.oauth-foreign-preserved',
    ],
  },
  {
    file: 'packages/sdk/src/integration-types.ts',
    markers: [
      'tenantId: string',
      'withRootTenant',
      'IntegrationProviderSummary',
      'OAuthTokenSummary',
    ],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: [
      'T5e',
      'Integration provider/outbox/OAuth tables scoped by active tenant',
    ],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant integration marker(s): ${missing.join(', ')}`,
    );
  }
}

console.log('Tenant integration scope guard passed.');
