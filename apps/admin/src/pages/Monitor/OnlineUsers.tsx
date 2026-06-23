import {
  ClearOutlined,
  DisconnectOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess, useIntl } from '@umijs/max';
import type {
  OnlineUserSessionSummary,
  OnlineUserSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Modal,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState, type Key } from 'react';
import {
  cleanExpiredOpenCoreOnlineUsers,
  getOpenCoreOnlineUser,
  getOpenCoreOnlineUserSummary,
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

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;
type OnlineUserStatus = 'active' | 'expired' | 'revoked';

const emptySummary: OnlineUserSummary = {
  active: 0,
  activeUsers: 0,
  cleanupEligible: 0,
  expired: 0,
  revoked: 0,
  total: 0,
};

const searchFields: CurrentPageSearchField<OnlineUserSessionSummary>[] = [
  'id',
  'username',
  'ip',
  'browser',
  'os',
  'userAgent',
  'tenantId',
  'membershipId',
  'accessMode',
  'revokedBy',
  'revokedReason',
];

function createExportColumns(
  formatMessage: FormatMessage,
): CurrentPageExportColumn<OnlineUserSessionSummary>[] {
  return [
    {
      title: formatMessage('pages.monitor.onlineUsers.fields.id', 'ID'),
      dataIndex: 'id',
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.username',
        'Username',
      ),
      dataIndex: 'username',
    },
    {
      title: formatMessage('pages.monitor.onlineUsers.fields.ip', 'IP'),
      dataIndex: 'ip',
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.browser',
        'Browser',
      ),
      dataIndex: 'browser',
    },
    {
      title: formatMessage('pages.monitor.onlineUsers.fields.os', 'OS'),
      dataIndex: 'os',
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.userAgent',
        'User Agent',
      ),
      dataIndex: 'userAgent',
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.lastSeen',
        'Last Seen',
      ),
      dataIndex: 'lastSeenAt',
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.expiresAt',
        'Expires At',
      ),
      dataIndex: 'expiresAt',
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.revokedAt',
        'Revoked At',
      ),
      dataIndex: 'revokedAt',
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.tokenId',
        'Token ID',
      ),
      dataIndex: 'tokenId',
      sensitive: true,
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.accessMode',
        'Access Mode',
      ),
      dataIndex: 'accessMode',
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.tenantId',
        'Tenant ID',
      ),
      dataIndex: 'tenantId',
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.membershipId',
        'Membership ID',
      ),
      dataIndex: 'membershipId',
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.revokedBy',
        'Revoked By',
      ),
      dataIndex: 'revokedBy',
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.revokedReason',
        'Revoked Reason',
      ),
      dataIndex: 'revokedReason',
      sensitive: true,
    },
  ];
}

function createFilterOptions(
  rows: readonly OnlineUserSessionSummary[],
  formatMessage: FormatMessage,
  statusLabels: Record<OnlineUserStatus, string>,
): CurrentPageFilterOption<OnlineUserSessionSummary>[] {
  return [
    {
      key: 'active',
      options: [
        { label: statusLabels.active, value: 'active' },
        { label: statusLabels.revoked, value: 'revoked' },
        { label: statusLabels.expired, value: 'expired' },
      ],
      placeholder: formatMessage(
        'pages.monitor.onlineUsers.filters.status',
        'Status',
      ),
      predicate: (record, value) =>
        value === 'active'
          ? isOnlineUserActive(record)
          : value === 'expired'
            ? isOnlineUserExpired(record)
            : Boolean(record.revokedAt),
    },
    {
      key: 'username',
      options: createCurrentPageFilterOptions(rows, 'username'),
      placeholder: formatMessage(
        'pages.monitor.onlineUsers.fields.username',
        'Username',
      ),
      predicate: (record, value) => record.username === value,
    },
    {
      key: 'browser',
      options: createCurrentPageFilterOptions(rows, 'browser'),
      placeholder: formatMessage(
        'pages.monitor.onlineUsers.fields.browser',
        'Browser',
      ),
      predicate: (record, value) => record.browser === value,
    },
    {
      key: 'os',
      options: createCurrentPageFilterOptions(rows, 'os'),
      placeholder: formatMessage('pages.monitor.onlineUsers.fields.os', 'OS'),
      predicate: (record, value) => record.os === value,
    },
    {
      key: 'accessMode',
      options: createCurrentPageFilterOptions(rows, 'accessMode'),
      placeholder: formatMessage(
        'pages.monitor.onlineUsers.fields.accessMode',
        'Access Mode',
      ),
      predicate: (record, value) => record.accessMode === value,
    },
  ];
}

