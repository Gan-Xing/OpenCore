import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createIntegrationFixtures,
  findIntegrationDesignFixture,
  type IntegrationDesignSummary,
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

const rows = createIntegrationFixtures().designs.filter(
  (design) => design.topic === 'pay',
);
const exportColumns: CurrentPageExportColumn<IntegrationDesignSummary>[] = [
  { title: 'Topic', dataIndex: 'topic' },
  { title: 'Status', dataIndex: 'status' },
  { title: 'Boundaries', renderText: (record) => record.boundaries.join(', ') },
  { title: 'Document', dataIndex: 'documentPath' },
];
const searchFields: CurrentPageSearchField<IntegrationDesignSummary>[] = [
  'topic',
  'status',
  'documentPath',
  (record) => record.boundaries,
];
const filterOptions: CurrentPageFilterOption<IntegrationDesignSummary>[] = [
  {
    key: 'status',
    options: createCurrentPageFilterOptions(rows, 'status'),
    placeholder: 'Status',
    predicate: (record, value) => record.status === value,
  },
];

export default function BillingDesignPage() {
  const [selected, setSelected] = useState<IntegrationDesignSummary>();
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<IntegrationDesignSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search payment design',
      selectFilters: filterOptions,
    });

  const openDetail = (topic: IntegrationDesignSummary['topic']) => {
    setSelected(findIntegrationDesignFixture(topic));
  };

  const columns: ProColumns<IntegrationDesignSummary>[] = [
    {
      title: 'Topic',
      dataIndex: 'topic',
      render: (_, record) => (
        <Typography.Link onClick={() => openDetail(record.topic)}>
          {record.topic}
        </Typography.Link>
      ),
    },
    {
      title: 'Status',
      render: (_, record) => <Tag color="blue">{record.status}</Tag>,
    },
    {
      title: 'Boundaries',
      renderText: (_, record) => record.boundaries.join(', '),
    },
    { title: 'Document', dataIndex: 'documentPath' },
    {
      title: 'Action',
      valueType: 'option',
      render: (_, record) => (
        <a onClick={() => openDetail(record.topic)}>Detail</a>
      ),
    },
  ];

  return (
    <PageContainer title="Payment Design" subTitle="S12 Integrations">
      <ProTable<IntegrationDesignSummary>
        rowKey="topic"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<IntegrationDesignSummary>
            key="export"
            columns={exportColumns}
            resource="integration-payment-design"
            rows={filteredRows}
          />,
        ]}
        pagination={false}
        dataSource={filteredRows}
        columns={columns}
      />
      <ReadOnlyDetailDrawer
        fields={[
          { label: 'Topic', value: selected?.topic },
          { label: 'Status', value: selected?.status },
          { label: 'Boundaries', value: selected?.boundaries.join(', ') },
          { label: 'Document', value: selected?.documentPath },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title="Payment Design Detail"
      />
    </PageContainer>
  );
}
