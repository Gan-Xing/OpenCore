import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createCollaborationFixtures,
  findNoticeFixture,
  type NoticeSummary,
} from '@opencore/sdk';
import { Tag, Typography } from 'antd';
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

const rows = createCollaborationFixtures().notices;
const exportColumns: CurrentPageExportColumn<NoticeSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Title', dataIndex: 'title' },
  { title: 'Status', dataIndex: 'status' },
  {
    title: 'Audience',
    renderText: (record) => record.targetAudience.join(', '),
  },
  { title: 'Created By', dataIndex: 'createdBy' },
  { title: 'Created At', dataIndex: 'createdAt' },
  { title: 'Body', dataIndex: 'body', sensitive: true },
];
const searchFields: CurrentPageSearchField<NoticeSummary>[] = [
  'title',
  'createdBy',
  (record) => record.targetAudience,
];
const filterOptions: CurrentPageFilterOption<NoticeSummary>[] = [
  {
    key: 'status',
    options: createCurrentPageFilterOptions(rows, 'status'),
    placeholder: 'Status',
    predicate: (record, value) => record.status === value,
  },
  {
    key: 'createdBy',
    options: createCurrentPageFilterOptions(rows, 'createdBy'),
    placeholder: 'Created by',
    predicate: (record, value) => record.createdBy === value,
  },
];

export default function NoticesPage() {
  const [selected, setSelected] = useState<NoticeSummary>();
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<NoticeSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search notices',
      selectFilters: filterOptions,
    });

  const openDetail = (id: string) => {
    setSelected(findNoticeFixture(id));
  };

  const columns: ProColumns<NoticeSummary>[] = [
    {
      title: 'Title',
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => openDetail(record.id)}>
          {record.title}
        </Typography.Link>
      ),
    },
    { title: 'Created By', dataIndex: 'createdBy' },
    {
      title: 'Audience',
      dataIndex: 'targetAudience',
      renderText: (_, record) => record.targetAudience.join(', '),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (_, record) => <Tag color="gold">{record.status}</Tag>,
    },
    {
      title: 'Action Policy',
      render: (_, record) => (
        <Tag color={record.status === 'draft' ? 'green' : 'default'}>
          {record.status === 'draft' ? 'publish/archive' : 'archive guarded'}
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
    <PageContainer title="Notices" subTitle="S10 Collaboration">
      <ProTable<NoticeSummary>
        rowKey="id"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<NoticeSummary>
            key="export"
            columns={exportColumns}
            resource="collaboration-notices"
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
          { label: 'Created By', value: selected?.createdBy },
          { label: 'Status', value: selected?.status },
          {
            label: 'Audience',
            value: selected?.targetAudience.join(', '),
          },
          { label: 'Valid From', value: selected?.validFrom },
          { label: 'Valid To', value: selected?.validTo },
          { label: 'Published At', value: selected?.publishedAt },
          { label: 'Archived At', value: selected?.archivedAt },
          { label: 'Created At', value: selected?.createdAt },
          { label: 'Body', value: selected?.body },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={selected?.title ?? 'Notice Detail'}
      />
    </PageContainer>
  );
}
