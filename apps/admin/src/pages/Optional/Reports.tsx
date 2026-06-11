import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createOperationsFixtures,
  findReportFixture,
  type ReportDefinitionSummary,
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

const rows = createOperationsFixtures().reports;
const exportColumns: CurrentPageExportColumn<ReportDefinitionSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Code', dataIndex: 'code' },
  { title: 'Name', dataIndex: 'name' },
  { title: 'Owner', dataIndex: 'owner' },
  { title: 'Enabled', dataIndex: 'enabled' },
  { title: 'Description', dataIndex: 'description' },
  { title: 'Query Schema', dataIndex: 'querySchema', sensitive: true },
];
const searchFields: CurrentPageSearchField<ReportDefinitionSummary>[] = [
  'code',
  'name',
  'owner',
  'description',
];
const filterOptions: CurrentPageFilterOption<ReportDefinitionSummary>[] = [
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
    key: 'owner',
    options: createCurrentPageFilterOptions(rows, 'owner'),
    placeholder: 'Owner',
    predicate: (record, value) => record.owner === value,
  },
];

export default function ReportsPage() {
  const [selected, setSelected] = useState<ReportDefinitionSummary>();
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<ReportDefinitionSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search reports',
      selectFilters: filterOptions,
    });

  const openDetail = (code: string) => {
    setSelected(findReportFixture(code));
  };

  const columns: ProColumns<ReportDefinitionSummary>[] = [
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
    { title: 'Owner', dataIndex: 'owner' },
    {
      title: 'Enabled',
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? 'enabled' : 'disabled'}
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
    <PageContainer title="Reports" subTitle="S11 Optional">
      <ProTable<ReportDefinitionSummary>
        rowKey="code"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<ReportDefinitionSummary>
            key="export"
            columns={exportColumns}
            resource="optional-reports"
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
          { label: 'Name', value: selected?.name },
          { label: 'Owner', value: selected?.owner },
          {
            label: 'Enabled',
            value: selected?.enabled ? 'enabled' : 'disabled',
          },
          { label: 'Description', value: selected?.description },
        ]}
        jsonSections={[
          { title: 'Query Schema', value: selected?.querySchema ?? {} },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={selected?.name ?? 'Report Detail'}
      />
    </PageContainer>
  );
}
