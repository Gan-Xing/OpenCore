import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess, useIntl } from '@umijs/max';
import type {
  IntegrationProviderSummary,
  OAuthCallbackAuditSummary,
  OAuthCallbackContractSummary,
  OAuthFlowSummary,
  OAuthTokenInventorySummary,
  OAuthTokenSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  message,
  Modal,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getOpenCoreOAuthCallbackContract,
  getOpenCoreOAuthToken,
  getOpenCoreOAuthTokenSummary,
  listOpenCoreOAuthCallbackAudits,
  listOpenCoreOAuthFlows,
  listOpenCoreOAuthProviders,
  listOpenCoreOAuthTokens,
  revokeOpenCoreOAuthToken,
  startOpenCoreOAuthFlow,
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

const OAUTH_MANAGE_PERMISSION_MARKER = 'integration:oauth:manage';

const emptySummary: OAuthTokenInventorySummary = {
  active: 0,
  expired: 0,
  expiringSoon: 0,
  generatedAt: '',
  providers: 0,
  revoked: 0,
  total: 0,
};

const searchFields: CurrentPageSearchField<OAuthTokenSummary>[] = [
  'id',
  'providerCode',
  'subjectType',
  'subjectId',
  'providerAccountId',
  (record) => record.scopes,
  'status',
];

const flowSearchFields: CurrentPageSearchField<OAuthFlowSummary>[] = [
  'id',
  'providerCode',
  'state',
  'subjectId',
  'status',
  'tokenId',
];

const auditSearchFields: CurrentPageSearchField<OAuthCallbackAuditSummary>[] = [
  'id',
  'providerCode',
  'flowId',
  'state',
  'status',
  'reason',
  'tokenId',
];

function statusColor(status: OAuthTokenSummary['status']): string {
  if (status === 'active') return 'green';
  if (status === 'expired') return 'gold';
  return 'red';
}

function flowStatusColor(status: OAuthFlowSummary['status']): string {
  if (status === 'completed') return 'green';
  if (status === 'pending') return 'blue';
  if (status === 'expired') return 'gold';
  return 'red';
}

function auditStatusColor(status: OAuthCallbackAuditSummary['status']): string {
  return status === 'accepted' ? 'green' : 'red';
}

function providerScopes(
  provider: IntegrationProviderSummary,
): readonly string[] {
  const scopes = provider.config.scopes;
  return Array.isArray(scopes)
    ? scopes.filter((item): item is string => typeof item === 'string')
    : ['read:user'];
}

export default function OAuthIntegrationPage() {
  const intl = useIntl();
  const access = useAccess();
  const canManageOAuthIntegration = Boolean(access.canManageOAuthIntegration);
  const [rows, setRows] = useState<readonly OAuthTokenSummary[]>([]);
  const [providers, setProviders] = useState<
    readonly IntegrationProviderSummary[]
  >([]);
  const [flows, setFlows] = useState<readonly OAuthFlowSummary[]>([]);
  const [audits, setAudits] = useState<readonly OAuthCallbackAuditSummary[]>(
    [],
  );
  const [summary, setSummary] =
    useState<OAuthTokenInventorySummary>(emptySummary);
  const [callbackContract, setCallbackContract] =
    useState<OAuthCallbackContractSummary>();
  const [selected, setSelected] = useState<OAuthTokenSummary>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [revokingId, setRevokingId] = useState<string>();
  const [detailLoadingId, setDetailLoadingId] = useState<string>();
  const [startingFlow, setStartingFlow] = useState(false);
  const [lastStartedFlow, setLastStartedFlow] = useState<OAuthFlowSummary>();
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
  const exportColumns: CurrentPageExportColumn<OAuthTokenSummary>[] = [
    {
      title: formatMessage('pages.integrations.oauth.fields.id', 'ID'),
      dataIndex: 'id',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.provider',
        'Provider',
      ),
      dataIndex: 'providerCode',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.subjectType',
        'Subject Type',
      ),
      dataIndex: 'subjectType',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.subjectId',
        'Subject ID',
      ),
      dataIndex: 'subjectId',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.providerAccount',
        'Provider Account',
      ),
      dataIndex: 'providerAccountId',
    },
    {
      title: formatMessage('pages.integrations.oauth.fields.scopes', 'Scopes'),
      renderText: (record) => record.scopes.join(', '),
    },
    {
      title: formatMessage('pages.integrations.oauth.fields.status', 'Status'),
      dataIndex: 'status',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.expiresAt',
        'Expires At',
      ),
      dataIndex: 'expiresAt',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.lastRotatedAt',
        'Last Rotated At',
      ),
      dataIndex: 'lastRotatedAt',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.revokedAt',
        'Revoked At',
      ),
      dataIndex: 'revokedAt',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.accessTokenRef',
        'Access Token Ref',
      ),
      dataIndex: 'accessTokenRef',
      sensitive: true,
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.refreshTokenRef',
        'Refresh Token Ref',
      ),
      dataIndex: 'refreshTokenRef',
      sensitive: true,
    },
  ];

  const filterOptions: CurrentPageFilterOption<OAuthTokenSummary>[] = useMemo(
    () => [
      {
        key: 'providerCode',
        options: createCurrentPageFilterOptions(rows, 'providerCode'),
        placeholder: formatMessage(
          'pages.integrations.oauth.fields.provider',
          'Provider',
        ),
        predicate: (record, value) => record.providerCode === value,
      },
      {
        key: 'status',
        options: createCurrentPageFilterOptions(rows, 'status'),
        placeholder: formatMessage(
          'pages.integrations.oauth.fields.status',
          'Status',
        ),
        predicate: (record, value) => record.status === value,
      },
    ],
    [formatMessage, rows],
  );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<OAuthTokenSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.integrations.oauth.search.tokens',
        'Search OAuth tokens',
      ),
      selectFilters: filterOptions,
    });
  const { filteredRows: filteredFlows, toolbar: flowFilterToolbar } =
    useCurrentPageFilters<OAuthFlowSummary>({
      rows: flows,
      searchFields: flowSearchFields,
      searchPlaceholder: formatMessage(
        'pages.integrations.oauth.search.flows',
        'Search OAuth flows',
      ),
    });
  const { filteredRows: filteredAudits, toolbar: auditFilterToolbar } =
    useCurrentPageFilters<OAuthCallbackAuditSummary>({
      rows: audits,
      searchFields: auditSearchFields,
      searchPlaceholder: formatMessage(
        'pages.integrations.oauth.search.audits',
        'Search OAuth callback audits',
      ),
    });

  const loadTokens = useCallback(async () => {
    setLoading(true);
    try {
      const [
        nextSummary,
        nextRows,
        nextContract,
        nextProviders,
        nextFlows,
        nextAudits,
      ] = await Promise.all([
        getOpenCoreOAuthTokenSummary(),
        listOpenCoreOAuthTokens(),
        getOpenCoreOAuthCallbackContract(),
        listOpenCoreOAuthProviders(),
        listOpenCoreOAuthFlows(),
        listOpenCoreOAuthCallbackAudits(),
      ]);
      setSummary(nextSummary);
      setRows(nextRows);
      setCallbackContract(nextContract);
      setProviders(nextProviders);
      setFlows(nextFlows);
      setAudits(nextAudits);
      setLoadError(undefined);
    } catch (error: unknown) {
      setSummary(emptySummary);
      setRows([]);
      setCallbackContract(undefined);
      setProviders([]);
      setFlows([]);
      setAudits([]);
      setSelected(undefined);
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.oauth.load.failure',
              'Unable to load OAuth token inventory.',
            ),
      );
    } finally {
      setLoading(false);
    }
  }, [formatMessage]);

  useEffect(() => {
    void loadTokens();
  }, [loadTokens]);

  const openDetail = async (id: string) => {
    setDetailLoadingId(id);
    try {
      const token = await getOpenCoreOAuthToken(id);
      setSelected(token);
    } catch (error: unknown) {
      setSelected(undefined);
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.oauth.load.detailFailure',
              'Unable to load live OAuth token detail.',
            ),
      );
    } finally {
      setDetailLoadingId(undefined);
    }
  };

  const startFlow = async () => {
    const provider = providers[0];
    if (!provider) {
      message.error(
        formatMessage(
          'pages.integrations.oauth.messages.noProvider',
          'No enabled OAuth provider is available.',
        ),
      );
      return;
    }

    setStartingFlow(true);
    try {
      const flow = await startOpenCoreOAuthFlow({
        providerCode: provider.code,
        subjectId: 'user_admin',
        scopes: providerScopes(provider),
      });
      setLastStartedFlow(flow);
      message.success(
        formatMessage(
          'pages.integrations.oauth.messages.flowStarted',
          'OAuth flow started',
        ),
      );
      await loadTokens();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.oauth.messages.flowStartFailure',
              'Unable to start OAuth flow.',
            ),
      );
    } finally {
      setStartingFlow(false);
    }
  };

  const confirmRevoke = (record: OAuthTokenSummary) => {
    Modal.confirm({
      title: formatMessage(
        'pages.integrations.oauth.confirm.revoke',
        'Revoke token {id}?',
        { id: record.id },
      ),
      content: formatMessage(
        'pages.integrations.oauth.confirm.revokeContent',
        'The token reference will be marked revoked and excluded from active OAuth token inventory.',
      ),
      okButtonProps: { danger: true },
      okText: formatMessage(
        'pages.integrations.oauth.actions.revokeToken',
        'Revoke token',
      ),
      onOk: async () => {
        setRevokingId(record.id);
        try {
          const revoked = await revokeOpenCoreOAuthToken(record.id, {
            reason: 'Manual revoke from Admin OAuth token inventory',
          });
          setSelected(revoked);
          message.success(
            formatMessage(
              'pages.integrations.oauth.messages.revoked',
              'OAuth token revoked',
            ),
          );
          await loadTokens();
        } finally {
          setRevokingId(undefined);
        }
      },
    });
  };

  const columns: ProColumns<OAuthTokenSummary>[] = [
    {
      title: formatMessage('pages.integrations.oauth.fields.token', 'Token'),
      dataIndex: 'id',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record.id)}>
          {record.id}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.provider',
        'Provider',
      ),
      dataIndex: 'providerCode',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.subject',
        'Subject',
      ),
      dataIndex: 'subjectId',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.providerAccount',
        'Provider Account',
      ),
      dataIndex: 'providerAccountId',
    },
    {
      title: formatMessage('pages.integrations.oauth.fields.scopes', 'Scopes'),
      renderText: (_, record) => record.scopes.join(', '),
    },
    {
      title: formatMessage('pages.integrations.oauth.fields.status', 'Status'),
      render: (_, record) => (
        <Tag color={statusColor(record.status)}>{record.status}</Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.expiresAt',
        'Expires At',
      ),
      dataIndex: 'expiresAt',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.lastRotatedAt',
        'Last Rotated At',
      ),
      dataIndex: 'lastRotatedAt',
    },
    {
      title: formatMessage('pages.integrations.oauth.actions.column', 'Action'),
      valueType: 'option',
      render: (_, record) => [
        <Button
          key="detail"
          loading={detailLoadingId === record.id}
          onClick={() => void openDetail(record.id)}
          size="small"
          type="link"
        >
          {formatMessage('pages.integrations.oauth.actions.detail', 'Detail')}
        </Button>,
        <Button
          danger
          disabled={record.status === 'revoked' || !canManageOAuthIntegration}
          key="revoke"
          loading={revokingId === record.id}
          onClick={() => confirmRevoke(record)}
          size="small"
          title={OAUTH_MANAGE_PERMISSION_MARKER}
          type="link"
        >
          {formatMessage(
            'pages.integrations.oauth.actions.revokeToken',
            'Revoke token',
          )}
        </Button>,
      ],
    },
  ];

  const flowColumns: ProColumns<OAuthFlowSummary>[] = [
    {
      title: formatMessage('pages.integrations.oauth.fields.flow', 'Flow'),
      dataIndex: 'id',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.provider',
        'Provider',
      ),
      dataIndex: 'providerCode',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.subject',
        'Subject',
      ),
      dataIndex: 'subjectId',
    },
    {
      title: formatMessage('pages.integrations.oauth.fields.status', 'Status'),
      render: (_, record) => (
        <Tag color={flowStatusColor(record.status)}>{record.status}</Tag>
      ),
    },
    {
      title: formatMessage('pages.integrations.oauth.fields.state', 'State'),
      dataIndex: 'state',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.expiresAt',
        'Expires At',
      ),
      dataIndex: 'expiresAt',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.tokenArchive',
        'Token Archive',
      ),
      dataIndex: 'tokenId',
    },
  ];

  const auditColumns: ProColumns<OAuthCallbackAuditSummary>[] = [
    {
      title: formatMessage('pages.integrations.oauth.fields.audit', 'Audit'),
      dataIndex: 'id',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.provider',
        'Provider',
      ),
      dataIndex: 'providerCode',
    },
    {
      title: formatMessage('pages.integrations.oauth.fields.flow', 'Flow'),
      dataIndex: 'flowId',
    },
    {
      title: formatMessage('pages.integrations.oauth.fields.status', 'Status'),
      render: (_, record) => (
        <Tag color={auditStatusColor(record.status)}>{record.status}</Tag>
      ),
    },
    {
      title: formatMessage('pages.integrations.oauth.fields.reason', 'Reason'),
      dataIndex: 'reason',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.codeHash',
        'Code Hash',
      ),
      dataIndex: 'callbackCodeHash',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.tokenArchive',
        'Token Archive',
      ),
      dataIndex: 'tokenId',
    },
    {
      title: formatMessage(
        'pages.integrations.oauth.fields.createdAt',
        'Created At',
      ),
      dataIndex: 'createdAt',
    },
  ];

  return (
    <PageContainer
      title={formatMessage('menu.integrations.oauth', 'OAuth')}
      subTitle={formatMessage('pages.integrations.section', 'Integrations')}
    >
      {loadError ? (
        <Alert
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
          message={formatMessage(
            'pages.integrations.oauth.load.liveFailure',
            'Unable to load live OAuth token inventory',
          )}
          description={loadError}
          action={
            <Button onClick={() => void loadTokens()}>
              {formatMessage(
                'pages.integrations.oauth.actions.reload',
                'Reload',
              )}
            </Button>
          }
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.integrations.oauth.summary.tokenInventory',
            'OAuth token inventory',
          )}
          value={summary.total}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.oauth.summary.activeTokens',
            'Active tokens',
          )}
          value={summary.active}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.oauth.summary.expiredTokens',
            'Expired tokens',
          )}
          value={summary.expired}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.oauth.summary.revokedTokens',
            'Revoked tokens',
          )}
          value={summary.revoked}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.oauth.summary.callbackFlows',
            'OAuth callback flows',
          )}
          value={flows.length}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.oauth.summary.callbackAuditTrail',
            'Callback audit trail',
          )}
          value={audits.length}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.oauth.summary.lifecycle',
            'Token lifecycle summary',
          )}
          value={summary.providers}
          suffix={formatMessage(
            'pages.integrations.oauth.summary.providerSuffix',
            'provider(s)',
          )}
        />
      </Space>
      {lastStartedFlow ? (
        <Alert
          showIcon
          style={{ marginBottom: 16 }}
          type="success"
          message={formatMessage(
            'pages.integrations.oauth.messages.callbackFlowAdmission',
            'OAuth callback flow admission',
          )}
          description={lastStartedFlow.authorizationUrl}
        />
      ) : null}
      <ProTable<OAuthTokenSummary>
        rowKey="id"
        search={false}
        options={false}
        loading={loading}
        toolBarRender={() => [
          <Typography.Text key="live-policy" type="secondary">
            {formatMessage(
              'pages.integrations.oauth.policy.liveInventory',
              'Live OAuth token inventory',
            )}
          </Typography.Text>,
          <Button
            disabled={!canManageOAuthIntegration || providers.length === 0}
            key="start-flow"
            loading={startingFlow}
            onClick={() => void startFlow()}
            title={OAUTH_MANAGE_PERMISSION_MARKER}
            type="primary"
          >
            {formatMessage(
              'pages.integrations.oauth.actions.startFlow',
              'Start OAuth flow',
            )}
          </Button>,
          filterToolbar,
          <CurrentPageExportButton<OAuthTokenSummary>
            key="export"
            columns={exportColumns}
            resource="integration-oauth-tokens"
            rows={filteredRows}
          />,
        ]}
        pagination={false}
        dataSource={filteredRows}
        columns={columns}
      />
      <ProTable<OAuthFlowSummary>
        rowKey="id"
        search={false}
        options={false}
        loading={loading}
        toolBarRender={() => [
          <Typography.Text key="flow-policy" type="secondary">
            {formatMessage(
              'pages.integrations.oauth.policy.flowLedger',
              'State validation flow ledger',
            )}
          </Typography.Text>,
          flowFilterToolbar,
        ]}
        pagination={false}
        dataSource={filteredFlows}
        columns={flowColumns}
      />
      <ProTable<OAuthCallbackAuditSummary>
        rowKey="id"
        search={false}
        options={false}
        loading={loading}
        toolBarRender={() => [
          <Typography.Text key="audit-policy" type="secondary">
            {formatMessage(
              'pages.integrations.oauth.policy.auditTrail',
              'OAuth callback audit trail',
            )}
          </Typography.Text>,
          auditFilterToolbar,
        ]}
        pagination={false}
        dataSource={filteredAudits}
        columns={auditColumns}
      />
      <ReadOnlyDetailDrawer
        fields={[
          {
            label: formatMessage(
              'pages.integrations.oauth.fields.tokenId',
              'Token ID',
            ),
            value: selected?.id,
          },
          {
            label: formatMessage(
              'pages.integrations.oauth.fields.provider',
              'Provider',
            ),
            value: selected?.providerCode,
          },
          {
            label: formatMessage(
              'pages.integrations.oauth.fields.subjectType',
              'Subject Type',
            ),
            value: selected?.subjectType,
          },
          {
            label: formatMessage(
              'pages.integrations.oauth.fields.subjectId',
              'Subject ID',
            ),
            value: selected?.subjectId,
          },
          {
            label: formatMessage(
              'pages.integrations.oauth.fields.providerAccount',
              'Provider Account',
            ),
            value: selected?.providerAccountId,
          },
          {
            label: formatMessage(
              'pages.integrations.oauth.fields.status',
              'Status',
            ),
            value: selected?.status,
          },
          {
            label: formatMessage(
              'pages.integrations.oauth.fields.scopes',
              'Scopes',
            ),
            value: selected?.scopes.join(', '),
          },
          {
            label: formatMessage(
              'pages.integrations.oauth.fields.expiresAt',
              'Expires At',
            ),
            value: selected?.expiresAt,
          },
          {
            label: formatMessage(
              'pages.integrations.oauth.fields.lastRotatedAt',
              'Last Rotated At',
            ),
            value: selected?.lastRotatedAt,
          },
          {
            label: formatMessage(
              'pages.integrations.oauth.fields.revokedAt',
              'Revoked At',
            ),
            value: selected?.revokedAt,
          },
          {
            label: formatMessage(
              'pages.integrations.oauth.fields.revokedBy',
              'Revoked By',
            ),
            value: selected?.revokedBy,
          },
          {
            label: formatMessage(
              'pages.integrations.oauth.fields.revokeReason',
              'Revoke Reason',
            ),
            value: selected?.revokeReason,
          },
          {
            label: formatMessage(
              'pages.integrations.oauth.fields.accessTokenRef',
              'Access Token Ref',
            ),
            value: selected?.accessTokenRef,
            sensitive: true,
          },
          {
            label: formatMessage(
              'pages.integrations.oauth.fields.refreshTokenRef',
              'Refresh Token Ref',
            ),
            value: selected?.refreshTokenRef,
            sensitive: true,
          },
        ]}
        jsonSections={[
          {
            title: formatMessage(
              'pages.integrations.oauth.json.callbackContract',
              'OAuth Callback Contract',
            ),
            value: callbackContract ?? {},
          },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={
          selected?.id ??
          formatMessage(
            'pages.integrations.oauth.detail.title',
            'OAuth Token Detail',
          )
        }
      />
    </PageContainer>
  );
}
