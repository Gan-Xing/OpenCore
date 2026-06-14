import EmptyState from '@/components/EmptyState';
import {
  ApiOutlined,
  BranchesOutlined,
  HeartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import type { OpenApiDriftStatus } from '@opencore/sdk';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { getOpenCoreOpenApiDriftStatus } from '@/services/opencore/platform';
import styles from './index.less';

function statusColor(status: OpenApiDriftStatus['status'] | undefined): string {
  if (status === 'configured') {
    return 'green';
  }
  if (status === 'invalid' || status === 'missing') {
    return 'red';
  }
  return 'blue';
}

const OpenApiStatusPage: React.FC = () => {
  const [driftStatus, setDriftStatus] = useState<OpenApiDriftStatus>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  const loadDriftStatus = async () => {
    setLoading(true);
    try {
      const nextStatus = await getOpenCoreOpenApiDriftStatus();
      setDriftStatus(nextStatus);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load OpenAPI drift status.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDriftStatus();
  }, []);

  const contractRows = useMemo(
    () => [
      {
        key: 'swagger',
        label: 'Swagger UI',
        value: '/api/docs',
        status: 'available',
      },
      {
        key: 'snapshot',
        label: 'Contract snapshot',
        value:
          driftStatus?.snapshotPath ??
          'packages/contracts/openapi/opencore-api.json',
        status: driftStatus?.snapshotExists ? 'loaded' : 'missing',
      },
      {
        key: 'command',
        label: 'Export command',
        value: driftStatus?.exportCommand ?? 'pnpm openapi:export',
        status: 'ready',
      },
      {
        key: 'drift',
        label: 'Drift check',
        value: driftStatus?.driftCheckCommand ?? 'pnpm openapi:check',
        status: driftStatus?.status ?? 'loading',
      },
      {
        key: 'checkedAt',
        label: 'Checked at',
        value: driftStatus?.checkedAt ?? 'loading',
        status: 'live',
      },
    ],
    [driftStatus],
  );

  return (
    <PageContainer
      title="Live OpenAPI drift"
      subTitle="S5 status entry"
      extra={[
        <Button key="docs" icon={<ApiOutlined />} href="/api/docs">
          Swagger
        </Button>,
        <Button key="ready" icon={<HeartOutlined />} href="/health/ready">
          Readiness
        </Button>,
        <Tooltip key="reload" title="Reload OpenAPI drift">
          <Button
            aria-label="Reload OpenAPI drift"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void loadDriftStatus()}
          />
        </Tooltip>,
      ]}
    >
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message="Unable to load live OpenAPI drift status"
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="Snapshot paths" value={driftStatus?.pathCount ?? 0} />
        <Statistic
          title="Snapshot schemas"
          value={driftStatus?.schemaCount ?? 0}
        />
        <Statistic
          title="Snapshot operations"
          value={driftStatus?.operationCount ?? 0}
        />
        <Tag color={statusColor(driftStatus?.status)}>
          {driftStatus?.status ?? 'loading'}
        </Tag>
      </Space>
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
            <Descriptions.Item label="Snapshot SHA-256">
              {driftStatus?.snapshotSha256 ?? 'unavailable'}
            </Descriptions.Item>
            <Descriptions.Item label="Snapshot updated">
              {driftStatus?.snapshotUpdatedAt ?? 'unavailable'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Drift guard">
          <Space direction="vertical" size="middle">
            <Typography.Text>
              OpenAPI drift is checked against the committed contract snapshot.
            </Typography.Text>
            <pre className={styles.commandBlock}>
              <code>
                {driftStatus?.driftCheckCommand ?? 'pnpm openapi:check'}
              </code>
            </pre>
            <EmptyState
              title={
                driftStatus?.status === 'configured'
                  ? 'Snapshot configured'
                  : 'Snapshot needs attention'
              }
              description={
                driftStatus?.snapshotPath ??
                'packages/contracts/openapi/opencore-api.json'
              }
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
