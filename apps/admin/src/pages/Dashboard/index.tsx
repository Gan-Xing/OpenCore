import {
  ApiOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  DeploymentUnitOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  LoginOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type {
  IntegrationProviderHealthAuditSummary,
  OnlineUserSummary,
  OpenApiDriftStatus,
  OperationsSummary,
  SystemStatusSummary,
  VersionInfoSummary,
} from '@opencore/sdk';
import { PageContainer } from '@ant-design/pro-components';
import { history, useAccess, useIntl, useModel } from '@umijs/max';
import {
  Alert,
  Avatar,
  Button,
  Empty,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getOpenCoreIntegrationProviderHealthAudit,
  getOpenCoreLoginLogPage,
  getOpenCoreOnlineUserSummary,
  getOpenCoreOpenApiDriftStatus,
  getOpenCoreOperationsSummary,
  getOpenCoreSystemNoticeUnreadCount,
  getOpenCoreSystemStatus,
  getOpenCoreVersionInfo,
} from '@/services/opencore/platform';
import styles from './index.less';

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

type DashboardHealth = {
  live?: boolean;
  ready?: boolean;
};

type DashboardWorkbench = {
  drift?: OpenApiDriftStatus;
  health: DashboardHealth;
  lockedAccounts?: number;
  onlineUsers?: OnlineUserSummary;
  operations?: OperationsSummary;
  providerHealth?: IntegrationProviderHealthAuditSummary;
  status?: SystemStatusSummary;
  unreadNotices?: number;
  version?: VersionInfoSummary;
};

type LoadError = {
  label: string;
  message: string;
};

type AttentionItem = {
  actionPath?: string;
  description: string;
  key: string;
  title: string;
  tone: 'error' | 'warning';
};

type ShortcutItem = {
  enabled: boolean;
  icon: React.ReactNode;
  key: string;
  label: string;
  path: string;
};

type MetricItem = {
  actionPath?: string;
  description: string;
  enabled: boolean;
  icon: React.ReactNode;
  key: string;
  suffix?: string;
  title: string;
  tone: 'danger' | 'normal' | 'warning';
  value?: number;
};

const skeletonMetricKeys = [
  'unreadNotices',
  'onlineUsers',
  'failedJobs',
  'failedOutbox',
  'providerAttention',
  'lockedAccounts',
] as const;

const adminApiBaseUrl = (process.env.ADMIN_API_BASE_URL ?? '').replace(
  /\/+$/u,
  '',
);

async function readHealthEndpoint(path: 'live' | 'ready'): Promise<boolean> {
  const response = await fetch(`${adminApiBaseUrl}/health/${path}`, {
    headers: { accept: 'application/json' },
  });
  return response.ok;
}

async function readHealthState(): Promise<DashboardHealth> {
  const [live, ready] = await Promise.allSettled([
    readHealthEndpoint('live'),
    readHealthEndpoint('ready'),
  ]);

  return {
    live: live.status === 'fulfilled' ? live.value : false,
    ready: ready.status === 'fulfilled' ? ready.value : false,
  };
}

async function readOptional<T>(
  label: string,
  enabled: boolean,
  loader: () => Promise<T>,
  errors: LoadError[],
): Promise<T | undefined> {
  if (!enabled) {
    return undefined;
  }

  try {
    return await loader();
  } catch (error: unknown) {
    errors.push({
      label,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return undefined;
}

function formatDateTime(value?: string): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function shortCommit(value?: string): string {
  if (!value) {
    return '-';
  }
  return value.length > 10 ? value.slice(0, 10) : value;
}

function booleanTone(value?: boolean): 'default' | 'error' | 'success' {
  if (value === undefined) {
    return 'default';
  }
  return value ? 'success' : 'error';
}

function runtimeTone(status?: SystemStatusSummary['status']) {
  if (!status) {
    return 'default';
  }
  return status === 'ok' ? 'success' : 'warning';
}

function openApiTone(drift?: OpenApiDriftStatus) {
  if (!drift) {
    return 'default';
  }
  return drift.status === 'configured' && drift.snapshotExists
    ? 'success'
    : 'warning';
}

const DashboardPage: React.FC = () => {
  const access = useAccess();
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState<LoadError[]>([]);
  const [workbench, setWorkbench] = useState<DashboardWorkbench>({
    health: {},
  });
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );

  const loadWorkbench = useCallback(async () => {
    setLoading(true);
    const errors: LoadError[] = [];
    const [
      health,
      noticeCount,
      onlineUsers,
      operations,
      providerHealth,
      lockedLogPage,
      status,
      version,
      drift,
    ] = await Promise.all([
      readHealthState(),
      readOptional(
        formatMessage('pages.dashboard.load.notices', 'Unread notices'),
        true,
        getOpenCoreSystemNoticeUnreadCount,
        errors,
      ),
      readOptional(
        formatMessage('pages.dashboard.load.onlineUsers', 'Online users'),
        access.canReadOnlineUsers,
        getOpenCoreOnlineUserSummary,
        errors,
      ),
      readOptional(
        formatMessage('pages.dashboard.load.operations', 'Operations'),
        access.canReadJobs,
        getOpenCoreOperationsSummary,
        errors,
      ),
      readOptional(
        formatMessage('pages.dashboard.load.providers', 'Providers'),
        access.canReadIntegrationProviders,
        getOpenCoreIntegrationProviderHealthAudit,
        errors,
      ),
      readOptional(
        formatMessage('pages.dashboard.load.loginLogs', 'Login logs'),
        access.canReadLoginLogs,
        () =>
          getOpenCoreLoginLogPage({
            page: 1,
            pageSize: 1,
            result: 'account_locked',
          }),
        errors,
      ),
      readOptional(
        formatMessage('pages.dashboard.load.systemStatus', 'System status'),
        access.canReadSystemStatus,
        getOpenCoreSystemStatus,
        errors,
      ),
      readOptional(
        formatMessage('pages.dashboard.load.version', 'Version'),
        access.canReadVersion,
        getOpenCoreVersionInfo,
        errors,
      ),
      readOptional(
        formatMessage('pages.dashboard.load.openapi', 'OpenAPI'),
        access.canReadOpenApiStatus,
        getOpenCoreOpenApiDriftStatus,
        errors,
      ),
    ]);

    setWorkbench({
      drift,
      health,
      lockedAccounts: lockedLogPage?.total,
      onlineUsers,
      operations,
      providerHealth,
      status,
      unreadNotices: noticeCount?.unreadCount,
      version,
    });
    setLoadErrors(errors);
    setLoading(false);
  }, [
    access.canReadIntegrationProviders,
    access.canReadJobs,
    access.canReadLoginLogs,
    access.canReadOnlineUsers,
    access.canReadOpenApiStatus,
    access.canReadSystemStatus,
    access.canReadVersion,
    formatMessage,
  ]);

  useEffect(() => {
    void loadWorkbench();
  }, [loadWorkbench]);

  const currentUser = initialState?.currentUser;
  const userName =
    currentUser?.displayName ??
    currentUser?.name ??
    currentUser?.username ??
    formatMessage('pages.dashboard.welcome.userFallback', 'OpenCore User');
  const roleCodes = currentUser?.roleCodes ?? [];
  const providerIssues =
    workbench.providerHealth !== undefined
      ? workbench.providerHealth.totals.attention +
        workbench.providerHealth.totals.blocked
      : undefined;
  const failedOutbox = workbench.providerHealth?.totals.failed;
  const queuedJobs = workbench.operations?.jobRuns.queued ?? 0;
  const runningJobs = workbench.operations?.jobRuns.running ?? 0;
  const shortcutItems: ShortcutItem[] = useMemo(
    () => [
      {
        enabled: access.canReadUsers,
        icon: <UserOutlined />,
        key: 'users',
        label: formatMessage('pages.dashboard.shortcuts.users', 'Users'),
        path: '/system/users',
      },
      {
        enabled: access.canReadRoles,
        icon: <SafetyCertificateOutlined />,
        key: 'roles',
        label: formatMessage('pages.dashboard.shortcuts.roles', 'Roles'),
        path: '/system/roles',
      },
      {
        enabled: access.canReadSystemConfig,
        icon: <SettingOutlined />,
        key: 'config',
        label: formatMessage('pages.dashboard.shortcuts.config', 'Config'),
        path: '/system/config',
      },
      {
        enabled: access.canReadSystemNotices,
        icon: <BellOutlined />,
        key: 'notices',
        label: formatMessage('pages.dashboard.shortcuts.notices', 'Notices'),
        path: '/system/notices',
      },
      {
        enabled: access.canReadJobs,
        icon: <ClockCircleOutlined />,
        key: 'jobs',
        label: formatMessage('pages.dashboard.shortcuts.jobs', 'Jobs'),
        path: '/monitor/jobs',
      },
      {
        enabled: access.canReadOnlineUsers,
        icon: <TeamOutlined />,
        key: 'onlineUsers',
        label: formatMessage(
          'pages.dashboard.shortcuts.onlineUsers',
          'Online users',
        ),
        path: '/monitor/online-users',
      },
      {
        enabled: access.canReadOpenApiStatus,
        icon: <ApiOutlined />,
        key: 'openapi',
        label: formatMessage('pages.dashboard.shortcuts.openapi', 'OpenAPI'),
        path: '/tools/openapi',
      },
      {
        enabled: access.canReadIntegrationProviders,
        icon: <ToolOutlined />,
        key: 'providers',
        label: formatMessage(
          'pages.dashboard.shortcuts.providers',
          'Providers',
        ),
        path: '/integrations/providers',
      },
    ],
    [
      access.canReadIntegrationProviders,
      access.canReadJobs,
      access.canReadOnlineUsers,
      access.canReadOpenApiStatus,
      access.canReadRoles,
      access.canReadSystemConfig,
      access.canReadSystemNotices,
      access.canReadUsers,
      formatMessage,
    ],
  );
  const metricItems: MetricItem[] = useMemo(() => {
    const items: MetricItem[] = [
      {
        actionPath: access.canReadSystemNotices ? '/system/notices' : undefined,
        description: formatMessage(
          'pages.dashboard.metrics.unreadNoticesDesc',
          'Current account unread',
        ),
        enabled: true,
        icon: <BellOutlined />,
        key: 'unreadNotices',
        title: formatMessage(
          'pages.dashboard.metrics.unreadNotices',
          'Unread notices',
        ),
        tone: (workbench.unreadNotices ?? 0) > 0 ? 'warning' : 'normal',
        value: workbench.unreadNotices,
      },
      {
        actionPath: '/monitor/online-users',
        description: formatMessage(
          'pages.dashboard.metrics.onlineUsersDesc',
          'Active sessions',
        ),
        enabled: access.canReadOnlineUsers,
        icon: <TeamOutlined />,
        key: 'onlineUsers',
        title: formatMessage(
          'pages.dashboard.metrics.onlineUsers',
          'Online users',
        ),
        tone: 'normal',
        value: workbench.onlineUsers?.activeUsers,
      },
      {
        actionPath: '/monitor/jobs',
        description: formatMessage(
          'pages.dashboard.metrics.failedJobsDesc',
          'Scheduler run failures',
        ),
        enabled: access.canReadJobs,
        icon: <ClockCircleOutlined />,
        key: 'failedJobs',
        title: formatMessage(
          'pages.dashboard.metrics.failedJobs',
          'Failed jobs',
        ),
        tone:
          (workbench.operations?.jobRuns.failed ?? 0) > 0 ? 'danger' : 'normal',
        value: workbench.operations?.jobRuns.failed,
      },
      {
        actionPath: '/integrations/providers',
        description: formatMessage(
          'pages.dashboard.metrics.failedOutboxDesc',
          'Mail/SMS outbox',
        ),
        enabled: access.canReadIntegrationProviders,
        icon: <FileSearchOutlined />,
        key: 'failedOutbox',
        title: formatMessage(
          'pages.dashboard.metrics.failedOutbox',
          'Failed outbox',
        ),
        tone: (failedOutbox ?? 0) > 0 ? 'danger' : 'normal',
        value: failedOutbox,
      },
      {
        actionPath: '/integrations/providers',
        description: formatMessage(
          'pages.dashboard.metrics.providerAttentionDesc',
          'attention / blocked',
        ),
        enabled: access.canReadIntegrationProviders,
        icon: <ExclamationCircleOutlined />,
        key: 'providerAttention',
        suffix:
          workbench.providerHealth !== undefined
            ? `/ ${workbench.providerHealth.totals.total}`
            : undefined,
        title: formatMessage(
          'pages.dashboard.metrics.providerAttention',
          'Provider issues',
        ),
        tone: (providerIssues ?? 0) > 0 ? 'warning' : 'normal',
        value: providerIssues,
      },
      {
        actionPath: '/security/login-logs',
        description: formatMessage(
          'pages.dashboard.metrics.lockedAccountsDesc',
          'Account locked logs',
        ),
        enabled: access.canReadLoginLogs,
        icon: <LoginOutlined />,
        key: 'lockedAccounts',
        title: formatMessage(
          'pages.dashboard.metrics.lockedAccounts',
          'Locked accounts',
        ),
        tone: (workbench.lockedAccounts ?? 0) > 0 ? 'warning' : 'normal',
        value: workbench.lockedAccounts,
      },
    ];

    return items.filter((item) => item.enabled);
  }, [
    access.canReadIntegrationProviders,
    access.canReadJobs,
    access.canReadLoginLogs,
    access.canReadOnlineUsers,
    access.canReadSystemNotices,
    failedOutbox,
    formatMessage,
    providerIssues,
    workbench.lockedAccounts,
    workbench.onlineUsers?.activeUsers,
    workbench.operations?.jobRuns.failed,
    workbench.providerHealth,
    workbench.unreadNotices,
  ]);
  const attentionItems: AttentionItem[] = useMemo(() => {
    const items: AttentionItem[] = [];
    const failedJobs = workbench.operations?.jobRuns.failed ?? 0;
    if (failedJobs > 0) {
      items.push({
        actionPath: '/monitor/jobs',
        description: formatMessage(
          'pages.dashboard.attention.failedJobsDesc',
          'Open failed run logs and retry only after diagnosis.',
        ),
        key: 'failedJobs',
        title: formatMessage(
          'pages.dashboard.attention.failedJobs',
          '{count} scheduler jobs failed',
          { count: failedJobs },
        ),
        tone: 'error',
      });
    }

    if (queuedJobs + runningJobs > 0) {
      items.push({
        actionPath: '/monitor/jobs',
        description: formatMessage(
          'pages.dashboard.attention.queuedJobsDesc',
          'There are pending or running scheduler jobs.',
        ),
        key: 'queuedJobs',
        title: formatMessage(
          'pages.dashboard.attention.queuedJobs',
          '{count} scheduler jobs are pending',
          { count: queuedJobs + runningJobs },
        ),
        tone: 'warning',
      });
    }

    if ((failedOutbox ?? 0) > 0) {
      items.push({
        actionPath: '/integrations/providers',
        description: formatMessage(
          'pages.dashboard.attention.failedOutboxDesc',
          'Check provider diagnostics before replaying messages.',
        ),
        key: 'failedOutbox',
        title: formatMessage(
          'pages.dashboard.attention.failedOutbox',
          '{count} delivery messages failed',
          { count: failedOutbox ?? 0 },
        ),
        tone: 'error',
      });
    }

    if ((providerIssues ?? 0) > 0) {
      items.push({
        actionPath: '/integrations/providers',
        description: formatMessage(
          'pages.dashboard.attention.providerAttentionDesc',
          'Provider readiness has attention or blocked entries.',
        ),
        key: 'providerAttention',
        title: formatMessage(
          'pages.dashboard.attention.providerAttention',
          '{count} providers need attention',
          { count: providerIssues ?? 0 },
        ),
        tone: 'warning',
      });
    }

    if ((workbench.lockedAccounts ?? 0) > 0) {
      items.push({
        actionPath: '/security/login-logs',
        description: formatMessage(
          'pages.dashboard.attention.lockedAccountsDesc',
          'Review login logs before unlocking users.',
        ),
        key: 'lockedAccounts',
        title: formatMessage(
          'pages.dashboard.attention.lockedAccounts',
          '{count} accounts are locked',
          { count: workbench.lockedAccounts ?? 0 },
        ),
        tone: 'warning',
      });
    }

    if (workbench.status?.status === 'degraded') {
      items.push({
        actionPath: '/monitor/status',
        description: formatMessage(
          'pages.dashboard.attention.systemDegradedDesc',
          'One or more runtime dependencies are degraded.',
        ),
        key: 'systemDegraded',
        title: formatMessage(
          'pages.dashboard.attention.systemDegraded',
          'Runtime status is degraded',
        ),
        tone: 'warning',
      });
    }

    if (
      workbench.drift !== undefined &&
      (workbench.drift.status !== 'configured' ||
        !workbench.drift.snapshotExists)
    ) {
      items.push({
        actionPath: '/tools/openapi',
        description: formatMessage(
          'pages.dashboard.attention.openapiNotReadyDesc',
          'Refresh the OpenAPI snapshot before relying on generated clients.',
        ),
        key: 'openapiNotReady',
        title: formatMessage(
          'pages.dashboard.attention.openapiNotReady',
          'OpenAPI snapshot is not ready',
        ),
        tone: 'warning',
      });
    }

    return items;
  }, [
    failedOutbox,
    formatMessage,
    providerIssues,
    queuedJobs,
    runningJobs,
    workbench.drift,
    workbench.lockedAccounts,
    workbench.operations?.jobRuns.failed,
    workbench.status?.status,
  ]);

  const platformRows = [
    {
      key: 'live',
      label: formatMessage('pages.dashboard.platform.apiLive', 'API Live'),
      value: (
        <Tag color={booleanTone(workbench.health.live)}>
          {workbench.health.live
            ? formatMessage('pages.dashboard.status.ready', 'Ready')
            : formatMessage('pages.dashboard.status.notReady', 'Not ready')}
        </Tag>
      ),
    },
    {
      key: 'ready',
      label: formatMessage('pages.dashboard.platform.apiReady', 'API Ready'),
      value: (
        <Tag color={booleanTone(workbench.health.ready)}>
          {workbench.health.ready
            ? formatMessage('pages.dashboard.status.ready', 'Ready')
            : formatMessage('pages.dashboard.status.notReady', 'Not ready')}
        </Tag>
      ),
    },
    {
      key: 'runtime',
      label: formatMessage('pages.dashboard.platform.runtime', 'Runtime'),
      value: (
        <Tag color={runtimeTone(workbench.status?.status)}>
          {workbench.status?.status === 'ok'
            ? formatMessage('pages.dashboard.status.ok', 'OK')
            : workbench.status?.status === 'degraded'
              ? formatMessage('pages.dashboard.status.degraded', 'Degraded')
              : formatMessage(
                  'pages.dashboard.status.unavailable',
                  'Unavailable',
                )}
        </Tag>
      ),
    },
    {
      key: 'openapi',
      label: formatMessage('pages.dashboard.platform.openapi', 'OpenAPI'),
      value: (
        <Space size={4} wrap>
          <Tag color={openApiTone(workbench.drift)}>
            {workbench.drift?.status === 'configured' &&
            workbench.drift.snapshotExists
              ? formatMessage('pages.dashboard.status.configured', 'Configured')
              : workbench.drift?.status === 'invalid'
                ? formatMessage('pages.dashboard.status.invalid', 'Invalid')
                : formatMessage('pages.dashboard.status.missing', 'Missing')}
          </Tag>
          {workbench.drift ? (
            <Typography.Text type="secondary">
              {formatMessage(
                'pages.dashboard.platform.openapiCounts',
                '{paths} paths / {schemas} schemas / {operations} operations',
                {
                  operations: workbench.drift.operationCount,
                  paths: workbench.drift.pathCount,
                  schemas: workbench.drift.schemaCount,
                },
              )}
            </Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      key: 'deployment',
      label: formatMessage(
        'pages.dashboard.platform.deploymentId',
        'Deployment ID',
      ),
      value: workbench.version?.deploymentId ?? '-',
    },
    {
      key: 'buildTime',
      label: formatMessage('pages.dashboard.platform.buildTime', 'Build time'),
      value: formatDateTime(workbench.version?.buildTime),
    },
  ];

  return (
    <PageContainer
      extra={[
        <Tooltip
          key="reload"
          title={formatMessage(
            'pages.dashboard.actions.reloadAria',
            'Reload workbench data',
          )}
        >
          <Button
            aria-label={formatMessage(
              'pages.dashboard.actions.reloadAria',
              'Reload workbench data',
            )}
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void loadWorkbench()}
          />
        </Tooltip>,
      ]}
      subTitle={formatMessage(
        'pages.dashboard.section',
        'Live operations workbench',
      )}
      title={formatMessage('pages.dashboard.title', 'Workbench')}
    >
      <div className={styles.shell}>
        <section className={styles.welcomePanel}>
          <div className={styles.welcomeIdentity}>
            <Avatar
              className={styles.avatar}
              icon={<UserOutlined />}
              size={58}
              src={currentUser?.avatar}
            />
            <div className={styles.welcomeCopy}>
              <Typography.Title
                className={styles.welcomeTitle}
                ellipsis
                level={3}
              >
                {formatMessage(
                  'pages.dashboard.welcome.greeting',
                  'Welcome back, {name}',
                  { name: userName },
                )}
              </Typography.Title>
              <Typography.Text className={styles.welcomeDescription}>
                {formatMessage(
                  'pages.dashboard.welcome.description',
                  'Current runtime status, attention items and common admin actions.',
                )}
              </Typography.Text>
            </div>
          </div>
          <div className={styles.welcomeMeta}>
            <Tag icon={<CloudServerOutlined />}>
              {formatMessage('pages.dashboard.welcome.environment', 'Env')}:{' '}
              {workbench.version?.environment ?? '-'}
            </Tag>
            <Tag icon={<DeploymentUnitOutlined />}>
              {formatMessage('pages.dashboard.welcome.deployment', 'Deploy')}:{' '}
              {workbench.version?.deploymentId ?? '-'}
            </Tag>
            <Tag>
              {formatMessage('pages.dashboard.welcome.commit', 'Commit')}:{' '}
              {shortCommit(workbench.version?.commit)}
            </Tag>
            {roleCodes.length > 0 ? (
              roleCodes.slice(0, 3).map((roleCode) => (
                <Tag key={roleCode} color="blue">
                  {roleCode}
                </Tag>
              ))
            ) : (
              <Tag>
                {formatMessage(
                  'pages.dashboard.welcome.roleFallback',
                  'No roles',
                )}
              </Tag>
            )}
          </div>
        </section>

        {loadErrors.length > 0 ? (
          <Alert
            message={formatMessage(
              'pages.dashboard.load.partial',
              'Some workbench data failed to load',
            )}
            showIcon
            type="warning"
            description={
              <Space direction="vertical" size={2}>
                {loadErrors.map((error) => (
                  <Typography.Text key={`${error.label}-${error.message}`}>
                    {formatMessage(
                      'pages.dashboard.load.sectionFailed',
                      '{section}: {message}',
                      {
                        message: error.message,
                        section: error.label,
                      },
                    )}
                  </Typography.Text>
                ))}
              </Space>
            }
          />
        ) : null}

        {loading ? (
          <section className={styles.metricGrid}>
            {skeletonMetricKeys.map((key) => (
              <div className={styles.metricTile} key={key}>
                <Skeleton active paragraph={{ rows: 2 }} title />
              </div>
            ))}
          </section>
        ) : (
          <section className={styles.metricGrid}>
            {metricItems.map((metric) => (
              <button
                className={`${styles.metricTile} ${styles[metric.tone]}`}
                disabled={!metric.actionPath}
                key={metric.key}
                onClick={() =>
                  metric.actionPath
                    ? history.push(metric.actionPath)
                    : undefined
                }
                type="button"
              >
                <span className={styles.metricHeader}>
                  <span className={styles.metricTitle}>{metric.title}</span>
                  <span className={styles.metricIcon}>{metric.icon}</span>
                </span>
                <Statistic
                  className={styles.metricStatistic}
                  suffix={metric.suffix}
                  value={metric.value ?? '-'}
                />
                <Typography.Text className={styles.metricDescription}>
                  {metric.description}
                </Typography.Text>
              </button>
            ))}
          </section>
        )}

        <section className={styles.statusGrid}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <Typography.Title level={4}>
                {formatMessage('pages.dashboard.cards.shortcuts', 'Shortcuts')}
              </Typography.Title>
            </div>
            {shortcutItems.some((item) => item.enabled) ? (
              <div className={styles.shortcutGrid}>
                {shortcutItems
                  .filter((item) => item.enabled)
                  .map((item) => (
                    <Button
                      className={styles.shortcutButton}
                      icon={item.icon}
                      key={item.key}
                      onClick={() => history.push(item.path)}
                    >
                      {item.label}
                    </Button>
                  ))}
              </div>
            ) : (
              <Empty
                description={formatMessage(
                  'pages.dashboard.empty.noShortcuts',
                  'No shortcuts available for this account',
                )}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <Typography.Title level={4}>
                {formatMessage('pages.dashboard.cards.attention', 'Attention')}
              </Typography.Title>
            </div>
            {attentionItems.length > 0 ? (
              <div className={styles.attentionList}>
                {attentionItems.map((item) => (
                  <button
                    className={`${styles.attentionItem} ${
                      item.tone === 'error' ? styles.attentionError : ''
                    }`}
                    key={item.key}
                    onClick={() =>
                      item.actionPath
                        ? history.push(item.actionPath)
                        : undefined
                    }
                    type="button"
                  >
                    <span className={styles.attentionCopy}>
                      <Typography.Text strong>{item.title}</Typography.Text>
                      <Typography.Text type="secondary">
                        {item.description}
                      </Typography.Text>
                    </span>
                    {item.tone === 'error' ? (
                      <ExclamationCircleOutlined />
                    ) : (
                      <CheckCircleOutlined />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <Empty
                description={formatMessage(
                  'pages.dashboard.attention.none',
                  'No active attention items',
                )}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <Typography.Title level={4}>
              {formatMessage(
                'pages.dashboard.cards.platformStatus',
                'Platform status',
              )}
            </Typography.Title>
          </div>
          <div className={styles.platformGrid}>
            {platformRows.map((row) => (
              <div className={styles.platformItem} key={row.key}>
                <Typography.Text type="secondary">{row.label}</Typography.Text>
                <Typography.Text className={styles.platformValue}>
                  {row.value}
                </Typography.Text>
              </div>
            ))}
            <div className={styles.platformItem}>
              <Typography.Text type="secondary">
                {formatMessage('pages.dashboard.platform.environment', 'Env')}
              </Typography.Text>
              <Typography.Text className={styles.platformValue}>
                {workbench.version?.environment ?? '-'}
              </Typography.Text>
            </div>
            <div className={styles.platformItem}>
              <Typography.Text type="secondary">
                {formatMessage('pages.dashboard.platform.commit', 'Commit')}
              </Typography.Text>
              <Typography.Text className={styles.platformValue}>
                {shortCommit(workbench.version?.commit)}
              </Typography.Text>
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  );
};

export default DashboardPage;
