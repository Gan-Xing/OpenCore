import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { createLoginLogFixtures, type LoginLogSummary } from '@opencore/sdk';
import { Alert, Button, Space, Tag, Tooltip, Typography } from 'antd';
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
  { title: 'Request ID', dataIndex: 'requestId' },
];

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
    { label: 'Request ID', value: record.requestId },
  ];
}

export default function LoginLogsPage() {
  const [rows, setRows] = useState<readonly LoginLogSummary[]>(fallbackRows);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<LoginLogSummary>();
  const filterOptions = useMemo(() => createFilterOptions(rows), [rows]);
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<LoginLogSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search login logs',
      selectFilters: filterOptions,
    });

  const loadLoginLogs = async () => {
    setLoading(true);
    try {
      setRows(await listOpenCoreLoginLogs());
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

  useEffect(() => {
    void loadLoginLogs();
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
