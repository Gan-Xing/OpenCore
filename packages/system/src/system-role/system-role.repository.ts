import { BadRequestException } from '@nestjs/common';
import type {
  CreateRoleDto,
  SetRoleStatusDto,
  UpdateRoleDto,
} from './system-role.dto';
import {
  systemRoleDataScopeTypes,
  type SystemRoleDataScope,
  type SystemRoleRecord,
} from './system-role.records';

export type SystemRoleExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export type NormalizedSystemRoleCreateInput = {
  code: string;
  name: string;
  enabled: boolean;
  permissionCodes: readonly string[];
  system: boolean;
  dataScope: SystemRoleDataScope;
  dataScopeDeptIds: readonly string[];
};

export type NormalizedSystemRoleUpdateInput = {
  name: string;
  enabled: boolean;
  permissionCodes?: readonly string[];
  system: boolean;
  dataScope: SystemRoleDataScope;
  dataScopeDeptIds: readonly string[];
};

const ROLE_CODE_PATTERN = /^[a-z][a-z0-9_.-]*$/;

export abstract class SystemRoleRepository {
  abstract listRoles(): Promise<SystemRoleRecord[]>;

  abstract getRole(code: string): Promise<SystemRoleRecord>;

  abstract createRole(body: CreateRoleDto): Promise<SystemRoleRecord>;

  abstract updateRole(
    code: string,
    body: UpdateRoleDto,
  ): Promise<SystemRoleRecord>;

  abstract deleteRole(code: string): Promise<{ deleted: true }>;
}

export function createSystemRoleExportPreview(
  rows: readonly unknown[],
): SystemRoleExportPreview {
  return {
    filename: 'opencore-system-roles.csv',
    scope: 'current-page',
    columns: [
      'code',
      'name',
      'permissionCodes',
      'enabled',
      'system',
      'dataScope',
      'dataScopeDeptIds',
    ],
    rowCount: rows.length,
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeCreateSystemRoleInput(
  body: CreateRoleDto,
): NormalizedSystemRoleCreateInput {
  const dataScope = normalizeDataScope(body.dataScope ?? 'all');
  const dataScopeDeptIds = normalizeDataScopeDeptIds(
    body.dataScopeDeptIds ?? [],
  );
  const enabled = normalizeOptionalBoolean(body.enabled, 'enabled', true);
  const system = normalizeOptionalBoolean(body.system, 'system', false);

  assertDataScopeDeptIds(dataScope, dataScopeDeptIds);
  assertRoleStatusAllowed(system, enabled);

  return {
    code: normalizeRoleCode(body.code),
    name: normalizeRequiredText(body.name, 'name'),
    enabled,
    permissionCodes: normalizePermissionCodes(body.permissionCodes),
    system,
    dataScope,
    dataScopeDeptIds,
  };
}

export function normalizeUpdateSystemRoleInput(
  existing: SystemRoleRecord,
  body: UpdateRoleDto,
): NormalizedSystemRoleUpdateInput {
  const dataScope = normalizeDataScope(body.dataScope ?? existing.dataScope);
  const dataScopeDeptIds = normalizeDataScopeDeptIds(
    body.dataScopeDeptIds ?? existing.dataScopeDeptIds,
  );

  assertDataScopeDeptIds(dataScope, dataScopeDeptIds);
  const system = existing.system
    ? existing.system
    : normalizeOptionalBoolean(body.system, 'system', existing.system);
  const enabled = normalizeOptionalBoolean(
    body.enabled,
    'enabled',
    existing.enabled,
  );
  assertRoleStatusAllowed(system, enabled);

  return {
    name:
      body.name === undefined
        ? existing.name
        : normalizeRequiredText(body.name, 'name'),
    enabled,
    permissionCodes:
      body.permissionCodes === undefined
        ? undefined
        : normalizePermissionCodes(body.permissionCodes),
    system,
    dataScope,
    dataScopeDeptIds: dataScope === 'custom' ? dataScopeDeptIds : [],
  };
}

function assertRoleStatusAllowed(system: boolean, enabled: boolean): void {
  if (system && !enabled) {
    throw new BadRequestException('System roles cannot be disabled.');
  }
}

export function normalizeSetRoleStatusInput(body: SetRoleStatusDto): {
  enabled: boolean;
} {
  return {
    enabled: normalizeRequiredBoolean(body?.enabled, 'enabled'),
  };
}

export function compareSystemRoleRecords(
  left: SystemRoleRecord,
  right: SystemRoleRecord,
): number {
  return left.code.localeCompare(right.code);
}

function normalizeRoleCode(value: string): string {
  const code = normalizeRequiredText(value, 'code');

  if (!ROLE_CODE_PATTERN.test(code)) {
    throw new BadRequestException(
      'System role code must start with a lowercase letter and contain only lowercase letters, numbers, dot, underscore or dash.',
    );
  }

  return code;
}

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new BadRequestException(`System role ${fieldName} is required.`);
  }

  return normalized;
}

function normalizeOptionalBoolean(
  value: unknown,
  fieldName: string,
  fallback: boolean,
): boolean {
  return value === undefined
    ? fallback
    : normalizeRequiredBoolean(value, fieldName);
}

function normalizeRequiredBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new BadRequestException(
      `System role ${fieldName} must be a boolean.`,
    );
  }

  return value;
}

function normalizePermissionCodes(
  values: readonly string[] | undefined,
): readonly string[] {
  const normalized = (values ?? []).map((value) =>
    normalizeRequiredText(value, 'permission code'),
  );
  const duplicate = findFirstDuplicate(normalized);

  if (duplicate) {
    throw new BadRequestException(
      `System role permission code is duplicated: ${duplicate}`,
    );
  }

  return [...normalized].sort();
}

export function normalizeDataScope(value: string): SystemRoleDataScope {
  if (
    systemRoleDataScopeTypes.includes(
      value as (typeof systemRoleDataScopeTypes)[number],
    )
  ) {
    return value as SystemRoleDataScope;
  }

  throw new BadRequestException(`System role dataScope is invalid: ${value}`);
}

function normalizeDataScopeDeptIds(
  values: readonly string[],
): readonly string[] {
  const normalized = values.map((value) =>
    normalizeRequiredText(value, 'data scope dept id'),
  );
  const duplicate = findFirstDuplicate(normalized);

  if (duplicate) {
    throw new BadRequestException(
      `System role data scope dept id is duplicated: ${duplicate}`,
    );
  }

  return [...normalized].sort();
}

function assertDataScopeDeptIds(
  dataScope: SystemRoleDataScope,
  dataScopeDeptIds: readonly string[],
): void {
  if (dataScope === 'custom' && dataScopeDeptIds.length === 0) {
    throw new BadRequestException(
      'System role custom data scope requires at least one dept id.',
    );
  }
}

function findFirstDuplicate(values: readonly string[]): string | undefined {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }

    seen.add(value);
  }

  return undefined;
}
