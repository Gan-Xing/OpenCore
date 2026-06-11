import type { UserSummary } from '@opencore/sdk';
import { Alert } from 'antd';
import { Space, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { listOpenCoreUsers } from '@/services/opencore/platform';
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
  const [liveRows, setLiveRows] = useState<readonly UserSummary[]>(rows);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    let mounted = true;

    listOpenCoreUsers()
      .then((users) => {
        if (mounted) {
          setLiveRows(users);
          setLoadError(undefined);
        }
      })
      .catch((error: unknown) => {
        if (mounted) {
          setLiveRows(rows);
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Unable to load OpenCore users.',
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message="Using fallback user snapshot"
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <RbacTable<UserSummary>
        title="Users"
        rows={liveRows}
        loading={loading}
        detailFields={detailFields}
        detailTitle={(record) => record.username}
        readOnlyReason="Users are read-only in Admin until the S6 write workflow is admitted."
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
    </>
  );
}
