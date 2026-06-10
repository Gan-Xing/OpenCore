import type {
  LoginRequest,
  LoginResponse,
  MenuSummary,
  PermissionSummary,
  RoleSummary,
  UserSummary,
} from './rbac-types';

export type SdkRequest = <T>(
  path: `/${string}`,
  options?: {
    method?: 'GET' | 'POST';
    body?: unknown;
    token?: string;
  },
) => Promise<T>;

export type RbacClient = {
  login: (request: LoginRequest) => Promise<LoginResponse>;
  me: (token: string) => Promise<LoginResponse>;
  listUsers: (token: string) => Promise<UserSummary[]>;
  listRoles: (token: string) => Promise<RoleSummary[]>;
  listPermissions: (token: string) => Promise<PermissionSummary[]>;
  listMenus: (token: string) => Promise<MenuSummary[]>;
};

export function createRbacClient(request: SdkRequest): RbacClient {
  return {
    login: (body) =>
      request<LoginResponse>('/auth/login', {
        method: 'POST',
        body,
      }),
    me: (token) =>
      request<LoginResponse>('/auth/me', {
        token,
      }),
    listUsers: (token) =>
      request<UserSummary[]>('/core/users', {
        token,
      }),
    listRoles: (token) =>
      request<RoleSummary[]>('/core/roles', {
        token,
      }),
    listPermissions: (token) =>
      request<PermissionSummary[]>('/core/permissions', {
        token,
      }),
    listMenus: (token) =>
      request<MenuSummary[]>('/core/menus', {
        token,
      }),
  };
}
