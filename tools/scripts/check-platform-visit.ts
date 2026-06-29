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

const authServicePath =
  'packages/security/src/security-auth/security-auth.service.ts';
const authRepositoryPath =
  'packages/security/src/security-auth/security-auth.repository.ts';
const bearerPath =
  'packages/security/src/security-auth/security-bearer-token.service.ts';
const authControllerPath = 'apps/api/src/modules/core/rbac/auth.controller.ts';
const rbacModulePath = 'apps/api/src/modules/core/rbac/rbac.module.ts';
const rbacDtoPath = 'apps/api/src/modules/core/rbac/rbac.dto.ts';
const rbacRepositoryPath =
  'apps/api/src/modules/core/rbac/prisma-rbac.repository.ts';
const sdkClientPath = 'packages/sdk/src/rbac-client.ts';
const sdkTypesPath = 'packages/sdk/src/rbac-types.ts';
const adminAuthPath = 'apps/admin/src/services/opencore/auth.ts';
const adminTenantsPath = 'apps/admin/src/pages/System/Tenants/index.tsx';
const smokePath = 'tools/smoke/smoke-core-platform-visit.ts';
const localSmokePath = 'tools/scripts/run-local-api-smoke.sh';
const deployPath = 'tools/scripts/deploy-local-opencore.sh';
const packagePath = 'package.json';
const handoffPath = 'docs/quality-cycle/cycle-022/handoff.md';

const authService = readRequired(authServicePath);
const authRepository = readRequired(authRepositoryPath);
const bearer = readRequired(bearerPath);
const authController = readRequired(authControllerPath);
const rbacModule = readRequired(rbacModulePath);
const rbacDto = readRequired(rbacDtoPath);
const rbacRepository = readRequired(rbacRepositoryPath);
const sdkClient = readRequired(sdkClientPath);
const sdkTypes = readRequired(sdkTypesPath);
const adminAuth = readRequired(adminAuthPath);
const adminTenants = readRequired(adminTenantsPath);
const smoke = readRequired(smokePath);
const localSmoke = readRequired(localSmokePath);
const deploy = readRequired(deployPath);
const packageJson = readRequired(packagePath);
const handoff = readRequired(handoffPath);

for (const marker of [
  'visitTenantAsPlatform',
  "accessMode: 'platform-visit'",
  "'platform:tenant:visit'",
  'assertUsableTenant(tenant)',
  'activeMembership: activeMembership',
]) {
  requireIncludes(authServicePath, authService, marker);
}

for (const marker of [
  'SecurityAuthTenantRecord',
  'findTenantForVisit',
  'membershipId?: string',
]) {
  requireIncludes(authRepositoryPath, authRepository, marker);
}
requireIncludes(bearerPath, bearer, 'membershipId?: string');

for (const marker of [
  "@Post('platform-visit')",
  "@RequirePermission('platform:tenant:visit')",
  'PlatformVisitTenantRequestDto',
  'AuditOperationLogService',
  "action: 'platform-visit'",
  "resource: 'auth.platform-visit'",
  'resolveAuditOperationLogLocation',
  '.logout(`Bearer ${session.accessToken}`',
]) {
  requireIncludes(authControllerPath, authController, marker);
}
requireIncludes(rbacModulePath, rbacModule, 'AuditOperationLogModule');

requireIncludes(rbacDtoPath, rbacDto, 'PlatformVisitTenantRequestDto');
requireIncludes(rbacRepositoryPath, rbacRepository, 'findTenantForVisit');
requireIncludes(rbacRepositoryPath, rbacRepository, 'platformRoles');
requireIncludes(
  rbacRepositoryPath,
  rbacRepository,
  'tenantMatchesVisitSelection',
);
requireIncludes(sdkTypesPath, sdkTypes, 'PlatformVisitTenantRequest');
requireIncludes(sdkClientPath, sdkClient, 'visitTenantAsPlatform');
requireIncludes(adminAuthPath, adminAuth, 'visitOpenCoreTenantAsPlatform');
requireIncludes(
  adminTenantsPath,
  adminTenants,
  'visitOpenCoreTenantAsPlatform',
);
requireIncludes(adminTenantsPath, adminTenants, 'Visit tenant');

for (const marker of [
  '/api/auth/platform-visit',
  'auth.platform-visit',
  'auth.platform-visit.selector-mismatch-rejected',
  'auth.platform-visit.selector-mismatch-preserves-token',
  'auth.platform-visit.old-token-revoked',
  'auth.platform-visit.request-context',
  'auth.platform-visit.audit-recorded',
  'assertPlatformVisitAudit',
]) {
  requireIncludes(smokePath, smoke, marker);
}

requireIncludes(packagePath, packageJson, '"guard:platform-visit"');
requireIncludes(packagePath, packageJson, '"smoke:core-platform-visit"');
requireIncludes(localSmokePath, localSmoke, 'smoke-core-platform-visit.ts');
requireIncludes(deployPath, deploy, 'smoke-core-platform-visit.ts');
requireIncludes(handoffPath, handoff, 'platform visit mode');

if (issues.length > 0) {
  throw new Error(`Platform visit guard failed:\n${issues.join('\n')}`);
}

process.stdout.write('Platform visit guard passed.\n');
