import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import type {
  MenuStatus,
  MenuSummary,
  MenuType,
  PermissionSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  TreeSelect,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  createOpenCoreMenu,
  deleteOpenCoreMenu,
  getOpenCoreMenu,
  listOpenCorePermissions,
  listOpenCoreMenus,
  updateOpenCoreMenu,
} from '@/services/opencore/platform';
import {
  CurrentPageExportButton,
  type CurrentPageExportColumn,
} from '../shared/CurrentPageExportButton';
import {
  createCurrentPageFilterOptions,
  useCurrentPageFilters,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../shared/CurrentPageFilters';
import {
  ReadOnlyDetailDrawer,
  type DetailField,
} from '../shared/ReadOnlyDetailDrawer';

type MenuFormValues = {
  cache?: boolean;
  component?: string;
  hidden?: boolean;
  icon?: string;
  key: string;
  order?: number;
  parentKey?: string;
  path: string;
  permissionCode?: string;
  status?: MenuStatus;
  title: string;
  type?: MenuType;
};

type MenuTreeNode = MenuSummary & {
  children: MenuTreeNode[];
};

type TreeSelectNode = {
  children?: TreeSelectNode[];
  title: string;
  value: string;
};

const searchFields: CurrentPageSearchField<MenuSummary>[] = [
  'key',
  'title',
  'path',
  'parentKey',
  'permissionCode',
  'stage',
  'component',
  'icon',
];
function flattenMenuTree(rows: readonly MenuTreeNode[]): MenuSummary[] {
  return rows.flatMap((row) => [
    withoutChildren(row),
    ...flattenMenuTree(row.children),
  ]);
}

function buildMenuTree(rows: readonly MenuSummary[]): MenuTreeNode[] {
  const nodes = new Map<string, MenuTreeNode>();
  const roots: MenuTreeNode[] = [];

  for (const row of [...rows].sort(compareMenuRows)) {
    nodes.set(row.key, { ...row, children: [] });
  }

  for (const node of nodes.values()) {
    if (node.parentKey && nodes.has(node.parentKey)) {
      nodes.get(node.parentKey)?.children.push(node);
      continue;
    }
    roots.push(node);
  }

  return roots;
}

function compareMenuRows(left: MenuSummary, right: MenuSummary): number {
  return left.order - right.order || left.key.localeCompare(right.key);
}

function withoutChildren(row: MenuTreeNode): MenuSummary {
  const { children: _children, ...summary } = row;
  return summary;
}

function createParentTitleMap(rows: readonly MenuSummary[]) {
  return new Map(rows.map((row) => [row.key, row.title]));
}

function findMenuNode(
  rows: readonly MenuTreeNode[],
  key: string,
): MenuTreeNode | undefined {
  for (const row of rows) {
    if (row.key === key) {
      return row;
    }

    const child = findMenuNode(row.children, key);
    if (child) {
      return child;
    }
  }

  return undefined;
}

function collectDescendantKeys(row: MenuTreeNode): Set<string> {
  const keys = new Set<string>([row.key]);
  for (const child of row.children) {
    for (const key of collectDescendantKeys(child)) {
      keys.add(key);
    }
  }
  return keys;
}

function toTreeSelectData(
  rows: readonly MenuTreeNode[],
  excludedKeys = new Set<string>(),
): TreeSelectNode[] {
  return rows
    .filter((row) => !excludedKeys.has(row.key))
    .map((row) => ({
      title: row.title,
      value: row.key,
      children: toTreeSelectData(row.children, excludedKeys),
    }));
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function createChildPath(parent: MenuSummary): string {
  return `${parent.path.replace(/\/+$/, '')}/`;
}

export default function MenusPage() {
  const intl = useIntl();
  const [form] = Form.useForm<MenuFormValues>();
  const [rows, setRows] = useState<readonly MenuSummary[]>([]);
  const [permissionRows, setPermissionRows] = useState<
    readonly PermissionSummary[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<MenuSummary>();
  const [editingMenu, setEditingMenu] = useState<MenuSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const treeRows = useMemo(() => buildMenuTree(rows), [rows]);
  const flatRows = useMemo(() => flattenMenuTree(treeRows), [treeRows]);
  const parentTitles = useMemo(
    () => createParentTitleMap(flatRows),
    [flatRows],
  );
  const excludedParentKeys = useMemo(() => {
    if (!editingMenu) {
      return new Set<string>();
    }

    const editingNode = findMenuNode(treeRows, editingMenu.key);
    return editingNode ? collectDescendantKeys(editingNode) : new Set<string>();
  }, [editingMenu, treeRows]);
  const parentTreeData = useMemo(
    () => toTreeSelectData(treeRows, excludedParentKeys),
    [excludedParentKeys, treeRows],
  );
  const permissionOptions = useMemo(
    () => createPermissionOptions(permissionRows, flatRows),
    [flatRows, permissionRows],
  );
  const formatMessage = (
    id: string,
    defaultMessage: string,
    values?: Record<string, number | string>,
  ) =>
    values
      ? intl.formatMessage({ id, defaultMessage }, values)
      : intl.formatMessage({ id, defaultMessage });
  const menuTypeLabels: Record<MenuType, string> = {
    directory: formatMessage('pages.system.menus.type.directory', 'directory'),
    menu: formatMessage('pages.system.menus.type.menu', 'menu'),
  };
  const menuStatusLabels: Record<MenuStatus, string> = {
    disabled: formatMessage('pages.system.menus.status.disabled', 'disabled'),
    enabled: formatMessage('pages.system.menus.status.enabled', 'enabled'),
  };
  const menuTypeOptions = (
    Object.entries(menuTypeLabels) as Array<[MenuType, string]>
  ).map(([value, label]) => ({ label, value }));
  const menuStatusOptions = (
    Object.entries(menuStatusLabels) as Array<[MenuStatus, string]>
  ).map(([value, label]) => ({ label, value }));
  const rootLabel = formatMessage('pages.system.menus.parent.root', 'Root');
  const unboundLabel = formatMessage(
    'pages.system.menus.permission.unbound',
    'Unbound',
  );
  const cacheLabels = {
    cache: formatMessage('pages.system.menus.cache.cache', 'cache'),
    none: formatMessage('pages.system.menus.cache.none', 'none'),
    noCache: formatMessage('pages.system.menus.cache.noCache', 'no cache'),
  };
  const hiddenLabels = {
    hidden: formatMessage('pages.system.menus.hidden.hidden', 'hidden'),
    visible: formatMessage('pages.system.menus.hidden.visible', 'visible'),
  };
  const exportColumns: CurrentPageExportColumn<MenuSummary>[] = [
    {
      title: formatMessage('pages.system.menus.fields.key', 'Key'),
      dataIndex: 'key',
    },
    {
      title: formatMessage('pages.system.menus.fields.parent', 'Parent'),
      renderText: (record) =>
        record.parentKey
          ? (parentTitles.get(record.parentKey) ?? record.parentKey)
          : rootLabel,
    },
    {
      title: formatMessage('pages.system.menus.fields.title', 'Title'),
      dataIndex: 'title',
    },
    {
      title: formatMessage('pages.system.menus.fields.type', 'Type'),
      renderText: (record) => menuTypeLabels[record.type],
    },
    {
      title: formatMessage('pages.system.menus.fields.path', 'Path'),
      dataIndex: 'path',
    },
    {
      title: formatMessage('pages.system.menus.fields.icon', 'Icon'),
      dataIndex: 'icon',
    },
    {
      title: formatMessage('pages.system.menus.fields.component', 'Component'),
      dataIndex: 'component',
    },
    {
      title: formatMessage(
        'pages.system.menus.fields.permission',
        'Permission',
      ),
      dataIndex: 'permissionCode',
    },
    {
      title: formatMessage('pages.system.menus.fields.stage', 'Stage'),
      dataIndex: 'stage',
    },
    {
      title: formatMessage('pages.system.menus.fields.order', 'Order'),
      dataIndex: 'order',
    },
    {
      title: formatMessage('pages.system.menus.fields.status', 'Status'),
      renderText: (record) => menuStatusLabels[record.status],
    },
    {
      title: formatMessage('pages.system.menus.fields.cache', 'Cache'),
      renderText: (record) =>
        record.cache ? cacheLabels.cache : cacheLabels.none,
    },
    {
      title: formatMessage('pages.system.menus.fields.hidden', 'Hidden'),
      renderText: (record) =>
        record.hidden ? hiddenLabels.hidden : hiddenLabels.visible,
    },
  ];
  const createDetailFields = (record: MenuSummary): DetailField[] => [
    {
      label: formatMessage('pages.system.menus.fields.key', 'Key'),
      value: record.key,
    },
    {
      label: formatMessage('pages.system.menus.fields.parent', 'Parent'),
      value: record.parentKey
        ? (parentTitles.get(record.parentKey) ?? record.parentKey)
        : rootLabel,
    },
    {
      label: formatMessage('pages.system.menus.fields.title', 'Title'),
      value: record.title,
    },
    {
      label: formatMessage('pages.system.menus.fields.type', 'Type'),
      value: menuTypeLabels[record.type],
    },
    {
      label: formatMessage('pages.system.menus.fields.path', 'Path'),
      value: record.path,
    },
    {
      label: formatMessage('pages.system.menus.fields.icon', 'Icon'),
      value: record.icon,
    },
    {
      label: formatMessage('pages.system.menus.fields.component', 'Component'),
      value: record.component,
    },
    {
      label: formatMessage(
        'pages.system.menus.fields.permission',
        'Permission',
      ),
      value: record.permissionCode,
    },
    {
      label: formatMessage('pages.system.menus.fields.stage', 'Stage'),
      value: record.stage,
    },
    {
      label: formatMessage('pages.system.menus.fields.order', 'Order'),
      value: record.order,
    },
    {
      label: formatMessage('pages.system.menus.fields.status', 'Status'),
      value: menuStatusLabels[record.status],
    },
    {
      label: formatMessage('pages.system.menus.fields.cache', 'Cache'),
      value: record.cache ? cacheLabels.cache : cacheLabels.noCache,
    },
    {
      label: formatMessage('pages.system.menus.fields.hidden', 'Hidden'),
      value: record.hidden ? hiddenLabels.hidden : hiddenLabels.visible,
    },
  ];
  const filterOptions = useMemo<CurrentPageFilterOption<MenuSummary>[]>(
    () => [
      {
        key: 'type',
        options: menuTypeOptions,
        placeholder: formatMessage('pages.system.menus.filters.type', 'Type'),
        predicate: (record, value) => record.type === value,
      },
      {
        key: 'status',
        options: menuStatusOptions,
        placeholder: formatMessage(
          'pages.system.menus.filters.status',
          'Status',
        ),
        predicate: (record, value) => record.status === value,
      },
      {
        key: 'stage',
        options: createCurrentPageFilterOptions(flatRows, 'stage'),
        placeholder: formatMessage('pages.system.menus.filters.stage', 'Stage'),
        predicate: (record, value) => record.stage === value,
      },
    ],
    [flatRows, menuStatusOptions, menuTypeOptions],
  );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<MenuSummary>({
      rows: flatRows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.system.menus.search.placeholder',
        'Search menus',
      ),
      selectFilters: filterOptions,
    });
  const filteredTreeRows = useMemo(
    () => buildMenuTree(filteredRows),
    [filteredRows],
  );

  const loadMenus = async () => {
    setLoading(true);
    try {
      const [menuRows, permissionRows] = await Promise.all([
        listOpenCoreMenus(),
        listOpenCorePermissions(),
      ]);
      setRows(menuRows);
      setPermissionRows(permissionRows);
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setPermissionRows([]);
      setSelectedDetail(undefined);
      setEditingMenu(undefined);
      setFormOpen(false);
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.menus.load.failure',
              'Unable to load live menus.',
            ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMenus();
  }, []);

  const openCreateForm = (parent?: MenuSummary) => {
    setEditingMenu(undefined);
    form.setFieldsValue({
      cache: false,
      component: undefined,
      hidden: false,
      icon: undefined,
      key: parent ? `${parent.key}.` : '',
      order: parent ? parent.order + 1 : 0,
      parentKey: parent?.key,
      path: parent ? createChildPath(parent) : '',
      permissionCode: undefined,
      status: 'enabled',
      title: '',
      type: 'menu',
    });
    setFormOpen(true);
  };

  const openEditForm = async (record: MenuSummary) => {
    try {
      const fresh = await getOpenCoreMenu(record.key);
      setEditingMenu(fresh);
      form.setFieldsValue({
        cache: fresh.cache,
        component: fresh.component,
        hidden: fresh.hidden,
        icon: fresh.icon,
        key: fresh.key,
        order: fresh.order,
        parentKey: fresh.parentKey,
        path: fresh.path,
        permissionCode: fresh.permissionCode,
        status: fresh.status,
        title: fresh.title,
        type: fresh.type,
      });
      setFormOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.menus.open.failure',
              'Unable to open menu.',
            ),
      );
    }
  };

  const openDetail = async (record: MenuSummary) => {
    try {
      setSelectedDetail(await getOpenCoreMenu(record.key));
    } catch (error: unknown) {
      setSelectedDetail(undefined);
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.menus.detail.loadFailure',
              'Unable to load live menu detail.',
            ),
      );
    }
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editingMenu) {
        await updateOpenCoreMenu(editingMenu.key, {
          cache: Boolean(values.cache),
          component: normalizeOptionalText(values.component) ?? null,
          hidden: Boolean(values.hidden),
          icon: normalizeOptionalText(values.icon) ?? null,
          order: values.order,
          parentKey: values.parentKey ?? null,
          path: values.path,
          permissionCode: values.permissionCode ?? null,
          status: values.status ?? 'enabled',
          title: values.title,
          type: values.type ?? 'menu',
        });
        message.success(
          formatMessage('pages.system.menus.messages.updated', 'Menu updated.'),
        );
      } else {
        await createOpenCoreMenu({
          cache: Boolean(values.cache),
          component: normalizeOptionalText(values.component),
          hidden: Boolean(values.hidden),
          icon: normalizeOptionalText(values.icon),
          key: values.key,
          order: values.order ?? 0,
          parentKey: values.parentKey,
          path: values.path,
          permissionCode: values.permissionCode,
          status: values.status ?? 'enabled',
          title: values.title,
          type: values.type ?? 'menu',
        });
        message.success(
          formatMessage('pages.system.menus.messages.created', 'Menu created.'),
        );
      }
      setFormOpen(false);
      setEditingMenu(undefined);
      await loadMenus();
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMenu = async (record: MenuSummary) => {
    await deleteOpenCoreMenu(record.key);
    message.success(
      formatMessage('pages.system.menus.messages.deleted', 'Menu deleted.'),
    );
    await loadMenus();
  };

  const columns: ProColumns<MenuSummary>[] = [
    {
      title: formatMessage('pages.system.menus.fields.title', 'Title'),
      dataIndex: 'title',
      render: (_, record) => (
        <Space size={8}>
          <Typography.Link onClick={() => void openDetail(record)}>
            {record.title}
          </Typography.Link>
          {record.icon ? <Tag>{record.icon}</Tag> : null}
        </Space>
      ),
    },
    {
      title: formatMessage('pages.system.menus.fields.key', 'Key'),
      dataIndex: 'key',
      ellipsis: true,
    },
    {
      title: formatMessage('pages.system.menus.fields.type', 'Type'),
      dataIndex: 'type',
      width: 104,
      render: (_, record) => (
        <Tag color={record.type === 'directory' ? 'purple' : 'blue'}>
          {menuTypeLabels[record.type]}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.system.menus.fields.parent', 'Parent'),
      dataIndex: 'parentKey',
      ellipsis: true,
      render: (_, record) =>
        record.parentKey ? (
          (parentTitles.get(record.parentKey) ?? record.parentKey)
        ) : (
          <Tag>{rootLabel}</Tag>
        ),
    },
    {
      title: formatMessage('pages.system.menus.fields.path', 'Path'),
      dataIndex: 'path',
      ellipsis: true,
    },
    {
      title: formatMessage('pages.system.menus.fields.component', 'Component'),
      dataIndex: 'component',
      ellipsis: true,
    },
    {
      title: formatMessage(
        'pages.system.menus.fields.permission',
        'Permission',
      ),
      dataIndex: 'permissionCode',
      ellipsis: true,
      render: (_, record) =>
        record.permissionCode ? (
          <Tag color="blue">{record.permissionCode}</Tag>
        ) : (
          <Tag>{unboundLabel}</Tag>
        ),
    },
    {
      title: formatMessage('pages.system.menus.fields.status', 'Status'),
      dataIndex: 'status',
      width: 104,
      render: (_, record) => (
        <Tag color={record.status === 'enabled' ? 'green' : 'default'}>
          {menuStatusLabels[record.status]}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.system.menus.fields.cache', 'Cache'),
      dataIndex: 'cache',
      width: 88,
      render: (_, record) => (
        <Tag>{record.cache ? cacheLabels.cache : cacheLabels.none}</Tag>
      ),
    },
    {
      title: formatMessage('pages.system.menus.fields.hidden', 'Hidden'),
      dataIndex: 'hidden',
      width: 88,
      render: (_, record) => (
        <Tag>{record.hidden ? hiddenLabels.hidden : hiddenLabels.visible}</Tag>
      ),
    },
    {
      title: formatMessage('pages.system.menus.fields.order', 'Order'),
      dataIndex: 'order',
      width: 88,
    },
    {
      title: formatMessage('pages.system.menus.actions.column', 'Actions'),
      valueType: 'option',
      width: 232,
      render: (_, record) => (
        <Space size="small">
          <Tooltip
            title={formatMessage('pages.system.menus.actions.detail', 'Detail')}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.menus.actions.viewAria',
                'View {title}',
                { title: record.title },
              )}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={formatMessage(
              'pages.system.menus.actions.addChild',
              'Add child',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.menus.actions.addChildAria',
                'Add child menu under {title}',
                { title: record.title },
              )}
              icon={<PlusOutlined />}
              onClick={() => openCreateForm(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={formatMessage('pages.system.menus.actions.edit', 'Edit')}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.menus.actions.editAria',
                'Edit {title}',
                { title: record.title },
              )}
              icon={<EditOutlined />}
              onClick={() => void openEditForm(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title={formatMessage(
              'pages.system.menus.confirm.deleteOne',
              'Delete this menu?',
            )}
            okText={formatMessage(
              'pages.system.menus.actions.delete',
              'Delete',
            )}
            okButtonProps={{ danger: true }}
            onConfirm={() => void deleteMenu(record)}
          >
            <Tooltip
              title={formatMessage(
                'pages.system.menus.actions.delete',
                'Delete',
              )}
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.menus.actions.deleteAria',
                  'Delete {title}',
                  { title: record.title },
                )}
                danger
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
      title={formatMessage('pages.system.menus.title', 'Menus')}
      subTitle={formatMessage('pages.system.rbac.section', 'Access Control')}
    >
      {loadError ? (
        <Alert
          showIcon
          type="error"
          message={formatMessage(
            'pages.system.menus.load.liveFailure',
            'Unable to load live menus',
          )}
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <ProTable<MenuSummary>
        rowKey="key"
        loading={loading}
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openCreateForm()}
          >
            {formatMessage('pages.system.menus.actions.new', 'New')}
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => void loadMenus()}
          >
            {formatMessage('pages.system.menus.actions.refresh', 'Refresh')}
          </Button>,
          <CurrentPageExportButton<MenuSummary>
            key="export"
            columns={exportColumns}
            resource="core-menus"
            rows={filteredRows}
          />,
        ]}
        pagination={false}
        dataSource={filteredTreeRows}
        columns={columns}
      />
      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={
          selectedDetail?.title ??
          formatMessage('pages.system.menus.detail.title', 'Menu Detail')
        }
      />
      <Modal
        title={formatMessage(
          editingMenu
            ? 'pages.system.menus.form.editTitle'
            : 'pages.system.menus.form.createTitle',
          editingMenu ? 'Edit Menu' : 'New Menu',
        )}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingMenu(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={
          editingMenu
            ? formatMessage('pages.system.menus.actions.save', 'Save')
            : formatMessage('pages.system.menus.actions.create', 'Create')
        }
      >
        <Form<MenuFormValues> form={form} layout="vertical">
          <Form.Item
            label={formatMessage('pages.system.menus.fields.key', 'Key')}
            name="key"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.menus.validation.keyRequired',
                  'Key is required.',
                ),
              },
            ]}
          >
            <Input disabled={Boolean(editingMenu)} maxLength={96} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.menus.fields.parent', 'Parent')}
            name="parentKey"
          >
            <TreeSelect
              allowClear
              showSearch
              treeDefaultExpandAll
              treeData={parentTreeData}
              placeholder={rootLabel}
            />
          </Form.Item>
          <Space align="start" size="middle" wrap>
            <Form.Item
              label={formatMessage('pages.system.menus.fields.type', 'Type')}
              name="type"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.system.menus.validation.typeRequired',
                    'Type is required.',
                  ),
                },
              ]}
            >
              <Select options={menuTypeOptions} style={{ minWidth: 160 }} />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.system.menus.fields.status',
                'Status',
              )}
              name="status"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.system.menus.validation.statusRequired',
                    'Status is required.',
                  ),
                },
              ]}
            >
              <Select options={menuStatusOptions} style={{ minWidth: 160 }} />
            </Form.Item>
            <Form.Item
              label={formatMessage('pages.system.menus.fields.order', 'Order')}
              name="order"
              rules={[
                {
                  required: true,
                  message: formatMessage(
                    'pages.system.menus.validation.orderRequired',
                    'Order is required.',
                  ),
                },
              ]}
            >
              <InputNumber min={0} precision={0} />
            </Form.Item>
          </Space>
          <Form.Item
            label={formatMessage('pages.system.menus.fields.title', 'Title')}
            name="title"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.menus.validation.titleRequired',
                  'Title is required.',
                ),
              },
            ]}
          >
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.menus.fields.path', 'Path')}
            name="path"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.menus.validation.pathRequired',
                  'Path is required.',
                ),
              },
              {
                pattern: /^\//,
                message: formatMessage(
                  'pages.system.menus.validation.pathPattern',
                  'Path must start with "/".',
                ),
              },
            ]}
          >
            <Input maxLength={160} />
          </Form.Item>
          <Space align="start" size="middle" wrap>
            <Form.Item
              label={formatMessage('pages.system.menus.fields.icon', 'Icon')}
              name="icon"
            >
              <Input maxLength={80} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.system.menus.fields.component',
                'Component',
              )}
              name="component"
            >
              <Input maxLength={160} style={{ width: 240 }} />
            </Form.Item>
          </Space>
          <Form.Item
            label={formatMessage(
              'pages.system.menus.fields.permission',
              'Permission',
            )}
            name="permissionCode"
          >
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={permissionOptions}
              placeholder={unboundLabel}
            />
          </Form.Item>
          <Space align="center" size="large" wrap>
            <Form.Item
              label={formatMessage('pages.system.menus.fields.cache', 'Cache')}
              name="cache"
              valuePropName="checked"
              style={{ marginBottom: 0 }}
            >
              <Switch />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.system.menus.fields.hidden',
                'Hidden',
              )}
              name="hidden"
              valuePropName="checked"
              style={{ marginBottom: 0 }}
            >
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}

function createPermissionOptions(
  permissions: readonly PermissionSummary[],
  rows: readonly MenuSummary[],
) {
  return Array.from(
    new Set([
      ...permissions.map((permission) => permission.code),
      ...rows
        .map((row) => row.permissionCode)
        .filter((code): code is string => Boolean(code)),
    ]),
  )
    .sort()
    .map((code) => ({ label: code, value: code }));
}
