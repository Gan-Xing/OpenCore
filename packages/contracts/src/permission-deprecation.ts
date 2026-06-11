import type { PermissionCode } from './permission-code';

export const PERMISSION_DEPRECATION_POLICY = {
  status: 'active',
  rule: 'permission-codes-must-not-be-silently-deleted',
  removalRequires: [
    'deprecated flag',
    'replacement or explicit no-replacement rationale',
    'migration note',
    'one release cycle of compatibility',
  ],
} as const;

export type PermissionDeprecationPlan = {
  code: PermissionCode;
  deprecated: true;
  deprecatedSince: string;
  migrationNote: string;
  replacementCode?: PermissionCode;
};

export function validatePermissionDeprecationPlan(
  plan: PermissionDeprecationPlan,
): string[] {
  const issues: string[] = [];

  if (!plan.deprecatedSince.trim()) {
    issues.push(`${plan.code}.deprecatedSince is required.`);
  }

  if (!plan.migrationNote.trim()) {
    issues.push(`${plan.code}.migrationNote is required.`);
  }

  if (plan.replacementCode === plan.code) {
    issues.push(`${plan.code}.replacementCode must differ from code.`);
  }

  return issues;
}
