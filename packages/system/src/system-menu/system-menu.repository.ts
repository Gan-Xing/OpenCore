import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createApiErrorBody } from '@opencore/common';
import {
  MENU_STATUSES,
  MENU_TYPES,
  type MenuStatus,
  type MenuType,
} from '@opencore/contracts';
import type { CreateMenuDto, UpdateMenuDto } from './system-menu.dto';
import {
  findSystemMenuStage,
  type SystemMenuRecord,
} from './system-menu.records';

export type SystemMenuExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export type NormalizedSystemMenuCreateInput = {
  key: string;
  parentKey?: string;
  title: string;
  type: MenuType;
  path: string;
  icon?: string;
  component?: string;
  permissionCode?: string;
  order: number;
  status: MenuStatus;
  cache: boolean;
  hidden: boolean;
};

export type NormalizedSystemMenuUpdateInput = {
  parentKey: string | null;
  title: string;
  type: MenuType;
  path: string;
  icon?: string;
  component?: string;
  permissionCode: string | null;
  order: number;
  status: MenuStatus;
  cache: boolean;
  hidden: boolean;
};

const MENU_KEY_PATTERN = /^[a-z][a-z0-9_.-]*$/;

export abstract class SystemMenuRepository {
  abstract listMenus(): Promise<SystemMenuRecord[]>;

  abstract getMenu(key: string): Promise<SystemMenuRecord>;

  abstract createMenu(body: CreateMenuDto): Promise<SystemMenuRecord>;

  abstract updateMenu(
    key: string,
    body: UpdateMenuDto,
  ): Promise<SystemMenuRecord>;

  abstract deleteMenu(key: string): Promise<{ deleted: true }>;
}