function createDetailFields(
  record: OnlineUserSessionSummary,
  formatMessage: FormatMessage,
  statusLabels: Record<OnlineUserStatus, string>,
): DetailField[] {
  return [
    {
      label: formatMessage(
        'pages.monitor.onlineUsers.fields.username',
        'Username',
      ),
      value: record.username,
    },
    {
      label: formatMessage(
        'pages.monitor.onlineUsers.fields.sessionId',
        'Session ID',
      ),
      value: record.id,
    },
    {
      label: formatMessage(
        'pages.monitor.onlineUsers.fields.tokenId',
        'Token ID',
      ),
      value: record.tokenId,
      sensitive: true,
    },
    {
      label: formatMessage('pages.monitor.onlineUsers.fields.ip', 'IP'),
      value: record.ip,
    },
    {
      label: formatMessage(
        'pages.monitor.onlineUsers.fields.accessMode',
        'Access Mode',
      ),
      value: record.accessMode,
    },
    {
      label: formatMessage(
        'pages.monitor.onlineUsers.fields.tenantId',
        'Tenant ID',
      ),
      value: record.tenantId,
    },
    {
      label: formatMessage(
        'pages.monitor.onlineUsers.fields.membershipId',
        'Membership ID',
      ),
      value: record.membershipId,
    },
    {
      label: formatMessage(
        'pages.monitor.onlineUsers.fields.browser',
        'Browser',
      ),
      value: record.browser,
    },
    {
      label: formatMessage('pages.monitor.onlineUsers.fields.os', 'OS'),
      value: record.os,
    },
    {
      label: formatMessage(
        'pages.monitor.onlineUsers.fields.userAgent',
        'User Agent',
      ),
      value: record.userAgent,
    },
    {
      label: formatMessage(
        'pages.monitor.onlineUsers.fields.lastSeen',
        'Last Seen',
      ),
      value: record.lastSeenAt,
    },
    {
      label: formatMessage(
        'pages.monitor.onlineUsers.fields.expiresAt',
        'Expires At',
      ),
      value: record.expiresAt,
    },
    {
      label: formatMessage('pages.monitor.onlineUsers.fields.status', 'Status'),
      value: formatOnlineUserStatus(record, statusLabels),
    },
    {
      label: formatMessage(
        'pages.monitor.onlineUsers.fields.revokedAt',
        'Revoked At',
      ),
      value: record.revokedAt,
    },
    {
      label: formatMessage(
        'pages.monitor.onlineUsers.fields.revokedBy',
        'Revoked By',
      ),
      value: record.revokedBy,
    },
    {
      label: formatMessage(
        'pages.monitor.onlineUsers.fields.revokedReason',
        'Revoked Reason',
      ),
      value: record.revokedReason,
      sensitive: true,
    },
  ];
}

function isOnlineUserExpired(record: OnlineUserSessionSummary): boolean {
  return record.expiresAt <= new Date().toISOString();
}

function isOnlineUserActive(record: OnlineUserSessionSummary): boolean {
  return !record.revokedAt && !isOnlineUserExpired(record);
}

function getOnlineUserStatus(
  record: OnlineUserSessionSummary,
): OnlineUserStatus {
  if (record.revokedAt) {
    return 'revoked';
  }

  return isOnlineUserExpired(record) ? 'expired' : 'active';
}

function formatOnlineUserStatus(
  record: OnlineUserSessionSummary,
  labels: Record<OnlineUserStatus, string>,
): string {
  return labels[getOnlineUserStatus(record)];
}

function statusColor(record: OnlineUserSessionSummary): string {
  const status = getOnlineUserStatus(record);
  if (status === 'revoked') return 'red';
  return status === 'expired' ? 'orange' : 'green';
}

