import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  TeamOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import {
  createSystemDeptOptionFixtures,
  createSystemDeptFixtures,
  createSystemPostFixtures,
  type RoleSummary,
  type SystemDeptOptionSummary,
  type SystemDeptSummary,
  type SystemDeptTreeSummary,
  type SystemPostOptionSummary,
  type UserImportResultSummary,
  type UserRoleAssignmentSummary,
  type UserSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Checkbox,
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
  Upload,
  message,
  type UploadFile,
} from 'antd';
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type Key,
} from 'react';
import {
  createOpenCoreUser,
  deleteOpenCoreUsers,
  deleteOpenCoreUser,
  exportOpenCoreUsers,
  assignOpenCoreUserRoles,
  getOpenCoreUserImportTemplate,
  getOpenCoreUser,
  getOpenCoreUserRoleAssignment,
  importOpenCoreUsers,
  listOpenCoreRoles,
  listOpenCoreSystemDepts,
  listOpenCoreSystemDeptOptions,
  listOpenCoreSystemPostOptions,
  listOpenCoreUsers,
  resetOpenCoreUserPassword,
  setOpenCoreUsersStatus,
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
import { downloadBase64File } from '../shared/downloadBase64File';

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

type AssignRolesValues = {
  roleCodes?: string[];
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
const fallbackDeptOptionRows = createSystemDeptOptionFixtures();
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

function toDeptOptionTreeSelectData(
  rows: readonly SystemDeptOptionSummary[],
): TreeSelectNode[] {
  const nodes = new Map<
    string,
    TreeSelectNode & { order: number; parentId?: string }
  >();
  const roots: Array<TreeSelectNode & { order: number; parentId?: string }> =
    [];

  for (const row of rows) {
    nodes.set(row.id, {
      title: row.name,
      value: row.id,
      order: row.order,
      parentId: row.parentId,
      children: [],
    });
  }

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children?.push(node);
      continue;
    }

    roots.push(node);
  }

  return sortDeptOptionNodes(roots);
}

