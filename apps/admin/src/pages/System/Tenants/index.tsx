import { ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import type {
  TenantFoundationSummary,
  TenantPlanFoundationSummary,
  TenancyFoundationSummary,
} from '@opencore/sdk';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Space,
  Statistic,
  Tag,
  Tooltip,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getOpenCoreTenancyFoundation } from '@/services/opencore/platform';

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const TENANT_READ_PERMISSION_MARKER = 'platform:tenant:read';

function statusColor(status: string): string {
  if (status === 'active') {
    return 'green';
  }

  if (status === 'expired') {
    return 'orange';
  }

  return 'red';
}

export default function TenantsPage() {
  const intl = useIntl();
  const [summary, setSummary] = useState<TenancyFoundationSummary>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );

  const loadSummary = async () => {
    setLoading(true);
    try {
      setSummary(await getOpenCoreTenancyFoundation());
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.tenants.load.failure',
              'Unable to load live tenant foundation.',
            ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const backfillWarnings = useMemo(() => {
    if (!summary) {
      return [];
    }

    const warnings: string[] = [];
    if (summary.backfill.missingRootMembershipUsernames.length > 0) {
      warnings.push(
        formatMessage(
          'pages.system.tenants.warning.missingMemberships',
          'Missing root memberships: {usernames}',
          {
            usernames:
              summary.backfill.missingRootMembershipUsernames.join(', '),
          },
        ),
      );
    }

    if (
      summary.backfill.userRoleCount !==
      summary.backfill.rootMembershipRoleCount
    ) {
      warnings.push(
        formatMessage(
          'pages.system.tenants.warning.roleBackfill',
          'Role backfill mismatch: legacy {legacy}, root {root}',
          {
            legacy: summary.backfill.userRoleCount,
            root: summary.backfill.rootMembershipRoleCount,
          },
        ),
      );
    }

    if (
      summary.backfill.userPostCount !==
      summary.backfill.rootMembershipPostCount
    ) {
      warnings.push(
        formatMessage(
          'pages.system.tenants.warning.postBackfill',
          'Post backfill mismatch: legacy {legacy}, root {root}',
          {
            legacy: summary.backfill.userPostCount,
            root: summary.backfill.rootMembershipPostCount,
          },
        ),
      );
    }

    return warnings;
  }, [formatMessage, summary]);

  const tenantColumns = useMemo<ProColumns<TenantFoundationSummary>[]>(
    () => [
      {
        title: formatMessage('pages.system.tenants.fields.code', 'Code'),
        dataIndex: 'code',
      },
      {
        title: formatMessage('pages.system.tenants.fields.name', 'Name'),
        dataIndex: 'name',
      },
      {
        title: formatMessage('pages.system.tenants.fields.status', 'Status'),
        dataIndex: 'status',
        render: (_, record) => (
          <Tag color={statusColor(record.status)}>{record.status}</Tag>
        ),
      },
      {
        title: formatMessage('pages.system.tenants.fields.plan', 'Plan'),
        dataIndex: 'planCode',
        renderText: (value) => value ?? '-',
      },
      {
        title: formatMessage('pages.system.tenants.fields.members', 'Members'),
        dataIndex: 'membershipCount',
      },
      {
        title: formatMessage('pages.system.tenants.fields.owners', 'Owners'),
        dataIndex: 'ownerUsernames',
        render: (_, record) =>
          record.ownerUsernames.length > 0
            ? record.ownerUsernames.join(', ')
            : '-',
      },
    ],
    [formatMessage],
  );

  const planColumns = useMemo<ProColumns<TenantPlanFoundationSummary>[]>(
    () => [
      {
        title: formatMessage('pages.system.tenants.fields.code', 'Code'),
        dataIndex: 'code',
      },
      {
        title: formatMessage('pages.system.tenants.fields.name', 'Name'),
        dataIndex: 'name',
      },
      {
        title: formatMessage('pages.system.tenants.fields.enabled', 'Enabled'),
        dataIndex: 'enabled',
        render: (_, record) => (
          <Tag color={record.enabled ? 'green' : 'red'}>
            {record.enabled ? 'true' : 'false'}
          </Tag>
        ),
      },
      {
        title: formatMessage('pages.system.tenants.fields.modules', 'Modules'),
        dataIndex: 'moduleCodes',
        render: (_, record) => record.moduleCodes.length,
      },
    ],
    [formatMessage],
  );

  return (
    <PageContainer
      title={formatMessage('pages.system.tenants.title', 'Tenants')}
      subTitle={formatMessage(
        'pages.system.tenants.section',
        'Tenant Foundation',
      )}
      extra={[
        <Tooltip
          key="reload"
          title={formatMessage(
            'pages.system.tenants.actions.reload',
            'Reload tenant foundation',
          )}
        >
          <Button
            aria-label={formatMessage(
              'pages.system.tenants.actions.reloadAria',
              'Reload tenant foundation',
            )}
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => void loadSummary()}
          />
        </Tooltip>,
      ]}
    >
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message={formatMessage(
            'pages.system.tenants.load.liveFailure',
            'Unable to load live tenant foundation',
          )}
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}

      {backfillWarnings.length > 0 ? (
        <Alert
          showIcon
          type="warning"
          message={formatMessage(
            'pages.system.tenants.warning.title',
            'Root tenant backfill needs attention',
          )}
          description={backfillWarnings.join(' | ')}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}

      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage('pages.system.tenants.stats.mode', 'Mode')}
          value={summary?.tenancyMode ?? '-'}
        />
        <Statistic
          title={formatMessage('pages.system.tenants.stats.tenants', 'Tenants')}
          value={summary?.tenants.length ?? 0}
        />
        <Statistic
          title={formatMessage(
            'pages.system.tenants.stats.memberships',
            'Root memberships',
          )}
          value={summary?.backfill.rootMembershipCount ?? 0}
        />
        <Statistic
          title={formatMessage(
            'pages.system.tenants.stats.platformRoles',
            'Platform roles',
          )}
          value={summary?.platformRoles.length ?? 0}
        />
        <Tag icon={<SafetyCertificateOutlined />} color="blue">
          {TENANT_READ_PERMISSION_MARKER}
        </Tag>
      </Space>

      <Descriptions
        bordered
        column={{ lg: 2, md: 1, sm: 1, xl: 3, xs: 1, xxl: 3 }}
        size="small"
        style={{ marginBottom: 16 }}
        title={formatMessage(
          'pages.system.tenants.sections.backfill',
          'Backfill parity',
        )}
      >
        <Descriptions.Item
          label={formatMessage('pages.system.tenants.fields.users', 'Users')}
        >
          {summary?.backfill.userCount ?? 0}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.system.tenants.fields.roleBindings',
            'Role bindings',
          )}
        >
          {summary
            ? `${summary.backfill.rootMembershipRoleCount}/${summary.backfill.userRoleCount}`
            : '-'}
        </Descriptions.Item>
        <Descriptions.Item
          label={formatMessage(
            'pages.system.tenants.fields.postBindings',
            'Post bindings',
          )}
        >
          {summary
            ? `${summary.backfill.rootMembershipPostCount}/${summary.backfill.userPostCount}`
            : '-'}
        </Descriptions.Item>
      </Descriptions>

      <ProTable<TenantFoundationSummary>
        columns={tenantColumns}
        dataSource={[...(summary?.tenants ?? [])]}
        loading={loading}
        pagination={false}
        rowKey="id"
        search={false}
        style={{ marginBottom: 16 }}
        toolBarRender={false}
      />

      <ProTable<TenantPlanFoundationSummary>
        columns={planColumns}
        dataSource={[...(summary?.plans ?? [])]}
        loading={loading}
        pagination={false}
        rowKey="id"
        search={false}
        toolBarRender={false}
      />
    </PageContainer>
  );
}
