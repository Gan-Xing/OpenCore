import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createIntegrationFixtures,
  findIntegrationOutboxFixture,
  findIntegrationProviderFixture,
  type IntegrationOutboxSummary,
  type IntegrationProviderSummary,
} from '@opencore/sdk';
import { Space, Statistic, Tag, Typography } from 'antd';
import { useState } from 'react';
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
const rows = fixtures.providers;
const summary = fixtures.summary;
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
const filterOptions: CurrentPageFilterOption<IntegrationProviderSummary>[] = [
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
];

export default function ProvidersPage() {
  const [selected, setSelected] = useState<IntegrationProviderSummary>();
  const [selectedOutbox, setSelectedOutbox] =
    useState<IntegrationOutboxSummary>();
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<IntegrationProviderSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search providers',
      selectFilters: filterOptions,
    });

  const openDetail = (code: string) => {
    const provider = findIntegrationProviderFixture(code);
    const outbox = fixtures.outbox.find(
      (message) => message.providerCode === code,
    );
    setSelected(provider);
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
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title="Enabled providers"
          value={summary.providers.enabled}
        />
        <Statistic
          title="Degraded providers"
          value={summary.providers.degraded}
        />
        <Statistic title="Queued mail" value={summary.mailOutbox.queued} />
        <Statistic
          title="Signed callback contract"
          value={signedCallbackContract.algorithm}
        />
        <Statistic
          title="Design topics"
          value={summary.designs.designOnlyTopics}
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
            label: 'Outbox Policy',
            value: selected?.enabled ? 'enqueue allowed' : 'enqueue blocked',
          },
          {
            label: 'Signed Callback Contract',
            value: signedCallbackContract.algorithm,
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
            title: 'Sample Outbox Payload',
            value: selectedOutbox?.payload ?? {},
          },
        ]}
        onClose={() => {
          setSelected(undefined);
          setSelectedOutbox(undefined);
        }}
        open={Boolean(selected)}
        title={selected?.name ?? 'Provider Detail'}
      />
    </PageContainer>
  );
}
