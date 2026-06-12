import {
  ApartmentOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createPermissionSummariesFromRegistry,
  createSystemDeptFixtures,
  type MenuSummary,
  type PermissionSummary,
  type RoleDataScope,
  type RoleSummary,
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
  Tag,
  Tooltip,
  Transfer,
  Tree,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  assignOpenCoreRoleMenus,
  assignOpenCoreRoleUsers,
  createOpenCoreRole,
  deleteOpenCoreRole,
  getOpenCoreRole,
  getOpenCoreRoleMenuAssignment,
  getOpenCoreRoleUserAssignment,
  listOpenCoreMenus,
  listOpenCorePermissions,
  listOpenCoreRoles,
  listOpenCoreSystemDepts,
  setOpenCoreRoleStatus,
  updateOpenCoreRole,
} from '@/services/opencore/platform';
import type { Key } from 'react';
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
  type DetailJsonSection,
} from '../shared/ReadOnlyDetailDrawer';

type RoleFormValues = {
  code: string;
  dataScope: RoleDataScope;
  dataScopeDeptIds?: string[];
  name: string;
  permissionCodes?: string[];
};

type MenuTreeNode = {
  children?: MenuTreeNode[];
  key: string;
  title: string;
};

type UserTransferItem = {
  disabled?: boolean;
  key: string;
  title: string;
  description: string;
};

const fallbackPermissionRows = createPermissionSummariesFromRegistry();
const allPermissionCodes = fallbackPermissionRows.map(
  (permission) => permission.code,
);
const fallbackRows: RoleSummary[] = [
  {
    id: 'role_admin',
    code: 'admin',
    name: 'Administrator',
    enabled: true,
    permissionCodes: allPermissionCodes,
    system: true,
    dataScope: 'all',
    dataScopeDeptIds: [],
  },
  {
    id: 'role_viewer',
    code: 'viewer',
    name: 'Viewer',
    enabled: true,
    permissionCodes: [
      'core:dashboard:read',
      'tool:openapi:read',
      'core:user:read',
      'core:role:read',
      'core:permission:read',
      'core:menu:read',
    ],
    system: true,
    dataScope: 'self',
    dataScopeDeptIds: [],
  },
];
const fallbackDeptRows = flattenDeptTree(createSystemDeptFixtures());
const dataScopeLabels: Record<RoleDataScope, string> = {
  all: 'All data',
  custom: 'Custom departments',
  dept_tree: 'Department tree',
  own_dept: 'Own department',
  self: 'Self only',
};
const dataScopeOptions = Object.entries(dataScopeLabels).map(
  ([value, label]) => ({
    label,
    value,
  }),
) as { label: string; value: RoleDataScope }[];
const searchFields: CurrentPageSearchField<RoleSummary>[] = [
  'code',
  'name',
  'dataScope',
  (record) => record.permissionCodes,
  (record) => record.dataScopeDeptIds,
];
const filterOptions: CurrentPageFilterOption<RoleSummary>[] = [
  {
    key: 'system',
    options: [
      { label: 'system', value: 'true' },
      { label: 'custom', value: 'false' },
    ],
    placeholder: 'System',
    predicate: (record, value) => record.system === (value === 'true'),
  },
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
    key: 'dataScope',
    options: dataScopeOptions,
    placeholder: 'Data scope',
    predicate: (record, value) => record.dataScope === value,
  },
];
const exportColumns: CurrentPageExportColumn<RoleSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Code', dataIndex: 'code' },
  { title: 'Name', dataIndex: 'name' },
  { title: 'Enabled', dataIndex: 'enabled' },
  {
    title: 'Permission Count',
    renderText: (record) => record.permissionCodes.length,
  },
  { title: 'System', dataIndex: 'system' },
  { title: 'Data Scope', dataIndex: 'dataScope' },
  {
    title: 'Data Scope Dept IDs',
    renderText: (record) => record.dataScopeDeptIds.join(', '),
  },
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

function createDeptOptions(rows: readonly SystemDeptSummary[]) {
  return [...rows]
    .sort(
      (left, right) =>
        left.order - right.order || left.name.localeCompare(right.name),
    )
    .map((dept) => ({
      label: `${dept.name} (${dept.code})`,
      value: dept.id,
    }));
}

