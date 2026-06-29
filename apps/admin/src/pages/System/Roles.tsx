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
import type {
  MenuSummary,
  PermissionSummary,
  RoleDataScope,
  RoleSummary,
  SystemDeptSummary,
  SystemDeptTreeSummary,
  UserOptionSummary,
  UserSummary,
} from '@opencore/sdk';
import { useIntl } from '@umijs/max';
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
  listOpenCoreUserOptions,
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

const searchFields: CurrentPageSearchField<RoleSummary>[] = [
  'code',
  'name',
  'dataScope',
  (record) => record.permissionCodes,
  (record) => record.dataScopeDeptIds,
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
  userOptions: readonly UserOptionSummary[],
  disabledLabel: string,
): UserTransferItem[] {
  const userById = new Map(users.map((user) => [user.id, user]));
  const userOptionById = new Map(userOptions.map((user) => [user.id, user]));

  return [...userById.values()]
    .sort((left, right) => left.username.localeCompare(right.username))
    .map((user) => {
      const option = userOptionById.get(user.id);
      const username = option?.username ?? user.username;
      const postCodes = option?.postCodes ?? user.postCodes;
      const posts = postCodes.length > 0 ? ` - ${postCodes.join(', ')}` : '';

      return {
        key: user.id,
        title: option?.displayName ?? user.displayName,
        description: `${username}${posts}${user.enabled ? '' : ` (${disabledLabel})`}`,
        disabled: user.system,
      };
    });
}

function normalizeTransferKeys(keys: readonly Key[]): string[] {
  return keys.map((key) => String(key)).sort();
}

