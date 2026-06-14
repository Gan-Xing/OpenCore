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
const menuTypeOptions = [
  { label: 'directory', value: 'directory' },
  { label: 'menu', value: 'menu' },
];
const menuStatusOptions = [
  { label: 'enabled', value: 'enabled' },
  { label: 'disabled', value: 'disabled' },
];
const exportColumns: CurrentPageExportColumn<MenuSummary>[] = [
  { title: 'Key', dataIndex: 'key' },
  { title: 'Parent', dataIndex: 'parentKey' },
  { title: 'Title', dataIndex: 'title' },
  { title: 'Type', dataIndex: 'type' },
  { title: 'Path', dataIndex: 'path' },
  { title: 'Icon', dataIndex: 'icon' },
  { title: 'Component', dataIndex: 'component' },
  { title: 'Permission', dataIndex: 'permissionCode' },
  { title: 'Stage', dataIndex: 'stage' },
  { title: 'Order', dataIndex: 'order' },
  { title: 'Status', dataIndex: 'status' },
  { title: 'Cache', dataIndex: 'cache' },
  { title: 'Hidden', dataIndex: 'hidden' },
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

function createDetailFields(
  record: MenuSummary,
  parentTitles: ReadonlyMap<string, string>,
): DetailField[] {
  return [
    { label: 'Key', value: record.key },
    {
      label: 'Parent',
      value: record.parentKey
        ? (parentTitles.get(record.parentKey) ?? record.parentKey)
        : 'Root',
    },
    { label: 'Title', value: record.title },
    { label: 'Type', value: record.type },
    { label: 'Path', value: record.path },
    { label: 'Icon', value: record.icon },
    { label: 'Component', value: record.component },
    { label: 'Permission', value: record.permissionCode },
    { label: 'Stage', value: record.stage },
    { label: 'Order', value: record.order },
    { label: 'Status', value: record.status },
    { label: 'Cache', value: record.cache ? 'cache' : 'no cache' },
    { label: 'Hidden', value: record.hidden ? 'hidden' : 'visible' },
  ];
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
  const filterOptions = useMemo<CurrentPageFilterOption<MenuSummary>[]>(
    () => [
      {
        key: 'type',
        options: menuTypeOptions,
        placeholder: 'Type',
        predicate: (record, value) => record.type === value,
      },
      {
        key: 'status',
        options: menuStatusOptions,
        placeholder: 'Status',
        predicate: (record, value) => record.status === value,
      },
      {
        key: 'stage',
        options: createCurrentPageFilterOptions(flatRows, 'stage'),
        placeholder: 'Stage',
        predicate: (record, value) => record.stage === value,
      },
    ],
    [flatRows],
  );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<MenuSummary>({
      rows: flatRows,
      searchFields,
      searchPlaceholder: 'Search menus',
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
        error instanceof Error ? error.message : 'Unable to load live menus.',
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
        error instanceof Error ? error.message : 'Unable to open menu.',
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
          : 'Unable to load live menu detail.',
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
        message.success('Menu updated.');
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
        message.success('Menu created.');
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
    message.success('Menu deleted.');
    await loadMenus();
  };

  const columns: ProColumns<MenuSummary>[] = [
    {
      title: 'Title',
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
    { title: 'Key', dataIndex: 'key', ellipsis: true },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 104,
      render: (_, record) => (
        <Tag color={record.type === 'directory' ? 'purple' : 'blue'}>
          {record.type}
        </Tag>
      ),
    },
    {
      title: 'Parent',
      dataIndex: 'parentKey',
      ellipsis: true,
      render: (_, record) =>
        record.parentKey ? (
          (parentTitles.get(record.parentKey) ?? record.parentKey)
        ) : (
          <Tag>root</Tag>
        ),
    },
    { title: 'Path', dataIndex: 'path', ellipsis: true },
    { title: 'Component', dataIndex: 'component', ellipsis: true },
    {
      title: 'Permission',
      dataIndex: 'permissionCode',
      ellipsis: true,
      render: (_, record) =>
        record.permissionCode ? (
          <Tag color="blue">{record.permissionCode}</Tag>
        ) : (
          <Tag>unbound</Tag>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 104,
      render: (_, record) => (
        <Tag color={record.status === 'enabled' ? 'green' : 'default'}>
          {record.status}
        </Tag>
      ),
    },
    {
      title: 'Cache',
      dataIndex: 'cache',
      width: 88,
      render: (_, record) => <Tag>{record.cache ? 'cache' : 'none'}</Tag>,
    },
    {
      title: 'Hidden',
      dataIndex: 'hidden',
      width: 88,
      render: (_, record) => <Tag>{record.hidden ? 'hidden' : 'visible'}</Tag>,
    },
    {
      title: 'Order',
      dataIndex: 'order',
      width: 88,
    },
    {
      title: 'Actions',
      valueType: 'option',
      width: 232,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Detail">
            <Button
              aria-label={`View ${record.title}`}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Add child">
            <Button
              aria-label={`Add child menu under ${record.title}`}
              icon={<PlusOutlined />}
              onClick={() => openCreateForm(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              aria-label={`Edit ${record.title}`}
              icon={<EditOutlined />}
              onClick={() => void openEditForm(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Delete this menu?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => void deleteMenu(record)}
          >
            <Tooltip title="Delete">
              <Button
                aria-label={`Delete ${record.title}`}
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
    <PageContainer title="Menus" subTitle="S6 RBAC">
      {loadError ? (
        <Alert
          showIcon
          type="error"
          message="Unable to load live menus"
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
            New
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => void loadMenus()}
          >
            Refresh
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
        fields={
          selectedDetail ? createDetailFields(selectedDetail, parentTitles) : []
        }
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={selectedDetail?.title ?? 'Menu Detail'}
      />
      <Modal
        title={editingMenu ? 'Edit Menu' : 'New Menu'}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingMenu(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={editingMenu ? 'Save' : 'Create'}
      >
        <Form<MenuFormValues> form={form} layout="vertical">
          <Form.Item
            label="Key"
            name="key"
            rules={[{ required: true, message: 'Key is required.' }]}
          >
            <Input disabled={Boolean(editingMenu)} maxLength={96} />
          </Form.Item>
          <Form.Item label="Parent" name="parentKey">
            <TreeSelect
              allowClear
              showSearch
              treeDefaultExpandAll
              treeData={parentTreeData}
              placeholder="Root"
            />
          </Form.Item>
          <Space align="start" size="middle" wrap>
            <Form.Item
              label="Type"
              name="type"
              rules={[{ required: true, message: 'Type is required.' }]}
            >
              <Select options={menuTypeOptions} style={{ minWidth: 160 }} />
            </Form.Item>
            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: 'Status is required.' }]}
            >
              <Select options={menuStatusOptions} style={{ minWidth: 160 }} />
            </Form.Item>
            <Form.Item
              label="Order"
              name="order"
              rules={[{ required: true, message: 'Order is required.' }]}
            >
              <InputNumber min={0} precision={0} />
            </Form.Item>
          </Space>
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: 'Title is required.' }]}
          >
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item
            label="Path"
            name="path"
            rules={[
              { required: true, message: 'Path is required.' },
              {
                pattern: /^\//,
                message: 'Path must start with "/".',
              },
            ]}
          >
            <Input maxLength={160} />
          </Form.Item>
          <Space align="start" size="middle" wrap>
            <Form.Item label="Icon" name="icon">
              <Input maxLength={80} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item label="Component" name="component">
              <Input maxLength={160} style={{ width: 240 }} />
            </Form.Item>
          </Space>
          <Form.Item label="Permission" name="permissionCode">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={permissionOptions}
              placeholder="Unbound"
            />
          </Form.Item>
          <Space align="center" size="large" wrap>
            <Form.Item
              label="Cache"
              name="cache"
              valuePropName="checked"
              style={{ marginBottom: 0 }}
            >
              <Switch />
            </Form.Item>
            <Form.Item
              label="Hidden"
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
