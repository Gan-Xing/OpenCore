import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createOperationsFixtures,
  findJobFixture,
  findJobRunFixture,
  type JobDefinitionSummary,
  type JobRunLogSummary,
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

const fixtures = createOperationsFixtures();
const rows = fixtures.jobs;
const summary = fixtures.summary;
const exportColumns: CurrentPageExportColumn<JobDefinitionSummary>[] = [
  { title: 'Code', dataIndex: 'code' },
  { title: 'Name', dataIndex: 'name' },
  { title: 'Queue', dataIndex: 'queueName' },
  { title: 'Cron', dataIndex: 'cron' },
  { title: 'Enabled', dataIndex: 'enabled' },
  { title: 'Retry Limit', dataIndex: 'retryLimit' },
  { title: 'Timeout Seconds', dataIndex: 'timeoutSeconds' },
  { title: 'Payload', dataIndex: 'payload', sensitive: true },
];
const searchFields: CurrentPageSearchField<JobDefinitionSummary>[] = [
  'code',
  'name',
  'queueName',
  'cron',
  'adapter',
];
const filterOptions: CurrentPageFilterOption<JobDefinitionSummary>[] = [
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
    key: 'queueName',
    options: createCurrentPageFilterOptions(rows, 'queueName'),
    placeholder: 'Queue',
    predicate: (record, value) => record.queueName === value,
  },
];

export default function JobsPage() {
  const [selected, setSelected] = useState<JobDefinitionSummary>();
  const [selectedRun, setSelectedRun] = useState<JobRunLogSummary>();
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<JobDefinitionSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search jobs',
      selectFilters: filterOptions,
    });

  const openDetail = (code: string) => {
    const job = findJobFixture(code);
    const runId = fixtures.jobRuns.find((run) => run.jobCode === code)?.id;
    setSelected(job);
    setSelectedRun(runId ? findJobRunFixture(code, runId) : undefined);
  };

  const columns: ProColumns<JobDefinitionSummary>[] = [
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
    { title: 'Queue', dataIndex: 'queueName' },
    { title: 'Cron', dataIndex: 'cron' },
    { title: 'Retry', dataIndex: 'retryLimit' },
    {
      title: 'Adapter',
      dataIndex: 'adapter',
      render: (_, record) => <Tag color="blue">{record.adapter}</Tag>,
    },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? 'enabled' : 'disabled'}
        </Tag>
      ),
    },
    {
      title: 'Trigger Policy',
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? 'manual trigger allowed' : 'trigger blocked'}
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
    <PageContainer title="Jobs" subTitle="S11 Operations">
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="Enabled jobs" value={summary.jobs.enabled} />
        <Statistic title="Failed runs" value={summary.jobRuns.failed} />
        <Statistic title="Cache keys" value={summary.cache.keyCount} />
        <Statistic title="Active sessions" value={summary.onlineUsers.active} />
      </Space>
      <ProTable<JobDefinitionSummary>
        rowKey="code"
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <CurrentPageExportButton<JobDefinitionSummary>
            key="export"
            columns={exportColumns}
            resource="monitor-jobs"
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
          { label: 'Queue', value: selected?.queueName },
          { label: 'Cron', value: selected?.cron },
          {
            label: 'Enabled',
            value: selected?.enabled ? 'enabled' : 'disabled',
          },
          { label: 'Retry Limit', value: selected?.retryLimit },
          { label: 'Timeout Seconds', value: selected?.timeoutSeconds },
          { label: 'Adapter', value: selected?.adapter },
          { label: 'Latest Run', value: selectedRun?.id },
          { label: 'Latest Run Status', value: selectedRun?.status },
        ]}
        jsonSections={[
          { title: 'Payload', value: selected?.payload ?? {} },
          { title: 'Latest Run Metadata', value: selectedRun?.metadata ?? {} },
        ]}
        onClose={() => {
          setSelected(undefined);
          setSelectedRun(undefined);
        }}
        open={Boolean(selected)}
        title={selected?.name ?? 'Job Detail'}
      />
    </PageContainer>
  );
}
