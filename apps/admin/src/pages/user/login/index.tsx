import {
  AlipayCircleOutlined,
  GithubOutlined,
  GoogleOutlined,
  LinkOutlined,
  LockOutlined,
  TikTokOutlined,
  UserOutlined,
  WechatOutlined,
  WindowsOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProFormCheckbox,
  ProFormText,
} from '@ant-design/pro-components';
import {
  FormattedMessage,
  Helmet,
  SelectLang,
  useIntl,
  useModel,
} from '@umijs/max';
import { Alert, App, Button, Divider, Space, Tooltip, Typography } from 'antd';
import { createStyles } from 'antd-style';
import React, { startTransition, useEffect, useState } from 'react';
import { Footer } from '@/components';
import { registrySummary, shellMenuItems } from '@/core/shellRegistry';
import { formatRequestErrorMessage } from '@/requestErrorConfig';
import {
  listOpenCoreSocialAuthProviders,
  loginToOpenCore,
  startOpenCoreSocialAuthFlow,
  toAdminCurrentUser,
} from '@/services/opencore/auth';
import type { SocialAuthProviderSummary } from '@opencore/sdk';
import Settings from '../../../../config/defaultSettings';

type LoginValues = {
  autoLogin?: boolean;
  password: string;
  tenantCode?: string;
  username: string;
};

const useStyles = createStyles(({ token }) => {
  return {
    lang: {
      width: 42,
      height: 42,
      lineHeight: '42px',
      position: 'fixed',
      right: 16,
      borderRadius: token.borderRadius,
      ':hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100dvh',
      overflow: 'auto',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
    },
    loginPolicyText: {
      fontSize: 12,
      lineHeight: '20px',
    },
    socialButton: {
      justifyContent: 'flex-start',
      minHeight: 40,
      transition: 'transform 160ms ease, border-color 160ms ease',
      ':active': {
        transform: 'translateY(1px) scale(0.99)',
      },
    },
    socialGrid: {
      display: 'grid',
      gap: 8,
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
    socialMessage: {
      display: 'block',
      fontSize: 12,
      lineHeight: '18px',
      marginTop: 8,
    },
  };
});

const SOCIAL_REDIRECT_STORAGE_PREFIX = 'opencore.social.redirect.';

const Lang = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.lang} data-lang>
      {SelectLang && <SelectLang />}
    </div>
  );
};

const LoginMessage: React.FC<{
  content: string;
}> = ({ content }) => {
  return (
    <Alert
      style={{
        marginBottom: 24,
      }}
      title={content}
      type="error"
      showIcon
    />
  );
};

function getSafeRedirectUrl(redirect: string | null): string {
  if (!redirect?.startsWith('/')) return '/dashboard';

  if (redirect.startsWith('//')) return '/dashboard';

  try {
    const parsed = new URL(redirect, window.location.origin);

    if (parsed.origin !== window.location.origin) return '/dashboard';

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/dashboard';
  }
}

