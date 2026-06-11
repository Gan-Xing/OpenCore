import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createCollaborationFixtures,
  findMessageFixture,
  type MessageSummary,
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

const fixtures = createCollaborationFixtures();
const rows = fixtures.messages;
const summary = fixtures.summary;
const exportColumns: CurrentPageExportColumn<MessageSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Title', dataIndex: 'title' },
  { title: 'Sender', dataIndex: 'sender' },
  { title: 'Recipient', dataIndex: 'recipient' },
  { title: 'Status', dataIndex: 'status' },
  { title: 'Business Type', dataIndex: 'businessType' },
  { title: 'Business ID', dataIndex: 'businessId' },
  { title: 'Created At', dataIndex: 'createdAt' },
  { title: 'Body', dataIndex: 'body', sensitive: true },
];
const searchFields: CurrentPageSearchField<MessageSummary>[] = [
  'title',
  'sender',
  'recipient',
  'businessType',
  'businessId',
];
const filterOptions: CurrentPageFilterOption<MessageSummary>[] = [
  {
    key: 'status',
    options: createCurrentPageFilterOptions(rows, 'status'),
    placeholder: 'Status',
    predicate: (record, value) => record.status === value,
  },
  {
    key: 'recipient',
    options: createCurrentPageFilterOptions(rows, 'recipient'),
    placeholder: 'Recipient',
    predicate: (record, value) => record.recipient === value,
  },
];

export default function MessagesPage() {
  const [selected, setSelected] = useState<MessageSummary>();
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<MessageSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search messages',
      selectFilters: filterOptions,
    });

  const openDetail = (id: string) => {
    setSelected(findMessageFixture(id));
  };

  const columns: ProColumns<MessageSummary>[] = [
    {
      title: 'Title',
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => openDetail(record.id)}>
          {record.title}
        </Typography.Link>
      ),
    },
    { title: 'Sender', dataIndex: 'sender' },
    { title: 'Recipient', dataIndex: 'recipient' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (_, record) => <Tag color="blue">{record.status}</Tag>,
    },
    { title: 'Business', dataIndex: 'businessType' },
    {
      title: 'Action Policy',
      render: (_, record) => (
        <Tag color={record.status === 'unread' ? 'green' : 'default'}>
          {record.status === 'unread' ? 'read/archive/delete' : 'guarded'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      valueType: 'option',
      render: (_, record) => (
        <a onClick={() => openDetail(record.id)}>Detail</a>
      ),
    },
  ];

  return (
    <PageContainer title="Messages" subTitle="S10 Collaboration">
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="Unread" value={summary.messages.unread} />
        <Statistic
          title="Published notices"
          value={summary.notices.published}
        />
        <Statistic title="Pending todos" value={summary.todos.pending} />
        <Statistic
          title="Pending approvals"
          value={summary.approvals.pending}
        />
      </Space>
      <ProTable<MessageSummary>
        rowKey="id"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<MessageSummary>
            key="export"
            columns={exportColumns}
            resource="collaboration-messages"
            rows={filteredRows}
          />,
        ]}
        pagination={false}
        dataSource={filteredRows}
        columns={columns}
      />
      <ReadOnlyDetailDrawer
        fields={[
          { label: 'Title', value: selected?.title },
          { label: 'Sender', value: selected?.sender },
          { label: 'Recipient', value: selected?.recipient },
          { label: 'Status', value: selected?.status },
          { label: 'Business Type', value: selected?.businessType },
          { label: 'Business ID', value: selected?.businessId },
          { label: 'Read At', value: selected?.readAt },
          { label: 'Archived At', value: selected?.archivedAt },
          { label: 'Created At', value: selected?.createdAt },
          { label: 'Body', value: selected?.body },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={selected?.title ?? 'Message Detail'}
      />
    </PageContainer>
  );
}
