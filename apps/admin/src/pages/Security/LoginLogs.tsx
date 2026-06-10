import { createLoginLogFixtures, type LoginLogSummary } from '@opencore/sdk';
import { Tag } from 'antd';
import SystemManagementTable from '../System/SystemManagementTable';

const rows = createLoginLogFixtures().items;

export default function LoginLogsPage() {
  return (
    <SystemManagementTable<LoginLogSummary>
      title="Login Logs"
      rows={rows}
      columns={[
        { title: 'Time', dataIndex: 'createdAt' },
        { title: 'Username', dataIndex: 'username' },
        {
          title: 'Result',
          dataIndex: 'success',
          render: (_, record) => (
            <Tag color={record.success ? 'green' : 'red'}>
              {record.success ? 'success' : 'failure'}
            </Tag>
          ),
        },
        { title: 'IP', dataIndex: 'ip' },
        { title: 'Request ID', dataIndex: 'requestId' },
      ]}
    />
  );
}
