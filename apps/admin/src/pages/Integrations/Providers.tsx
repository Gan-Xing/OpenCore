import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess, useIntl } from '@umijs/max';
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
const searchFields: CurrentPageSearchField<IntegrationProviderSummary>[] = [
  'code',
  'type',
  'name',
  'healthStatus',
];

export default function ProvidersPage() {
  const intl = useIntl();
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
  const formatMessage = useCallback(
    (
      id: string,
      defaultMessage: string,
      values?: Record<string, number | string>,
    ) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const statusLabels = {
    disabled: formatMessage(
      'pages.integrations.providers.status.disabled',
      'disabled',
    ),
    enabled: formatMessage(
      'pages.integrations.providers.status.enabled',
      'enabled',
    ),
  };
  const outboxPolicyLabels = {
    blocked: formatMessage(
      'pages.integrations.providers.outboxPolicy.blocked',
      'enqueue blocked',
    ),
    allowed: formatMessage(
      'pages.integrations.providers.outboxPolicy.allowed',
      'enqueue allowed',
    ),
  };
  const configAuditLabels = {
    needsVault: formatMessage(
      'pages.integrations.providers.configAudit.needsVault',
      'needs vault',
    ),
    vaultBacked: formatMessage(
      'pages.integrations.providers.configAudit.vaultBacked',
      'vault-backed',
    ),
  };
  const staticValueLabels = {
    allowlisted: formatMessage(
      'pages.integrations.providers.static.allowlisted',
      'allowlisted',
    ),
    httpSecretInjection: formatMessage(
      'pages.integrations.providers.static.httpSecretInjection',
      'header/query/body',
    ),
    mailSmtpAdapter: formatMessage(
      'pages.integrations.providers.static.mailSmtpAdapter',
      'vault-backed',
    ),
    providerDiagnostics: formatMessage(
      'pages.integrations.providers.static.providerDiagnostics',
      'read-only',
    ),
    smsHttpAdapterDetail: formatMessage(
      'pages.integrations.providers.static.smsHttpAdapterDetail',
      'allowlisted endpoint + status contract',
    ),
    httpSecretInjectionDetail: formatMessage(
      'pages.integrations.providers.static.httpSecretInjectionDetail',
      'secretRef -> header/query/body',
    ),
    mailSmtpAdapterDetail: formatMessage(
      'pages.integrations.providers.static.mailSmtpAdapterDetail',
      'secretRef -> config vault + SMTP send',
    ),
    none: formatMessage('pages.integrations.providers.static.none', 'none'),
    notConfigured: formatMessage(
      'pages.integrations.providers.static.notConfigured',
      'not configured',
    ),
    redacted: formatMessage(
      'pages.integrations.providers.static.redacted',
      '[redacted]',
    ),
  };
  const filterOptions: CurrentPageFilterOption<IntegrationProviderSummary>[] = [
    {
      key: 'type',
      options: createCurrentPageFilterOptions(rows, 'type'),
      placeholder: formatMessage(
        'pages.integrations.providers.fields.type',
        'Type',
      ),
      predicate: (record, value) => record.type === value,
    },
    {
      key: 'enabled',
      options: [
        { label: statusLabels.enabled, value: 'true' },
        { label: statusLabels.disabled, value: 'false' },
      ],
      placeholder: formatMessage(
        'pages.integrations.providers.fields.enabled',
        'Enabled',
      ),
      predicate: (record, value) => record.enabled === (value === 'true'),
    },
    {
      key: 'healthStatus',
      options: createCurrentPageFilterOptions(rows, 'healthStatus'),
      placeholder: formatMessage(
        'pages.integrations.providers.fields.health',
        'Health',
      ),
      predicate: (record, value) => record.healthStatus === value,
    },
    {
      key: 'secretRefStatus',
      options: createCurrentPageFilterOptions(rows, 'secretRefStatus'),
      placeholder: formatMessage(
        'pages.integrations.providers.fields.secretRef',
        'Secret Ref',
      ),
      predicate: (record, value) => record.secretRefStatus === value,
    },
  ];
  const exportColumns: CurrentPageExportColumn<IntegrationProviderSummary>[] = [
    {
      title: formatMessage('pages.integrations.providers.fields.code', 'Code'),
      dataIndex: 'code',
    },
    {
      title: formatMessage('pages.integrations.providers.fields.type', 'Type'),
      dataIndex: 'type',
    },
    {
      title: formatMessage('pages.integrations.providers.fields.name', 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage(
        'pages.integrations.providers.fields.enabled',
        'Enabled',
      ),
      dataIndex: 'enabled',
    },
    {
      title: formatMessage(
        'pages.integrations.providers.fields.configVersion',
        'Config Version',
      ),
      dataIndex: 'configVersion',
    },
    {
      title: formatMessage(
        'pages.integrations.providers.fields.secretRefValidation',
        'Secret Ref Validation',
      ),
      dataIndex: 'secretRefStatus',
    },
    {
      title: formatMessage(
        'pages.integrations.providers.fields.lastProviderTest',
        'Last Provider Test',
      ),
      dataIndex: 'lastTestStatus',
    },
    {
      title: formatMessage(
        'pages.integrations.providers.fields.health',
        'Health',
      ),
      dataIndex: 'healthStatus',
    },
    {
      title: formatMessage(
        'pages.integrations.providers.fields.lastCheckedAt',
        'Last Checked At',
      ),
      dataIndex: 'lastCheckedAt',
    },
    {
      title: formatMessage(
        'pages.integrations.providers.fields.lastTestedAt',
        'Last Tested At',
      ),
      dataIndex: 'lastTestedAt',
    },
    {
      title: formatMessage(
        'pages.integrations.providers.fields.secretRef',
        'Secret Ref',
      ),
      dataIndex: 'secretRef',
      sensitive: true,
    },
    {
      title: formatMessage(
        'pages.integrations.providers.fields.config',
        'Config',
      ),
      dataIndex: 'config',
      sensitive: true,
    },
  ];
  const selectedSmtpTlsPolicy =
    selected?.type === 'mail'
      ? String(selected.config.tlsMode ?? staticValueLabels.notConfigured)
      : undefined;
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<IntegrationProviderSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.integrations.providers.search.placeholder',
        'Search providers',
      ),
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
          : formatMessage(
              'pages.integrations.providers.load.failure',
              'Unable to load integration health audit.',
            ),
      );
    } finally {
      setLoading(false);
    }
  }, [formatMessage]);

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
          : formatMessage(
              'pages.integrations.providers.load.diagnosticsFailure',
              'Unable to load live provider diagnostics.',
            ),
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
      message.success(
        formatMessage(
          'pages.integrations.providers.messages.testCompleted',
          'Provider Test completed.',
        ),
      );
      await loadHealthAudit();
      await openDetail(code);
      setSelectedTestResult(result);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.providers.messages.testFailure',
              'Unable to run Provider Test.',
            ),
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
        record.enabled
          ? formatMessage(
              'pages.integrations.providers.messages.disabled',
              'Provider disabled.',
            )
          : formatMessage(
              'pages.integrations.providers.messages.enabled',
              'Provider enabled.',
            ),
      );
      await loadHealthAudit();
      await openDetail(record.code);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.providers.messages.updateFailure',
              'Unable to update provider state.',
            ),
      );
    } finally {
      setProviderMutatingCode(undefined);
    }
  };

  const columns: ProColumns<IntegrationProviderSummary>[] = [
    {
      title: formatMessage('pages.integrations.providers.fields.code', 'Code'),
      dataIndex: 'code',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record.code)}>
          {record.code}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.integrations.providers.fields.type', 'Type'),
      dataIndex: 'type',
    },
    {
      title: formatMessage('pages.integrations.providers.fields.name', 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage(
        'pages.integrations.providers.fields.configVersion',
        'Config Version',
      ),
      dataIndex: 'configVersion',
      render: (_, record) => <Tag>v{record.configVersion}</Tag>,
    },
    {
      title: formatMessage(
        'pages.integrations.providers.fields.secretRef',
        'Secret Ref',
      ),
      render: () => (
        <Typography.Text type="secondary">
          {staticValueLabels.redacted}
        </Typography.Text>
      ),
    },
    {
      title: formatMessage(
        'pages.integrations.providers.fields.readiness',
        'Readiness',
      ),
      render: (_, record) => {
        const readiness = diagnosticsByCode.get(record.code)?.readiness;
        return (
          <Tag color={readiness === 'ready' ? 'green' : 'red'}>{readiness}</Tag>
        );
      },
    },
    {
      title: formatMessage(
        'pages.integrations.providers.fields.secretRefValidation',
        'Secret Ref Validation',
      ),
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
      title: formatMessage(
        'pages.integrations.providers.fields.lastProviderTest',
        'Last Provider Test',
      ),
      render: (_, record) => (
        <Typography.Text
          type={record.lastTestStatus === 'failed' ? 'danger' : 'secondary'}
        >
          {record.lastTestStatus ??
            formatMessage(
              'pages.integrations.providers.testStatus.notRun',
              'not_run',
            )}
        </Typography.Text>
      ),
    },
    {
      title: formatMessage(
        'pages.integrations.providers.fields.failureHistory',
        'Failure History',
      ),
      render: (_, record) => {
        const diagnostics = diagnosticsByCode.get(record.code);
        return (
          <Typography.Text
            type={diagnostics?.outbox.failed ? 'danger' : 'secondary'}
          >
            {diagnostics?.outbox.lastFailure?.id ?? staticValueLabels.none}
          </Typography.Text>
        );
      },
    },
    {
      title: formatMessage(
        'pages.integrations.providers.fields.health',
        'Health',
      ),
      render: (_, record) => <Tag color="blue">{record.healthStatus}</Tag>,
    },
    {
      title: formatMessage(
        'pages.integrations.providers.fields.outboxPolicy',
        'Outbox Policy',
      ),
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled
            ? outboxPolicyLabels.allowed
            : outboxPolicyLabels.blocked}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.integrations.providers.actions.column',
        'Action',
      ),
      valueType: 'option',
      render: (_, record) => (
        <Space size={4}>
          <Button
            loading={detailLoadingCode === record.code}
            onClick={() => void openDetail(record.code)}
            size="small"
            type="link"
          >
            {formatMessage(
              'pages.integrations.providers.actions.detail',
              'Detail',
            )}
          </Button>
          <Button
            disabled={!canManageIntegrationProviders}
            loading={providerTestingCode === record.code}
            onClick={() => void testProvider(record.code)}
            size="small"
            type="link"
          >
            {formatMessage(
              'pages.integrations.providers.actions.providerTest',
              'Provider Test',
            )}
          </Button>
          <Button
            disabled={!canUpdateIntegrationProviders}
            loading={providerMutatingCode === record.code}
            onClick={() => void toggleProvider(record)}
            size="small"
            type="link"
          >
            {record.enabled
              ? formatMessage(
                  'pages.integrations.providers.actions.disable',
                  'Disable',
                )
              : formatMessage(
                  'pages.integrations.providers.actions.enable',
                  'Enable',
                )}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title={formatMessage('menu.integrations.providers', 'Providers')}
      subTitle={formatMessage('pages.integrations.section', 'S12 Integrations')}
    >
      {loadError ? (
        <Alert
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
          message={formatMessage(
            'pages.integrations.providers.load.liveFailure',
            'Unable to load live Integration Health Audit data',
          )}
          description={loadError}
          action={
            <Button onClick={() => void loadHealthAudit()}>
              {formatMessage(
                'pages.integrations.providers.actions.reload',
                'Reload',
              )}
            </Button>
          }
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Typography.Text type="secondary">
          {formatMessage(
            'pages.integrations.providers.summary.liveHealthAudit',
            'Live Integration Health Audit',
          )}
        </Typography.Text>
        <Statistic
          title={formatMessage(
            'pages.integrations.providers.summary.enabledProviders',
            'Enabled providers',
          )}
          value={rows.filter((provider) => provider.enabled).length}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.providers.summary.healthAudit',
            'Health Audit',
          )}
          value={healthAudit.totals.blocked}
          suffix={`/ ${healthAudit.totals.total}`}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.providers.summary.queuedOutbox',
            'Queued outbox',
          )}
          value={healthAudit.totals.queued}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.providers.summary.failedOutbox',
            'Failed outbox',
          )}
          value={healthAudit.totals.failed}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.providers.summary.configAudit',
            'Config Audit',
          )}
          value={healthAudit.totals.configVaultBacked}
          suffix={`/ ${healthAudit.totals.total}`}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.providers.summary.providerTest',
            'Provider Test',
          )}
          value={rows.filter((provider) => provider.lastTestStatus).length}
          suffix={`/ ${rows.length}`}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.providers.summary.failureHistory',
            'Failure History',
          )}
          value={healthAudit.totals.retryableFailed}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.providers.summary.signedCallbackContract',
            'Signed callback contract',
          )}
          value={signedCallbackContract.algorithm}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.providers.summary.smsHttpAdapter',
            'SMS HTTP adapter',
          )}
          value={staticValueLabels.allowlisted}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.providers.summary.httpSecretInjection',
            'HTTP Secret Injection',
          )}
          value={staticValueLabels.httpSecretInjection}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.providers.summary.mailSmtpAdapter',
            'Mail SMTP adapter',
          )}
          value={staticValueLabels.mailSmtpAdapter}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.providers.summary.smtpTlsPolicy',
            'SMTP TLS Policy',
          )}
          value="tlsMode"
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.providers.summary.providerDiagnostics',
            'Provider Diagnostics',
          )}
          value={staticValueLabels.providerDiagnostics}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.providers.summary.designTopics',
            'Design topics',
          )}
          value={designTopicCount}
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
          {
            label: formatMessage(
              'pages.integrations.providers.fields.code',
              'Code',
            ),
            value: selected?.code,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.type',
              'Type',
            ),
            value: selected?.type,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.name',
              'Name',
            ),
            value: selected?.name,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.configVersion',
              'Config Version',
            ),
            value: selected?.configVersion,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.enabled',
              'Enabled',
            ),
            value: selected?.enabled
              ? statusLabels.enabled
              : statusLabels.disabled,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.secretRef',
              'Secret Ref',
            ),
            value: selected?.secretRef,
            sensitive: true,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.secretRefValidation',
              'Secret Ref Validation',
            ),
            value: selected?.secretRefStatus,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.health',
              'Health',
            ),
            value: selected?.healthStatus,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.lastCheckedAt',
              'Last Checked At',
            ),
            value: selected?.lastCheckedAt,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.lastProviderTest',
              'Last Provider Test',
            ),
            value: selected?.lastTestStatus,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.lastProviderTestAt',
              'Last Provider Test At',
            ),
            value: selected?.lastTestedAt,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.lastProviderTestMessage',
              'Last Provider Test Message',
            ),
            value: selected?.lastTestMessage,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.diagnosticsReadiness',
              'Diagnostics Readiness',
            ),
            value: selectedDiagnostics?.readiness,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.healthAuditGeneratedAt',
              'Health Audit Generated At',
            ),
            value: healthAudit.generatedAt,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.configAudit',
              'Config Audit',
            ),
            value: selected?.secretRef.startsWith('secret://config/')
              ? configAuditLabels.vaultBacked
              : configAuditLabels.needsVault,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.failureHistory',
              'Failure History',
            ),
            value:
              selectedDiagnostics?.outbox.lastFailure?.id ??
              staticValueLabels.none,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.diagnosticsChannel',
              'Diagnostics Channel',
            ),
            value: selectedDiagnostics?.channel,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.outboxFailed',
              'Outbox Failed',
            ),
            value: selectedDiagnostics?.outbox.failed,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.retryableFailed',
              'Retryable Failed',
            ),
            value: selectedDiagnostics?.outbox.retryableFailed,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.outboxPolicy',
              'Outbox Policy',
            ),
            value: selected?.enabled
              ? outboxPolicyLabels.allowed
              : outboxPolicyLabels.blocked,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.signedCallbackContract',
              'Signed Callback Contract',
            ),
            value: signedCallbackContract.algorithm,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.smsHttpAdapter',
              'SMS HTTP Adapter',
            ),
            value: staticValueLabels.smsHttpAdapterDetail,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.httpSecretInjection',
              'HTTP Secret Injection',
            ),
            value: staticValueLabels.httpSecretInjectionDetail,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.mailSmtpAdapter',
              'Mail SMTP Adapter',
            ),
            value: staticValueLabels.mailSmtpAdapterDetail,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.smtpTlsPolicy',
              'SMTP TLS Policy',
            ),
            value: selectedSmtpTlsPolicy,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.mailCallbackPath',
              'Mail Callback Path',
            ),
            value: signedCallbackContract.mailPath,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.smsCallbackPath',
              'SMS Callback Path',
            ),
            value: signedCallbackContract.smsPath,
          },
          {
            label: formatMessage(
              'pages.integrations.providers.fields.liveOutboxTotal',
              'Live Outbox Total',
            ),
            value: selectedDiagnostics?.outbox.total,
          },
        ]}
        jsonSections={[
          {
            title: formatMessage(
              'pages.integrations.providers.json.redactedConfig',
              'Redacted Config',
            ),
            value: selected?.config ?? {},
          },
          {
            title: formatMessage(
              'pages.integrations.providers.json.providerTest',
              'Provider Test',
            ),
            value: selectedTestResult ?? {},
          },
          {
            title: formatMessage(
              'pages.integrations.providers.json.providerAuditLogs',
              'Provider Audit Logs',
            ),
            value: selectedAuditLogs,
          },
          {
            title: formatMessage(
              'pages.integrations.providers.json.signedCallbackCanonicalPayload',
              'Signed Callback Canonical Payload',
            ),
            value: signedCallbackContract,
          },
          {
            title: formatMessage(
              'pages.integrations.providers.json.providerDiagnostics',
              'Provider Diagnostics',
            ),
            value: selectedDiagnostics ?? {},
          },
          {
            title: formatMessage(
              'pages.integrations.providers.json.liveOutboxSummary',
              'Live Outbox Summary',
            ),
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
        title={
          selected?.name ??
          formatMessage(
            'pages.integrations.providers.detail.title',
            'Provider Detail',
          )
        }
      />
    </PageContainer>
  );
}
