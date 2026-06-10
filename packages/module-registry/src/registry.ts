import {
  validateModuleDefinition,
  type MenuDefinition,
  type ModuleDefinition,
  type PermissionDefinition,
} from '@opencore/contracts';
import {
  createValidationIssue,
  createValidationResult,
  findDuplicateValues,
  type ValidationIssue,
  type ValidationResult,
} from '@opencore/shared';
import { moduleRegistry } from './modules';

export const FORBIDDEN_S3_S8_MODULE_PREFIXES = [
  'optional.tenant',
  'industry.crm',
  'industry.erp',
  'industry.mes',
  'industry.wms',
  'industry.mall',
  'integration.pay',
  'ai.',
] as const;

export function listModules(): readonly ModuleDefinition[] {
  return moduleRegistry;
}

export function findModuleByCode(code: string): ModuleDefinition | undefined {
  return moduleRegistry.find(
    (moduleDefinition) => moduleDefinition.code === code,
  );
}

export function collectPermissionDefinitions(): readonly PermissionDefinition[] {
  return moduleRegistry.flatMap(
    (moduleDefinition) => moduleDefinition.permissions,
  );
}

export function collectPermissionCodes(): readonly PermissionDefinition['code'][] {
  return collectPermissionDefinitions().map((permission) => permission.code);
}

export function collectMenus(): readonly MenuDefinition[] {
  return moduleRegistry.flatMap((moduleDefinition) => moduleDefinition.menus);
}

export function validateModuleRegistry(): ValidationResult {
  const issues: ValidationIssue[] = [];
  const moduleCodes = moduleRegistry.map(
    (moduleDefinition) => moduleDefinition.code,
  );
  const permissionCodes = collectPermissionCodes();
  const menuKeys = collectMenus().map((menu) => menu.key);
  const knownPermissions = new Set(permissionCodes);

  for (const duplicate of findDuplicateValues(moduleCodes)) {
    issues.push(createValidationIssue(duplicate, 'Duplicate module code.'));
  }

  for (const duplicate of findDuplicateValues(permissionCodes)) {
    issues.push(createValidationIssue(duplicate, 'Duplicate permission code.'));
  }

  for (const duplicate of findDuplicateValues(menuKeys)) {
    issues.push(createValidationIssue(duplicate, 'Duplicate menu key.'));
  }

  for (const moduleDefinition of moduleRegistry) {
    const moduleResult = validateModuleDefinition(moduleDefinition);
    issues.push(...moduleResult.issues);

    if (
      FORBIDDEN_S3_S8_MODULE_PREFIXES.some((prefix) =>
        moduleDefinition.code.startsWith(prefix),
      )
    ) {
      issues.push(
        createValidationIssue(
          moduleDefinition.code,
          'P4/P5 modules must remain in the long-term backlog during S3-S8.',
        ),
      );
    }

    for (const menu of moduleDefinition.menus) {
      if (menu.permissionCode && !knownPermissions.has(menu.permissionCode)) {
        issues.push(
          createValidationIssue(
            `${menu.key}.permissionCode`,
            'Menu permission must point to a registered permission code.',
          ),
        );
      }
    }
  }

  return createValidationResult(issues);
}
