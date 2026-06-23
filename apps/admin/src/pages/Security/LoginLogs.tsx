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
import { useAccess, useIntl } from '@umijs/max';
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

const searchFields: CurrentPageSearchField<LoginLogSummary>[] = [
  'username',
  'tenantId',
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

type LocaleFormatter = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

type LoginTypeOption = { label: string; value: LoginLogType };
type LoginResultOption = { label: string; value: LoginLogResult };

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
  loginResultOptions: readonly LoginResultOption[],
  loginTypeOptions: readonly LoginTypeOption[],
  formatMessage: LocaleFormatter,
): CurrentPageFilterOption<LoginLogSummary>[] {
  return [
    {
      key: 'result',
      options: loginResultOptions.map((option) => ({
        label: option.label,
        value: option.value,
      })),
      placeholder: formatMessage('pages.security.loginLogs.fields.result', 'Result'),
      predicate: (record, value) => record.result === value,
    },
    {
      key: 'logType',
      options: loginTypeOptions.map((option) => ({
        label: option.label,
        value: option.value,
      })),
      placeholder: formatMessage('pages.security.loginLogs.filters.type', 'Type'),
      predicate: (record, value) => record.logType === value,
    },
    {
      key: 'location',
      options: createCurrentPageFilterOptions(rows, 'location'),
      placeholder: formatMessage(
        'pages.security.loginLogs.fields.location',
        'Location',
      ),
      predicate: (record, value) => record.location === value,
    },
    {
      key: 'username',
      options: createCurrentPageFilterOptions(rows, 'username'),
      placeholder: formatMessage(
        'pages.security.loginLogs.fields.username',
        'Username',
      ),
      predicate: (record, value) => record.username === value,
    },
  ];
}

