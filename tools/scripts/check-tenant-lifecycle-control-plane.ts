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

function sectionBetween(
  content: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker, start + startMarker.length);

  if (start === -1 || end === -1) {
    issues.push(`missing-section ${startMarker}`);
    return '';
  }

  return content.slice(start, end);
}

const controllerPath = 'apps/api/src/modules/core/tenant/tenant.controller.ts';
const dtoPath = 'apps/api/src/modules/core/tenant/tenant.dto.ts';
const modulePath = 'apps/api/src/modules/core/tenant/tenant.module.ts';
const servicePath = 'apps/api/src/modules/core/tenant/tenant.service.ts';
const sdkClientPath = 'packages/sdk/src/tenancy-client.ts';
const sdkTypesPath = 'packages/sdk/src/tenancy-types.ts';
const adminServicePath = 'apps/admin/src/services/opencore/platform.ts';
const adminPagePath = 'apps/admin/src/pages/System/Tenants/index.tsx';
const smokePath = 'tools/smoke/smoke-core-tenant-lifecycle.ts';
const localSmokePath = 'tools/scripts/run-local-api-smoke.sh';
const deployPath = 'tools/scripts/deploy-local-opencore.sh';
const packagePath = 'package.json';

const controller = readRequired(controllerPath);
const dto = readRequired(dtoPath);
const module = readRequired(modulePath);
const service = readRequired(servicePath);
const sdkClient = readRequired(sdkClientPath);
const sdkTypes = readRequired(sdkTypesPath);
const adminService = readRequired(adminServicePath);
const adminPage = readRequired(adminPagePath);
const smoke = readRequired(smokePath);
const localSmoke = readRequired(localSmokePath);
const deploy = readRequired(deployPath);
const packageJson = readRequired(packagePath);

for (const marker of [
  "@Controller('core/tenancy/tenants')",
  "@Get('page')",
  "@RequirePermission('platform:tenant:read')",
  "@RequirePermission('platform:tenant:create')",
  "@RequirePermission('platform:tenant:update')",
  "@RequirePermission('platform:tenant:suspend')",
  'setTenantStatus',
  'listTenantsPage',
]) {
  requireIncludes(controllerPath, controller, marker);
}

requireIncludes(modulePath, module, 'TenantController');

for (const marker of [
  'export class TenantPageDto',
  'export class TenantQueryDto',
  'export class TenantDto',
  'export class CreateTenantDto',
  'export class UpdateTenantDto',
  'export class SetTenantStatusDto',
]) {
  requireIncludes(dtoPath, dto, marker);
}

const createTenantDto = sectionBetween(
  dto,
  'export class CreateTenantDto',
  'export class UpdateTenantDto',
);
const updateTenantDto = sectionBetween(
  dto,
  'export class UpdateTenantDto',
  'export class SetTenantStatusDto',
);
for (const marker of ['tenantId?:', 'tenantId!:']) {
  requireNotIncludes(dtoPath, createTenantDto, marker);
  requireNotIncludes(dtoPath, updateTenantDto, marker);
}

for (const marker of [
  'listTenants',
  'listTenantsPage',
  'createTenant',
  'updateTenant',
  'setTenantStatus',
  'TENANT_ROOT_STATUS_IMMUTABLE',
  'TENANT_ROOT_IMMUTABLE',
  'assertTenantCodeAvailable',
  'assertTenantSlugAvailable',
]) {
  requireIncludes(servicePath, service, marker);
}

for (const marker of [
  'listTenants',
  'listTenantsPage',
  'createTenant',
  'updateTenant',
  'setTenantStatus',
  '/core/tenancy/tenants',
]) {
  requireIncludes(sdkClientPath, sdkClient, marker);
}
for (const marker of [
  'TenantSummary',
  'TenantPageSummary',
  'TenantQueryRequest',
  'CreateTenantRequest',
  'UpdateTenantRequest',
  'SetTenantStatusRequest',
]) {
  requireIncludes(sdkTypesPath, sdkTypes, marker);
}

for (const marker of [
  'listOpenCoreTenantPage',
  'createOpenCoreTenant',
  'updateOpenCoreTenant',
  'setOpenCoreTenantStatus',
]) {
  requireIncludes(adminServicePath, adminService, marker);
  requireIncludes(adminPagePath, adminPage, marker);
}

for (const marker of [
  '/core/tenancy/tenants',
  'core.tenant.create',
  'core.tenant.update',
  'core.tenant.status-suspend',
  'core.tenant.root-status-guard',
  'core.tenant.page',
  'core.tenant.audit-recorded',
  'TENANT_ROOT_STATUS_IMMUTABLE',
]) {
  requireIncludes(smokePath, smoke, marker);
}

requireIncludes(
  packagePath,
  packageJson,
  '"guard:tenant-lifecycle-control-plane"',
);
requireIncludes(packagePath, packageJson, '"smoke:core-tenant-lifecycle"');
requireIncludes(localSmokePath, localSmoke, 'smoke-core-tenant-lifecycle.ts');
requireIncludes(deployPath, deploy, 'smoke-core-tenant-lifecycle.ts');

if (issues.length > 0) {
  throw new Error(
    `Tenant lifecycle control-plane guard failed:\n${issues.join('\n')}`,
  );
}

process.stdout.write('Tenant lifecycle control-plane guard passed.\n');
