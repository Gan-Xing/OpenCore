export type RbacUserRecord = {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  roleCodes: readonly string[];
  enabled: boolean;
};

export type UserSummaryRecord = Omit<RbacUserRecord, 'passwordHash'>;

export type RoleSummaryRecord = {
  id: string;
  code: string;
  name: string;
  permissionCodes: readonly string[];
  system: boolean;
};

export type PermissionSummaryRecord = {
  code: string;
  title: string;
  stage: string;
  dangerous: boolean;
};

export type MenuSummaryRecord = {
  key: string;
  title: string;
  path: string;
  permissionCode?: string;
  stage: string;
  order: number;
};

export abstract class RbacRepository {
  abstract listUsers(): Promise<UserSummaryRecord[]>;

  abstract findUserByUsername(
    username: string,
  ): Promise<RbacUserRecord | undefined>;

  abstract findUserById(id: string): Promise<RbacUserRecord | undefined>;

  abstract listRoles(): Promise<RoleSummaryRecord[]>;

  abstract listPermissions(): Promise<PermissionSummaryRecord[]>;

  abstract listMenus(): Promise<MenuSummaryRecord[]>;

  abstract getPermissionCodesForUser(userId: string): Promise<string[]>;
}