export default function RolesPage() {
  const intl = useIntl();
  const [form] = Form.useForm<RoleFormValues>();
  const [rows, setRows] = useState<readonly RoleSummary[]>([]);
  const [permissionRows, setPermissionRows] = useState<
    readonly PermissionSummary[]
  >([]);
  const [menuRows, setMenuRows] = useState<readonly MenuSummary[]>([]);
  const [deptRows, setDeptRows] = useState<readonly SystemDeptSummary[]>([]);
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
  const formatMessage = (
    id: string,
    defaultMessage: string,
    values?: Record<string, number | string>,
  ) =>
    values
      ? intl.formatMessage({ id, defaultMessage }, values)
      : intl.formatMessage({ id, defaultMessage });
  const statusLabels = {
    disabled: formatMessage('pages.system.roles.status.disabled', 'Disabled'),
    enabled: formatMessage('pages.system.roles.status.enabled', 'Enabled'),
  };
  const systemLabels = {
    custom: formatMessage('pages.system.roles.system.custom', 'Custom'),
    system: formatMessage('pages.system.roles.system.system', 'System'),
  };
  const dataScopeLabels: Record<RoleDataScope, string> = {
    all: formatMessage('pages.system.roles.dataScope.all', 'All data'),
    custom: formatMessage(
      'pages.system.roles.dataScope.custom',
      'Custom departments',
    ),
    dept_tree: formatMessage(
      'pages.system.roles.dataScope.deptTree',
      'Department tree',
    ),
    own_dept: formatMessage(
      'pages.system.roles.dataScope.ownDept',
      'Own department',
    ),
    self: formatMessage('pages.system.roles.dataScope.self', 'Self only'),
  };
  const dataScopeOptions = Object.entries(dataScopeLabels).map(
    ([value, label]) => ({
      label,
      value,
    }),
  ) as { label: string; value: RoleDataScope }[];
  const filterOptions: CurrentPageFilterOption<RoleSummary>[] = [
    {
      key: 'system',
      options: [
        { label: systemLabels.system, value: 'true' },
        { label: systemLabels.custom, value: 'false' },
      ],
      placeholder: formatMessage('pages.system.roles.filters.system', 'System'),
      predicate: (record, value) => record.system === (value === 'true'),
    },
    {
      key: 'enabled',
      options: [
        { label: statusLabels.enabled, value: 'true' },
        { label: statusLabels.disabled, value: 'false' },
      ],
      placeholder: formatMessage('pages.system.roles.filters.status', 'Status'),
      predicate: (record, value) => record.enabled === (value === 'true'),
    },
    {
      key: 'dataScope',
      options: dataScopeOptions,
      placeholder: formatMessage(
        'pages.system.roles.filters.dataScope',
        'Data scope',
      ),
      predicate: (record, value) => record.dataScope === value,
    },
  ];
  const exportColumns: CurrentPageExportColumn<RoleSummary>[] = [
    {
      title: formatMessage('pages.system.roles.fields.id', 'ID'),
      dataIndex: 'id',
    },
    {
      title: formatMessage('pages.system.roles.fields.code', 'Code'),
      dataIndex: 'code',
    },
    {
      title: formatMessage('pages.system.roles.fields.name', 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage('pages.system.roles.fields.enabled', 'Enabled'),
      renderText: (record) =>
        record.enabled ? statusLabels.enabled : statusLabels.disabled,
    },
    {
      title: formatMessage(
        'pages.system.roles.fields.permissionCount',
        'Permission Count',
      ),
      renderText: (record) => record.permissionCodes.length,
    },
    {
      title: formatMessage('pages.system.roles.fields.system', 'System'),
      renderText: (record) =>
        record.system ? systemLabels.system : systemLabels.custom,
    },
    {
      title: formatMessage('pages.system.roles.fields.dataScope', 'Data Scope'),
      renderText: (record) => dataScopeLabels[record.dataScope],
    },
    {
      title: formatMessage(
        'pages.system.roles.fields.dataScopeDeptIds',
        'Data Scope Dept IDs',
      ),
      renderText: (record) => record.dataScopeDeptIds.join(', '),
    },
  ];
  const createDetailFields = (record: RoleSummary): DetailField[] => [
    {
      label: formatMessage('pages.system.roles.fields.id', 'ID'),
      value: record.id,
    },
    {
      label: formatMessage('pages.system.roles.fields.code', 'Code'),
      value: record.code,
    },
    {
      label: formatMessage('pages.system.roles.fields.name', 'Name'),
      value: record.name,
    },
    {
      label: formatMessage('pages.system.roles.fields.status', 'Status'),
      value: record.enabled ? statusLabels.enabled : statusLabels.disabled,
    },
    {
      label: formatMessage('pages.system.roles.fields.system', 'System'),
      value: record.system ? systemLabels.system : systemLabels.custom,
    },
    {
      label: formatMessage('pages.system.roles.fields.dataScope', 'Data Scope'),
      value: dataScopeLabels[record.dataScope],
    },
    {
      label: formatMessage(
        'pages.system.roles.fields.dataScopeDepartments',
        'Data Scope Departments',
      ),
      value:
        record.dataScopeDeptIds.length > 0
          ? record.dataScopeDeptIds
              .map((deptId) => deptNames.get(deptId) ?? deptId)
              .join(', ')
          : undefined,
    },
    {
      label: formatMessage(
        'pages.system.roles.fields.permissionCount',
        'Permission Count',
      ),
      value: record.permissionCodes.length,
    },
  ];
  const createDetailJsonSections = (
    record: RoleSummary,
  ): DetailJsonSection[] => [
    {
      title: formatMessage(
        'pages.system.roles.fields.permissionCodes',
        'Permission Codes',
      ),
      value: record.permissionCodes,
    },
    {
      title: formatMessage(
        'pages.system.roles.fields.dataScopeDeptIds',
        'Data Scope Dept IDs',
      ),
      value: record.dataScopeDeptIds,
    },
  ];
  const formatRevokedSessions = (count: number | undefined) =>
    formatMessage(
      'pages.system.roles.messages.revokedSessions',
      'Revoked sessions: {count}.',
      { count: count ?? 0 },
    );
  const formatActiveSessionsRevoked = (count: number) =>
    formatMessage(
      'pages.system.roles.messages.activeSessionsRevoked',
      '{count} active session(s) revoked.',
      { count },
    );
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
      searchPlaceholder: formatMessage(
        'pages.system.roles.search.placeholder',
        'Search roles',
      ),
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
      setRows([]);
      setDeptRows([]);
      setPermissionRows([]);
      setMenuRows([]);
      setSelectedDetail(undefined);
      setEditingRole(undefined);
      setAssigningMenuRole(undefined);
      setAssigningUserRole(undefined);
      setCheckedMenuKeys([]);
      setAssignedUserIds([]);
      setUserTransferItems([]);
      setFormOpen(false);
      setMenuAssignmentOpen(false);
      setUserAssignmentOpen(false);
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.roles.load.failure',
              'Unable to load live roles.',
            ),
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
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.roles.open.failure',
              'Unable to open role.',
            ),
      );
    }
  };

  const openDetail = async (record: RoleSummary) => {
    try {
      setSelectedDetail(await getOpenCoreRole(record.code));
    } catch (error: unknown) {
      setSelectedDetail(undefined);
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.roles.detail.loadFailure',
              'Unable to load live role detail.',
            ),
      );
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
          : formatMessage(
              'pages.system.roles.menuAssignment.openFailure',
              'Unable to open role menu assignment.',
            ),
      );
    }
  };

  const openUserAssignment = async (record: RoleSummary) => {
    try {
      const [assignment, userOptions] = await Promise.all([
        getOpenCoreRoleUserAssignment(record.code),
        listOpenCoreUserOptions(),
      ]);
      setAssigningUserRole(record);
      setAssignedUserIds([...assignment.assignedUserIds]);
      setUserTransferItems(
        createUserTransferItems(
          [...assignment.assignedUsers, ...assignment.availableUsers],
          userOptions,
          statusLabels.disabled,
        ),
      );
      setUserAssignmentOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.roles.userAssignment.openFailure',
              'Unable to open role user assignment.',
            ),
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
          formatMessage(
            'pages.system.roles.messages.updated',
            'Role updated. {revokedSessions}',
            {
              revokedSessions: formatRevokedSessions(role.revokedSessionCount),
            },
          ),
        );
      } else {
        await createOpenCoreRole({
          code: values.code,
          dataScope: values.dataScope,
          dataScopeDeptIds,
          name: values.name,
          permissionCodes: values.permissionCodes ?? [],
        });
        message.success(
          formatMessage('pages.system.roles.messages.created', 'Role created.'),
        );
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
      formatMessage(
        'pages.system.roles.messages.deleted',
        'Role deleted. {revokedSessions}',
        { revokedSessions: formatRevokedSessions(result.revokedSessionCount) },
      ),
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
        formatMessage(
          role.enabled
            ? 'pages.system.roles.messages.enabled'
            : 'pages.system.roles.messages.disabled',
          role.enabled
            ? 'Role enabled. {revokedSessions}'
            : 'Role disabled. {revokedSessions}',
          { revokedSessions: formatRevokedSessions(role.revokedSessionCount) },
        ),
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
          ? formatMessage(
              'pages.system.roles.menuAssignment.messages.updatedWithRevoked',
              'Role menus updated. {revokedSessions}',
              { revokedSessions: formatActiveSessionsRevoked(revoked) },
            )
          : formatMessage(
              'pages.system.roles.menuAssignment.messages.updated',
              'Role menus updated.',
            ),
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
          ? formatMessage(
              'pages.system.roles.userAssignment.messages.updatedWithRevoked',
              'Role users updated. {revokedSessions}',
              { revokedSessions: formatActiveSessionsRevoked(revoked) },
            )
          : formatMessage(
              'pages.system.roles.userAssignment.messages.updated',
              'Role users updated.',
            ),
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
      title: formatMessage('pages.system.roles.fields.name', 'Name'),
      dataIndex: 'name',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.name}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.system.roles.fields.code', 'Code'),
      dataIndex: 'code',
    },
    {
      title: formatMessage(
        'pages.system.roles.fields.permissions',
        'Permissions',
      ),
      dataIndex: 'permissionCodes',
      render: (_, record) =>
        record.permissionCodes.length > 4 ? (
          <Typography.Text>
            {formatMessage(
              'pages.system.roles.permissions.count',
              '{count} permissions',
              { count: record.permissionCodes.length },
            )}
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
      title: formatMessage('pages.system.roles.fields.dataScope', 'Data Scope'),
      dataIndex: 'dataScope',
      render: (_, record) => <Tag>{dataScopeLabels[record.dataScope]}</Tag>,
    },
    {
      title: formatMessage('pages.system.roles.fields.status', 'Status'),
      dataIndex: 'enabled',
      width: 104,
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? statusLabels.enabled : statusLabels.disabled}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.system.roles.fields.system', 'System'),
      dataIndex: 'system',
      width: 96,
      render: (_, record) => (
        <Tag color={record.system ? 'blue' : 'default'}>
          {record.system ? systemLabels.system : systemLabels.custom}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.system.roles.actions.column', 'Actions'),
      valueType: 'option',
      width: 264,
      render: (_, record) => (
        <Space size="small">
          <Tooltip
            title={formatMessage('pages.system.roles.actions.detail', 'Detail')}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.roles.actions.viewAria',
                'View {name}',
                { name: record.name },
              )}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={formatMessage('pages.system.roles.actions.edit', 'Edit')}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.roles.actions.editAria',
                'Edit {name}',
                { name: record.name },
              )}
              icon={<EditOutlined />}
              onClick={() => void openEditForm(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={formatMessage(
              'pages.system.roles.actions.menuAssignment',
              'Menu Assignment',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.roles.actions.menuAssignmentAria',
                'Assign menus for {name}',
                { name: record.name },
              )}
              icon={<ApartmentOutlined />}
              onClick={() => void openMenuAssignment(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={formatMessage(
              'pages.system.roles.actions.userAssignment',
              'User Assignment',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.roles.actions.userAssignmentAria',
                'Assign users for {name}',
                { name: record.name },
              )}
              icon={<TeamOutlined />}
              onClick={() => void openUserAssignment(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title={
              record.enabled
                ? formatMessage(
                    'pages.system.roles.confirm.disable',
                    'Disable this role?',
                  )
                : formatMessage(
                    'pages.system.roles.confirm.enable',
                    'Enable this role?',
                  )
            }
            okText={
              record.enabled
                ? formatMessage('pages.system.roles.actions.disable', 'Disable')
                : formatMessage('pages.system.roles.actions.enable', 'Enable')
            }
            okButtonProps={{ danger: record.enabled }}
            onConfirm={() => void toggleRoleStatus(record)}
          >
            <Tooltip
              title={
                record.system
                  ? formatMessage(
                      'pages.system.roles.actions.systemDisableLocked',
                      'System roles cannot be disabled',
                    )
                  : record.enabled
                    ? formatMessage(
                        'pages.system.roles.actions.disable',
                        'Disable',
                      )
                    : formatMessage(
                        'pages.system.roles.actions.enable',
                        'Enable',
                      )
              }
            >
              <Button
                aria-label={
                  record.enabled
                    ? formatMessage(
                        'pages.system.roles.actions.disableAria',
                        'Disable {name}',
                        { name: record.name },
                      )
                    : formatMessage(
                        'pages.system.roles.actions.enableAria',
                        'Enable {name}',
                        { name: record.name },
                      )
                }
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
            title={formatMessage(
              'pages.system.roles.confirm.deleteOne',
              'Delete this role?',
            )}
            okText={formatMessage(
              'pages.system.roles.actions.delete',
              'Delete',
            )}
            okButtonProps={{ danger: true }}
            onConfirm={() => void deleteRole(record)}
          >
            <Tooltip
              title={
                record.system
                  ? formatMessage(
                      'pages.system.roles.actions.systemDeleteLocked',
                      'System roles cannot be deleted',
                    )
                  : formatMessage('pages.system.roles.actions.delete', 'Delete')
              }
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.roles.actions.deleteAria',
                  'Delete {name}',
                  { name: record.name },
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
      title={formatMessage('menu.system.roles', 'Roles')}
      subTitle={formatMessage('pages.system.rbac.section', 'Access Control')}
    >
      {loadError ? (
        <Alert
          showIcon
          type="error"
          message={formatMessage(
            'pages.system.roles.load.liveFailure',
            'Unable to load live roles',
          )}
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
            {formatMessage('pages.system.roles.actions.new', 'New')}
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => void loadRoles()}
          >
            {formatMessage('pages.system.roles.actions.refresh', 'Refresh')}
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
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
        jsonSections={
          selectedDetail ? createDetailJsonSections(selectedDetail) : []
        }
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={
          selectedDetail?.name ??
          formatMessage('pages.system.roles.detail.title', 'Role Detail')
        }
      />
      <Modal
        title={
          editingRole
            ? formatMessage('pages.system.roles.form.editTitle', 'Edit Role')
            : formatMessage('pages.system.roles.form.createTitle', 'New Role')
        }
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingRole(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={
          editingRole
            ? formatMessage('pages.system.roles.actions.save', 'Save')
            : formatMessage('pages.system.roles.actions.create', 'Create')
        }
        width={720}
      >
        <Form<RoleFormValues> form={form} layout="vertical">
          <Form.Item
            label={formatMessage('pages.system.roles.fields.code', 'Code')}
            name="code"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.roles.validation.codeRequired',
                  'Code is required.',
                ),
              },
            ]}
          >
            <Input disabled={Boolean(editingRole)} maxLength={96} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.roles.fields.name', 'Name')}
            name="name"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.roles.validation.nameRequired',
                  'Name is required.',
                ),
              },
            ]}
          >
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.roles.fields.permissions',
              'Permissions',
            )}
            name="permissionCodes"
            rules={[{ type: 'array' }]}
          >
            <Select
              allowClear
              mode="multiple"
              optionFilterProp="label"
              options={permissionOptions}
              placeholder={formatMessage(
                'pages.system.roles.placeholders.permissions',
                'Select permissions',
              )}
              showSearch
            />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.roles.fields.dataScope',
              'Data Scope',
            )}
            name="dataScope"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.roles.validation.dataScopeRequired',
                  'Data scope is required.',
                ),
              },
            ]}
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
            label={formatMessage(
              'pages.system.roles.fields.dataScopeDepartments',
              'Data Scope Departments',
            )}
            name="dataScopeDeptIds"
            rules={[
              {
                required: isCustomDataScope,
                message: formatMessage(
                  'pages.system.roles.validation.customDataScopeDepartmentsRequired',
                  'Custom data scope requires at least one department.',
                ),
              },
            ]}
          >
            <Select
              allowClear
              disabled={!isCustomDataScope}
              mode="multiple"
              optionFilterProp="label"
              options={deptOptions}
              placeholder={formatMessage(
                'pages.system.roles.placeholders.departments',
                'Select departments',
              )}
              showSearch
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={
          assigningMenuRole
            ? formatMessage(
                'pages.system.roles.menuAssignment.titleForRole',
                'Menu Assignment - {name}',
                { name: assigningMenuRole.name },
              )
            : formatMessage(
                'pages.system.roles.menuAssignment.title',
                'Menu Assignment',
              )
        }
        open={menuAssignmentOpen}
        onCancel={() => {
          setMenuAssignmentOpen(false);
          setAssigningMenuRole(undefined);
          setCheckedMenuKeys([]);
        }}
        onOk={() => void submitMenuAssignment()}
        confirmLoading={menuAssignmentSubmitting}
        okText={formatMessage('pages.system.roles.actions.save', 'Save')}
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
            {formatMessage(
              'pages.system.roles.menuAssignment.empty',
              'No menus available.',
            )}
          </Typography.Text>
        )}
      </Modal>
      <Modal
        title={
          assigningUserRole
            ? formatMessage(
                'pages.system.roles.userAssignment.titleForRole',
                'User Assignment - {name}',
                { name: assigningUserRole.name },
              )
            : formatMessage(
                'pages.system.roles.userAssignment.title',
                'User Assignment',
              )
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
        okText={formatMessage('pages.system.roles.actions.save', 'Save')}
        width={820}
      >
        <Transfer
          dataSource={[...userTransferItems]}
          titles={[
            formatMessage(
              'pages.system.roles.userAssignment.availableUsers',
              'Available users',
            ),
            formatMessage(
              'pages.system.roles.userAssignment.assignedUsers',
              'Assigned users',
            ),
          ]}
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
