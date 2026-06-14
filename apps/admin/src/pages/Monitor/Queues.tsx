import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import type { QueueStatusList, QueueStatusSummary } from '@opencore/sdk';
import {
  Alert,
  Button,
  Modal,
  Space,
  Statistic,
  Tag,
  Tooltip,
  message,
} from 'antd';
import { useEffect, useState } from 'react';
import {
  listOpenCoreMonitorQueues,
  pauseOpenCoreMonitorQueue,
  resumeOpenCoreMonitorQueue,
} from '@/services/opencore/platform';

const emptyQueues: QueueStatusList = {
  checkedAt: '',
  queues: [],
};

function controlModeColor(mode: QueueStatusSummary['controlMode']): string {
  return mode === 'managed' ? 'blue' : 'default';
}

export default function QueuesPage() {
  const access = useAccess();
  const canManageQueues = Boolean(access.canManageQueues);
  const [queues, setQueues] = useState<QueueStatusList>(emptyQueues);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [controllingQueue, setControllingQueue] = useState<string>();

  const loadQueues = async () => {
    setLoading(true);
    try {
      const nextQueues = await listOpenCoreMonitorQueues();
      setQueues(nextQueues);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load queues.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueues();
  }, []);

  const confirmQueueControl = (
    record: QueueStatusSummary,
    action: 'pause' | 'resume',
  ) => {
    Modal.confirm({
      title: `${action === 'pause' ? 'Pause' : 'Resume'} ${record.name}?`,
      content:
        action === 'pause'
          ? 'New BullMQ jobs for this queue will stop being processed until the queue is resumed.'
          : 'Queued BullMQ jobs can be processed again after this queue is resumed.',
      okButtonProps: { danger: action === 'pause' },
      okText: action === 'pause' ? 'Pause queue' : 'Resume queue',
      onOk: async () => {
        setControllingQueue(`${record.name}:${action}`);
        try {
          const result =
            action === 'pause'
              ? await pauseOpenCoreMonitorQueue(record.name)
              : await resumeOpenCoreMonitorQueue(record.name);
          message.success(
            `${result.name} ${result.queue.paused ? 'paused' : 'resumed'}`,
          );
          await loadQueues();
        } finally {
          setControllingQueue(undefined);
        }
      },
    });
  };

  const columns: ProColumns<QueueStatusSummary>[] = [
    { title: 'Queue', dataIndex: 'name' },
    { title: 'Driver', dataIndex: 'driver' },
    { title: 'Waiting', dataIndex: 'waiting' },
    { title: 'Active', dataIndex: 'active' },
    { title: 'Completed', dataIndex: 'completed' },
    { title: 'Failed', dataIndex: 'failed' },
    {
      title: 'Paused',
      dataIndex: 'paused',
      render: (_, record) => (
        <Tag color={record.paused ? 'orange' : 'green'}>
          {record.paused ? 'paused' : 'running'}
        </Tag>
      ),
    },
    {
      title: 'Control mode',
      dataIndex: 'controlMode',
      render: (_, record) => (
        <Tag color={controlModeColor(record.controlMode)}>
          {record.controlMode}
        </Tag>
      ),
    },
    {
      title: 'Action',
      valueType: 'option',
      width: 96,
      render: (_, record) => {
        const action = record.paused ? 'resume' : 'pause';
        const title = canManageQueues
          ? action === 'pause'
            ? 'Pause queue'
            : 'Resume queue'
          : 'Requires monitor:queue:manage';

        return (
          <Tooltip title={title}>
            <Button
              aria-label={`${action === 'pause' ? 'Pause' : 'Resume'} queue ${
                record.name
              }`}
              disabled={!canManageQueues || record.controlMode !== 'managed'}
              icon={
                action === 'pause' ? (
                  <PauseCircleOutlined />
                ) : (
                  <PlayCircleOutlined />
                )
              }
              loading={controllingQueue === `${record.name}:${action}`}
              onClick={() => confirmQueueControl(record, action)}
              size="small"
            />
          </Tooltip>
        );
      },
    },
  ];

  return (
    <PageContainer title="Queues" subTitle="S8 Monitor">
      {loadError ? (
        <Alert
          message="Unable to load live queue metrics"
          description={loadError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="Scheduler queues" value={queues.queues.length} />
        <Statistic
          title="Waiting"
          value={queues.queues.reduce((sum, queue) => sum + queue.waiting, 0)}
        />
        <Statistic
          title="Active"
          value={queues.queues.reduce((sum, queue) => sum + queue.active, 0)}
        />
        <Statistic title="Queue metrics" value="BullMQ managed" />
        <Statistic
          title="Paused queues"
          value={queues.queues.filter((queue) => queue.paused).length}
        />
        <Statistic title="Queue control" value="Pause/resume queues" />
        <Statistic title="Permission" value="monitor:queue:manage" />
      </Space>
      <ProTable<QueueStatusSummary>
        rowKey="name"
        search={false}
        options={false}
        toolBarRender={() => [
          <Tooltip key="reload" title="Reload">
            <Button
              aria-label="Reload queues"
              icon={<ReloadOutlined />}
              onClick={() => void loadQueues()}
            />
          </Tooltip>,
        ]}
        pagination={false}
        loading={loading}
        dataSource={[...queues.queues]}
        columns={columns}
      />
    </PageContainer>
  );
}
