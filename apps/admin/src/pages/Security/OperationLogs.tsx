import {
  ClearOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import type { AuditLogQueryRequest, AuditLogSummary } from '@opencore/sdk';
import {
  Alert,
  Button,
  Input,
  InputNumber,
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
  cleanOpenCoreAuditLogs,
  deleteOpenCoreAuditLogs,
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

type AuditLogStatus = NonNullable<AuditLogQueryRequest['status']>;

type AuditLogServerFilterDraft = {
  actorUsername: string;
  action: string;
  createdFrom: string;
  createdTo: string;
  location: string;
  maxDurationMs?: number;
  minDurationMs?: number;
  resource: string;
  status?: AuditLogStatus;
};

const emptyServerFilterDraft: AuditLogServerFilterDraft = {
  actorUsername: '',
  action: '',
  createdFrom: '',
  createdTo: '',
  location: '',
  resource: '',
};

const auditStatusOptions: { label: string; value: AuditLogStatus }[] = [
  { label: 'Success', value: 'success' },
  { label: 'Error', value: 'error' },
];

const searchFields: CurrentPageSearchField<AuditLogSummary>[] = [
  'actorUsername',
  'action',
  'resource',
  'resourceId',
  'method',
  'path',
  'location',
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
  { title: 'Duration ms', dataIndex: 'durationMs' },
  { title: 'Location', dataIndex: 'location' },
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
      key: 'location',
      options: createCurrentPageFilterOptions(rows, 'location'),
      placeholder: 'Location',
      predicate: (record, value) => record.location === value,
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
    { label: 'Location', value: record.location },
    { label: 'Duration ms', value: record.durationMs },
    { label: 'User Agent', value: record.userAgent },
    { label: 'Request ID', value: record.requestId },
  ];
}

function createDetailJsonSections(
  record: AuditLogSummary,
): DetailJsonSection[] {
  return [{ title: 'Metadata', value: record.metadata ?? {} }];
}

function createServerFilterQuery(
  draft: AuditLogServerFilterDraft,
): AuditLogQueryRequest {
  return {
    action: draft.action.trim() || undefined,
    actorUsername: draft.actorUsername.trim() || undefined,
    createdFrom: toIsoDateTime(draft.createdFrom),
    createdTo: toIsoDateTime(draft.createdTo),
    location: draft.location.trim() || undefined,
    maxDurationMs: draft.maxDurationMs,
    minDurationMs: draft.minDurationMs,
    resource: draft.resource.trim() || undefined,
    status: draft.status,
  };
}

function toIsoDateTime(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export default function OperationLogsPage() {
  const access = useAccess();
  const canDeleteAuditLogs = Boolean(access.canDeleteAuditLogs);
  const [rows, setRows] = useState<readonly AuditLogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<AuditLogSummary>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [cleaningLogs, setCleaningLogs] = useState(false);
  const [retentionDays, setRetentionDays] = useState(90);
  const [activeServerQuery, setActiveServerQuery] =
    useState<AuditLogQueryRequest>({});
  const [serverFilterDraft, setServerFilterDraft] =
    useState<AuditLogServerFilterDraft>({ ...emptyServerFilterDraft });
  const filterOptions = useMemo(() => createFilterOptions(rows), [rows]);
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<AuditLogSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search operation logs',
      selectFilters: filterOptions,
    });
  const selectedRows = useMemo(
    () => filteredRows.filter((record) => selectedRowKeys.includes(record.id)),
    [filteredRows, selectedRowKeys],
  );

  const loadAuditLogs = async (
    query: AuditLogQueryRequest = activeServerQuery,
  ) => {
    setLoading(true);
    try {
      setRows(await listOpenCoreAuditLogs(query));
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setSelectedRowKeys([]);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load operation logs.',
      );
    } finally {
      setLoading(false);
    }
  };

  const updateServerFilterDraft = <
    Field extends keyof AuditLogServerFilterDraft,
  >(
    field: Field,
    value: AuditLogServerFilterDraft[Field],
  ) => {
    setServerFilterDraft((previous) => ({ ...previous, [field]: value }));
  };

  const applyServerFilters = async () => {
    const query = createServerFilterQuery(serverFilterDraft);
    setActiveServerQuery(query);
    await loadAuditLogs(query);
  };

  const resetServerFilters = async () => {
    setServerFilterDraft({ ...emptyServerFilterDraft });
    setActiveServerQuery({});
    await loadAuditLogs({});
  };

  useEffect(() => {
    void loadAuditLogs({});
  }, []);

  const openDetail = async (record: AuditLogSummary) => {
    try {
      setSelectedDetail(await getOpenCoreAuditLog(record.id));
    } catch (_error) {
      setSelectedDetail(record);
    }
  };

  const confirmDeleteSelected = () => {
    Modal.confirm({
      title: `Delete ${selectedRows.length} selected operation logs?`,
      content: 'Selected operation log records will be permanently removed.',
      okButtonProps: { danger: true },
      okText: 'Delete selected',
      onOk: async () => {
        setDeletingSelected(true);
        try {
          const result = await deleteOpenCoreAuditLogs({
            ids: selectedRows.map((record) => record.id),
          });
          message.success(`Deleted ${result.affected} operation logs`);
          setSelectedRowKeys([]);
          await loadAuditLogs();
        } finally {
          setDeletingSelected(false);
        }
      },
    });
  };

  const confirmCleanExpired = () => {
    Modal.confirm({
      title: `Clean operation logs older than ${retentionDays} day(s)?`,
      content:
        'Recent operation logs and the cleanup audit record are retained.',
      okButtonProps: { danger: true },
      okText: 'Clean expired',
      onOk: async () => {
        setCleaningLogs(true);
        try {
          const result = await cleanOpenCoreAuditLogs({ retentionDays });
          message.success(
            `Cleaned ${result.affected} operation logs before ${result.cutoffBefore}`,
          );
          setSelectedRowKeys([]);
          await loadAuditLogs();
        } finally {
          setCleaningLogs(false);
        }
      },
    });
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
    { title: 'Location', dataIndex: 'location', width: 148 },
    {
      title: 'Duration',
      dataIndex: 'durationMs',
      width: 112,
      render: (_, record) => `${record.durationMs} ms`,
    },
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

  const serverFilterToolbar = (
    <Space key="server-filters" size="small" wrap>
      <Input
        aria-label="Operation actor server filter"
        onChange={(event) =>
          updateServerFilterDraft('actorUsername', event.target.value)
        }
        placeholder="Actor"
        style={{ width: 132 }}
        value={serverFilterDraft.actorUsername}
      />
      <Input
        aria-label="Operation action server filter"
        onChange={(event) =>
          updateServerFilterDraft('action', event.target.value)
        }
        placeholder="Action"
        style={{ width: 132 }}
        value={serverFilterDraft.action}
      />
      <Input
        aria-label="Operation resource server filter"
        onChange={(event) =>
          updateServerFilterDraft('resource', event.target.value)
        }
        placeholder="Resource"
        style={{ width: 164 }}
        value={serverFilterDraft.resource}
      />
      <Input
        aria-label="Operation location server filter"
        onChange={(event) =>
          updateServerFilterDraft('location', event.target.value)
        }
        placeholder="Location"
        style={{ width: 148 }}
        value={serverFilterDraft.location}
      />
      <Select
        aria-label="Operation status server filter"
        onChange={(value) =>
          updateServerFilterDraft(
            'status',
            value === 'all' ? undefined : (value as AuditLogStatus),
          )
        }
        options={[{ label: 'All', value: 'all' }, ...auditStatusOptions]}
        style={{ width: 132 }}
        value={
          serverFilterDraft.status === undefined
            ? 'all'
            : serverFilterDraft.status
        }
      />
      <InputNumber
        aria-label="Operation minimum duration server filter"
        addonAfter="ms"
        min={0}
        onChange={(value) =>
          updateServerFilterDraft(
            'minDurationMs',
            typeof value === 'number' ? value : undefined,
          )
        }
        placeholder="Min"
        precision={0}
        style={{ width: 116 }}
        value={serverFilterDraft.minDurationMs}
      />
      <InputNumber
        aria-label="Operation maximum duration server filter"
        addonAfter="ms"
        min={0}
        onChange={(value) =>
          updateServerFilterDraft(
            'maxDurationMs',
            typeof value === 'number' ? value : undefined,
          )
        }
        placeholder="Max"
        precision={0}
        style={{ width: 116 }}
        value={serverFilterDraft.maxDurationMs}
      />
      <Input
        aria-label="Operation created from server filter"
        onChange={(event) =>
          updateServerFilterDraft('createdFrom', event.target.value)
        }
        style={{ width: 180 }}
        type="datetime-local"
        value={serverFilterDraft.createdFrom}
      />
      <Input
        aria-label="Operation created to server filter"
        onChange={(event) =>
          updateServerFilterDraft('createdTo', event.target.value)
        }
        style={{ width: 180 }}
        type="datetime-local"
        value={serverFilterDraft.createdTo}
      />
      <Tooltip title="Apply server filters">
        <Button
          aria-label="Apply operation log server filters"
          icon={<SearchOutlined />}
          onClick={() => void applyServerFilters()}
        />
      </Tooltip>
      <Tooltip title="Reset server filters">
        <Button
          aria-label="Reset operation log server filters"
          icon={<ClearOutlined />}
          onClick={() => void resetServerFilters()}
        />
      </Tooltip>
    </Space>
  );

  return (
    <PageContainer title="Operation Logs" subTitle="S7 System">
      {loadError ? (
        <Alert
          message="Unable to load live operation logs"
          description={loadError}
          type="error"
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
          serverFilterToolbar,
          filterToolbar,
          <Typography.Text key="cleanup-policy" type="secondary">
            Retention policy
          </Typography.Text>,
          <InputNumber
            addonAfter="days"
            key="retention-days"
            max={3650}
            min={0}
            onChange={(value) => setRetentionDays(Number(value ?? 90))}
            precision={0}
            style={{ width: 132 }}
            value={retentionDays}
          />,
          <Tooltip
            key="delete-selected"
            title={
              canDeleteAuditLogs
                ? 'Delete selected operation logs'
                : 'Requires core:audit-log:delete'
            }
          >
            <Button
              danger
              disabled={!canDeleteAuditLogs || selectedRows.length === 0}
              icon={<DeleteOutlined />}
              loading={deletingSelected}
              onClick={confirmDeleteSelected}
            >
              Delete selected
            </Button>
          </Tooltip>,
          <Tooltip
            key="clean-expired"
            title={
              canDeleteAuditLogs
                ? 'Clean expired operation logs'
                : 'Requires core:audit-log:delete'
            }
          >
            <Button
              danger
              disabled={!canDeleteAuditLogs}
              icon={<ClearOutlined />}
              loading={cleaningLogs}
              onClick={confirmCleanExpired}
            >
              Clean expired
            </Button>
          </Tooltip>,
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
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
          getCheckboxProps: () => ({
            disabled: !canDeleteAuditLogs,
          }),
        }}
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
