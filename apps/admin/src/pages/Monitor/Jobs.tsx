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
import { useAccess, useIntl } from '@umijs/max';
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
import { useCallback, useEffect, useMemo, useState } from 'react';
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
type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

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
    activeUsers: 0,
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

const searchFields: CurrentPageSearchField<JobDefinitionSummary>[] = [
  'code',
  'name',
  'queueName',
  'cron',
  'adapter',
];

function createRunRetentionStatusOptions(formatMessage: FormatMessage): {
  label: string;
  value: RunRetentionStatus;
}[] {
  return [
    {
      label: formatMessage(
        'pages.monitor.jobs.runCleanStatus.terminal',
        'Terminal',
      ),
      value: 'all-terminal',
    },
    {
      label: formatMessage(
        'pages.monitor.jobs.runStatus.completed',
        'Completed',
      ),
      value: 'completed',
    },
    {
      label: formatMessage('pages.monitor.jobs.runStatus.failed', 'Failed'),
      value: 'failed',
    },
  ];
}

function createExportColumns(
  formatMessage: FormatMessage,
): CurrentPageExportColumn<JobDefinitionSummary>[] {
  return [
    {
      title: formatMessage('pages.monitor.jobs.fields.code', 'Code'),
      dataIndex: 'code',
    },
    {
      title: formatMessage('pages.monitor.jobs.fields.name', 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage('pages.monitor.jobs.fields.queue', 'Queue'),
      dataIndex: 'queueName',
    },
    {
      title: formatMessage('pages.monitor.jobs.fields.cron', 'Cron'),
      dataIndex: 'cron',
    },
    {
      title: formatMessage('pages.monitor.jobs.fields.enabled', 'Enabled'),
      dataIndex: 'enabled',
    },
    {
      title: formatMessage(
        'pages.monitor.jobs.fields.retryLimit',
        'Retry Limit',
      ),
      dataIndex: 'retryLimit',
    },
    {
      title: formatMessage(
        'pages.monitor.jobs.fields.timeoutSeconds',
        'Timeout Seconds',
      ),
      dataIndex: 'timeoutSeconds',
    },
    {
      title: formatMessage('pages.monitor.jobs.fields.payload', 'Payload'),
      dataIndex: 'payload',
      sensitive: true,
    },
  ];
}

function createFilterOptions(
  rows: readonly JobDefinitionSummary[],
  formatMessage: FormatMessage,
): CurrentPageFilterOption<JobDefinitionSummary>[] {
  return [
    {
      key: 'enabled',
      options: [
        {
          label: formatMessage('pages.monitor.jobs.enabled.enabled', 'enabled'),
          value: 'true',
        },
        {
          label: formatMessage(
            'pages.monitor.jobs.enabled.disabled',
            'disabled',
          ),
          value: 'false',
        },
      ],
      placeholder: formatMessage(
        'pages.monitor.jobs.filters.enabled',
        'Enabled',
      ),
      predicate: (record, value) => record.enabled === (value === 'true'),
    },
    {
      key: 'queueName',
      options: createCurrentPageFilterOptions(rows, 'queueName'),
      placeholder: formatMessage('pages.monitor.jobs.filters.queue', 'Queue'),
      predicate: (record, value) => record.queueName === value,
    },
  ];
}

function runStatusTag(
  run: JobRunLogSummary | undefined,
  labels: Record<JobRunLogSummary['status'], string>,
) {
  if (!run) {
    return undefined;
  }

  const colorByStatus: Record<JobRunLogSummary['status'], string> = {
    completed: 'green',
    failed: 'red',
    queued: 'gold',
    running: 'blue',
  };

  return <Tag color={colorByStatus[run.status]}>{labels[run.status]}</Tag>;
}

export default function JobsPage() {
  const access = useAccess();
  const intl = useIntl();
  const canUpdateJobs = Boolean(access.canUpdateJobs);
  const canManageJobs = Boolean(access.canManageJobs);
  const [rows, setRows] = useState<readonly JobDefinitionSummary[]>([]);
  const [summary, setSummary] = useState<OperationsSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selected, setSelected] = useState<JobDefinitionSummary>();
  const [registry, setRegistry] = useState<readonly JobRegistryEntrySummary[]>(
    [],
  );
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
  const formatMessage = useCallback(
    (
      id: string,
      defaultMessage: string,
      values?: Record<string, number | string>,
    ) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const enabledLabels = {
    enabled: formatMessage('pages.monitor.jobs.enabled.enabled', 'enabled'),
    disabled: formatMessage('pages.monitor.jobs.enabled.disabled', 'disabled'),
  };
  const manualTriggerLabels = {
    allowed: formatMessage(
      'pages.monitor.jobs.manualTrigger.allowed',
      'allowed',
    ),
    blocked: formatMessage(
      'pages.monitor.jobs.manualTrigger.blocked',
      'blocked',
    ),
  };
  const runStatusLabels: Record<JobRunLogSummary['status'], string> = {
    completed: formatMessage(
      'pages.monitor.jobs.runStatus.completed',
      'completed',
    ),
    failed: formatMessage('pages.monitor.jobs.runStatus.failed', 'failed'),
    queued: formatMessage('pages.monitor.jobs.runStatus.queued', 'queued'),
    running: formatMessage('pages.monitor.jobs.runStatus.running', 'running'),
  };
  const runRetentionStatusOptions = useMemo(
    () => createRunRetentionStatusOptions(formatMessage),
    [formatMessage],
  );
  const exportColumns = useMemo(
    () => createExportColumns(formatMessage),
    [formatMessage],
  );
  const filterOptions = useMemo(
    () => createFilterOptions(rows, formatMessage),
    [formatMessage, rows],
  );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<JobDefinitionSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.monitor.jobs.search.placeholder',
        'Search jobs',
      ),
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
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.monitor.jobs.load.failure',
              'Unable to load jobs.',
            ),
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
          : formatMessage(
              'pages.monitor.jobs.detail.loadFailure',
              'Unable to load live job run detail.',
            ),
      );
    }
  };

  const confirmToggleJob = (record: JobDefinitionSummary) => {
    const nextEnabled = !record.enabled;
    Modal.confirm({
      title: nextEnabled
        ? formatMessage('pages.monitor.jobs.confirm.enable', 'Enable {code}?', {
            code: record.code,
          })
        : formatMessage(
            'pages.monitor.jobs.confirm.disable',
            'Disable {code}?',
            { code: record.code },
          ),
      okText: nextEnabled
        ? formatMessage('pages.monitor.jobs.actions.enable', 'Enable')
        : formatMessage('pages.monitor.jobs.actions.disable', 'Disable'),
      onOk: async () => {
        setActionJobCode(
          `${record.code}:${nextEnabled ? 'enable' : 'disable'}`,
        );
        try {
          await (nextEnabled
            ? enableOpenCoreJob(record.code)
            : disableOpenCoreJob(record.code));
          message.success(
            nextEnabled
              ? formatMessage(
                  'pages.monitor.jobs.messages.enabled',
                  'Job enabled',
                )
              : formatMessage(
                  'pages.monitor.jobs.messages.disabled',
                  'Job disabled',
                ),
          );
          await loadJobs();
        } finally {
          setActionJobCode(undefined);
        }
      },
    });
  };

  const confirmTriggerJob = (record: JobDefinitionSummary) => {
    Modal.confirm({
      title: formatMessage(
        'pages.monitor.jobs.confirm.runNow',
        'Run {code} now?',
        { code: record.code },
      ),
      okText: formatMessage('pages.monitor.jobs.actions.runNow', 'Run now'),
      onOk: async () => {
        setTriggeringJobCode(record.code);
        try {
          const run = await triggerOpenCoreJob(record.code, {
            actor: 'admin',
            metadata: { source: 'admin.monitor.jobs' },
          });
          message.success(
            formatMessage(
              'pages.monitor.jobs.messages.runQueued',
              'Run {id} {status}',
              { id: run.id, status: runStatusLabels[run.status] },
            ),
          );
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
        ? formatMessage(
            'pages.monitor.jobs.runCleanStatus.terminalValue',
            'completed/failed',
          )
        : runStatusLabels[runCleanStatus];
    Modal.confirm({
      title: formatMessage(
        'pages.monitor.jobs.confirm.clean',
        'Clean {status} run logs for {code}?',
        { code: record.code, status: statusLabel },
      ),
      content: formatMessage(
        'pages.monitor.jobs.confirm.cleanContent',
        'Deletes terminal run logs older than {days} day(s). Queued and running runs are retained.',
        { days: runRetentionDays },
      ),
      okButtonProps: { danger: true },
      okText: formatMessage(
        'pages.monitor.jobs.actions.cleanRunLogs',
        'Clean run logs',
      ),
      onOk: async () => {
        setCleaningJobCode(record.code);
        try {
          const result = await cleanOpenCoreJobRuns(record.code, {
            retentionDays: runRetentionDays,
            status:
              runCleanStatus === 'all-terminal' ? undefined : runCleanStatus,
          });
          message.success(
            formatMessage(
              'pages.monitor.jobs.messages.cleanedRuns',
              'Cleaned {count} run logs before {cutoff}',
              { count: result.affected, cutoff: result.cutoffBefore },
            ),
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
      message.success(
        formatMessage(
          'pages.monitor.jobs.messages.dispatched',
          'Cron dispatch queued {count}',
          { count: result.dispatchedCount },
        ),
      );
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
      message.success(
        formatMessage(
          'pages.monitor.jobs.messages.claimed',
          'Worker claim completed {count}',
          { count: result.completedCount },
        ),
      );
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
      title: formatMessage('pages.monitor.jobs.fields.code', 'Code'),
      dataIndex: 'code',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.code}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.monitor.jobs.fields.name', 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage('pages.monitor.jobs.fields.queue', 'Queue'),
      dataIndex: 'queueName',
      width: 140,
    },
    {
      title: formatMessage('pages.monitor.jobs.fields.cron', 'Cron'),
      dataIndex: 'cron',
      width: 128,
    },
    {
      title: formatMessage('pages.monitor.jobs.fields.retry', 'Retry'),
      dataIndex: 'retryLimit',
      width: 88,
    },
    {
      title: formatMessage('pages.monitor.jobs.fields.timeout', 'Timeout'),
      dataIndex: 'timeoutSeconds',
      width: 96,
    },
    {
      title: formatMessage('pages.monitor.jobs.fields.adapter', 'Adapter'),
      dataIndex: 'adapter',
      width: 104,
      render: (_, record) => <Tag color="blue">{record.adapter}</Tag>,
    },
    {
      title: formatMessage('pages.monitor.jobs.fields.enabled', 'Enabled'),
      dataIndex: 'enabled',
      width: 104,
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? enabledLabels.enabled : enabledLabels.disabled}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.monitor.jobs.actions.column', 'Action'),
      valueType: 'option',
      width: 148,
      render: (_, record) => (
        <Space size="small">
          <Tooltip
            title={formatMessage('pages.monitor.jobs.actions.detail', 'Detail')}
          >
            <Button
              aria-label={formatMessage(
                'pages.monitor.jobs.actions.viewAria',
                'View job {code}',
                { code: record.code },
              )}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              canUpdateJobs
                ? record.enabled
                  ? formatMessage(
                      'pages.monitor.jobs.actions.disableJob',
                      'Disable job',
                    )
                  : formatMessage(
                      'pages.monitor.jobs.actions.enableJob',
                      'Enable job',
                    )
                : formatMessage(
                    'pages.monitor.jobs.permission.updateRequired',
                    'Requires monitor:job:update',
                  )
            }
          >
            <Button
              aria-label={
                record.enabled
                  ? formatMessage(
                      'pages.monitor.jobs.actions.disableAria',
                      'Disable job {code}',
                      { code: record.code },
                    )
                  : formatMessage(
                      'pages.monitor.jobs.actions.enableAria',
                      'Enable job {code}',
                      { code: record.code },
                    )
              }
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
                ? formatMessage(
                    'pages.monitor.jobs.actions.enableBeforeRunning',
                    'Enable before running',
                  )
                : canManageJobs
                  ? formatMessage(
                      'pages.monitor.jobs.actions.runNow',
                      'Run now',
                    )
                  : formatMessage(
                      'pages.monitor.jobs.permission.manageRequired',
                      'Requires monitor:job:manage',
                    )
            }
          >
            <Button
              aria-label={formatMessage(
                'pages.monitor.jobs.actions.runAria',
                'Run job {code} now',
                { code: record.code },
              )}
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
                ? formatMessage(
                    'pages.monitor.jobs.actions.cleanTerminalRunLogs',
                    'Clean terminal run logs',
                  )
                : formatMessage(
                    'pages.monitor.jobs.permission.manageRequired',
                    'Requires monitor:job:manage',
                  )
            }
          >
            <Button
              aria-label={formatMessage(
                'pages.monitor.jobs.actions.cleanAria',
                'Clean run logs for job {code}',
                { code: record.code },
              )}
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
    <PageContainer
      title={formatMessage('pages.monitor.jobs.title', 'Jobs')}
      subTitle={formatMessage('pages.monitor.section', 'S11 Operations')}
    >
      {loadError ? (
        <Alert
          message={formatMessage(
            'pages.monitor.jobs.load.liveFailure',
            'Unable to load live scheduler jobs',
          )}
          description={loadError}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.monitor.jobs.stats.enabled',
            'Enabled jobs',
          )}
          value={summary.jobs.enabled}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.jobs.stats.disabled',
            'Disabled jobs',
          )}
          value={summary.jobs.disabled}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.jobs.stats.registeredHandlers',
            'Registered handlers',
          )}
          value={registry.length}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.jobs.stats.queuedRuns',
            'Queued runs',
          )}
          value={summary.jobRuns.queued}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.jobs.stats.runningRuns',
            'Running runs',
          )}
          value={summary.jobRuns.running}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.jobs.stats.completedRuns',
            'Completed runs',
          )}
          value={summary.jobRuns.completed}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.jobs.stats.failedRuns',
            'Failed runs',
          )}
          value={summary.jobRuns.failed}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.jobs.stats.cronDispatch',
            'Cron dispatch',
          )}
          value={formatMessage('pages.monitor.jobs.stats.dueJobs', 'due jobs')}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.jobs.stats.workerClaim',
            'Worker claim',
          )}
          value={formatMessage(
            'pages.monitor.jobs.stats.queuedRunsValue',
            'queued runs',
          )}
        />
      </Space>
      <ProTable<JobDefinitionSummary>
        rowKey="code"
        search={false}
        options={false}
        toolBarRender={() => [
          <Typography.Text key="live-policy" type="secondary">
            {formatMessage(
              'pages.monitor.jobs.policy.liveSchedulerJobs',
              'Live scheduler jobs',
            )}
          </Typography.Text>,
          filterToolbar,
          <Typography.Text key="run-retention-policy" type="secondary">
            {formatMessage(
              'pages.monitor.jobs.policy.runLogRetention',
              'Run log retention',
            )}
          </Typography.Text>,
          <InputNumber
            addonAfter={formatMessage('pages.monitor.jobs.units.days', 'days')}
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
          <Tooltip
            key="refresh"
            title={formatMessage('pages.monitor.jobs.actions.reload', 'Reload')}
          >
            <Button
              aria-label={formatMessage(
                'pages.monitor.jobs.actions.reloadAria',
                'Reload jobs',
              )}
              icon={<ReloadOutlined />}
              onClick={() => void loadJobs()}
            />
          </Tooltip>,
          <Tooltip
            key="dispatch-due"
            title={formatMessage(
              'pages.monitor.jobs.actions.cronDispatch',
              'Cron dispatch',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.monitor.jobs.actions.dispatchAria',
                'Dispatch due jobs',
              )}
              disabled={!canManageJobs}
              icon={<ClockCircleOutlined />}
              loading={dispatchingDueJobs}
              onClick={() => void dispatchDueJobs()}
            />
          </Tooltip>,
          <Tooltip
            key="worker-claim"
            title={formatMessage(
              'pages.monitor.jobs.actions.workerClaim',
              'Worker claim',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.monitor.jobs.actions.claimAria',
                'Claim queued jobs',
              )}
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
          {
            label: formatMessage('pages.monitor.jobs.fields.code', 'Code'),
            value: selected?.code,
          },
          {
            label: formatMessage('pages.monitor.jobs.fields.name', 'Name'),
            value: selected?.name,
          },
          {
            label: formatMessage('pages.monitor.jobs.fields.queue', 'Queue'),
            value: selected?.queueName,
          },
          {
            label: formatMessage('pages.monitor.jobs.fields.cron', 'Cron'),
            value: selected?.cron,
          },
          {
            label: formatMessage(
              'pages.monitor.jobs.fields.enabled',
              'Enabled',
            ),
            value: selected
              ? selected.enabled
                ? enabledLabels.enabled
                : enabledLabels.disabled
              : '',
          },
          {
            label: formatMessage(
              'pages.monitor.jobs.fields.retryLimit',
              'Retry Limit',
            ),
            value: selected?.retryLimit,
          },
          {
            label: formatMessage(
              'pages.monitor.jobs.fields.timeoutSeconds',
              'Timeout Seconds',
            ),
            value: selected?.timeoutSeconds,
          },
          {
            label: formatMessage(
              'pages.monitor.jobs.fields.adapter',
              'Adapter',
            ),
            value: selected?.adapter,
          },
          {
            label: formatMessage(
              'pages.monitor.jobs.fields.handlerKey',
              'Handler Key',
            ),
            value: selectedRegistryEntry?.handlerKey,
          },
          {
            label: formatMessage(
              'pages.monitor.jobs.fields.manualTrigger',
              'Manual Trigger',
            ),
            value: selectedRegistryEntry?.allowManualTrigger
              ? manualTriggerLabels.allowed
              : manualTriggerLabels.blocked,
          },
          {
            label: formatMessage(
              'pages.monitor.jobs.fields.latestRun',
              'Latest Run',
            ),
            value: latestRun?.id,
          },
          {
            label: formatMessage(
              'pages.monitor.jobs.fields.latestRunStatus',
              'Latest Run Status',
            ),
            value: runStatusTag(latestRun, runStatusLabels),
          },
          {
            label: formatMessage(
              'pages.monitor.jobs.fields.latestRunAttempts',
              'Latest Run Attempts',
            ),
            value: latestRun?.attempts,
          },
          {
            label: formatMessage(
              'pages.monitor.jobs.fields.latestRunDuration',
              'Latest Run Duration',
            ),
            value: latestRun?.durationMs,
          },
          {
            label: formatMessage(
              'pages.monitor.jobs.fields.latestRunError',
              'Latest Run Error',
            ),
            value: latestRun?.error,
          },
          {
            label: formatMessage(
              'pages.monitor.jobs.fields.recentRunCount',
              'Recent Run Count',
            ),
            value: selectedRuns.length,
          },
          {
            label: formatMessage(
              'pages.monitor.jobs.fields.executionMode',
              'Execution Mode',
            ),
            value: formatMessage(
              'pages.monitor.jobs.executionMode.registeredHandler',
              'registered handler execution + retry/timeout diagnostics',
            ),
          },
        ]}
        jsonSections={[
          {
            title: formatMessage(
              'pages.monitor.jobs.fields.payload',
              'Payload',
            ),
            value: selected?.payload ?? {},
          },
          {
            title: formatMessage(
              'pages.monitor.jobs.fields.latestRunMetadata',
              'Latest Run Metadata',
            ),
            value: latestRun?.metadata ?? {},
          },
          {
            title: formatMessage(
              'pages.monitor.jobs.fields.recentRuns',
              'Recent Runs',
            ),
            value: selectedRuns.slice(0, 5),
          },
        ]}
        onClose={() => {
          setSelected(undefined);
          setSelectedRuns([]);
        }}
        open={Boolean(selected)}
        title={
          selected?.name ??
          formatMessage('pages.monitor.jobs.detail.title', 'Job Detail')
        }
      />
    </PageContainer>
  );
}
