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
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess, useIntl } from '@umijs/max';
import type {
  ListUsersRequest,
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
  useRef,
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
  previewOpenCoreUsersImport,
  resetOpenCoreUserPassword,
  setOpenCoreUsersStatus,
  setOpenCoreUserStatus,
  updateOpenCoreUser,
} from '@/services/opencore/platform';
import {
  ReadOnlyDetailDrawer,
  type DetailField,
} from '../shared/ReadOnlyDetailDrawer';
import { downloadBase64File } from '../shared/downloadBase64File';
import { UserPicker } from './components/UserPicker';

type UserFormValues = {
  deptId?: string;
  displayName: string;
  email?: string;
  enabled?: boolean;
  gender?: string;
  mobile?: string;
  password?: string;
  postCodes?: string[];
  remark?: string;
  roleCodes?: string[];
  username: string;
};

type ResetPasswordValues = {
  password?: string;
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
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [form] = Form.useForm<UserFormValues>();
  const [resetPasswordForm] = Form.useForm<ResetPasswordValues>();
  const [assignRolesForm] = Form.useForm<AssignRolesValues>();
  const [rows, setRows] = useState<readonly UserSummary[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [currentQuery, setCurrentQuery] = useState<ListUsersRequest>({});
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
  const [importPreviewing, setImportPreviewing] = useState(false);
  const [importUpdateExisting, setImportUpdateExisting] = useState(false);
  const [importFileList, setImportFileList] = useState<UploadFile[]>([]);
  const [importResult, setImportResult] = useState<UserImportResultSummary>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [pickedUsers, setPickedUsers] = useState<readonly UserSummary[]>([]);
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
    disabled: formatMessage('pages.system.users.status.disabled', '禁用'),
    enabled: formatMessage('pages.system.users.status.enabled', '启用'),
  };
  const systemLabels = {
    custom: formatMessage('pages.system.users.system.custom', '自定义'),
    system: formatMessage('pages.system.users.system.system', '系统'),
  };
  const formatRevokedSessions = (count: number | undefined): string =>
    formatMessage(
      'pages.system.users.messages.revokedSessions',
      '已撤销会话：{count}',
      { count: count ?? 0 },
    );
  const formatBatchMutation = (
    affected: number,
    revokedSessionCount: number | undefined,
  ): string =>
    formatMessage(
      'pages.system.users.messages.batchMutation',
      '已处理 {affected} 个用户。{revokedSessions}',
      { affected, revokedSessions: formatRevokedSessions(revokedSessionCount) },
    );
  const formatImportSummary = (result: UserImportResultSummary): string =>
    formatMessage(
      result.dryRun
        ? 'pages.system.users.messages.importPreviewSummary'
        : 'pages.system.users.messages.importSummary',
      result.dryRun
        ? '预检 {totalRows} 行：预计新建 {created}，预计更新 {updated}，失败 {failed}'
        : '导入 {totalRows} 行：新建 {created}，更新 {updated}，失败 {failed}。{revokedSessions}',
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
    {
      label: formatMessage('pages.system.users.fields.id', 'ID'),
      value: record.id,
    },
    {
      label: formatMessage('pages.system.users.fields.username', '账号'),
      value: record.username,
    },
    {
      label: formatMessage('pages.system.users.fields.displayName', '显示名称'),
      value: record.displayName,
    },
    {
      label: formatMessage('pages.system.users.fields.mobile', '手机号'),
      value: record.mobile,
    },
    {
      label: formatMessage('pages.system.users.fields.email', '邮箱'),
      value: record.email,
    },
    {
      label: formatMessage('pages.system.users.fields.gender', '性别'),
      value: formatGender(record.gender),
    },
    {
      label: formatMessage('pages.system.users.fields.department', '部门'),
      value: record.deptId
        ? (deptNames.get(record.deptId) ?? record.deptId)
        : undefined,
    },
    {
      label: formatMessage('pages.system.users.fields.roles', '角色'),
      value: (
        <Space wrap>
          {record.roleCodes.map((code) => (
            <Tag key={code}>{code}</Tag>
          ))}
        </Space>
      ),
    },
    {
      label: formatMessage('pages.system.users.fields.posts', '岗位'),
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
      label: formatMessage('pages.system.users.fields.status', '状态'),
      value: record.enabled ? statusLabels.enabled : statusLabels.disabled,
    },
    {
      label: formatMessage('pages.system.users.fields.system', '账号类型'),
      value: record.system ? systemLabels.system : systemLabels.custom,
    },
    {
      label: formatMessage(
        'pages.system.users.fields.forcePasswordChange',
        '强制改密',
      ),
      value: record.forcePasswordChange
        ? formatMessage('pages.system.users.boolean.yes', '是')
        : formatMessage('pages.system.users.boolean.no', '否'),
    },
    {
      label: formatMessage('pages.system.users.fields.remark', '备注'),
      value: record.remark,
    },
    {
      label: formatMessage('pages.system.users.fields.lastLoginAt', '最近登录'),
      value: record.lastLoginAt,
    },
    {
      label: formatMessage(
        'pages.system.users.fields.lastLoginIp',
        '最近登录 IP',
      ),
      value: record.lastLoginIp,
    },
    {
      label: formatMessage(
        'pages.system.users.fields.lastLoginLocation',
        '最近登录地点',
      ),
      value: record.lastLoginLocation,
    },
    {
      label: formatMessage('pages.system.users.fields.createdAt', '创建时间'),
      value: record.createdAt,
    },
    {
      label: formatMessage('pages.system.users.fields.updatedAt', '更新时间'),
      value: record.updatedAt,
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
  const selectedUserIds = useMemo(
    () =>
      selectedRowKeys
        .map((key) => String(key))
        .filter((id) => {
          const row = rows.find((user) => user.id === id);

          if (row) {
            return !row.system;
          }

          const picked = pickedUsers.find((user) => user.id === id);
          return Boolean(picked && !picked.system);
        }),
    [pickedUsers, rows, selectedRowKeys],
  );
  const selectedUsersForPicker = useMemo(() => {
    const byId = new Map<string, UserSummary>();

    for (const user of pickedUsers) {
      byId.set(user.id, user);
    }

    for (const user of rows) {
      if (selectedRowKeys.includes(user.id)) {
        byId.set(user.id, user);
      }
    }

    return [...byId.values()];
  }, [pickedUsers, rows, selectedRowKeys]);
  const selectedUserCount = selectedUserIds.length;

  const reloadUsers = () => {
    actionRef.current?.reload();
  };

  const loadSupportData = async () => {
    setLoading(true);
    try {
      const [roles, deptTree, deptOptions, posts] = await Promise.all([
        listOpenCoreRoles(),
        listOpenCoreSystemDepts(),
        listOpenCoreSystemDeptOptions(),
        listOpenCoreSystemPostOptions(),
      ]);
      setRoleRows(roles);
      setDeptTreeRows(deptTree);
      setDeptOptionRows(deptOptions);
      setPostRows(posts);
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setTotalRows(0);
      setSelectedRowKeys([]);
      setPickedUsers([]);
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
    void loadSupportData();
  }, []);

  useEffect(() => {
    actionRef.current?.reload();
  }, [selectedDeptId]);

  const selectDept = (deptId: string | undefined) => {
    setSelectedDeptId(deptId);
    setSelectedRowKeys([]);
    setPickedUsers([]);
  };

  const openCreateForm = () => {
    setEditingUser(undefined);
    form.setFieldsValue({
      username: '',
      displayName: '',
      mobile: '',
      email: '',
      gender: 'unknown',
      remark: '',
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
      const { page: _page, pageSize: _pageSize, ...exportQuery } = currentQuery;
      const exported = await exportOpenCoreUsers(exportQuery);

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
        mobile: fresh.mobile,
        email: fresh.email,
        gender: fresh.gender ?? 'unknown',
        remark: fresh.remark,
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
          mobile: normalizeNullableFormText(values.mobile),
          email: normalizeNullableFormText(values.email),
          gender: values.gender ?? 'unknown',
          remark: normalizeNullableFormText(values.remark),
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
          mobile: normalizeNullableFormText(values.mobile),
          email: normalizeNullableFormText(values.email),
          gender: values.gender ?? 'unknown',
          remark: normalizeNullableFormText(values.remark),
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
      reloadUsers();
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
      const password = values.password?.trim();
      const result = await resetOpenCoreUserPassword(resetPasswordUser.id, {
        password: password || undefined,
      });
      message.success(
        formatMessage(
          'pages.system.users.messages.passwordReset',
          '密码已重置。{revokedSessions}',
          {
            revokedSessions: formatRevokedSessions(result.revokedSessionCount),
          },
        ),
      );
      if (result.temporaryPassword) {
        Modal.success({
          title: formatMessage(
            'pages.system.users.resetPassword.temporaryPasswordTitle',
            '临时密码已生成',
          ),
          content: (
            <Space direction="vertical">
              <Typography.Text>
                {formatMessage(
                  'pages.system.users.resetPassword.temporaryPasswordHint',
                  '请复制临时密码并通过安全渠道交给用户。',
                )}
              </Typography.Text>
              <Typography.Text copyable code>
                {result.temporaryPassword}
              </Typography.Text>
            </Space>
          ),
        });
      }
      setResetPasswordOpen(false);
      setResetPasswordUser(undefined);
      reloadUsers();
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
          {
            revokedSessions: formatRevokedSessions(result.revokedSessionCount),
          },
        ),
      );
      setAssignRolesOpen(false);
      setAssigningRoleUser(undefined);
      reloadUsers();
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
          {
            revokedSessions: formatRevokedSessions(result.revokedSessionCount),
          },
        ),
      );
      reloadUsers();
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
    reloadUsers();
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
      setPickedUsers([]);
      reloadUsers();
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
      setPickedUsers([]);
      reloadUsers();
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

      reloadUsers();
    } finally {
      setImportSubmitting(false);
    }
  };

  const previewImportUsers = async () => {
    const file = importFileList[0]?.originFileObj;

    if (!file) {
      message.warning(
        formatMessage(
          'pages.system.users.messages.selectImportFile',
          '请选择要导入的 CSV 或 XLSX 文件。',
        ),
      );
      return;
    }

    setImportPreviewing(true);
    try {
      const result = await previewOpenCoreUsersImport({
        contentBase64: await readFileAsDataUrl(
          file,
          formatMessage(
            'pages.system.users.messages.fileReadFailure',
            '文件读取失败。',
          ),
        ),
        updateExisting: importUpdateExisting,
      });
      setImportResult(result);
      message.success(formatImportSummary(result));
    } finally {
      setImportPreviewing(false);
    }
  };

  const columns: ProColumns<UserSummary>[] = [
    {
      title: formatMessage('pages.system.users.fields.username', '账号'),
      dataIndex: 'username',
      sorter: true,
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.username}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.system.users.fields.displayName', '显示名称'),
      dataIndex: 'displayName',
      sorter: true,
    },
    {
      title: formatMessage('pages.system.users.fields.mobile', '手机号'),
      dataIndex: 'mobile',
      sorter: true,
      responsive: ['lg'],
      render: (_, record) => record.mobile ?? '-',
    },
    {
      title: formatMessage('pages.system.users.fields.email', '邮箱'),
      dataIndex: 'email',
      sorter: true,
      responsive: ['xl'],
      render: (_, record) => record.email ?? '-',
    },
    {
      title: formatMessage('pages.system.users.fields.department', '部门'),
      dataIndex: 'deptId',
      search: false,
      render: (_, record) =>
        record.deptId ? (deptNames.get(record.deptId) ?? record.deptId) : '-',
    },
    {
      title: formatMessage('pages.system.users.fields.roles', '角色'),
      dataIndex: 'roleCode',
      valueType: 'select',
      fieldProps: {
        allowClear: true,
        options: roleOptions,
        showSearch: true,
        optionFilterProp: 'label',
      },
      render: (_, record) => (
        <Space wrap size={4}>
          {record.roleCodes.map((code) => (
            <Tag key={code}>{code}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: formatMessage('pages.system.users.fields.posts', '岗位'),
      dataIndex: 'postCode',
      valueType: 'select',
      hideInTable: false,
      fieldProps: {
        allowClear: true,
        options: postOptions,
        showSearch: true,
        optionFilterProp: 'label',
      },
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
      title: formatMessage('pages.system.users.fields.status', '状态'),
      dataIndex: 'enabled',
      valueType: 'select',
      valueEnum: {
        true: { text: statusLabels.enabled, status: 'Success' },
        false: { text: statusLabels.disabled, status: 'Error' },
      },
      width: 96,
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'red'}>
          {record.enabled ? statusLabels.enabled : statusLabels.disabled}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.system.users.fields.system', '账号类型'),
      dataIndex: 'system',
      search: false,
      width: 96,
      render: (_, record) => (
        <Tag color={record.system ? 'blue' : 'default'}>
          {record.system ? systemLabels.system : systemLabels.custom}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.system.users.fields.lastLoginAt', '最近登录'),
      dataIndex: 'lastLoginAt',
      search: false,
      responsive: ['xl'],
      render: (_, record) => record.lastLoginAt ?? '-',
    },
    {
      title: formatMessage('pages.system.users.actions.column', 'Actions'),
      valueType: 'option',
      width: 248,
      render: (_, record) => (
        <Space size="small">
          <Tooltip
            title={formatMessage('pages.system.users.actions.detail', 'Detail')}
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
                  record.enabled ? 'Disable {username}' : 'Enable {username}',
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
            okText={formatMessage(
              'pages.system.users.actions.delete',
              'Delete',
            )}
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
                  : formatMessage('pages.system.users.actions.delete', 'Delete')
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
              title={formatMessage(
                'pages.system.users.actions.reload',
                'Reload',
              )}
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.users.actions.reloadAria',
                  'Reload users',
                )}
                icon={<ReloadOutlined />}
                onClick={reloadUsers}
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
        <div
          data-opencore-system-users-live-table="true"
          style={usersTablePanelStyle}
        >
          <ProTable<UserSummary>
            actionRef={actionRef}
            rowKey="id"
            loading={loading}
            params={{ deptId: selectedDeptId }}
            request={async (params, sort) => {
              const query = createListUsersRequest(
                params as Record<string, unknown>,
                sort as Record<string, unknown>,
                selectedDeptId,
              );

              try {
                const page = await listOpenCoreUsers(query);
                setRows(page.list);
                setTotalRows(page.total);
                setCurrentQuery(query);
                setSelectedRowKeys((current) =>
                  current.filter((key) => {
                    const id = String(key);
                    const pageUser = page.list.find((user) => user.id === id);

                    if (pageUser) {
                      return !pageUser.system;
                    }

                    return pickedUsers.some(
                      (user) => user.id === id && !user.system,
                    );
                  }),
                );
                setLoadError(undefined);

                return {
                  data: [...page.list],
                  success: true,
                  total: page.total,
                };
              } catch (error: unknown) {
                setRows([]);
                setTotalRows(0);
                setLoadError(
                  error instanceof Error
                    ? error.message
                    : formatMessage(
                        'pages.system.users.load.failure',
                        '无法加载用户列表。',
                      ),
                );

                return {
                  data: [],
                  success: false,
                  total: 0,
                };
              }
            }}
            options={false}
            toolBarRender={() => [
              <Button
                disabled={selectedUserCount === 0}
                icon={<CheckCircleOutlined />}
                key="batch-enable"
                loading={batchAction === 'enable'}
                onClick={() => void batchSetUsersStatus(true)}
              >
                {formatMessage(
                  'pages.system.users.actions.enableSelected',
                  '启用已选',
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
                  '禁用已选',
                )}
              </Button>,
              <Popconfirm
                key="batch-delete"
                title={formatMessage(
                  'pages.system.users.confirm.deleteSelected',
                  '删除已选的 {count} 个用户？',
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
                    '删除已选',
                  )}
                </Button>
              </Popconfirm>,
              <UserPicker
                buttonText={formatMessage(
                  'pages.system.users.actions.pickUsers',
                  '选择用户',
                )}
                key="pick-users"
                onChange={(ids, users) => {
                  setSelectedRowKeys(ids);
                  setPickedUsers(users);
                }}
                selectedUsers={selectedUsersForPicker}
                title={formatMessage(
                  'pages.system.users.userPicker.title',
                  '选择用户',
                )}
                value={selectedUserIds}
              />,
              <Tooltip
                key="download-import-template"
                title={
                  canImportUsers
                    ? formatMessage(
                        'pages.system.users.actions.downloadImportTemplate',
                        '下载导入模板',
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
                    '下载导入模板',
                  )}
                </Button>
              </Tooltip>,
              <Tooltip
                key="import-users"
                title={
                  canImportUsers
                    ? formatMessage(
                        'pages.system.users.actions.importUsers',
                        '导入用户',
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
                    '导入用户',
                  )}
                </Button>
              </Tooltip>,
              <Button
                key="create"
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateForm}
              >
                {formatMessage('pages.system.users.actions.new', '新建')}
              </Button>,
              <Button
                key="refresh"
                icon={<ReloadOutlined />}
                onClick={reloadUsers}
              >
                {formatMessage('pages.system.users.actions.refresh', '刷新')}
              </Button>,
              <Tooltip
                key="download-user-excel-export"
                title={
                  canExportUsers
                    ? formatMessage(
                        'pages.system.users.actions.downloadExcel',
                        '下载 Excel 导出',
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
                    '下载 Excel',
                  )}
                </Button>
              </Tooltip>,
            ]}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              total: totalRows,
            }}
            columns={columns}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys, selectedRows) => {
                setSelectedRowKeys([...keys]);
                setPickedUsers(selectedRows);
              },
              getCheckboxProps: (record) => ({
                disabled: record.system,
                name: record.username,
              }),
              preserveSelectedRowKeys: true,
            }}
          />
        </div>
      </div>
      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={
          selectedDetail?.username ??
          formatMessage('pages.system.users.detail.title', 'User Detail')
        }
      />
      <Modal
        title={formatMessage('pages.system.users.import.title', '导入用户')}
        open={importOpen}
        data-opencore-system-users-import-modal="true"
        okText={formatMessage('pages.system.users.actions.import', '导入')}
        footer={[
          <Button key="cancel" onClick={() => setImportOpen(false)}>
            {formatMessage('pages.system.users.actions.cancel', '取消')}
          </Button>,
          <Button
            data-opencore-system-users-import-preview="true"
            key="preview"
            loading={importPreviewing}
            onClick={() => void previewImportUsers()}
          >
            {formatMessage('pages.system.users.actions.previewImport', '预检')}
          </Button>,
          <Button
            key="import"
            loading={importSubmitting}
            onClick={() => void submitImportUsers()}
            type="primary"
          >
            {formatMessage('pages.system.users.actions.import', '导入')}
          </Button>,
        ]}
        confirmLoading={importSubmitting}
        onCancel={() => setImportOpen(false)}
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
              '显示名称',
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
          <Form.Item
            label={formatMessage('pages.system.users.fields.mobile', '手机号')}
            name="mobile"
          >
            <Input maxLength={32} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.users.fields.email', '邮箱')}
            name="email"
            rules={[
              {
                type: 'email',
                message: formatMessage(
                  'pages.system.users.validation.emailInvalid',
                  '邮箱格式不正确。',
                ),
              },
            ]}
          >
            <Input maxLength={128} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.users.fields.gender', '性别')}
            name="gender"
          >
            <Select
              options={[
                {
                  label: formatMessage(
                    'pages.system.users.gender.unknown',
                    '未知',
                  ),
                  value: 'unknown',
                },
                {
                  label: formatMessage('pages.system.users.gender.male', '男'),
                  value: 'male',
                },
                {
                  label: formatMessage(
                    'pages.system.users.gender.female',
                    '女',
                  ),
                  value: 'female',
                },
              ]}
            />
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
            label={formatMessage('pages.system.users.fields.roles', '角色')}
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
              '部门',
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
            label={formatMessage('pages.system.users.fields.posts', '岗位')}
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
            label={formatMessage('pages.system.users.fields.enabled', '启用')}
            name="enabled"
            valuePropName="checked"
          >
            <Switch
              checkedChildren={statusLabels.enabled}
              unCheckedChildren={statusLabels.disabled}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.users.fields.remark', '备注')}
            name="remark"
          >
            <Input.TextArea maxLength={500} rows={3} showCount />
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
              '新密码',
            )}
            name="password"
          >
            <Input.Password
              autoComplete="new-password"
              maxLength={128}
              placeholder={formatMessage(
                'pages.system.users.resetPassword.autoGeneratePlaceholder',
                '留空自动生成临时密码',
              )}
            />
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

