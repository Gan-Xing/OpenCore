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
import { useAccess, useIntl } from '@umijs/max';
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

const searchFields: CurrentPageSearchField<AuditLogSummary>[] = [
  'tenantId',
  'actorUsername',
  'action',
  'resource',
  'resourceId',
  'method',
  'path',
  'location',
  'requestId',
];

type LocaleFormatter = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

type AuditStatusOption = { label: string; value: AuditLogStatus };

function createFilterOptions(
  rows: readonly AuditLogSummary[],
  auditStatusOptions: readonly AuditStatusOption[],
  formatMessage: LocaleFormatter,
): CurrentPageFilterOption<AuditLogSummary>[] {
  return [
    {
      key: 'method',
      options: createCurrentPageFilterOptions(rows, 'method'),
      placeholder: formatMessage(
        'pages.security.operationLogs.fields.method',
        'Method',
      ),
      predicate: (record, value) => record.method === value,
    },
    {
      key: 'action',
      options: createCurrentPageFilterOptions(rows, 'action'),
      placeholder: formatMessage(
        'pages.security.operationLogs.fields.action',
        'Action',
      ),
      predicate: (record, value) => record.action === value,
    },
    {
      key: 'location',
      options: createCurrentPageFilterOptions(rows, 'location'),
      placeholder: formatMessage(
        'pages.security.operationLogs.fields.location',
        'Location',
      ),
      predicate: (record, value) => record.location === value,
    },
    {
      key: 'status',
      options: auditStatusOptions,
      placeholder: formatMessage(
        'pages.security.operationLogs.fields.status',
        'Status',
      ),
      predicate: (record, value) =>
        value === 'success'
          ? record.statusCode < 400
          : record.statusCode >= 400,
    },
  ];
}

function createDetailFields(
  record: AuditLogSummary,
  formatMessage: LocaleFormatter,
): DetailField[] {
  return [
    { label: formatMessage('pages.security.operationLogs.fields.id', 'ID'), value: record.id },
    {
      label: formatMessage('pages.security.operationLogs.fields.tenantId', 'Tenant ID'),
      value: record.tenantId,
    },
    {
      label: formatMessage('pages.security.operationLogs.fields.time', 'Time'),
      value: record.createdAt,
    },
    {
      label: formatMessage('pages.security.operationLogs.fields.actor', 'Actor'),
      value: record.actorUsername,
    },
    {
      label: formatMessage('pages.security.operationLogs.fields.action', 'Action'),
      value: record.action,
    },
    {
      label: formatMessage(
        'pages.security.operationLogs.fields.resource',
        'Resource',
      ),
      value: record.resource,
    },
    {
      label: formatMessage(
        'pages.security.operationLogs.fields.resourceId',
        'Resource ID',
      ),
      value: record.resourceId,
    },
    {
      label: formatMessage('pages.security.operationLogs.fields.method', 'Method'),
      value: record.method,
    },
    {
      label: formatMessage('pages.security.operationLogs.fields.path', 'Path'),
      value: record.path,
    },
    {
      label: formatMessage(
        'pages.security.operationLogs.fields.statusCode',
        'Status Code',
      ),
      value: record.statusCode,
    },
    { label: formatMessage('pages.security.operationLogs.fields.ip', 'IP'), value: record.ip },
    {
      label: formatMessage(
        'pages.security.operationLogs.fields.location',
        'Location',
      ),
      value: record.location,
    },
    {
      label: formatMessage(
        'pages.security.operationLogs.fields.durationMs',
        'Duration ms',
      ),
      value: record.durationMs,
    },
    {
      label: formatMessage(
        'pages.security.operationLogs.fields.userAgent',
        'User Agent',
      ),
      value: record.userAgent,
    },
    {
      label: formatMessage(
        'pages.security.operationLogs.fields.requestId',
        'Request ID',
      ),
      value: record.requestId,
    },
  ];
}

