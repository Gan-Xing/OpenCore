import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createCollaborationFixtures,
  findTodoFixture,
  type TodoSummary,
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

const rows = createCollaborationFixtures().todos;
const exportColumns: CurrentPageExportColumn<TodoSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Title', dataIndex: 'title' },
  { title: 'Source', dataIndex: 'sourceType' },
  { title: 'Business Type', dataIndex: 'businessType' },
  { title: 'Business ID', dataIndex: 'businessId' },
  { title: 'Assignee', dataIndex: 'assignee' },
  { title: 'Status', dataIndex: 'status' },
  { title: 'Created At', dataIndex: 'createdAt' },
  { title: 'Description', dataIndex: 'description', sensitive: true },
];
const searchFields: CurrentPageSearchField<TodoSummary>[] = [
  'title',
  'sourceType',
  'businessType',
  'businessId',
  'assignee',
];
const filterOptions: CurrentPageFilterOption<TodoSummary>[] = [
  {
    key: 'status',
    options: createCurrentPageFilterOptions(rows, 'status'),
    placeholder: 'Status',
    predicate: (record, value) => record.status === value,
  },
  {
    key: 'assignee',
    options: createCurrentPageFilterOptions(rows, 'assignee'),
    placeholder: 'Assignee',
    predicate: (record, value) => record.assignee === value,
  },
  {
    key: 'sourceType',
    options: createCurrentPageFilterOptions(rows, 'sourceType'),
    placeholder: 'Source',
    predicate: (record, value) => record.sourceType === value,
  },
];

export default function TodosPage() {
  const [selected, setSelected] = useState<TodoSummary>();
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<TodoSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search todos',
      selectFilters: filterOptions,
    });

  const openDetail = (id: string) => {
    setSelected(findTodoFixture(id));
  };

  const columns: ProColumns<TodoSummary>[] = [
    {
      title: 'Title',
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => openDetail(record.id)}>
          {record.title}
        </Typography.Link>
      ),
    },
    { title: 'Source', dataIndex: 'sourceType' },
    { title: 'Assignee', dataIndex: 'assignee' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (_, record) => <Tag color="purple">{record.status}</Tag>,
    },
    {
      title: 'Timeline',
      dataIndex: 'timeline',
      renderText: (_, record) => `${record.timeline.length} events`,
    },
    {
      title: 'Action Policy',
      render: (_, record) => (
        <Tag
          color={
            record.status === 'completed' || record.status === 'canceled'
              ? 'default'
              : 'green'
          }
        >
          {record.status === 'completed' || record.status === 'canceled'
            ? 'terminal'
            : 'assign/complete/cancel'}
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
    <PageContainer title="Todos" subTitle="S10 Collaboration">
      <ProTable<TodoSummary>
        rowKey="id"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<TodoSummary>
            key="export"
            columns={exportColumns}
            resource="collaboration-todos"
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
          { label: 'Source', value: selected?.sourceType },
          { label: 'Business Type', value: selected?.businessType },
          { label: 'Business ID', value: selected?.businessId },
          { label: 'Assignee', value: selected?.assignee },
          { label: 'Status', value: selected?.status },
          { label: 'Completed At', value: selected?.completedAt },
          { label: 'Canceled At', value: selected?.canceledAt },
          { label: 'Created At', value: selected?.createdAt },
          { label: 'Description', value: selected?.description },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        timeline={selected?.timeline}
        title={selected?.title ?? 'Todo Detail'}
      />
    </PageContainer>
  );
}
