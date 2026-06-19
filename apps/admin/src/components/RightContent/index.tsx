import {
  BookOutlined,
  CheckOutlined,
  ForkOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import {
  getAllLocales,
  getLocale,
  history,
  setLocale,
  useIntl,
} from '@umijs/max';
import type { MenuProps } from 'antd';
import { Button, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import React, { useMemo } from 'react';
import HeaderDropdown from '../HeaderDropdown';

export const localeLabelMap: Record<string, { label: string }> = {
  'zh-CN': { label: '简体中文' },
  'en-US': { label: 'English' },
};

const useStyles = createStyles(({ token, css }) => ({
  action: css`
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 36px !important;
    min-width: 36px;
    padding-inline: 8px !important;
    padding-block: 0 !important;
    border-radius: ${token.borderRadius}px !important;
  `,
}));

export const DocLink: React.FC = () => {
  const { styles } = useStyles();
  const intl = useIntl();

  return (
    <Tooltip
      title={intl.formatMessage({
        id: 'app.header.dashboard',
        defaultMessage: 'OpenCore Dashboard',
      })}
    >
      <Button
        type="text"
        className={styles.action}
        icon={<BookOutlined />}
        aria-label={intl.formatMessage({
          id: 'app.header.dashboard',
          defaultMessage: 'OpenCore Dashboard',
        })}
        onClick={() => {
          history.push('/dashboard');
        }}
      />
    </Tooltip>
  );
};

const onVersionClick: MenuProps['onClick'] = ({ key }) => {
  history.push(key);
};

export const VersionDropdown: React.FC = () => {
  const { styles } = useStyles();
  const intl = useIntl();
  const versionItems: MenuProps['items'] = [
    { key: '/tools/openapi', label: 'OpenAPI' },
    {
      key: '/system/area',
      label: intl.formatMessage({
        id: 'menu.system.area',
        defaultMessage: 'Area Management',
      }),
    },
    { key: '/tools/openforge', label: 'OpenForge' },
    {
      key: '/monitor/version',
      label: intl.formatMessage(
        {
          id: 'app.header.version',
          defaultMessage: 'Version {version}',
        },
        { version: __APP_VERSION__ },
      ),
    },
  ];

  return (
    <HeaderDropdown
      placement="bottomRight"
      arrow
      menu={{
        selectedKeys: [],
        onClick: onVersionClick,
        items: versionItems,
        style: { minWidth: 100 },
      }}
    >
      <Button
        type="text"
        className={styles.action}
        aria-label={intl.formatMessage({
          id: 'app.header.tools',
          defaultMessage: 'OpenCore tools',
        })}
      >
        <ForkOutlined />
      </Button>
    </HeaderDropdown>
  );
};

export const LangDropdown: React.FC = () => {
  const { styles } = useStyles();
  const intl = useIntl();
  const allLocales = useMemo(() => getAllLocales(), []);
  const currentLocale = getLocale();
  const supportLocales = allLocales.filter((l) => l in localeLabelMap);

  if (supportLocales.length <= 1) {
    return null;
  }

  const langItems: MenuProps['items'] = supportLocales.map((locale) => ({
    key: `lang-${locale}`,
    icon:
      locale === currentLocale ? (
        <CheckOutlined style={{ color: '#52c41a' }} />
      ) : (
        <span style={{ display: 'inline-block', width: 14 }} />
      ),
    label: localeLabelMap[locale]?.label ?? locale,
  }));

  const onLangClick: MenuProps['onClick'] = ({ key }) => {
    if (key.startsWith('lang-')) {
      setLocale(key.replace('lang-', ''), false);
    }
  };

  return (
    <HeaderDropdown
      placement="bottomRight"
      arrow
      menu={{
        selectedKeys: [`lang-${currentLocale}`],
        onClick: onLangClick,
        items: langItems,
        style: { minWidth: 180 },
      }}
    >
      <Button
        type="text"
        className={styles.action}
        aria-label={intl.formatMessage({
          id: 'app.header.language',
          defaultMessage: 'Switch language',
        })}
      >
        <GlobalOutlined />
      </Button>
    </HeaderDropdown>
  );
};
