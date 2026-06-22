#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const issues: string[] = [];

function readRequired(relativePath: string): string {
  const path = resolve(root, relativePath);

  if (!existsSync(path)) {
    issues.push(`missing-file ${relativePath}`);
    return '';
  }

  return readFileSync(path, 'utf8');
}

function requireIncludes(
  relativePath: string,
  content: string,
  marker: string,
): void {
  if (!content.includes(marker)) {
    issues.push(`missing-marker file=${relativePath} marker=${marker}`);
  }
}

function requireNotIncludes(
  relativePath: string,
  content: string,
  marker: string,
): void {
  if (content.includes(marker)) {
    issues.push(`forbidden-marker file=${relativePath} marker=${marker}`);
  }
}

const schemaPath = 'prisma/schema.prisma';
const migrationPath =
  'prisma/migrations/20260622223000_tenant_foundation/migration.sql';
const seedPath = 'prisma/seed.ts';
const controllerPath = 'apps/api/src/modules/core/tenant/tenant.controller.ts';
const registryPath = 'packages/module-registry/src/modules.ts';
const adminPath = 'apps/admin/src/pages/System/Tenants/index.tsx';
const sdkPath = 'packages/sdk/src/tenancy-client.ts';

const schema = readRequired(schemaPath);
const migration = readRequired(migrationPath);
const seed = readRequired(seedPath);
const controller = readRequired(controllerPath);
const registry = readRequired(registryPath);
const admin = readRequired(adminPath);
const sdk = readRequired(sdkPath);

for (const marker of [
  'model TenantPlan',
  'model Tenant',
  'model TenantMembership',
  'model TenantMembershipRole',
  'model TenantMembershipPost',
  'model PlatformRole',
  '@@unique([tenantId, userId])',
]) {
  requireIncludes(schemaPath, schema, marker);
}

for (const marker of [
  'CREATE TABLE "Tenant"',
  'CREATE TABLE "TenantMembership"',
  "'tenant_root'",
  'INSERT INTO "TenantMembership"',
  'INSERT INTO "TenantMembershipRole"',
  'INSERT INTO "TenantMembershipPost"',
]) {
  requireIncludes(migrationPath, migration, marker);
}

for (const marker of [
  'async function seedTenancy',
  'listModules()',
  'platform:tenant',
  'tenantMembership.upsert',
  'tenantMembershipRole.upsert',
  'tenantMembershipPost.upsert',
]) {
  requireIncludes(seedPath, seed, marker);
}

for (const marker of [
  "code: 'core.tenant'",
  "code: 'core.tenant-plan'",
  "code: 'core.tenant-member'",
  "'platform:tenant:read'",
  "action: 'visit'",
]) {
  requireIncludes(registryPath, registry, marker);
}

requireIncludes(controllerPath, controller, "@Controller('core/tenancy')");
requireIncludes(
  controllerPath,
  controller,
  "@RequirePermission('platform:tenant:read')",
);

for (const marker of ['@Body', '@Query', '@Headers', 'tenantId']) {
  requireNotIncludes(controllerPath, controller, marker);
}

requireIncludes(adminPath, admin, 'getOpenCoreTenancyFoundation');
requireNotIncludes(adminPath, admin, 'switchTenant');
requireNotIncludes(adminPath, admin, 'selectTenant');
requireIncludes(sdkPath, sdk, "'/core/tenancy/foundation'");

if (issues.length > 0) {
  throw new Error(`Tenant foundation guard failed:\n${issues.join('\n')}`);
}

process.stdout.write('Tenant foundation guard passed.\n');
