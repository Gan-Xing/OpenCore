import {
  collectMenuTree,
  collectPermissionCodes,
} from '@opencore/module-registry';
import type { MenuStatus, MenuType } from '@opencore/contracts';

export type SystemMenuRecord = {
  key: string;
  parentKey?: string;
  title: string;
  type: MenuType;
  path: string;
  icon?: string;
  component?: string;
  permissionCode?: string;
  stage: string;
  order: number;
  status: MenuStatus;
  cache: boolean;
  hidden: boolean;
};

export const seedSystemMenus: readonly SystemMenuRecord[] =
  collectMenuTree().map((menu) => ({
    key: menu.key,
    parentKey: menu.parentKey,
    title: menu.title,
    type: menu.type ?? 'menu',
    path: menu.path,
    icon: menu.icon,
    component: menu.component,
    permissionCode: menu.permissionCode,
    stage: menu.stage,
    order: menu.order,
    status: menu.status ?? 'enabled',
    cache: menu.cache ?? false,
    hidden: menu.hidden ?? false,
  }));

export const seedSystemMenuPermissionCodes: readonly string[] =
  collectPermissionCodes();

const systemMenuStageByKey = new Map(
  seedSystemMenus.map((menu) => [menu.key, menu.stage]),
);

export function findSystemMenuStage(key: string): string {
  return systemMenuStageByKey.get(key) ?? 'S6';
}
