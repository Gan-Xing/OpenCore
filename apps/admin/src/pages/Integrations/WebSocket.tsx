import {
  ApiOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import type {
  IntegrationDesignSummary,
  WebSocketRuntimeConnectionSummary,
  WebSocketRuntimeDiagnosticsSummary,
  WebSocketRuntimeEventSummary,
  WebSocketRuntimeSubscriptionSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getOpenCoreWebSocketDesign,
  getOpenCoreWebSocketRuntimeDiagnostics,
  openOpenCoreWebSocketRuntimeStream,
  publishOpenCoreWebSocketRuntimeEvent,
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
import { ReadOnlyDetailDrawer } from '../shared/ReadOnlyDetailDrawer';

const WEBSOCKET_READ_PERMISSION_MARKER = 'integration:websocket:read';
const DEFAULT_RUNTIME_ROOM = 'integration.diagnostics';
const DEFAULT_RUNTIME_EVENT = 'diagnostic.ping';

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const emptyDiagnostics: WebSocketRuntimeDiagnosticsSummary = {
  connections: [],
  events: [],
  subscriptions: [],
  summary: {
    activeConnections: 0,
    activeSubscriptions: 0,
    generatedAt: '',
    recentEvents: 0,
    totalConnections: 0,
  },
};

const designSearchFields: CurrentPageSearchField<IntegrationDesignSummary>[] = [
  'topic',
  'status',
  'documentPath',
  (record) => record.boundaries,
];

const connectionSearchFields: CurrentPageSearchField<WebSocketRuntimeConnectionSummary>[] =
  ['id', 'subjectId', 'status', (record) => record.rooms];

const subscriptionSearchFields: CurrentPageSearchField<WebSocketRuntimeSubscriptionSummary>[] =
  ['id', 'connectionId', 'room', 'status', (record) => record.eventTypes];

const eventSearchFields: CurrentPageSearchField<WebSocketRuntimeEventSummary>[] =
  ['id', 'room', 'type', 'status', 'traceId'];

function designStatusColor(status: IntegrationDesignSummary['status']): string {
  return status === 'design-only' ? 'gold' : 'blue';
}

function connectionStatusColor(
  status: WebSocketRuntimeConnectionSummary['status'],
): string {
  return status === 'connected' ? 'green' : 'default';
}

function deliveryStatusColor(
  status: WebSocketRuntimeEventSummary['status'],
): string {
  return status === 'delivered' ? 'green' : 'gold';
}

function createDesignExportColumns(
  formatMessage: FormatMessage,
): CurrentPageExportColumn<IntegrationDesignSummary>[] {
  return [
    {
      title: formatMessage('pages.integrations.design.fields.topic', 'Topic'),
      dataIndex: 'topic',
    },
    {
      title: formatMessage('pages.integrations.design.fields.status', 'Status'),
      dataIndex: 'status',
    },
    {
      title: formatMessage(
        'pages.integrations.design.fields.boundaries',
        'Boundaries',
      ),
      renderText: (record) => record.boundaries.join(', '),
    },
    {
      title: formatMessage(
        'pages.integrations.design.fields.document',
        'Document',
      ),
      dataIndex: 'documentPath',
    },
  ];
}

export default function WebSocketIntegrationPage() {
  const intl = useIntl();
  const streamRef = useRef<{ close: () => void } | undefined>(undefined);
  const [designRows, setDesignRows] = useState<
    readonly IntegrationDesignSummary[]
  >([]);
  const [diagnostics, setDiagnostics] =
    useState<WebSocketRuntimeDiagnosticsSummary>(emptyDiagnostics);
  const [selectedDesign, setSelectedDesign] =
    useState<IntegrationDesignSummary>();
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [streamOpen, setStreamOpen] = useState(false);
  const [streamChunk, setStreamChunk] = useState('');
  const [loadError, setLoadError] = useState<string>();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const designStatusLabels = useMemo<
    Record<IntegrationDesignSummary['status'], string>
  >(
    () => ({
      'design-only': formatMessage(
        'pages.integrations.design.status.designOnly',
        'design-only',
      ),
      'runtime-active': formatMessage(
        'pages.integrations.design.status.runtimeActive',
        'runtime-active',
      ),
    }),
    [formatMessage],
  );
  const connectionStatusLabels = useMemo<
    Record<WebSocketRuntimeConnectionSummary['status'], string>
  >(
    () => ({
      closed: formatMessage(
        'pages.integrations.websocket.connectionStatus.closed',
        'closed',
      ),
      connected: formatMessage(
        'pages.integrations.websocket.connectionStatus.connected',
        'connected',
      ),
    }),
    [formatMessage],
  );
  const subscriptionStatusLabels = useMemo<
    Record<WebSocketRuntimeSubscriptionSummary['status'], string>
  >(
    () => ({
      active: formatMessage(
        'pages.integrations.websocket.subscriptionStatus.active',
        'active',
      ),
      closed: formatMessage(
        'pages.integrations.websocket.subscriptionStatus.closed',
        'closed',
      ),
    }),
    [formatMessage],
  );
  const eventStatusLabels = useMemo<
    Record<WebSocketRuntimeEventSummary['status'], string>
  >(
    () => ({
      delivered: formatMessage(
        'pages.integrations.websocket.eventStatus.delivered',
        'delivered',
      ),
      no_subscribers: formatMessage(
        'pages.integrations.websocket.eventStatus.noSubscribers',
        'no subscribers',
      ),
    }),
    [formatMessage],
  );
  const designExportColumns = useMemo(
    () => createDesignExportColumns(formatMessage),
    [formatMessage],
  );

  const designFilterOptions: CurrentPageFilterOption<IntegrationDesignSummary>[] =
    useMemo(
      () => [
        {
          key: 'status',
          options: createCurrentPageFilterOptions(designRows, 'status'),
          placeholder: formatMessage(
            'pages.integrations.design.fields.status',
            'Status',
          ),
          predicate: (record, value) => record.status === value,
        },
      ],
      [designRows, formatMessage],
    );
  const { filteredRows, toolbar: designFilterToolbar } =
    useCurrentPageFilters<IntegrationDesignSummary>({
      rows: designRows,
      searchFields: designSearchFields,
      searchPlaceholder: formatMessage(
        'pages.integrations.websocket.search.designPlaceholder',
        'Search live WebSocket runtime',
      ),
      selectFilters: designFilterOptions,
    });
  const { filteredRows: filteredConnections, toolbar: connectionToolbar } =
    useCurrentPageFilters<WebSocketRuntimeConnectionSummary>({
      rows: diagnostics.connections,
      searchFields: connectionSearchFields,
      searchPlaceholder: formatMessage(
        'pages.integrations.websocket.search.connectionsPlaceholder',
        'Search runtime connections',
      ),
    });
  const { filteredRows: filteredSubscriptions, toolbar: subscriptionToolbar } =
    useCurrentPageFilters<WebSocketRuntimeSubscriptionSummary>({
      rows: diagnostics.subscriptions,
      searchFields: subscriptionSearchFields,
      searchPlaceholder: formatMessage(
        'pages.integrations.websocket.search.subscriptionsPlaceholder',
        'Search subscriptions',
      ),
    });
  const { filteredRows: filteredEvents, toolbar: eventToolbar } =
    useCurrentPageFilters<WebSocketRuntimeEventSummary>({
      rows: diagnostics.events,
      searchFields: eventSearchFields,
      searchPlaceholder: formatMessage(
        'pages.integrations.websocket.search.eventsPlaceholder',
        'Search runtime events',
      ),
    });

  const loadRuntime = useCallback(async () => {
    setLoading(true);
    try {
      const [design, nextDiagnostics] = await Promise.all([
        getOpenCoreWebSocketDesign(),
        getOpenCoreWebSocketRuntimeDiagnostics(),
      ]);
      setDesignRows([design]);
      setDiagnostics(nextDiagnostics);
      setLoadError(undefined);
    } catch (error: unknown) {
      setDesignRows([]);
      setDiagnostics(emptyDiagnostics);
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.websocket.load.failure',
              'Unable to load live WebSocket runtime diagnostics.',
            ),
      );
    } finally {
      setLoading(false);
    }
  }, [formatMessage]);

  useEffect(() => {
    void loadRuntime();
    return () => streamRef.current?.close();
  }, [loadRuntime]);

  const openDetail = async () => {
    setDetailLoading(true);
    try {
      const design = await getOpenCoreWebSocketDesign();
      setSelectedDesign(design);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.websocket.detail.loadFailure',
              'Unable to load WebSocket runtime detail.',
            ),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const openDiagnosticStream = () => {
    streamRef.current?.close();
    streamRef.current = openOpenCoreWebSocketRuntimeStream({
      onChunk: (chunk) => {
        setStreamChunk(chunk);
        void loadRuntime();
      },
      onError: (error) => {
        setStreamOpen(false);
        message.error(
          error instanceof Error
            ? error.message
            : formatMessage(
                'pages.integrations.websocket.messages.streamFailed',
                'WebSocket runtime stream failed.',
              ),
        );
      },
      onOpen: () => {
        setStreamOpen(true);
        void loadRuntime();
      },
    });
  };

  const closeDiagnosticStream = () => {
    streamRef.current?.close();
    streamRef.current = undefined;
    setStreamOpen(false);
    void loadRuntime();
  };

  const publishDiagnosticEvent = async () => {
    setPublishing(true);
    try {
      await publishOpenCoreWebSocketRuntimeEvent({
        payload: {
          source: 'admin',
          timestamp: new Date().toISOString(),
        },
        room: DEFAULT_RUNTIME_ROOM,
        traceId: `admin-${Date.now()}`,
        type: DEFAULT_RUNTIME_EVENT,
      });
      message.success(
        formatMessage(
          'pages.integrations.websocket.messages.published',
          'Diagnostic event published',
        ),
      );
      await loadRuntime();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.websocket.messages.publishFailure',
              'Unable to publish diagnostic event.',
            ),
      );
    } finally {
      setPublishing(false);
    }
  };

  const designColumns: ProColumns<IntegrationDesignSummary>[] = [
    {
      title: formatMessage('pages.integrations.design.fields.topic', 'Topic'),
      dataIndex: 'topic',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail()}>
          {record.topic}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.integrations.design.fields.status', 'Status'),
      render: (_, record) => (
        <Tag color={designStatusColor(record.status)}>
          {designStatusLabels[record.status]}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.integrations.design.fields.boundaries',
        'Boundaries',
      ),
      renderText: (_, record) => record.boundaries.join(', '),
    },
    {
      title: formatMessage(
        'pages.integrations.design.fields.document',
        'Document',
      ),
      dataIndex: 'documentPath',
    },
    {
      title: formatMessage(
        'pages.integrations.design.actions.column',
        'Action',
      ),
      valueType: 'option',
      render: () => (
        <Button
          icon={<EyeOutlined />}
          loading={detailLoading}
          onClick={() => void openDetail()}
          size="small"
          title={WEBSOCKET_READ_PERMISSION_MARKER}
          type="link"
        >
          {formatMessage('pages.integrations.design.actions.detail', 'Detail')}
        </Button>
      ),
    },
  ];

  const connectionColumns: ProColumns<WebSocketRuntimeConnectionSummary>[] = [
    {
      title: formatMessage(
        'pages.integrations.websocket.fields.connection',
        'Connection',
      ),
      dataIndex: 'id',
    },
    {
      title: formatMessage(
        'pages.integrations.websocket.fields.subject',
        'Subject',
      ),
      dataIndex: 'subjectId',
    },
    {
      title: formatMessage(
        'pages.integrations.websocket.fields.transport',
        'Transport',
      ),
      dataIndex: 'transport',
    },
    {
      title: formatMessage('pages.integrations.design.fields.status', 'Status'),
      render: (_, record) => (
        <Tag color={connectionStatusColor(record.status)}>
          {connectionStatusLabels[record.status]}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.integrations.websocket.fields.rooms',
        'Rooms',
      ),
      renderText: (_, record) => record.rooms.join(', '),
    },
    {
      title: formatMessage(
        'pages.integrations.websocket.fields.lastSeenAt',
        'Last Seen At',
      ),
      dataIndex: 'lastSeenAt',
    },
    {
      title: formatMessage(
        'pages.integrations.websocket.fields.closeReason',
        'Close Reason',
      ),
      dataIndex: 'closeReason',
    },
  ];

  const subscriptionColumns: ProColumns<WebSocketRuntimeSubscriptionSummary>[] =
    [
      {
        title: formatMessage(
          'pages.integrations.websocket.fields.subscription',
          'Subscription',
        ),
        dataIndex: 'id',
      },
      {
        title: formatMessage(
          'pages.integrations.websocket.fields.connection',
          'Connection',
        ),
        dataIndex: 'connectionId',
      },
      {
        title: formatMessage(
          'pages.integrations.websocket.fields.room',
          'Room',
        ),
        dataIndex: 'room',
      },
      {
        title: formatMessage(
          'pages.integrations.websocket.fields.eventTypes',
          'Event Types',
        ),
        renderText: (_, record) => record.eventTypes.join(', '),
      },
      {
        title: formatMessage(
          'pages.integrations.design.fields.status',
          'Status',
        ),
        render: (_, record) => (
          <Tag color={record.status === 'active' ? 'green' : 'default'}>
            {subscriptionStatusLabels[record.status]}
          </Tag>
        ),
      },
      {
        title: formatMessage(
          'pages.integrations.websocket.fields.subscribedAt',
          'Subscribed At',
        ),
        dataIndex: 'subscribedAt',
      },
    ];

  const eventColumns: ProColumns<WebSocketRuntimeEventSummary>[] = [
    {
      title: formatMessage(
        'pages.integrations.websocket.fields.event',
        'Event',
      ),
      dataIndex: 'id',
    },
    {
      title: formatMessage('pages.integrations.websocket.fields.room', 'Room'),
      dataIndex: 'room',
    },
    {
      title: formatMessage('pages.integrations.websocket.fields.type', 'Type'),
      dataIndex: 'type',
    },
    {
      title: formatMessage('pages.integrations.design.fields.status', 'Status'),
      render: (_, record) => (
        <Tag color={deliveryStatusColor(record.status)}>
          {eventStatusLabels[record.status]}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.integrations.websocket.fields.delivered',
        'Delivered',
      ),
      dataIndex: 'deliveredCount',
    },
    {
      title: formatMessage(
        'pages.integrations.websocket.fields.trace',
        'Trace',
      ),
      dataIndex: 'traceId',
    },
    {
      title: formatMessage(
        'pages.integrations.websocket.fields.createdAt',
        'Created At',
      ),
      dataIndex: 'createdAt',
    },
  ];

  return (
    <PageContainer
      title={formatMessage(
        'pages.integrations.websocket.title',
        'WebSocket Runtime',
      )}
      subTitle={formatMessage('pages.integrations.section', 'S12 Integrations')}
      extra={[
        <Tooltip
          key="reload"
          title={formatMessage(
            'pages.integrations.websocket.actions.reload',
            'Reload live WebSocket runtime',
          )}
        >
          <Button
            aria-label={formatMessage(
              'pages.integrations.websocket.actions.reloadAria',
              'Reload live WebSocket runtime',
            )}
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void loadRuntime()}
          />
        </Tooltip>,
      ]}
    >
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message={formatMessage(
            'pages.integrations.websocket.load.liveFailure',
            'Unable to load live WebSocket runtime diagnostics',
          )}
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.integrations.websocket.stats.activeConnections',
            'Active connections',
          )}
          value={diagnostics.summary.activeConnections}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.websocket.stats.activeSubscriptions',
            'Active subscriptions',
          )}
          value={diagnostics.summary.activeSubscriptions}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.websocket.stats.recentRuntimeEvents',
            'Recent runtime events',
          )}
          value={diagnostics.summary.recentEvents}
        />
        <Tag color="blue">{WEBSOCKET_READ_PERMISSION_MARKER}</Tag>
        <Tag color={streamOpen ? 'green' : 'default'}>
          {streamOpen
            ? formatMessage(
                'pages.integrations.websocket.stream.connected',
                'Runtime stream connected',
              )
            : formatMessage(
                'pages.integrations.websocket.stream.closed',
                'Runtime stream closed',
              )}
        </Tag>
      </Space>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button
          icon={<PlayCircleOutlined />}
          onClick={openDiagnosticStream}
          type="primary"
        >
          {formatMessage(
            'pages.integrations.websocket.actions.openDiagnosticStream',
            'Open diagnostic stream',
          )}
        </Button>
        <Button
          disabled={!streamOpen}
          icon={<StopOutlined />}
          onClick={closeDiagnosticStream}
        >
          {formatMessage(
            'pages.integrations.websocket.actions.closeStream',
            'Close stream',
          )}
        </Button>
        <Button
          icon={<ApiOutlined />}
          loading={publishing}
          onClick={() => void publishDiagnosticEvent()}
        >
          {formatMessage(
            'pages.integrations.websocket.actions.publishDiagnosticEvent',
            'Publish diagnostic event',
          )}
        </Button>
      </Space>
      {streamChunk ? (
        <Alert
          showIcon
          style={{ marginBottom: 16 }}
          type="success"
          message={formatMessage(
            'pages.integrations.websocket.stream.lastChunk',
            'Last runtime stream chunk',
          )}
          description={streamChunk.slice(0, 240)}
        />
      ) : null}
      <ProTable<WebSocketRuntimeConnectionSummary>
        rowKey="id"
        search={false}
        options={false}
        loading={loading}
        toolBarRender={() => [
          <Typography.Text key="runtime-policy" type="secondary">
            {formatMessage(
              'pages.integrations.websocket.policy.runtimeConnectionStatus',
              'Runtime connection status',
            )}
          </Typography.Text>,
          connectionToolbar,
        ]}
        pagination={false}
        dataSource={filteredConnections}
        columns={connectionColumns}
      />
      <ProTable<WebSocketRuntimeSubscriptionSummary>
        rowKey="id"
        search={false}
        options={false}
        loading={loading}
        toolBarRender={() => [
          <Typography.Text key="subscription-policy" type="secondary">
            {formatMessage(
              'pages.integrations.websocket.policy.subscriptionEventRouting',
              'Subscription event routing',
            )}
          </Typography.Text>,
          subscriptionToolbar,
        ]}
        pagination={false}
        dataSource={filteredSubscriptions}
        columns={subscriptionColumns}
      />
      <ProTable<WebSocketRuntimeEventSummary>
        rowKey="id"
        search={false}
        options={false}
        loading={loading}
        toolBarRender={() => [
          <Typography.Text key="event-policy" type="secondary">
            {formatMessage(
              'pages.integrations.websocket.policy.diagnosticRuntimeEvents',
              'Diagnostic runtime events',
            )}
          </Typography.Text>,
          eventToolbar,
        ]}
        pagination={false}
        dataSource={filteredEvents}
        columns={eventColumns}
      />
      <ProTable<IntegrationDesignSummary>
        rowKey="topic"
        search={false}
        options={false}
        loading={loading}
        toolBarRender={() => [
          <Typography.Text key="design-policy" type="secondary">
            {formatMessage(
              'pages.integrations.websocket.policy.runtimeBoundary',
              'Live WebSocket runtime boundary',
            )}
          </Typography.Text>,
          designFilterToolbar,
          <CurrentPageExportButton<IntegrationDesignSummary>
            key="export"
            columns={designExportColumns}
            resource="integration-websocket-runtime"
            rows={filteredRows}
          />,
        ]}
        pagination={false}
        dataSource={filteredRows}
        columns={designColumns}
      />
      <ReadOnlyDetailDrawer
        fields={[
          {
            label: formatMessage(
              'pages.integrations.design.fields.topic',
              'Topic',
            ),
            value: selectedDesign?.topic,
          },
          {
            label: formatMessage(
              'pages.integrations.design.fields.status',
              'Status',
            ),
            value: selectedDesign
              ? designStatusLabels[selectedDesign.status]
              : undefined,
          },
          {
            label: formatMessage(
              'pages.integrations.design.fields.boundaries',
              'Boundaries',
            ),
            value: selectedDesign?.boundaries.join(', '),
          },
          {
            label: formatMessage(
              'pages.integrations.design.fields.document',
              'Document',
            ),
            value: selectedDesign?.documentPath,
          },
        ]}
        jsonSections={[
          {
            title: formatMessage(
              'pages.integrations.websocket.detail.runtimeDiagnostics',
              'Runtime Diagnostics',
            ),
            value: diagnostics,
          },
        ]}
        onClose={() => setSelectedDesign(undefined)}
        open={Boolean(selectedDesign)}
        title={formatMessage(
          'pages.integrations.websocket.detail.title',
          'WebSocket Runtime Detail',
        )}
      />
    </PageContainer>
  );
}