function createMenuTreeData(rows: readonly MenuSummary[]): MenuTreeNode[] {
  const childrenByParent = new Map<string | undefined, MenuSummary[]>();

  for (const row of rows) {
    const siblings = childrenByParent.get(row.parentKey);
    if (siblings) {
      siblings.push(row);
    } else {
      childrenByParent.set(row.parentKey, [row]);
    }
  }

  const buildNodes = (parentKey: string | undefined): MenuTreeNode[] =>
    [...(childrenByParent.get(parentKey) ?? [])]
      .sort(
        (left, right) =>
          left.order - right.order || left.title.localeCompare(right.title),
      )
      .map((row) => ({
        key: row.key,
        title: row.permissionCode
          ? `${row.title} (${row.permissionCode})`
          : row.title,
        children: buildNodes(row.key),
      }));

  return buildNodes(undefined);
}

function normalizeCheckedTreeKeys(value: unknown): string[] {
  const keys =
    Array.isArray(value) ||
    (value &&
      typeof value === 'object' &&
      'checked' in value &&
      Array.isArray((value as { checked?: unknown }).checked))
      ? Array.isArray(value)
        ? value
        : ((value as { checked: unknown[] }).checked ?? [])
      : [];

  return keys.map((key) => String(key)).sort();
}

function createUserTransferItems(
  users: readonly UserSummary[],
): UserTransferItem[] {
  const userById = new Map(users.map((user) => [user.id, user]));

  return [...userById.values()]
    .sort((left, right) => left.username.localeCompare(right.username))
    .map((user) => ({
      key: user.id,
      title: user.displayName,
      description: `${user.username}${user.enabled ? '' : ' (disabled)'}`,
      disabled: user.system,
    }));
}

function normalizeTransferKeys(keys: readonly Key[]): string[] {
  return keys.map((key) => String(key)).sort();
}

function createDetailFields(
  record: RoleSummary,
  deptNames: ReadonlyMap<string, string>,
): DetailField[] {
  return [
    { label: 'ID', value: record.id },
    { label: 'Code', value: record.code },
    { label: 'Name', value: record.name },
    { label: 'Status', value: record.enabled ? 'enabled' : 'disabled' },
    { label: 'System', value: record.system ? 'system' : 'custom' },
    { label: 'Data Scope', value: dataScopeLabels[record.dataScope] },
    {
      label: 'Data Scope Departments',
      value:
        record.dataScopeDeptIds.length > 0
          ? record.dataScopeDeptIds
              .map((deptId) => deptNames.get(deptId) ?? deptId)
              .join(', ')
          : undefined,
    },
    { label: 'Permission Count', value: record.permissionCodes.length },
  ];
}

function createDetailJsonSections(record: RoleSummary): DetailJsonSection[] {
  return [
    { title: 'Permission Codes', value: record.permissionCodes },
    { title: 'Data Scope Dept IDs', value: record.dataScopeDeptIds },
  ];
}

function formatRevokedSessions(count: number | undefined): string {
  return `Revoked sessions: ${count ?? 0}.`;
}

