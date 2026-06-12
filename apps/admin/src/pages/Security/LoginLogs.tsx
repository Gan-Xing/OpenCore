import {
  ClearOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createLoginLogFixtures,
  type LoginLogQueryRequest,
  type LoginLogSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  getOpenCoreLoginLog,
  listOpenCoreLoginLogs,
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

const fallbackRows = createLoginLogFixtures().items;
const searchFields: CurrentPageSearchField<LoginLogSummary>[] = [
  'username',
  'ip',
  'browser',
  'os',
  'requestId',
  'failureReason',
];
const exportColumns: CurrentPageExportColumn<LoginLogSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Time', dataIndex: 'createdAt' },
  { title: 'Username', dataIndex: 'username' },
  { title: 'Success', dataIndex: 'success' },
  { title: 'Failure Reason', dataIndex: 'failureReason' },
  { title: 'IP', dataIndex: 'ip' },
  { title: 'User Agent', dataIndex: 'userAgent' },
  { title: 'Browser', dataIndex: 'browser' },
  { title: 'OS', dataIndex: 'os' },
  { title: 'Request ID', dataIndex: 'requestId' },
];

type LoginLogServerFilterDraft = {
  createdFrom: string;
  createdTo: string;
  ip: string;
  success?: boolean;
  username: string;
};

const emptyServerFilterDraft: LoginLogServerFilterDraft = {
  createdFrom: '',
  createdTo: '',
  ip: '',
  username: '',
};

function createFilterOptions(
  rows: readonly LoginLogSummary[],
): CurrentPageFilterOption<LoginLogSummary>[] {
  return [
    {
      key: 'success',
      options: [
        { label: 'success', value: 'true' },
        { label: 'failure', value: 'false' },
      ],
      placeholder: 'Result',
      predicate: (record, value) => record.success === (value === 'true'),
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
    { label: 'Result', value: record.success ? 'success' : 'failure' },
    { label: 'Failure Reason', value: record.failureReason },
    { label: 'IP', value: record.ip },
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
    createdFrom: toIsoDateTime(draft.createdFrom),
    createdTo: toIsoDateTime(draft.createdTo),
    ip: draft.ip.trim() || undefined,
    success: draft.success,
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

export default function LoginLogsPage() {
  const [rows, setRows] = useState<readonly LoginLogSummary[]>(fallbackRows);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<LoginLogSummary>();
  const [activeServerQuery, setActiveServerQuery] =
    useState<LoginLogQueryRequest>({});
  const [serverFilterDraft, setServerFilterDraft] =
    useState<LoginLogServerFilterDraft>({ ...emptyServerFilterDraft });
  const filterOptions = useMemo(() => createFilterOptions(rows), [rows]);
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<LoginLogSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search login logs',
      selectFilters: filterOptions,
    });

  const loadLoginLogs = async (
    query: LoginLogQueryRequest = activeServerQuery,
  ) => {
    setLoading(true);
    try {
      setRows(await listOpenCoreLoginLogs(query));
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows(fallbackRows);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load login logs.',
      );
    } finally {
      setLoading(false);
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
  }, []);

  const openDetail = async (record: LoginLogSummary) => {
    try {
      setSelectedDetail(await getOpenCoreLoginLog(record.id));
    } catch (_error) {
      setSelectedDetail(record);
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
      title: 'Result',
      dataIndex: 'success',
      width: 112,
      render: (_, record) => (
        <Tag color={record.success ? 'green' : 'red'}>
          {record.success ? 'success' : 'failure'}
        </Tag>
      ),
    },
    { title: 'IP', dataIndex: 'ip', width: 144 },
    { title: 'Browser', dataIndex: 'browser', width: 136 },
    { title: 'OS', dataIndex: 'os', width: 112 },
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
        aria-label="Login IP server filter"
        onChange={(event) => updateServerFilterDraft('ip', event.target.value)}
        placeholder="IP"
        style={{ width: 132 }}
        value={serverFilterDraft.ip}
      />
      <Select
        aria-label="Login result server filter"
        onChange={(value) =>
          updateServerFilterDraft(
            'success',
            value === 'all' ? undefined : value === 'true',
          )
        }
        options={[
          { label: 'All', value: 'all' },
          { label: 'Success', value: 'true' },
          { label: 'Failure', value: 'false' },
        ]}
        style={{ width: 116 }}
        value={
          serverFilterDraft.success === undefined
            ? 'all'
            : String(serverFilterDraft.success)
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
          message="Using fallback login log fixtures"
          description={loadError}
          type="warning"
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
            Read-only audit trail
          </Typography.Text>,
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