export default function OnlineUsersPage() {
  const access = useAccess();
  const intl = useIntl();
  const canManageOnlineUsers = Boolean(access.canManageOnlineUsers);
  const [rows, setRows] = useState<readonly OnlineUserSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] =
    useState<OnlineUserSessionSummary>();
  const [detailLoadingId, setDetailLoadingId] = useState<string>();
  const [kickingId, setKickingId] = useState<string>();
  const [bulkKicking, setBulkKicking] = useState(false);
  const [cleaningExpired, setCleaningExpired] = useState(false);
  const [summary, setSummary] = useState<OnlineUserSummary>(emptySummary);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const formatMessage = useCallback(
    (
      id: string,
      defaultMessage: string,
      values?: Record<string, number | string>,
    ) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const statusLabels = useMemo<Record<OnlineUserStatus, string>>(
    () => ({
      active: formatMessage(
        'pages.monitor.onlineUsers.status.active',
        'active',
      ),
      expired: formatMessage(
        'pages.monitor.onlineUsers.status.expired',
        'expired',
      ),
      revoked: formatMessage(
        'pages.monitor.onlineUsers.status.revoked',
        'revoked',
      ),
    }),
    [formatMessage],
  );
  const exportColumns = useMemo(
    () => createExportColumns(formatMessage),
    [formatMessage],
  );
  const filterOptions = useMemo(
    () => createFilterOptions(rows, formatMessage, statusLabels),
    [formatMessage, rows, statusLabels],
  );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<OnlineUserSessionSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.monitor.onlineUsers.search.placeholder',
        'Search sessions',
      ),
      selectFilters: filterOptions,
    });
  const activeSelectedRows = useMemo(
    () =>
      filteredRows.filter(
        (row) => selectedRowKeys.includes(row.id) && isOnlineUserActive(row),
      ),
    [filteredRows, selectedRowKeys],
  );

  const loadOnlineUsers = async () => {
    setLoading(true);
    try {
      const [nextRows, nextSummary] = await Promise.all([
        listOpenCoreOnlineUsers(),
        getOpenCoreOnlineUserSummary(),
      ]);
      setRows(nextRows);
      setSummary(nextSummary);
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setSummary(emptySummary);
      setSelectedDetail(undefined);
      setSelectedRowKeys([]);
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.monitor.onlineUsers.load.failure',
              'Unable to load online users.',
            ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOnlineUsers();
  }, []);

  const openDetail = async (record: OnlineUserSessionSummary) => {
    setDetailLoadingId(record.id);
    try {
      setSelectedDetail(await getOpenCoreOnlineUser(record.id));
    } catch (error: unknown) {
      setSelectedDetail(undefined);
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.monitor.onlineUsers.detail.loadFailure',
              'Unable to load live online user detail.',
            ),
      );
    } finally {
      setDetailLoadingId(undefined);
    }
  };

  const confirmKickOut = (record: OnlineUserSessionSummary) => {
    Modal.confirm({
      title: formatMessage(
        'pages.monitor.onlineUsers.confirm.kickOut',
        'Kick out {username}?',
        { username: record.username },
      ),
      content: formatMessage(
        'pages.monitor.onlineUsers.confirm.kickOutContent',
        'Session {id} will be revoked and its bearer token will stop authenticating protected API requests.',
        { id: record.id },
      ),
      okButtonProps: { danger: true },
      okText: formatMessage(
        'pages.monitor.onlineUsers.actions.kickOut',
        'Kick out',
      ),
      onOk: async () => {
        setKickingId(record.id);
        try {
          await kickOutOpenCoreOnlineUser(record.id, {
            actor: 'admin',
            reason: 'Manual kick-out from Admin Online Users page',
          });
          message.success(
            formatMessage(
              'pages.monitor.onlineUsers.messages.kickedOut',
              'Session kicked out',
            ),
          );
          await loadOnlineUsers();
        } finally {
          setKickingId(undefined);
        }
      },
    });
  };

  const confirmCleanExpired = () => {
    Modal.confirm({
      title: formatMessage(
        'pages.monitor.onlineUsers.confirm.cleanExpired',
        'Clean expired sessions?',
      ),
      content: formatMessage(
        'pages.monitor.onlineUsers.confirm.cleanExpiredContent',
        'Expired bearer session records will be removed after their JWT expiry has passed.',
      ),
      okButtonProps: { danger: true },
      okText: formatMessage(
        'pages.monitor.onlineUsers.actions.cleanExpired',
        'Clean expired',
      ),
      onOk: async () => {
        setCleaningExpired(true);
        try {
          const result = await cleanExpiredOpenCoreOnlineUsers();
          message.success(
            formatMessage(
              'pages.monitor.onlineUsers.messages.cleanedExpired',
              'Cleaned {count} expired sessions',
              { count: result.affected },
            ),
          );
          setSelectedRowKeys([]);
          await loadOnlineUsers();
        } finally {
          setCleaningExpired(false);
        }
      },
    });
  };

  const confirmBulkKickOut = () => {
    Modal.confirm({
      title: formatMessage(
        'pages.monitor.onlineUsers.confirm.bulkKickOut',
        'Kick out {count} selected sessions?',
        { count: activeSelectedRows.length },
      ),
      content: formatMessage(
        'pages.monitor.onlineUsers.confirm.bulkKickOutContent',
        'Selected active sessions will be revoked and their bearer tokens will stop authenticating protected API requests.',
      ),
      okButtonProps: { danger: true },
      okText: formatMessage(
        'pages.monitor.onlineUsers.actions.kickOutSelected',
        'Kick out selected',
      ),
      onOk: async () => {
        setBulkKicking(true);
        try {
          const result = await kickOutOpenCoreOnlineUsers({
            ids: activeSelectedRows.map((record) => record.id),
            actor: 'admin',
            reason: 'Bulk kick-out from Admin Online Users page',
          });
          message.success(
            formatMessage(
              'pages.monitor.onlineUsers.messages.bulkKicked',
              'Kicked {kicked} sessions, skipped {skipped}',
              { kicked: result.kicked, skipped: result.skipped },
            ),
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
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.username',
        'Username',
      ),
      dataIndex: 'username',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.username}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.monitor.onlineUsers.fields.ip', 'IP'),
      dataIndex: 'ip',
      width: 144,
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.browser',
        'Browser',
      ),
      dataIndex: 'browser',
      width: 136,
    },
    {
      title: formatMessage('pages.monitor.onlineUsers.fields.os', 'OS'),
      dataIndex: 'os',
      width: 112,
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.userAgent',
        'User Agent',
      ),
      dataIndex: 'userAgent',
      ellipsis: true,
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.accessMode',
        'Access Mode',
      ),
      dataIndex: 'accessMode',
      width: 136,
      render: (_, record) =>
        record.accessMode ? <Tag>{record.accessMode}</Tag> : '-',
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.fields.lastSeen',
        'Last Seen',
      ),
      dataIndex: 'lastSeenAt',
      width: 192,
    },
    {
      title: formatMessage('pages.monitor.onlineUsers.fields.status', 'Status'),
      width: 112,
      render: (_, record) => (
        <Tag color={statusColor(record)}>
          {formatOnlineUserStatus(record, statusLabels)}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.monitor.onlineUsers.actions.column',
        'Action',
      ),
      valueType: 'option',
      width: 112,
      render: (_, record) => (
        <Space size="small">
          <Tooltip
            title={formatMessage(
              'pages.monitor.onlineUsers.actions.detail',
              'Detail',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.monitor.onlineUsers.actions.viewAria',
                'View online user {id}',
                { id: record.id },
              )}
              icon={<EyeOutlined />}
              loading={detailLoadingId === record.id}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              !isOnlineUserActive(record)
                ? formatMessage(
                    'pages.monitor.onlineUsers.actions.alreadyStatus',
                    'Already {status}',
                    { status: formatOnlineUserStatus(record, statusLabels) },
                  )
                : canManageOnlineUsers
                  ? formatMessage(
                      'pages.monitor.onlineUsers.actions.kickOut',
                      'Kick out',
                    )
                  : formatMessage(
                      'pages.monitor.onlineUsers.permission.manageRequired',
                      'Requires monitor:online-user:manage',
                    )
            }
          >
            <Button
              aria-label={formatMessage(
                'pages.monitor.onlineUsers.actions.kickOutAria',
                'Kick out online user {id}',
                { id: record.id },
              )}
              danger
              disabled={!isOnlineUserActive(record) || !canManageOnlineUsers}
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
    <PageContainer
      title={formatMessage('pages.monitor.onlineUsers.title', 'Online Users')}
      subTitle={formatMessage('pages.monitor.section', 'S11 Operations')}
    >
      {loadError ? (
        <Alert
          message={formatMessage(
            'pages.monitor.onlineUsers.load.liveFailure',
            'Unable to load live online users',
          )}
          description={loadError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Typography.Text type="secondary">
          {formatMessage(
            'pages.monitor.onlineUsers.policy.liveSessions',
            'Live online user sessions',
          )}
        </Typography.Text>
        <Typography.Text type="secondary">
          {formatMessage(
            'pages.monitor.onlineUsers.policy.tokenBlacklist',
            'Token blacklist maintenance',
          )}
        </Typography.Text>
        <Statistic
          title={formatMessage(
            'pages.monitor.onlineUsers.stats.active',
            'Active sessions',
          )}
          value={summary.active}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.onlineUsers.stats.revoked',
            'Revoked sessions',
          )}
          value={summary.revoked}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.onlineUsers.stats.expired',
            'Expired sessions',
          )}
          value={summary.expired}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.onlineUsers.stats.cleanupEligible',
            'Cleanup eligible',
          )}
          value={summary.cleanupEligible}
        />
      </Space>
      <ProTable<OnlineUserSessionSummary>
        rowKey="id"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <Typography.Text key="kick-out-policy" type="secondary">
            {formatMessage(
              'pages.monitor.onlineUsers.policy.kickOut',
              'Kick-out invalidates active bearer sessions',
            )}
          </Typography.Text>,
          <Tooltip
            key="clean-expired"
            title={
              canManageOnlineUsers
                ? formatMessage(
                    'pages.monitor.onlineUsers.actions.cleanExpiredSessions',
                    'Clean expired sessions',
                  )
                : formatMessage(
                    'pages.monitor.onlineUsers.permission.manageRequired',
                    'Requires monitor:online-user:manage',
                  )
            }
          >
            <Button
              danger
              disabled={!canManageOnlineUsers}
              icon={<ClearOutlined />}
              loading={cleaningExpired}
              onClick={confirmCleanExpired}
            >
              {formatMessage(
                'pages.monitor.onlineUsers.actions.cleanExpiredSessions',
                'Clean expired sessions',
              )}
            </Button>
          </Tooltip>,
          <Tooltip
            key="bulk-kick"
            title={
              canManageOnlineUsers
                ? formatMessage(
                    'pages.monitor.onlineUsers.actions.kickOutSelectedActive',
                    'Kick out selected active sessions',
                  )
                : formatMessage(
                    'pages.monitor.onlineUsers.permission.manageRequired',
                    'Requires monitor:online-user:manage',
                  )
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
              {formatMessage(
                'pages.monitor.onlineUsers.actions.kickSelected',
                'Kick selected',
              )}
            </Button>
          </Tooltip>,
          <CurrentPageExportButton<OnlineUserSessionSummary>
            key="export"
            columns={exportColumns}
            filename="opencore-online-users.csv"
            resource="monitor-online-users"
            rows={filteredRows}
          />,
          <Tooltip
            key="refresh"
            title={formatMessage(
              'pages.monitor.onlineUsers.actions.reload',
              'Reload',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.monitor.onlineUsers.actions.reloadAria',
                'Reload online users',
              )}
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
            disabled: !isOnlineUserActive(record) || !canManageOnlineUsers,
          }),
        }}
      />
      <ReadOnlyDetailDrawer
        fields={
          selectedDetail
            ? createDetailFields(selectedDetail, formatMessage, statusLabels)
            : []
        }
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={
          selectedDetail?.username ??
          formatMessage(
            'pages.monitor.onlineUsers.detail.title',
            'Online User Detail',
          )
        }
      />
    </PageContainer>
  );
}
