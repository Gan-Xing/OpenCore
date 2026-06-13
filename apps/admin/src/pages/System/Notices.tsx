import {
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createSystemNoticeFixtures,
  type SystemNoticeAudience,
  type SystemNoticeInboxSummary,
  type SystemNoticeSummary,
  type SystemNoticeType,
} from '@opencore/sdk';
import { useLocation, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';
import {
  archiveOpenCoreSystemNotice,
  createOpenCoreSystemNotice,
  deleteOpenCoreSystemNotice,
  getOpenCoreSystemNotice,
  getOpenCoreSystemNoticeInboxItem,
  listOpenCoreSystemNoticeInbox,
  listOpenCoreSystemNotices,
  markAllOpenCoreSystemNoticesRead,
  markOpenCoreSystemNoticesRead,
  publishOpenCoreSystemNotice,
  updateOpenCoreSystemNotice,
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

type NoticeFormValues = {
  audience: SystemNoticeAudience;
  content: string;
  pinned?: boolean;
  title: string;
  type: SystemNoticeType;
};

type NoticeTab = 'manage' | 'inbox';

const fallbackRows = createSystemNoticeFixtures().items;
const searchFields: CurrentPageSearchField<SystemNoticeSummary>[] = [
  'title',
  'content',
  'createdBy',
  'type',
  'status',
  'audience',
];
const filterOptions: CurrentPageFilterOption<SystemNoticeSummary>[] = [
  {
    key: 'status',
    options: [
      { label: 'draft', value: 'draft' },
      { label: 'published', value: 'published' },
      { label: 'archived', value: 'archived' },
    ],
    placeholder: 'Status',
    predicate: (record, value) => record.status === value,
  },
  {
    key: 'type',
    options: [
      { label: 'announcement', value: 'announcement' },
      { label: 'maintenance', value: 'maintenance' },
      { label: 'security', value: 'security' },
    ],
    placeholder: 'Type',
    predicate: (record, value) => record.type === value,
  },
  {
    key: 'audience',
    options: [
      { label: 'all', value: 'all' },
      { label: 'admin', value: 'admin' },
    ],
    placeholder: 'Audience',
    predicate: (record, value) => record.audience === value,
  },
];
const exportColumns: CurrentPageExportColumn<SystemNoticeSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Title', dataIndex: 'title' },
  { title: 'Type', dataIndex: 'type' },
  { title: 'Status', dataIndex: 'status' },
  { title: 'Audience', dataIndex: 'audience' },
  { title: 'Pinned', dataIndex: 'pinned' },
  { title: 'Created By', dataIndex: 'createdBy' },
  { title: 'Created At', dataIndex: 'createdAt' },
  { title: 'Updated At', dataIndex: 'updatedAt' },
];

function createDetailFields(record: SystemNoticeSummary): DetailField[] {
  return [
    { label: 'ID', value: record.id },
    { label: 'Title', value: record.title },
    { label: 'Type', value: record.type },
    { label: 'Status', value: record.status },
    { label: 'Audience', value: record.audience },
    { label: 'Pinned', value: record.pinned ? 'yes' : 'no' },
    { label: 'Valid From', value: record.validFrom },
    { label: 'Valid To', value: record.validTo },
    { label: 'Published At', value: record.publishedAt },
    { label: 'Archived At', value: record.archivedAt },
    { label: 'Created By', value: record.createdBy },
    { label: 'Created At', value: record.createdAt },
    { label: 'Updated At', value: record.updatedAt },
    { label: 'Content', value: record.content },
  ];
}

function createInboxDetailFields(
  record: SystemNoticeInboxSummary,
): DetailField[] {
  return [
    ...createDetailFields(record),
    { label: 'Read', value: record.read ? 'yes' : 'no' },
    { label: 'Read At', value: record.readAt },
  ];
}

function renderStatus(status: SystemNoticeSummary['status']) {
  const color =
    status === 'published' ? 'green' : status === 'draft' ? 'gold' : 'default';
  return <Tag color={color}>{status}</Tag>;
}

function renderType(type: SystemNoticeSummary['type']) {
  const color =
    type === 'security' ? 'red' : type === 'maintenance' ? 'blue' : 'purple';
  return <Tag color={color}>{type}</Tag>;
}

function getNoticeTabFromSearch(search: string): NoticeTab {
  return new URLSearchParams(search).get('tab') === 'inbox'
    ? 'inbox'
    : 'manage';
}

export default function SystemNoticesPage() {
  const [form] = Form.useForm<NoticeFormValues>();
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const [activeTab, setActiveTab] = useState<NoticeTab>(() =>
    getNoticeTabFromSearch(location.search),
  );
  const [rows, setRows] =
    useState<readonly SystemNoticeSummary[]>(fallbackRows);
  const [inboxRows, setInboxRows] = useState<
    readonly SystemNoticeInboxSummary[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [inboxLoadError, setInboxLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<SystemNoticeSummary>();
  const [selectedInboxDetail, setSelectedInboxDetail] =
    useState<SystemNoticeInboxSummary>();
  const [editingNotice, setEditingNotice] = useState<SystemNoticeSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<SystemNoticeSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search system notices',
      selectFilters: filterOptions,
    });

  const loadNotices = async () => {
    setLoading(true);
    try {
      const notices = await listOpenCoreSystemNotices({
        page: 1,
        pageSize: 100,
      });
      setRows(notices);
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows(fallbackRows);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load system notices.',
      );
    } finally {
      setLoading(false);
    }
  };

  const loadInbox = async () => {
    setInboxLoading(true);
    try {
      const notices = await listOpenCoreSystemNoticeInbox({
        page: 1,
        pageSize: 100,
      });
      setInboxRows(notices);
      setInboxLoadError(undefined);
    } catch (error: unknown) {
      setInboxRows([]);
      setInboxLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load system notice inbox.',
      );
    } finally {
      setInboxLoading(false);
    }
  };

  useEffect(() => {
    void loadNotices();
    void loadInbox();
  }, []);

  useEffect(() => {
    setActiveTab(getNoticeTabFromSearch(location.search));
  }, [location.search]);

  const openCreateForm = () => {
    setEditingNotice(undefined);
    form.setFieldsValue({
      audience: 'all',
      content: '',
      pinned: false,
      title: '',
      type: 'announcement',
    });
    setFormOpen(true);
  };

  const openEditForm = async (record: SystemNoticeSummary) => {
    try {
      const fresh = await getOpenCoreSystemNotice(record.id);
      setEditingNotice(fresh);
      form.setFieldsValue({
        audience: fresh.audience,
        content: fresh.content,
        pinned: fresh.pinned,
        title: fresh.title,
        type: fresh.type,
      });
      setFormOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to open notice.',
      );
    }
  };

  const openDetail = async (record: SystemNoticeSummary) => {
    try {
      setSelectedDetail(await getOpenCoreSystemNotice(record.id));
    } catch (_error) {
      setSelectedDetail(record);
    }
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    const createdBy = initialState?.currentUser?.username ?? 'admin';

    setSubmitting(true);
    try {
      if (editingNotice) {
        await updateOpenCoreSystemNotice(editingNotice.id, values);
        message.success('System notice updated.');
      } else {
        await createOpenCoreSystemNotice({
          ...values,
          createdBy,
        });
        message.success('System notice created.');
      }
      setFormOpen(false);
      setEditingNotice(undefined);
      await loadNotices();
      await loadInbox();
    } finally {
      setSubmitting(false);
    }
  };

  const publishNotice = async (record: SystemNoticeSummary) => {
    await publishOpenCoreSystemNotice(record.id);
    message.success('System notice published.');
    await loadNotices();
    await loadInbox();
  };

  const archiveNotice = async (record: SystemNoticeSummary) => {
    await archiveOpenCoreSystemNotice(record.id);
    message.success('System notice archived.');
    await loadNotices();
    await loadInbox();
  };

  const deleteNotice = async (record: SystemNoticeSummary) => {
    await deleteOpenCoreSystemNotice(record.id);
    message.success('System notice deleted.');
    await loadNotices();
    await loadInbox();
  };

  const openInboxDetail = async (record: SystemNoticeInboxSummary) => {
    try {
      setSelectedInboxDetail(await getOpenCoreSystemNoticeInboxItem(record.id));
    } catch (_error) {
      setSelectedInboxDetail(record);
    }
  };

  const markInboxNoticeRead = async (record: SystemNoticeInboxSummary) => {
    await markOpenCoreSystemNoticesRead({ ids: [record.id] });
    message.success('System notice marked read.');
    await loadInbox();
  };

  const markAllInboxNoticesRead = async () => {
    await markAllOpenCoreSystemNoticesRead();
    message.success('All system notices marked read.');
    await loadInbox();
  };

  const columns: ProColumns<SystemNoticeSummary>[] = [
    {
      title: 'Title',
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.title}
        </Typography.Link>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (_, record) => renderType(record.type),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (_, record) => renderStatus(record.status),
    },
    {
      title: 'Audience',
      dataIndex: 'audience',
      render: (_, record) => <Tag>{record.audience}</Tag>,
    },
    {
      title: 'Pinned',
      dataIndex: 'pinned',
      render: (_, record) => (
        <Tag color={record.pinned ? 'blue' : 'default'}>
          {record.pinned ? 'pinned' : 'normal'}
        </Tag>
      ),
    },
    { title: 'Created By', dataIndex: 'createdBy' },
    {
      title: 'Actions',
      valueType: 'option',
      width: 236,
      render: (_, record) => {
        const archived = record.status === 'archived';
        const draft = record.status === 'draft';

        return (
          <Space size="small">
            <Tooltip title="Detail">
              <Button
                aria-label={`View ${record.title}`}
                icon={<EyeOutlined />}
                onClick={() => void openDetail(record)}
                size="small"
              />
            </Tooltip>
            <Tooltip
              title={archived ? 'Archived notices cannot be edited' : 'Edit'}
            >
              <Button
                aria-label={`Edit ${record.title}`}
                disabled={archived}
                icon={<EditOutlined />}
                onClick={() => void openEditForm(record)}
                size="small"
              />
            </Tooltip>
            <Popconfirm
              title="Publish this notice?"
              okText="Publish"
              onConfirm={() => void publishNotice(record)}
              disabled={!draft}
            >
              <Tooltip
                title={draft ? 'Publish' : 'Only draft notices can publish'}
              >
                <Button
                  aria-label={`Publish ${record.title}`}
                  disabled={!draft}
                  icon={<SendOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
            <Popconfirm
              title="Archive this notice?"
              okText="Archive"
              onConfirm={() => void archiveNotice(record)}
              disabled={archived}
            >
              <Tooltip title={archived ? 'Already archived' : 'Archive'}>
                <Button
                  aria-label={`Archive ${record.title}`}
                  disabled={archived}
                  icon={<StopOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
            <Popconfirm
              title="Delete this notice?"
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => void deleteNotice(record)}
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
        );
      },
    },
  ];

  const inboxColumns: ProColumns<SystemNoticeInboxSummary>[] = [
    {
      title: 'Title',
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openInboxDetail(record)}>
          {record.title}
        </Typography.Link>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (_, record) => renderType(record.type),
    },
    {
      title: 'Read',
      dataIndex: 'read',
      render: (_, record) => (
        <Tag color={record.read ? 'default' : 'red'}>
          {record.read ? 'read' : 'unread'}
        </Tag>
      ),
    },
    {
      title: 'Pinned',
      dataIndex: 'pinned',
      render: (_, record) => (
        <Tag color={record.pinned ? 'blue' : 'default'}>
          {record.pinned ? 'pinned' : 'normal'}
        </Tag>
      ),
    },
    { title: 'Published At', dataIndex: 'publishedAt' },
    {
      title: 'Actions',
      valueType: 'option',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Detail">
            <Button
              aria-label={`View inbox notice ${record.title}`}
              icon={<EyeOutlined />}
              onClick={() => void openInboxDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title={record.read ? 'Already read' : 'Mark read'}>
            <Button
              aria-label={`Mark ${record.title} read`}
              disabled={record.read}
              icon={<CheckOutlined />}
              onClick={() => void markInboxNoticeRead(record)}
              size="small"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="System Notices" subTitle="S7 System">
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as NoticeTab)}
        items={[
          {
            key: 'manage',
            label: 'Manage',
            children: (
              <>
                {loadError ? (
                  <Alert
                    showIcon
                    type="warning"
                    message="Using fallback system notice snapshot"
                    description={loadError}
                    style={{ marginBlockEnd: 16 }}
                  />
                ) : null}
                <ProTable<SystemNoticeSummary>
                  rowKey="id"
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
                      onClick={() => void loadNotices()}
                    >
                      Refresh
                    </Button>,
                    <CurrentPageExportButton<SystemNoticeSummary>
                      key="export"
                      columns={exportColumns}
                      resource="core-notices"
                      rows={filteredRows}
                    />,
                  ]}
                  pagination={{
                    pageSize: 10,
                  }}
                  dataSource={filteredRows}
                  columns={columns}
                />
              </>
            ),
          },
          {
            key: 'inbox',
            label: `Inbox (${inboxRows.filter((record) => !record.read).length})`,
            children: (
              <>
                {inboxLoadError ? (
                  <Alert
                    showIcon
                    type="warning"
                    message="Unable to load notice inbox"
                    description={inboxLoadError}
                    style={{ marginBlockEnd: 16 }}
                  />
                ) : null}
                <ProTable<SystemNoticeInboxSummary>
                  rowKey="id"
                  loading={inboxLoading}
                  search={false}
                  options={false}
                  toolBarRender={() => [
                    <Button
                      key="mark-all"
                      icon={<CheckOutlined />}
                      onClick={() => void markAllInboxNoticesRead()}
                      disabled={inboxRows.every((record) => record.read)}
                    >
                      Mark all read
                    </Button>,
                    <Button
                      key="refresh"
                      icon={<ReloadOutlined />}
                      onClick={() => void loadInbox()}
                    >
                      Refresh
                    </Button>,
                    <CurrentPageExportButton<SystemNoticeInboxSummary>
                      key="export"
                      columns={[
                        ...exportColumns,
                        { title: 'Read', dataIndex: 'read' },
                        { title: 'Read At', dataIndex: 'readAt' },
                      ]}
                      resource="core-notice-inbox"
                      rows={inboxRows}
                    />,
                  ]}
                  pagination={{
                    pageSize: 10,
                  }}
                  dataSource={inboxRows}
                  columns={inboxColumns}
                />
              </>
            ),
          },
        ]}
      />
      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={selectedDetail?.title ?? 'System Notice Detail'}
      />
      <ReadOnlyDetailDrawer
        fields={
          selectedInboxDetail
            ? createInboxDetailFields(selectedInboxDetail)
            : []
        }
        onClose={() => setSelectedInboxDetail(undefined)}
        open={Boolean(selectedInboxDetail)}
        title={selectedInboxDetail?.title ?? 'System Notice Inbox Detail'}
      />
      <Modal
        title={editingNotice ? 'Edit System Notice' : 'New System Notice'}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingNotice(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={editingNotice ? 'Save' : 'Create'}
      >
        <Form<NoticeFormValues> form={form} layout="vertical">
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: 'Title is required.' }]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item
            label="Content"
            name="content"
            rules={[{ required: true, message: 'Content is required.' }]}
          >
            <Input.TextArea rows={5} maxLength={2000} />
          </Form.Item>
          <Space align="start" size="middle" wrap>
            <Form.Item
              label="Type"
              name="type"
              rules={[{ required: true, message: 'Type is required.' }]}
            >
              <Select
                style={{ width: 180 }}
                options={[
                  { label: 'announcement', value: 'announcement' },
                  { label: 'maintenance', value: 'maintenance' },
                  { label: 'security', value: 'security' },
                ]}
              />
            </Form.Item>
            <Form.Item
              label="Audience"
              name="audience"
              rules={[{ required: true, message: 'Audience is required.' }]}
            >
              <Select
                style={{ width: 160 }}
                options={[
                  { label: 'all', value: 'all' },
                  { label: 'admin', value: 'admin' },
                ]}
              />
            </Form.Item>
            <Form.Item label="Pinned" name="pinned" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
