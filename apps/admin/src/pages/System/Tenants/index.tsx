import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
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
  TenantMemberSummary,
  TenantPlanSummary,
  TenantSummary,
  TenancyFoundationSummary,
} from '@opencore/sdk';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Statistic,
  Switch,
  Tag,
  Tooltip,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createOpenCoreTenant,
  createOpenCoreTenantPlan,
  deleteOpenCoreTenantPlan,
  getOpenCoreTenancyFoundation,
  listOpenCoreTenantPlans,
  listOpenCoreTenants,
  listOpenCoreRoles,
  listOpenCoreSystemDeptOptions,
  listOpenCoreSystemPostOptions,
  listOpenCoreTenantMembers,
  setOpenCoreTenantStatus,
  updateOpenCoreTenant,
  updateOpenCoreTenantPlan,
  updateOpenCoreTenantMemberAssignments,
} from '@/services/opencore/platform';

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const TENANT_READ_PERMISSION_MARKER = 'platform:tenant:read';
const ROOT_TENANT_ID = 'tenant_root';

type TenantFormValues = {
  accountLimit?: number | null;
  code: string;
  contactMobile?: string;
  contactName?: string;
  expiresAt?: string;
  name: string;
  planCode?: string;
  slug: string;
  status: 'active' | 'expired' | 'suspended';
};

type PlanFormValues = {
  code: string;
  enabled: boolean;
  limitsJson: string;
  moduleCodes?: string[];
  name: string;
  remark?: string;
};

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

function parsePlanLimitsJson(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value || '{}') as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Tenant plan limits must be a JSON object.');
  }

  return parsed as Record<string, unknown>;
}