function createListUsersRequest(
  params: Record<string, unknown>,
  sort: Record<string, unknown>,
  deptId: string | undefined,
): ListUsersRequest {
  return removeUndefinedFields({
    ...toUserOrderQuery(sort),
    deptId,
    username: normalizeOptionalFormText(params.username),
    displayName: normalizeOptionalFormText(params.displayName),
    mobile: normalizeOptionalFormText(params.mobile),
    email: normalizeOptionalFormText(params.email),
    enabled: normalizeOptionalEnabled(params.enabled),
    roleCode: normalizeOptionalFormText(params.roleCode),
    postCode: normalizeOptionalFormText(params.postCode),
    page: normalizeOptionalNumber(params.current, 1),
    pageSize: normalizeOptionalNumber(params.pageSize, 10),
  });
}

function normalizeOptionalFormText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function normalizeNullableFormText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function normalizeOptionalEnabled(value: unknown): boolean | undefined {
  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return undefined;
}

function normalizeOptionalNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toUserOrderQuery(
  sort: Record<string, unknown>,
): Pick<ListUsersRequest, 'orderBy' | 'orderDirection'> {
  const sortableFields = new Set([
    'createdAt',
    'displayName',
    'email',
    'enabled',
    'mobile',
    'updatedAt',
    'username',
  ]);
  const sorted = Object.entries(sort).find(
    ([field, order]) =>
      sortableFields.has(field) && (order === 'ascend' || order === 'descend'),
  );

  if (!sorted) {
    return {};
  }

  return {
    orderBy: sorted[0],
    orderDirection: sorted[1] === 'descend' ? 'desc' : 'asc',
  };
}

function removeUndefinedFields<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter((entry) => entry[1] !== undefined),
  ) as T;
}

function formatGender(value: string | undefined): string | undefined {
  if (value === 'male') {
    return '男';
  }

  if (value === 'female') {
    return '女';
  }

  if (value === 'unknown') {
    return '未知';
  }

  return value;
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
