import { ReloadOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createQueueStatusFixture,
  type QueueStatusList,
  type QueueStatusSummary,
} from '@opencore/sdk';
import { Alert, Button, Space, Statistic, Tag, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { listOpenCoreMonitorQueues } from '@/services/opencore/platform';

const fallbackQueues = createQueueStatusFixture();

const columns: ProColumns<QueueStatusSummary>[] = [
  { title: 'Queue', dataIndex: 'name' },
  { title: 'Driver', dataIndex: 'driver' },
  { title: 'Waiting', dataIndex: 'waiting' },
  { title: 'Active', dataIndex: 'active' },
  { title: 'Completed', dataIndex: 'completed' },
  { title: 'Failed', dataIndex: 'failed' },
  {
    title: 'Mode',
    dataIndex: 'readOnly',
    render: () => <Tag color="blue">read-only</Tag>,
  },
];

export default function QueuesPage() {
  const [queues, setQueues] = useState<QueueStatusList>(fallbackQueues);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  const loadQueues = async () => {
    setLoading(true);
    try {
      const nextQueues = await listOpenCoreMonitorQueues();
      setQueues(nextQueues);
      setLoadError(undefined);
    } catch (error: unknown) {
      setQueues(fallbackQueues);
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

  return (
    <PageContainer title="Queues" subTitle="S8 Monitor">
      {loadError ? (
        <Alert
          message="Using fallback queue fixtures"
          description={loadError}
          type="warning"
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
        <Statistic title="Queue metrics" value="BullMQ read-only" />
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
