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
import { useAccess, useIntl } from '@umijs/max';
import type {
  RoleSummary,
  SystemDeptOptionSummary,
  SystemDeptSummary,
  SystemDeptTreeSummary,
  SystemPostOptionSummary,
  UserImportResultSummary,
  UserRoleAssignmentSummary,
  UserSummary,
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

const searchFields: CurrentPageSearchField<UserSummary>[] = [
  'username',
  'displayName',
  'deptId',
  (record) => record.roleCodes,
  (record) => record.postCodes,
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

export default function UsersPage() {
  const intl = useIntl();
  const access = useAccess();
  const canAssignUserRoles = Boolean(access.canAssignUserRoles);
  const canExportUsers = Boolean(access.canExportUsers);
  const canImportUsers = Boolean(access.canImportUsers);
  const [form] = Form.useForm<UserFormValues>();
  const [resetPasswordForm] = Form.useForm<ResetPasswordValues>();
  const [assignRolesForm] = Form.useForm<AssignRolesValues>();
  const [rows, setRows] = useState<readonly UserSummary[]>([]);
  const [roleRows, setRoleRows] = useState<readonly RoleSummary[]>([]);
  const [deptTreeRows, setDeptTreeRows] = useState<
    readonly SystemDeptTreeSummary[]
  >([]);
  const [deptOptionRows, setDeptOptionRows] = useState<
    readonly SystemDeptOptionSummary[]
  >([]);
  const [postRows, setPostRows] = useState<readonly SystemPostOptionSummary[]>(
    [],
  );
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
  const formatMessage = (
    id: string,
    defaultMessage: string,
    values?: Record<string, number | string>,
  ) =>
    values
      ? intl.formatMessage({ id, defaultMessage }, values)
      : intl.formatMessage({ id, defaultMessage });
  const statusLabels = {
    disabled: formatMessage('pages.system.users.status.disabled', 'Disabled'),
    enabled: formatMessage('pages.system.users.status.enabled', 'Enabled'),
  };
  const systemLabels = {
    custom: formatMessage('pages.system.users.system.custom', 'Custom'),
    system: formatMessage('pages.system.users.system.system', 'System'),
  };
  const filterOptions: CurrentPageFilterOption<UserSummary>[] = [
    {
      key: 'enabled',
      options: [
        { label: statusLabels.enabled, value: 'true' },
        { label: statusLabels.disabled, value: 'false' },
      ],
      placeholder: formatMessage('pages.system.users.filters.status', 'Status'),
      predicate: (record, value) => record.enabled === (value === 'true'),
    },
    {
      key: 'system',
      options: [
        { label: systemLabels.system, value: 'true' },
        { label: systemLabels.custom, value: 'false' },
      ],
      placeholder: formatMessage('pages.system.users.filters.system', 'System'),
      predicate: (record, value) => record.system === (value === 'true'),
    },
  ];
  const exportColumns: CurrentPageExportColumn<UserSummary>[] = [
    {
      title: formatMessage('pages.system.users.fields.id', 'ID'),
      dataIndex: 'id',
    },
    {
      title: formatMessage('pages.system.users.fields.username', 'Username'),
      dataIndex: 'username',
    },
    {
      title: formatMessage(
        'pages.system.users.fields.displayName',
        'Display Name',
      ),
      dataIndex: 'displayName',
    },
    {
      title: formatMessage(
        'pages.system.users.fields.departmentId',
        'Department ID',
      ),
      dataIndex: 'deptId',
    },
    {
      title: formatMessage('pages.system.users.fields.roles', 'Roles'),
      renderText: (record) => record.roleCodes.join(', '),
    },
    {
      title: formatMessage('pages.system.users.fields.posts', 'Posts'),
      renderText: (record) => record.postCodes.join(', '),
    },
    {
      title: formatMessage('pages.system.users.fields.enabled', 'Enabled'),
      renderText: (record) =>
        record.enabled ? statusLabels.enabled : statusLabels.disabled,
    },
    {
      title: formatMessage('pages.system.users.fields.system', 'System'),
      renderText: (record) =>
        record.system ? systemLabels.system : systemLabels.custom,
    },
  ];
  const formatRevokedSessions = (count: number | undefined): string =>
    formatMessage(
      'pages.system.users.messages.revokedSessions',
      'Revoked sessions: {count}.',
      { count: count ?? 0 },
    );
  const formatBatchMutation = (
    affected: number,
    revokedSessionCount: number | undefined,
  ): string =>
    formatMessage(
      'pages.system.users.messages.batchMutation',
      '{affected} user(s) affected. {revokedSessions}',
      { affected, revokedSessions: formatRevokedSessions(revokedSessionCount) },
    );
  const formatImportSummary = (result: UserImportResultSummary): string =>
    formatMessage(
      'pages.system.users.messages.importSummary',
      'Imported {totalRows} row(s): {created} created, {updated} updated, {failed} failed. {revokedSessions}',
      {
        created: result.created,
        failed: result.failed,
        revokedSessions: formatRevokedSessions(result.revokedSessionCount),
        totalRows: result.totalRows,
        updated: result.updated,
      },
    );
  const formatImportFailureRow = (
    rowNumber: number,
    username: string | undefined,
    reason: string,
  ): string =>
    username
      ? formatMessage(
          'pages.system.users.import.failureRowWithUsername',
          'Row {rowNumber} ({username}): {reason}',
          { reason, rowNumber, username },
        )
      : formatMessage(
          'pages.system.users.import.failureRow',
          'Row {rowNumber}: {reason}',
          { reason, rowNumber },
        );
  const createDetailFields = (record: UserSummary): DetailField[] => [
    { label: formatMessage('pages.system.users.fields.id', 'ID'), value: record.id },
    {
      label: formatMessage('pages.system.users.fields.username', 'Username'),
      value: record.username,
    },
    {
      label: formatMessage(
        'pages.system.users.fields.displayName',
        'Display Name',
      ),
      value: record.displayName,
    },
    {
      label: formatMessage('pages.system.users.fields.department', 'Department'),
      value: record.deptId
        ? (deptNames.get(record.deptId) ?? record.deptId)
        : undefined,
    },
    {
      label: formatMessage('pages.system.users.fields.roles', 'Roles'),
      value: (
        <Space wrap>
          {record.roleCodes.map((code) => (
            <Tag key={code}>{code}</Tag>
          ))}
        </Space>
      ),
    },
    {
      label: formatMessage('pages.system.users.fields.posts', 'Posts'),
      value:
        record.postCodes.length > 0 ? (
          <Space wrap>
            {record.postCodes.map((code) => (
              <Tag key={code}>{postNames.get(code) ?? code}</Tag>
            ))}
          </Space>
        ) : undefined,
    },
    {
      label: formatMessage('pages.system.users.fields.status', 'Status'),
      value: record.enabled ? statusLabels.enabled : statusLabels.disabled,
    },
    {
      label: formatMessage('pages.system.users.fields.system', 'System'),
      value: record.system ? systemLabels.system : systemLabels.custom,
    },
  ];
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
      searchPlaceholder: formatMessage(
        'pages.system.users.search.placeholder',
        'Search users',
      ),
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
      setRows([]);
      setSelectedRowKeys([]);
      setRoleRows([]);
      setDeptTreeRows([]);
      setDeptOptionRows([]);
      setPostRows([]);
      setSelectedDetail(undefined);
      setEditingUser(undefined);
      setResetPasswordUser(undefined);
      setAssigningRoleUser(undefined);
      setFormOpen(false);
      setResetPasswordOpen(false);
      setAssignRolesOpen(false);
      setImportOpen(false);
      setImportFileList([]);
      setImportResult(undefined);
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.users.load.failure',
              'Unable to load live users.',
            ),
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
    message.success(
      formatMessage(
        'pages.system.users.messages.importTemplateDownloaded',
        'User import template downloaded.',
      ),
    );
  };

  const downloadUserExcelExport = async () => {
    setExportingUsers(true);
    try {
      const exported = await exportOpenCoreUsers(
        selectedDeptId ? { deptId: selectedDeptId } : undefined,
      );

      if (!exported.contentBase64 || !exported.contentType) {
        message.warning(
          formatMessage(
            'pages.system.users.messages.excelExportUnavailable',
            'User Excel export is unavailable.',
          ),
        );
        return;
      }

      downloadBase64File(
        exported.filename,
        exported.contentBase64,
        exported.contentType,
      );
      message.success(
        formatMessage(
          'pages.system.users.messages.excelExportDownloaded',
          'User Excel export downloaded. {rowCount} row(s).',
          { rowCount: exported.rowCount },
        ),
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
      message.warning(
        formatMessage(
          'pages.system.users.actions.systemEditLocked',
          'System users cannot be edited.',
        ),
      );
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
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.users.open.failure',
              'Unable to open user.',
            ),
      );
    }
  };

  const openDetail = async (record: UserSummary) => {
    try {
      setSelectedDetail(await getOpenCoreUser(record.id));
    } catch (error: unknown) {
      setSelectedDetail(undefined);
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.users.detail.loadFailure',
              'Unable to load live user detail.',
            ),
      );
    }
  };

  const openResetPassword = async (record: UserSummary) => {
    if (record.system) {
      message.warning(
        formatMessage(
          'pages.system.users.actions.systemResetLocked',
          'System users cannot be reset.',
        ),
      );
      return;
    }

    try {
      const fresh = await getOpenCoreUser(record.id);
      setResetPasswordUser(fresh);
      resetPasswordForm.setFieldsValue({ password: '' });
      setResetPasswordOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.users.open.failure',
              'Unable to open user.',
            ),
      );
    }
  };

  const openAssignRoles = async (record: UserSummary) => {
    if (record.system) {
      message.warning(
        formatMessage(
          'pages.system.users.actions.systemAssignRolesLocked',
          'System users cannot be assigned roles.',
        ),
      );
      return;
    }

    if (!canAssignUserRoles) {
      message.warning(
        formatMessage(
          'pages.system.users.permissions.missingManage',
          'Missing core:user:manage',
        ),
      );
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
          : formatMessage(
              'pages.system.users.roleAssignment.openFailure',
              'Unable to open role assignment.',
            ),
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
        message.success(
          formatMessage('pages.system.users.messages.updated', 'User updated.'),
        );
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
        message.success(
          formatMessage('pages.system.users.messages.created', 'User created.'),
        );
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
        formatMessage(
          'pages.system.users.messages.passwordReset',
          'Password reset. {revokedSessions}',
          { revokedSessions: formatRevokedSessions(result.revokedSessionCount) },
        ),
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
        formatMessage(
          'pages.system.users.roleAssignment.messages.updated',
          'Roles assigned. {revokedSessions}',
          { revokedSessions: formatRevokedSessions(result.revokedSessionCount) },
        ),
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
        formatMessage(
          result.enabled
            ? 'pages.system.users.messages.enabled'
            : 'pages.system.users.messages.disabled',
          result.enabled
            ? 'User enabled. {revokedSessions}'
            : 'User disabled. {revokedSessions}',
          { revokedSessions: formatRevokedSessions(result.revokedSessionCount) },
        ),
      );
      await loadUsers();
    } finally {
      setStatusUpdatingUserId(undefined);
    }
  };

  const deleteUser = async (record: UserSummary) => {
    const result = await deleteOpenCoreUser(record.id);
    message.success(
      formatMessage(
        'pages.system.users.messages.deleted',
        'User deleted. {revokedSessions}',
        { revokedSessions: formatRevokedSessions(result.revokedSessionCount) },
      ),
    );
    await loadUsers();
  };

  const batchSetUsersStatus = async (enabled: boolean) => {
    if (selectedUserIds.length === 0) {
      message.warning(
        formatMessage(
          'pages.system.users.messages.selectCustomUser',
          'Select at least one custom user.',
        ),
      );
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
        formatMessage(
          enabled
            ? 'pages.system.users.messages.batchEnabled'
            : 'pages.system.users.messages.batchDisabled',
          enabled
            ? 'Selected users enabled. {mutation}'
            : 'Selected users disabled. {mutation}',
          {
            mutation: formatBatchMutation(
              result.affected,
              result.revokedSessionCount,
            ),
          },
        ),
      );
      setSelectedRowKeys([]);
      await loadUsers();
    } finally {
      setBatchAction(undefined);
    }
  };

  const batchDeleteUsers = async () => {
    if (selectedUserIds.length === 0) {
      message.warning(
        formatMessage(
          'pages.system.users.messages.selectCustomUser',
          'Select at least one custom user.',
        ),
      );
      return;
    }

    setBatchAction('delete');
    try {
      const result = await deleteOpenCoreUsers({
        userIds: selectedUserIds,
      });
      message.success(
        formatMessage(
          'pages.system.users.messages.batchDeleted',
          'Selected users deleted. {mutation}',
          {
            mutation: formatBatchMutation(
              result.affected,
              result.revokedSessionCount,
            ),
          },
        ),
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
      message.warning(
        formatMessage(
          'pages.system.users.messages.selectImportFile',
          'Select a CSV or XLSX file to import.',
        ),
      );
      return;
    }

    setImportSubmitting(true);
    try {
      const result = await importOpenCoreUsers({
        contentBase64: await readFileAsDataUrl(
          file,
          formatMessage(
            'pages.system.users.messages.fileReadFailure',
            'File read failed.',
          ),
        ),
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
      title: formatMessage('pages.system.users.fields.username', 'Username'),
      dataIndex: 'username',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.username}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage(
        'pages.system.users.fields.displayName',
        'Display Name',
      ),
      dataIndex: 'displayName',
    },
    {
      title: formatMessage('pages.system.users.fields.department', 'Department'),
      dataIndex: 'deptId',
      render: (_, record) =>
        record.deptId ? (deptNames.get(record.deptId) ?? record.deptId) : '-',
    },
    {
      title: formatMessage('pages.system.users.fields.roles', 'Roles'),
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
      title: formatMessage('pages.system.users.fields.posts', 'Posts'),
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
      title: formatMessage('pages.system.users.fields.status', 'Status'),
      dataIndex: 'enabled',
      width: 96,
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'red'}>
          {record.enabled ? statusLabels.enabled : statusLabels.disabled}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.system.users.fields.system', 'System'),
      dataIndex: 'system',
      width: 96,
      render: (_, record) => (
        <Tag color={record.system ? 'blue' : 'default'}>
          {record.system ? systemLabels.system : systemLabels.custom}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.system.users.actions.column', 'Actions'),
      valueType: 'option',
      width: 248,
      render: (_, record) => (
        <Space size="small">
          <Tooltip
            title={formatMessage(
              'pages.system.users.actions.detail',
              'Detail',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.users.actions.viewAria',
                'View {username}',
                { username: record.username },
              )}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              record.system
                ? formatMessage(
                    'pages.system.users.actions.systemEditLocked',
                    'System users cannot be edited',
                  )
                : formatMessage('pages.system.users.actions.edit', 'Edit')
            }
          >
            <Button
              aria-label={formatMessage(
                'pages.system.users.actions.editAria',
                'Edit {username}',
                { username: record.username },
              )}
              disabled={record.system}
              icon={<EditOutlined />}
              onClick={() => void openEditForm(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title={formatMessage(
              record.enabled
                ? 'pages.system.users.confirm.disable'
                : 'pages.system.users.confirm.enable',
              record.enabled ? 'Disable this user?' : 'Enable this user?',
            )}
            okText={
              record.enabled
                ? formatMessage('pages.system.users.actions.disable', 'Disable')
                : formatMessage('pages.system.users.actions.enable', 'Enable')
            }
            okButtonProps={{ danger: record.enabled }}
            onConfirm={() => void toggleUserStatus(record)}
          >
            <Tooltip
              title={
                record.system
                  ? formatMessage(
                      'pages.system.users.actions.systemStatusLocked',
                      'System users cannot change status',
                    )
                  : record.enabled
                    ? formatMessage(
                        'pages.system.users.actions.disable',
                        'Disable',
                      )
                    : formatMessage(
                        'pages.system.users.actions.enable',
                        'Enable',
                      )
              }
            >
              <Button
                aria-label={formatMessage(
                  record.enabled
                    ? 'pages.system.users.actions.disableAria'
                    : 'pages.system.users.actions.enableAria',
                  record.enabled
                    ? 'Disable {username}'
                    : 'Enable {username}',
                  { username: record.username },
                )}
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
                ? formatMessage(
                    'pages.system.users.actions.systemResetLocked',
                    'System users cannot reset password',
                  )
                : formatMessage(
                    'pages.system.users.actions.resetPassword',
                    'Reset Password',
                  )
            }
          >
            <Button
              aria-label={formatMessage(
                'pages.system.users.actions.resetPasswordAria',
                'Reset password for {username}',
                { username: record.username },
              )}
              disabled={record.system}
              icon={<LockOutlined />}
              onClick={() => void openResetPassword(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              record.system
                ? formatMessage(
                    'pages.system.users.actions.systemAssignRolesLocked',
                    'System users cannot be assigned roles',
                  )
                : canAssignUserRoles
                  ? formatMessage(
                      'pages.system.users.actions.assignRoles',
                      'Assign Roles',
                    )
                  : formatMessage(
                      'pages.system.users.permissions.missingManage',
                      'Missing core:user:manage',
                    )
            }
          >
            <Button
              aria-label={formatMessage(
                'pages.system.users.actions.assignRolesAria',
                'Assign roles for {username}',
                { username: record.username },
              )}
              disabled={record.system || !canAssignUserRoles}
              icon={<TeamOutlined />}
              onClick={() => void openAssignRoles(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title={formatMessage(
              'pages.system.users.confirm.deleteOne',
              'Delete this user?',
            )}
            okText={formatMessage('pages.system.users.actions.delete', 'Delete')}
            okButtonProps={{ danger: true }}
            onConfirm={() => void deleteUser(record)}
          >
            <Tooltip
              title={
                record.system
                  ? formatMessage(
                      'pages.system.users.actions.systemDeleteLocked',
                      'System users cannot be deleted',
                    )
                  : formatMessage(
                      'pages.system.users.actions.delete',
                      'Delete',
                    )
              }
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.users.actions.deleteAria',
                  'Delete {username}',
                  { username: record.username },
                )}
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
    <PageContainer
      title={formatMessage('pages.system.users.title', 'Users')}
      subTitle={formatMessage('pages.system.rbac.section', 'S6 RBAC')}
    >
      {loadError ? (
        <Alert
          showIcon
          type="error"
          message={formatMessage(
            'pages.system.users.load.liveFailure',
            'Unable to load live users',
          )}
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <div style={usersPageLayoutStyle}>
        <div style={deptFilterPanelStyle}>
          <Space style={deptFilterHeaderStyle}>
            <Typography.Text strong>
              {formatMessage(
                'pages.system.users.deptScope.title',
                'Department scope',
              )}
            </Typography.Text>
            <Tooltip
              title={formatMessage('pages.system.users.actions.reload', 'Reload')}
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.users.actions.reloadAria',
                  'Reload users',
                )}
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
            {formatMessage(
              'pages.system.users.deptScope.allDepartments',
              'All departments',
            )}
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
                {formatMessage(
                  'pages.system.users.actions.enableSelected',
                  'Enable selected',
                )}
              </Button>,
              <Button
                disabled={selectedUserCount === 0}
                icon={<StopOutlined />}
                key="batch-disable"
                loading={batchAction === 'disable'}
                onClick={() => void batchSetUsersStatus(false)}
              >
                {formatMessage(
                  'pages.system.users.actions.disableSelected',
                  'Disable selected',
                )}
              </Button>,
              <Popconfirm
                key="batch-delete"
                title={formatMessage(
                  'pages.system.users.confirm.deleteSelected',
                  'Delete {count} selected user(s)?',
                  { count: selectedUserCount },
                )}
                okText={formatMessage(
                  'pages.system.users.actions.delete',
                  'Delete',
                )}
                okButtonProps={{ danger: true }}
                onConfirm={() => void batchDeleteUsers()}
              >
                <Button
                  danger
                  disabled={selectedUserCount === 0}
                  icon={<DeleteOutlined />}
                  loading={batchAction === 'delete'}
                >
                  {formatMessage(
                    'pages.system.users.actions.deleteSelected',
                    'Delete selected',
                  )}
                </Button>
              </Popconfirm>,
              <Tooltip
                key="download-import-template"
                title={
                  canImportUsers
                    ? formatMessage(
                        'pages.system.users.actions.downloadImportTemplate',
                        'Download import template',
                      )
                    : formatMessage(
                        'pages.system.users.permissions.missingImport',
                        'Missing core:user:import',
                      )
                }
              >
                <Button
                  disabled={!canImportUsers}
                  icon={<DownloadOutlined />}
                  onClick={() => void downloadImportTemplate()}
                >
                  {formatMessage(
                    'pages.system.users.actions.downloadImportTemplate',
                    'Download import template',
                  )}
                </Button>
              </Tooltip>,
              <Tooltip
                key="import-users"
                title={
                  canImportUsers
                    ? formatMessage(
                        'pages.system.users.actions.importUsers',
                        'Import users',
                      )
                    : formatMessage(
                        'pages.system.users.permissions.missingImport',
                        'Missing core:user:import',
                      )
                }
              >
                <Button
                  disabled={!canImportUsers}
                  icon={<UploadOutlined />}
                  onClick={openImportUsers}
                >
                  {formatMessage(
                    'pages.system.users.actions.importUsers',
                    'Import users',
                  )}
                </Button>
              </Tooltip>,
              <Button
                key="create"
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateForm}
              >
                {formatMessage('pages.system.users.actions.new', 'New')}
              </Button>,
              <Button
                key="refresh"
                icon={<ReloadOutlined />}
                onClick={() => void loadUsers()}
              >
                {formatMessage('pages.system.users.actions.refresh', 'Refresh')}
              </Button>,
              <Tooltip
                key="download-user-excel-export"
                title={
                  canExportUsers
                    ? formatMessage(
                        'pages.system.users.actions.downloadExcel',
                        'Download Excel export',
                      )
                    : formatMessage(
                        'pages.system.users.permissions.missingExport',
                        'Missing core:user:export',
                      )
                }
              >
                <Button
                  disabled={!canExportUsers}
                  icon={<DownloadOutlined />}
                  loading={exportingUsers}
                  onClick={() => void downloadUserExcelExport()}
                >
                  {formatMessage(
                    'pages.system.users.actions.downloadExcelShort',
                    'Download Excel',
                  )}
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
            ? createDetailFields(selectedDetail)
            : []
        }
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={
          selectedDetail?.username ??
          formatMessage('pages.system.users.detail.title', 'User Detail')
        }
      />
      <Modal
        title={formatMessage(
          'pages.system.users.import.title',
          'Import users',
        )}
        open={importOpen}
        okText={formatMessage('pages.system.users.actions.import', 'Import')}
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
            <Button icon={<UploadOutlined />}>
              {formatMessage(
                'pages.system.users.actions.selectImportFile',
                'Select CSV/XLSX file',
              )}
            </Button>
          </Upload>
          <Checkbox
            checked={importUpdateExisting}
            onChange={(event) => setImportUpdateExisting(event.target.checked)}
          >
            {formatMessage(
              'pages.system.users.import.updateExisting',
              'Update existing users',
            )}
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
                        {formatImportFailureRow(
                          failure.rowNumber,
                          failure.username,
                          failure.reason,
                        )}
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
        title={formatMessage(
          editingUser
            ? 'pages.system.users.form.editTitle'
            : 'pages.system.users.form.createTitle',
          editingUser ? 'Edit User' : 'New User',
        )}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingUser(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={
          editingUser
            ? formatMessage('pages.system.users.actions.save', 'Save')
            : formatMessage('pages.system.users.actions.create', 'Create')
        }
        width={720}
      >
        <Form<UserFormValues> form={form} layout="vertical">
          <Form.Item
            label={formatMessage(
              'pages.system.users.fields.username',
              'Username',
            )}
            name="username"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.users.validation.usernameRequired',
                  'Username is required.',
                ),
              },
            ]}
          >
            <Input disabled={Boolean(editingUser)} maxLength={96} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.users.fields.displayName',
              'Display Name',
            )}
            name="displayName"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.users.validation.displayNameRequired',
                  'Display name is required.',
                ),
              },
            ]}
          >
            <Input maxLength={120} />
          </Form.Item>
          {!editingUser ? (
            <Form.Item
              label={formatMessage(
                'pages.system.users.fields.password',
                'Password',
              )}
              name="password"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.system.users.validation.passwordRequired',
                    'Password is required.',
                  ),
                },
              ]}
            >
              <Input.Password autoComplete="new-password" maxLength={128} />
            </Form.Item>
          ) : null}
          <Form.Item
            label={formatMessage('pages.system.users.fields.roles', 'Roles')}
            name="roleCodes"
            rules={[{ type: 'array' }]}
          >
            <Select
              allowClear
              mode="multiple"
              optionFilterProp="label"
              options={roleOptions}
              placeholder={formatMessage(
                'pages.system.users.placeholders.roles',
                'Select roles',
              )}
              showSearch
            />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.users.fields.department',
              'Department',
            )}
            name="deptId"
          >
            <TreeSelect
              allowClear
              showSearch
              treeData={deptOptionTreeData}
              treeDefaultExpandAll
              placeholder={formatMessage(
                'pages.system.users.placeholders.department',
                'Select department',
              )}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.users.fields.posts', 'Posts')}
            name="postCodes"
            rules={[{ type: 'array' }]}
          >
            <Select
              allowClear
              mode="multiple"
              optionFilterProp="label"
              options={postOptions}
              placeholder={formatMessage(
                'pages.system.users.placeholders.posts',
                'Select posts',
              )}
              showSearch
            />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.users.fields.enabled', 'Enabled')}
            name="enabled"
            valuePropName="checked"
          >
            <Switch
              checkedChildren={statusLabels.enabled}
              unCheckedChildren={statusLabels.disabled}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={formatMessage(
          'pages.system.users.resetPassword.title',
          'Reset Password',
        )}
        open={resetPasswordOpen}
        onCancel={() => {
          setResetPasswordOpen(false);
          setResetPasswordUser(undefined);
        }}
        onOk={() => void submitResetPassword()}
        confirmLoading={resetPasswordSubmitting}
        okText={formatMessage('pages.system.users.actions.reset', 'Reset')}
        width={520}
      >
        <Form<ResetPasswordValues> form={resetPasswordForm} layout="vertical">
          <Form.Item
            label={formatMessage(
              'pages.system.users.fields.newPassword',
              'New Password',
            )}
            name="password"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.users.validation.passwordRequired',
                  'Password is required.',
                ),
              },
            ]}
          >
            <Input.Password autoComplete="new-password" maxLength={128} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={
          assigningRoleUser
            ? formatMessage(
                'pages.system.users.roleAssignment.titleForUser',
                'Assign Roles - {username}',
                { username: assigningRoleUser.username },
              )
            : formatMessage(
                'pages.system.users.roleAssignment.title',
                'Assign Roles',
              )
        }
        open={assignRolesOpen}
        onCancel={() => {
          setAssignRolesOpen(false);
          setAssigningRoleUser(undefined);
        }}
        onOk={() => void submitAssignRoles()}
        confirmLoading={assignRolesSubmitting}
        okText={formatMessage('pages.system.users.actions.save', 'Save')}
        width={560}
      >
        <Form<AssignRolesValues> form={assignRolesForm} layout="vertical">
          <Form.Item
            label={formatMessage(
              'pages.system.users.fields.username',
              'Username',
            )}
          >
            <Input value={assigningRoleUser?.username} disabled />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.users.fields.displayName',
              'Display Name',
            )}
          >
            <Input value={assigningRoleUser?.displayName} disabled />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.users.fields.roles', 'Roles')}
            name="roleCodes"
            rules={[{ type: 'array' }]}
          >
            <Select
              allowClear
              mode="multiple"
              optionFilterProp="label"
              options={roleOptions}
              placeholder={formatMessage(
                'pages.system.users.placeholders.roles',
                'Select roles',
              )}
              showSearch
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}

function readFileAsDataUrl(
  file: File,
  readFailureMessage: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(reader.error ?? new Error(readFailureMessage));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