export default function RolesPage() {
  const [form] = Form.useForm<RoleFormValues>();
  const [rows, setRows] = useState<readonly RoleSummary[]>(fallbackRows);
  const [permissionRows, setPermissionRows] = useState<
    readonly PermissionSummary[]
  >(fallbackPermissionRows);
  const [menuRows, setMenuRows] = useState<readonly MenuSummary[]>([]);
  const [deptRows, setDeptRows] =
    useState<readonly SystemDeptSummary[]>(fallbackDeptRows);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<RoleSummary>();
  const [editingRole, setEditingRole] = useState<RoleSummary>();
  const [assigningMenuRole, setAssigningMenuRole] = useState<RoleSummary>();
  const [assigningUserRole, setAssigningUserRole] = useState<RoleSummary>();
  const [checkedMenuKeys, setCheckedMenuKeys] = useState<string[]>([]);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [userTransferItems, setUserTransferItems] = useState<
    readonly UserTransferItem[]
  >([]);
  const [formOpen, setFormOpen] = useState(false);
  const [menuAssignmentOpen, setMenuAssignmentOpen] = useState(false);
  const [userAssignmentOpen, setUserAssignmentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [menuAssignmentSubmitting, setMenuAssignmentSubmitting] =
    useState(false);
  const [userAssignmentSubmitting, setUserAssignmentSubmitting] =
    useState(false);
  const [statusUpdatingRoleCode, setStatusUpdatingRoleCode] =
    useState<string>();
  const selectedDataScope = Form.useWatch('dataScope', form);
  const isCustomDataScope = selectedDataScope === 'custom';
  const permissionOptions = useMemo(
    () =>
      permissionRows
        .map((permission) => ({
          label: permission.code,
          value: permission.code,
        }))
        .sort((left, right) => left.value.localeCompare(right.value)),
    [permissionRows],
  );
  const deptNames = useMemo(() => createDeptNameMap(deptRows), [deptRows]);
  const deptOptions = useMemo(() => createDeptOptions(deptRows), [deptRows]);
  const menuTreeData = useMemo(() => createMenuTreeData(menuRows), [menuRows]);
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<RoleSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search roles',
      selectFilters: filterOptions,
    });

  const loadRoles = async () => {
    setLoading(true);
    try {
      const [roles, deptTree, permissions, menus] = await Promise.all([
        listOpenCoreRoles(),
        listOpenCoreSystemDepts(),
        listOpenCorePermissions(),
        listOpenCoreMenus(),
      ]);
      setRows(roles);
      setDeptRows(flattenDeptTree(deptTree));
      setPermissionRows(permissions);
      setMenuRows(menus);
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows(fallbackRows);
      setDeptRows(fallbackDeptRows);
      setPermissionRows(fallbackPermissionRows);
      setMenuRows([]);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load roles.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoles();
  }, []);

  const openCreateForm = () => {
    setEditingRole(undefined);
    form.setFieldsValue({
      code: '',
      dataScope: 'all',
      dataScopeDeptIds: [],
      name: '',
      permissionCodes: [],
    });
    setFormOpen(true);
  };

  const openEditForm = async (record: RoleSummary) => {
    try {
      const fresh = await getOpenCoreRole(record.code);
      setEditingRole(fresh);
      form.setFieldsValue({
        code: fresh.code,
        dataScope: fresh.dataScope,
        dataScopeDeptIds: [...fresh.dataScopeDeptIds],
        name: fresh.name,
        permissionCodes: [...fresh.permissionCodes],
      });
      setFormOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to open role.',
      );
    }
  };

  const openDetail = async (record: RoleSummary) => {
    try {
      setSelectedDetail(await getOpenCoreRole(record.code));
    } catch (_error) {
      setSelectedDetail(record);
    }
  };

  const openMenuAssignment = async (record: RoleSummary) => {
    try {
      const assignment = await getOpenCoreRoleMenuAssignment(record.code);
      setAssigningMenuRole(record);
      setCheckedMenuKeys([...assignment.menuKeys]);
      setMenuRows(assignment.menus);
      setMenuAssignmentOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : 'Unable to open role menu assignment.',
      );
    }
  };

  const openUserAssignment = async (record: RoleSummary) => {
    try {
      const assignment = await getOpenCoreRoleUserAssignment(record.code);
      setAssigningUserRole(record);
      setAssignedUserIds([...assignment.assignedUserIds]);
      setUserTransferItems(
        createUserTransferItems([
          ...assignment.assignedUsers,
          ...assignment.availableUsers,
        ]),
      );
      setUserAssignmentOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : 'Unable to open role user assignment.',
      );
    }
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    const dataScopeDeptIds =
      values.dataScope === 'custom' ? (values.dataScopeDeptIds ?? []) : [];
    setSubmitting(true);
    try {
      if (editingRole) {
        const role = await updateOpenCoreRole(editingRole.code, {
          dataScope: values.dataScope,
          dataScopeDeptIds,
          name: values.name,
          permissionCodes: values.permissionCodes ?? [],
        });
        message.success(
          `Role updated. ${formatRevokedSessions(role.revokedSessionCount)}`,
        );
      } else {
        await createOpenCoreRole({
          code: values.code,
          dataScope: values.dataScope,
          dataScopeDeptIds,
          name: values.name,
          permissionCodes: values.permissionCodes ?? [],
        });
        message.success('Role created.');
      }
      setFormOpen(false);
      setEditingRole(undefined);
      await loadRoles();
    } finally {
      setSubmitting(false);
    }
  };

  const deleteRole = async (record: RoleSummary) => {
    const result = await deleteOpenCoreRole(record.code);
    message.success(
      `Role deleted. ${formatRevokedSessions(result.revokedSessionCount)}`,
    );
    await loadRoles();
  };

  const toggleRoleStatus = async (record: RoleSummary) => {
    setStatusUpdatingRoleCode(record.code);
    try {
      const role = await setOpenCoreRoleStatus(record.code, {
        enabled: !record.enabled,
      });
      message.success(
        `Role ${role.enabled ? 'enabled' : 'disabled'}. ${formatRevokedSessions(
          role.revokedSessionCount,
        )}`,
      );
    } finally {
      setStatusUpdatingRoleCode(undefined);
    }
    await loadRoles();
  };

  const submitMenuAssignment = async () => {
    if (!assigningMenuRole) {
      return;
    }

    setMenuAssignmentSubmitting(true);
    try {
      const assignment = await assignOpenCoreRoleMenus(assigningMenuRole.code, {
        menuKeys: checkedMenuKeys,
      });
      const revoked = assignment.revokedSessionCount ?? 0;
      message.success(
        revoked > 0
          ? `Role menus updated. ${revoked} active session${revoked === 1 ? '' : 's'} revoked.`
          : 'Role menus updated.',
      );
      setMenuAssignmentOpen(false);
      setAssigningMenuRole(undefined);
      setCheckedMenuKeys([]);
      await loadRoles();
    } finally {
      setMenuAssignmentSubmitting(false);
    }
  };

  const submitUserAssignment = async () => {
    if (!assigningUserRole) {
      return;
    }

    setUserAssignmentSubmitting(true);
    try {
      const assignment = await assignOpenCoreRoleUsers(assigningUserRole.code, {
        userIds: assignedUserIds,
      });
      const revoked = assignment.revokedSessionCount ?? 0;
      message.success(
        revoked > 0
          ? `Role users updated. ${revoked} active session${revoked === 1 ? '' : 's'} revoked.`
          : 'Role users updated.',
      );
      setUserAssignmentOpen(false);
      setAssigningUserRole(undefined);
      setAssignedUserIds([]);
      setUserTransferItems([]);
      await loadRoles();
    } finally {
      setUserAssignmentSubmitting(false);
    }
  };

  const columns: ProColumns<RoleSummary>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.name}
        </Typography.Link>
      ),
    },
    { title: 'Code', dataIndex: 'code' },
    {
      title: 'Permissions',
      dataIndex: 'permissionCodes',
      render: (_, record) =>
        record.permissionCodes.length > 4 ? (
          <Typography.Text>
            {record.permissionCodes.length} permissions
          </Typography.Text>
        ) : (
          <Space wrap size={4}>
            {record.permissionCodes.map((code) => (
              <Tag key={code}>{code}</Tag>
            ))}
          </Space>
        ),
    },
    {
      title: 'Data Scope',
      dataIndex: 'dataScope',
      render: (_, record) => <Tag>{dataScopeLabels[record.dataScope]}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      width: 104,
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
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
      width: 264,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Detail">
            <Button
              aria-label={`View ${record.name}`}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              aria-label={`Edit ${record.name}`}
              icon={<EditOutlined />}
              onClick={() => void openEditForm(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Menu Assignment">
            <Button
              aria-label={`Assign menus for ${record.name}`}
              icon={<ApartmentOutlined />}
              onClick={() => void openMenuAssignment(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="User Assignment">
            <Button
              aria-label={`Assign users for ${record.name}`}
              icon={<TeamOutlined />}
              onClick={() => void openUserAssignment(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title={record.enabled ? 'Disable this role?' : 'Enable this role?'}
            okText={record.enabled ? 'Disable' : 'Enable'}
            okButtonProps={{ danger: record.enabled }}
            onConfirm={() => void toggleRoleStatus(record)}
          >
            <Tooltip
              title={
                record.system
                  ? 'System roles cannot be disabled'
                  : record.enabled
                    ? 'Disable'
                    : 'Enable'
              }
            >
              <Button
                aria-label={`${record.enabled ? 'Disable' : 'Enable'} ${
                  record.name
                }`}
                danger={record.enabled}
                disabled={record.system}
                icon={
                  record.enabled ? <StopOutlined /> : <CheckCircleOutlined />
                }
                loading={statusUpdatingRoleCode === record.code}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
          <Popconfirm
            title="Delete this role?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => void deleteRole(record)}
          >
            <Tooltip
              title={
                record.system ? 'System roles cannot be deleted' : 'Delete'
              }
            >
              <Button
                aria-label={`Delete ${record.name}`}
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
    <PageContainer title="Roles" subTitle="S6 RBAC">
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message="Using fallback role snapshot"
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <ProTable<RoleSummary>
        rowKey="code"
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
            onClick={() => void loadRoles()}
          >
            Refresh
          </Button>,
          <CurrentPageExportButton<RoleSummary>
            key="export"
            columns={exportColumns}
            resource="core-roles"
            rows={filteredRows}
          />,
        ]}
        pagination={{ pageSize: 10 }}
        dataSource={filteredRows}
        columns={columns}
      />
      <ReadOnlyDetailDrawer
        fields={
          selectedDetail ? createDetailFields(selectedDetail, deptNames) : []
        }
        jsonSections={
          selectedDetail ? createDetailJsonSections(selectedDetail) : []
        }
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={selectedDetail?.name ?? 'Role Detail'}
      />
      <Modal
        title={editingRole ? 'Edit Role' : 'New Role'}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingRole(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={editingRole ? 'Save' : 'Create'}
        width={720}
      >
        <Form<RoleFormValues> form={form} layout="vertical">
          <Form.Item
            label="Code"
            name="code"
            rules={[{ required: true, message: 'Code is required.' }]}
          >
            <Input disabled={Boolean(editingRole)} maxLength={96} />
          </Form.Item>
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Name is required.' }]}
          >
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item
            label="Permissions"
            name="permissionCodes"
            rules={[{ type: 'array' }]}
          >
            <Select
              allowClear
              mode="multiple"
              optionFilterProp="label"
              options={permissionOptions}
              placeholder="Select permissions"
              showSearch
            />
          </Form.Item>
          <Form.Item
            label="Data Scope"
            name="dataScope"
            rules={[{ required: true, message: 'Data scope is required.' }]}
          >
            <Select
              options={dataScopeOptions}
              onChange={(value) => {
                if (value !== 'custom') {
                  form.setFieldValue('dataScopeDeptIds', []);
                }
              }}
            />
          </Form.Item>
          <Form.Item
            label="Data Scope Departments"
            name="dataScopeDeptIds"
            rules={[
              {
                required: isCustomDataScope,
                message: 'Custom data scope requires at least one department.',
              },
            ]}
          >
            <Select
              allowClear
              disabled={!isCustomDataScope}
              mode="multiple"
              optionFilterProp="label"
              options={deptOptions}
              placeholder="Select departments"
              showSearch
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={
          assigningMenuRole
            ? `Menu Assignment - ${assigningMenuRole.name}`
            : 'Menu Assignment'
        }
        open={menuAssignmentOpen}
        onCancel={() => {
          setMenuAssignmentOpen(false);
          setAssigningMenuRole(undefined);
          setCheckedMenuKeys([]);
        }}
        onOk={() => void submitMenuAssignment()}
        confirmLoading={menuAssignmentSubmitting}
        okText="Save"
        width={760}
      >
        {menuTreeData.length > 0 ? (
          <Tree
            blockNode
            checkable
            checkedKeys={checkedMenuKeys}
            height={420}
            onCheck={(keys) =>
              setCheckedMenuKeys(normalizeCheckedTreeKeys(keys))
            }
            selectable={false}
            treeData={menuTreeData}
          />
        ) : (
          <Typography.Text type="secondary">
            No menus available.
          </Typography.Text>
        )}
      </Modal>
      <Modal
        title={
          assigningUserRole
            ? `User Assignment - ${assigningUserRole.name}`
            : 'User Assignment'
        }
        open={userAssignmentOpen}
        onCancel={() => {
          setUserAssignmentOpen(false);
          setAssigningUserRole(undefined);
          setAssignedUserIds([]);
          setUserTransferItems([]);
        }}
        onOk={() => void submitUserAssignment()}
        confirmLoading={userAssignmentSubmitting}
        okText="Save"
        width={820}
      >
        <Transfer
          dataSource={[...userTransferItems]}
          titles={['Available users', 'Assigned users']}
          targetKeys={assignedUserIds}
          onChange={(keys) => setAssignedUserIds(normalizeTransferKeys(keys))}
          render={(item) => (
            <Space direction="vertical" size={0}>
              <Typography.Text>{item.title}</Typography.Text>
              <Typography.Text type="secondary">
                {item.description}
              </Typography.Text>
            </Space>
          )}
          listStyle={{ height: 420, width: 340 }}
          oneWay={false}
          showSearch
        />
      </Modal>
    </PageContainer>
  );
}
