import { LockOutlined, UserOutlined } from '@ant-design/icons';
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
import { Alert, App } from 'antd';
import { createStyles } from 'antd-style';
import React, { startTransition, useState } from 'react';
import { Footer } from '@/components';
import { registrySummary, shellMenuItems } from '@/core/shellRegistry';
import { loginToOpenCore, toAdminCurrentUser } from '@/services/opencore/auth';
import Settings from '../../../../config/defaultSettings';

type LoginValues = {
  autoLogin?: boolean;
  password: string;
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
      height: '100vh',
      overflow: 'auto',
      backgroundImage:
        "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
      backgroundSize: '100% 100%',
    },
  };
});

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
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const { message } = App.useApp();
  const intl = useIntl();

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
      });
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
      setLoginError(defaultLoginFailureMessage);
      message.error(defaultLoginFailureMessage);
      console.error(error);
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
          {Settings.title && ` - ${Settings.title}`}
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
          title="OpenCore Admin"
          subTitle={intl.formatMessage({
            id: 'pages.layouts.userLayout.title',
            defaultMessage: 'OpenCore enterprise administration console',
          })}
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
        </LoginForm>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
