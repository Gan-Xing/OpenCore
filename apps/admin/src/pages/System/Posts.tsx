import {
  ArrowDownOutlined,
  ArrowUpOutlined,
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
import type { SystemPostSummary } from '@opencore/sdk';
import { useIntl } from '@umijs/max';
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
  updateOpenCoreSystemPostOrder,
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

const searchFields: CurrentPageSearchField<SystemPostSummary>[] = [
  'code',
  'name',
  'description',
];

function createReorderedPostItems(
  rows: readonly SystemPostSummary[],
  code: string,
  direction: 'down' | 'up',
): { code: string; order: number }[] | undefined {
  const index = rows.findIndex((record) => record.code === code);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;

  if (index < 0 || targetIndex < 0 || targetIndex >= rows.length) {
    return undefined;
  }

  const reordered = [...rows];
  const [moved] = reordered.splice(index, 1);
  if (!moved) {
    return undefined;
  }

  reordered.splice(targetIndex, 0, moved);
  return reordered.map((record, itemIndex) => ({
    code: record.code,
    order: (itemIndex + 1) * 10,
  }));
}

export default function PostsPage() {
  const intl = useIntl();
  const [form] = Form.useForm<PostFormValues>();
  const [rows, setRows] = useState<readonly SystemPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<SystemPostSummary>();
  const [editingPost, setEditingPost] = useState<SystemPostSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [orderingPostCode, setOrderingPostCode] = useState<string>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<readonly Key[]>([]);
  const selectedPostCodes = useMemo(
    () =>
      selectedRowKeys
        .map(String)
        .filter((code) => rows.some((record) => record.code === code)),
    [rows, selectedRowKeys],
  );
  const formatMessage = (
    id: string,
    defaultMessage: string,
    values?: Record<string, number | string>,
  ) =>
    values
      ? intl.formatMessage({ id, defaultMessage }, values)
      : intl.formatMessage({ id, defaultMessage });
  const statusLabels = {
    disabled: formatMessage('pages.system.posts.status.disabled', 'Disabled'),
    enabled: formatMessage('pages.system.posts.status.enabled', 'Enabled'),
  };
  const filterOptions: CurrentPageFilterOption<SystemPostSummary>[] = [
    {
      key: 'enabled',
      options: [
        { label: statusLabels.enabled, value: 'true' },
        { label: statusLabels.disabled, value: 'false' },
      ],
      placeholder: formatMessage('pages.system.posts.filters.status', 'Status'),
      predicate: (record, value) => record.enabled === (value === 'true'),
    },
  ];
  const exportColumns: CurrentPageExportColumn<SystemPostSummary>[] = [
    {
      title: formatMessage('pages.system.posts.fields.id', 'ID'),
      dataIndex: 'id',
    },
    {
      title: formatMessage('pages.system.posts.fields.code', 'Code'),
      dataIndex: 'code',
    },
    {
      title: formatMessage('pages.system.posts.fields.name', 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage('pages.system.posts.fields.order', 'Order'),
      dataIndex: 'order',
    },
    {
      title: formatMessage('pages.system.posts.fields.enabled', 'Enabled'),
      renderText: (record) =>
        record.enabled ? statusLabels.enabled : statusLabels.disabled,
    },
    {
      title: formatMessage(
        'pages.system.posts.fields.description',
        'Description',
      ),
      dataIndex: 'description',
    },
    {
      title: formatMessage('pages.system.posts.fields.createdAt', 'Created At'),
      dataIndex: 'createdAt',
    },
    {
      title: formatMessage('pages.system.posts.fields.updatedAt', 'Updated At'),
      dataIndex: 'updatedAt',
    },
  ];
  const createDetailFields = (record: SystemPostSummary): DetailField[] => [
    {
      label: formatMessage('pages.system.posts.fields.id', 'ID'),
      value: record.id,
    },
    {
      label: formatMessage('pages.system.posts.fields.code', 'Code'),
      value: record.code,
    },
    {
      label: formatMessage('pages.system.posts.fields.name', 'Name'),
      value: record.name,
    },
    {
      label: formatMessage('pages.system.posts.fields.order', 'Order'),
      value: record.order,
    },
    {
      label: formatMessage('pages.system.posts.fields.enabled', 'Enabled'),
      value: record.enabled ? statusLabels.enabled : statusLabels.disabled,
    },
    {
      label: formatMessage(
        'pages.system.posts.fields.description',
        'Description',
      ),
      value: record.description,
    },
    {
      label: formatMessage('pages.system.posts.fields.createdAt', 'Created At'),
      value: record.createdAt,
    },
    {
      label: formatMessage('pages.system.posts.fields.updatedAt', 'Updated At'),
      value: record.updatedAt,
    },
  ];
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<SystemPostSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.system.posts.search.placeholder',
        'Search posts',
      ),
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
      setRows([]);
      setSelectedRowKeys([]);
      setSelectedDetail(undefined);
      setEditingPost(undefined);
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.posts.load.failure',
              'Unable to load posts.',
            ),
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
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.posts.open.failure',
              'Unable to open post.',
            ),
      );
    }
  };

  const openDetail = async (record: SystemPostSummary) => {
    try {
      setSelectedDetail(await getOpenCoreSystemPost(record.code));
    } catch (error: unknown) {
      setSelectedDetail(undefined);
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.posts.detail.loadFailure',
              'Unable to load live post detail.',
            ),
      );
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
        message.success(
          formatMessage('pages.system.posts.messages.updated', 'Post updated.'),
        );
      } else {
        await createOpenCoreSystemPost({
          code: values.code,
          description: values.description,
          enabled: values.enabled,
          name: values.name,
          order: values.order,
        });
        message.success(
          formatMessage('pages.system.posts.messages.created', 'Post created.'),
        );
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
    message.success(
      formatMessage('pages.system.posts.messages.deleted', 'Post deleted.'),
    );
    await loadPosts();
  };

  const deleteSelectedPosts = async () => {
    const codes = selectedPostCodes;
    if (codes.length === 0) {
      message.warning(
        formatMessage(
          'pages.system.posts.messages.selectAtLeastOne',
          'Select at least one post.',
        ),
      );
      return;
    }

    setBatchDeleting(true);
    try {
      const result = await deleteOpenCoreSystemPosts({ codes });
      setSelectedRowKeys([]);
      message.success(
        formatMessage(
          'pages.system.posts.messages.batchDeleted',
          'Selected posts deleted. {count} row(s).',
          { count: result.affected },
        ),
      );
      await loadPosts();
    } finally {
      setBatchDeleting(false);
    }
  };

  const movePost = async (
    record: SystemPostSummary,
    direction: 'down' | 'up',
  ) => {
    const items = createReorderedPostItems(rows, record.code, direction);

    if (!items) {
      return;
    }

    setOrderingPostCode(record.code);
    try {
      await updateOpenCoreSystemPostOrder({ items });
      message.success(
        formatMessage(
          'pages.system.posts.messages.orderSaved',
          'Post order saved.',
        ),
      );
      await loadPosts();
    } finally {
      setOrderingPostCode(undefined);
    }
  };

  const columns: ProColumns<SystemPostSummary>[] = [
    {
      title: formatMessage('pages.system.posts.fields.name', 'Name'),
      dataIndex: 'name',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.name}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.system.posts.fields.code', 'Code'),
      dataIndex: 'code',
    },
    {
      title: formatMessage('pages.system.posts.fields.order', 'Order'),
      dataIndex: 'order',
      width: 88,
    },
    {
      title: formatMessage('pages.system.posts.filters.status', 'Status'),
      dataIndex: 'enabled',
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? statusLabels.enabled : statusLabels.disabled}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.system.posts.fields.description',
        'Description',
      ),
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: formatMessage('pages.system.posts.actions.column', 'Actions'),
      valueType: 'option',
      width: 264,
      render: (_, record) => (
        <Space size="small">
          <Tooltip
            title={formatMessage(
              'pages.system.posts.actions.moveUp',
              'Move up',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.posts.actions.moveUpAria',
                'Move up {name}',
                { name: record.name },
              )}
              disabled={
                rows.findIndex((item) => item.code === record.code) <= 0
              }
              icon={<ArrowUpOutlined />}
              loading={orderingPostCode === record.code}
              onClick={() => void movePost(record, 'up')}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={formatMessage(
              'pages.system.posts.actions.moveDown',
              'Move down',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.posts.actions.moveDownAria',
                'Move down {name}',
                { name: record.name },
              )}
              disabled={
                rows.findIndex((item) => item.code === record.code) >=
                rows.length - 1
              }
              icon={<ArrowDownOutlined />}
              loading={orderingPostCode === record.code}
              onClick={() => void movePost(record, 'down')}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={formatMessage('pages.system.posts.actions.detail', 'Detail')}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.posts.actions.viewAria',
                'View {name}',
                { name: record.name },
              )}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={formatMessage('pages.system.posts.actions.edit', 'Edit')}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.posts.actions.editAria',
                'Edit {name}',
                { name: record.name },
              )}
              icon={<EditOutlined />}
              onClick={() => void openEditForm(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title={formatMessage(
              'pages.system.posts.confirm.deleteOne',
              'Delete this post?',
            )}
            okText={formatMessage(
              'pages.system.posts.actions.delete',
              'Delete',
            )}
            okButtonProps={{ danger: true }}
            onConfirm={() => void deletePost(record)}
          >
            <Tooltip
              title={formatMessage(
                'pages.system.posts.actions.delete',
                'Delete',
              )}
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.posts.actions.deleteAria',
                  'Delete {name}',
                  { name: record.name },
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
      title={formatMessage('menu.system.posts', 'Posts')}
      subTitle={formatMessage('pages.system.section', 'System Management')}
    >
      {loadError ? (
        <Alert
          showIcon
          type="error"
          message={formatMessage(
            'pages.system.posts.load.liveFailure',
            'Unable to load live posts',
          )}
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
            {formatMessage('pages.system.posts.actions.new', 'New')}
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => void loadPosts()}
          >
            {formatMessage('pages.system.posts.actions.refresh', 'Refresh')}
          </Button>,
          <Popconfirm
            key="batch-delete"
            title={formatMessage(
              'pages.system.posts.confirm.deleteSelected',
              'Delete {count} selected post(s)?',
              { count: selectedPostCodes.length },
            )}
            okText={formatMessage(
              'pages.system.posts.actions.delete',
              'Delete',
            )}
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
              {formatMessage(
                'pages.system.posts.actions.deleteSelected',
                'Delete selected',
              )}
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
        title={
          selectedDetail?.name ??
          formatMessage('pages.system.posts.detail.title', 'Post Detail')
        }
      />
      <Modal
        title={
          editingPost
            ? formatMessage('pages.system.posts.form.editTitle', 'Edit Post')
            : formatMessage('pages.system.posts.form.createTitle', 'New Post')
        }
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingPost(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={
          editingPost
            ? formatMessage('pages.system.posts.actions.save', 'Save')
            : formatMessage('pages.system.posts.actions.create', 'Create')
        }
      >
        <Form<PostFormValues> form={form} layout="vertical">
          <Form.Item
            label={formatMessage('pages.system.posts.fields.code', 'Code')}
            name="code"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.posts.validation.codeRequired',
                  'Code is required.',
                ),
              },
            ]}
          >
            <Input disabled={Boolean(editingPost)} maxLength={64} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.posts.fields.name', 'Name')}
            name="name"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.posts.validation.nameRequired',
                  'Name is required.',
                ),
              },
            ]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Space align="start" size="middle" wrap>
            <Form.Item
              label={formatMessage('pages.system.posts.fields.order', 'Order')}
              name="order"
            >
              <InputNumber min={0} precision={0} />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.system.posts.fields.enabled',
                'Enabled',
              )}
              name="enabled"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item
            label={formatMessage(
              'pages.system.posts.fields.description',
              'Description',
            )}
            name="description"
          >
            <Input.TextArea maxLength={240} rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
