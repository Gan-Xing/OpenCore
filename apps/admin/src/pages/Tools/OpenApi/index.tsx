import EmptyState from '@/components/EmptyState';
import {
  ApiOutlined,
  BranchesOutlined,
  HeartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import type { OpenApiDriftStatus } from '@opencore/sdk';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getOpenCoreOpenApiDriftStatus } from '@/services/opencore/platform';
import styles from './index.less';

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

function statusColor(status: OpenApiDriftStatus['status'] | undefined): string {
  if (status === 'configured') {
    return 'green';
  }
  if (status === 'invalid' || status === 'missing') {
    return 'red';
  }
  return 'blue';
}

const OpenApiStatusPage: React.FC = () => {
  const intl = useIntl();
  const [driftStatus, setDriftStatus] = useState<OpenApiDriftStatus>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const driftStatusLabels = useMemo(
    () => ({
      configured: formatMessage(
        'pages.tools.openapi.status.configured',
        'configured',
      ),
      invalid: formatMessage('pages.tools.openapi.status.invalid', 'invalid'),
      missing: formatMessage('pages.tools.openapi.status.missing', 'missing'),
      loading: formatMessage('pages.tools.openapi.status.loading', 'loading'),
    }),
    [formatMessage],
  );
  const contractStatusLabels = useMemo(
    () => ({
      available: formatMessage(
        'pages.tools.openapi.status.available',
        'available',
      ),
      configured: formatMessage(
        'pages.tools.openapi.status.configured',
        'configured',
      ),
      invalid: formatMessage('pages.tools.openapi.status.invalid', 'invalid'),
      live: formatMessage('pages.tools.openapi.status.live', 'live'),
      loaded: formatMessage('pages.tools.openapi.status.loaded', 'loaded'),
      loading: formatMessage('pages.tools.openapi.status.loading', 'loading'),
      missing: formatMessage('pages.tools.openapi.status.missing', 'missing'),
      ready: formatMessage('pages.tools.openapi.status.ready', 'ready'),
    }),
    [formatMessage],
  );

  const loadDriftStatus = async () => {
    setLoading(true);
    try {
      const nextStatus = await getOpenCoreOpenApiDriftStatus();
      setDriftStatus(nextStatus);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.tools.openapi.load.failure',
              'Unable to load OpenAPI drift status.',
            ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDriftStatus();
  }, []);

  const contractRows = useMemo(
    () => [
      {
        key: 'swagger',
        label: formatMessage(
          'pages.tools.openapi.contract.swagger',
          'Swagger UI',
        ),
        value: '/api/docs',
        status: 'available',
      },
      {
        key: 'snapshot',
        label: formatMessage(
          'pages.tools.openapi.contract.snapshot',
          'Contract snapshot',
        ),
        value:
          driftStatus?.snapshotPath ??
          'packages/contracts/openapi/opencore-api.json',
        status: driftStatus?.snapshotExists ? 'loaded' : 'missing',
      },
      {
        key: 'command',
        label: formatMessage(
          'pages.tools.openapi.contract.exportCommand',
          'Export command',
        ),
        value: driftStatus?.exportCommand ?? 'pnpm openapi:export',
        status: 'ready',
      },
      {
        key: 'drift',
        label: formatMessage(
          'pages.tools.openapi.contract.driftCheck',
          'Drift check',
        ),
        value: driftStatus?.driftCheckCommand ?? 'pnpm openapi:check',
        status: driftStatus?.status ?? 'loading',
      },
      {
        key: 'checkedAt',
        label: formatMessage(
          'pages.tools.openapi.contract.checkedAt',
          'Checked at',
        ),
        value:
          driftStatus?.checkedAt ??
          formatMessage('pages.tools.openapi.status.loading', 'loading'),
        status: 'live',
      },
    ],
    [driftStatus, formatMessage],
  );

  return (
    <PageContainer
      title={formatMessage('pages.tools.openapi.title', 'Live OpenAPI drift')}
      subTitle={formatMessage('pages.tools.openapi.section', 'S5 status entry')}
      extra={[
        <Button key="docs" icon={<ApiOutlined />} href="/api/docs">
          {formatMessage('pages.tools.openapi.actions.swagger', 'Swagger')}
        </Button>,
        <Button key="ready" icon={<HeartOutlined />} href="/health/ready">
          {formatMessage('pages.tools.openapi.actions.readiness', 'Readiness')}
        </Button>,
        <Tooltip
          key="reload"
          title={formatMessage(
            'pages.tools.openapi.actions.reload',
            'Reload OpenAPI drift',
          )}
        >
          <Button
            aria-label={formatMessage(
              'pages.tools.openapi.actions.reloadAria',
              'Reload OpenAPI drift',
            )}
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void loadDriftStatus()}
          />
        </Tooltip>,
      ]}
    >
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message={formatMessage(
            'pages.tools.openapi.load.liveFailure',
            'Unable to load live OpenAPI drift status',
          )}
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.tools.openapi.stats.snapshotPaths',
            'Snapshot paths',
          )}
          value={driftStatus?.pathCount ?? 0}
        />
        <Statistic
          title={formatMessage(
            'pages.tools.openapi.stats.snapshotSchemas',
            'Snapshot schemas',
          )}
          value={driftStatus?.schemaCount ?? 0}
        />
        <Statistic
          title={formatMessage(
            'pages.tools.openapi.stats.snapshotOperations',
            'Snapshot operations',
          )}
          value={driftStatus?.operationCount ?? 0}
        />
        <Tag color={statusColor(driftStatus?.status)}>
          {driftStatus
            ? driftStatusLabels[driftStatus.status]
            : driftStatusLabels.loading}
        </Tag>
      </Space>
      <div className={styles.statusGrid}>
        <Card
          title={formatMessage(
            'pages.tools.openapi.cards.contractStatus',
            'Contract status',
          )}
        >
          <Descriptions column={1} bordered size="small">
            {contractRows.map((row) => (
              <Descriptions.Item
                key={row.key}
                label={
                  <Space>
                    <Tag color="blue">
                      {
                        contractStatusLabels[
                          row.status as keyof typeof contractStatusLabels
                        ]
                      }
                    </Tag>
                    {row.label}
                  </Space>
                }
              >
                {row.value}
              </Descriptions.Item>
            ))}
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.openapi.contract.snapshotSha256',
                'Snapshot SHA-256',
              )}
            >
              {driftStatus?.snapshotSha256 ??
                formatMessage(
                  'pages.tools.openapi.status.unavailable',
                  'unavailable',
                )}
            </Descriptions.Item>
            <Descriptions.Item
              label={formatMessage(
                'pages.tools.openapi.contract.snapshotUpdated',
                'Snapshot updated',
              )}
            >
              {driftStatus?.snapshotUpdatedAt ??
                formatMessage(
                  'pages.tools.openapi.status.unavailable',
                  'unavailable',
                )}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card
          title={formatMessage(
            'pages.tools.openapi.cards.driftGuard',
            'Drift guard',
          )}
        >
          <Space direction="vertical" size="middle">
            <Typography.Text>
              {formatMessage(
                'pages.tools.openapi.policy.driftGuard',
                'OpenAPI drift is checked against the committed contract snapshot.',
              )}
            </Typography.Text>
            <pre className={styles.commandBlock}>
              <code>
                {driftStatus?.driftCheckCommand ?? 'pnpm openapi:check'}
              </code>
            </pre>
            <EmptyState
              title={
                driftStatus?.status === 'configured'
                  ? formatMessage(
                      'pages.tools.openapi.empty.snapshotConfigured',
                      'Snapshot configured',
                    )
                  : formatMessage(
                      'pages.tools.openapi.empty.snapshotNeedsAttention',
                      'Snapshot needs attention',
                    )
              }
              description={
                driftStatus?.snapshotPath ??
                'packages/contracts/openapi/opencore-api.json'
              }
            />
          </Space>
        </Card>

        <Card
          title={formatMessage(
            'pages.tools.openapi.cards.traceContract',
            'Trace contract',
          )}
        >
          <Space direction="vertical">
            <Typography.Text>
              {formatMessage(
                'pages.tools.openapi.policy.traceContract',
                'Admin requests attach `x-request-id` and `x-trace-id`.',
              )}
            </Typography.Text>
            <Tag icon={<BranchesOutlined />}>
              {formatMessage(
                'pages.tools.openapi.status.requestScoped',
                'request scoped',
              )}
            </Tag>
          </Space>
        </Card>
      </div>
    </PageContainer>
  );
};

export default OpenApiStatusPage;
