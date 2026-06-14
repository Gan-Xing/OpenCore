import { ReloadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import type { VersionInfoSummary } from '@opencore/sdk';
import {
  Alert,
  Button,
  Descriptions,
  Space,
  Statistic,
  Tag,
  Tooltip,
} from 'antd';
import { useEffect, useState } from 'react';
import { getOpenCoreVersionInfo } from '@/services/opencore/platform';

function formatUptime(seconds: number | undefined): string {
  if (seconds === undefined) {
    return 'Unavailable';
  }

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

export default function VersionPage() {
  const [version, setVersion] = useState<VersionInfoSummary>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  const loadVersion = async () => {
    setLoading(true);
    try {
      const nextVersion = await getOpenCoreVersionInfo();
      setVersion(nextVersion);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load OpenCore runtime version.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVersion();
  }, []);

  return (
    <PageContainer title="Live runtime version" subTitle="S8 Monitor">
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message="Unable to load live runtime metadata"
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="OpenCore runtime" value={version?.runtime ?? '-'} />
        <Statistic title="Version" value={version?.version ?? '-'} />
        <Statistic
          title="Uptime"
          value={formatUptime(version?.uptimeSeconds)}
        />
        <Tooltip title="Reload version info">
          <Button
            aria-label="Reload version info"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void loadVersion()}
          />
        </Tooltip>
      </Space>
      <Descriptions bordered column={1} size="middle">
        <Descriptions.Item label="Name">
          {version?.name ?? 'Unavailable'}
        </Descriptions.Item>
        <Descriptions.Item label="Environment">
          <Tag color={version?.environment === 'production' ? 'green' : 'blue'}>
            {version?.environment ?? 'unknown'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Commit">
          {version?.commit ?? 'unknown'}
        </Descriptions.Item>
        <Descriptions.Item label="Build time">
          {version?.buildTime ?? 'unknown'}
        </Descriptions.Item>
        <Descriptions.Item label="Deployment ID">
          {version?.deploymentId ?? 'unknown'}
        </Descriptions.Item>
        <Descriptions.Item label="Node">
          {version?.nodeVersion ?? 'unknown'}
        </Descriptions.Item>
        <Descriptions.Item label="Platform">
          {version ? `${version.platform}/${version.arch}` : 'unknown'}
        </Descriptions.Item>
        <Descriptions.Item label="Process ID">
          {version?.processId ?? 'unknown'}
        </Descriptions.Item>
        <Descriptions.Item label="Started at">
          {version?.startedAt ?? 'unknown'}
        </Descriptions.Item>
        <Descriptions.Item label="Timezone">
          {version?.timezone ?? 'unknown'}
        </Descriptions.Item>
      </Descriptions>
    </PageContainer>
  );
}
