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
      'webSocketRuntimeEvents IntegrationWebSocketRuntimeEvent[]',
      'tenantId       String   @default("tenant_root")',
      '@@index([tenantId, room, createdAt])',
      '@@index([tenantId, type, createdAt])',
      '@@index([tenantId, createdAt])',
    ],
  },
  {
    file: 'prisma/migrations/20260624003000_tenant_scoped_websocket_runtime/migration.sql',
    markers: [
      'ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT',
      'IntegrationWebSocketRuntimeEvent_tenantId_room_createdAt_idx',
      'IntegrationWebSocketRuntimeEvent_tenantId_fkey',
    ],
  },
  {
    file: 'apps/api/src/modules/integration/integration/integration.repository.ts',
    markers: [
      'getRequestContext',
      'createTenantWebSocketRuntimeRoom',
      'stripTenantRuntimeRoom',
      'connection.tenantId === normalizedTenantId',
      'subscription.tenantId === normalizedTenantId',
      'event.tenantId === normalizedTenantId',
    ],
  },
  {
    file: 'apps/api/src/modules/integration/integration/prisma-integration.repository.ts',
    markers: [
      'resolveIntegrationRequestTenantId',
      'where: { tenantId }',
      'tenantId: event.tenantId',
      'tenantId: row.tenantId',
    ],
  },
  {
    file: 'apps/api/src/modules/integration/integration/seed-integration.repository.ts',
    markers: [
      'resolveIntegrationRequestTenantId',
      'tenantId: resolveIntegrationRequestTenantId()',
    ],
  },
  {
    file: 'apps/api/src/modules/integration/integration/prisma-integration.repository.spec.ts',
    markers: [
      'runWithRequestContext',
      'foreignTenantId',
      'rootRewrappedTraceId',
      'foreignTraceId',
    ],
  },
  {
    file: 'tools/smoke/smoke-integration-designs.ts',
    markers: [
      'ROOT_RUNTIME_ROOM',
      'tenant_foreign_smoke',
      'integration.websocket-runtime.tenant-room',
    ],
  },
  {
    file: 'packages/sdk/src/integration-types.ts',
    markers: ['tenantId: string', 'WebSocketRuntimeEventSummary'],
  },
  {
    file: 'package.json',
    markers: ['guard:tenant-websocket-scope', 'smoke:integration-designs'],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: ['T5c', 'WebSocket runtime rooms/events scoped by active tenant'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant WebSocket marker(s): ${missing.join(
        ', ',
      )}`,
    );
  }
}

console.log('Tenant WebSocket runtime scope guard passed.');
