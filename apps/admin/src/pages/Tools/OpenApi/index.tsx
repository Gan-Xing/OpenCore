import EmptyState from '@/components/EmptyState';
import {
  ApiOutlined,
  BranchesOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { createOpenApiDriftFixture } from '@opencore/sdk';
import { Button, Card, Descriptions, Space, Tag, Typography } from 'antd';
import styles from './index.less';

const driftStatus = createOpenApiDriftFixture();

const contractRows = [
  {
    key: 'swagger',
    label: 'Swagger UI',
    value: '/api/docs',
    status: 'available',
  },
  {
    key: 'snapshot',
    label: 'Contract snapshot',
    value: 'packages/contracts/openapi/opencore-api.json',
    status: 'exported',
  },
  {
    key: 'command',
    label: 'Export command',
    value: 'pnpm openapi:export',
    status: 'ready',
  },
  {
    key: 'drift',
    label: 'Drift check',
    value: driftStatus.driftCheckCommand,
    status: driftStatus.status,
  },
];

const OpenApiStatusPage: React.FC = () => {
  return (
    <PageContainer
      title="OpenAPI"
      subTitle="S5 status entry"
      extra={[
        <Button key="docs" icon={<ApiOutlined />} href="/api/docs">
          Swagger
        </Button>,
        <Button key="ready" icon={<HeartOutlined />} href="/health/ready">
          Readiness
        </Button>,
      ]}
    >
      <div className={styles.statusGrid}>
        <Card title="Contract status">
          <Descriptions column={1} bordered size="small">
            {contractRows.map((row) => (
              <Descriptions.Item
                key={row.key}
                label={
                  <Space>
                    <Tag color="blue">{row.status}</Tag>
                    {row.label}
                  </Space>
                }
              >
                {row.value}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Card>

        <Card title="Drift guard">
          <Space direction="vertical" size="middle">
            <Typography.Text>
              OpenAPI drift is checked against the committed contract snapshot.
            </Typography.Text>
            <pre className={styles.commandBlock}>
              <code>{driftStatus.driftCheckCommand}</code>
            </pre>
            <EmptyState
              title="No drift detected"
              description={driftStatus.snapshotPath}
            />
          </Space>
        </Card>

        <Card title="Trace contract">
          <Space direction="vertical">
            <Typography.Text>
              Admin requests attach `x-request-id` and `x-trace-id`.
            </Typography.Text>
            <Tag icon={<BranchesOutlined />}>request scoped</Tag>
          </Space>
        </Card>
      </div>
    </PageContainer>
  );
};

export default OpenApiStatusPage;
