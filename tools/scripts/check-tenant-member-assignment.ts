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

const controllerPath =
  'apps/api/src/modules/core/tenant/tenant-member.controller.ts';
const dtoPath = 'apps/api/src/modules/core/tenant/tenant.dto.ts';
const modulePath = 'apps/api/src/modules/core/tenant/tenant.module.ts';
const servicePath = 'apps/api/src/modules/core/tenant/tenant.service.ts';
const sdkClientPath = 'packages/sdk/src/tenancy-client.ts';
const sdkTypesPath = 'packages/sdk/src/tenancy-types.ts';
const adminServicePath = 'apps/admin/src/services/opencore/platform.ts';
const adminPagePath = 'apps/admin/src/pages/System/Tenants/index.tsx';
const smokePath = 'tools/smoke/smoke-core-tenant-member.ts';
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
  "@Controller('core/tenancy/members')",
  "@Get('page')",
  "@RequirePermission('platform:tenant-member:read')",
  "@RequirePermission('platform:tenant-member:manage')",
  'listMembersPage',
  'updateMemberAssignments',
]) {
  requireIncludes(controllerPath, controller, marker);
}

for (const marker of ['@Headers', 'tenantId']) {
  requireNotIncludes(controllerPath, controller, marker);
}

requireIncludes(modulePath, module, 'TenantMemberController');

const assignmentDto = sectionBetween(
  dto,
  'export class UpdateTenantMemberAssignmentsDto',
  '\n}',
);
for (const marker of ['deptId', 'status', 'roleCodes', 'postCodes']) {
  requireIncludes(dtoPath, assignmentDto, marker);
}
for (const marker of ['tenantId?:', 'tenantId!:']) {
  requireNotIncludes(dtoPath, assignmentDto, marker);
}

for (const marker of [
  'resolveCurrentTenantId',
  'getRequestContext',
  'tenantMembershipRole',
  'tenantMembershipPost',
  'syncRootLegacyUser',
]) {
  requireIncludes(servicePath, service, marker);
}

for (const marker of [
  'listMembers',
  'updateMemberAssignments',
  '/core/tenancy/members',
]) {
  requireIncludes(sdkClientPath, sdkClient, marker);
}
for (const marker of [
  'TenantMemberSummary',
  'UpdateTenantMemberAssignmentsRequest',
]) {
  requireIncludes(sdkTypesPath, sdkTypes, marker);
}

for (const marker of [
  'listOpenCoreTenantMemberPage',
  'updateOpenCoreTenantMemberAssignments',
]) {
  requireIncludes(adminServicePath, adminService, marker);
  requireIncludes(adminPagePath, adminPage, marker);
}

for (const marker of [
  '/core/tenancy/members',
  '/assignments',
  'tenantId',
  'core.tenant-member.update',
]) {
  requireIncludes(smokePath, smoke, marker);
}

requireIncludes(packagePath, packageJson, '"guard:tenant-member-assignment"');
requireIncludes(packagePath, packageJson, '"smoke:core-tenant-member"');
requireIncludes(localSmokePath, localSmoke, 'smoke-core-tenant-member.ts');
requireIncludes(deployPath, deploy, 'smoke-core-tenant-member.ts');

if (issues.length > 0) {
  throw new Error(
    `Tenant member assignment guard failed:\n${issues.join('\n')}`,
  );
}

process.stdout.write('Tenant member assignment guard passed.\n');
