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
const rows = fixtures.mailTemplates;
const exportColumns: CurrentPageExportColumn<IntegrationTemplateSummary>[] = [
  { title: 'Code', dataIndex: 'code' },
  { title: 'Channel', dataIndex: 'channel' },
  { title: 'Name', dataIndex: 'name' },
  { title: 'Subject', dataIndex: 'subject' },
  { title: 'Enabled', dataIndex: 'enabled' },
  { title: 'Body', dataIndex: 'body', sensitive: true },
];
const searchFields: CurrentPageSearchField<IntegrationTemplateSummary>[] = [
  'code',
  'channel',
  'name',
  'subject',
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

export default function MailIntegrationPage() {
  const [selected, setSelected] = useState<IntegrationTemplateSummary>();
  const [selectedOutbox, setSelectedOutbox] =
    useState<IntegrationOutboxSummary>();
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<IntegrationTemplateSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search mail templates',
      selectFilters: filterOptions,
    });

  const openDetail = (code: string) => {
    const template = findIntegrationTemplateFixture('mail', code);
    const outbox = fixtures.outbox.find(
      (message) => message.channel === 'mail' && message.templateCode === code,
    );
    setSelected(template);
    setSelectedOutbox(
      outbox ? findIntegrationOutboxFixture('mail', outbox.id) : undefined,
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
    { title: 'Subject', dataIndex: 'subject' },
    {
      title: 'Enabled',
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? 'enabled' : 'disabled'}
        </Tag>
      ),
    },
    {
      title: 'Send Policy',
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? 'preview/send allowed' : 'send blocked'}
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
    <PageContainer title="Mail" subTitle="S12 Integrations">
      <ProTable<IntegrationTemplateSummary>
        rowKey="code"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<IntegrationTemplateSummary>
            key="export"
            columns={exportColumns}
            resource="integration-mail-templates"
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
          { label: 'Subject', value: selected?.subject },
          {
            label: 'Enabled',
            value: selected?.enabled ? 'enabled' : 'disabled',
          },
          {
            label: 'Send Policy',
            value: selected?.enabled ? 'preview/send allowed' : 'send blocked',
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
        title={selected?.name ?? 'Mail Template Detail'}
      />
    </PageContainer>
  );
}
