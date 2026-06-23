import { LinkOutlined } from '@ant-design/icons';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { getIntl, history, Link } from '@umijs/max';
import { ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import React from 'react';
import {
  AvatarDropdown,
  DocLink,
  ErrorBoundary,
  Footer,
  LangDropdown,
  NoticeBell,
  OfflineBanner,
  TenantSwitcher,
  VersionDropdown,
} from '@/components';
import {
  registrySummary,
  shellMenuItems,
  type ShellMenuItem,
} from '@/core/shellRegistry';
import {
  queryCurrentOpenCoreUser,
  toAdminCurrentUser,
  type AdminCurrentUser,
} from '@/services/opencore/auth';
import { getOpenCoreAdminRuntimeConfig } from '@/services/opencore/runtimeConfig';
import type { SystemConfigRuntimeSummary } from '@opencore/sdk';
import useShadcnTheme from '@/theme/shadcnTheme';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';

dayjs.extend(relativeTime);

const isDev = process.env.NODE_ENV === 'development';
const loginPath = '/user/login';
const socialLoginPath = '/user/social-login';
const publicPaths = new Set([
  loginPath,
  socialLoginPath,
  '/403',
  '/404',
  '/500',
]);
const fallbackAdminTitle = defaultSettings.title ?? 'OpenCore Admin';

function isPublicPath(pathname: string): boolean {
  return (
    publicPaths.has(pathname) ||
    pathname === '/redirect' ||
    pathname.startsWith('/redirect/')
  );
}

export type AdminInitialState = {
  settings?: Partial<LayoutSettings>;
  currentUser?: AdminCurrentUser;
  permissions: readonly string[];
  menus: readonly ShellMenuItem[];
  registrySummary: typeof registrySummary;
  runtimeConfig?: SystemConfigRuntimeSummary;
  loading?: boolean;
  fetchUserInfo?: () => Promise<AdminCurrentUser | undefined>;
  settingDrawerOpen?: boolean;
};

function redirectToLogin(): void {
  const { pathname, search, hash } = history.location;

  history.replace(
    `${loginPath}?redirect=${encodeURIComponent(pathname + search + hash)}`,
  );
}

function formatAdminLayoutMessage(message: {
  defaultMessage?: string;
  id: string;
}): string {
  return getIntl().formatMessage(message);
}

export async function getInitialState(): Promise<AdminInitialState> {
  const runtimeConfig = await getOpenCoreAdminRuntimeConfig().catch(
    () => undefined,
  );
  const fetchUserInfo = async () => {
    try {
      const session = await queryCurrentOpenCoreUser();
      return toAdminCurrentUser(session.user);
    } catch (_error) {
      const { pathname } = history.location;

      if (!isPublicPath(pathname)) {
        redirectToLogin();
      }
    }

    return undefined;
  };

  const { location } = history;
  const baseState = {
    fetchUserInfo,
    menus: shellMenuItems,
    permissions: [],
    registrySummary,
    runtimeConfig,
    settings: {
      ...(defaultSettings as Partial<LayoutSettings>),
      title: runtimeConfig?.adminTitle ?? fallbackAdminTitle,
    },
    settingDrawerOpen: false,
  };

  if (!isPublicPath(location.pathname)) {
    const currentUser = await fetchUserInfo();

    return {
      ...baseState,
      currentUser,
      permissions: currentUser?.permissionCodes ?? [],
    };
  }

  return baseState;
}

export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  return {
    formatMessage: formatAdminLayoutMessage,
    menuItemRender: (item, dom) => {
      if (item.path) {
        return (
          <Link to={item.path} prefetch>
            {dom}
          </Link>
        );
      }
      return dom;
    },
    actionsRender: () => {
      const localeEnabled =
        (initialState?.settings as { locale?: boolean })?.locale !== false;
      return [
        <DocLink key="doc" />,
        <NoticeBell key="notice" />,
        <TenantSwitcher key="tenant" />,
        <VersionDropdown key="version" />,
        localeEnabled && <LangDropdown key="lang" />,
      ].filter(Boolean);
    },
    avatarProps: {
      src: initialState?.currentUser?.avatar,
      title: initialState?.currentUser?.name ?? 'OpenCore User',
      render: (_, avatarChildren) => (
        <AvatarDropdown>{avatarChildren}</AvatarDropdown>
      ),
    },
    footerRender: () => <Footer />,
    onPageChange: () => {
      const { location } = history;

      if (!initialState?.currentUser && !isPublicPath(location.pathname)) {
        history.replace(
          `${loginPath}?redirect=${encodeURIComponent(location.pathname + location.search + location.hash)}`,
        );
      }
    },
    bgLayoutImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: isDev
      ? [
          <Link key="openapi" to="/tools/openapi" target="_blank">
            <LinkOutlined />
            <span>OpenAPI</span>
          </Link>,
        ]
      : [],
    ErrorBoundary,
    menuHeaderRender: undefined,
    childrenRender: (children) => {
      return (
        <>
          {children}
          {isDev ? (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              collapse={initialState?.settingDrawerOpen}
              onCollapseChange={(open) => {
                setInitialState((s) => ({
                  ...(s ?? {}),
                  menus: s?.menus ?? shellMenuItems,
                  permissions: s?.permissions ?? [],
                  registrySummary: s?.registrySummary ?? registrySummary,
                  settingDrawerOpen: open,
                }));
              }}
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((s) => ({
                  ...(s ?? {}),
                  menus: s?.menus ?? shellMenuItems,
                  permissions: s?.permissions ?? [],
                  registrySummary: s?.registrySummary ?? registrySummary,
                  settings,
                }));
              }}
            />
          ) : null}
        </>
      );
    },
    ...initialState?.settings,
  };
};

export const request: RequestConfig = {
  baseURL: process.env.ADMIN_API_BASE_URL ?? '',
  ...errorConfig,
};

const AppThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const configProps = useShadcnTheme();

  return <ConfigProvider {...configProps}>{children}</ConfigProvider>;
};

export function rootContainer(container: React.ReactNode) {
  return (
    <AppThemeProvider>
      <OfflineBanner />
      <ErrorBoundary>{container}</ErrorBoundary>
    </AppThemeProvider>
  );
}
