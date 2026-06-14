import {
  ClearOutlined,
  DeleteOutlined,
  EyeOutlined,
  GlobalOutlined,
  ReloadOutlined,
  SearchOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import type {
  IpLocationLookupSummary,
  IpLocationProviderStatusSummary,
  LoginLogQueryRequest,
  LoginLogResult,
  LoginLogSummary,
  LoginLogType,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Input,
  message,
  Modal,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState, type Key } from 'react';
import {
  cleanOpenCoreLoginLogs,
  deleteOpenCoreLoginLogs,
  getOpenCoreLoginLog,
  getOpenCoreIpLocationProviderStatus,
  listOpenCoreLoginLogs,
  lookupOpenCoreIpLocation,
  unlockOpenCoreLoginUser,
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

const loginTypeOptions: { label: string; value: LoginLogType }[] = [
  { label: 'Username login', value: 'login.username' },
  { label: 'Mobile login', value: 'login.mobile' },
  { label: 'SMS login', value: 'login.sms' },
  { label: 'Social login', value: 'login.social' },
  { label: 'Self logout', value: 'logout.self' },
  { label: 'Forced logout', value: 'logout.force' },
];
const loginResultOptions: { label: string; value: LoginLogResult }[] = [
  { label: 'Success', value: 'success' },
  { label: 'Account locked', value: 'account_locked' },
  { label: 'Bad credentials', value: 'bad_credentials' },
  { label: 'User disabled', value: 'user_disabled' },
  { label: 'Captcha missing', value: 'captcha_not_found' },
  { label: 'Captcha error', value: 'captcha_code_error' },
];
const searchFields: CurrentPageSearchField<LoginLogSummary>[] = [
  'username',
  'logType',
  'result',
  'ip',
  'location',
  'browser',
  'os',
  'requestId',
  'failureReason',
  'actorUsername',
  'reason',
];
const exportColumns: CurrentPageExportColumn<LoginLogSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Time', dataIndex: 'createdAt' },
  { title: 'Username', dataIndex: 'username' },
  { title: 'Actor', dataIndex: 'actorUsername' },
  { title: 'Login Type', dataIndex: 'logType' },
  { title: 'Result', dataIndex: 'result' },
  { title: 'Failure Reason', dataIndex: 'failureReason' },
  { title: 'Reason', dataIndex: 'reason' },
  { title: 'IP', dataIndex: 'ip' },
  { title: 'Location', dataIndex: 'location' },
  { title: 'User Agent', dataIndex: 'userAgent' },
  { title: 'Browser', dataIndex: 'browser' },
  { title: 'OS', dataIndex: 'os' },
  { title: 'Request ID', dataIndex: 'requestId' },
];

type LoginLogServerFilterDraft = {
  actorUsername: string;
  createdFrom: string;
  createdTo: string;
  ip: string;
  location: string;
  logType?: LoginLogType;
  result?: LoginLogResult;
  username: string;
};

const emptyServerFilterDraft: LoginLogServerFilterDraft = {
  actorUsername: '',
  createdFrom: '',
  createdTo: '',
  ip: '',
  location: '',
  username: '',
};

function createFilterOptions(
  rows: readonly LoginLogSummary[],
): CurrentPageFilterOption<LoginLogSummary>[] {
  return [
    {
      key: 'result',
      options: loginResultOptions.map((option) => ({
        label: option.label,
        value: option.value,
      })),
      placeholder: 'Result',
      predicate: (record, value) => record.result === value,
    },
    {
      key: 'logType',
      options: loginTypeOptions.map((option) => ({
        label: option.label,
        value: option.value,
      })),
      placeholder: 'Type',
      predicate: (record, value) => record.logType === value,
    },
    {
      key: 'location',
      options: createCurrentPageFilterOptions(rows, 'location'),
      placeholder: 'Location',
      predicate: (record, value) => record.location === value,
    },
    {
      key: 'username',
      options: createCurrentPageFilterOptions(rows, 'username'),
      placeholder: 'Username',
      predicate: (record, value) => record.username === value,
    },
  ];
}

function createDetailFields(record: LoginLogSummary): DetailField[] {
  return [
    { label: 'ID', value: record.id },
    { label: 'Time', value: record.createdAt },
    { label: 'Username', value: record.username },
    { label: 'Actor', value: record.actorUsername },
    { label: 'Login Type', value: formatLoginType(record.logType) },
    { label: 'Result', value: formatLoginResult(record.result) },
    { label: 'Failure Reason', value: record.failureReason },
    { label: 'Reason', value: record.reason },
    { label: 'IP', value: record.ip },
    { label: 'Location', value: record.location },
    { label: 'User Agent', value: record.userAgent },
    { label: 'Browser', value: record.browser },
    { label: 'OS', value: record.os },
    { label: 'Request ID', value: record.requestId },
  ];
}

function createServerFilterQuery(
  draft: LoginLogServerFilterDraft,
): LoginLogQueryRequest {
  return {
    actorUsername: draft.actorUsername.trim() || undefined,
    createdFrom: toIsoDateTime(draft.createdFrom),
    createdTo: toIsoDateTime(draft.createdTo),
    ip: draft.ip.trim() || undefined,
    location: draft.location.trim() || undefined,
    logType: draft.logType,
    result: draft.result,
    username: draft.username.trim() || undefined,
  };
}

function toIsoDateTime(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formatLoginType(value: LoginLogType): string {
  return (
    loginTypeOptions.find((option) => option.value === value)?.label ?? value
  );
}

function formatLoginResult(value: LoginLogResult): string {
  return (
    loginResultOptions.find((option) => option.value === value)?.label ?? value
  );
}

function formatIpLocationLookup(result: IpLocationLookupSummary): string {
  const preciseLocation = [result.countryCode, result.region, result.city]
    .filter(Boolean)
    .join(' / ');
  return [
    result.location,
    result.networkType,
    result.provider,
    result.source,
    preciseLocation,
    result.fallbackReason ? `fallback: ${result.fallbackReason}` : undefined,
  ]
    .filter(Boolean)
    .join(' / ');
}

export default function LoginLogsPage() {
  const access = useAccess();
  const canDeleteLoginLogs = Boolean(access.canDeleteLoginLogs);
  const canManageLoginLogs = Boolean(access.canManageLoginLogs);
  const [rows, setRows] = useState<readonly LoginLogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<LoginLogSummary>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [cleaningLogs, setCleaningLogs] = useState(false);
  const [unlockingUsername, setUnlockingUsername] = useState<string>();
  const [activeServerQuery, setActiveServerQuery] =
    useState<LoginLogQueryRequest>({});
  const [serverFilterDraft, setServerFilterDraft] =
    useState<LoginLogServerFilterDraft>({ ...emptyServerFilterDraft });
  const [ipLocationStatus, setIpLocationStatus] =
    useState<IpLocationProviderStatusSummary>();
  const [ipLookup, setIpLookup] = useState<IpLocationLookupSummary>();
  const [ipLookupLoading, setIpLookupLoading] = useState(false);
  const filterOptions = useMemo(() => createFilterOptions(rows), [rows]);
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<LoginLogSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search login logs',
      selectFilters: filterOptions,
    });
  const selectedRows = useMemo(
    () => filteredRows.filter((row) => selectedRowKeys.includes(row.id)),
    [filteredRows, selectedRowKeys],
  );

  const loadLoginLogs = async (
    query: LoginLogQueryRequest = activeServerQuery,
  ) => {
    setLoading(true);
    try {
      setRows(await listOpenCoreLoginLogs(query));
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setSelectedRowKeys([]);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load login logs.',
      );
    } finally {
      setLoading(false);
    }
  };

  const loadIpLocationStatus = async () => {
    try {
      setIpLocationStatus(await getOpenCoreIpLocationProviderStatus());
    } catch (_error) {
      setIpLocationStatus(undefined);
    }
  };

  const updateServerFilterDraft = <
    Field extends keyof LoginLogServerFilterDraft,
  >(
    field: Field,
    value: LoginLogServerFilterDraft[Field],
  ) => {
    setServerFilterDraft((previous) => ({ ...previous, [field]: value }));
  };

  const applyServerFilters = async () => {
    const query = createServerFilterQuery(serverFilterDraft);
    setActiveServerQuery(query);
    await loadLoginLogs(query);
  };

  const resetServerFilters = async () => {
    setServerFilterDraft({ ...emptyServerFilterDraft });
    setActiveServerQuery({});
    await loadLoginLogs({});
  };

  useEffect(() => {
    void loadLoginLogs({});
    void loadIpLocationStatus();
  }, []);

  const openDetail = async (record: LoginLogSummary) => {
    try {
      setSelectedDetail(await getOpenCoreLoginLog(record.id));
    } catch (_error) {
      setSelectedDetail(record);
    }
  };

  const confirmUnlock = (record: LoginLogSummary) => {
    Modal.confirm({
      title: `Unlock ${record.username}?`,
      content:
        'Failed login counters for this username will be cleared immediately.',
      okText: 'Unlock',
      onOk: async () => {
        setUnlockingUsername(record.username);
        try {
          const result = await unlockOpenCoreLoginUser(record.username);
          message.success(
            result.unlocked
              ? `${result.username} unlocked`
              : `${result.username} had no active lockout`,
          );
          await loadLoginLogs();
        } finally {
          setUnlockingUsername(undefined);
        }
      },
    });
  };

  const confirmDeleteSelected = () => {
    Modal.confirm({
      title: `Delete ${selectedRows.length} selected login logs?`,
      content: 'Selected login log records will be permanently removed.',
      okButtonProps: { danger: true },
      okText: 'Delete selected',
      onOk: async () => {
        setDeletingSelected(true);
        try {
          const result = await deleteOpenCoreLoginLogs({
            ids: selectedRows.map((record) => record.id),
          });
          message.success(`Deleted ${result.affected} login logs`);
          setSelectedRowKeys([]);
          await loadLoginLogs();
        } finally {
          setDeletingSelected(false);
        }
      },
    });
  };

  const confirmCleanAll = () => {
    Modal.confirm({
      title: 'Clean all login logs?',
      content: 'Every login log record will be permanently removed.',
      okButtonProps: { danger: true },
      okText: 'Clean all',
      onOk: async () => {
        setCleaningLogs(true);
        try {
          const result = await cleanOpenCoreLoginLogs();
          message.success(`Cleaned ${result.affected} login logs`);
          setSelectedRowKeys([]);
          await loadLoginLogs();
        } finally {
          setCleaningLogs(false);
        }
      },
    });
  };

  const runIpLocationLookup = async () => {
    const lookupIp =
      serverFilterDraft.ip.trim() ||
      filteredRows.find((record) => record.ip)?.ip ||
      '203.0.113.8';
    setIpLookupLoading(true);
    try {
      const result = await lookupOpenCoreIpLocation(lookupIp);
      setIpLookup(result);
      message.success(`GeoIP lookup: ${result.location}`);
    } finally {
      setIpLookupLoading(false);
    }
  };

  const columns: ProColumns<LoginLogSummary>[] = [
    { title: 'Time', dataIndex: 'createdAt', width: 192 },
    {
      title: 'Username',
      dataIndex: 'username',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.username}
        </Typography.Link>
      ),
    },
    {
      title: 'Login Type',
      dataIndex: 'logType',
      width: 136,
      render: (_, record) => <Tag>{formatLoginType(record.logType)}</Tag>,
    },
    {
      title: 'Actor',
      dataIndex: 'actorUsername',
      width: 136,
      render: (_, record) => record.actorUsername ?? '-',
    },
    {
      title: 'Result',
      dataIndex: 'result',
      width: 144,
      render: (_, record) => (
        <Tag color={record.success ? 'green' : 'red'}>
          {formatLoginResult(record.result)}
        </Tag>
      ),
    },
    { title: 'IP', dataIndex: 'ip', width: 144 },
    { title: 'Location', dataIndex: 'location', width: 168 },
    { title: 'Browser', dataIndex: 'browser', width: 136 },
    { title: 'OS', dataIndex: 'os', width: 112 },
    { title: 'Reason', dataIndex: 'reason', ellipsis: true },
    { title: 'Request ID', dataIndex: 'requestId', ellipsis: true },
    {
      title: 'Action',
      valueType: 'option',
      width: 88,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Detail">
            <Button
              aria-label={`View login log ${record.id}`}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              canManageLoginLogs
                ? 'Unlock username'
                : 'Requires core:login-log:manage'
            }
          >
            <Button
              aria-label={`Unlock login username ${record.username}`}
              disabled={!canManageLoginLogs}
              icon={<UnlockOutlined />}
              loading={unlockingUsername === record.username}
              onClick={() => confirmUnlock(record)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const serverFilterToolbar = (
    <Space key="server-filters" size="small" wrap>
      <Input
        aria-label="Login username server filter"
        onChange={(event) =>
          updateServerFilterDraft('username', event.target.value)
        }
        placeholder="Username"
        style={{ width: 148 }}
        value={serverFilterDraft.username}
      />
      <Input
        aria-label="Login actor server filter"
        onChange={(event) =>
          updateServerFilterDraft('actorUsername', event.target.value)
        }
        placeholder="Actor"
        style={{ width: 132 }}
        value={serverFilterDraft.actorUsername}
      />
      <Input
        aria-label="Login IP server filter"
        onChange={(event) => updateServerFilterDraft('ip', event.target.value)}
        placeholder="IP"
        style={{ width: 132 }}
        value={serverFilterDraft.ip}
      />
      <Input
        aria-label="Login location server filter"
        onChange={(event) =>
          updateServerFilterDraft('location', event.target.value)
        }
        placeholder="Location"
        style={{ width: 148 }}
        value={serverFilterDraft.location}
      />
      <Select
        aria-label="Login type server filter"
        onChange={(value) =>
          updateServerFilterDraft(
            'logType',
            value === 'all' ? undefined : (value as LoginLogType),
          )
        }
        options={[{ label: 'All', value: 'all' }, ...loginTypeOptions]}
        style={{ width: 152 }}
        value={
          serverFilterDraft.logType === undefined
            ? 'all'
            : serverFilterDraft.logType
        }
      />
      <Select
        aria-label="Login result server filter"
        onChange={(value) =>
          updateServerFilterDraft(
            'result',
            value === 'all' ? undefined : (value as LoginLogResult),
          )
        }
        options={[{ label: 'All', value: 'all' }, ...loginResultOptions]}
        style={{ width: 160 }}
        value={
          serverFilterDraft.result === undefined
            ? 'all'
            : serverFilterDraft.result
        }
      />
      <Input
        aria-label="Login created from server filter"
        onChange={(event) =>
          updateServerFilterDraft('createdFrom', event.target.value)
        }
        style={{ width: 180 }}
        type="datetime-local"
        value={serverFilterDraft.createdFrom}
      />
      <Input
        aria-label="Login created to server filter"
        onChange={(event) =>
          updateServerFilterDraft('createdTo', event.target.value)
        }
        style={{ width: 180 }}
        type="datetime-local"
        value={serverFilterDraft.createdTo}
      />
      <Tooltip title="Apply server filters">
        <Button
          aria-label="Apply login log server filters"
          icon={<SearchOutlined />}
          onClick={() => void applyServerFilters()}
        />
      </Tooltip>
      <Tooltip title="Reset server filters">
        <Button
          aria-label="Reset login log server filters"
          icon={<ClearOutlined />}
          onClick={() => void resetServerFilters()}
        />
      </Tooltip>
    </Space>
  );

  return (
    <PageContainer title="Login Logs" subTitle="S7 System">
      {loadError ? (
        <Alert
          message="Unable to load live login logs"
          description={loadError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      {ipLookup ? (
        <Alert
          message={`GeoIP lookup ${ipLookup.ip}`}
          description={formatIpLocationLookup(ipLookup)}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <ProTable<LoginLogSummary>
        columns={columns}
        dataSource={filteredRows}
        loading={loading}
        options={false}
        pagination={{ pageSize: 10 }}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          serverFilterToolbar,
          filterToolbar,
          <Typography.Text key="read-only-policy" type="secondary">
            Audit trail with unlock and cleanup
          </Typography.Text>,
          <Typography.Text key="geoip-provider" type="secondary">
            External GeoIP adapter{' '}
            {ipLocationStatus
              ? `${ipLocationStatus.provider} / ${ipLocationStatus.datasetVersion}`
              : 'loading'}
          </Typography.Text>,
          <Typography.Text key="geoip-endpoint" type="secondary">
            {ipLocationStatus?.endpointHost
              ? `GeoIP endpoint ${ipLocationStatus.endpointHost}`
              : 'GeoIP endpoint offline'}
          </Typography.Text>,
          <Tag
            color={
              ipLocationStatus?.ready && ipLocationStatus.externalLookupEnabled
                ? 'green'
                : ipLocationStatus?.lastError
                  ? 'red'
                  : 'default'
            }
            key="external-lookup"
          >
            External lookup{' '}
            {ipLocationStatus?.externalLookupEnabled ? 'on' : 'off'}
          </Tag>,
          <Tooltip key="geoip-lookup" title="GeoIP lookup">
            <Button
              aria-label="GeoIP lookup"
              icon={<GlobalOutlined />}
              loading={ipLookupLoading}
              onClick={() => void runIpLocationLookup()}
            />
          </Tooltip>,
          <Tooltip
            key="delete-selected"
            title={
              canDeleteLoginLogs
                ? 'Delete selected login logs'
                : 'Requires core:login-log:delete'
            }
          >
            <Button
              danger
              disabled={!canDeleteLoginLogs || selectedRows.length === 0}
              icon={<DeleteOutlined />}
              loading={deletingSelected}
              onClick={confirmDeleteSelected}
            >
              Delete selected
            </Button>
          </Tooltip>,
          <Tooltip
            key="clean-all"
            title={
              canDeleteLoginLogs
                ? 'Clean all login logs'
                : 'Requires core:login-log:delete'
            }
          >
            <Button
              danger
              disabled={!canDeleteLoginLogs}
              icon={<ClearOutlined />}
              loading={cleaningLogs}
              onClick={confirmCleanAll}
            >
              Clean all
            </Button>
          </Tooltip>,
          <CurrentPageExportButton
            columns={exportColumns}
            filename="opencore-login-logs.csv"
            key="export"
            resource="core-login-logs"
            rows={filteredRows}
          />,
          <Tooltip key="refresh" title="Reload">
            <Button
              aria-label="Reload login logs"
              icon={<ReloadOutlined />}
              onClick={() => void loadLoginLogs()}
            />
          </Tooltip>,
        ]}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
          getCheckboxProps: () => ({
            disabled: !canDeleteLoginLogs,
          }),
        }}
      />
      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={selectedDetail?.id ?? 'Login Log Detail'}
      />
    </PageContainer>
  );
}
