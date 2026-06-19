import {
  GithubOutlined,
  LinkOutlined,
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { Helmet, history, useIntl, useModel } from '@umijs/max';
import { Alert, App, Button, Result, Space, Spin, Typography } from 'antd';
import { createStyles } from 'antd-style';
import React, { startTransition, useEffect, useMemo, useState } from 'react';
import { Footer } from '@/components';
import { registrySummary, shellMenuItems } from '@/core/shellRegistry';
import { formatRequestErrorMessage } from '@/requestErrorConfig';
import {
  bindOpenCoreSocialAuthLogin,
  completeOpenCoreSocialAuthLogin,
  toAdminCurrentUser,
} from '@/services/opencore/auth';
import type { SocialAuthResultSummary } from '@opencore/sdk';
import Settings from '../../../../config/defaultSettings';

type BindValues = {
  password: string;
  username: string;
};

type PageState = 'binding' | 'failed' | 'loading' | 'success';

const SOCIAL_REDIRECT_STORAGE_PREFIX = 'opencore.social.redirect.';

const useStyles = createStyles(({ token }) => ({
  container: {
    alignItems: 'center',
    background:
      'linear-gradient(135deg, rgba(245,247,250,.96), rgba(235,239,247,.92))',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100dvh',
  },
  panel: {
    background: token.colorBgContainer,
    borderRadius: token.borderRadiusLG,
    boxShadow: '0 18px 48px rgba(22, 34, 51, .12)',
    margin: '32px auto',
    maxWidth: 440,
    padding: 32,
    width: 'calc(100% - 32px)',
  },
  providerIcon: {
    fontSize: 28,
  },
}));

const SocialLogin: React.FC = () => {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [socialResult, setSocialResult] = useState<SocialAuthResultSummary>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [binding, setBinding] = useState(false);
  const { initialState, setInitialState } = useModel('@@initialState');
  const { message } = App.useApp();
  const { styles } = useStyles();
  const intl = useIntl();
  const runtimeTitle =
    initialState?.settings?.title ?? Settings.title ?? 'OpenCore Admin';
  const params = useMemo(() => new URL(window.location.href).searchParams, []);
  const providerCode = params.get('providerCode') ?? 'oauth.github';
  const state = params.get('state') ?? '';
  const socialStatus = params.get('socialStatus');
  const failureReason = params.get('reason') ?? '';

  const redirectAfterLogin = () => {
    const redirect =
      window.sessionStorage.getItem(
        `${SOCIAL_REDIRECT_STORAGE_PREFIX}${state}`,
      ) ?? '/dashboard';
    window.sessionStorage.removeItem(
      `${SOCIAL_REDIRECT_STORAGE_PREFIX}${state}`,
    );
    window.location.href = getSafeRedirectUrl(redirect);
  };

  const applySession = (result: SocialAuthResultSummary) => {
    if (!result.session) return;

    const currentUser = toAdminCurrentUser(result.session.user);
    startTransition(() => {
      setInitialState((s) => ({
        ...(s ?? {}),
        currentUser,
        menus: s?.menus ?? shellMenuItems,
        permissions: currentUser.permissionCodes,
        registrySummary: s?.registrySummary ?? registrySummary,
      }));
    });
  };

  useEffect(() => {
    if (socialStatus !== 'accepted' || !state) {
      setPageState('failed');
      setErrorMessage(
        formatSocialCallbackFailureMessage(failureReason, intl.formatMessage),
      );
      return;
    }

    completeOpenCoreSocialAuthLogin({ providerCode, state })
      .then((result) => {
        setSocialResult(result);
        if (result.status === 'authenticated') {
          applySession(result);
          setPageState('success');
          window.setTimeout(redirectAfterLogin, 500);
          return;
        }
        if (result.status === 'requires_binding') {
          setPageState('binding');
          return;
        }
        setPageState('failed');
        setErrorMessage(result.message);
      })
      .catch((error) => {
        setPageState('failed');
        setErrorMessage(formatRequestErrorMessage(error));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failureReason, providerCode, socialStatus, state]);

  const handleBind = async (values: BindValues) => {
    setBinding(true);
    try {
      const result = await bindOpenCoreSocialAuthLogin({
        password: values.password,
        providerCode,
        state,
        username: values.username,
      });
      applySession(result);
      setSocialResult(result);
      setPageState('success');
      message.success(
        intl.formatMessage({
          id: 'pages.login.social.bindSuccess',
          defaultMessage: 'Social account bound.',
        }),
      );
      window.setTimeout(redirectAfterLogin, 500);
    } catch (error) {
      message.error(formatRequestErrorMessage(error));
    } finally {
      setBinding(false);
    }
  };

  return (
    <div className={styles.container}>
      <Helmet>
        <title>
          {intl.formatMessage({
            id: 'pages.login.social.title',
            defaultMessage: 'Social login',
          })}
          {runtimeTitle && ` - ${runtimeTitle}`}
        </title>
      </Helmet>
      <main className={styles.panel}>
        {pageState === 'loading' ? (
          <Result
            icon={<Spin />}
            title={intl.formatMessage({
              id: 'pages.login.social.loading',
              defaultMessage: 'Completing social login',
            })}
            subTitle={intl.formatMessage({
              id: 'pages.login.social.loadingHint',
              defaultMessage: 'Please wait while OpenCore verifies this login.',
            })}
          />
        ) : null}
        {pageState === 'success' ? (
          <Result
            icon={renderProviderIcon(providerCode, styles.providerIcon)}
            status="success"
            title={intl.formatMessage({
              id: 'pages.login.social.success',
              defaultMessage: 'Login successful',
            })}
            subTitle={socialResult?.message}
          />
        ) : null}
        {pageState === 'failed' ? (
          <Result
            status="error"
            title={intl.formatMessage({
              id: 'pages.login.social.failure',
              defaultMessage: 'Social login failed',
            })}
            subTitle={errorMessage}
            extra={
              <Button
                onClick={() => history.push('/user/login')}
                type="primary"
              >
                {intl.formatMessage({
                  id: 'pages.login.social.backLogin',
                  defaultMessage: 'Back to login',
                })}
              </Button>
            }
          />
        ) : null}
        {pageState === 'binding' ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space>
              {renderProviderIcon(providerCode, styles.providerIcon)}
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {intl.formatMessage({
                    id: 'pages.login.social.bindingTitle',
                    defaultMessage: 'Bind an existing OpenCore account',
                  })}
                </Typography.Title>
                <Typography.Text type="secondary">
                  {socialResult?.message}
                </Typography.Text>
              </div>
            </Space>
            <Alert
              message={intl.formatMessage({
                id: 'pages.login.social.bindingNotice',
                defaultMessage:
                  'Enter your OpenCore username and password once. Future logins can use this social account directly.',
              })}
              showIcon
              type="info"
            />
            <LoginForm<BindValues>
              contentStyle={{ minWidth: 0, maxWidth: '100%' }}
              onFinish={handleBind}
              submitter={{
                searchConfig: {
                  submitText: intl.formatMessage({
                    id: 'pages.login.social.bindSubmit',
                    defaultMessage: 'Bind and login',
                  }),
                },
                submitButtonProps: { loading: binding },
              }}
            >
              <ProFormText
                fieldProps={{ prefix: <UserOutlined />, size: 'large' }}
                name="username"
                placeholder={intl.formatMessage({
                  id: 'pages.login.username.placeholder',
                  defaultMessage: 'Username',
                })}
                rules={[{ required: true }]}
              />
              <ProFormText.Password
                fieldProps={{ prefix: <LockOutlined />, size: 'large' }}
                name="password"
                placeholder={intl.formatMessage({
                  id: 'pages.login.password.placeholder',
                  defaultMessage: 'Password',
                })}
                rules={[{ required: true }]}
              />
            </LoginForm>
          </Space>
        ) : null}
      </main>
      <Footer />
    </div>
  );
};

function renderProviderIcon(providerCode: string, className: string) {
  if (providerCode === 'oauth.github' || providerCode === 'github') {
    return <GithubOutlined className={className} />;
  }
  return <LinkOutlined className={className} />;
}

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

function formatSocialCallbackFailureMessage(
  reason: string,
  formatMessage: ReturnType<typeof useIntl>['formatMessage'],
): string {
  if (reason.startsWith('oauth_exchange_request_failed')) {
    return formatMessage({
      id: 'pages.login.social.errors.requestFailed',
      defaultMessage:
        'OpenCore could not reach the OAuth provider. Check server network access to the provider.',
    });
  }

  switch (reason) {
    case 'oauth_exchange_incorrect_client_credentials':
      return formatMessage({
        id: 'pages.login.social.errors.incorrectClientCredentials',
        defaultMessage:
          'GitHub login is misconfigured: Client ID and Client Secret do not match. Update OPENCORE_GITHUB_OAUTH_CLIENT_SECRET on the server and redeploy.',
      });
    case 'oauth_exchange_redirect_uri_mismatch':
      return formatMessage({
        id: 'pages.login.social.errors.redirectUriMismatch',
        defaultMessage:
          'GitHub login is misconfigured: the callback URL does not match the GitHub OAuth App.',
      });
    case 'oauth_exchange_bad_verification_code':
      return formatMessage({
        id: 'pages.login.social.errors.badVerificationCode',
        defaultMessage:
          'The GitHub authorization code is invalid or already used. Start again from the login page.',
      });
    case 'oauth_exchange_not_configured':
      return formatMessage({
        id: 'pages.login.social.errors.notConfigured',
        defaultMessage: 'Social login is not fully configured.',
      });
    case 'oauth_exchange_invalid_response':
      return formatMessage({
        id: 'pages.login.social.errors.invalidResponse',
        defaultMessage:
          'The OAuth provider returned an invalid token response. Check the provider configuration.',
      });
    case 'oauth_exchange_missing_access_token':
    case 'oauth_exchange_missing_id_token':
      return formatMessage({
        id: 'pages.login.social.errors.missingToken',
        defaultMessage:
          'The OAuth provider did not return the required token. Check scopes and provider configuration.',
      });
    default:
      return formatMessage({
        id: 'pages.login.social.callbackRejected',
        defaultMessage: 'Social login was rejected or expired.',
      });
  }
}

export default SocialLogin;
