import {
  createPermissionSummariesFromRegistry,
  type PermissionSummary,
} from '@opencore/sdk';
import { Tag } from 'antd';
import RbacTable from './RbacTable';

const rows = createPermissionSummariesFromRegistry();

export default function PermissionsPage() {
  return (
    <RbacTable<PermissionSummary>
      title="Permissions"
      rows={rows}
      columns={[
        { title: 'Code', dataIndex: 'code' },
        { title: 'Title', dataIndex: 'title' },
        {
          title: 'Stage',
          dataIndex: 'stage',
          render: (_, record) => <Tag>{record.stage}</Tag>,
        },
        {
          title: 'Risk',
          dataIndex: 'dangerous',
          render: (_, record) => (
            <Tag color={record.dangerous ? 'red' : 'green'}>
              {record.dangerous ? 'dangerous' : 'normal'}
            </Tag>
          ),
        },
      ]}
    />
  );
}
