export type AuthenticatedUser = {
  id: string;
  username: string;
  displayName: string;
  roleCodes: readonly string[];
  permissionCodes: readonly string[];
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  user: AuthenticatedUser;
};

export type UserSummary = {
  id: string;
  username: string;
  displayName: string;
  roleCodes: readonly string[];
  enabled: boolean;
};

export type RoleSummary = {
  id: string;
  code: string;
  name: string;
  permissionCodes: readonly string[];
  system: boolean;
};

export type PermissionSummary = {
  code: string;
  title: string;
  stage: string;
  dangerous: boolean;
};

export type MenuSummary = {
  key: string;
  title: string;
  path: string;
  permissionCode?: string;
  stage: string;
  order: number;
};
