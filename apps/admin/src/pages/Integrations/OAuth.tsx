import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createIntegrationFixtures,
  findOAuthTokenFixture,
  type OAuthCallbackContractSummary,
  type OAuthTokenInventorySummary,
  type OAuthTokenSummary,
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
  getOpenCoreOAuthTokenSummary,
  listOpenCoreOAuthTokens,
  revokeOpenCoreOAuthToken,
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

const fixtures = createIntegrationFixtures();
const fallbackTokens = fixtures.oauthTokens;
const fallbackSummary = fixtures.oauthTokenSummary;
const fallbackContract = fixtures.oauthContract;
const OAUTH_MANAGE_PERMISSION_MARKER = 'integration:oauth:manage';

const exportColumns: CurrentPageExportColumn<OAuthTokenSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Provider', dataIndex: 'providerCode' },
  { title: 'Subject Type', dataIndex: 'subjectType' },
  { title: 'Subject ID', dataIndex: 'subjectId' },
  { title: 'Provider Account', dataIndex: 'providerAccountId' },
  { title: 'Scopes', renderText: (record) => record.scopes.join(', ') },
  { title: 'Status', dataIndex: 'status' },
  { title: 'Expires At', dataIndex: 'expiresAt' },
  { title: 'Last Rotated At', dataIndex: 'lastRotatedAt' },
  { title: 'Revoked At', dataIndex: 'revokedAt' },
  { title: 'Access Token Ref', dataIndex: 'accessTokenRef', sensitive: true },
  { title: 'Refresh Token Ref', dataIndex: 'refreshTokenRef', sensitive: true },
];

const searchFields: CurrentPageSearchField<OAuthTokenSummary>[] = [
  'id',
  'providerCode',
  'subjectType',
  'subjectId',
  'providerAccountId',
  (record) => record.scopes,
  'status',
];

function statusColor(status: OAuthTokenSummary['status']): string {
  if (status === 'active') return 'green';
  if (status === 'expired') return 'gold';
  return 'red';
}