const Login: React.FC = () => {
  const [loginError, setLoginError] = useState<string>();
  const [socialProviders, setSocialProviders] = useState<
    readonly SocialAuthProviderSummary[]
  >([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [startingProviderCode, setStartingProviderCode] = useState<string>();
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const { message } = App.useApp();
  const intl = useIntl();
  const runtimeTitle =
    initialState?.settings?.title ?? Settings.title ?? 'OpenCore Admin';
  const loginLockoutMinutes = initialState?.runtimeConfig?.loginLockoutMinutes;
  const loginMaxFailedAttempts =
    initialState?.runtimeConfig?.loginMaxFailedAttempts;

  useEffect(() => {
    let mounted = true;

    listOpenCoreSocialAuthProviders()
      .then((providers) => {
        if (mounted) {
          setSocialProviders(providers);
        }
      })
      .catch(() => {
        if (mounted) {
          setSocialProviders([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();

    if (userInfo) {
      startTransition(() => {
        setInitialState((s) => ({
          ...(s ?? {}),
          currentUser: userInfo,
          menus: s?.menus ?? shellMenuItems,
          permissions: userInfo.permissionCodes,
          registrySummary: s?.registrySummary ?? registrySummary,
        }));
      });
    }

    return userInfo;
  };

  const handleSubmit = async (values: LoginValues) => {
    try {
      const session = await loginToOpenCore({
        username: values.username,
        password: values.password,
        tenantCode: values.tenantCode,
      });
      if (session.status !== 'authenticated') {
        throw new Error(
          intl.formatMessage({
            id: 'pages.login.tenantSelectionRequired',
            defaultMessage: 'Please select a tenant before continuing.',
          }),
        );
      }
      const currentUser =
        (await fetchUserInfo()) ?? toAdminCurrentUser(session.user);

      startTransition(() => {
        setInitialState((s) => ({
          ...(s ?? {}),
          currentUser,
          menus: s?.menus ?? shellMenuItems,
          permissions: currentUser.permissionCodes,
          registrySummary: s?.registrySummary ?? registrySummary,
        }));
      });

      message.success(
        intl.formatMessage({
          id: 'pages.login.success',
          defaultMessage: 'Login successful.',
        }),
      );

      const urlParams = new URL(window.location.href).searchParams;
      window.location.href = getSafeRedirectUrl(urlParams.get('redirect'));
    } catch (error) {
      const defaultLoginFailureMessage = intl.formatMessage({
        id: 'pages.login.failure',
        defaultMessage: 'Login failed. Please try again.',
      });
      const errorMessage =
        formatRequestErrorMessage(error) || defaultLoginFailureMessage;

      setLoginError(errorMessage);
      message.error(errorMessage);
      console.error(error);
    }
  };

  const handleSocialLogin = async (provider: SocialAuthProviderSummary) => {
    if (provider.status !== 'ready') {
      message.warning(provider.message);
      return;
    }

    setSocialLoading(true);
    setStartingProviderCode(provider.code);
    try {
      const urlParams = new URL(window.location.href).searchParams;
      const redirect = getSafeRedirectUrl(urlParams.get('redirect'));
      const flow = await startOpenCoreSocialAuthFlow({
        providerCode: provider.code,
        redirect,
      });

      window.sessionStorage.setItem(
        `${SOCIAL_REDIRECT_STORAGE_PREFIX}${flow.state}`,
        redirect,
      );
      window.location.href = flow.authorizationUrl;
    } catch (error) {
      const errorMessage =
        formatRequestErrorMessage(error) ||
        intl.formatMessage({
          id: 'pages.login.social.startFailure',
          defaultMessage: 'Unable to start social login.',
        });
      message.error(errorMessage);
    } finally {
      setSocialLoading(false);
      setStartingProviderCode(undefined);
    }
  };

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'menu.login',
            defaultMessage: 'Login',
          })}
          {runtimeTitle && ` - ${runtimeTitle}`}
        </title>
      </Helmet>
      <Lang />
      <div
        style={{
          flex: '1',
          padding: '32px 0',
        }}
      >
        <LoginForm<LoginValues>
          contentStyle={{
            minWidth: 280,
            maxWidth: '75vw',
          }}
          logo={<img alt="logo" src="/logo.svg" />}
          title={runtimeTitle}
          subTitle={
            <Space direction="vertical" size={2}>
              <span>
                {intl.formatMessage({
                  id: 'pages.layouts.userLayout.title',
                  defaultMessage: 'OpenCore enterprise administration console',
                })}
              </span>
              {typeof loginLockoutMinutes === 'number' &&
              typeof loginMaxFailedAttempts === 'number' ? (
                <Typography.Text
                  className={styles.loginPolicyText}
                  type="secondary"
                >
                  {intl.formatMessage(
                    {
                      id: 'pages.login.lockoutPolicy',
                      defaultMessage:
                        'Login lockout policy: {attempts} failed attempts / {minutes} minutes',
                    },
                    {
                      attempts: loginMaxFailedAttempts,
                      minutes: loginLockoutMinutes,
                    },
                  )}
                </Typography.Text>
              ) : null}
            </Space>
          }
          initialValues={{
            autoLogin: true,
          }}
          onFinish={async (values) => {
            await handleSubmit(values);
          }}
        >
          {loginError && <LoginMessage content={loginError} />}
          <ProFormText
            name="username"
            fieldProps={{
              size: 'large',
              prefix: <UserOutlined />,
            }}
            placeholder={intl.formatMessage({
              id: 'pages.login.username.placeholder',
              defaultMessage: 'Username',
            })}
            rules={[
              {
                required: true,
                message: (
                  <FormattedMessage
                    id="pages.login.username.required"
                    defaultMessage="Please input your username."
                  />
                ),
              },
            ]}
          />
          <ProFormText
            name="tenantCode"
            fieldProps={{
              size: 'large',
              prefix: <LinkOutlined />,
            }}
            placeholder={intl.formatMessage({
              id: 'pages.login.tenantCode.placeholder',
              defaultMessage: 'Tenant code',
            })}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{
              size: 'large',
              prefix: <LockOutlined />,
            }}
            placeholder={intl.formatMessage({
              id: 'pages.login.password.placeholder',
              defaultMessage: 'Password',
            })}
            rules={[
              {
                required: true,
                message: (
                  <FormattedMessage
                    id="pages.login.password.required"
                    defaultMessage="Please input your password."
                  />
                ),
              },
            ]}
          />
          <div
            style={{
              marginBottom: 24,
            }}
          >
            <ProFormCheckbox noStyle name="autoLogin">
              <FormattedMessage
                id="pages.login.rememberMe"
                defaultMessage="Remember me"
              />
            </ProFormCheckbox>
          </div>
          <Divider plain>
            {intl.formatMessage({
              id: 'pages.login.social.divider',
              defaultMessage: 'Other sign-in methods',
            })}
          </Divider>
          <div className={styles.socialGrid}>
            {socialProviders.map((provider) => {
              const ready = provider.status === 'ready';
              const loading = startingProviderCode === provider.code;
              const button = (
                <Button
                  key={provider.code}
                  block
                  className={styles.socialButton}
                  disabled={!ready || socialLoading}
                  icon={renderSocialIcon(provider.icon)}
                  loading={loading}
                  onClick={() => void handleSocialLogin(provider)}
                >
                  {provider.name}
                </Button>
              );

              return ready ? (
                <span key={provider.code}>{button}</span>
              ) : (
                <Tooltip key={provider.code} title={provider.message}>
                  <span>{button}</span>
                </Tooltip>
              );
            })}
          </div>
          <Typography.Text className={styles.socialMessage} type="secondary">
            {intl.formatMessage({
              id: 'pages.login.social.hint',
              defaultMessage:
                'Unavailable channels require third-party app configuration before use.',
            })}
          </Typography.Text>
        </LoginForm>
      </div>
      <Footer />
    </div>
  );
};

function renderSocialIcon(icon: string) {
  switch (icon) {
    case 'alipay-circle':
      return <AlipayCircleOutlined />;
    case 'github':
      return <GithubOutlined />;
    case 'google':
      return <GoogleOutlined />;
    case 'tik-tok':
      return <TikTokOutlined />;
    case 'wechat':
      return <WechatOutlined />;
    case 'windows':
      return <WindowsOutlined />;
    default:
      return <LinkOutlined />;
  }
}

export default Login;
