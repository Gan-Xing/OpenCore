import {
  findModuleByCode,
  listModules,
  type collectMenus,
} from '@opencore/module-registry';

type RegistryMenu = ReturnType<typeof collectMenus>[number];

const SHELL_MODULE_CODES = ['core.dashboard', 'tool.openapi'] as const;

const PLANNED_STAGE_ORDER = ['S6', 'S7', 'S8'] as const;

export type ShellMenuItem = {
  key: string;
  name: string;
  path: string;
  permissionCode: string;
  stage: string;
  order: number;
};

export type LayoutMenuItem = {
  path: string;
  name: string;
  icon?: string;
  routes?: LayoutMenuItem[];
};

export const shellModules = SHELL_MODULE_CODES.map((code) =>
  requireModule(code),
);

export const shellMenuItems: readonly ShellMenuItem[] = shellModules
  .flatMap((moduleDefinition) =>
    moduleDefinition.menus.map((menu) => toShellMenuItem(menu)),
  )
  .sort((left, right) => left.order - right.order);

export const shellPermissionCodes = [
  ...new Set(
    shellModules.flatMap((moduleDefinition) =>
      moduleDefinition.permissions.map((permission) => permission.code),
    ),
  ),
].sort();

export const plannedModuleSummaries = listModules()
  .filter((moduleDefinition) =>
    (PLANNED_STAGE_ORDER as readonly string[]).includes(moduleDefinition.stage),
  )
  .map((moduleDefinition) => ({
    code: moduleDefinition.code,
    title: moduleDefinition.title,
    layer: moduleDefinition.layer,
    stage: moduleDefinition.stage,
    permissionCount: moduleDefinition.permissions.length,
    menuCount: moduleDefinition.menus.length,
  }))
  .sort((left, right) => {
    const stageDiff =
      PLANNED_STAGE_ORDER.indexOf(
        left.stage as (typeof PLANNED_STAGE_ORDER)[number],
      ) -
      PLANNED_STAGE_ORDER.indexOf(
        right.stage as (typeof PLANNED_STAGE_ORDER)[number],
      );

    if (stageDiff !== 0) {
      return stageDiff;
    }

    return left.code.localeCompare(right.code);
  });

export const registrySummary = {
  shellModuleCount: shellModules.length,
  shellPermissionCount: shellPermissionCodes.length,
  plannedModuleCount: plannedModuleSummaries.length,
};

export function createLayoutMenuItems(
  menuItems: readonly ShellMenuItem[] = shellMenuItems,
): LayoutMenuItem[] {
  const dashboard = menuItems.find((item) => item.key === 'dashboard.home');
  const tools = menuItems.filter((item) => item.key.startsWith('tools.'));
  const layoutMenu: LayoutMenuItem[] = [];

  if (dashboard) {
    layoutMenu.push({
      path: dashboard.path,
      name: dashboard.name,
      icon: 'DashboardOutlined',
    });
  }

  if (tools.length > 0) {
    layoutMenu.push({
      path: '/tools',
      name: 'Tools',
      icon: 'ToolOutlined',
      routes: tools.map((item) => ({
        path: item.path,
        name: item.name,
        icon: 'ApiOutlined',
      })),
    });
  }

  return layoutMenu;
}

function requireModule(code: (typeof SHELL_MODULE_CODES)[number]) {
  const moduleDefinition = findModuleByCode(code);

  if (!moduleDefinition) {
    throw new Error(`Missing shell module in registry: ${code}`);
  }

  return moduleDefinition;
}

function toShellMenuItem(menu: RegistryMenu): ShellMenuItem {
  if (!menu.permissionCode) {
    throw new Error(`Shell menu ${menu.key} must declare a permission code.`);
  }

  return {
    key: menu.key,
    name: menu.title,
    path: menu.path,
    permissionCode: menu.permissionCode,
    stage: menu.stage,
    order: menu.order,
  };
}
