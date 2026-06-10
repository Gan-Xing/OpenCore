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
import { history } from '@umijs/max';
import { Button, Card, List, Space, Statistic, Tag, Typography } from 'antd';
import styles from './index.less';

const DashboardPage: React.FC = () => {
  const nextModules = plannedModuleSummaries.slice(0, 6);

  return (
    <PageContainer
      title="Dashboard"
      subTitle="S5 shell"
      extra={[
        <Button
          key="openapi"
          icon={<ApiOutlined />}
          onClick={() => history.push('/tools/openapi')}
        >
          OpenAPI
        </Button>,
      ]}
    >
      <div className={styles.shell}>
        <section className={styles.metricGrid}>
          <Card className={styles.metricCard}>
            <Statistic
              title="Shell modules"
              value={registrySummary.shellModuleCount}
              prefix={<PartitionOutlined />}
            />
            <Typography.Text type="secondary">
              Menu entries are derived from module registry.
            </Typography.Text>
          </Card>
          <Card className={styles.metricCard}>
            <Statistic
              title="Shell permissions"
              value={registrySummary.shellPermissionCount}
              prefix={<SafetyCertificateOutlined />}
            />
            <Typography.Text type="secondary">
              Access checks use stable permission codes.
            </Typography.Text>
          </Card>
          <Card className={styles.metricCard}>
            <Statistic
              title="Planned modules"
              value={registrySummary.plannedModuleCount}
              prefix={<CheckCircleOutlined />}
            />
            <Typography.Text type="secondary">
              S6-S8 modules are visible as contracts only.
            </Typography.Text>
          </Card>
        </section>

        <section className={styles.statusGrid}>
          <Card title="Foundation status">
            <List
              dataSource={[
                {
                  label: 'API liveness',
                  value: '/health/live',
                  status: 'ready',
                },
                {
                  label: 'API readiness',
                  value: '/health/ready',
                  status: 'ready',
                },
                {
                  label: 'OpenAPI contract',
                  value: 'packages/contracts/openapi/opencore-api.json',
                  status: 'ready',
                },
              ]}
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

          <Card title="Active shell routes">
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

        <Card title="Next modules">
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
                    description={`${item.code} · ${item.layer} · ${item.permissionCount} permissions · ${item.menuCount} menus`}
                  />
                </List.Item>
              )}
            />
          ) : (
            <EmptyState title="No planned modules" />
          )}
        </Card>
      </div>
    </PageContainer>
  );
};

export default DashboardPage;
