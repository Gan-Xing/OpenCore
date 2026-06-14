import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createIntegrationFixtures,
  createIntegrationProviderHealthAuditFixture,
  findIntegrationOutboxFixture,
  type IntegrationProviderHealthAuditSummary,
  type IntegrationProviderDiagnosticsSummary,
  type IntegrationOutboxSummary,
  type IntegrationProviderSummary,
} from '@opencore/sdk';
import { Alert, Button, Space, Statistic, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getOpenCoreIntegrationProviderHealthAudit } from '@/services/opencore/platform';
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

const fixtures = createIntegrationFixtures();
const fallbackHealthAudit = createIntegrationProviderHealthAuditFixture();
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
  { title: 'Health', dataIndex: 'healthStatus' },
  { title: 'Last Checked At', dataIndex: 'lastCheckedAt' },
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
  const [healthAudit, setHealthAudit] =
    useState<IntegrationProviderHealthAuditSummary>(fallbackHealthAudit);
  const [selected, setSelected] = useState<IntegrationProviderSummary>();
  const [selectedDiagnostics, setSelectedDiagnostics] =
    useState<IntegrationProviderDiagnosticsSummary>();
  const [selectedOutbox, setSelectedOutbox] =
    useState<IntegrationOutboxSummary>();
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
      setHealthAudit(fallbackHealthAudit);
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

  const openDetail = (code: string) => {
    const diagnostics = diagnosticsByCode.get(code);
    const provider = diagnostics?.provider;
    const outbox = fixtures.outbox.find(
      (message) => message.providerCode === code,
    );
    setSelected(provider);
    setSelectedDiagnostics(diagnostics);
    setSelectedOutbox(
      outbox
        ? findIntegrationOutboxFixture(outbox.channel, outbox.id)
        : undefined,
    );
  };

  const columns: ProColumns<IntegrationProviderSummary>[] = [
    {
      title: 'Code',
      dataIndex: 'code',
      render: (_, record) => (
        <Typography.Link onClick={() => openDetail(record.code)}>
          {record.code}
        </Typography.Link>
      ),
    },
    { title: 'Type', dataIndex: 'type' },
    { title: 'Name', dataIndex: 'name' },
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
      title: 'Config Audit',
      render: (_, record) => (
        <Tag
          color={
            record.secretRef.startsWith('secret://config/') ? 'green' : 'gold'
          }
        >
          {record.secretRef.startsWith('secret://config/')
            ? 'vault-backed'
            : 'needs vault'}
        </Tag>
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
        <a onClick={() => openDetail(record.code)}>Detail</a>
      ),
    },
  ];

  return (
    <PageContainer title="Providers" subTitle="S12 Integrations">
      {loadError ? (
        <Alert
          showIcon
          style={{ marginBottom: 16 }}
          type="warning"
          message="Using fallback Integration Health Audit data"
          description={loadError}
          action={
            <Button onClick={() => void loadHealthAudit()}>Reload</Button>
          }
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
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
        <Statistic
          title="Design topics"
          value={fixtures.summary.designs.designOnlyTopics}
        />
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
          {
            label: 'Enabled',
            value: selected?.enabled ? 'enabled' : 'disabled',
          },
          { label: 'Secret Ref', value: selected?.secretRef, sensitive: true },
          { label: 'Health', value: selected?.healthStatus },
          { label: 'Last Checked At', value: selected?.lastCheckedAt },
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
          { label: 'Sample Outbox', value: selectedOutbox?.id },
        ]}
        jsonSections={[
          { title: 'Redacted Config', value: selected?.config ?? {} },
          {
            title: 'Signed Callback Canonical Payload',
            value: signedCallbackContract,
          },
          {
            title: 'Provider Diagnostics',
            value: selectedDiagnostics ?? {},
          },
          {
            title: 'Sample Outbox Payload',
            value: selectedOutbox?.payload ?? {},
          },
        ]}
        onClose={() => {
          setSelected(undefined);
          setSelectedDiagnostics(undefined);
          setSelectedOutbox(undefined);
        }}
        open={Boolean(selected)}
        title={selected?.name ?? 'Provider Detail'}
      />
    </PageContainer>
  );
}
