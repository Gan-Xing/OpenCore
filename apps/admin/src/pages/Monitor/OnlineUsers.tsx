import {
  DisconnectOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import {
  createOperationsFixtures,
  type OnlineUserSessionSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Modal,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState, type Key } from 'react';
import {
  getOpenCoreOnlineUser,
  kickOutOpenCoreOnlineUsers,
  kickOutOpenCoreOnlineUser,
  listOpenCoreOnlineUsers,
} from '@/services/opencore/platform';
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
import {
  ReadOnlyDetailDrawer,
  type DetailField,
} from '../shared/ReadOnlyDetailDrawer';

const fallbackRows = createOperationsFixtures().onlineUsers;
const exportColumns: CurrentPageExportColumn<OnlineUserSessionSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Username', dataIndex: 'username' },
  { title: 'IP', dataIndex: 'ip' },
  { title: 'Browser', dataIndex: 'browser' },
  { title: 'OS', dataIndex: 'os' },
  { title: 'User Agent', dataIndex: 'userAgent' },
  { title: 'Last Seen', dataIndex: 'lastSeenAt' },
  { title: 'Expires At', dataIndex: 'expiresAt' },
  { title: 'Revoked At', dataIndex: 'revokedAt' },
  { title: 'Token ID', dataIndex: 'tokenId', sensitive: true },
  { title: 'Revoked By', dataIndex: 'revokedBy' },
  { title: 'Revoked Reason', dataIndex: 'revokedReason', sensitive: true },
];
const searchFields: CurrentPageSearchField<OnlineUserSessionSummary>[] = [
  'id',
  'username',
  'ip',
  'browser',
  'os',
  'userAgent',
  'revokedBy',
  'revokedReason',
];

function createFilterOptions(
  rows: readonly OnlineUserSessionSummary[],
): CurrentPageFilterOption<OnlineUserSessionSummary>[] {
  return [
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
    {
      key: 'browser',
      options: createCurrentPageFilterOptions(rows, 'browser'),
      placeholder: 'Browser',
      predicate: (record, value) => record.browser === value,
    },
    {
      key: 'os',
      options: createCurrentPageFilterOptions(rows, 'os'),
      placeholder: 'OS',
      predicate: (record, value) => record.os === value,
    },
  ];
}

function createDetailFields(record: OnlineUserSessionSummary): DetailField[] {
  return [
    { label: 'Username', value: record.username },
    { label: 'Session ID', value: record.id },
    { label: 'Token ID', value: record.tokenId, sensitive: true },
    { label: 'IP', value: record.ip },
    { label: 'Browser', value: record.browser },
    { label: 'OS', value: record.os },
    { label: 'User Agent', value: record.userAgent },
    { label: 'Last Seen', value: record.lastSeenAt },
    { label: 'Expires At', value: record.expiresAt },
    { label: 'Status', value: record.revokedAt ? 'revoked' : 'active' },
    { label: 'Revoked At', value: record.revokedAt },
    { label: 'Revoked By', value: record.revokedBy },
    {
      label: 'Revoked Reason',
      value: record.revokedReason,
      sensitive: true,
    },
  ];
}

