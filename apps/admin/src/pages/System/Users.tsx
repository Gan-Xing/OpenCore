import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createSystemDeptFixtures,
  createSystemPostFixtures,
  type RoleSummary,
  type SystemPostOptionSummary,
  type SystemDeptSummary,
  type SystemDeptTreeSummary,
  type UserSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Tree,
  TreeSelect,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  createOpenCoreUser,
  deleteOpenCoreUser,
  getOpenCoreUser,
  listOpenCoreRoles,
  listOpenCoreSystemDepts,
  listOpenCoreSystemPostOptions,
  listOpenCoreUsers,
  resetOpenCoreUserPassword,
  setOpenCoreUserStatus,
  updateOpenCoreUser,
} from '@/services/opencore/platform';
import {
  CurrentPageExportButton,
  type CurrentPageExportColumn,
} from '../shared/CurrentPageExportButton';
import {
  useCurrentPageFilters,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../shared/CurrentPageFilters';
import {
  ReadOnlyDetailDrawer,
  type DetailField,
} from '../shared/ReadOnlyDetailDrawer';

type UserFormValues = {
  deptId?: string;
  displayName: string;
  enabled?: boolean;
  password?: string;
  postCodes?: string[];
  roleCodes?: string[];
  username: string;
};

type ResetPasswordValues = {
  password: string;
};

type TreeSelectNode = {
  children?: TreeSelectNode[];
  title: string;
  value: string;
};

type DeptFilterTreeNode = {
  children?: DeptFilterTreeNode[];
  key: string;
  title: string;
};

const usersPageLayoutStyle: CSSProperties = {
  alignItems: 'flex-start',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 16,
};
const deptFilterPanelStyle: CSSProperties = {
  borderRight: '1px solid #f0f0f0',
  flex: '1 1 220px',
  maxWidth: 280,
  minWidth: 220,
  paddingInlineEnd: 16,
};
const usersTablePanelStyle: CSSProperties = {
  flex: '999 1 620px',
  minWidth: 0,
};
const deptFilterHeaderStyle: CSSProperties = {
  justifyContent: 'space-between',
  marginBlockEnd: 12,
  width: '100%',
};
const deptFilterTreeStyle: CSSProperties = {
  marginBlockStart: 8,
};

const fallbackRows: UserSummary[] = [
  {
    id: 'user_admin',
    username: 'admin',
    displayName: 'OpenCore Admin',
    roleCodes: ['admin'],
    deptId: 'dept_headquarters',
    postCodes: ['admin'],
    enabled: true,
    system: true,
  },
];
const fallbackRoleRows: RoleSummary[] = [
  {
    id: 'role_admin',
    code: 'admin',
    name: 'Administrator',
    enabled: true,
    permissionCodes: [],
    system: true,
    dataScope: 'all',
    dataScopeDeptIds: [],
  },
  {
    id: 'role_viewer',
    code: 'viewer',
    name: 'Viewer',
    enabled: true,
    permissionCodes: [],
    system: true,
    dataScope: 'self',
    dataScopeDeptIds: [],
  },
];
const fallbackDeptTreeRows = createSystemDeptFixtures();
const fallbackPostRows = createSystemPostFixtures().items;
const searchFields: CurrentPageSearchField<UserSummary>[] = [
  'username',
  'displayName',
  'deptId',
  (record) => record.roleCodes,
  (record) => record.postCodes,
];
const filterOptions: CurrentPageFilterOption<UserSummary>[] = [
  {
    key: 'enabled',
    options: [
      { label: 'enabled', value: 'true' },
      { label: 'disabled', value: 'false' },
    ],
    placeholder: 'Status',
    predicate: (record, value) => record.enabled === (value === 'true'),
  },
  {
    key: 'system',
    options: [
      { label: 'system', value: 'true' },
      { label: 'custom', value: 'false' },
    ],
    placeholder: 'System',
    predicate: (record, value) => record.system === (value === 'true'),
  },
];
const exportColumns: CurrentPageExportColumn<UserSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Username', dataIndex: 'username' },
  { title: 'Display Name', dataIndex: 'displayName' },
  { title: 'Department ID', dataIndex: 'deptId' },
  { title: 'Roles', renderText: (record) => record.roleCodes.join(', ') },
  { title: 'Posts', renderText: (record) => record.postCodes.join(', ') },
  { title: 'Enabled', dataIndex: 'enabled' },
  { title: 'System', dataIndex: 'system' },
];

