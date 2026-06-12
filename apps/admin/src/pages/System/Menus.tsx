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
import {
  createMenuSummariesFromRegistry,
  createPermissionSummariesFromRegistry,
  type MenuSummary,
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
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  createOpenCoreMenu,
  deleteOpenCoreMenu,
  getOpenCoreMenu,
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
  key: string;
  order?: number;
  path: string;
  permissionCode?: string;
  title: string;
};

const fallbackRows = createMenuSummariesFromRegistry();
const searchFields: CurrentPageSearchField<MenuSummary>[] = [
  'key',
  'title',
  'path',
  'permissionCode',
  'stage',
];
const exportColumns: CurrentPageExportColumn<MenuSummary>[] = [
  { title: 'Key', dataIndex: 'key' },
  { title: 'Title', dataIndex: 'title' },
  { title: 'Path', dataIndex: 'path' },
  { title: 'Permission', dataIndex: 'permissionCode' },
  { title: 'Stage', dataIndex: 'stage' },
  { title: 'Order', dataIndex: 'order' },
];

function createDetailFields(record: MenuSummary): DetailField[] {
  return [
    { label: 'Key', value: record.key },
    { label: 'Title', value: record.title },
    { label: 'Path', value: record.path },
    { label: 'Permission', value: record.permissionCode },
    { label: 'Stage', value: record.stage },
    { label: 'Order', value: record.order },
  ];
}

function createPermissionOptions(rows: readonly MenuSummary[]) {
  return Array.from(
    new Set([
      ...createPermissionSummariesFromRegistry().map(
        (permission) => permission.code,
      ),
      ...rows
        .map((row) => row.permissionCode)
        .filter((code): code is string => Boolean(code)),
    ]),
  )
    .sort()
    .map((code) => ({ label: code, value: code }));
}

export default function MenusPage() {
  const [form] = Form.useForm<MenuFormValues>();
  const [rows, setRows] = useState<readonly MenuSummary[]>(fallbackRows);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<MenuSummary>();
  const [editingMenu, setEditingMenu] = useState<MenuSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const permissionOptions = useMemo(
    () => createPermissionOptions(rows),
    [rows],
  );
  const filterOptions = useMemo<CurrentPageFilterOption<MenuSummary>[]>(
    () => [
      {
        key: 'stage',
        options: createCurrentPageFilterOptions(rows, 'stage'),
        placeholder: 'Stage',
        predicate: (record, value) => record.stage === value,
      },
    ],
    [rows],
  );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<MenuSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search menus',
      selectFilters: filterOptions,
    });

  const loadMenus = async () => {
    setLoading(true);
    try {
      setRows(await listOpenCoreMenus());
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows(fallbackRows);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load menus.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMenus();
  }, []);

  const openCreateForm = () => {
    setEditingMenu(undefined);
    form.setFieldsValue({
      key: '',
      order: 0,
      path: '',
      permissionCode: undefined,
      title: '',
    });
    setFormOpen(true);
  };

  const openEditForm = async (record: MenuSummary) => {
    try {
      const fresh = await getOpenCoreMenu(record.key);
      setEditingMenu(fresh);
      form.setFieldsValue({
        key: fresh.key,
        order: fresh.order,
        path: fresh.path,
        permissionCode: fresh.permissionCode,
        title: fresh.title,
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
    } catch (_error) {
      setSelectedDetail(record);
    }
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editingMenu) {
        await updateOpenCoreMenu(editingMenu.key, {
          order: values.order,
          path: values.path,
          permissionCode: values.permissionCode ?? null,
          title: values.title,
        });
        message.success('Menu updated.');
      } else {
        await createOpenCoreMenu({
          key: values.key,
          order: values.order ?? 0,
          path: values.path,
          permissionCode: values.permissionCode,
          title: values.title,
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
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.title}
        </Typography.Link>
      ),
    },
    { title: 'Key', dataIndex: 'key', ellipsis: true },
    { title: 'Path', dataIndex: 'path', ellipsis: true },
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
      title: 'Stage',
      dataIndex: 'stage',
      width: 88,
      render: (_, record) => <Tag>{record.stage}</Tag>,
    },
    { title: 'Order', dataIndex: 'order', width: 88 },
    {
      title: 'Actions',
      valueType: 'option',
      width: 184,
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
          type="warning"
          message="Using fallback menu snapshot"
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
            onClick={openCreateForm}
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
        pagination={{ pageSize: 10 }}
        dataSource={filteredRows}
        columns={columns}
      />
      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
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
            <Form.Item
              label="Order"
              name="order"
              rules={[{ required: true, message: 'Order is required.' }]}
            >
              <InputNumber min={0} precision={0} />
            </Form.Item>
            <Form.Item label="Permission" name="permissionCode">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={permissionOptions}
                placeholder="Unbound"
                style={{ minWidth: 260 }}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
