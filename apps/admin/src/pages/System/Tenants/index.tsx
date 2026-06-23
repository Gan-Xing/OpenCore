import {
  EditOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import type {
  RoleSummary,
  SystemDeptOptionSummary,
  SystemPostOptionSummary,
  TenantFoundationSummary,
  TenantMemberSummary,
  TenantPlanFoundationSummary,
  TenancyFoundationSummary,
} from '@opencore/sdk';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Form,
  Modal,
  Select,
  Space,
  Statistic,
  Tag,
  Tooltip,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getOpenCoreTenancyFoundation,
  listOpenCoreRoles,
  listOpenCoreSystemDeptOptions,
  listOpenCoreSystemPostOptions,
  listOpenCoreTenantMembers,
  updateOpenCoreTenantMemberAssignments,
} from '@/services/opencore/platform';

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const TENANT_READ_PERMISSION_MARKER = 'platform:tenant:read';

type MemberAssignmentFormValues = {
  deptId?: string;
  postCodes?: string[];
  roleCodes?: string[];
  status: 'active' | 'suspended';
};

function statusColor(status: string): string {
  if (status === 'active') {
    return 'green';
  }

  if (status === 'expired') {
    return 'orange';
  }

  return 'red';
}

function createRoleOptions(rows: readonly RoleSummary[]) {
  return [...rows]
    .sort((left, right) => left.code.localeCompare(right.code))
    .map((role) => ({
      label: `${role.name} (${role.code})`,
      value: role.code,
    }));
}

function createDeptOptions(rows: readonly SystemDeptOptionSummary[]) {
  return [...rows]
    .sort(
      (left, right) =>
        left.order - right.order || left.name.localeCompare(right.name),
    )
    .map((dept) => ({
      label: dept.name,
      value: dept.id,
    }));
}

function createPostOptions(rows: readonly SystemPostOptionSummary[]) {
  return [...rows]
    .sort(
      (left, right) =>
        left.order - right.order || left.name.localeCompare(right.name),
    )
    .map((post) => ({
      label: `${post.name} (${post.code})`,
      value: post.code,
    }));
}

