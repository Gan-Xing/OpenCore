import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { createAuditLogFixtures, type AuditLogSummary } from '@opencore/sdk';
import { Alert, Button, Space, Tag, Tooltip, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  getOpenCoreAuditLog,
  listOpenCoreAuditLogs,
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
  type DetailJsonSection,
} from '../shared/ReadOnlyDetailDrawer';

const fallbackRows = createAuditLogFixtures().items;
const searchFields: CurrentPageSearchField<AuditLogSummary>[] = [
  'actorUsername',
  'action',
  'resource',
  'resourceId',
  'method',
  'path',
  'requestId',
];
const exportColumns: CurrentPageExportColumn<AuditLogSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Time', dataIndex: 'createdAt' },
  { title: 'Actor', dataIndex: 'actorUsername' },
  { title: 'Action', dataIndex: 'action' },
  { title: 'Resource', dataIndex: 'resource' },
  { title: 'Resource ID', dataIndex: 'resourceId' },
  { title: 'Method', dataIndex: 'method' },
  { title: 'Path', dataIndex: 'path' },
  { title: 'Status Code', dataIndex: 'statusCode' },
  { title: 'Request ID', dataIndex: 'requestId' },
];

function createFilterOptions(
  rows: readonly AuditLogSummary[],
): CurrentPageFilterOption<AuditLogSummary>[] {
  return [
    {
      key: 'method',
      options: createCurrentPageFilterOptions(rows, 'method'),
      placeholder: 'Method',
      predicate: (record, value) => record.method === value,
    },
    {
      key: 'action',
      options: createCurrentPageFilterOptions(rows, 'action'),
      placeholder: 'Action',
      predicate: (record, value) => record.action === value,
    },
    {
      key: 'status',
      options: [
        { label: 'success', value: 'success' },
        { label: 'error', value: 'error' },
      ],
      placeholder: 'Status',
      predicate: (record, value) =>
        value === 'success'
          ? record.statusCode < 400
          : record.statusCode >= 400,
    },
  ];
}

function createDetailFields(record: AuditLogSummary): DetailField[] {
  return [
    { label: 'ID', value: record.id },
    { label: 'Time', value: record.createdAt },
    { label: 'Actor', value: record.actorUsername },
    { label: 'Action', value: record.action },
    { label: 'Resource', value: record.resource },
    { label: 'Resource ID', value: record.resourceId },
    { label: 'Method', value: record.method },
    { label: 'Path', value: record.path },
    { label: 'Status Code', value: record.statusCode },
    { label: 'IP', value: record.ip },
    { label: 'User Agent', value: record.userAgent },
    { label: 'Request ID', value: record.requestId },
  ];
}

function createDetailJsonSections(
  record: AuditLogSummary,
): DetailJsonSection[] {
  return [{ title: 'Metadata', value: record.metadata ?? {} }];
}

export default function OperationLogsPage() {
  const [rows, setRows] = useState<readonly AuditLogSummary[]>(fallbackRows);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<AuditLogSummary>();
  const filterOptions = useMemo(() => createFilterOptions(rows), [rows]);
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<AuditLogSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search operation logs',
      selectFilters: filterOptions,
    });

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      setRows(await listOpenCoreAuditLogs());
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows(fallbackRows);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load operation logs.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAuditLogs();
  }, []);

  const openDetail = async (record: AuditLogSummary) => {
    try {
      setSelectedDetail(await getOpenCoreAuditLog(record.id));
    } catch (_error) {
      setSelectedDetail(record);
    }
  };

  const columns: ProColumns<AuditLogSummary>[] = [
    { title: 'Time', dataIndex: 'createdAt', width: 192 },
    {
      title: 'Actor',
      dataIndex: 'actorUsername',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.actorUsername}
        </Typography.Link>
      ),
    },
    { title: 'Action', dataIndex: 'action', width: 132 },
    { title: 'Resource', dataIndex: 'resource', ellipsis: true },
    { title: 'Method', dataIndex: 'method', width: 96 },
    {
      title: 'Status',
      dataIndex: 'statusCode',
      width: 96,
      render: (_, record) => (
        <Tag color={record.statusCode < 400 ? 'green' : 'red'}>
          {record.statusCode}
        </Tag>
      ),
    },
    { title: 'Request ID', dataIndex: 'requestId', ellipsis: true },
    {
      title: 'Action',
      valueType: 'option',
      width: 88,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Detail">
            <Button
              aria-label={`View operation log ${record.id}`}
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
    <PageContainer title="Operation Logs" subTitle="S7 System">
      {loadError ? (
        <Alert
          message="Using fallback operation log fixtures"
          description={loadError}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <ProTable<AuditLogSummary>
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
            filename="opencore-operation-logs.csv"
            key="export"
            resource="core-audit-logs"
            rows={filteredRows}
          />,
          <Tooltip key="refresh" title="Reload">
            <Button
              aria-label="Reload operation logs"
              icon={<ReloadOutlined />}
              onClick={() => void loadAuditLogs()}
            />
          </Tooltip>,
        ]}
      />
      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
        jsonSections={
          selectedDetail ? createDetailJsonSections(selectedDetail) : []
        }
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={selectedDetail?.id ?? 'Operation Log Detail'}
      />
    </PageContainer>
  );
}
