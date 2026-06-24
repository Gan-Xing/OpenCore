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
const smokePath = 'tools/smoke/smoke-core-tenant-plan.ts';
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
  "@Controller('core/tenancy/plans')",
  "@Get('page')",
  "@RequirePermission('platform:tenant-plan:read')",
  "@RequirePermission('platform:tenant-plan:manage')",
  'listPlansPage',
  'createPlan',
  'updatePlan',
  'deletePlan',
]) {
  requireIncludes(controllerPath, controller, marker);
}

requireIncludes(modulePath, module, 'TenantPlanController');

for (const marker of [
  'export class TenantPlanPageDto',
  'export class TenantPlanQueryDto',
  'export class TenantPlanDto',
  'export class CreateTenantPlanDto',
  'export class UpdateTenantPlanDto',
  'export class TenantPlanDeleteResultDto',
]) {
  requireIncludes(dtoPath, dto, marker);
}

const createPlanDto = sectionBetween(
  dto,
  'export class CreateTenantPlanDto',
  'export class UpdateTenantPlanDto',
);
const updatePlanDto = sectionBetween(
  dto,
  'export class UpdateTenantPlanDto',
  'export class TenantPlanDeleteResultDto',
);
for (const marker of ['tenantId?:', 'tenantId!:']) {
  requireNotIncludes(dtoPath, createPlanDto, marker);
  requireNotIncludes(dtoPath, updatePlanDto, marker);
}

for (const marker of [
  'listTenantPlans',
  'listTenantPlansPage',
  'createTenantPlan',
  'updateTenantPlan',
  'deleteTenantPlan',
  'listModules',
  'writePlanModules',
  'TENANT_PLAN_IN_USE',
  'TENANT_PLAN_MODULE_UNKNOWN',
]) {
  requireIncludes(servicePath, service, marker);
}

for (const marker of [
  'listTenantPlans',
  'listTenantPlansPage',
  'createTenantPlan',
  'updateTenantPlan',
  'deleteTenantPlan',
  '/core/tenancy/plans',
]) {
  requireIncludes(sdkClientPath, sdkClient, marker);
}
for (const marker of [
  'TenantPlanSummary',
  'TenantPlanPageSummary',
  'TenantPlanQueryRequest',
  'CreateTenantPlanRequest',
  'UpdateTenantPlanRequest',
  'TenantPlanDeleteResultSummary',
]) {
  requireIncludes(sdkTypesPath, sdkTypes, marker);
}

for (const marker of [
  'listOpenCoreTenantPlanPage',
  'createOpenCoreTenantPlan',
  'updateOpenCoreTenantPlan',
  'deleteOpenCoreTenantPlan',
]) {
  requireIncludes(adminServicePath, adminService, marker);
  requireIncludes(adminPagePath, adminPage, marker);
}

for (const marker of [
  '/core/tenancy/plans',
  'core.tenant-plan.create',
  'core.tenant-plan.update',
  'core.tenant-plan.page',
  'core.tenant-plan.in-use-delete-blocked',
  'TENANT_PLAN_MODULE_UNKNOWN',
  'TENANT_PLAN_IN_USE',
]) {
  requireIncludes(smokePath, smoke, marker);
}

requireIncludes(packagePath, packageJson, '"guard:tenant-plan-control-plane"');
requireIncludes(packagePath, packageJson, '"smoke:core-tenant-plan"');
requireIncludes(localSmokePath, localSmoke, 'smoke-core-tenant-plan.ts');
requireIncludes(deployPath, deploy, 'smoke-core-tenant-plan.ts');

if (issues.length > 0) {
  throw new Error(
    `Tenant plan control-plane guard failed:\n${issues.join('\n')}`,
  );
}

process.stdout.write('Tenant plan control-plane guard passed.\n');
