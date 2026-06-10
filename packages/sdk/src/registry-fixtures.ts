import {
  collectMenus,
  collectPermissionDefinitions,
} from '@opencore/module-registry';
import type { MenuSummary, PermissionSummary } from './rbac-types';

export function createPermissionSummariesFromRegistry(): PermissionSummary[] {
  return collectPermissionDefinitions().map((permission) => ({
    code: permission.code,
    title: permission.title,
    stage: permission.stage,
    dangerous: permission.dangerous ?? false,
  }));
}

export function createMenuSummariesFromRegistry(): MenuSummary[] {
  return collectMenus().map((menu) => ({
    key: menu.key,
    title: menu.title,
    path: menu.path,
    permissionCode: menu.permissionCode,
    stage: menu.stage,
    order: menu.order,
  }));
}
