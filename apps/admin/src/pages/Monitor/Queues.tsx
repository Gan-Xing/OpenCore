import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createQueueStatusFixture,
  type QueueStatusSummary,
} from '@opencore/sdk';
import { Tag } from 'antd';

const rows = createQueueStatusFixture().queues;

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
  return (
    <PageContainer title="Queues" subTitle="S8 Monitor">
      <ProTable<QueueStatusSummary>
        rowKey="name"
        search={false}
        options={false}
        pagination={false}
        dataSource={[...rows]}
        columns={columns}
      />
    </PageContainer>
  );
}