function sortDeptOptionNodes(
  rows: Array<TreeSelectNode & { order: number; parentId?: string }>,
): TreeSelectNode[] {
  return rows
    .sort(
      (left, right) =>
        left.order - right.order || left.title.localeCompare(right.title),
    )
    .map(({ order: _order, parentId: _parentId, children, ...row }) => ({
      ...row,
      children: children
        ? sortDeptOptionNodes(
            children as Array<
              TreeSelectNode & { order: number; parentId?: string }
            >,
          )
        : [],
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
  const access = useAccess();
  const canAssignUserRoles = Boolean(access.canAssignUserRoles);
  const canExportUsers = Boolean(access.canExportUsers);
  const canImportUsers = Boolean(access.canImportUsers);
  const [form] = Form.useForm<UserFormValues>();
  const [resetPasswordForm] = Form.useForm<ResetPasswordValues>();
  const [assignRolesForm] = Form.useForm<AssignRolesValues>();
  const [rows, setRows] = useState<readonly UserSummary[]>(fallbackRows);
  const [roleRows, setRoleRows] =
    useState<readonly RoleSummary[]>(fallbackRoleRows);
  const [deptTreeRows, setDeptTreeRows] =
    useState<readonly SystemDeptTreeSummary[]>(fallbackDeptTreeRows);
  const [deptOptionRows, setDeptOptionRows] = useState<
    readonly SystemDeptOptionSummary[]
  >(fallbackDeptOptionRows);
  const [postRows, setPostRows] =
    useState<readonly SystemPostOptionSummary[]>(fallbackPostRows);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<UserSummary>();
  const [editingUser, setEditingUser] = useState<UserSummary>();
  const [resetPasswordUser, setResetPasswordUser] = useState<UserSummary>();
  const [assigningRoleUser, setAssigningRoleUser] =
    useState<UserRoleAssignmentSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [assignRolesOpen, setAssignRolesOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetPasswordSubmitting, setResetPasswordSubmitting] = useState(false);
  const [assignRolesSubmitting, setAssignRolesSubmitting] = useState(false);
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState<string>();
  const [batchAction, setBatchAction] = useState<
    'delete' | 'disable' | 'enable'
  >();
  const [exportingUsers, setExportingUsers] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importUpdateExisting, setImportUpdateExisting] = useState(false);
  const [importFileList, setImportFileList] = useState<UploadFile[]>([]);
  const [importResult, setImportResult] = useState<UserImportResultSummary>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>();
  const flatDeptRows = useMemo(
    () => flattenDeptTree(deptTreeRows),
    [deptTreeRows],
  );
  const deptNames = useMemo(
    () => createDeptNameMap(flatDeptRows),
    [flatDeptRows],
  );
  const deptOptionTreeData = useMemo(
    () => toDeptOptionTreeSelectData(deptOptionRows),
    [deptOptionRows],
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
  const selectedUserIds = useMemo(
    () =>
      selectedRowKeys
        .map((key) => String(key))
        .filter((id) =>
          filteredRows.some((row) => row.id === id && !row.system),
        ),
    [filteredRows, selectedRowKeys],
  );
  const selectedUserCount = selectedUserIds.length;

  const loadUsers = async (deptId = selectedDeptId) => {
    setLoading(true);
    try {
      const [users, roles, deptTree, deptOptions, posts] = await Promise.all([
        listOpenCoreUsers(deptId ? { deptId } : undefined),
        listOpenCoreRoles(),
        listOpenCoreSystemDepts(),
        listOpenCoreSystemDeptOptions(),
        listOpenCoreSystemPostOptions(),
      ]);
      setRows(users);
      setSelectedRowKeys((current) =>
        current.filter((key) =>
          users.some((user) => user.id === String(key) && !user.system),
        ),
      );
      setRoleRows(roles);
      setDeptTreeRows(deptTree);
      setDeptOptionRows(deptOptions);
      setPostRows(posts);
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows(filterUsersByDept(fallbackRows, fallbackDeptTreeRows, deptId));
      setSelectedRowKeys([]);
      setRoleRows(fallbackRoleRows);
      setDeptTreeRows(fallbackDeptTreeRows);
      setDeptOptionRows(fallbackDeptOptionRows);
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

  const downloadImportTemplate = async () => {
    const template = await getOpenCoreUserImportTemplate();
    downloadBase64File(
      template.filename,
      template.contentBase64,
      template.contentType,
    );
    message.success('User import template downloaded.');
  };

  const downloadUserExcelExport = async () => {
    setExportingUsers(true);
    try {
      const exported = await exportOpenCoreUsers(
        selectedDeptId ? { deptId: selectedDeptId } : undefined,
      );

      if (!exported.contentBase64 || !exported.contentType) {
        message.warning('User Excel export is unavailable.');
        return;
      }

      downloadBase64File(
        exported.filename,
        exported.contentBase64,
        exported.contentType,
      );
      message.success(
        `User Excel export downloaded. ${exported.rowCount} row(s).`,
      );
    } finally {
      setExportingUsers(false);
    }
  };

  const openImportUsers = () => {
    setImportFileList([]);
    setImportResult(undefined);
    setImportUpdateExisting(false);
    setImportOpen(true);
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

  const openAssignRoles = async (record: UserSummary) => {
    if (record.system) {
      message.warning('System users cannot be assigned roles.');
      return;
    }

    if (!canAssignUserRoles) {
      message.warning('Missing core:user:manage');
      return;
    }

    try {
      const assignment = await getOpenCoreUserRoleAssignment(record.id);
      setAssigningRoleUser(assignment);
      assignRolesForm.setFieldsValue({
        roleCodes: [...assignment.roleCodes],
      });
      setAssignRolesOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : 'Unable to open role assignment.',
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

  const submitAssignRoles = async () => {
    if (!assigningRoleUser) {
      return;
    }

    const values = await assignRolesForm.validateFields();
    setAssignRolesSubmitting(true);
    try {
      const result = await assignOpenCoreUserRoles(assigningRoleUser.userId, {
        roleCodes: values.roleCodes ?? [],
      });
      message.success(
        `Roles assigned. ${formatRevokedSessions(result.revokedSessionCount)}`,
      );
      setAssignRolesOpen(false);
      setAssigningRoleUser(undefined);
      await loadUsers();
    } finally {
      setAssignRolesSubmitting(false);
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

  const batchSetUsersStatus = async (enabled: boolean) => {
    if (selectedUserIds.length === 0) {
      message.warning('Select at least one custom user.');
      return;
    }

    const action = enabled ? 'enable' : 'disable';
    setBatchAction(action);
    try {
      const result = await setOpenCoreUsersStatus({
        userIds: selectedUserIds,
        enabled,
      });
      message.success(
        `Selected users ${enabled ? 'enabled' : 'disabled'}. ${formatBatchMutation(
          result.affected,
          result.revokedSessionCount,
        )}`,
      );
      setSelectedRowKeys([]);
      await loadUsers();
    } finally {
      setBatchAction(undefined);
    }
  };

  const batchDeleteUsers = async () => {
    if (selectedUserIds.length === 0) {
      message.warning('Select at least one custom user.');
      return;
    }

    setBatchAction('delete');
    try {
      const result = await deleteOpenCoreUsers({
        userIds: selectedUserIds,
      });
      message.success(
        `Selected users deleted. ${formatBatchMutation(
          result.affected,
          result.revokedSessionCount,
        )}`,
      );
      setSelectedRowKeys([]);
      await loadUsers();
    } finally {
      setBatchAction(undefined);
    }
  };

  const submitImportUsers = async () => {
    const file = importFileList[0]?.originFileObj;

    if (!file) {
      message.warning('Select a CSV or XLSX file to import.');
      return;
    }

    setImportSubmitting(true);
    try {
      const result = await importOpenCoreUsers({
        contentBase64: await readFileAsDataUrl(file),
        updateExisting: importUpdateExisting,
      });
      setImportResult(result);
      message.success(formatImportSummary(result));

      if (result.failed === 0) {
        setImportOpen(false);
      }

      await loadUsers();
    } finally {
      setImportSubmitting(false);
    }
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
          <Tooltip
            title={
              record.system
                ? 'System users cannot be assigned roles'
                : canAssignUserRoles
                  ? 'Assign Roles'
                  : 'Missing core:user:manage'
            }
          >
            <Button
              aria-label={`Assign roles for ${record.username}`}
              disabled={record.system || !canAssignUserRoles}
              icon={<TeamOutlined />}
              onClick={() => void openAssignRoles(record)}
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
                disabled={selectedUserCount === 0}
                icon={<CheckCircleOutlined />}
                key="batch-enable"
                loading={batchAction === 'enable'}
                onClick={() => void batchSetUsersStatus(true)}
              >
                Enable selected
              </Button>,
              <Button
                disabled={selectedUserCount === 0}
                icon={<StopOutlined />}
                key="batch-disable"
                loading={batchAction === 'disable'}
                onClick={() => void batchSetUsersStatus(false)}
              >
                Disable selected
              </Button>,
              <Popconfirm
                key="batch-delete"
                title={`Delete ${selectedUserCount} selected user(s)?`}
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => void batchDeleteUsers()}
              >
                <Button
                  danger
                  disabled={selectedUserCount === 0}
                  icon={<DeleteOutlined />}
                  loading={batchAction === 'delete'}
                >
                  Delete selected
                </Button>
              </Popconfirm>,
              <Tooltip
                key="download-import-template"
                title={
                  canImportUsers
                    ? 'Download import template'
                    : 'Missing core:user:import'
                }
              >
                <Button
                  disabled={!canImportUsers}
                  icon={<DownloadOutlined />}
                  onClick={() => void downloadImportTemplate()}
                >
                  Download import template
                </Button>
              </Tooltip>,
              <Tooltip
                key="import-users"
                title={
                  canImportUsers ? 'Import users' : 'Missing core:user:import'
                }
              >
                <Button
                  disabled={!canImportUsers}
                  icon={<UploadOutlined />}
                  onClick={openImportUsers}
                >
                  Import users
                </Button>
              </Tooltip>,
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
              <Tooltip
                key="download-user-excel-export"
                title={
                  canExportUsers
                    ? 'Download Excel export'
                    : 'Missing core:user:export'
                }
              >
                <Button
                  disabled={!canExportUsers}
                  icon={<DownloadOutlined />}
                  loading={exportingUsers}
                  onClick={() => void downloadUserExcelExport()}
                >
                  Download Excel
                </Button>
              </Tooltip>,
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
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys([...keys]),
              getCheckboxProps: (record) => ({
                disabled: record.system,
                name: record.username,
              }),
            }}
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
        title="Import users"
        open={importOpen}
        okText="Import"
        confirmLoading={importSubmitting}
        onCancel={() => setImportOpen(false)}
        onOk={() => void submitImportUsers()}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Upload
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            beforeUpload={(file) => {
              setImportFileList([file]);
              setImportResult(undefined);
              return false;
            }}
            fileList={importFileList}
            maxCount={1}
            onRemove={() => {
              setImportFileList([]);
              setImportResult(undefined);
            }}
          >
            <Button icon={<UploadOutlined />}>Select CSV/XLSX file</Button>
          </Upload>
          <Checkbox
            checked={importUpdateExisting}
            onChange={(event) => setImportUpdateExisting(event.target.checked)}
          >
            Update existing users
          </Checkbox>
          {importResult ? (
            <Alert
              showIcon
              type={importResult.failed > 0 ? 'warning' : 'success'}
              message={formatImportSummary(importResult)}
              description={
                importResult.failures.length > 0 ? (
                  <Space direction="vertical" size={4}>
                    {importResult.failures.map((failure) => (
                      <Typography.Text
                        key={`${failure.rowNumber}-${failure.username ?? 'row'}`}
                        type="secondary"
                      >
                        Row {failure.rowNumber}
                        {failure.username ? ` (${failure.username})` : ''}:{' '}
                        {failure.reason}
                      </Typography.Text>
                    ))}
                  </Space>
                ) : undefined
              }
            />
          ) : null}
        </Space>
      </Modal>
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
              treeData={deptOptionTreeData}
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
      <Modal
        title={
          assigningRoleUser
            ? `Assign Roles - ${assigningRoleUser.username}`
            : 'Assign Roles'
        }
        open={assignRolesOpen}
        onCancel={() => {
          setAssignRolesOpen(false);
          setAssigningRoleUser(undefined);
        }}
        onOk={() => void submitAssignRoles()}
        confirmLoading={assignRolesSubmitting}
        okText="Save"
        width={560}
      >
        <Form<AssignRolesValues> form={assignRolesForm} layout="vertical">
          <Form.Item label="Username">
            <Input value={assigningRoleUser?.username} disabled />
          </Form.Item>
          <Form.Item label="Display Name">
            <Input value={assigningRoleUser?.displayName} disabled />
          </Form.Item>
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
        </Form>
      </Modal>
    </PageContainer>
  );
}

function formatRevokedSessions(count: number | undefined): string {
  return `Revoked sessions: ${count ?? 0}.`;
}

function formatBatchMutation(
  affected: number,
  revokedSessionCount: number | undefined,
): string {
  return `${affected} user(s) affected. ${formatRevokedSessions(
    revokedSessionCount,
  )}`;
}

function formatImportSummary(result: UserImportResultSummary): string {
  return `Imported ${result.totalRows} row(s): ${result.created} created, ${result.updated} updated, ${result.failed} failed. ${formatRevokedSessions(
    result.revokedSessionCount,
  )}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error('File read failed.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
