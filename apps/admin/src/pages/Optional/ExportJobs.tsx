import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createOperationsFixtures,
  findExportJobDesignFixture,
  type ExportJobDesignSummary,
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

const rows = [createOperationsFixtures().exportJobDesign];
const exportColumns: CurrentPageExportColumn<ExportJobDesignSummary>[] = [
  { title: 'Resource', dataIndex: 'resource' },
  { title: 'Status', dataIndex: 'status' },
  {
    title: 'Required Bindings',
    renderText: (record) => record.requiredBindings.join(', '),
  },
  {
    title: 'Safety Checks',
    renderText: (record) => record.safetyChecks.join(', '),
  },
  { title: 'Runbook', dataIndex: 'runbook' },
];
const searchFields: CurrentPageSearchField<ExportJobDesignSummary>[] = [
  'resource',
  'status',
  'runbook',
  (record) => record.requiredBindings,
  (record) => record.safetyChecks,
];
const filterOptions: CurrentPageFilterOption<ExportJobDesignSummary>[] = [
  {
    key: 'status',
    options: createCurrentPageFilterOptions(rows, 'status'),
    placeholder: 'Status',
    predicate: (record, value) => record.status === value,
  },
];

export default function ExportJobsPage() {
  const [selected, setSelected] = useState<ExportJobDesignSummary>();
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<ExportJobDesignSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search export design',
      selectFilters: filterOptions,
    });

  const openDetail = (resource: string) => {
    setSelected(findExportJobDesignFixture(resource));
  };

  const columns: ProColumns<ExportJobDesignSummary>[] = [
    {
      title: 'Resource',
      dataIndex: 'resource',
      render: (_, record) => (
        <Typography.Link onClick={() => openDetail(record.resource)}>
          {record.resource}
        </Typography.Link>
      ),
    },
    {
      title: 'Status',
      render: (_, record) => <Tag color="blue">{record.status}</Tag>,
    },
    {
      title: 'Bindings',
      renderText: (_, record) => record.requiredBindings.join(', '),
    },
    { title: 'Runbook', dataIndex: 'runbook' },
    {
      title: 'Action',
      valueType: 'option',
      render: (_, record) => (
        <a onClick={() => openDetail(record.resource)}>Detail</a>
      ),
    },
  ];

  return (
    <PageContainer title="Export Jobs" subTitle="S11 Optional">
      <ProTable<ExportJobDesignSummary>
        rowKey="resource"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<ExportJobDesignSummary>
            key="export"
            columns={exportColumns}
            resource="optional-export-jobs"
            rows={filteredRows}
          />,
        ]}
        pagination={false}
        dataSource={filteredRows}
        columns={columns}
      />
      <ReadOnlyDetailDrawer
        fields={[
          { label: 'Resource', value: selected?.resource },
          { label: 'Status', value: selected?.status },
          {
            label: 'Required Bindings',
            value: selected?.requiredBindings.join(', '),
          },
          {
            label: 'Safety Checks',
            value: selected?.safetyChecks.join(', '),
          },
          { label: 'Runbook', value: selected?.runbook },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={selected?.resource ?? 'Export Job Detail'}
      />
    </PageContainer>
  );
}
