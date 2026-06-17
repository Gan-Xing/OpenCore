import { ReloadOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getOpenCoreSystemStatus } from '@/services/opencore/platform';

const MONITOR_STATUS_READ_PERMISSION_MARKER = 'monitor:status:read';

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

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
  const intl = useIntl();
  const [status, setStatus] = useState<SystemStatusSummary>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const statusLabels = useMemo(
    () => ({
      degraded: formatMessage(
        'pages.monitor.status.status.degraded',
        'degraded',
      ),
      ok: formatMessage('pages.monitor.status.status.ok', 'ok'),
    }),
    [formatMessage],
  );
  const columns = useMemo<ProColumns<DependencyStatusSummary>[]>(
    () => [
      {
        title: formatMessage(
          'pages.monitor.status.fields.dependency',
          'Dependency',
        ),
        dataIndex: 'name',
      },
      {
        title: formatMessage('pages.monitor.status.fields.status', 'Status'),
        dataIndex: 'status',
        render: (_, record) => (
          <Tag color={record.status === 'ok' ? 'green' : 'red'}>
            {statusLabels[record.status]}
          </Tag>
        ),
      },
      {
        title: formatMessage('pages.monitor.status.fields.latency', 'Latency'),
        dataIndex: 'latencyMs',
      },
      {
        title: formatMessage('pages.monitor.status.fields.message', 'Message'),
        dataIndex: 'message',
      },
    ],
    [formatMessage, statusLabels],
  );

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
          : formatMessage(
              'pages.monitor.status.load.failure',
              'Unable to load live OpenCore runtime status.',
            ),
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
      title={formatMessage('pages.monitor.status.title', 'Live runtime status')}
      subTitle={formatMessage('pages.monitor.runtime.section', 'S8 Monitor')}
      extra={[
        <Tooltip
          key="reload"
          title={formatMessage(
            'pages.monitor.status.actions.reload',
            'Reload runtime status',
          )}
        >
          <Button
            aria-label={formatMessage(
              'pages.monitor.status.actions.reloadAria',
              'Reload runtime status',
            )}
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
          message={formatMessage(
            'pages.monitor.status.load.liveFailure',
            'Unable to load live runtime status',
          )}
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.monitor.status.stats.overallStatus',
            'Overall status',
          )}
          value={status ? statusLabels[status.status] : '-'}
        />
        <Statistic
          precision={2}
          title={formatMessage(
            'pages.monitor.status.stats.cpuLoad1m',
            'CPU load 1m',
          )}
          value={status?.runtime.cpu.loadAverage1m ?? 0}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.status.stats.memoryUsed',
            'Memory used',
          )}
          suffix="%"
          value={memoryUsedPercent}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.status.stats.diskUsed',
            'Disk used',
          )}
          suffix="%"
          value={diskUsedPercent}
        />
        <Tag color="blue">{MONITOR_STATUS_READ_PERMISSION_MARKER}</Tag>
        <Tag color="green">
          {formatMessage(
            'pages.monitor.status.policy.liveRuntimeResources',
            'Live runtime resources',
          )}
        </Tag>
      </Space>

      <Descriptions
        bordered
        column={{ lg: 2, md: 1, sm: 1, xl: 3, xs: 1, xxl: 3 }}
        size="small"
        style={{ marginBottom: 16 }}
        title={formatMessage(
          'pages.monitor.status.sections.runtimeResources',
          'Runtime resources',
        )}
      >
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.status.fields.processId',
            'Process ID',
          )}
        >
          {status?.runtime.process.pid ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage('pages.monitor.status.fields.node', 'Node')}
        >
          {status?.runtime.process.nodeVersion ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.status.fields.platform',
            'Platform',
          )}
        >
          {status
            ? `${status.runtime.process.platform}/${status.runtime.process.arch}`
            : '-'}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.status.fields.cpuLogicalCores',
            'CPU logical cores',
          )}
        >
          {status?.runtime.cpu.logicalCores ?? 0}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.status.fields.cpuLoad5m',
            'CPU load 5m',
          )}
        >
          {status?.runtime.cpu.loadAverage5m.toFixed(2) ?? '0.00'}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.status.fields.cpuLoad15m',
            'CPU load 15m',
          )}
        >
          {status?.runtime.cpu.loadAverage15m.toFixed(2) ?? '0.00'}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.status.fields.rssMemory',
            'RSS memory',
          )}
        >
          {formatBytes(status?.runtime.memory.rssBytes)}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.status.fields.heapUsed',
            'Heap used',
          )}
        >
          {formatBytes(status?.runtime.memory.heapUsedBytes)}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.status.fields.heapTotal',
            'Heap total',
          )}
        >
          {formatBytes(status?.runtime.memory.heapTotalBytes)}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.status.fields.memoryUsage',
            'Memory usage',
          )}
        >
          <Progress percent={memoryUsedPercent} size="small" />
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.status.fields.diskPath',
            'Disk path',
          )}
        >
          {status?.runtime.disk.path ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.status.fields.diskUsage',
            'Disk usage',
          )}
        >
          <Progress percent={diskUsedPercent} size="small" />
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.status.fields.diskFree',
            'Disk free',
          )}
        >
          {formatBytes(status?.runtime.disk.freeBytes)}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.status.fields.checkedAt',
            'Checked at',
          )}
        >
          {status?.checkedAt ?? '-'}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.status.fields.sampledAt',
            'Sampled at',
          )}
        >
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