function createDetailFields(
  record: LoginLogSummary,
  formatLoginType: (value: LoginLogType) => string,
  formatLoginResult: (value: LoginLogResult) => string,
  formatMessage: LocaleFormatter,
): DetailField[] {
  return [
    { label: formatMessage('pages.security.loginLogs.fields.id', 'ID'), value: record.id },
    {
      label: formatMessage('pages.security.loginLogs.fields.tenantId', 'Tenant ID'),
      value: record.tenantId,
    },
    {
      label: formatMessage('pages.security.loginLogs.fields.time', 'Time'),
      value: record.createdAt,
    },
    {
      label: formatMessage(
        'pages.security.loginLogs.fields.username',
        'Username',
      ),
      value: record.username,
    },
    {
      label: formatMessage('pages.security.loginLogs.fields.actor', 'Actor'),
      value: record.actorUsername,
    },
    {
      label: formatMessage(
        'pages.security.loginLogs.fields.loginType',
        'Login Type',
      ),
      value: formatLoginType(record.logType),
    },
    {
      label: formatMessage('pages.security.loginLogs.fields.result', 'Result'),
      value: formatLoginResult(record.result),
    },
    {
      label: formatMessage(
        'pages.security.loginLogs.fields.failureReason',
        'Failure Reason',
      ),
      value: record.failureReason,
    },
    {
      label: formatMessage('pages.security.loginLogs.fields.reason', 'Reason'),
      value: record.reason,
    },
    { label: formatMessage('pages.security.loginLogs.fields.ip', 'IP'), value: record.ip },
    {
      label: formatMessage(
        'pages.security.loginLogs.fields.location',
        'Location',
      ),
      value: record.location,
    },
    {
      label: formatMessage(
        'pages.security.loginLogs.fields.userAgent',
        'User Agent',
      ),
      value: record.userAgent,
    },
    {
      label: formatMessage('pages.security.loginLogs.fields.browser', 'Browser'),
      value: record.browser,
    },
    { label: formatMessage('pages.security.loginLogs.fields.os', 'OS'), value: record.os },
    {
      label: formatMessage(
        'pages.security.loginLogs.fields.requestId',
        'Request ID',
      ),
      value: record.requestId,
    },
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

function formatIpLocationLookup(
  result: IpLocationLookupSummary,
  formatMessage: LocaleFormatter,
): string {
  const preciseLocation = [result.countryCode, result.region, result.city]
    .filter(Boolean)
    .join(' / ');
  return [
    result.location,
    result.networkType,
    result.provider,
    result.source,
    preciseLocation,
    result.fallbackReason
      ? formatMessage(
          'pages.security.loginLogs.geoip.fallbackReason',
          'fallback: {reason}',
          { reason: result.fallbackReason },
        )
      : undefined,
  ]
    .filter(Boolean)
    .join(' / ');
}

export default function LoginLogsPage() {
  const intl = useIntl();
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
  const formatMessage = (
    id: string,
    defaultMessage: string,
    values?: Record<string, number | string>,
  ) =>
    values
      ? intl.formatMessage({ id, defaultMessage }, values)
      : intl.formatMessage({ id, defaultMessage });
  const loginTypeOptions: LoginTypeOption[] = [
    {
      label: formatMessage(
        'pages.security.loginLogs.loginType.username',
        'Username login',
      ),
      value: 'login.username',
    },
    {
      label: formatMessage(
        'pages.security.loginLogs.loginType.mobile',
        'Mobile login',
      ),
      value: 'login.mobile',
    },
    {
      label: formatMessage('pages.security.loginLogs.loginType.sms', 'SMS login'),
      value: 'login.sms',
    },
    {
      label: formatMessage(
        'pages.security.loginLogs.loginType.social',
        'Social login',
      ),
      value: 'login.social',
    },
    {
      label: formatMessage(
        'pages.security.loginLogs.loginType.selfLogout',
        'Self logout',
      ),
      value: 'logout.self',
    },
    {
      label: formatMessage(
        'pages.security.loginLogs.loginType.forceLogout',
        'Forced logout',
      ),
      value: 'logout.force',
    },
  ];
  const loginResultOptions: LoginResultOption[] = [
    {
      label: formatMessage('pages.security.loginLogs.result.success', 'Success'),
      value: 'success',
    },
    {
      label: formatMessage(
        'pages.security.loginLogs.result.accountLocked',
        'Account locked',
      ),
      value: 'account_locked',
    },
    {
      label: formatMessage(
        'pages.security.loginLogs.result.badCredentials',
        'Bad credentials',
      ),
      value: 'bad_credentials',
    },
    {
      label: formatMessage(
        'pages.security.loginLogs.result.userDisabled',
        'User disabled',
      ),
      value: 'user_disabled',
    },
    {
      label: formatMessage(
        'pages.security.loginLogs.result.captchaMissing',
        'Captcha missing',
      ),
      value: 'captcha_not_found',
    },
    {
      label: formatMessage(
        'pages.security.loginLogs.result.captchaError',
        'Captcha error',
      ),
      value: 'captcha_code_error',
    },
  ];
  const exportColumns: CurrentPageExportColumn<LoginLogSummary>[] = [
    { title: formatMessage('pages.security.loginLogs.fields.id', 'ID'), dataIndex: 'id' },
    {
      title: formatMessage('pages.security.loginLogs.fields.tenantId', 'Tenant ID'),
      dataIndex: 'tenantId',
    },
    {
      title: formatMessage('pages.security.loginLogs.fields.time', 'Time'),
      dataIndex: 'createdAt',
    },
    {
      title: formatMessage(
        'pages.security.loginLogs.fields.username',
        'Username',
      ),
      dataIndex: 'username',
    },
    {
      title: formatMessage('pages.security.loginLogs.fields.actor', 'Actor'),
      dataIndex: 'actorUsername',
    },
    {
      title: formatMessage(
        'pages.security.loginLogs.fields.loginType',
        'Login Type',
      ),
      dataIndex: 'logType',
    },
    {
      title: formatMessage('pages.security.loginLogs.fields.result', 'Result'),
      dataIndex: 'result',
    },
    {
      title: formatMessage(
        'pages.security.loginLogs.fields.failureReason',
        'Failure Reason',
      ),
      dataIndex: 'failureReason',
    },
    {
      title: formatMessage('pages.security.loginLogs.fields.reason', 'Reason'),
      dataIndex: 'reason',
    },
    { title: formatMessage('pages.security.loginLogs.fields.ip', 'IP'), dataIndex: 'ip' },
    {
      title: formatMessage(
        'pages.security.loginLogs.fields.location',
        'Location',
      ),
      dataIndex: 'location',
    },
    {
      title: formatMessage(
        'pages.security.loginLogs.fields.userAgent',
        'User Agent',
      ),
      dataIndex: 'userAgent',
    },
    {
      title: formatMessage('pages.security.loginLogs.fields.browser', 'Browser'),
      dataIndex: 'browser',
    },
    { title: formatMessage('pages.security.loginLogs.fields.os', 'OS'), dataIndex: 'os' },
    {
      title: formatMessage(
        'pages.security.loginLogs.fields.requestId',
        'Request ID',
      ),
      dataIndex: 'requestId',
    },
  ];
  const allOptionLabel = formatMessage('pages.security.common.all', 'All');
  const formatLoginType = (value: LoginLogType): string =>
    loginTypeOptions.find((option) => option.value === value)?.label ?? value;
  const formatLoginResult = (value: LoginLogResult): string =>
    loginResultOptions.find((option) => option.value === value)?.label ?? value;
  const filterOptions = createFilterOptions(
    rows,
    loginResultOptions,
    loginTypeOptions,
    formatMessage,
  );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<LoginLogSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.security.loginLogs.search.placeholder',
        'Search login logs',
      ),
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
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.security.loginLogs.load.failure',
              'Unable to load login logs.',
            ),
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
      title: formatMessage('pages.security.loginLogs.confirm.unlock', 'Unlock {username}?', {
        username: record.username,
      }),
      content: formatMessage(
        'pages.security.loginLogs.confirm.unlockContent',
        'Failed login counters for this username will be cleared immediately.',
      ),
      okText: formatMessage('pages.security.loginLogs.actions.unlock', 'Unlock'),
      onOk: async () => {
        setUnlockingUsername(record.username);
        try {
          const result = await unlockOpenCoreLoginUser(record.username);
          message.success(
            result.unlocked
              ? formatMessage(
                  'pages.security.loginLogs.messages.unlocked',
                  '{username} unlocked',
                  { username: result.username },
                )
              : formatMessage(
                  'pages.security.loginLogs.messages.noActiveLockout',
                  '{username} had no active lockout',
                  { username: result.username },
                ),
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
      title: formatMessage(
        'pages.security.loginLogs.confirm.deleteSelected',
        'Delete {count} selected login logs?',
        { count: selectedRows.length },
      ),
      content: formatMessage(
        'pages.security.loginLogs.confirm.deleteSelectedContent',
        'Selected login log records will be permanently removed.',
      ),
      okButtonProps: { danger: true },
      okText: formatMessage(
        'pages.security.loginLogs.actions.deleteSelected',
        'Delete selected',
      ),
      onOk: async () => {
        setDeletingSelected(true);
        try {
          const result = await deleteOpenCoreLoginLogs({
            ids: selectedRows.map((record) => record.id),
          });
          message.success(
            formatMessage(
              'pages.security.loginLogs.messages.deleted',
              'Deleted {count} login logs',
              { count: result.affected },
            ),
          );
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
      title: formatMessage(
        'pages.security.loginLogs.confirm.cleanAll',
        'Clean all login logs?',
      ),
      content: formatMessage(
        'pages.security.loginLogs.confirm.cleanAllContent',
        'Every login log record will be permanently removed.',
      ),
      okButtonProps: { danger: true },
      okText: formatMessage('pages.security.loginLogs.actions.cleanAll', 'Clean all'),
      onOk: async () => {
        setCleaningLogs(true);
        try {
          const result = await cleanOpenCoreLoginLogs();
          message.success(
            formatMessage(
              'pages.security.loginLogs.messages.cleaned',
              'Cleaned {count} login logs',
              { count: result.affected },
            ),
          );
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
      message.success(
        formatMessage(
          'pages.security.loginLogs.messages.geoipLookup',
          'GeoIP lookup: {location}',
          { location: result.location },
        ),
      );
    } finally {
      setIpLookupLoading(false);
    }
  };

  const columns: ProColumns<LoginLogSummary>[] = [
    {
      title: formatMessage('pages.security.loginLogs.fields.time', 'Time'),
      dataIndex: 'createdAt',
      width: 192,
    },
    {
      title: formatMessage(
        'pages.security.loginLogs.fields.username',
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
      title: formatMessage('pages.security.loginLogs.fields.tenantId', 'Tenant ID'),
      dataIndex: 'tenantId',
      width: 152,
      ellipsis: true,
    },
    {
      title: formatMessage(
        'pages.security.loginLogs.fields.loginType',
        'Login Type',
      ),
      dataIndex: 'logType',
      width: 136,
      render: (_, record) => <Tag>{formatLoginType(record.logType)}</Tag>,
    },
    {
      title: formatMessage('pages.security.loginLogs.fields.actor', 'Actor'),
      dataIndex: 'actorUsername',
      width: 136,
      render: (_, record) => record.actorUsername ?? '-',
    },
    {
      title: formatMessage('pages.security.loginLogs.fields.result', 'Result'),
      dataIndex: 'result',
      width: 144,
      render: (_, record) => (
        <Tag color={record.success ? 'green' : 'red'}>
          {formatLoginResult(record.result)}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.security.loginLogs.fields.ip', 'IP'),
      dataIndex: 'ip',
      width: 144,
    },
    {
      title: formatMessage(
        'pages.security.loginLogs.fields.location',
        'Location',
      ),
      dataIndex: 'location',
      width: 168,
    },
    {
      title: formatMessage('pages.security.loginLogs.fields.browser', 'Browser'),
      dataIndex: 'browser',
      width: 136,
    },
    {
      title: formatMessage('pages.security.loginLogs.fields.os', 'OS'),
      dataIndex: 'os',
      width: 112,
    },
    {
      title: formatMessage('pages.security.loginLogs.fields.reason', 'Reason'),
      dataIndex: 'reason',
      ellipsis: true,
    },
    {
      title: formatMessage(
        'pages.security.loginLogs.fields.requestId',
        'Request ID',
      ),
      dataIndex: 'requestId',
      ellipsis: true,
    },
    {
      title: formatMessage('pages.security.loginLogs.actions.column', 'Action'),
      valueType: 'option',
      width: 88,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title={formatMessage('pages.security.loginLogs.actions.detail', 'Detail')}>
            <Button
              aria-label={formatMessage(
                'pages.security.loginLogs.actions.viewAria',
                'View login log {id}',
                { id: record.id },
              )}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              canManageLoginLogs
                ? formatMessage(
                    'pages.security.loginLogs.actions.unlockUsername',
                    'Unlock username',
                  )
                : formatMessage(
                    'pages.security.loginLogs.permission.manageRequired',
                    'Requires core:login-log:manage',
                  )
            }
          >
            <Button
              aria-label={formatMessage(
                'pages.security.loginLogs.actions.unlockAria',
                'Unlock login username {username}',
                { username: record.username },
              )}
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
        aria-label={formatMessage(
          'pages.security.loginLogs.serverFilters.usernameAria',
          'Login username server filter',
        )}
        onChange={(event) =>
          updateServerFilterDraft('username', event.target.value)
        }
        placeholder={formatMessage(
          'pages.security.loginLogs.fields.username',
          'Username',
        )}
        style={{ width: 148 }}
        value={serverFilterDraft.username}
      />
      <Input
        aria-label={formatMessage(
          'pages.security.loginLogs.serverFilters.actorAria',
          'Login actor server filter',
        )}
        onChange={(event) =>
          updateServerFilterDraft('actorUsername', event.target.value)
        }
        placeholder={formatMessage('pages.security.loginLogs.fields.actor', 'Actor')}
        style={{ width: 132 }}
        value={serverFilterDraft.actorUsername}
      />
      <Input
        aria-label={formatMessage(
          'pages.security.loginLogs.serverFilters.ipAria',
          'Login IP server filter',
        )}
        onChange={(event) => updateServerFilterDraft('ip', event.target.value)}
        placeholder={formatMessage('pages.security.loginLogs.fields.ip', 'IP')}
        style={{ width: 132 }}
        value={serverFilterDraft.ip}
      />
      <Input
        aria-label={formatMessage(
          'pages.security.loginLogs.serverFilters.locationAria',
          'Login location server filter',
        )}
        onChange={(event) =>
          updateServerFilterDraft('location', event.target.value)
        }
        placeholder={formatMessage(
          'pages.security.loginLogs.fields.location',
          'Location',
        )}
        style={{ width: 148 }}
        value={serverFilterDraft.location}
      />
      <Select
        aria-label={formatMessage(
          'pages.security.loginLogs.serverFilters.typeAria',
          'Login type server filter',
        )}
        onChange={(value) =>
          updateServerFilterDraft(
            'logType',
            value === 'all' ? undefined : (value as LoginLogType),
          )
        }
        options={[{ label: allOptionLabel, value: 'all' }, ...loginTypeOptions]}
        style={{ width: 152 }}
        value={
          serverFilterDraft.logType === undefined
            ? 'all'
            : serverFilterDraft.logType
        }
      />
      <Select
        aria-label={formatMessage(
          'pages.security.loginLogs.serverFilters.resultAria',
          'Login result server filter',
        )}
        onChange={(value) =>
          updateServerFilterDraft(
            'result',
            value === 'all' ? undefined : (value as LoginLogResult),
          )
        }
        options={[{ label: allOptionLabel, value: 'all' }, ...loginResultOptions]}
        style={{ width: 160 }}
        value={
          serverFilterDraft.result === undefined
            ? 'all'
            : serverFilterDraft.result
        }
      />
      <Input
        aria-label={formatMessage(
          'pages.security.loginLogs.serverFilters.createdFromAria',
          'Login created from server filter',
        )}
        onChange={(event) =>
          updateServerFilterDraft('createdFrom', event.target.value)
        }
        style={{ width: 180 }}
        type="datetime-local"
        value={serverFilterDraft.createdFrom}
      />
      <Input
        aria-label={formatMessage(
          'pages.security.loginLogs.serverFilters.createdToAria',
          'Login created to server filter',
        )}
        onChange={(event) =>
          updateServerFilterDraft('createdTo', event.target.value)
        }
        style={{ width: 180 }}
        type="datetime-local"
        value={serverFilterDraft.createdTo}
      />
      <Tooltip
        title={formatMessage(
          'pages.security.loginLogs.actions.applyServerFilters',
          'Apply server filters',
        )}
      >
        <Button
          aria-label={formatMessage(
            'pages.security.loginLogs.actions.applyServerFiltersAria',
            'Apply login log server filters',
          )}
          icon={<SearchOutlined />}
          onClick={() => void applyServerFilters()}
        />
      </Tooltip>
      <Tooltip
        title={formatMessage(
          'pages.security.loginLogs.actions.resetServerFilters',
          'Reset server filters',
        )}
      >
        <Button
          aria-label={formatMessage(
            'pages.security.loginLogs.actions.resetServerFiltersAria',
            'Reset login log server filters',
          )}
          icon={<ClearOutlined />}
          onClick={() => void resetServerFilters()}
        />
      </Tooltip>
    </Space>
  );

  return (
    <PageContainer
      title={formatMessage('pages.security.loginLogs.title', 'Login Logs')}
      subTitle={formatMessage('pages.system.section', 'S7 System')}
    >
      {loadError ? (
        <Alert
          message={formatMessage(
            'pages.security.loginLogs.load.liveFailure',
            'Unable to load live login logs',
          )}
          description={loadError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      {ipLookup ? (
        <Alert
          message={formatMessage(
            'pages.security.loginLogs.geoip.lookupForIp',
            'GeoIP lookup {ip}',
            { ip: ipLookup.ip },
          )}
          description={formatIpLocationLookup(ipLookup, formatMessage)}
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
            {formatMessage(
              'pages.security.loginLogs.policy.auditTrail',
              'Audit trail with unlock and cleanup',
            )}
          </Typography.Text>,
          <Typography.Text key="geoip-provider" type="secondary">
            {ipLocationStatus
              ? formatMessage(
                  'pages.security.loginLogs.geoip.adapterStatus',
                  'External GeoIP adapter {provider} / {version}',
                  {
                    provider: ipLocationStatus.provider,
                    version: ipLocationStatus.datasetVersion,
                  },
                )
              : formatMessage(
                  'pages.security.loginLogs.geoip.adapterLoading',
                  'External GeoIP adapter loading',
                )}
          </Typography.Text>,
          <Typography.Text key="geoip-endpoint" type="secondary">
            {ipLocationStatus?.endpointHost
              ? formatMessage(
                  'pages.security.loginLogs.geoip.endpoint',
                  'GeoIP endpoint {host}',
                  { host: ipLocationStatus.endpointHost },
                )
              : formatMessage(
                  'pages.security.loginLogs.geoip.endpointOffline',
                  'GeoIP endpoint offline',
                )}
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
            {formatMessage(
              ipLocationStatus?.externalLookupEnabled
                ? 'pages.security.loginLogs.geoip.externalLookupOn'
                : 'pages.security.loginLogs.geoip.externalLookupOff',
              ipLocationStatus?.externalLookupEnabled
                ? 'External lookup on'
                : 'External lookup off',
            )}
          </Tag>,
          <Tooltip
            key="geoip-lookup"
            title={formatMessage(
              'pages.security.loginLogs.actions.geoipLookup',
              'GeoIP lookup',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.security.loginLogs.actions.geoipLookupAria',
                'GeoIP lookup',
              )}
              icon={<GlobalOutlined />}
              loading={ipLookupLoading}
              onClick={() => void runIpLocationLookup()}
            />
          </Tooltip>,
          <Tooltip
            key="delete-selected"
            title={
              canDeleteLoginLogs
                ? formatMessage(
                    'pages.security.loginLogs.actions.deleteSelectedLogs',
                    'Delete selected login logs',
                  )
                : formatMessage(
                    'pages.security.loginLogs.permission.deleteRequired',
                    'Requires core:login-log:delete',
                  )
            }
          >
            <Button
              danger
              disabled={!canDeleteLoginLogs || selectedRows.length === 0}
              icon={<DeleteOutlined />}
              loading={deletingSelected}
              onClick={confirmDeleteSelected}
            >
              {formatMessage(
                'pages.security.loginLogs.actions.deleteSelected',
                'Delete selected',
              )}
            </Button>
          </Tooltip>,
          <Tooltip
            key="clean-all"
            title={
              canDeleteLoginLogs
                ? formatMessage(
                    'pages.security.loginLogs.actions.cleanAllLogs',
                    'Clean all login logs',
                  )
                : formatMessage(
                    'pages.security.loginLogs.permission.deleteRequired',
                    'Requires core:login-log:delete',
                  )
            }
          >
            <Button
              danger
              disabled={!canDeleteLoginLogs}
              icon={<ClearOutlined />}
              loading={cleaningLogs}
              onClick={confirmCleanAll}
            >
              {formatMessage('pages.security.loginLogs.actions.cleanAll', 'Clean all')}
            </Button>
          </Tooltip>,
          <CurrentPageExportButton
            columns={exportColumns}
            filename="opencore-login-logs.csv"
            key="export"
            resource="core-login-logs"
            rows={filteredRows}
          />,
          <Tooltip
            key="refresh"
            title={formatMessage('pages.security.loginLogs.actions.reload', 'Reload')}
          >
            <Button
              aria-label={formatMessage(
                'pages.security.loginLogs.actions.reloadAria',
                'Reload login logs',
              )}
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
        fields={
          selectedDetail
            ? createDetailFields(
                selectedDetail,
                formatLoginType,
                formatLoginResult,
                formatMessage,
              )
            : []
        }
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={
          selectedDetail?.id ??
          formatMessage(
            'pages.security.loginLogs.detail.title',
            'Login Log Detail',
          )
        }
      />
    </PageContainer>
  );
}
