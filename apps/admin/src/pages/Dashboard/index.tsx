import EmptyState from '@/components/EmptyState';
import {
  plannedModuleSummaries,
  registrySummary,
  shellMenuItems,
} from '@/core/shellRegistry';
import {
  ApiOutlined,
  CheckCircleOutlined,
  PartitionOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl } from '@umijs/max';
import { Button, Card, List, Space, Statistic, Tag, Typography } from 'antd';
import { useCallback, useMemo } from 'react';
import styles from './index.less';

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const DashboardPage: React.FC = () => {
  const intl = useIntl();
  const nextModules = plannedModuleSummaries.slice(0, 6);
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const readyLabel = formatMessage('pages.dashboard.status.ready', 'ready');
  const foundationStatusRows = useMemo(
    () => [
      {
        label: formatMessage(
          'pages.dashboard.foundation.apiLive',
          'API liveness',
        ),
        value: '/health/live',
        status: readyLabel,
      },
      {
        label: formatMessage(
          'pages.dashboard.foundation.apiReady',
          'API readiness',
        ),
        value: '/health/ready',
        status: readyLabel,
      },
      {
        label: formatMessage(
          'pages.dashboard.foundation.openapiContract',
          'OpenAPI contract',
        ),
        value: 'packages/contracts/openapi/opencore-api.json',
        status: readyLabel,
      },
    ],
    [formatMessage, readyLabel],
  );

  return (
    <PageContainer
      title={formatMessage('pages.dashboard.title', 'Dashboard')}
      subTitle={formatMessage('pages.dashboard.section', 'S5 shell')}
      extra={[
        <Button
          key="openapi"
          icon={<ApiOutlined />}
          onClick={() => history.push('/tools/openapi')}
        >
          {formatMessage('pages.dashboard.actions.openapi', 'OpenAPI')}
        </Button>,
      ]}
    >
      <div className={styles.shell}>
        <section className={styles.metricGrid}>
          <Card className={styles.metricCard}>
            <Statistic
              title={formatMessage(
                'pages.dashboard.stats.shellModules',
                'Shell modules',
              )}
              value={registrySummary.shellModuleCount}
              prefix={<PartitionOutlined />}
            />
            <Typography.Text type="secondary">
              {formatMessage(
                'pages.dashboard.stats.shellModulesDescription',
                'Menu entries are derived from module registry.',
              )}
            </Typography.Text>
          </Card>
          <Card className={styles.metricCard}>
            <Statistic
              title={formatMessage(
                'pages.dashboard.stats.shellPermissions',
                'Shell permissions',
              )}
              value={registrySummary.shellPermissionCount}
              prefix={<SafetyCertificateOutlined />}
            />
            <Typography.Text type="secondary">
              {formatMessage(
                'pages.dashboard.stats.shellPermissionsDescription',
                'Access checks use stable permission codes.',
              )}
            </Typography.Text>
          </Card>
          <Card className={styles.metricCard}>
            <Statistic
              title={formatMessage(
                'pages.dashboard.stats.plannedModules',
                'Planned modules',
              )}
              value={registrySummary.plannedModuleCount}
              prefix={<CheckCircleOutlined />}
            />
            <Typography.Text type="secondary">
              {formatMessage(
                'pages.dashboard.stats.plannedModulesDescription',
                'Later modules stay hidden until they pass admission.',
              )}
            </Typography.Text>
          </Card>
        </section>

        <section className={styles.statusGrid}>
          <Card
            title={formatMessage(
              'pages.dashboard.cards.foundationStatus',
              'Foundation status',
            )}
          >
            <List
              dataSource={foundationStatusRows}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag color="green">{item.status}</Tag>
                        {item.label}
                      </Space>
                    }
                    description={item.value}
                  />
                </List.Item>
              )}
            />
          </Card>

          <Card
            title={formatMessage(
              'pages.dashboard.cards.activeShellRoutes',
              'Active shell routes',
            )}
          >
            <List
              dataSource={[...shellMenuItems]}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta title={item.name} description={item.path} />
                  <Tag>{item.permissionCode}</Tag>
                </List.Item>
              )}
            />
          </Card>
        </section>

        <Card
          title={formatMessage(
            'pages.dashboard.cards.nextModules',
            'Next modules',
          )}
        >
          {nextModules.length > 0 ? (
            <List
              className={styles.plannedList}
              dataSource={nextModules}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag className={styles.stageTag}>{item.stage}</Tag>
                        {item.title}
                      </Space>
                    }
                    description={formatMessage(
                      'pages.dashboard.modules.description',
                      '{code} · {layer} · {permissions} permissions · {menus} menus',
                      {
                        code: item.code,
                        layer: item.layer,
                        permissions: item.permissionCount,
                        menus: item.menuCount,
                      },
                    )}
                  />
                </List.Item>
              )}
            />
          ) : (
            <EmptyState
              title={formatMessage(
                'pages.dashboard.empty.noPlannedModules',
                'No planned modules',
              )}
            />
          )}
        </Card>
      </div>
    </PageContainer>
  );
};

export default DashboardPage;
