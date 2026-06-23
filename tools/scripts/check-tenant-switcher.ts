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

const authPath = 'apps/admin/src/services/opencore/auth.ts';
const rightContentPath = 'apps/admin/src/components/RightContent/index.tsx';
const componentsPath = 'apps/admin/src/components/index.ts';
const appPath = 'apps/admin/src/app.tsx';
const appTestPath = 'apps/admin/src/app.test.tsx';
const smokePath = 'tools/smoke/smoke-core-tenant-switcher.ts';
const localSmokePath = 'tools/scripts/run-local-api-smoke.sh';
const deployPath = 'tools/scripts/deploy-local-opencore.sh';
const packagePath = 'package.json';
const handoffPath = 'docs/quality-cycle/cycle-022/handoff.md';

const auth = readRequired(authPath);
const rightContent = readRequired(rightContentPath);
const components = readRequired(componentsPath);
const app = readRequired(appPath);
const appTest = readRequired(appTestPath);
const smoke = readRequired(smokePath);
const localSmoke = readRequired(localSmokePath);
const deploy = readRequired(deployPath);
const packageJson = readRequired(packagePath);
const handoff = readRequired(handoffPath);

for (const marker of [
  'switchOpenCoreTenant',
  'authClient.switchTenant',
  'setAdminToken(session.accessToken)',
]) {
  requireIncludes(authPath, auth, marker);
}

for (const marker of [
  'export const TenantSwitcher',
  "useModel('@@initialState')",
  'switchOpenCoreTenant({ membershipId })',
  'window.location.reload()',
  'tenantOptions.length <= 1',
]) {
  requireIncludes(rightContentPath, rightContent, marker);
}

for (const marker of ['TenantSwitcher']) {
  requireIncludes(componentsPath, components, marker);
  requireIncludes(appPath, app, marker);
  requireIncludes(appTestPath, appTest, marker);
}

for (const marker of [
  '/api/auth/switch-tenant',
  'auth.switch-tenant',
  'auth.switch-tenant.old-token-revoked',
  'auth.switch-tenant.new-token-bound',
]) {
  requireIncludes(smokePath, smoke, marker);
}

requireIncludes(packagePath, packageJson, '"guard:tenant-switcher"');
requireIncludes(packagePath, packageJson, '"smoke:core-tenant-switcher"');
requireIncludes(localSmokePath, localSmoke, 'smoke-core-tenant-switcher.ts');
requireIncludes(deployPath, deploy, 'smoke-core-tenant-switcher.ts');
requireIncludes(handoffPath, handoff, 'T6d');
requireIncludes(handoffPath, handoff, 'Admin tenant switcher');

if (issues.length > 0) {
  throw new Error(`Tenant switcher guard failed:\n${issues.join('\n')}`);
}

process.stdout.write('Tenant switcher guard passed.\n');