export default function TenantsPage() {
  const intl = useIntl();
  const [form] = Form.useForm<MemberAssignmentFormValues>();
  const [summary, setSummary] = useState<TenancyFoundationSummary>();
  const [members, setMembers] = useState<readonly TenantMemberSummary[]>([]);
  const [roles, setRoles] = useState<readonly RoleSummary[]>([]);
  const [deptOptionsRows, setDeptOptionsRows] = useState<
    readonly SystemDeptOptionSummary[]
  >([]);
  const [postOptionsRows, setPostOptionsRows] = useState<
    readonly SystemPostOptionSummary[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [editingMember, setEditingMember] = useState<TenantMemberSummary>();
  const [savingMember, setSavingMember] = useState(false);
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [nextSummary, nextMembers, nextRoles, nextDeptOptions, nextPosts] =
        await Promise.all([
          getOpenCoreTenancyFoundation(),
          listOpenCoreTenantMembers(),
          listOpenCoreRoles(),
          listOpenCoreSystemDeptOptions(),
          listOpenCoreSystemPostOptions(),
        ]);

      setSummary(nextSummary);
      setMembers(nextMembers);
      setRoles(nextRoles);
      setDeptOptionsRows(nextDeptOptions);
      setPostOptionsRows(nextPosts);
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
  }, [formatMessage]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const roleOptions = useMemo(() => createRoleOptions(roles), [roles]);
  const deptOptions = useMemo(
    () => createDeptOptions(deptOptionsRows),
    [deptOptionsRows],
  );
  const postOptions = useMemo(
    () => createPostOptions(postOptionsRows),
    [postOptionsRows],
  );

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

  const memberColumns = useMemo<ProColumns<TenantMemberSummary>[]>(
    () => [
      {
        title: formatMessage('pages.system.tenants.fields.username', 'User'),
        dataIndex: 'username',
        render: (_, record) => `${record.displayName} (${record.username})`,
      },
      {
        title: formatMessage('pages.system.tenants.fields.status', 'Status'),
        dataIndex: 'status',
        render: (_, record) => (
          <Tag color={statusColor(record.status)}>{record.status}</Tag>
        ),
      },
      {
        title: formatMessage(
          'pages.system.tenants.fields.department',
          'Department',
        ),
        dataIndex: 'deptName',
        renderText: (value, record) => value ?? record.deptId ?? '-',
      },
      {
        title: formatMessage('pages.system.tenants.fields.roles', 'Roles'),
        dataIndex: 'roleCodes',
        render: (_, record) =>
          record.roleCodes.length > 0 ? (
            <Space size={[0, 4]} wrap>
              {record.roleCodes.map((code) => (
                <Tag key={code}>{code}</Tag>
              ))}
            </Space>
          ) : (
            '-'
          ),
      },
      {
        title: formatMessage('pages.system.tenants.fields.posts', 'Posts'),
        dataIndex: 'postCodes',
        render: (_, record) =>
          record.postCodes.length > 0 ? (
            <Space size={[0, 4]} wrap>
              {record.postCodes.map((code) => (
                <Tag key={code}>{code}</Tag>
              ))}
            </Space>
          ) : (
            '-'
          ),
      },
      {
        title: formatMessage('pages.system.tenants.fields.actions', 'Actions'),
        valueType: 'option',
        render: (_, record) => (
          <Tooltip
            title={formatMessage(
              'pages.system.tenants.actions.editMember',
              'Edit member assignments',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.tenants.actions.editMemberAria',
                'Edit member assignments',
              )}
              icon={<EditOutlined />}
              onClick={() => {
                setEditingMember(record);
                form.setFieldsValue({
                  deptId: record.deptId ?? undefined,
                  postCodes: [...record.postCodes],
                  roleCodes: [...record.roleCodes],
                  status:
                    record.status === 'suspended' ? 'suspended' : 'active',
                });
              }}
              type="link"
            />
          </Tooltip>
        ),
      },
    ],
    [formatMessage, form],
  );

  const saveMemberAssignments = async () => {
    if (!editingMember) {
      return;
    }

    const values = await form.validateFields();

    setSavingMember(true);
    try {
      await updateOpenCoreTenantMemberAssignments(editingMember.id, {
        deptId: values.deptId ?? null,
        postCodes: values.postCodes ?? [],
        roleCodes: values.roleCodes ?? [],
        status: values.status,
      });
      message.success(
        formatMessage(
          'pages.system.tenants.actions.editMemberSuccess',
          'Member assignments updated.',
        ),
      );
      setEditingMember(undefined);
      form.resetFields();
      await loadSummary();
    } finally {
      setSavingMember(false);
    }
  };

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
        style={{ marginBottom: 16 }}
        toolBarRender={false}
      />

      <ProTable<TenantMemberSummary>
        columns={memberColumns}
        dataSource={[...members]}
        headerTitle={formatMessage(
          'pages.system.tenants.sections.members',
          'Current tenant members',
        )}
        loading={loading}
        pagination={false}
        rowKey="id"
        search={false}
        toolBarRender={false}
      />

      <Modal
        destroyOnClose
        confirmLoading={savingMember}
        onCancel={() => {
          setEditingMember(undefined);
          form.resetFields();
        }}
        onOk={() => void saveMemberAssignments()}
        open={Boolean(editingMember)}
        title={formatMessage(
          'pages.system.tenants.actions.editMember',
          'Edit member assignments',
        )}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label={formatMessage(
              'pages.system.tenants.fields.status',
              'Status',
            )}
            name="status"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { label: 'active', value: 'active' },
                { label: 'suspended', value: 'suspended' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.tenants.fields.department',
              'Department',
            )}
            name="deptId"
          >
            <Select
              allowClear
              optionFilterProp="label"
              options={deptOptions}
              showSearch
            />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.tenants.fields.roles', 'Roles')}
            name="roleCodes"
            rules={[{ type: 'array' }]}
          >
            <Select
              allowClear
              mode="multiple"
              optionFilterProp="label"
              options={roleOptions}
              showSearch
            />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.tenants.fields.posts', 'Posts')}
            name="postCodes"
            rules={[{ type: 'array' }]}
          >
            <Select
              allowClear
              mode="multiple"
              optionFilterProp="label"
              options={postOptions}
              showSearch
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
