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
import { useEffect, useMemo, useState } from 'react';
import {
  getOpenCoreOnlineUser,
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
  ];
}

function createDetailFields(record: OnlineUserSessionSummary): DetailField[] {
  return [
    { label: 'Username', value: record.username },
    { label: 'Session ID', value: record.id },
    { label: 'Token ID', value: record.tokenId, sensitive: true },
    { label: 'IP', value: record.ip },
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
  const filterOptions = useMemo(() => createFilterOptions(rows), [rows]);
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<OnlineUserSessionSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search sessions',
      selectFilters: filterOptions,
    });

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
      content: `Session ${record.id} will be revoked and marked with a manual Admin reason.`,
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
            Read-only unless kick-out is permitted
          </Typography.Text>,
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