export default function TenantsPage() {
  const intl = useIntl();
  const [tenantForm] = Form.useForm<TenantFormValues>();
  const [planForm] = Form.useForm<PlanFormValues>();
  const [form] = Form.useForm<MemberAssignmentFormValues>();
  const [summary, setSummary] = useState<TenancyFoundationSummary>();
  const [tenants, setTenants] = useState<readonly TenantSummary[]>([]);
  const [plans, setPlans] = useState<readonly TenantPlanSummary[]>([]);
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
  const [editingTenant, setEditingTenant] = useState<TenantSummary | null>();
  const [savingTenant, setSavingTenant] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TenantPlanSummary | null>();
  const [savingPlan, setSavingPlan] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string>();
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
      const [
        nextSummary,
        nextTenants,
        nextPlans,
        nextMembers,
        nextRoles,
        nextDeptOptions,
        nextPosts,
      ] = await Promise.all([
        getOpenCoreTenancyFoundation(),
        listOpenCoreTenants(),
        listOpenCoreTenantPlans(),
        listOpenCoreTenantMembers(),
        listOpenCoreRoles(),
        listOpenCoreSystemDeptOptions(),
        listOpenCoreSystemPostOptions(),
      ]);

      setSummary(nextSummary);
      setTenants(nextTenants);
      setPlans(nextPlans);
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
  const moduleOptions = useMemo(() => {
    const moduleCodes = new Set<string>();
    for (const plan of summary?.plans ?? []) {
      for (const moduleCode of plan.moduleCodes) {
        moduleCodes.add(moduleCode);
      }
    }

    return [...moduleCodes]
      .sort((left, right) => left.localeCompare(right))
      .map((moduleCode) => ({
        label: moduleCode,
        value: moduleCode,
      }));
  }, [summary]);
  const planOptions = useMemo(
    () =>
      [...plans]
        .sort((left, right) => left.code.localeCompare(right.code))
        .map((plan) => ({
          label: `${plan.name} (${plan.code})`,
          value: plan.code,
        })),
    [plans],
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

  const openCreatePlan = useCallback(() => {
    setEditingPlan(null);
    planForm.setFieldsValue({
      code: '',
      enabled: true,
      limitsJson: '{}',
      moduleCodes: [],
      name: '',
      remark: undefined,
    });
  }, [planForm]);

  const openCreateTenant = useCallback(() => {
    setEditingTenant(null);
    tenantForm.setFieldsValue({
      accountLimit: null,
      code: '',
      contactMobile: undefined,
      contactName: undefined,
      expiresAt: undefined,
      name: '',
      planCode: 'system.full',
      slug: '',
      status: 'active',
    });
  }, [tenantForm]);

  const deletePlan = useCallback(
    async (record: TenantPlanSummary) => {
      setDeletingPlanId(record.id);
      try {
        await deleteOpenCoreTenantPlan(record.id);
        message.success(
          formatMessage(
            'pages.system.tenants.actions.deletePlanSuccess',
            'Tenant plan deleted.',
          ),
        );
        await loadSummary();
      } finally {
        setDeletingPlanId(undefined);
      }
    },
    [formatMessage, loadSummary],
  );

  const tenantColumns = useMemo<ProColumns<TenantSummary>[]>(
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
        title: formatMessage(
          'pages.system.tenants.fields.accountLimit',
          'Account limit',
        ),
        dataIndex: 'accountLimit',
        renderText: (value) => value ?? '-',
      },
      {
        title: formatMessage('pages.system.tenants.fields.owners', 'Owners'),
        dataIndex: 'ownerUsernames',
        render: (_, record) =>
          record.ownerUsernames.length > 0
            ? record.ownerUsernames.join(', ')
            : '-',
      },
      {
        title: formatMessage('pages.system.tenants.fields.actions', 'Actions'),
        valueType: 'option',
        render: (_, record) => (
          <Tooltip
            title={formatMessage(
              'pages.system.tenants.actions.editTenant',
              'Edit tenant',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.tenants.actions.editTenantAria',
                'Edit tenant',
              )}
              icon={<EditOutlined />}
              onClick={() => {
                setEditingTenant(record);
                tenantForm.setFieldsValue({
                  accountLimit: record.accountLimit ?? null,
                  code: record.code,
                  contactMobile: record.contactMobile ?? undefined,
                  contactName: record.contactName ?? undefined,
                  expiresAt: record.expiresAt ?? undefined,
                  name: record.name,
                  planCode: record.planCode ?? undefined,
                  slug: record.slug,
                  status:
                    record.status === 'expired' || record.status === 'suspended'
                      ? record.status
                      : 'active',
                });
              }}
              type="link"
            />
          </Tooltip>
        ),
      },
    ],
    [formatMessage, tenantForm],
  );

  const planColumns = useMemo<ProColumns<TenantPlanSummary>[]>(
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
      {
        title: formatMessage('pages.system.tenants.fields.tenants', 'Tenants'),
        dataIndex: 'tenantCount',
      },
      {
        title: formatMessage('pages.system.tenants.fields.actions', 'Actions'),
        valueType: 'option',
        render: (_, record) => (
          <Space size="small">
            <Tooltip
              title={formatMessage(
                'pages.system.tenants.actions.editPlan',
                'Edit tenant plan',
              )}
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.tenants.actions.editPlanAria',
                  'Edit tenant plan',
                )}
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingPlan(record);
                  planForm.setFieldsValue({
                    code: record.code,
                    enabled: record.enabled,
                    limitsJson: JSON.stringify(record.limits ?? {}, null, 2),
                    moduleCodes: [...record.moduleCodes],
                    name: record.name,
                    remark: record.remark ?? undefined,
                  });
                }}
                type="link"
              />
            </Tooltip>
            <Popconfirm
              disabled={record.tenantCount > 0}
              okButtonProps={{ danger: true }}
              onConfirm={() => void deletePlan(record)}
              title={formatMessage(
                'pages.system.tenants.actions.deletePlanConfirm',
                'Delete this tenant plan?',
              )}
            >
              <Tooltip
                title={
                  record.tenantCount > 0
                    ? formatMessage(
                        'pages.system.tenants.actions.deletePlanBlocked',
                        'Assigned plans cannot be deleted.',
                      )
                    : formatMessage(
                        'pages.system.tenants.actions.deletePlan',
                        'Delete tenant plan',
                      )
                }
              >
                <Button
                  aria-label={formatMessage(
                    'pages.system.tenants.actions.deletePlanAria',
                    'Delete tenant plan',
                  )}
                  danger
                  disabled={record.tenantCount > 0}
                  icon={<DeleteOutlined />}
                  loading={deletingPlanId === record.id}
                  type="link"
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [deletePlan, deletingPlanId, formatMessage, planForm],
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

  const saveTenant = async () => {
    const values = await tenantForm.validateFields();
    const body = {
      accountLimit: values.accountLimit ?? null,
      code: values.code,
      contactMobile: values.contactMobile ?? null,
      contactName: values.contactName ?? null,
      expiresAt: values.expiresAt ?? null,
      name: values.name,
      planCode: values.planCode ?? null,
      slug: values.slug,
    };

    setSavingTenant(true);
    try {
      if (editingTenant) {
        await updateOpenCoreTenant(editingTenant.id, body);
        if (values.status !== editingTenant.status) {
          await setOpenCoreTenantStatus(editingTenant.id, {
            expiresAt: values.expiresAt ?? null,
            status: values.status,
          });
        }
      } else {
        await createOpenCoreTenant({
          ...body,
          status: values.status,
        });
      }
      message.success(
        formatMessage(
          'pages.system.tenants.actions.saveTenantSuccess',
          'Tenant saved.',
        ),
      );
      setEditingTenant(undefined);
      tenantForm.resetFields();
      await loadSummary();
    } finally {
      setSavingTenant(false);
    }
  };

  const savePlan = async () => {
    const values = await planForm.validateFields();
    const limits = parsePlanLimitsJson(values.limitsJson);
    const body = {
      code: values.code,
      enabled: values.enabled,
      limits,
      moduleCodes: values.moduleCodes ?? [],
      name: values.name,
      remark: values.remark ?? null,
    };

    setSavingPlan(true);
    try {
      if (editingPlan) {
        await updateOpenCoreTenantPlan(editingPlan.id, body);
      } else {
        await createOpenCoreTenantPlan(body);
      }
      message.success(
        formatMessage(
          'pages.system.tenants.actions.savePlanSuccess',
          'Tenant plan saved.',
        ),
      );
      setEditingPlan(undefined);
      planForm.resetFields();
      await loadSummary();
    } finally {
      setSavingPlan(false);
    }
  };

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

      <ProTable<TenantSummary>
        columns={tenantColumns}
        dataSource={[...tenants]}
        headerTitle={formatMessage(
          'pages.system.tenants.sections.tenants',
          'Tenants',
        )}
        loading={loading}
        pagination={false}
        rowKey="id"
        search={false}
        style={{ marginBottom: 16 }}
        toolBarRender={() => [
          <Tooltip
            key="create"
            title={formatMessage(
              'pages.system.tenants.actions.createTenant',
              'Create tenant',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.tenants.actions.createTenantAria',
                'Create tenant',
              )}
              icon={<PlusOutlined />}
              onClick={openCreateTenant}
              type="primary"
            />
          </Tooltip>,
        ]}
      />

      <ProTable<TenantPlanSummary>
        columns={planColumns}
        dataSource={[...plans]}
        headerTitle={formatMessage(
          'pages.system.tenants.sections.plans',
          'Tenant plans',
        )}
        loading={loading}
        pagination={false}
        rowKey="id"
        search={false}
        style={{ marginBottom: 16 }}
        toolBarRender={() => [
          <Tooltip
            key="create"
            title={formatMessage(
              'pages.system.tenants.actions.createPlan',
              'Create tenant plan',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.tenants.actions.createPlanAria',
                'Create tenant plan',
              )}
              icon={<PlusOutlined />}
              onClick={openCreatePlan}
              type="primary"
            />
          </Tooltip>,
        ]}
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
        confirmLoading={savingTenant}
        onCancel={() => {
          setEditingTenant(undefined);
          tenantForm.resetFields();
        }}
        onOk={() => void saveTenant()}
        open={editingTenant !== undefined}
        title={
          editingTenant
            ? formatMessage(
                'pages.system.tenants.actions.editTenant',
                'Edit tenant',
              )
            : formatMessage(
                'pages.system.tenants.actions.createTenant',
                'Create tenant',
              )
        }
      >
        <Form form={tenantForm} layout="vertical">
          <Form.Item
            label={formatMessage('pages.system.tenants.fields.code', 'Code')}
            name="code"
            rules={[{ required: true }]}
          >
            <Input
              autoComplete="off"
              disabled={editingTenant?.id === ROOT_TENANT_ID}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.tenants.fields.slug', 'Slug')}
            name="slug"
            rules={[{ required: true }]}
          >
            <Input
              autoComplete="off"
              disabled={editingTenant?.id === ROOT_TENANT_ID}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.tenants.fields.name', 'Name')}
            name="name"
            rules={[{ required: true }]}
          >
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.tenants.fields.status',
              'Status',
            )}
            name="status"
            rules={[{ required: true }]}
          >
            <Select
              disabled={editingTenant?.id === ROOT_TENANT_ID}
              options={[
                { label: 'active', value: 'active' },
                { label: 'suspended', value: 'suspended' },
                { label: 'expired', value: 'expired' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.tenants.fields.plan', 'Plan')}
            name="planCode"
          >
            <Select
              allowClear
              optionFilterProp="label"
              options={planOptions}
              showSearch
            />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.tenants.fields.accountLimit',
              'Account limit',
            )}
            name="accountLimit"
          >
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.tenants.fields.contactName',
              'Contact name',
            )}
            name="contactName"
          >
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.tenants.fields.contactMobile',
              'Contact mobile',
            )}
            name="contactMobile"
          >
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.tenants.fields.expiresAt',
              'Expires at',
            )}
            name="expiresAt"
          >
            <Input placeholder="2026-12-31T23:59:59.000Z" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        destroyOnClose
        confirmLoading={savingPlan}
        onCancel={() => {
          setEditingPlan(undefined);
          planForm.resetFields();
        }}
        onOk={() => void savePlan()}
        open={editingPlan !== undefined}
        title={
          editingPlan
            ? formatMessage(
                'pages.system.tenants.actions.editPlan',
                'Edit tenant plan',
              )
            : formatMessage(
                'pages.system.tenants.actions.createPlan',
                'Create tenant plan',
              )
        }
      >
        <Form form={planForm} layout="vertical">
          <Form.Item
            label={formatMessage('pages.system.tenants.fields.code', 'Code')}
            name="code"
            rules={[{ required: true }]}
          >
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.tenants.fields.name', 'Name')}
            name="name"
            rules={[{ required: true }]}
          >
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.tenants.fields.enabled',
              'Enabled',
            )}
            name="enabled"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.tenants.fields.modules',
              'Modules',
            )}
            name="moduleCodes"
            rules={[{ type: 'array' }]}
          >
            <Select
              allowClear
              mode="multiple"
              optionFilterProp="label"
              options={moduleOptions}
              showSearch
            />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.tenants.fields.limits',
              'Limits',
            )}
            name="limitsJson"
            rules={[
              {
                validator: async (_, value: string) => {
                  parsePlanLimitsJson(value);
                },
              },
            ]}
          >
            <Input.TextArea autoSize={{ minRows: 4 }} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.tenants.fields.remark',
              'Remark',
            )}
            name="remark"
          >
            <Input.TextArea autoSize={{ minRows: 2 }} />
          </Form.Item>
        </Form>
      </Modal>

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
