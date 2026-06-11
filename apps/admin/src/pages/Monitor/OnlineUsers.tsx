import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createOperationsFixtures,
  findOnlineUserFixture,
  type OnlineUserSessionSummary,
} from '@opencore/sdk';
import { Tag, Typography } from 'antd';
import { useState } from 'react';
import {
  CurrentPageExportButton,
  type CurrentPageExportColumn,
} from '../shared/CurrentPageExportButton';
import {
  createCurrentPageFilterOptions,
  useCurrentPageFilters,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../shared/CurrentPageFilters';
import { ReadOnlyDetailDrawer } from '../shared/ReadOnlyDetailDrawer';

const rows = createOperationsFixtures().onlineUsers;
const exportColumns: CurrentPageExportColumn<OnlineUserSessionSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Username', dataIndex: 'username' },
  { title: 'IP', dataIndex: 'ip' },
  { title: 'User Agent', dataIndex: 'userAgent' },
  { title: 'Last Seen', dataIndex: 'lastSeenAt' },
  { title: 'Expires At', dataIndex: 'expiresAt' },
  { title: 'Revoked At', dataIndex: 'revokedAt' },
  { title: 'Token ID', dataIndex: 'tokenId', sensitive: true },
  { title: 'Revoked Reason', dataIndex: 'revokedReason', sensitive: true },
];
const searchFields: CurrentPageSearchField<OnlineUserSessionSummary>[] = [
  'id',
  'username',
  'ip',
  'userAgent',
];
const filterOptions: CurrentPageFilterOption<OnlineUserSessionSummary>[] = [
  {
    key: 'active',
    options: [
      { label: 'active', value: 'active' },
      { label: 'revoked', value: 'revoked' },
    ],
    placeholder: 'Status',
    predicate: (record, value) =>
      value === 'active' ? !record.revokedAt : Boolean(record.revokedAt),
  },
  {
    key: 'username',
    options: createCurrentPageFilterOptions(rows, 'username'),
    placeholder: 'Username',
    predicate: (record, value) => record.username === value,
  },
];

export default function OnlineUsersPage() {
  const [selected, setSelected] = useState<OnlineUserSessionSummary>();
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<OnlineUserSessionSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search sessions',
      selectFilters: filterOptions,
    });

  const openDetail = (id: string) => {
    setSelected(findOnlineUserFixture(id));
  };

  const columns: ProColumns<OnlineUserSessionSummary>[] = [
    {
      title: 'Username',
      dataIndex: 'username',
      render: (_, record) => (
        <Typography.Link onClick={() => openDetail(record.id)}>
          {record.username}
        </Typography.Link>
      ),
    },
    { title: 'IP', dataIndex: 'ip' },
    { title: 'User Agent', dataIndex: 'userAgent' },
    { title: 'Last Seen', dataIndex: 'lastSeenAt' },
    {
      title: 'Status',
      render: (_, record) => (
        <Tag color={record.revokedAt ? 'red' : 'green'}>
          {record.revokedAt ? 'revoked' : 'active'}
        </Tag>
      ),
    },
    {
      title: 'Kick-out Policy',
      render: (_, record) => (
        <Tag color={record.revokedAt ? 'default' : 'orange'}>
          {record.revokedAt ? 'repeat blocked' : 'requires reason'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      valueType: 'option',
      render: (_, record) => (
        <a onClick={() => openDetail(record.id)}>Detail</a>
      ),
    },
  ];

  return (
    <PageContainer title="Online Users" subTitle="S11 Operations">
      <ProTable<OnlineUserSessionSummary>
        rowKey="id"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<OnlineUserSessionSummary>
            key="export"
            columns={exportColumns}
            resource="monitor-online-users"
            rows={filteredRows}
          />,
        ]}
        pagination={false}
        dataSource={filteredRows}
        columns={columns}
      />
      <ReadOnlyDetailDrawer
        fields={[
          { label: 'Username', value: selected?.username },
          { label: 'Session ID', value: selected?.id },
          { label: 'Token ID', value: selected?.tokenId, sensitive: true },
          { label: 'IP', value: selected?.ip },
          { label: 'User Agent', value: selected?.userAgent },
          { label: 'Last Seen', value: selected?.lastSeenAt },
          { label: 'Expires At', value: selected?.expiresAt },
          { label: 'Revoked At', value: selected?.revokedAt },
          { label: 'Revoked By', value: selected?.revokedBy },
          {
            label: 'Revoked Reason',
            value: selected?.revokedReason,
            sensitive: true,
          },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={selected?.username ?? 'Online User Detail'}
      />
    </PageContainer>
  );
}
