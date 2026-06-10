import { createAuditLogFixtures, type AuditLogSummary } from '@opencore/sdk';
import { Tag } from 'antd';
import SystemManagementTable from '../System/SystemManagementTable';

const rows = createAuditLogFixtures().items;

export default function OperationLogsPage() {
  return (
    <SystemManagementTable<AuditLogSummary>
      title="Operation Logs"
      rows={rows}
      columns={[
        { title: 'Time', dataIndex: 'createdAt' },
        { title: 'Actor', dataIndex: 'actorUsername' },
        { title: 'Action', dataIndex: 'action' },
        { title: 'Resource', dataIndex: 'resource' },
        {
          title: 'Status',
          dataIndex: 'statusCode',
          render: (_, record) => (
            <Tag color={record.statusCode < 400 ? 'green' : 'red'}>
              {record.statusCode}
            </Tag>
          ),
        },
        { title: 'Request ID', dataIndex: 'requestId' },
      ]}
    />
  );
}
