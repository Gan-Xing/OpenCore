import { createDictFixtures, type DictTypeSummary } from '@opencore/sdk';
import { Tag, Typography } from 'antd';
import SystemManagementTable from './SystemManagementTable';

const rows = createDictFixtures().items;

export default function DictsPage() {
  return (
    <SystemManagementTable<DictTypeSummary>
      title="Dictionaries"
      rows={rows}
      columns={[
        { title: 'Code', dataIndex: 'code' },
        { title: 'Name', dataIndex: 'name' },
        {
          title: 'Items',
          dataIndex: 'items',
          render: (_, record) => (
            <Typography.Text>{record.items.length} items</Typography.Text>
          ),
        },
        {
          title: 'Status',
          dataIndex: 'enabled',
          render: (_, record) => (
            <Tag color={record.enabled ? 'green' : 'red'}>
              {record.enabled ? 'enabled' : 'disabled'}
            </Tag>
          ),
        },
      ]}
    />
  );
}
