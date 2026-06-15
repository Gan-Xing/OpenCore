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

const designExportColumns: CurrentPageExportColumn<IntegrationDesignSummary>[] =
  [
    { title: 'Topic', dataIndex: 'topic' },
    { title: 'Status', dataIndex: 'status' },
    {
      title: 'Boundaries',
      renderText: (record) => record.boundaries.join(', '),
    },
    { title: 'Document', dataIndex: 'documentPath' },
  ];

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

export default function WebSocketIntegrationPage() {
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

  const designFilterOptions: CurrentPageFilterOption<IntegrationDesignSummary>[] =
    useMemo(
      () => [
        {
          key: 'status',
          options: createCurrentPageFilterOptions(designRows, 'status'),
          placeholder: 'Status',
          predicate: (record, value) => record.status === value,
        },
      ],
      [designRows],
    );
  const { filteredRows, toolbar: designFilterToolbar } =
    useCurrentPageFilters<IntegrationDesignSummary>({
      rows: designRows,
      searchFields: designSearchFields,
      searchPlaceholder: 'Search live WebSocket runtime',
      selectFilters: designFilterOptions,
    });
  const { filteredRows: filteredConnections, toolbar: connectionToolbar } =
    useCurrentPageFilters<WebSocketRuntimeConnectionSummary>({
      rows: diagnostics.connections,
      searchFields: connectionSearchFields,
      searchPlaceholder: 'Search runtime connections',
    });
  const { filteredRows: filteredSubscriptions, toolbar: subscriptionToolbar } =
    useCurrentPageFilters<WebSocketRuntimeSubscriptionSummary>({
      rows: diagnostics.subscriptions,
      searchFields: subscriptionSearchFields,
      searchPlaceholder: 'Search subscriptions',
    });
  const { filteredRows: filteredEvents, toolbar: eventToolbar } =
    useCurrentPageFilters<WebSocketRuntimeEventSummary>({
      rows: diagnostics.events,
      searchFields: eventSearchFields,
      searchPlaceholder: 'Search runtime events',
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
          : 'Unable to load live WebSocket runtime diagnostics.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

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
          : 'Unable to load WebSocket runtime detail.',
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
            : 'WebSocket runtime stream failed.',
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
      message.success('Diagnostic event published');
      await loadRuntime();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : 'Unable to publish diagnostic event.',
      );
    } finally {
      setPublishing(false);
    }
  };

  const designColumns: ProColumns<IntegrationDesignSummary>[] = [
    {
      title: 'Topic',
      dataIndex: 'topic',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail()}>
          {record.topic}
        </Typography.Link>
      ),
    },
    {
      title: 'Status',
      render: (_, record) => (
        <Tag color={designStatusColor(record.status)}>{record.status}</Tag>
      ),
    },
    {
      title: 'Boundaries',
      renderText: (_, record) => record.boundaries.join(', '),
    },
    { title: 'Document', dataIndex: 'documentPath' },
    {
      title: 'Action',
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
          Detail
        </Button>
      ),
    },
  ];

  const connectionColumns: ProColumns<WebSocketRuntimeConnectionSummary>[] = [
    { title: 'Connection', dataIndex: 'id' },
    { title: 'Subject', dataIndex: 'subjectId' },
    { title: 'Transport', dataIndex: 'transport' },
    {
      title: 'Status',
      render: (_, record) => (
        <Tag color={connectionStatusColor(record.status)}>{record.status}</Tag>
      ),
    },
    { title: 'Rooms', renderText: (_, record) => record.rooms.join(', ') },
    { title: 'Last Seen At', dataIndex: 'lastSeenAt' },
    { title: 'Close Reason', dataIndex: 'closeReason' },
  ];

  const subscriptionColumns: ProColumns<WebSocketRuntimeSubscriptionSummary>[] =
    [
      { title: 'Subscription', dataIndex: 'id' },
      { title: 'Connection', dataIndex: 'connectionId' },
      { title: 'Room', dataIndex: 'room' },
      {
        title: 'Event Types',
        renderText: (_, record) => record.eventTypes.join(', '),
      },
      { title: 'Status', dataIndex: 'status' },
      { title: 'Subscribed At', dataIndex: 'subscribedAt' },
    ];

  const eventColumns: ProColumns<WebSocketRuntimeEventSummary>[] = [
    { title: 'Event', dataIndex: 'id' },
    { title: 'Room', dataIndex: 'room' },
    { title: 'Type', dataIndex: 'type' },
    {
      title: 'Status',
      render: (_, record) => (
        <Tag color={deliveryStatusColor(record.status)}>{record.status}</Tag>
      ),
    },
    { title: 'Delivered', dataIndex: 'deliveredCount' },
    { title: 'Trace', dataIndex: 'traceId' },
    { title: 'Created At', dataIndex: 'createdAt' },
  ];

  return (
    <PageContainer
      title="WebSocket Runtime"
      subTitle="S12 Integrations"
      extra={[
        <Tooltip key="reload" title="Reload live WebSocket runtime">
          <Button
            aria-label="Reload live WebSocket runtime"
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
          message="Unable to load live WebSocket runtime diagnostics"
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title="Active connections"
          value={diagnostics.summary.activeConnections}
        />
        <Statistic
          title="Active subscriptions"
          value={diagnostics.summary.activeSubscriptions}
        />
        <Statistic
          title="Recent runtime events"
          value={diagnostics.summary.recentEvents}
        />
        <Tag color="blue">{WEBSOCKET_READ_PERMISSION_MARKER}</Tag>
        <Tag color={streamOpen ? 'green' : 'default'}>
          {streamOpen ? 'Runtime stream connected' : 'Runtime stream closed'}
        </Tag>
      </Space>
      <Space style={{ marginBottom: 16 }} wrap>
        <Button
          icon={<PlayCircleOutlined />}
          onClick={openDiagnosticStream}
          type="primary"
        >
          Open diagnostic stream
        </Button>
        <Button
          disabled={!streamOpen}
          icon={<StopOutlined />}
          onClick={closeDiagnosticStream}
        >
          Close stream
        </Button>
        <Button
          icon={<ApiOutlined />}
          loading={publishing}
          onClick={() => void publishDiagnosticEvent()}
        >
          Publish diagnostic event
        </Button>
      </Space>
      {streamChunk ? (
        <Alert
          showIcon
          style={{ marginBottom: 16 }}
          type="success"
          message="Last runtime stream chunk"
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
            Runtime connection status
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
            Subscription event routing
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
            Diagnostic runtime events
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
            Live WebSocket runtime boundary
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
          { label: 'Topic', value: selectedDesign?.topic },
          { label: 'Status', value: selectedDesign?.status },
          { label: 'Boundaries', value: selectedDesign?.boundaries.join(', ') },
          { label: 'Document', value: selectedDesign?.documentPath },
        ]}
        jsonSections={[
          {
            title: 'Runtime Diagnostics',
            value: diagnostics,
          },
        ]}
        onClose={() => setSelectedDesign(undefined)}
        open={Boolean(selectedDesign)}
        title="WebSocket Runtime Detail"
      />
    </PageContainer>
  );
}
