import { ReloadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import type { VersionInfoSummary } from '@opencore/sdk';
import {
  Alert,
  Button,
  Descriptions,
  Space,
  Statistic,
  Tag,
  Tooltip,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { getOpenCoreVersionInfo } from '@/services/opencore/platform';

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

function formatUptime(
  seconds: number | undefined,
  formatMessage: FormatMessage,
): string {
  if (seconds === undefined) {
    return formatMessage(
      'pages.monitor.version.static.unavailable',
      'Unavailable',
    );
  }

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return formatMessage(
      'pages.monitor.version.uptime.daysHours',
      '{days}d {hours}h',
      {
        days,
        hours: hours % 24,
      },
    );
  }
  if (hours > 0) {
    return formatMessage(
      'pages.monitor.version.uptime.hoursMinutes',
      '{hours}h {minutes}m',
      { hours, minutes: minutes % 60 },
    );
  }
  return formatMessage('pages.monitor.version.uptime.minutes', '{minutes}m', {
    minutes,
  });
}

export default function VersionPage() {
  const intl = useIntl();
  const [version, setVersion] = useState<VersionInfoSummary>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const unknownLabel = formatMessage(
    'pages.monitor.version.static.unknown',
    'unknown',
  );
  const unavailableLabel = formatMessage(
    'pages.monitor.version.static.unavailable',
    'Unavailable',
  );

  const loadVersion = async () => {
    setLoading(true);
    try {
      const nextVersion = await getOpenCoreVersionInfo();
      setVersion(nextVersion);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.monitor.version.load.failure',
              'Unable to load OpenCore runtime version.',
            ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVersion();
  }, []);

  return (
    <PageContainer
      title={formatMessage(
        'pages.monitor.version.title',
        'Live runtime version',
      )}
      subTitle={formatMessage(
        'pages.monitor.runtime.section',
        'Runtime Monitor',
      )}
    >
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message={formatMessage(
            'pages.monitor.version.load.liveFailure',
            'Unable to load live runtime metadata',
          )}
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.monitor.version.stats.runtime',
            'OpenCore runtime',
          )}
          value={version?.runtime ?? '-'}
        />
        <Statistic
          title={formatMessage(
            'pages.monitor.version.fields.version',
            'Version',
          )}
          value={version?.version ?? '-'}
        />
        <Statistic
          title={formatMessage('pages.monitor.version.fields.uptime', 'Uptime')}
          value={formatUptime(version?.uptimeSeconds, formatMessage)}
        />
        <Tooltip
          title={formatMessage(
            'pages.monitor.version.actions.reload',
            'Reload version info',
          )}
        >
          <Button
            aria-label={formatMessage(
              'pages.monitor.version.actions.reloadAria',
              'Reload version info',
            )}
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void loadVersion()}
          />
        </Tooltip>
      </Space>
      <Descriptions bordered column={1} size="middle">
        <Descriptions.Item
          label={formatMessage('pages.monitor.version.fields.name', 'Name')}
        >
          {version?.name ?? unavailableLabel}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.version.fields.environment',
            'Environment',
          )}
        >
          <Tag color={version?.environment === 'production' ? 'green' : 'blue'}>
            {version?.environment ?? unknownLabel}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage('pages.monitor.version.fields.commit', 'Commit')}
        >
          {version?.commit ?? unknownLabel}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.version.fields.buildTime',
            'Build time',
          )}
        >
          {version?.buildTime ?? unknownLabel}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.version.fields.deploymentId',
            'Deployment ID',
          )}
        >
          {version?.deploymentId ?? unknownLabel}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage('pages.monitor.version.fields.node', 'Node')}
        >
          {version?.nodeVersion ?? unknownLabel}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.version.fields.platform',
            'Platform',
          )}
        >
          {version ? `${version.platform}/${version.arch}` : unknownLabel}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.version.fields.processId',
            'Process ID',
          )}
        >
          {version?.processId ?? unknownLabel}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.version.fields.startedAt',
            'Started at',
          )}
        >
          {version?.startedAt ?? unknownLabel}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.monitor.version.fields.timezone',
            'Timezone',
          )}
        >
          {version?.timezone ?? unknownLabel}
        </Descriptions.Item>
      </Descriptions>
    </PageContainer>
  );
}
