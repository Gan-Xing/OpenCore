import type { UserSummary } from '@opencore/sdk';
import { Tag } from 'antd';
import RbacTable from './RbacTable';

const rows: UserSummary[] = [
  {
    id: 'user_admin',
    username: 'admin',
    displayName: 'OpenCore Admin',
    roleCodes: ['admin'],
    enabled: true,
  },
];

export default function UsersPage() {
  return (
    <RbacTable<UserSummary>
      title="Users"
      rows={rows}
      columns={[
        { title: 'Username', dataIndex: 'username' },
        { title: 'Display name', dataIndex: 'displayName' },
        {
          title: 'Roles',
          dataIndex: 'roleCodes',
          render: (_, record) =>
            record.roleCodes.map((code) => <Tag key={code}>{code}</Tag>),
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