export default function OnlineUsersPage() {
  const access = useAccess();
  const canManageOnlineUsers = Boolean(access.canManageOnlineUsers);
  const [rows, setRows] =
    useState<readonly OnlineUserSessionSummary[]>(fallbackRows);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] =
    useState<OnlineUserSessionSummary>();
  const [kickingId, setKickingId] = useState<string>();
  const [bulkKicking, setBulkKicking] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const filterOptions = useMemo(() => createFilterOptions(rows), [rows]);
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<OnlineUserSessionSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search sessions',
      selectFilters: filterOptions,
    });
  const activeSelectedRows = useMemo(
    () =>
      filteredRows.filter(
        (row) => selectedRowKeys.includes(row.id) && !row.revokedAt,
      ),
    [filteredRows, selectedRowKeys],
  );

  const loadOnlineUsers = async () => {
    setLoading(true);
    try {
      setRows(await listOpenCoreOnlineUsers());
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows(fallbackRows);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load online users.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOnlineUsers();
  }, []);

  const openDetail = async (record: OnlineUserSessionSummary) => {
    try {
      setSelectedDetail(await getOpenCoreOnlineUser(record.id));
    } catch (_error) {
      setSelectedDetail(record);
    }
  };

  const confirmKickOut = (record: OnlineUserSessionSummary) => {
    Modal.confirm({
      title: `Kick out ${record.username}?`,
      content: `Session ${record.id} will be revoked and its bearer token will stop authenticating protected API requests.`,
      okButtonProps: { danger: true },
      okText: 'Kick out',
      onOk: async () => {
        setKickingId(record.id);
        try {
          await kickOutOpenCoreOnlineUser(record.id, {
            actor: 'admin',
            reason: 'Manual kick-out from Admin Online Users page',
          });
          message.success('Session kicked out');
          await loadOnlineUsers();
        } finally {
          setKickingId(undefined);
        }
      },
    });
  };

  const confirmBulkKickOut = () => {
    Modal.confirm({
      title: `Kick out ${activeSelectedRows.length} selected sessions?`,
      content:
        'Selected active sessions will be revoked and their bearer tokens will stop authenticating protected API requests.',
      okButtonProps: { danger: true },
      okText: 'Kick out selected',
      onOk: async () => {
        setBulkKicking(true);
        try {
          const result = await kickOutOpenCoreOnlineUsers({
            ids: activeSelectedRows.map((record) => record.id),
            actor: 'admin',
            reason: 'Bulk kick-out from Admin Online Users page',
          });
          message.success(
            `Kicked ${result.kicked} sessions, skipped ${result.skipped}`,
          );
          setSelectedRowKeys([]);
          await loadOnlineUsers();
        } finally {
          setBulkKicking(false);
        }
      },
    });
  };

  const columns: ProColumns<OnlineUserSessionSummary>[] = [
    {
      title: 'Username',
      dataIndex: 'username',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.username}
        </Typography.Link>
      ),
    },
    { title: 'IP', dataIndex: 'ip', width: 144 },
    { title: 'Browser', dataIndex: 'browser', width: 136 },
    { title: 'OS', dataIndex: 'os', width: 112 },
    { title: 'User Agent', dataIndex: 'userAgent', ellipsis: true },
    { title: 'Last Seen', dataIndex: 'lastSeenAt', width: 192 },
    {
      title: 'Status',
      width: 112,
      render: (_, record) => (
        <Tag color={record.revokedAt ? 'red' : 'green'}>
          {record.revokedAt ? 'revoked' : 'active'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      valueType: 'option',
      width: 112,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Detail">
            <Button
              aria-label={`View online user ${record.id}`}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              record.revokedAt
                ? 'Already revoked'
                : canManageOnlineUsers
                  ? 'Kick out'
                  : 'Requires monitor:online-user:manage'
            }
          >
            <Button
              aria-label={`Kick out online user ${record.id}`}
              danger
              disabled={Boolean(record.revokedAt) || !canManageOnlineUsers}
              icon={<DisconnectOutlined />}
              loading={kickingId === record.id}
              onClick={() => confirmKickOut(record)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="Online Users" subTitle="S11 Operations">
      {loadError ? (
        <Alert
          message="Using fallback online user fixtures"
          description={loadError}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <ProTable<OnlineUserSessionSummary>
        rowKey="id"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <Typography.Text key="kick-out-policy" type="secondary">
            Kick-out invalidates active bearer sessions
          </Typography.Text>,
          <Tooltip
            key="bulk-kick"
            title={
              canManageOnlineUsers
                ? 'Kick out selected active sessions'
                : 'Requires monitor:online-user:manage'
            }
          >
            <Button
              danger
              disabled={
                !canManageOnlineUsers || activeSelectedRows.length === 0
              }
              icon={<DisconnectOutlined />}
              loading={bulkKicking}
              onClick={confirmBulkKickOut}
            >
              Kick selected
            </Button>
          </Tooltip>,
          <CurrentPageExportButton<OnlineUserSessionSummary>
            key="export"
            columns={exportColumns}
            filename="opencore-online-users.csv"
            resource="monitor-online-users"
            rows={filteredRows}
          />,
          <Tooltip key="refresh" title="Reload">
            <Button
              aria-label="Reload online users"
              icon={<ReloadOutlined />}
              onClick={() => void loadOnlineUsers()}
            />
          </Tooltip>,
        ]}
        pagination={{ pageSize: 10 }}
        loading={loading}
        dataSource={filteredRows}
        columns={columns}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
          getCheckboxProps: (record) => ({
            disabled: Boolean(record.revokedAt) || !canManageOnlineUsers,
          }),
        }}
      />
      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={selectedDetail?.username ?? 'Online User Detail'}
      />
    </PageContainer>
  );
}
