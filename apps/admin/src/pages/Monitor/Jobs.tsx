import {
  ClearOutlined,
  ClockCircleOutlined,
  DeploymentUnitOutlined,
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
import type {
  JobDefinitionSummary,
  JobRegistryEntrySummary,
  JobRunCleanStatus,
  JobRunLogSummary,
  OperationsSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  InputNumber,
  Modal,
  Select,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  claimOpenCoreQueuedJobs,
  cleanOpenCoreJobRuns,
  disableOpenCoreJob,
  dispatchOpenCoreDueJobs,
  enableOpenCoreJob,
  getOpenCoreJob,
  getOpenCoreOperationsSummary,
  listOpenCoreJobRegistry,
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

type RunRetentionStatus = 'all-terminal' | JobRunCleanStatus;

const emptySummary: OperationsSummary = {
  cache: {
    keyCount: 0,
    provider: 'redis',
    scanComplete: false,
    scanLimit: 0,
    totalSizeBytes: 0,
  },
  exportJobStatus: 'design-only',
  jobRuns: {
    completed: 0,
    failed: 0,
    queued: 0,
    running: 0,
    total: 0,
  },
  jobs: {
    disabled: 0,
    enabled: 0,
    total: 0,
  },
  onlineUsers: {
    active: 0,
    cleanupEligible: 0,
    expired: 0,
    revoked: 0,
    total: 0,
  },
  reports: {
    disabled: 0,
    enabled: 0,
    total: 0,
  },
};

const runRetentionStatusOptions: {
  label: string;
  value: RunRetentionStatus;
}[] = [
  { label: 'Terminal', value: 'all-terminal' },
  { label: 'Completed', value: 'completed' },
  { label: 'Failed', value: 'failed' },
];

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
  const [rows, setRows] = useState<readonly JobDefinitionSummary[]>([]);
  const [summary, setSummary] = useState<OperationsSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selected, setSelected] = useState<JobDefinitionSummary>();
  const [registry, setRegistry] = useState<
    readonly JobRegistryEntrySummary[]
  >([]);
  const [selectedRuns, setSelectedRuns] = useState<readonly JobRunLogSummary[]>(
    [],
  );
  const [actionJobCode, setActionJobCode] = useState<string>();
  const [triggeringJobCode, setTriggeringJobCode] = useState<string>();
  const [cleaningJobCode, setCleaningJobCode] = useState<string>();
  const [dispatchingDueJobs, setDispatchingDueJobs] = useState(false);
  const [claimingQueuedJobs, setClaimingQueuedJobs] = useState(false);
  const [runRetentionDays, setRunRetentionDays] = useState(30);
  const [runCleanStatus, setRunCleanStatus] =
    useState<RunRetentionStatus>('all-terminal');
  const filterOptions = useMemo(() => createFilterOptions(rows), [rows]);
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<JobDefinitionSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search jobs',
      selectFilters: filterOptions,
    });
  const latestRun = selectedRuns[0];
  const selectedRegistryEntry = selected
    ? registry.find((entry) => entry.code === selected.code)
    : undefined;

  const loadJobs = async () => {
    setLoading(true);
    try {
      const [nextSummary, nextRegistry, nextRows] = await Promise.all([
        getOpenCoreOperationsSummary(),
        listOpenCoreJobRegistry(),
        listOpenCoreJobs(),
      ]);
      setSummary(nextSummary);
      setRegistry(nextRegistry);
      setRows(nextRows);
      setLoadError(undefined);
    } catch (error: unknown) {
      setSummary(emptySummary);
      setRegistry([]);
      setRows([]);
      setSelected(undefined);
      setSelectedRuns([]);
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
    } catch (error: unknown) {
      setSelected(record);
      setSelectedRuns([]);
      message.error(
        error instanceof Error
          ? error.message
          : 'Unable to load live job run detail.',
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

  const confirmCleanJobRuns = (record: JobDefinitionSummary) => {
    const statusLabel =
      runCleanStatus === 'all-terminal'
        ? 'completed/failed'
        : runCleanStatus;
    Modal.confirm({
      title: `Clean ${statusLabel} run logs for ${record.code}?`,
      content:
        `Deletes terminal run logs older than ${runRetentionDays} day(s). ` +
        'Queued and running runs are retained.',
      okButtonProps: { danger: true },
      okText: 'Clean run logs',
      onOk: async () => {
        setCleaningJobCode(record.code);
        try {
          const result = await cleanOpenCoreJobRuns(record.code, {
            retentionDays: runRetentionDays,
            status:
              runCleanStatus === 'all-terminal'
                ? undefined
                : runCleanStatus,
          });
          message.success(
            `Cleaned ${result.affected} run logs before ${result.cutoffBefore}`,
          );
          await loadJobs();
          if (selected?.code === record.code) {
            await openDetail(record);
          }
        } finally {
          setCleaningJobCode(undefined);
        }
      },
    });
  };

  const dispatchDueJobs = async () => {
    setDispatchingDueJobs(true);
    try {
      const result = await dispatchOpenCoreDueJobs({
        actor: 'admin',
        metadata: { source: 'admin.monitor.jobs.dispatch' },
      });
      message.success(`Cron dispatch queued ${result.dispatchedCount}`);
      await loadJobs();
    } finally {
      setDispatchingDueJobs(false);
    }
  };

  const claimQueuedJobs = async () => {
    setClaimingQueuedJobs(true);
    try {
      const result = await claimOpenCoreQueuedJobs({
        actor: 'admin',
        limit: 5,
        metadata: { source: 'admin.monitor.jobs.worker' },
      });
      message.success(`Worker claim completed ${result.completedCount}`);
      await loadJobs();
      if (selected) {
        await openDetail(selected);
      }
    } finally {
      setClaimingQueuedJobs(false);
    }
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
          <Tooltip
            title={
              canManageJobs
                ? 'Clean terminal run logs'
                : 'Requires monitor:job:manage'
            }
          >
            <Button
              aria-label={`Clean run logs for job ${record.code}`}
              danger
              disabled={!canManageJobs}
              icon={<ClearOutlined />}
              loading={cleaningJobCode === record.code}
              onClick={() => confirmCleanJobRuns(record)}
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
          message="Unable to load live scheduler jobs"
          description={loadError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="Enabled jobs" value={summary.jobs.enabled} />
        <Statistic title="Disabled jobs" value={summary.jobs.disabled} />
        <Statistic title="Registered handlers" value={registry.length} />
        <Statistic title="Queued runs" value={summary.jobRuns.queued} />
        <Statistic title="Running runs" value={summary.jobRuns.running} />
        <Statistic title="Completed runs" value={summary.jobRuns.completed} />
        <Statistic title="Failed runs" value={summary.jobRuns.failed} />
        <Statistic title="Cron dispatch" value="due jobs" />
        <Statistic title="Worker claim" value="queued runs" />
      </Space>
      <ProTable<JobDefinitionSummary>
        rowKey="code"
        search={false}
        options={false}
        toolBarRender={() => [
          <Typography.Text key="live-policy" type="secondary">
            Live scheduler jobs
          </Typography.Text>,
          filterToolbar,
          <Typography.Text key="run-retention-policy" type="secondary">
            Run log retention
          </Typography.Text>,
          <InputNumber
            addonAfter="days"
            key="run-retention-days"
            max={3650}
            min={0}
            onChange={(value) => setRunRetentionDays(Number(value ?? 30))}
            precision={0}
            style={{ width: 132 }}
            value={runRetentionDays}
          />,
          <Select
            key="run-retention-status"
            onChange={(value) => setRunCleanStatus(value)}
            options={runRetentionStatusOptions}
            style={{ width: 132 }}
            value={runCleanStatus}
          />,
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
          <Tooltip key="dispatch-due" title="Cron dispatch">
            <Button
              aria-label="Dispatch due jobs"
              disabled={!canManageJobs}
              icon={<ClockCircleOutlined />}
              loading={dispatchingDueJobs}
              onClick={() => void dispatchDueJobs()}
            />
          </Tooltip>,
          <Tooltip key="worker-claim" title="Worker claim">
            <Button
              aria-label="Claim queued jobs"
              disabled={!canManageJobs}
              icon={<DeploymentUnitOutlined />}
              loading={claimingQueuedJobs}
              onClick={() => void claimQueuedJobs()}
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
          { label: 'Handler Key', value: selectedRegistryEntry?.handlerKey },
          {
            label: 'Manual Trigger',
            value: selectedRegistryEntry?.allowManualTrigger
              ? 'allowed'
              : 'blocked',
          },
          { label: 'Latest Run', value: latestRun?.id },
          { label: 'Latest Run Status', value: runStatusTag(latestRun) },
          { label: 'Latest Run Attempts', value: latestRun?.attempts },
          { label: 'Latest Run Duration', value: latestRun?.durationMs },
          { label: 'Latest Run Error', value: latestRun?.error },
          { label: 'Recent Run Count', value: selectedRuns.length },
          {
            label: 'Execution Mode',
            value: 'registered handler execution + retry/timeout diagnostics',
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