function flattenDeptTree(
  rows: readonly SystemDeptTreeSummary[],
): SystemDeptSummary[] {
  return rows.flatMap((row) => [
    withoutChildren(row),
    ...flattenDeptTree(row.children),
  ]);
}

function withoutChildren(row: SystemDeptTreeSummary): SystemDeptSummary {
  const { children: _children, ...summary } = row;
  return summary;
}

function createDeptNameMap(rows: readonly SystemDeptSummary[]) {
  return new Map(rows.map((row) => [row.id, row.name]));
}

function createRoleOptions(rows: readonly RoleSummary[]) {
  return [...rows]
    .sort((left, right) => left.code.localeCompare(right.code))
    .map((role) => ({
      label: `${role.name} (${role.code})`,
      value: role.code,
    }));
}

function createPostNameMap(rows: readonly SystemPostOptionSummary[]) {
  return new Map(rows.map((row) => [row.code, row.name]));
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

function toDeptTreeSelectData(
  rows: readonly SystemDeptTreeSummary[],
): TreeSelectNode[] {
  return rows.map((row) => ({
    title: `${row.name} (${row.code})`,
    value: row.id,
    children: toDeptTreeSelectData(row.children),
  }));
}

function toDeptFilterTreeData(
  rows: readonly SystemDeptTreeSummary[],
): DeptFilterTreeNode[] {
  return rows.map((row) => ({
    title: row.name,
    key: row.id,
    children: toDeptFilterTreeData(row.children),
  }));
}

function collectDeptSubtreeIds(
  rows: readonly SystemDeptTreeSummary[],
  deptId: string,
): Set<string> | undefined {
  for (const row of rows) {
    if (row.id === deptId) {
      const ids = new Set<string>();
      collectDeptIds(row, ids);
      return ids;
    }

    const childIds = collectDeptSubtreeIds(row.children, deptId);
    if (childIds) {
      return childIds;
    }
  }

  return undefined;
}

function collectDeptIds(row: SystemDeptTreeSummary, ids: Set<string>): void {
  ids.add(row.id);

  for (const child of row.children) {
    collectDeptIds(child, ids);
  }
}

function filterUsersByDept(
  rows: readonly UserSummary[],
  deptTree: readonly SystemDeptTreeSummary[],
  deptId: string | undefined,
): readonly UserSummary[] {
  if (!deptId) {
    return rows;
  }

  const deptIds = collectDeptSubtreeIds(deptTree, deptId);
  if (!deptIds) {
    return [];
  }

  return rows.filter((row) => row.deptId && deptIds.has(row.deptId));
}

function createDetailFields(
  record: UserSummary,
  deptNames: ReadonlyMap<string, string>,
  postNames: ReadonlyMap<string, string>,
): DetailField[] {
  return [
    { label: 'ID', value: record.id },
    { label: 'Username', value: record.username },
    { label: 'Display Name', value: record.displayName },
    {
      label: 'Department',
      value: record.deptId
        ? (deptNames.get(record.deptId) ?? record.deptId)
        : undefined,
    },
    {
      label: 'Roles',
      value: (
        <Space wrap>
          {record.roleCodes.map((code) => (
            <Tag key={code}>{code}</Tag>
          ))}
        </Space>
      ),
    },
    {
      label: 'Posts',
      value:
        record.postCodes.length > 0 ? (
          <Space wrap>
            {record.postCodes.map((code) => (
              <Tag key={code}>{postNames.get(code) ?? code}</Tag>
            ))}
          </Space>
        ) : undefined,
    },
    { label: 'Status', value: record.enabled ? 'enabled' : 'disabled' },
    { label: 'System', value: record.system ? 'system' : 'custom' },
  ];
}

export default function UsersPage() {
  const [form] = Form.useForm<UserFormValues>();
  const [resetPasswordForm] = Form.useForm<ResetPasswordValues>();
  const [rows, setRows] = useState<readonly UserSummary[]>(fallbackRows);
  const [roleRows, setRoleRows] =
    useState<readonly RoleSummary[]>(fallbackRoleRows);
  const [deptTreeRows, setDeptTreeRows] =
    useState<readonly SystemDeptTreeSummary[]>(fallbackDeptTreeRows);
  const [postRows, setPostRows] =
    useState<readonly SystemPostOptionSummary[]>(fallbackPostRows);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<UserSummary>();
  const [editingUser, setEditingUser] = useState<UserSummary>();
  const [resetPasswordUser, setResetPasswordUser] = useState<UserSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetPasswordSubmitting, setResetPasswordSubmitting] = useState(false);
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState<string>();
  const [selectedDeptId, setSelectedDeptId] = useState<string>();
  const flatDeptRows = useMemo(
    () => flattenDeptTree(deptTreeRows),
    [deptTreeRows],
  );
  const deptNames = useMemo(
    () => createDeptNameMap(flatDeptRows),
    [flatDeptRows],
  );
  const deptTreeData = useMemo(
    () => toDeptTreeSelectData(deptTreeRows),
    [deptTreeRows],
  );
  const deptFilterTreeData = useMemo(
    () => toDeptFilterTreeData(deptTreeRows),
    [deptTreeRows],
  );
  const roleOptions = useMemo(() => createRoleOptions(roleRows), [roleRows]);
  const postNames = useMemo(() => createPostNameMap(postRows), [postRows]);
  const postOptions = useMemo(() => createPostOptions(postRows), [postRows]);
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<UserSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search users',
      selectFilters: filterOptions,
    });

  const loadUsers = async (deptId = selectedDeptId) => {
    setLoading(true);
    try {
      const [users, roles, deptTree, posts] = await Promise.all([
        listOpenCoreUsers(deptId ? { deptId } : undefined),
        listOpenCoreRoles(),
        listOpenCoreSystemDepts(),
        listOpenCoreSystemPostOptions(),
      ]);
      setRows(users);
      setRoleRows(roles);
      setDeptTreeRows(deptTree);
      setPostRows(posts);
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows(filterUsersByDept(fallbackRows, fallbackDeptTreeRows, deptId));
      setRoleRows(fallbackRoleRows);
      setDeptTreeRows(fallbackDeptTreeRows);
      setPostRows(fallbackPostRows);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load users.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const selectDept = async (deptId: string | undefined) => {
    setSelectedDeptId(deptId);
    await loadUsers(deptId);
  };

  const openCreateForm = () => {
    setEditingUser(undefined);
    form.setFieldsValue({
      username: '',
      displayName: '',
      password: '',
      roleCodes: [],
      deptId: undefined,
      postCodes: [],
      enabled: true,
    });
    setFormOpen(true);
  };

  const openEditForm = async (record: UserSummary) => {
    if (record.system) {
      message.warning('System users cannot be edited.');
      return;
    }

    try {
      const fresh = await getOpenCoreUser(record.id);
      setEditingUser(fresh);
      form.setFieldsValue({
        username: fresh.username,
        displayName: fresh.displayName,
        password: undefined,
        roleCodes: [...fresh.roleCodes],
        deptId: fresh.deptId,
        postCodes: [...fresh.postCodes],
        enabled: fresh.enabled,
      });
      setFormOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to open user.',
      );
    }
  };

  const openDetail = async (record: UserSummary) => {
    try {
      setSelectedDetail(await getOpenCoreUser(record.id));
    } catch (_error) {
      setSelectedDetail(record);
    }
  };

  const openResetPassword = async (record: UserSummary) => {
    if (record.system) {
      message.warning('System users cannot be reset.');
      return;
    }

    try {
      const fresh = await getOpenCoreUser(record.id);
      setResetPasswordUser(fresh);
      resetPasswordForm.setFieldsValue({ password: '' });
      setResetPasswordOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to open user.',
      );
    }
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    const roleCodes = values.roleCodes ?? [];
    const postCodes = values.postCodes ?? [];
    const password = values.password?.trim();
    setSubmitting(true);
    try {
      if (editingUser) {
        await updateOpenCoreUser(editingUser.id, {
          displayName: values.displayName,
          password: password || undefined,
          roleCodes,
          deptId: values.deptId ?? null,
          postCodes,
          enabled: values.enabled ?? true,
        });
        message.success('User updated.');
      } else {
        await createOpenCoreUser({
          username: values.username,
          displayName: values.displayName,
          password: password ?? '',
          roleCodes,
          deptId: values.deptId,
          postCodes,
          enabled: values.enabled ?? true,
        });
        message.success('User created.');
      }
      setFormOpen(false);
      setEditingUser(undefined);
      await loadUsers();
    } finally {
      setSubmitting(false);
    }
  };

  const submitResetPassword = async () => {
    if (!resetPasswordUser) {
      return;
    }

    const values = await resetPasswordForm.validateFields();
    setResetPasswordSubmitting(true);
    try {
      const result = await resetOpenCoreUserPassword(resetPasswordUser.id, {
        password: values.password,
      });
      message.success(
        `Password reset. ${formatRevokedSessions(result.revokedSessionCount)}`,
      );
      setResetPasswordOpen(false);
      setResetPasswordUser(undefined);
      await loadUsers();
    } finally {
      setResetPasswordSubmitting(false);
    }
  };

  const toggleUserStatus = async (record: UserSummary) => {
    setStatusUpdatingUserId(record.id);
    try {
      const result = await setOpenCoreUserStatus(record.id, {
        enabled: !record.enabled,
      });
      message.success(
        `User ${result.enabled ? 'enabled' : 'disabled'}. ${formatRevokedSessions(
          result.revokedSessionCount,
        )}`,
      );
      await loadUsers();
    } finally {
      setStatusUpdatingUserId(undefined);
    }
  };

  const deleteUser = async (record: UserSummary) => {
    const result = await deleteOpenCoreUser(record.id);
    message.success(
      `User deleted. ${formatRevokedSessions(result.revokedSessionCount)}`,
    );
    await loadUsers();
  };

  const columns: ProColumns<UserSummary>[] = [
    {
      title: 'Username',
      dataIndex: 'username',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.username}
        </Typography.Link>
      ),
    },
    { title: 'Display name', dataIndex: 'displayName' },
    {
      title: 'Department',
      dataIndex: 'deptId',
      render: (_, record) =>
        record.deptId ? (deptNames.get(record.deptId) ?? record.deptId) : '-',
    },
    {
      title: 'Roles',
      dataIndex: 'roleCodes',
      render: (_, record) => (
        <Space wrap size={4}>
          {record.roleCodes.map((code) => (
            <Tag key={code}>{code}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Posts',
      dataIndex: 'postCodes',
      render: (_, record) =>
        record.postCodes.length > 0 ? (
          <Space wrap size={4}>
            {record.postCodes.map((code) => (
              <Tag key={code}>{postNames.get(code) ?? code}</Tag>
            ))}
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      width: 96,
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'red'}>
          {record.enabled ? 'enabled' : 'disabled'}
        </Tag>
      ),
    },
    {
      title: 'System',
      dataIndex: 'system',
      width: 96,
      render: (_, record) => (
        <Tag color={record.system ? 'blue' : 'default'}>
          {record.system ? 'system' : 'custom'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      valueType: 'option',
      width: 248,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Detail">
            <Button
              aria-label={`View ${record.username}`}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={record.system ? 'System users cannot be edited' : 'Edit'}
          >
            <Button
              aria-label={`Edit ${record.username}`}
              disabled={record.system}
              icon={<EditOutlined />}
              onClick={() => void openEditForm(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title={record.enabled ? 'Disable this user?' : 'Enable this user?'}
            okText={record.enabled ? 'Disable' : 'Enable'}
            okButtonProps={{ danger: record.enabled }}
            onConfirm={() => void toggleUserStatus(record)}
          >
            <Tooltip
              title={
                record.system
                  ? 'System users cannot change status'
                  : record.enabled
                    ? 'Disable'
                    : 'Enable'
              }
            >
              <Button
                aria-label={`${record.enabled ? 'Disable' : 'Enable'} ${record.username}`}
                danger={record.enabled}
                disabled={record.system}
                icon={
                  record.enabled ? <StopOutlined /> : <CheckCircleOutlined />
                }
                loading={statusUpdatingUserId === record.id}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
          <Tooltip
            title={
              record.system
                ? 'System users cannot reset password'
                : 'Reset Password'
            }
          >
            <Button
              aria-label={`Reset password for ${record.username}`}
              disabled={record.system}
              icon={<LockOutlined />}
              onClick={() => void openResetPassword(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Delete this user?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => void deleteUser(record)}
          >
            <Tooltip
              title={
                record.system ? 'System users cannot be deleted' : 'Delete'
              }
            >
              <Button
                aria-label={`Delete ${record.username}`}
                danger
                disabled={record.system}
                icon={<DeleteOutlined />}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="Users" subTitle="S6 RBAC">
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message="Using fallback user snapshot"
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <div style={usersPageLayoutStyle}>
        <div style={deptFilterPanelStyle}>
          <Space style={deptFilterHeaderStyle}>
            <Typography.Text strong>Department scope</Typography.Text>
            <Tooltip title="Reload">
              <Button
                aria-label="Reload users"
                icon={<ReloadOutlined />}
                onClick={() => void loadUsers()}
                size="small"
              />
            </Tooltip>
          </Space>
          <Button
            block
            type={selectedDeptId ? 'default' : 'primary'}
            onClick={() => void selectDept(undefined)}
          >
            All departments
          </Button>
          <Tree
            blockNode
            defaultExpandAll
            onSelect={(keys) => {
              const deptId = typeof keys[0] === 'string' ? keys[0] : undefined;
              void selectDept(deptId);
            }}
            selectedKeys={selectedDeptId ? [selectedDeptId] : []}
            style={deptFilterTreeStyle}
            treeData={deptFilterTreeData}
          />
        </div>
        <div style={usersTablePanelStyle}>
          <ProTable<UserSummary>
            rowKey="id"
            loading={loading}
            search={false}
            options={false}
            toolBarRender={() => [
              filterToolbar,
              <Button
                key="create"
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateForm}
              >
                New
              </Button>,
              <Button
                key="refresh"
                icon={<ReloadOutlined />}
                onClick={() => void loadUsers()}
              >
                Refresh
              </Button>,
              <CurrentPageExportButton<UserSummary>
                key="export"
                columns={exportColumns}
                resource="core-users"
                rows={filteredRows}
              />,
            ]}
            pagination={{ pageSize: 10 }}
            dataSource={filteredRows}
            columns={columns}
          />
        </div>
      </div>
      <ReadOnlyDetailDrawer
        fields={
          selectedDetail
            ? createDetailFields(selectedDetail, deptNames, postNames)
            : []
        }
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={selectedDetail?.username ?? 'User Detail'}
      />
      <Modal
        title={editingUser ? 'Edit User' : 'New User'}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingUser(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={editingUser ? 'Save' : 'Create'}
        width={720}
      >
        <Form<UserFormValues> form={form} layout="vertical">
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: 'Username is required.' }]}
          >
            <Input disabled={Boolean(editingUser)} maxLength={96} />
          </Form.Item>
          <Form.Item
            label="Display Name"
            name="displayName"
            rules={[{ required: true, message: 'Display name is required.' }]}
          >
            <Input maxLength={120} />
          </Form.Item>
          {!editingUser ? (
            <Form.Item
              label="Password"
              name="password"
              rules={[
                {
                  required: true,
                  message: 'Password is required.',
                },
              ]}
            >
              <Input.Password autoComplete="new-password" maxLength={128} />
            </Form.Item>
          ) : null}
          <Form.Item label="Roles" name="roleCodes" rules={[{ type: 'array' }]}>
            <Select
              allowClear
              mode="multiple"
              optionFilterProp="label"
              options={roleOptions}
              placeholder="Select roles"
              showSearch
            />
          </Form.Item>
          <Form.Item label="Department" name="deptId">
            <TreeSelect
              allowClear
              showSearch
              treeData={deptTreeData}
              treeDefaultExpandAll
              placeholder="Select department"
            />
          </Form.Item>
          <Form.Item label="Posts" name="postCodes" rules={[{ type: 'array' }]}>
            <Select
              allowClear
              mode="multiple"
              optionFilterProp="label"
              options={postOptions}
              placeholder="Select posts"
              showSearch
            />
          </Form.Item>
          <Form.Item label="Enabled" name="enabled" valuePropName="checked">
            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="Reset Password"
        open={resetPasswordOpen}
        onCancel={() => {
          setResetPasswordOpen(false);
          setResetPasswordUser(undefined);
        }}
        onOk={() => void submitResetPassword()}
        confirmLoading={resetPasswordSubmitting}
        okText="Reset"
        width={520}
      >
        <Form<ResetPasswordValues> form={resetPasswordForm} layout="vertical">
          <Form.Item
            label="New Password"
            name="password"
            rules={[{ required: true, message: 'Password is required.' }]}
          >
            <Input.Password autoComplete="new-password" maxLength={128} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}

function formatRevokedSessions(count: number | undefined): string {
  return `Revoked sessions: ${count ?? 0}.`;
}
