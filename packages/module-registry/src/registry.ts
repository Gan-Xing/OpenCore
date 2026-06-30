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
  'industry.erp',
  'industry.mes',
  'industry.wms',
  'industry.mall',
  'integration.pay',
  'ai.',
] as const;

const MENU_GROUPS = {
  dashboard: {
    title: 'Dashboard',
    path: '/dashboard',
    icon: 'DashboardOutlined',
    order: 0,
  },
  system: {
    title: 'System',
    path: '/system',
    icon: 'SettingOutlined',
    order: 90,
  },
  security: {
    title: 'Security',
    path: '/security',
    icon: 'SafetyOutlined',
    order: 290,
  },
  monitor: {
    title: 'Monitor',
    path: '/monitor',
    icon: 'MonitorOutlined',
    order: 390,
  },
  collaboration: {
    title: 'Collaboration',
    path: '/collaboration',
    icon: 'TeamOutlined',
    order: 590,
  },
  optional: {
    title: 'Optional',
    path: '/optional',
    icon: 'AppstoreOutlined',
    order: 690,
  },
  integrations: {
    title: 'Integrations',
    path: '/integrations',
    icon: 'ApiOutlined',
    order: 790,
  },
  industry: {
    title: 'Industry',
    path: '/industry',
    icon: 'ApartmentOutlined',
    order: 890,
  },
  tools: {
    title: 'Tools',
    path: '/tools',
    icon: 'ToolOutlined',
    order: 490,
  },
} as const satisfies Record<
  string,
  {
    title: string;
    path: `/${string}`;
    icon: string;
    order: number;
  }
>;

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

export function collectMenuTree(): readonly MenuDefinition[] {
  const menus = collectMenus().map((menu) => normalizeMenuDefinition(menu));
  const activeGroupKeys = new Set(
    menus
      .map((menu) => menu.key.split('.')[0])
      .filter((key) => key in MENU_GROUPS),
  );
  const groups = [...activeGroupKeys]
    .map((key) => createMenuGroupDefinition(key, menus))
    .sort((left, right) => left.order - right.order);

  return [...groups, ...menus];
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

function normalizeMenuDefinition(menu: MenuDefinition): MenuDefinition {
  const groupKey = menu.key.split('.')[0];
  const parentKey =
    menu.parentKey ?? (groupKey in MENU_GROUPS ? groupKey : undefined);

  return {
    ...menu,
    parentKey,
    type: menu.type ?? 'menu',
    component: menu.component ?? pathToAdminComponent(menu.path),
    status: menu.status ?? 'enabled',
    cache: menu.cache ?? false,
    hidden: menu.hidden ?? false,
  };
}

function createMenuGroupDefinition(
  key: string,
  menus: readonly MenuDefinition[],
): MenuDefinition {
  const group = MENU_GROUPS[key as keyof typeof MENU_GROUPS];
  const firstChild = menus.find((menu) => menu.parentKey === key);

  return {
    key,
    title: group.title,
    path: group.path,
    type: 'directory',
    icon: group.icon,
    order: group.order,
    stage: firstChild?.stage ?? 'S6',
    status: 'enabled',
    cache: false,
    hidden: false,
  };
}

function pathToAdminComponent(path: string): string {
  return path
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean)
    .map((segment) =>
      segment
        .split('-')
        .filter(Boolean)
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(''),
    )
    .join('/');
}
