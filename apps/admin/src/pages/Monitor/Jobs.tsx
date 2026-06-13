import {
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import {
  createOperationsFixtures,
  type JobDefinitionSummary,
  type JobRunLogSummary,
  type OperationsSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Modal,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  disableOpenCoreJob,
  enableOpenCoreJob,
  getOpenCoreJob,
  getOpenCoreOperationsSummary,
  listOpenCoreJobRuns,
  listOpenCoreJobs,
  triggerOpenCoreJob,
} from '@/services/opencore/platform';
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
const fallbackRows = fixtures.jobs;
const fallbackSummary = fixtures.summary;
const fallbackRuns = fixtures.jobRuns;

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

function createFilterOptions(
  rows: readonly JobDefinitionSummary[],
): CurrentPageFilterOption<JobDefinitionSummary>[] {
  return [
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
}

function runStatusTag(run?: JobRunLogSummary) {
  if (!run) {
    return undefined;
  }

  const colorByStatus: Record<JobRunLogSummary['status'], string> = {
    completed: 'green',
    failed: 'red',
    queued: 'gold',
    running: 'blue',
  };

  return <Tag color={colorByStatus[run.status]}>{run.status}</Tag>;
}

export default function JobsPage() {
  const access = useAccess();
  const canUpdateJobs = Boolean(access.canUpdateJobs);
  const canManageJobs = Boolean(access.canManageJobs);
  const [rows, setRows] =
    useState<readonly JobDefinitionSummary[]>(fallbackRows);
  const [summary, setSummary] = useState<OperationsSummary>(fallbackSummary);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selected, setSelected] = useState<JobDefinitionSummary>();
  const [selectedRuns, setSelectedRuns] = useState<readonly JobRunLogSummary[]>(
    [],
  );
  const [actionJobCode, setActionJobCode] = useState<string>();
  const [triggeringJobCode, setTriggeringJobCode] = useState<string>();
  const filterOptions = useMemo(() => createFilterOptions(rows), [rows]);
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<JobDefinitionSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search jobs',
      selectFilters: filterOptions,
    });
  const latestRun = selectedRuns[0];

  const loadJobs = async () => {
    setLoading(true);
    try {
      const [nextSummary, nextRows] = await Promise.all([
        getOpenCoreOperationsSummary(),
        listOpenCoreJobs(),
      ]);
      setSummary(nextSummary);
      setRows(nextRows);
      setLoadError(undefined);
    } catch (error: unknown) {
      setSummary(fallbackSummary);
      setRows(fallbackRows);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load jobs.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  const openDetail = async (record: JobDefinitionSummary) => {
    try {
      const [job, runs] = await Promise.all([
        getOpenCoreJob(record.code),
        listOpenCoreJobRuns(record.code),
      ]);
      setSelected(job);
      setSelectedRuns(runs);
    } catch (_error) {
      setSelected(record);
      setSelectedRuns(
        fallbackRuns.filter((run) => run.jobCode === record.code),
      );
    }
  };

  const confirmToggleJob = (record: JobDefinitionSummary) => {
    const nextEnabled = !record.enabled;
    Modal.confirm({
      title: `${nextEnabled ? 'Enable' : 'Disable'} ${record.code}?`,
      okText: nextEnabled ? 'Enable' : 'Disable',
      onOk: async () => {
        setActionJobCode(
          `${record.code}:${nextEnabled ? 'enable' : 'disable'}`,
        );
        try {
          await (nextEnabled
            ? enableOpenCoreJob(record.code)
            : disableOpenCoreJob(record.code));
          message.success(nextEnabled ? 'Job enabled' : 'Job disabled');
          await loadJobs();
        } finally {
          setActionJobCode(undefined);
        }
      },
    });
  };

  const confirmTriggerJob = (record: JobDefinitionSummary) => {
    Modal.confirm({
      title: `Run ${record.code} now?`,
      okText: 'Run now',
      onOk: async () => {
        setTriggeringJobCode(record.code);
        try {
          const run = await triggerOpenCoreJob(record.code, {
            actor: 'admin',
            metadata: { source: 'admin.monitor.jobs' },
          });
          message.success(`Run ${run.id} ${run.status}`);
          await loadJobs();
          await openDetail(record);
        } finally {
          setTriggeringJobCode(undefined);
        }
      },
    });
  };

  const columns: ProColumns<JobDefinitionSummary>[] = [
    {
      title: 'Code',
      dataIndex: 'code',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.code}
        </Typography.Link>
      ),
    },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Queue', dataIndex: 'queueName', width: 140 },
    { title: 'Cron', dataIndex: 'cron', width: 128 },
    { title: 'Retry', dataIndex: 'retryLimit', width: 88 },
    { title: 'Timeout', dataIndex: 'timeoutSeconds', width: 96 },
    {
      title: 'Adapter',
      dataIndex: 'adapter',
      width: 104,
      render: (_, record) => <Tag color="blue">{record.adapter}</Tag>,
    },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      width: 104,
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? 'enabled' : 'disabled'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      valueType: 'option',
      width: 148,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Detail">
            <Button
              aria-label={`View job ${record.code}`}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              canUpdateJobs
                ? record.enabled
                  ? 'Disable job'
                  : 'Enable job'
                : 'Requires monitor:job:update'
            }
          >
            <Button
              aria-label={`${record.enabled ? 'Disable' : 'Enable'} job ${
                record.code
              }`}
              disabled={!canUpdateJobs}
              icon={
                record.enabled ? (
                  <PauseCircleOutlined />
                ) : (
                  <PlayCircleOutlined />
                )
              }
              loading={
                actionJobCode ===
                `${record.code}:${record.enabled ? 'disable' : 'enable'}`
              }
              onClick={() => confirmToggleJob(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              !record.enabled
                ? 'Enable before running'
                : canManageJobs
                  ? 'Run now'
                  : 'Requires monitor:job:manage'
            }
          >
            <Button
              aria-label={`Run job ${record.code} now`}
              disabled={!record.enabled || !canManageJobs}
              icon={<ThunderboltOutlined />}
              loading={triggeringJobCode === record.code}
              onClick={() => confirmTriggerJob(record)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="Jobs" subTitle="S11 Operations">
      {loadError ? (
        <Alert
          message="Using fallback job fixtures"
          description={loadError}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="Enabled jobs" value={summary.jobs.enabled} />
        <Statistic title="Disabled jobs" value={summary.jobs.disabled} />
        <Statistic title="Completed runs" value={summary.jobRuns.completed} />
        <Statistic title="Failed runs" value={summary.jobRuns.failed} />
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
            filename="opencore-monitor-jobs.csv"
            resource="monitor-jobs"
            rows={filteredRows}
          />,
          <Tooltip key="refresh" title="Reload">
            <Button
              aria-label="Reload jobs"
              icon={<ReloadOutlined />}
              onClick={() => void loadJobs()}
            />
          </Tooltip>,
        ]}
        pagination={{ pageSize: 10 }}
        loading={loading}
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
            value: selected ? (selected.enabled ? 'enabled' : 'disabled') : '',
          },
          { label: 'Retry Limit', value: selected?.retryLimit },
          { label: 'Timeout Seconds', value: selected?.timeoutSeconds },
          { label: 'Adapter', value: selected?.adapter },
          { label: 'Latest Run', value: latestRun?.id },
          { label: 'Latest Run Status', value: runStatusTag(latestRun) },
          { label: 'Recent Run Count', value: selectedRuns.length },
          {
            label: 'Runtime Operation',
            value: 'enable/disable + manual trigger + run logs',
          },
        ]}
        jsonSections={[
          { title: 'Payload', value: selected?.payload ?? {} },
          { title: 'Latest Run Metadata', value: latestRun?.metadata ?? {} },
          { title: 'Recent Runs', value: selectedRuns.slice(0, 5) },
        ]}
        onClose={() => {
          setSelected(undefined);
          setSelectedRuns([]);
        }}
        open={Boolean(selected)}
        title={selected?.name ?? 'Job Detail'}
      />
    </PageContainer>
  );
}
