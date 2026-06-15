import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { createApiErrorBody } from '@opencore/common';
import {
  SecurityAuthUserRepository,
  type SecurityDataScopeProfile,
  type SecurityAuthUserRecord,
} from '@opencore/security';
import { isPermissionCode } from '@opencore/contracts';

export type RbacUserRecord = SecurityAuthUserRecord;

export type PermissionSummaryRecord = {
  code: string;
  title: string;
  stage: string;
  dangerous: boolean;
  system: boolean;
};

export type CreatePermissionRecord = {
  code: string;
  title: string;
};

export type UpdatePermissionRecord = {
  title?: string;
};

export type RbacExportResource = 'permissions';

export type RbacExportPreview = {
  filename: string;
  scope: 'current-page';
  columns: readonly string[];
  rowCount: number;
  generatedAt: string;
};

export abstract class RbacRepository extends SecurityAuthUserRepository {
  abstract listPermissions(): Promise<PermissionSummaryRecord[]>;

  abstract getPermission(code: string): Promise<PermissionSummaryRecord>;

  abstract createPermission(
    body: CreatePermissionRecord,
  ): Promise<PermissionSummaryRecord>;

  abstract updatePermission(
    code: string,
    body: UpdatePermissionRecord,
  ): Promise<PermissionSummaryRecord>;

  abstract deletePermission(code: string): Promise<{ deleted: true }>;

  abstract getPermissionCodesForUser(userId: string): Promise<string[]>;

  abstract getDataScopeProfileForUser(
    userId: string,
  ): Promise<SecurityDataScopeProfile | undefined>;

  abstract listDescendantDeptIds(deptId: string): Promise<string[]>;

  abstract createExportPreview(
    resource: RbacExportResource,
  ): Promise<RbacExportPreview>;
}

export function createRbacExportPreview(
  resource: RbacExportResource,
  rows: readonly unknown[],
): RbacExportPreview {
  return {
    filename: `opencore-rbac-${resource}.csv`,
    scope: 'current-page',
    columns: [...exportColumnsByResource[resource]],
    rowCount: rows.length,
    generatedAt: new Date().toISOString(),
  };
}

const exportColumnsByResource = {
  permissions: ['code', 'title', 'stage', 'dangerous', 'system'],
} as const;

export function normalizeCreatePermissionInput(
  body: CreatePermissionRecord,
): CreatePermissionRecord {
  return {
    code: normalizePermissionCode(body.code),
    title: normalizePermissionTitle(body.title),
  };
}

export function normalizeUpdatePermissionInput(
  body: UpdatePermissionRecord,
): UpdatePermissionRecord {
  return {
    title:
      body.title === undefined
        ? undefined
        : normalizePermissionTitle(body.title),
  };
}

function normalizePermissionCode(value: string): string {
  const code = normalizeRequiredPermissionText(value, 'code');

  if (!isPermissionCode(code)) {
    throw rbacBadRequest(
      'RBAC_PERMISSION_CODE_INVALID',
      'Permission code must follow <layer>:<resource>:<action> and use a supported action.',
      { field: 'code' },
    );
  }

  return code;
}

function normalizePermissionTitle(value: string): string {
  return normalizeRequiredPermissionText(value, 'title');
}

function normalizeRequiredPermissionText(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw rbacBadRequest(
      'RBAC_PERMISSION_FIELD_REQUIRED',
      `Permission ${fieldName} is required.`,
      { field: fieldName },
    );
  }

  return normalized;
}

export function rbacBadRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): BadRequestException {
  return new BadRequestException(
    createApiErrorBody({ code, message, details }),
  );
}

export function rbacConflict(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ConflictException {
  return new ConflictException(createApiErrorBody({ code, message, details }));
}

export function rbacNotFound(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): NotFoundException {
  return new NotFoundException(createApiErrorBody({ code, message, details }));
}
