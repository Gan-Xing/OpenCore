import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createCollaborationFixtures,
  findApprovalLiteFixture,
  type ApprovalLiteSummary,
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

const rows = createCollaborationFixtures().approvals;
const exportColumns: CurrentPageExportColumn<ApprovalLiteSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Title', dataIndex: 'title' },
  { title: 'Requester', dataIndex: 'requester' },
  { title: 'Approver', dataIndex: 'approver' },
  { title: 'Business Type', dataIndex: 'businessType' },
  { title: 'Business ID', dataIndex: 'businessId' },
  { title: 'Status', dataIndex: 'status' },
  { title: 'Created At', dataIndex: 'createdAt' },
  { title: 'Comment', dataIndex: 'comment', sensitive: true },
];
const searchFields: CurrentPageSearchField<ApprovalLiteSummary>[] = [
  'title',
  'requester',
  'approver',
  'businessType',
  'businessId',
];
const filterOptions: CurrentPageFilterOption<ApprovalLiteSummary>[] = [
  {
    key: 'status',
    options: createCurrentPageFilterOptions(rows, 'status'),
    placeholder: 'Status',
    predicate: (record, value) => record.status === value,
  },
  {
    key: 'requester',
    options: createCurrentPageFilterOptions(rows, 'requester'),
    placeholder: 'Requester',
    predicate: (record, value) => record.requester === value,
  },
  {
    key: 'approver',
    options: createCurrentPageFilterOptions(rows, 'approver'),
    placeholder: 'Approver',
    predicate: (record, value) => record.approver === value,
  },
];

export default function ApprovalsPage() {
  const [selected, setSelected] = useState<ApprovalLiteSummary>();
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<ApprovalLiteSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search approvals',
      selectFilters: filterOptions,
    });

  const openDetail = (id: string) => {
    setSelected(findApprovalLiteFixture(id));
  };

  const columns: ProColumns<ApprovalLiteSummary>[] = [
    {
      title: 'Title',
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => openDetail(record.id)}>
          {record.title}
        </Typography.Link>
      ),
    },
    { title: 'Requester', dataIndex: 'requester' },
    { title: 'Approver', dataIndex: 'approver' },
    { title: 'Business', dataIndex: 'businessType' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (_, record) => <Tag color="cyan">{record.status}</Tag>,
    },
    {
      title: 'Action Policy',
      render: (_, record) => (
        <Tag color={record.status === 'pending' ? 'green' : 'default'}>
          {record.status === 'pending' ? 'approve/reject' : 'terminal'}
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
    <PageContainer title="Approval Lite" subTitle="S10 Collaboration">
      <ProTable<ApprovalLiteSummary>
        rowKey="id"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<ApprovalLiteSummary>
            key="export"
            columns={exportColumns}
            resource="collaboration-approvals"
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
          { label: 'Requester', value: selected?.requester },
          { label: 'Approver', value: selected?.approver },
          { label: 'Business Type', value: selected?.businessType },
          { label: 'Business ID', value: selected?.businessId },
          { label: 'Status', value: selected?.status },
          { label: 'Comment', value: selected?.comment },
          { label: 'Decided At', value: selected?.decidedAt },
          { label: 'Created At', value: selected?.createdAt },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        timeline={selected?.timeline}
        title={selected?.title ?? 'Approval Detail'}
      />
    </PageContainer>
  );
}
