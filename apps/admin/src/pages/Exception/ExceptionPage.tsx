import {
  ArrowLeftOutlined,
  HomeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl } from '@umijs/max';
import { Button, Card, Result, Space, Typography } from 'antd';
import type { ReactNode } from 'react';

type ExceptionPageProps = {
  status: 403 | 404 | 500;
  title: string;
  subTitle: string;
};

const homePath = '/dashboard';

const exceptionShellStyle: React.CSSProperties = {
  margin: '32px auto',
  maxWidth: 760,
};

const exceptionCardStyle: React.CSSProperties = {
  borderRadius: 8,
};

const exceptionCardBodyStyle: React.CSSProperties = {
  padding: '40px 24px',
};

const ExceptionPage: React.FC<ExceptionPageProps> = ({
  status,
  title,
  subTitle,
}) => {
  const intl = useIntl();
  const description = intl.formatMessage({
    id: `pages.${status}.description`,
    defaultMessage: getDefaultDescription(status),
  });

  return (
    <PageContainer title={title}>
      <Card
        variant="borderless"
        style={exceptionCardStyle}
        styles={{ body: exceptionCardBodyStyle }}
      >
        <div style={exceptionShellStyle}>
          <Result
            status={status}
            title={title}
            subTitle={
              <Space orientation="vertical" size={8}>
                <span>{subTitle}</span>
                <Typography.Text type="secondary">
                  {description}
                </Typography.Text>
              </Space>
            }
            extra={renderActions(status, intl)}
          />
        </div>
      </Card>
    </PageContainer>
  );
};

function renderActions(
  status: 403 | 404 | 500,
  intl: ReturnType<typeof useIntl>,
): ReactNode {
  if (status === 403) {
    return [
      <Button key="back" icon={<ArrowLeftOutlined />} onClick={goBack}>
        {intl.formatMessage({
          id: 'pages.403.backButtonText',
          defaultMessage: 'Back',
        })}
      </Button>,
      <Button
        key="home"
        icon={<HomeOutlined />}
        type="primary"
        onClick={goHome}
      >
        {intl.formatMessage({
          id: 'pages.error.homeButtonText',
          defaultMessage: 'Back Home',
        })}
      </Button>,
    ];
  }

  if (status === 500) {
    return [
      <Button
        key="reload"
        icon={<ReloadOutlined />}
        type="primary"
        onClick={reloadPage}
      >
        {intl.formatMessage({
          id: 'pages.500.reloadButtonText',
          defaultMessage: 'Reload',
        })}
      </Button>,
      <Button key="home" icon={<HomeOutlined />} onClick={goHome}>
        {intl.formatMessage({
          id: 'pages.error.homeButtonText',
          defaultMessage: 'Back Home',
        })}
      </Button>,
    ];
  }

  return (
    <Button icon={<HomeOutlined />} type="primary" onClick={goHome}>
      {intl.formatMessage({
        id: 'pages.error.homeButtonText',
        defaultMessage: 'Back Home',
      })}
    </Button>
  );
}

function goBack(): void {
  if (window.history.length > 1) {
    history.back();
    return;
  }

  goHome();
}

function goHome(): void {
  history.push(homePath);
}

function reloadPage(): void {
  window.location.reload();
}

function getDefaultDescription(status: 403 | 404 | 500): string {
  if (status === 403) {
    return 'Check whether the current account has the required role or permission.';
  }
  if (status === 500) {
    return 'Reload the page after the service recovers, or return to the dashboard.';
  }

  return 'Check the address, or return to the dashboard.';
}

export default ExceptionPage;
