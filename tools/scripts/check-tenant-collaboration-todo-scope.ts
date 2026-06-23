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
      'collaborationTodos     CollaborationTodo[]',
      'tenantId     String    @default("tenant_root")',
      'tenant       Tenant',
      '@@index([tenantId, assignee, status, createdAt])',
      '@@index([tenantId, sourceType, status])',
      '@@index([tenantId, businessType, businessId])',
    ],
  },
  {
    file: 'prisma/migrations/20260624043000_tenant_scoped_collaboration_todos/migration.sql',
    markers: [
      'UPDATE "CollaborationTodo"',
      'CollaborationTodo_tenantId_assignee_status_createdAt_idx',
      'CollaborationTodo_tenantId_sourceType_status_idx',
      'CollaborationTodo_tenantId_businessType_businessId_idx',
      'CollaborationTodo_tenantId_fkey',
    ],
  },
  {
    file: 'apps/api/src/modules/collaboration/collaboration/prisma-collaboration.repository.ts',
    markers: [
      'collaborationTodo.findMany({ where: { tenantId } })',
      'tenantId,',
      'findFirst({ where: { id, tenantId } })',
      'tenantId: row.tenantId',
    ],
  },
  {
    file: 'apps/api/src/modules/collaboration/collaboration/seed-collaboration.repository.ts',
    markers: [
      'todo.tenantId === tenantId',
      'tenantId,',
      'resolveCurrentTenantId',
    ],
  },
  {
    file: 'tools/smoke/smoke-core-collaboration-todos.ts',
    markers: [
      'FOREIGN_TENANT_ID',
      'assertForeignTenantTodoHidden',
      'assertForeignTenantTodoPreserved',
      'collaboration.todos.foreign-hidden',
    ],
  },
  {
    file: 'apps/admin/src/pages/Collaboration/Todos.tsx',
    markers: ['tenantId', 'pages.collaboration.todos.fields.tenantId'],
  },
  {
    file: 'packages/sdk/src/collaboration-types.ts',
    markers: ['tenantId: string', "tenantId: 'tenant_root'"],
  },
  {
    file: 'package.json',
    markers: [
      'guard:tenant-collaboration-todo-scope',
      'smoke:core-collaboration-todos',
    ],
  },
  {
    file: 'docs/quality-cycle/cycle-022/acceptance-matrix.md',
    markers: ['T7c', 'Collaboration todos'],
  },
];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');
  const missing = check.markers.filter((marker) => !content.includes(marker));

  if (missing.length > 0) {
    throw new Error(
      `${check.file} is missing tenant collaboration todo marker(s): ${missing.join(
        ', ',
      )}`,
    );
  }
}

console.log('Tenant collaboration todo scope guard passed.');
