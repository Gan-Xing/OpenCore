import type { UserSummary } from '@opencore/sdk';
import { Space, Tag } from 'antd';
import type { CurrentPageExportColumn } from '../shared/CurrentPageExportButton';
import type {
  CurrentPageFilterOption,
  CurrentPageSearchField,
} from '../shared/CurrentPageFilters';
import type { DetailField } from '../shared/ReadOnlyDetailDrawer';
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
const searchFields: CurrentPageSearchField<UserSummary>[] = [
  'username',
  'displayName',
  (record) => record.roleCodes,
];
const filterOptions: CurrentPageFilterOption<UserSummary>[] = [
  {
    key: 'enabled',
    options: [
      { label: 'enabled', value: 'true' },
      { label: 'disabled', value: 'false' },
    ],
    placeholder: 'Status',
    predicate: (record, value) => record.enabled === (value === 'true'),
  },
];
const exportColumns: CurrentPageExportColumn<UserSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Username', dataIndex: 'username' },
  { title: 'Display Name', dataIndex: 'displayName' },
  { title: 'Roles', renderText: (record) => record.roleCodes.join(', ') },
  { title: 'Enabled', dataIndex: 'enabled' },
];
const detailFields = (record: UserSummary): DetailField[] => [
  { label: 'ID', value: record.id },
  { label: 'Username', value: record.username },
  { label: 'Display Name', value: record.displayName },
  {
    label: 'Roles',
    value: (
      <Space wrap>
        {record.roleCodes.map((code) => (
          <Tag key={code}>{code}</Tag>
        ))}
      </Space>
    ),
  },
  { label: 'Status', value: record.enabled ? 'enabled' : 'disabled' },
];

export default function UsersPage() {
  return (
    <RbacTable<UserSummary>
      title="Users"
      rows={rows}
      detailFields={detailFields}
      detailTitle={(record) => record.username}
      readOnlyReason="Fixture-backed users are read-only until the S6 write workflow is admitted."
      resource="core-users"
      searchFields={searchFields}
      filterOptions={filterOptions}
      exportColumns={exportColumns}
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
