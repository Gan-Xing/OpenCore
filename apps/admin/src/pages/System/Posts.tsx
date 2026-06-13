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
  createSystemPostFixtures,
  type SystemPostSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState, type Key } from 'react';
import {
  createOpenCoreSystemPost,
  deleteOpenCoreSystemPost,
  deleteOpenCoreSystemPosts,
  getOpenCoreSystemPost,
  listOpenCoreSystemPosts,
  updateOpenCoreSystemPost,
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

type PostFormValues = {
  code: string;
  description?: string;
  enabled?: boolean;
  name: string;
  order?: number;
};

const fallbackRows = createSystemPostFixtures().items;
const searchFields: CurrentPageSearchField<SystemPostSummary>[] = [
  'code',
  'name',
  'description',
];
const filterOptions: CurrentPageFilterOption<SystemPostSummary>[] = [
  {
    key: 'enabled',
    options: [
      { label: 'enabled', value: 'true' },
      { label: 'disabled', value: 'false' },
    ],
    placeholder: 'Status',
    predicate: (record, value) => record.enabled === (value === 'true'),
  },
];
const exportColumns: CurrentPageExportColumn<SystemPostSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Code', dataIndex: 'code' },
  { title: 'Name', dataIndex: 'name' },
  { title: 'Order', dataIndex: 'order' },
  { title: 'Enabled', dataIndex: 'enabled' },
  { title: 'Description', dataIndex: 'description' },
  { title: 'Created At', dataIndex: 'createdAt' },
  { title: 'Updated At', dataIndex: 'updatedAt' },
];

function createDetailFields(record: SystemPostSummary): DetailField[] {
  return [
    { label: 'ID', value: record.id },
    { label: 'Code', value: record.code },
    { label: 'Name', value: record.name },
    { label: 'Order', value: record.order },
    { label: 'Enabled', value: record.enabled ? 'enabled' : 'disabled' },
    { label: 'Description', value: record.description },
    { label: 'Created At', value: record.createdAt },
    { label: 'Updated At', value: record.updatedAt },
  ];
}

export default function PostsPage() {
  const [form] = Form.useForm<PostFormValues>();
  const [rows, setRows] = useState<readonly SystemPostSummary[]>(fallbackRows);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<SystemPostSummary>();
  const [editingPost, setEditingPost] = useState<SystemPostSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<readonly Key[]>([]);
  const selectedPostCodes = useMemo(
    () =>
      selectedRowKeys
        .map(String)
        .filter((code) => rows.some((record) => record.code === code)),
    [rows, selectedRowKeys],
  );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<SystemPostSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search posts',
      selectFilters: filterOptions,
    });

  const loadPosts = async () => {
    setLoading(true);
    try {
      const posts = await listOpenCoreSystemPosts({ page: 1, pageSize: 100 });
      setRows(posts);
      setSelectedRowKeys((keys) =>
        keys.filter((key) =>
          posts.some((record) => record.code === String(key)),
        ),
      );
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows(fallbackRows);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load posts.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts();
  }, []);

  const openCreateForm = () => {
    setEditingPost(undefined);
    form.setFieldsValue({
      code: '',
      description: '',
      enabled: true,
      name: '',
      order: 0,
    });
    setFormOpen(true);
  };

  const openEditForm = async (record: SystemPostSummary) => {
    try {
      const fresh = await getOpenCoreSystemPost(record.code);
      setEditingPost(fresh);
      form.setFieldsValue({
        code: fresh.code,
        description: fresh.description,
        enabled: fresh.enabled,
        name: fresh.name,
        order: fresh.order,
      });
      setFormOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to open post.',
      );
    }
  };

  const openDetail = async (record: SystemPostSummary) => {
    try {
      setSelectedDetail(await getOpenCoreSystemPost(record.code));
    } catch (_error) {
      setSelectedDetail(record);
    }
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editingPost) {
        await updateOpenCoreSystemPost(editingPost.code, {
          description: values.description,
          enabled: values.enabled,
          name: values.name,
          order: values.order,
        });
        message.success('Post updated.');
      } else {
        await createOpenCoreSystemPost({
          code: values.code,
          description: values.description,
          enabled: values.enabled,
          name: values.name,
          order: values.order,
        });
        message.success('Post created.');
      }
      setFormOpen(false);
      setEditingPost(undefined);
      await loadPosts();
    } finally {
      setSubmitting(false);
    }
  };

  const deletePost = async (record: SystemPostSummary) => {
    await deleteOpenCoreSystemPost(record.code);
    message.success('Post deleted.');
    await loadPosts();
  };

  const deleteSelectedPosts = async () => {
    const codes = selectedPostCodes;
    if (codes.length === 0) {
      message.warning('Select at least one post.');
      return;
    }

    setBatchDeleting(true);
    try {
      const result = await deleteOpenCoreSystemPosts({ codes });
      setSelectedRowKeys([]);
      message.success(`Selected posts deleted. ${result.affected} row(s).`);
      await loadPosts();
    } finally {
      setBatchDeleting(false);
    }
  };

  const columns: ProColumns<SystemPostSummary>[] = [
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
    { title: 'Order', dataIndex: 'order', width: 88 },
    {
      title: 'Status',
      dataIndex: 'enabled',
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? 'enabled' : 'disabled'}
        </Tag>
      ),
    },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    {
      title: 'Actions',
      valueType: 'option',
      width: 184,
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
          <Popconfirm
            title="Delete this post?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => void deletePost(record)}
          >
            <Tooltip title="Delete">
              <Button
                aria-label={`Delete ${record.name}`}
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
    <PageContainer title="Posts" subTitle="S7 System">
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message="Using fallback post snapshot"
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <ProTable<SystemPostSummary>
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
            onClick={() => void loadPosts()}
          >
            Refresh
          </Button>,
          <Popconfirm
            key="batch-delete"
            title={`Delete ${selectedPostCodes.length} selected post(s)?`}
            okText="Delete"
            okButtonProps={{ danger: true }}
            disabled={selectedPostCodes.length === 0}
            onConfirm={() => void deleteSelectedPosts()}
          >
            <Button
              danger
              disabled={selectedPostCodes.length === 0}
              icon={<DeleteOutlined />}
              loading={batchDeleting}
            >
              Delete selected
            </Button>
          </Popconfirm>,
          <CurrentPageExportButton<SystemPostSummary>
            key="export"
            columns={exportColumns}
            resource="core-posts"
            rows={filteredRows}
          />,
        ]}
        pagination={{ pageSize: 10 }}
        dataSource={filteredRows}
        columns={columns}
        rowSelection={{
          selectedRowKeys: [...selectedRowKeys],
          onChange: (keys) => setSelectedRowKeys(keys),
          preserveSelectedRowKeys: true,
        }}
      />
      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={selectedDetail?.name ?? 'Post Detail'}
      />
      <Modal
        title={editingPost ? 'Edit Post' : 'New Post'}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingPost(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={editingPost ? 'Save' : 'Create'}
      >
        <Form<PostFormValues> form={form} layout="vertical">
          <Form.Item
            label="Code"
            name="code"
            rules={[{ required: true, message: 'Code is required.' }]}
          >
            <Input disabled={Boolean(editingPost)} maxLength={64} />
          </Form.Item>
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Name is required.' }]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Space align="start" size="middle" wrap>
            <Form.Item label="Order" name="order">
              <InputNumber min={0} precision={0} />
            </Form.Item>
            <Form.Item label="Enabled" name="enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item label="Description" name="description">
            <Input.TextArea maxLength={240} rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
