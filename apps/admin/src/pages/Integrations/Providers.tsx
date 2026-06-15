import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import type {
  IntegrationProviderAuditLogSummary,
  IntegrationProviderDiagnosticsSummary,
  IntegrationProviderHealthAuditSummary,
  IntegrationProviderSummary,
  IntegrationProviderTestResult,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  disableOpenCoreIntegrationProvider,
  enableOpenCoreIntegrationProvider,
  getOpenCoreIntegrationProviderDiagnostics,
  getOpenCoreIntegrationProviderHealthAudit,
  listOpenCoreIntegrationProviderAuditLogs,
  testOpenCoreIntegrationProvider,
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

const emptyHealthAudit: IntegrationProviderHealthAuditSummary = {
  actions: [],
  generatedAt: '',
  providers: [],
  totals: {
    attention: 0,
    blocked: 0,
    configVaultBacked: 0,
    configVaultMissing: 0,
    failed: 0,
    queued: 0,
    ready: 0,
    retryableFailed: 0,
    total: 0,
    unchecked: 0,
    unsupported: 0,
  },
};

const signedCallbackContract = {
  algorithm: 'HMAC-SHA256',
  mailPath: '/api/integrations/mail/outbox/callback',
  smsPath: '/api/integrations/sms/outbox/callback',
  canonicalPayload: 'channel\\nproviderCode\\nmessageId\\nstatus\\nerror',
};
const exportColumns: CurrentPageExportColumn<IntegrationProviderSummary>[] = [
  { title: 'Code', dataIndex: 'code' },
  { title: 'Type', dataIndex: 'type' },
  { title: 'Name', dataIndex: 'name' },
  { title: 'Enabled', dataIndex: 'enabled' },
  { title: 'Config Version', dataIndex: 'configVersion' },
  { title: 'Secret Ref Validation', dataIndex: 'secretRefStatus' },
  { title: 'Last Provider Test', dataIndex: 'lastTestStatus' },
  { title: 'Health', dataIndex: 'healthStatus' },
  { title: 'Last Checked At', dataIndex: 'lastCheckedAt' },
  { title: 'Last Tested At', dataIndex: 'lastTestedAt' },
  { title: 'Secret Ref', dataIndex: 'secretRef', sensitive: true },
  { title: 'Config', dataIndex: 'config', sensitive: true },
];
const searchFields: CurrentPageSearchField<IntegrationProviderSummary>[] = [
  'code',
  'type',
  'name',
  'healthStatus',
];

export default function ProvidersPage() {
  const access = useAccess();
  const canManageIntegrationProviders = Boolean(
    access.canManageIntegrationProviders,
  );
  const canUpdateIntegrationProviders = Boolean(
    access.canUpdateIntegrationProviders,
  );
  const [healthAudit, setHealthAudit] =
    useState<IntegrationProviderHealthAuditSummary>(emptyHealthAudit);
  const [selected, setSelected] = useState<IntegrationProviderSummary>();
  const [selectedDiagnostics, setSelectedDiagnostics] =
    useState<IntegrationProviderDiagnosticsSummary>();
  const [selectedAuditLogs, setSelectedAuditLogs] = useState<
    readonly IntegrationProviderAuditLogSummary[]
  >([]);
  const [selectedTestResult, setSelectedTestResult] =
    useState<IntegrationProviderTestResult>();
  const [detailLoadingCode, setDetailLoadingCode] = useState<string>();
  const [providerTestingCode, setProviderTestingCode] = useState<string>();
  const [providerMutatingCode, setProviderMutatingCode] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const rows = useMemo(
    () => healthAudit.providers.map((item) => item.provider),
    [healthAudit],
  );
  const diagnosticsByCode = useMemo(
    () =>
      new Map(healthAudit.providers.map((item) => [item.provider.code, item])),
    [healthAudit],
  );
  const designTopicCount = useMemo(
    () =>
      healthAudit.providers.filter((item) =>
        ['wechat', 'websocket'].includes(item.provider.type),
      ).length,
    [healthAudit],
  );
  const filterOptions: CurrentPageFilterOption<IntegrationProviderSummary>[] =
    useMemo(
      () => [
        {
          key: 'type',
          options: createCurrentPageFilterOptions(rows, 'type'),
          placeholder: 'Type',
          predicate: (record, value) => record.type === value,
        },
        {
          key: 'enabled',
          options: [
            { label: 'enabled', value: 'true' },
            { label: 'disabled', value: 'false' },
          ],
          placeholder: 'Enabled',
          predicate: (record, value) => record.enabled === (value === 'true'),
        },
        {
          key: 'healthStatus',
          options: createCurrentPageFilterOptions(rows, 'healthStatus'),
          placeholder: 'Health',
          predicate: (record, value) => record.healthStatus === value,
        },
        {
          key: 'secretRefStatus',
          options: createCurrentPageFilterOptions(rows, 'secretRefStatus'),
          placeholder: 'Secret Ref',
          predicate: (record, value) => record.secretRefStatus === value,
        },
      ],
      [rows],
    );
  const selectedSmtpTlsPolicy =
    selected?.type === 'mail'
      ? String(selected.config.tlsMode ?? 'not configured')
      : undefined;
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<IntegrationProviderSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search providers',
      selectFilters: filterOptions,
    });

  const loadHealthAudit = useCallback(async () => {
    setLoading(true);
    try {
      const nextAudit = await getOpenCoreIntegrationProviderHealthAudit();

      setHealthAudit(nextAudit);
      setLoadError(undefined);
    } catch (error: unknown) {
      setHealthAudit(emptyHealthAudit);
      setSelected(undefined);
      setSelectedDiagnostics(undefined);
      setSelectedAuditLogs([]);
      setSelectedTestResult(undefined);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load integration health audit.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealthAudit();
  }, [loadHealthAudit]);

  const openDetail = async (code: string) => {
    setDetailLoadingCode(code);
    try {
      const [diagnostics, auditLogs] = await Promise.all([
        getOpenCoreIntegrationProviderDiagnostics(code),
        listOpenCoreIntegrationProviderAuditLogs(code),
      ]);
      setSelected(diagnostics.provider);
      setSelectedDiagnostics(diagnostics);
      setSelectedAuditLogs(auditLogs);
      setSelectedTestResult(undefined);
    } catch (error: unknown) {
      setSelected(undefined);
      setSelectedDiagnostics(undefined);
      setSelectedAuditLogs([]);
      setSelectedTestResult(undefined);
      message.error(
        error instanceof Error
          ? error.message
          : 'Unable to load live provider diagnostics.',
      );
    } finally {
      setDetailLoadingCode(undefined);
    }
  };

  const testProvider = async (code: string) => {
    setProviderTestingCode(code);
    try {
      const result = await testOpenCoreIntegrationProvider(code);
      setSelected(result.provider);
      setSelectedTestResult(result);
      message.success('Provider Test completed.');
      await loadHealthAudit();
      await openDetail(code);
      setSelectedTestResult(result);
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to run Provider Test.',
      );
    } finally {
      setProviderTestingCode(undefined);
    }
  };

  const toggleProvider = async (record: IntegrationProviderSummary) => {
    setProviderMutatingCode(record.code);
    try {
      const nextProvider = record.enabled
        ? await disableOpenCoreIntegrationProvider(record.code)
        : await enableOpenCoreIntegrationProvider(record.code);
      setSelected(nextProvider);
      message.success(
        record.enabled ? 'Provider disabled.' : 'Provider enabled.',
      );
      await loadHealthAudit();
      await openDetail(record.code);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : 'Unable to update provider state.',
      );
    } finally {
      setProviderMutatingCode(undefined);
    }
  };

  const columns: ProColumns<IntegrationProviderSummary>[] = [
    {
      title: 'Code',
      dataIndex: 'code',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record.code)}>
          {record.code}
        </Typography.Link>
      ),
    },
    { title: 'Type', dataIndex: 'type' },
    { title: 'Name', dataIndex: 'name' },
    {
      title: 'Config Version',
      dataIndex: 'configVersion',
      render: (_, record) => <Tag>v{record.configVersion}</Tag>,
    },
    {
      title: 'Secret Ref',
      render: () => (
        <Typography.Text type="secondary">[redacted]</Typography.Text>
      ),
    },
    {
      title: 'Readiness',
      render: (_, record) => {
        const readiness = diagnosticsByCode.get(record.code)?.readiness;
        return (
          <Tag color={readiness === 'ready' ? 'green' : 'red'}>{readiness}</Tag>
        );
      },
    },
    {
      title: 'Secret Ref Validation',
      render: (_, record) => (
        <Tag
          color={
            record.secretRefStatus === 'valid'
              ? 'green'
              : record.secretRefStatus === 'missing' ||
                  record.secretRefStatus === 'invalid'
                ? 'red'
                : 'gold'
          }
        >
          {record.secretRefStatus}
        </Tag>
      ),
    },
    {
      title: 'Last Provider Test',
      render: (_, record) => (
        <Typography.Text
          type={record.lastTestStatus === 'failed' ? 'danger' : 'secondary'}
        >
          {record.lastTestStatus ?? 'not_run'}
        </Typography.Text>
      ),
    },
    {
      title: 'Failure History',
      render: (_, record) => {
        const diagnostics = diagnosticsByCode.get(record.code);
        return (
          <Typography.Text
            type={diagnostics?.outbox.failed ? 'danger' : 'secondary'}
          >
            {diagnostics?.outbox.lastFailure?.id ?? 'none'}
          </Typography.Text>
        );
      },
    },
    {
      title: 'Health',
      render: (_, record) => <Tag color="blue">{record.healthStatus}</Tag>,
    },
    {
      title: 'Outbox Policy',
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? 'enqueue allowed' : 'enqueue blocked'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      valueType: 'option',
      render: (_, record) => (
        <Space size={4}>
          <Button
            loading={detailLoadingCode === record.code}
            onClick={() => void openDetail(record.code)}
            size="small"
            type="link"
          >
            Detail
          </Button>
          <Button
            disabled={!canManageIntegrationProviders}
            loading={providerTestingCode === record.code}
            onClick={() => void testProvider(record.code)}
            size="small"
            type="link"
          >
            Provider Test
          </Button>
          <Button
            disabled={!canUpdateIntegrationProviders}
            loading={providerMutatingCode === record.code}
            onClick={() => void toggleProvider(record)}
            size="small"
            type="link"
          >
            {record.enabled ? 'Disable' : 'Enable'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="Providers" subTitle="S12 Integrations">
      {loadError ? (
        <Alert
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
          message="Unable to load live Integration Health Audit data"
          description={loadError}
          action={
            <Button onClick={() => void loadHealthAudit()}>Reload</Button>
          }
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Typography.Text type="secondary">
          Live Integration Health Audit
        </Typography.Text>
        <Statistic
          title="Enabled providers"
          value={rows.filter((provider) => provider.enabled).length}
        />
        <Statistic
          title="Health Audit"
          value={healthAudit.totals.blocked}
          suffix={`/ ${healthAudit.totals.total}`}
        />
        <Statistic title="Queued outbox" value={healthAudit.totals.queued} />
        <Statistic title="Failed outbox" value={healthAudit.totals.failed} />
        <Statistic
          title="Config Audit"
          value={healthAudit.totals.configVaultBacked}
          suffix={`/ ${healthAudit.totals.total}`}
        />
        <Statistic
          title="Provider Test"
          value={rows.filter((provider) => provider.lastTestStatus).length}
          suffix={`/ ${rows.length}`}
        />
        <Statistic
          title="Failure History"
          value={healthAudit.totals.retryableFailed}
        />
        <Statistic
          title="Signed callback contract"
          value={signedCallbackContract.algorithm}
        />
        <Statistic title="SMS HTTP adapter" value="allowlisted" />
        <Statistic title="HTTP Secret Injection" value="header/query/body" />
        <Statistic title="Mail SMTP adapter" value="vault-backed" />
        <Statistic title="SMTP TLS Policy" value="tlsMode" />
        <Statistic title="Provider Diagnostics" value="read-only" />
        <Statistic title="Design topics" value={designTopicCount} />
      </Space>
      <ProTable<IntegrationProviderSummary>
        rowKey="code"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<IntegrationProviderSummary>
            key="export"
            columns={exportColumns}
            resource="integration-providers"
            rows={filteredRows}
          />,
        ]}
        pagination={false}
        loading={loading}
        dataSource={filteredRows}
        columns={columns}
      />
      <ReadOnlyDetailDrawer
        fields={[
          { label: 'Code', value: selected?.code },
          { label: 'Type', value: selected?.type },
          { label: 'Name', value: selected?.name },
          { label: 'Config Version', value: selected?.configVersion },
          {
            label: 'Enabled',
            value: selected?.enabled ? 'enabled' : 'disabled',
          },
          { label: 'Secret Ref', value: selected?.secretRef, sensitive: true },
          {
            label: 'Secret Ref Validation',
            value: selected?.secretRefStatus,
          },
          { label: 'Health', value: selected?.healthStatus },
          { label: 'Last Checked At', value: selected?.lastCheckedAt },
          { label: 'Last Provider Test', value: selected?.lastTestStatus },
          { label: 'Last Provider Test At', value: selected?.lastTestedAt },
          {
            label: 'Last Provider Test Message',
            value: selected?.lastTestMessage,
          },
          {
            label: 'Diagnostics Readiness',
            value: selectedDiagnostics?.readiness,
          },
          {
            label: 'Health Audit Generated At',
            value: healthAudit.generatedAt,
          },
          {
            label: 'Config Audit',
            value: selected?.secretRef.startsWith('secret://config/')
              ? 'vault-backed'
              : 'needs vault',
          },
          {
            label: 'Failure History',
            value: selectedDiagnostics?.outbox.lastFailure?.id ?? 'none',
          },
          {
            label: 'Diagnostics Channel',
            value: selectedDiagnostics?.channel,
          },
          {
            label: 'Outbox Failed',
            value: selectedDiagnostics?.outbox.failed,
          },
          {
            label: 'Retryable Failed',
            value: selectedDiagnostics?.outbox.retryableFailed,
          },
          {
            label: 'Outbox Policy',
            value: selected?.enabled ? 'enqueue allowed' : 'enqueue blocked',
          },
          {
            label: 'Signed Callback Contract',
            value: signedCallbackContract.algorithm,
          },
          {
            label: 'SMS HTTP Adapter',
            value: 'allowlisted endpoint + status contract',
          },
          {
            label: 'HTTP Secret Injection',
            value: 'secretRef -> header/query/body',
          },
          {
            label: 'Mail SMTP Adapter',
            value: 'secretRef -> config vault + SMTP send',
          },
          {
            label: 'SMTP TLS Policy',
            value: selectedSmtpTlsPolicy,
          },
          {
            label: 'Mail Callback Path',
            value: signedCallbackContract.mailPath,
          },
          {
            label: 'SMS Callback Path',
            value: signedCallbackContract.smsPath,
          },
          {
            label: 'Live Outbox Total',
            value: selectedDiagnostics?.outbox.total,
          },
        ]}
        jsonSections={[
          { title: 'Redacted Config', value: selected?.config ?? {} },
          {
            title: 'Provider Test',
            value: selectedTestResult ?? {},
          },
          {
            title: 'Provider Audit Logs',
            value: selectedAuditLogs,
          },
          {
            title: 'Signed Callback Canonical Payload',
            value: signedCallbackContract,
          },
          {
            title: 'Provider Diagnostics',
            value: selectedDiagnostics ?? {},
          },
          {
            title: 'Live Outbox Summary',
            value: selectedDiagnostics?.outbox ?? {},
          },
        ]}
        onClose={() => {
          setSelected(undefined);
          setSelectedDiagnostics(undefined);
          setSelectedAuditLogs([]);
          setSelectedTestResult(undefined);
        }}
        open={Boolean(selected)}
        title={selected?.name ?? 'Provider Detail'}
      />
    </PageContainer>
  );
}
