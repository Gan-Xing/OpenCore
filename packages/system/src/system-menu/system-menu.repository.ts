import { BadRequestException } from '@nestjs/common';
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
  title: string;
  path: string;
  permissionCode?: string;
  order: number;
};

export type NormalizedSystemMenuUpdateInput = {
  title: string;
  path: string;
  permissionCode?: string | null;
  order: number;
};

const MENU_KEY_PATTERN = /^[a-z][a-z0-9_.-]*$/;

export abstract class SystemMenuRepository {
  abstract listMenus(): Promise<SystemMenuRecord[]>;

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
    columns: ['key', 'title', 'path', 'permissionCode', 'order'],
    rowCount: rows.length,
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeCreateSystemMenuInput(
  body: CreateMenuDto,
): NormalizedSystemMenuCreateInput {
  return {
    key: normalizeMenuKey(body.key),
    title: normalizeRequiredText(body.title, 'title'),
    path: normalizeMenuPath(body.path),
    permissionCode: normalizeOptionalPermissionCode(body.permissionCode),
    order: normalizeOrder(body.order),
  };
}

export function normalizeUpdateSystemMenuInput(
  existing: SystemMenuRecord,
  body: UpdateMenuDto,
): NormalizedSystemMenuUpdateInput {
  return {
    title:
      body.title === undefined
        ? existing.title
        : normalizeRequiredText(body.title, 'title'),
    path:
      body.path === undefined ? existing.path : normalizeMenuPath(body.path),
    permissionCode:
      body.permissionCode === undefined
        ? undefined
        : normalizeNullablePermissionCode(body.permissionCode),
    order:
      body.order === undefined ? existing.order : normalizeOrder(body.order),
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
    throw new BadRequestException(
      'System menu key must start with a lowercase letter and contain only lowercase letters, numbers, dot, underscore or dash.',
    );
  }

  return key;
}

function normalizeMenuPath(value: string): string {
  const path = normalizeRequiredText(value, 'path');

  if (!path.startsWith('/')) {
    throw new BadRequestException('System menu path must start with "/".');
  }

  return path;
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException(`System menu ${fieldName} is required.`);
  }

  return normalized;
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

function normalizeOrder(value: number | undefined): number {
  if (value === undefined) {
    throw new BadRequestException('System menu order is required.');
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new BadRequestException(
      'System menu order must be a non-negative integer.',
    );
  }

  return value;
}
