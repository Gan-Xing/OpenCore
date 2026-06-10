import {
  createSystemConfigFixtures,
  type SystemConfigSummary,
} from '@opencore/sdk';
import { Tag } from 'antd';
import SystemManagementTable from './SystemManagementTable';

const rows = createSystemConfigFixtures().items;

export default function ConfigPage() {
  return (
    <SystemManagementTable<SystemConfigSummary>
      title="System Config"
      rows={rows}
      columns={[
        { title: 'Key', dataIndex: 'key' },
        { title: 'Value', dataIndex: 'value' },
        {
          title: 'Type',
          dataIndex: 'valueType',
          render: (_, record) => <Tag>{record.valueType}</Tag>,
        },
        {
          title: 'Visibility',
          dataIndex: 'public',
          render: (_, record) => (
            <Tag color={record.public ? 'blue' : 'default'}>
              {record.public ? 'public' : 'internal'}
            </Tag>
          ),
        },
      ]}
    />
  );
}