function createDetailJsonSections(
  record: AuditLogSummary,
  formatMessage: LocaleFormatter,
): DetailJsonSection[] {
  return [
    {
      title: formatMessage('pages.security.operationLogs.fields.metadata', 'Metadata'),
      value: record.metadata ?? {},
    },
  ];
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
  const intl = useIntl();
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
  const formatMessage = (
    id: string,
    defaultMessage: string,
    values?: Record<string, number | string>,
  ) =>
    values
      ? intl.formatMessage({ id, defaultMessage }, values)
      : intl.formatMessage({ id, defaultMessage });
  const auditStatusOptions: AuditStatusOption[] = [
    {
      label: formatMessage('pages.security.operationLogs.status.success', 'Success'),
      value: 'success',
    },
    {
      label: formatMessage('pages.security.operationLogs.status.error', 'Error'),
      value: 'error',
    },
  ];
  const allOptionLabel = formatMessage('pages.security.common.all', 'All');
  const exportColumns: CurrentPageExportColumn<AuditLogSummary>[] = [
    { title: formatMessage('pages.security.operationLogs.fields.id', 'ID'), dataIndex: 'id' },
    {
      title: formatMessage('pages.security.operationLogs.fields.tenantId', 'Tenant ID'),
      dataIndex: 'tenantId',
    },
    {
      title: formatMessage('pages.security.operationLogs.fields.time', 'Time'),
      dataIndex: 'createdAt',
    },
    {
      title: formatMessage('pages.security.operationLogs.fields.actor', 'Actor'),
      dataIndex: 'actorUsername',
    },
    {
      title: formatMessage('pages.security.operationLogs.fields.action', 'Action'),
      dataIndex: 'action',
    },
    {
      title: formatMessage(
        'pages.security.operationLogs.fields.resource',
        'Resource',
      ),
      dataIndex: 'resource',
    },
    {
      title: formatMessage(
        'pages.security.operationLogs.fields.resourceId',
        'Resource ID',
      ),
      dataIndex: 'resourceId',
    },
    {
      title: formatMessage('pages.security.operationLogs.fields.method', 'Method'),
      dataIndex: 'method',
    },
    {
      title: formatMessage('pages.security.operationLogs.fields.path', 'Path'),
      dataIndex: 'path',
    },
    {
      title: formatMessage(
        'pages.security.operationLogs.fields.statusCode',
        'Status Code',
      ),
      dataIndex: 'statusCode',
    },
    {
      title: formatMessage(
        'pages.security.operationLogs.fields.durationMs',
        'Duration ms',
      ),
      dataIndex: 'durationMs',
    },
    {
      title: formatMessage(
        'pages.security.operationLogs.fields.location',
        'Location',
      ),
      dataIndex: 'location',
    },
    {
      title: formatMessage(
        'pages.security.operationLogs.fields.requestId',
        'Request ID',
      ),
      dataIndex: 'requestId',
    },
  ];
  const filterOptions = createFilterOptions(
    rows,
    auditStatusOptions,
    formatMessage,
  );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<AuditLogSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.security.operationLogs.search.placeholder',
        'Search operation logs',
      ),
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
          : formatMessage(
              'pages.security.operationLogs.load.failure',
              'Unable to load operation logs.',
            ),
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
      title: formatMessage(
        'pages.security.operationLogs.confirm.deleteSelected',
        'Delete {count} selected operation logs?',
        { count: selectedRows.length },
      ),
      content: formatMessage(
        'pages.security.operationLogs.confirm.deleteSelectedContent',
        'Selected operation log records will be permanently removed.',
      ),
      okButtonProps: { danger: true },
      okText: formatMessage(
        'pages.security.operationLogs.actions.deleteSelected',
        'Delete selected',
      ),
      onOk: async () => {
        setDeletingSelected(true);
        try {
          const result = await deleteOpenCoreAuditLogs({
            ids: selectedRows.map((record) => record.id),
          });
          message.success(
            formatMessage(
              'pages.security.operationLogs.messages.deleted',
              'Deleted {count} operation logs',
              { count: result.affected },
            ),
          );
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
      title: formatMessage(
        'pages.security.operationLogs.confirm.cleanExpired',
        'Clean operation logs older than {days} day(s)?',
        { days: retentionDays },
      ),
      content: formatMessage(
        'pages.security.operationLogs.confirm.cleanExpiredContent',
        'Recent operation logs and the cleanup audit record are retained.',
      ),
      okButtonProps: { danger: true },
      okText: formatMessage(
        'pages.security.operationLogs.actions.cleanExpired',
        'Clean expired',
      ),
      onOk: async () => {
        setCleaningLogs(true);
        try {
          const result = await cleanOpenCoreAuditLogs({ retentionDays });
          message.success(
            formatMessage(
              'pages.security.operationLogs.messages.cleaned',
              'Cleaned {count} operation logs before {cutoff}',
              { count: result.affected, cutoff: result.cutoffBefore },
            ),
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
    {
      title: formatMessage('pages.security.operationLogs.fields.time', 'Time'),
      dataIndex: 'createdAt',
      width: 192,
    },
    {
      title: formatMessage('pages.security.operationLogs.fields.actor', 'Actor'),
      dataIndex: 'actorUsername',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.actorUsername}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.security.operationLogs.fields.tenantId', 'Tenant ID'),
      dataIndex: 'tenantId',
      width: 152,
      ellipsis: true,
    },
    {
      title: formatMessage('pages.security.operationLogs.fields.action', 'Action'),
      dataIndex: 'action',
      width: 132,
    },
    {
      title: formatMessage(
        'pages.security.operationLogs.fields.resource',
        'Resource',
      ),
      dataIndex: 'resource',
      ellipsis: true,
    },
    {
      title: formatMessage('pages.security.operationLogs.fields.method', 'Method'),
      dataIndex: 'method',
      width: 96,
    },
    {
      title: formatMessage(
        'pages.security.operationLogs.fields.location',
        'Location',
      ),
      dataIndex: 'location',
      width: 148,
    },
    {
      title: formatMessage(
        'pages.security.operationLogs.fields.duration',
        'Duration',
      ),
      dataIndex: 'durationMs',
      width: 112,
      render: (_, record) =>
        formatMessage('pages.security.operationLogs.duration.ms', '{value} ms', {
          value: record.durationMs,
        }),
    },
    {
      title: formatMessage('pages.security.operationLogs.fields.status', 'Status'),
      dataIndex: 'statusCode',
      width: 96,
      render: (_, record) => (
        <Tag color={record.statusCode < 400 ? 'green' : 'red'}>
          {record.statusCode}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.security.operationLogs.fields.requestId',
        'Request ID',
      ),
      dataIndex: 'requestId',
      ellipsis: true,
    },
    {
      title: formatMessage(
        'pages.security.operationLogs.actions.column',
        'Action',
      ),
      valueType: 'option',
      width: 88,
      render: (_, record) => (
        <Space size="small">
          <Tooltip
            title={formatMessage(
              'pages.security.operationLogs.actions.detail',
              'Detail',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.security.operationLogs.actions.viewAria',
                'View operation log {id}',
                { id: record.id },
              )}
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
        aria-label={formatMessage(
          'pages.security.operationLogs.serverFilters.actorAria',
          'Operation actor server filter',
        )}
        onChange={(event) =>
          updateServerFilterDraft('actorUsername', event.target.value)
        }
        placeholder={formatMessage(
          'pages.security.operationLogs.fields.actor',
          'Actor',
        )}
        style={{ width: 132 }}
        value={serverFilterDraft.actorUsername}
      />
      <Input
        aria-label={formatMessage(
          'pages.security.operationLogs.serverFilters.actionAria',
          'Operation action server filter',
        )}
        onChange={(event) =>
          updateServerFilterDraft('action', event.target.value)
        }
        placeholder={formatMessage(
          'pages.security.operationLogs.fields.action',
          'Action',
        )}
        style={{ width: 132 }}
        value={serverFilterDraft.action}
      />
      <Input
        aria-label={formatMessage(
          'pages.security.operationLogs.serverFilters.resourceAria',
          'Operation resource server filter',
        )}
        onChange={(event) =>
          updateServerFilterDraft('resource', event.target.value)
        }
        placeholder={formatMessage(
          'pages.security.operationLogs.fields.resource',
          'Resource',
        )}
        style={{ width: 164 }}
        value={serverFilterDraft.resource}
      />
      <Input
        aria-label={formatMessage(
          'pages.security.operationLogs.serverFilters.locationAria',
          'Operation location server filter',
        )}
        onChange={(event) =>
          updateServerFilterDraft('location', event.target.value)
        }
        placeholder={formatMessage(
          'pages.security.operationLogs.fields.location',
          'Location',
        )}
        style={{ width: 148 }}
        value={serverFilterDraft.location}
      />
      <Select
        aria-label={formatMessage(
          'pages.security.operationLogs.serverFilters.statusAria',
          'Operation status server filter',
        )}
        onChange={(value) =>
          updateServerFilterDraft(
            'status',
            value === 'all' ? undefined : (value as AuditLogStatus),
          )
        }
        options={[{ label: allOptionLabel, value: 'all' }, ...auditStatusOptions]}
        style={{ width: 132 }}
        value={
          serverFilterDraft.status === undefined
            ? 'all'
            : serverFilterDraft.status
        }
      />
      <InputNumber
        aria-label={formatMessage(
          'pages.security.operationLogs.serverFilters.minDurationAria',
          'Operation minimum duration server filter',
        )}
        addonAfter={formatMessage('pages.security.operationLogs.units.ms', 'ms')}
        min={0}
        onChange={(value) =>
          updateServerFilterDraft(
            'minDurationMs',
            typeof value === 'number' ? value : undefined,
          )
        }
        placeholder={formatMessage(
          'pages.security.operationLogs.filters.min',
          'Min',
        )}
        precision={0}
        style={{ width: 116 }}
        value={serverFilterDraft.minDurationMs}
      />
      <InputNumber
        aria-label={formatMessage(
          'pages.security.operationLogs.serverFilters.maxDurationAria',
          'Operation maximum duration server filter',
        )}
        addonAfter={formatMessage('pages.security.operationLogs.units.ms', 'ms')}
        min={0}
        onChange={(value) =>
          updateServerFilterDraft(
            'maxDurationMs',
            typeof value === 'number' ? value : undefined,
          )
        }
        placeholder={formatMessage(
          'pages.security.operationLogs.filters.max',
          'Max',
        )}
        precision={0}
        style={{ width: 116 }}
        value={serverFilterDraft.maxDurationMs}
      />
      <Input
        aria-label={formatMessage(
          'pages.security.operationLogs.serverFilters.createdFromAria',
          'Operation created from server filter',
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
          'pages.security.operationLogs.serverFilters.createdToAria',
          'Operation created to server filter',
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
          'pages.security.operationLogs.actions.applyServerFilters',
          'Apply server filters',
        )}
      >
        <Button
          aria-label={formatMessage(
            'pages.security.operationLogs.actions.applyServerFiltersAria',
            'Apply operation log server filters',
          )}
          icon={<SearchOutlined />}
          onClick={() => void applyServerFilters()}
        />
      </Tooltip>
      <Tooltip
        title={formatMessage(
          'pages.security.operationLogs.actions.resetServerFilters',
          'Reset server filters',
        )}
      >
        <Button
          aria-label={formatMessage(
            'pages.security.operationLogs.actions.resetServerFiltersAria',
            'Reset operation log server filters',
          )}
          icon={<ClearOutlined />}
          onClick={() => void resetServerFilters()}
        />
      </Tooltip>
    </Space>
  );

  return (
    <PageContainer
      title={formatMessage(
        'pages.security.operationLogs.title',
        'Operation Logs',
      )}
      subTitle={formatMessage('pages.system.section', 'S7 System')}
    >
      {loadError ? (
        <Alert
          message={formatMessage(
            'pages.security.operationLogs.load.liveFailure',
            'Unable to load live operation logs',
          )}
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
            {formatMessage(
              'pages.security.operationLogs.policy.retention',
              'Retention policy',
            )}
          </Typography.Text>,
          <InputNumber
            addonAfter={formatMessage(
              'pages.security.operationLogs.units.days',
              'days',
            )}
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
                ? formatMessage(
                    'pages.security.operationLogs.actions.deleteSelectedLogs',
                    'Delete selected operation logs',
                  )
                : formatMessage(
                    'pages.security.operationLogs.permission.deleteRequired',
                    'Requires core:audit-log:delete',
                  )
            }
          >
            <Button
              danger
              disabled={!canDeleteAuditLogs || selectedRows.length === 0}
              icon={<DeleteOutlined />}
              loading={deletingSelected}
              onClick={confirmDeleteSelected}
            >
              {formatMessage(
                'pages.security.operationLogs.actions.deleteSelected',
                'Delete selected',
              )}
            </Button>
          </Tooltip>,
          <Tooltip
            key="clean-expired"
            title={
              canDeleteAuditLogs
                ? formatMessage(
                    'pages.security.operationLogs.actions.cleanExpiredLogs',
                    'Clean expired operation logs',
                  )
                : formatMessage(
                    'pages.security.operationLogs.permission.deleteRequired',
                    'Requires core:audit-log:delete',
                  )
            }
          >
            <Button
              danger
              disabled={!canDeleteAuditLogs}
              icon={<ClearOutlined />}
              loading={cleaningLogs}
              onClick={confirmCleanExpired}
            >
              {formatMessage(
                'pages.security.operationLogs.actions.cleanExpired',
                'Clean expired',
              )}
            </Button>
          </Tooltip>,
          <CurrentPageExportButton
            columns={exportColumns}
            filename="opencore-operation-logs.csv"
            key="export"
            resource="core-audit-logs"
            rows={filteredRows}
          />,
          <Tooltip
            key="refresh"
            title={formatMessage(
              'pages.security.operationLogs.actions.reload',
              'Reload',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.security.operationLogs.actions.reloadAria',
                'Reload operation logs',
              )}
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
        fields={
          selectedDetail ? createDetailFields(selectedDetail, formatMessage) : []
        }
        jsonSections={
          selectedDetail
            ? createDetailJsonSections(selectedDetail, formatMessage)
            : []
        }
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={
          selectedDetail?.id ??
          formatMessage(
            'pages.security.operationLogs.detail.title',
            'Operation Log Detail',
          )
        }
      />
    </PageContainer>
  );
}
