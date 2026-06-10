import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createSystemStatusFixture,
  type DependencyStatusSummary,
} from '@opencore/sdk';
import { Statistic, Tag } from 'antd';

const status = createSystemStatusFixture();

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

export default function StatusPage() {
  return (
    <PageContainer title="System Status" subTitle="S8 Monitor">
      <Statistic title="Overall status" value={status.status} />
      <ProTable<DependencyStatusSummary>
        rowKey="name"
        search={false}
        options={false}
        pagination={false}
        dataSource={[...status.dependencies]}
        columns={columns}
      />
    </PageContainer>
  );
}
