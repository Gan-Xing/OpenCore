import {
  collectMenus,
  collectPermissionCodes,
} from '@opencore/module-registry';

export type SystemMenuRecord = {
  key: string;
  title: string;
  path: string;
  permissionCode?: string;
  stage: string;
  order: number;
};

export const seedSystemMenus: readonly SystemMenuRecord[] = collectMenus().map(
  (menu) => ({
    key: menu.key,
    title: menu.title,
    path: menu.path,
    permissionCode: menu.permissionCode,
    stage: menu.stage,
    order: menu.order,
  }),
);

export const seedSystemMenuPermissionCodes: readonly string[] =
  collectPermissionCodes();

const systemMenuStageByKey = new Map(
  seedSystemMenus.map((menu) => [menu.key, menu.stage]),
);

export function findSystemMenuStage(key: string): string {
  return systemMenuStageByKey.get(key) ?? 'S6';
}
