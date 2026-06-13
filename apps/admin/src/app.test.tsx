import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  history: {
    location: {
      pathname: '/dashboard',
      search: '',
      hash: '',
    },
    replace: vi.fn(),
  },
  getOpenCoreAdminRuntimeConfig: vi.fn(),
  queryCurrentOpenCoreUser: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: mocks.history,
  Link: ({ children }: any) => children,
}));

vi.mock('@/services/opencore/auth', () => ({
  queryCurrentOpenCoreUser: mocks.queryCurrentOpenCoreUser,
  toAdminCurrentUser: (user: any) => ({
    ...user,
    name: user.displayName,
    userid: user.id,
  }),
}));

vi.mock('@/services/opencore/runtimeConfig', () => ({
  getOpenCoreAdminRuntimeConfig: mocks.getOpenCoreAdminRuntimeConfig,
}));

vi.mock('@/core/shellRegistry', () => ({
  registrySummary: {
    shellModuleCount: 1,
    shellPermissionCount: 1,
    plannedModuleCount: 0,
  },
  shellMenuItems: [
    {
      key: 'dashboard.home',
      name: 'Dashboard',
      path: '/dashboard',
      permissionCode: 'core:dashboard:read',
      stage: 'S5',
      order: 10,
    },
  ],
}));

vi.mock('@/components', () => ({
  AvatarDropdown: () => null,
  DocLink: () => null,
  ErrorBoundary: ({ children }: any) => children,
  Footer: () => null,
  LangDropdown: () => null,
  OfflineBanner: () => null,
  VersionDropdown: () => null,
}));

vi.mock('@ant-design/pro-components', () => ({
  SettingDrawer: () => null,
}));

vi.mock('@ant-design/icons', () => ({
  LinkOutlined: () => null,
}));

vi.mock('@/theme/shadcnTheme', () => ({
  default: () => ({}),
}));

vi.mock('./requestErrorConfig', () => ({
  errorConfig: {},
}));

vi.mock('../config/defaultSettings', () => ({
  default: { navTheme: 'light' },
}));

describe('app getInitialState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.history.location = {
      pathname: '/dashboard',
      search: '',
      hash: '',
    };
    mocks.getOpenCoreAdminRuntimeConfig.mockResolvedValue({
      adminTitle: 'OpenCore Admin',
    });
  });

  it('fetches the OpenCore current user when not on a public page', async () => {
    const { getInitialState } = await import('./app');
    mocks.queryCurrentOpenCoreUser.mockResolvedValue({
      user: {
        id: 'user_admin',
        username: 'admin',
        displayName: 'OpenCore Admin',
        roleCodes: ['admin'],
        postCodes: [],
        permissionCodes: ['core:dashboard:read'],
      },
    });

    const state = await getInitialState();

    expect(mocks.queryCurrentOpenCoreUser).toHaveBeenCalled();
    expect(mocks.getOpenCoreAdminRuntimeConfig).toHaveBeenCalled();
    expect(state.currentUser).toMatchObject({
      id: 'user_admin',
      name: 'OpenCore Admin',
      userid: 'user_admin',
    });
    expect(state.permissions).toEqual(['core:dashboard:read']);
    expect(state.settingDrawerOpen).toBe(false);
    expect(state.fetchUserInfo).toBeDefined();
  });

  it('redirects to login when current user fetch fails', async () => {
    const { getInitialState } = await import('./app');
    mocks.queryCurrentOpenCoreUser.mockRejectedValue(new Error('401'));

    const state = await getInitialState();

    expect(mocks.history.replace).toHaveBeenCalledWith(
      expect.stringContaining('/user/login?redirect='),
    );
    expect(state.currentUser).toBeUndefined();
    expect(state.permissions).toEqual([]);
  });

  it('does not fetch current user on the login page', async () => {
    const { getInitialState } = await import('./app');
    mocks.history.location = {
      pathname: '/user/login',
      search: '',
      hash: '',
    };

    const state = await getInitialState();

    expect(mocks.queryCurrentOpenCoreUser).not.toHaveBeenCalled();
    expect(mocks.getOpenCoreAdminRuntimeConfig).toHaveBeenCalled();
    expect(state.currentUser).toBeUndefined();
    expect(state.fetchUserInfo).toBeDefined();
  });

  it('encodes redirect path correctly on auth failure', async () => {
    const { getInitialState } = await import('./app');
    mocks.history.location = {
      pathname: '/system/users',
      search: '?page=2',
      hash: '#section',
    };
    mocks.queryCurrentOpenCoreUser.mockRejectedValue(new Error('401'));

    await getInitialState();

    expect(mocks.history.replace).toHaveBeenCalledWith(
      `/user/login?redirect=${encodeURIComponent('/system/users?page=2#section')}`,
    );
  });

  it('includes default settings and shell metadata in initial state', async () => {
    const { getInitialState } = await import('./app');
    mocks.queryCurrentOpenCoreUser.mockResolvedValue({
      user: {
        id: 'user_admin',
        username: 'admin',
        displayName: 'OpenCore Admin',
        roleCodes: ['admin'],
        postCodes: [],
        permissionCodes: ['core:dashboard:read'],
      },
    });

    const state = await getInitialState();

    expect(state.settings).toEqual({
      navTheme: 'light',
      title: 'OpenCore Admin',
    });
    expect(state.registrySummary.shellModuleCount).toBe(1);
    expect(state.menus).toHaveLength(1);
  });

  it('uses runtime config to override the Admin title', async () => {
    const { getInitialState } = await import('./app');
    mocks.getOpenCoreAdminRuntimeConfig.mockResolvedValue({
      adminTitle: 'OpenCore Runtime Admin',
    });
    mocks.queryCurrentOpenCoreUser.mockResolvedValue({
      user: {
        id: 'user_admin',
        username: 'admin',
        displayName: 'OpenCore Admin',
        roleCodes: ['admin'],
        postCodes: [],
        permissionCodes: ['core:dashboard:read'],
      },
    });

    const state = await getInitialState();

    expect(state.settings?.title).toBe('OpenCore Runtime Admin');
  });
});