export function createSystemMenuExportPreview(
  rows: readonly unknown[],
): SystemMenuExportPreview {
  return {
    filename: 'opencore-system-menus.csv',
    scope: 'current-page',
    columns: [
      'key',
      'parentKey',
      'title',
      'type',
      'path',
      'icon',
      'component',
      'permissionCode',
      'order',
      'status',
      'cache',
      'hidden',
    ],
    rowCount: rows.length,
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeCreateSystemMenuInput(
  body: CreateMenuDto,
): NormalizedSystemMenuCreateInput {
  const key = normalizeMenuKey(body.key);
  const parentKey = normalizeOptionalMenuKey(body.parentKey);

  if (parentKey === key) {
    throw systemMenuBadRequest(
      'SYSTEM_MENU_PARENT_SELF',
      'System menu parent cannot be itself.',
      { key },
    );
  }

  return {
    key,
    parentKey,
    title: normalizeRequiredText(body.title, 'title'),
    type: normalizeMenuType(body.type),
    path: normalizeMenuPath(body.path),
    icon: normalizeOptionalText(body.icon),
    component: normalizeOptionalText(body.component),
    permissionCode: normalizeOptionalPermissionCode(body.permissionCode),
    order: normalizeOrder(body.order),
    status: normalizeMenuStatus(body.status),
    cache: normalizeBoolean(body.cache, false),
    hidden: normalizeBoolean(body.hidden, false),
  };
}

export function normalizeUpdateSystemMenuInput(
  existing: SystemMenuRecord,
  body: UpdateMenuDto,
): NormalizedSystemMenuUpdateInput {
  const parentKey =
    body.parentKey === undefined
      ? (existing.parentKey ?? null)
      : normalizeNullableMenuKey(body.parentKey);

  if (parentKey === existing.key) {
    throw systemMenuBadRequest(
      'SYSTEM_MENU_PARENT_SELF',
      'System menu parent cannot be itself.',
      { key: existing.key },
    );
  }

  return {
    parentKey,
    title:
      body.title === undefined
        ? existing.title
        : normalizeRequiredText(body.title, 'title'),
    type:
      body.type === undefined ? existing.type : normalizeMenuType(body.type),
    path:
      body.path === undefined ? existing.path : normalizeMenuPath(body.path),
    icon:
      body.icon === undefined
        ? existing.icon
        : normalizeOptionalText(body.icon),
    component:
      body.component === undefined
        ? existing.component
        : normalizeOptionalText(body.component),
    permissionCode:
      body.permissionCode === undefined
        ? (existing.permissionCode ?? null)
        : normalizeNullablePermissionCode(body.permissionCode),
    order:
      body.order === undefined ? existing.order : normalizeOrder(body.order),
    status:
      body.status === undefined
        ? existing.status
        : normalizeMenuStatus(body.status),
    cache:
      body.cache === undefined
        ? existing.cache
        : normalizeBoolean(body.cache, false),
    hidden:
      body.hidden === undefined
        ? existing.hidden
        : normalizeBoolean(body.hidden, false),
  };
}

export function compareSystemMenuRecords(
  left: SystemMenuRecord,
  right: SystemMenuRecord,
): number {
  return left.order - right.order || left.key.localeCompare(right.key);
}

export function resolveSystemMenuStage(key: string): string {
  return findSystemMenuStage(key);
}

function normalizeMenuKey(value: string): string {
  const key = normalizeRequiredText(value, 'key');

  if (!MENU_KEY_PATTERN.test(key)) {
    throw systemMenuBadRequest(
      'SYSTEM_MENU_KEY_INVALID',
      'System menu key must start with a lowercase letter and contain only lowercase letters, numbers, dot, underscore or dash.',
      { field: 'key' },
    );
  }

  return key;
}

function normalizeOptionalMenuKey(
  value: string | null | undefined,
): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return normalizeMenuKey(value);
}

function normalizeNullableMenuKey(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  return normalizeMenuKey(value);
}

function normalizeMenuPath(value: string): string {
  const path = normalizeRequiredText(value, 'path');

  if (!path.startsWith('/')) {
    throw systemMenuBadRequest(
      'SYSTEM_MENU_PATH_INVALID',
      'System menu path must start with "/".',
      { field: 'path' },
    );
  }

  return path;
}

function normalizeMenuType(value: MenuType | undefined): MenuType {
  const type = value ?? 'menu';

  if (!(MENU_TYPES as readonly string[]).includes(type)) {
    throw systemMenuBadRequest(
      'SYSTEM_MENU_TYPE_INVALID',
      'System menu type is invalid.',
      { field: 'type' },
    );
  }

  return type;
}

function normalizeMenuStatus(value: MenuStatus | undefined): MenuStatus {
  const status = value ?? 'enabled';

  if (!(MENU_STATUSES as readonly string[]).includes(status)) {
    throw systemMenuBadRequest(
      'SYSTEM_MENU_STATUS_INVALID',
      'System menu status is invalid.',
      { field: 'status' },
    );
  }

  return status;
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw systemMenuBadRequest(
      'SYSTEM_MENU_FIELD_REQUIRED',
      `System menu ${fieldName} is required.`,
      { field: fieldName },
    );
  }

  return normalized;
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeOptionalPermissionCode(
  value: string | undefined,
): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeNullablePermissionCode(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeBoolean(
  value: boolean | undefined,
  defaultValue: boolean,
): boolean {
  return value ?? defaultValue;
}

function normalizeOrder(value: number | undefined): number {
  if (value === undefined) {
    throw systemMenuBadRequest(
      'SYSTEM_MENU_ORDER_REQUIRED',
      'System menu order is required.',
      { field: 'order' },
    );
  }

  if (!Number.isInteger(value) || value < 0) {
    throw systemMenuBadRequest(
      'SYSTEM_MENU_ORDER_INVALID',
      'System menu order must be a non-negative integer.',
      { field: 'order' },
    );
  }

  return value;
}

export function systemMenuBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

export function systemMenuConflict(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ConflictException {
  return new ConflictException(createApiErrorBody({ code, message, details }));
}

export function systemMenuNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, message, details }));
}