export default function OAuthIntegrationPage() {
  const [rows, setRows] =
    useState<readonly OAuthTokenSummary[]>(fallbackTokens);
  const [summary, setSummary] =
    useState<OAuthTokenInventorySummary>(fallbackSummary);
  const [callbackContract, setCallbackContract] =
    useState<OAuthCallbackContractSummary>(fallbackContract);
  const [selected, setSelected] = useState<OAuthTokenSummary>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [revokingId, setRevokingId] = useState<string>();

  const filterOptions: CurrentPageFilterOption<OAuthTokenSummary>[] = useMemo(
    () => [
      {
        key: 'providerCode',
        options: createCurrentPageFilterOptions(rows, 'providerCode'),
        placeholder: 'Provider',
        predicate: (record, value) => record.providerCode === value,
      },
      {
        key: 'status',
        options: createCurrentPageFilterOptions(rows, 'status'),
        placeholder: 'Status',
        predicate: (record, value) => record.status === value,
      },
    ],
    [rows],
  );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<OAuthTokenSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search OAuth tokens',
      selectFilters: filterOptions,
    });

  const loadTokens = useCallback(async () => {
    setLoading(true);
    try {
      const [nextSummary, nextRows, nextContract] = await Promise.all([
        getOpenCoreOAuthTokenSummary(),
        listOpenCoreOAuthTokens(),
        getOpenCoreOAuthCallbackContract(),
      ]);
      setSummary(nextSummary);
      setRows(nextRows);
      setCallbackContract(nextContract);
      setLoadError(undefined);
    } catch (error: unknown) {
      setSummary(fallbackSummary);
      setRows(fallbackTokens);
      setCallbackContract(fallbackContract);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load OAuth token inventory.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTokens();
  }, [loadTokens]);

  const openDetail = (id: string) => {
    setSelected(
      rows.find((record) => record.id === id) ?? findOAuthTokenFixture(id),
    );
  };

  const confirmRevoke = (record: OAuthTokenSummary) => {
    Modal.confirm({
      title: `Revoke token ${record.id}?`,
      content:
        'The token reference will be marked revoked and excluded from active OAuth token inventory.',
      okButtonProps: { danger: true },
      okText: 'Revoke token',
      onOk: async () => {
        setRevokingId(record.id);
        try {
          const revoked = await revokeOpenCoreOAuthToken(record.id, {
            reason: 'Manual revoke from Admin OAuth token inventory',
          });
          setSelected(revoked);
          message.success('OAuth token revoked');
          await loadTokens();
        } finally {
          setRevokingId(undefined);
        }
      },
    });
  };

  const columns: ProColumns<OAuthTokenSummary>[] = [
    {
      title: 'Token',
      dataIndex: 'id',
      render: (_, record) => (
        <Typography.Link onClick={() => openDetail(record.id)}>
          {record.id}
        </Typography.Link>
      ),
    },
    { title: 'Provider', dataIndex: 'providerCode' },
    { title: 'Subject', dataIndex: 'subjectId' },
    { title: 'Provider Account', dataIndex: 'providerAccountId' },
    {
      title: 'Scopes',
      renderText: (_, record) => record.scopes.join(', '),
    },
    {
      title: 'Status',
      render: (_, record) => (
        <Tag color={statusColor(record.status)}>{record.status}</Tag>
      ),
    },
    { title: 'Expires At', dataIndex: 'expiresAt' },
    { title: 'Last Rotated At', dataIndex: 'lastRotatedAt' },
    {
      title: 'Action',
      valueType: 'option',
      render: (_, record) => [
        <a key="detail" onClick={() => openDetail(record.id)}>
          Detail
        </a>,
        <Button
          danger
          disabled={record.status === 'revoked'}
          key="revoke"
          loading={revokingId === record.id}
          onClick={() => confirmRevoke(record)}
          size="small"
          title={OAUTH_MANAGE_PERMISSION_MARKER}
          type="link"
        >
          Revoke token
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer title="OAuth" subTitle="S12 Integrations">
      {loadError ? (
        <Alert
          showIcon
          style={{ marginBottom: 16 }}
          type="warning"
          message="Using fallback OAuth token inventory data"
          description={loadError}
          action={<Button onClick={() => void loadTokens()}>Reload</Button>}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="OAuth token inventory" value={summary.total} />
        <Statistic title="Active tokens" value={summary.active} />
        <Statistic title="Expired tokens" value={summary.expired} />
        <Statistic title="Revoked tokens" value={summary.revoked} />
        <Statistic
          title="Token lifecycle summary"
          value={summary.providers}
          suffix="provider(s)"
        />
      </Space>
      <ProTable<OAuthTokenSummary>
        rowKey="id"
        search={false}
        options={false}
        loading={loading}
        toolBarRender={() => [
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
      <ReadOnlyDetailDrawer
        fields={[
          { label: 'Token ID', value: selected?.id },
          { label: 'Provider', value: selected?.providerCode },
          { label: 'Subject Type', value: selected?.subjectType },
          { label: 'Subject ID', value: selected?.subjectId },
          { label: 'Provider Account', value: selected?.providerAccountId },
          { label: 'Status', value: selected?.status },
          { label: 'Scopes', value: selected?.scopes.join(', ') },
          { label: 'Expires At', value: selected?.expiresAt },
          { label: 'Last Rotated At', value: selected?.lastRotatedAt },
          { label: 'Revoked At', value: selected?.revokedAt },
          { label: 'Revoked By', value: selected?.revokedBy },
          { label: 'Revoke Reason', value: selected?.revokeReason },
          {
            label: 'Access Token Ref',
            value: selected?.accessTokenRef,
            sensitive: true,
          },
          {
            label: 'Refresh Token Ref',
            value: selected?.refreshTokenRef,
            sensitive: true,
          },
        ]}
        jsonSections={[
          {
            title: 'OAuth Callback Contract',
            value: callbackContract,
          },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={selected?.id ?? 'OAuth Token Detail'}
      />
    </PageContainer>
  );
}
