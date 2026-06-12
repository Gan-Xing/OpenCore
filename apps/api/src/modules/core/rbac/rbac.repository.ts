import {
  SecurityAuthUserRepository,
  type SecurityDataScopeProfile,
  type SecurityAuthUserRecord,
} from '@opencore/security';

export type RbacUserRecord = SecurityAuthUserRecord;

export type PermissionSummaryRecord = {
  code: string;
  title: string;
  stage: string;
  dangerous: boolean;
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
  permissions: ['code', 'title', 'stage', 'dangerous'],
} as const;
