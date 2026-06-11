import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createIntegrationFixtures,
  findIntegrationOutboxFixture,
  findIntegrationTemplateFixture,
  type IntegrationOutboxSummary,
  type IntegrationTemplateSummary,
} from '@opencore/sdk';
import { Tag, Typography } from 'antd';
import { useState } from 'react';
import {
  CurrentPageExportButton,
  type CurrentPageExportColumn,
} from '../shared/CurrentPageExportButton';
import {
  useCurrentPageFilters,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../shared/CurrentPageFilters';
import { ReadOnlyDetailDrawer } from '../shared/ReadOnlyDetailDrawer';

const fixtures = createIntegrationFixtures();
const rows = fixtures.smsTemplates;
const exportColumns: CurrentPageExportColumn<IntegrationTemplateSummary>[] = [
  { title: 'Code', dataIndex: 'code' },
  { title: 'Channel', dataIndex: 'channel' },
  { title: 'Name', dataIndex: 'name' },
  { title: 'Enabled', dataIndex: 'enabled' },
  { title: 'Body', dataIndex: 'body', sensitive: true },
];
const searchFields: CurrentPageSearchField<IntegrationTemplateSummary>[] = [
  'code',
  'channel',
  'name',
];
const filterOptions: CurrentPageFilterOption<IntegrationTemplateSummary>[] = [
  {
    key: 'enabled',
    options: [
      { label: 'enabled', value: 'true' },
      { label: 'disabled', value: 'false' },
    ],
    placeholder: 'Enabled',
    predicate: (record, value) => record.enabled === (value === 'true'),
  },
];

export default function SmsIntegrationPage() {
  const [selected, setSelected] = useState<IntegrationTemplateSummary>();
  const [selectedOutbox, setSelectedOutbox] =
    useState<IntegrationOutboxSummary>();
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<IntegrationTemplateSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search SMS templates',
      selectFilters: filterOptions,
    });

  const openDetail = (code: string) => {
    const template = findIntegrationTemplateFixture('sms', code);
    const outbox = fixtures.outbox.find(
      (message) => message.channel === 'sms' && message.templateCode === code,
    );
    setSelected(template);
    setSelectedOutbox(
      outbox ? findIntegrationOutboxFixture('sms', outbox.id) : undefined,
    );
  };

  const columns: ProColumns<IntegrationTemplateSummary>[] = [
    {
      title: 'Code',
      dataIndex: 'code',
      render: (_, record) => (
        <Typography.Link onClick={() => openDetail(record.code)}>
          {record.code}
        </Typography.Link>
      ),
    },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Body', dataIndex: 'body' },
    {
      title: 'Safety',
      render: () => <Tag color="orange">rate limit + OTP policy</Tag>,
    },
    {
      title: 'Send Policy',
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? 'phone + OTP guarded' : 'send blocked'}
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
    <PageContainer title="SMS" subTitle="S12 Integrations">
      <ProTable<IntegrationTemplateSummary>
        rowKey="code"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<IntegrationTemplateSummary>
            key="export"
            columns={exportColumns}
            resource="integration-sms-templates"
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
          { label: 'Channel', value: selected?.channel },
          { label: 'Name', value: selected?.name },
          {
            label: 'Enabled',
            value: selected?.enabled ? 'enabled' : 'disabled',
          },
          { label: 'Safety', value: 'rate limit + OTP policy' },
          {
            label: 'Send Policy',
            value: selected?.enabled ? 'phone + OTP guarded' : 'send blocked',
          },
          { label: 'Sample Outbox', value: selectedOutbox?.id },
          { label: 'Body', value: selected?.body },
        ]}
        jsonSections={[
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
        title={selected?.name ?? 'SMS Template Detail'}
      />
    </PageContainer>
  );
}
