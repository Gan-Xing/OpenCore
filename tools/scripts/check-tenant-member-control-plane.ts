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
const servicePath = 'apps/api/src/modules/core/tenant/tenant.service.ts';
const sdkClientPath = 'packages/sdk/src/tenancy-client.ts';
const sdkTypesPath = 'packages/sdk/src/tenancy-types.ts';
const adminServicePath = 'apps/admin/src/services/opencore/platform.ts';
const adminPagePath = 'apps/admin/src/pages/System/Tenants/index.tsx';
const smokePath = 'tools/smoke/smoke-core-tenant-member-lifecycle.ts';
const localSmokePath = 'tools/scripts/run-local-api-smoke.sh';
const deployPath = 'tools/scripts/deploy-local-opencore.sh';
const packagePath = 'package.json';

const controller = readRequired(controllerPath);
const dto = readRequired(dtoPath);
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
  "@Get(':tenantId/members')",
  "@Post(':tenantId/members')",
  "@Patch(':tenantId/members/:membershipId')",
  "@Delete(':tenantId/members/:membershipId')",
  "@RequirePermission('platform:tenant-member:read')",
  "@RequirePermission('platform:tenant-member:manage')",
]) {
  requireIncludes(controllerPath, controller, marker);
}

for (const marker of ['@Query', '@Headers']) {
  requireNotIncludes(controllerPath, controller, marker);
}

for (const marker of [
  'export class CreateTenantMemberDto',
  'export class UpdateTenantMemberDto',
  'export class TenantMemberDeleteResultDto',
  "enum: ['active', 'invited', 'left', 'suspended']",
]) {
  requireIncludes(dtoPath, dto, marker);
}

const createMemberDto = sectionBetween(
  dto,
  'export class CreateTenantMemberDto',
  'export class UpdateTenantMemberDto',
);
const updateMemberDto = sectionBetween(
  dto,
  'export class UpdateTenantMemberDto',
  'export class TenantMemberDeleteResultDto',
);
for (const marker of ['tenantId?:', 'tenantId!:']) {
  requireNotIncludes(dtoPath, createMemberDto, marker);
  requireNotIncludes(dtoPath, updateMemberDto, marker);
}

for (const marker of [
  'listTenantMembers',
  'createTenantMember',
  'updateTenantMember',
  'removeTenantMember',
  'TENANT_MEMBER_ACCOUNT_LIMIT_REACHED',
  'TENANT_MEMBER_LAST_OWNER',
  'hashSystemUserPassword',
]) {
  requireIncludes(servicePath, service, marker);
}

for (const marker of [
  'listTenantMembers',
  'createTenantMember',
  'updateTenantMember',
  'removeTenantMember',
  '/core/tenancy/tenants/${encodeURIComponent(tenantId)}/members',
]) {
  requireIncludes(sdkClientPath, sdkClient, marker);
}
for (const marker of [
  'CreateTenantMemberRequest',
  'UpdateTenantMemberRequest',
  'TenantMemberDeleteResultSummary',
]) {
  requireIncludes(sdkTypesPath, sdkTypes, marker);
}

for (const marker of [
  'listOpenCoreTenantControlMembers',
  'createOpenCoreTenantMember',
  'updateOpenCoreTenantMember',
  'removeOpenCoreTenantMember',
]) {
  requireIncludes(adminServicePath, adminService, marker);
  requireIncludes(adminPagePath, adminPage, marker);
}

for (const marker of [
  'core.tenant-member-control.create-owner',
  'core.tenant-member-control.invite',
  'core.tenant-member-control.account-limit',
  'core.tenant-member-control.remove-left',
  'core.tenant-member-control.last-owner-guard',
  'TENANT_MEMBER_LAST_OWNER',
]) {
  requireIncludes(smokePath, smoke, marker);
}

requireIncludes(packagePath, packageJson, '"guard:tenant-member-control-plane"');
requireIncludes(packagePath, packageJson, '"smoke:core-tenant-member-lifecycle"');
requireIncludes(
  localSmokePath,
  localSmoke,
  'smoke-core-tenant-member-lifecycle.ts',
);
requireIncludes(deployPath, deploy, 'smoke-core-tenant-member-lifecycle.ts');

if (issues.length > 0) {
  throw new Error(
    `Tenant member control-plane guard failed:\n${issues.join('\n')}`,
  );
}

process.stdout.write('Tenant member control-plane guard passed.\n');
