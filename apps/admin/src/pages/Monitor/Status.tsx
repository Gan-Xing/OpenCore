import { ReloadOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import type {
  DependencyStatusSummary,
  SystemStatusSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Descriptions,
  Progress,
  Space,
  Statistic,
  Tag,
  Tooltip,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { getOpenCoreSystemStatus } from '@/services/opencore/platform';

const MONITOR_STATUS_READ_PERMISSION_MARKER = 'monitor:status:read';

const columns: ProColumns<DependencyStatusSummary>[] = [
  { title: 'Dependency', dataIndex: 'name' },
  {
    title: 'Status',
    dataIndex: 'status',
    render: (_, record) => (
      <Tag color={record.status === 'ok' ? 'green' : 'red'}>
        {record.status}
      </Tag>
    ),
  },
  { title: 'Latency', dataIndex: 'latencyMs' },
  { title: 'Message', dataIndex: 'message' },
];

function toPercent(value: number | undefined): number {
  return Math.round((value ?? 0) * 100);
}

function formatBytes(value: number | undefined): string {
  if (!value || value < 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let nextValue = value;
  let unitIndex = 0;
  while (nextValue >= 1024 && unitIndex < units.length - 1) {
    nextValue /= 1024;
    unitIndex += 1;
  }

  return `${nextValue.toFixed(nextValue >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function StatusPage() {
  const [status, setStatus] = useState<SystemStatusSummary>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  const memoryUsedPercent = toPercent(status?.runtime.memory.systemUsedRatio);
  const diskUsedPercent = toPercent(status?.runtime.disk.usedRatio);
  const dependencyRows = useMemo(
    () => [...(status?.dependencies ?? [])],
    [status?.dependencies],
  );

  const loadStatus = async () => {
    setLoading(true);
    try {
      const summary = await getOpenCoreSystemStatus();
      setStatus(summary);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load live OpenCore runtime status.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  return (
    <PageContainer
      title="Live runtime status"
      subTitle="S8 Monitor"
      extra={[
        <Tooltip key="reload" title="Reload runtime status">
          <Button
            aria-label="Reload runtime status"
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void loadStatus()}
          />
        </Tooltip>,
      ]}
    >
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message="Unable to load live runtime status"
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="Overall status" value={status?.status ?? '-'} />
        <Statistic
          precision={2}
          title="CPU load 1m"
          value={status?.runtime.cpu.loadAverage1m ?? 0}
        />
        <Statistic title="Memory used" suffix="%" value={memoryUsedPercent} />
        <Statistic title="Disk used" suffix="%" value={diskUsedPercent} />
        <Tag color="blue">{MONITOR_STATUS_READ_PERMISSION_MARKER}</Tag>
        <Tag color="green">Live runtime resources</Tag>
      </Space>

      <Descriptions
        bordered
        column={{ lg: 2, md: 1, sm: 1, xl: 3, xs: 1, xxl: 3 }}
        size="small"
        style={{ marginBottom: 16 }}
        title="Runtime resources"
      >
        <Descriptions.Item label="Process ID">
          {status?.runtime.process.pid ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Node">
          {status?.runtime.process.nodeVersion ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Platform">
          {status
            ? `${status.runtime.process.platform}/${status.runtime.process.arch}`
            : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="CPU logical cores">
          {status?.runtime.cpu.logicalCores ?? 0}
        </Descriptions.Item>
        <Descriptions.Item label="CPU load 5m">
          {status?.runtime.cpu.loadAverage5m.toFixed(2) ?? '0.00'}
        </Descriptions.Item>
        <Descriptions.Item label="CPU load 15m">
          {status?.runtime.cpu.loadAverage15m.toFixed(2) ?? '0.00'}
        </Descriptions.Item>
        <Descriptions.Item label="RSS memory">
          {formatBytes(status?.runtime.memory.rssBytes)}
        </Descriptions.Item>
        <Descriptions.Item label="Heap used">
          {formatBytes(status?.runtime.memory.heapUsedBytes)}
        </Descriptions.Item>
        <Descriptions.Item label="Heap total">
          {formatBytes(status?.runtime.memory.heapTotalBytes)}
        </Descriptions.Item>
        <Descriptions.Item label="Memory usage">
          <Progress percent={memoryUsedPercent} size="small" />
        </Descriptions.Item>
        <Descriptions.Item label="Disk path">
          {status?.runtime.disk.path ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Disk usage">
          <Progress percent={diskUsedPercent} size="small" />
        </Descriptions.Item>
        <Descriptions.Item label="Disk free">
          {formatBytes(status?.runtime.disk.freeBytes)}
        </Descriptions.Item>
        <Descriptions.Item label="Checked at">
          {status?.checkedAt ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item label="Sampled at">
          {status?.runtime.sampledAt ?? '-'}
        </Descriptions.Item>
      </Descriptions>

      <ProTable<DependencyStatusSummary>
        rowKey="name"
        loading={loading}
        search={false}
        options={false}
        pagination={false}
        dataSource={dependencyRows}
        columns={columns}
      />
    </PageContainer>
  );
}
