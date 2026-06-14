import {
  DeleteOutlined,
  EyeOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import type { CollaborationSummary, MessageSummary } from '@opencore/sdk';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  archiveOpenCoreMessage,
  createOpenCoreMessage,
  deleteOpenCoreMessage,
  getOpenCoreCollaborationSummary,
  getOpenCoreMessage,
  listOpenCoreMessages,
  markOpenCoreMessageRead,
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
import { ReadOnlyDetailDrawer } from '../shared/ReadOnlyDetailDrawer';

type MessageFormValues = {
  body: string;
  businessId?: string;
  businessType?: string;
  recipient: string;
  sender: string;
  title: string;
};

const MESSAGE_CREATE_PERMISSION_MARKER = 'collaboration:message:create';
const MESSAGE_UPDATE_PERMISSION_MARKER = 'collaboration:message:update';
const MESSAGE_DELETE_PERMISSION_MARKER = 'collaboration:message:delete';

const emptySummary: CollaborationSummary = {
  approvals: { approved: 0, pending: 0, rejected: 0, total: 0 },
  messages: { archived: 0, read: 0, total: 0, unread: 0 },
  notices: { archived: 0, draft: 0, published: 0, total: 0 },
  todos: { assigned: 0, canceled: 0, completed: 0, pending: 0, total: 0 },
};

const exportColumns: CurrentPageExportColumn<MessageSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Title', dataIndex: 'title' },
  { title: 'Sender', dataIndex: 'sender' },
  { title: 'Recipient', dataIndex: 'recipient' },
  { title: 'Status', dataIndex: 'status' },
  { title: 'Business Type', dataIndex: 'businessType' },
  { title: 'Business ID', dataIndex: 'businessId' },
  { title: 'Read At', dataIndex: 'readAt' },
  { title: 'Archived At', dataIndex: 'archivedAt' },
  { title: 'Created At', dataIndex: 'createdAt' },
  { title: 'Body', dataIndex: 'body', sensitive: true },
];
const searchFields: CurrentPageSearchField<MessageSummary>[] = [
  'title',
  'sender',
  'recipient',
  'businessType',
  'businessId',
  'status',
];

function statusColor(status: MessageSummary['status']): string {
  if (status === 'unread') return 'gold';
  if (status === 'read') return 'green';
  if (status === 'archived') return 'default';
  return 'red';
}

export default function MessagesPage() {
  const [form] = Form.useForm<MessageFormValues>();
  const [rows, setRows] = useState<readonly MessageSummary[]>([]);
  const [summary, setSummary] = useState<CollaborationSummary>(emptySummary);
  const [selected, setSelected] = useState<MessageSummary>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actingMessageId, setActingMessageId] = useState<string>();

  const filterOptions: CurrentPageFilterOption<MessageSummary>[] = useMemo(
    () => [
      {
        key: 'status',
        options: createCurrentPageFilterOptions(rows, 'status'),
        placeholder: 'Status',
        predicate: (record, value) => record.status === value,
      },
      {
        key: 'recipient',
        options: createCurrentPageFilterOptions(rows, 'recipient'),
        placeholder: 'Recipient',
        predicate: (record, value) => record.recipient === value,
      },
      {
        key: 'sender',
        options: createCurrentPageFilterOptions(rows, 'sender'),
        placeholder: 'Sender',
        predicate: (record, value) => record.sender === value,
      },
    ],
    [rows],
  );

  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<MessageSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search live messages',
      selectFilters: filterOptions,
    });

  const loadMessages = async () => {
    setLoading(true);
    try {
      const [nextSummary, nextRows] = await Promise.all([
        getOpenCoreCollaborationSummary(),
        listOpenCoreMessages(),
      ]);
      setSummary(nextSummary);
      setRows(nextRows);
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setSummary(emptySummary);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load messages.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMessages();
  }, []);

  const openDetail = async (id: string) => {
    try {
      setSelected(await getOpenCoreMessage(id));
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to load message.',
      );
    }
  };

  const openCreateForm = () => {
    form.setFieldsValue({
      body: '',
      businessId: '',
      businessType: '',
      recipient: 'admin',
      sender: 'admin',
      title: '',
    });
    setFormOpen(true);
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const created = await createOpenCoreMessage({
        body: values.body.trim(),
        businessId: values.businessId?.trim() || undefined,
        businessType: values.businessType?.trim() || undefined,
        recipient: values.recipient.trim(),
        sender: values.sender.trim(),
        title: values.title.trim(),
      });
      message.success('Message created.');
      setFormOpen(false);
      setSelected(created);
      await loadMessages();
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to create message.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const markRead = async (record: MessageSummary) => {
    setActingMessageId(record.id);
    try {
      const next = await markOpenCoreMessageRead(record.id);
      setSelected(next);
      message.success('Message marked read.');
      await loadMessages();
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to mark message read.',
      );
    } finally {
      setActingMessageId(undefined);
    }
  };

  const archive = async (record: MessageSummary) => {
    setActingMessageId(record.id);
    try {
      const next = await archiveOpenCoreMessage(record.id);
      setSelected(next);
      message.success('Message archived.');
      await loadMessages();
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to archive message.',
      );
    } finally {
      setActingMessageId(undefined);
    }
  };

  const deleteMessage = async (record: MessageSummary) => {
    setActingMessageId(record.id);
    try {
      await deleteOpenCoreMessage(record.id);
      setSelected((current) =>
        current?.id === record.id ? undefined : current,
      );
      message.success('Message deleted.');
      await loadMessages();
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to delete message.',
      );
    } finally {
      setActingMessageId(undefined);
    }
  };

  const columns: ProColumns<MessageSummary>[] = [
    {
      title: 'Title',
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record.id)}>
          {record.title}
        </Typography.Link>
      ),
    },
    { title: 'Sender', dataIndex: 'sender' },
    { title: 'Recipient', dataIndex: 'recipient' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (_, record) => (
        <Tag color={statusColor(record.status)}>{record.status}</Tag>
      ),
    },
    { title: 'Business', dataIndex: 'businessType' },
    { title: 'Created At', dataIndex: 'createdAt' },
    {
      title: 'Action',
      valueType: 'option',
      render: (_, record) => [
        <Tooltip key="detail" title="Detail">
          <Button
            icon={<EyeOutlined />}
            onClick={() => void openDetail(record.id)}
            size="small"
            type="link"
          />
        </Tooltip>,
        record.status === 'unread' ? (
          <Button
            key="read"
            loading={actingMessageId === record.id}
            onClick={() => void markRead(record)}
            size="small"
            title={MESSAGE_UPDATE_PERMISSION_MARKER}
            type="link"
          >
            Mark read
          </Button>
        ) : null,
        record.status !== 'archived' ? (
          <Button
            icon={<InboxOutlined />}
            key="archive"
            loading={actingMessageId === record.id}
            onClick={() => void archive(record)}
            size="small"
            title={MESSAGE_UPDATE_PERMISSION_MARKER}
            type="link"
          >
            Archive message
          </Button>
        ) : null,
        <Popconfirm
          key="delete"
          onConfirm={() => void deleteMessage(record)}
          title="Delete message?"
        >
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={actingMessageId === record.id}
            size="small"
            title={MESSAGE_DELETE_PERMISSION_MARKER}
            type="link"
          />
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer title="Messages" subTitle="S10 Collaboration">
      {loadError ? (
        <Alert
          action={
            <Button onClick={() => void loadMessages()}>
              Reload live messages
            </Button>
          }
          description={loadError}
          message="Live collaboration messages unavailable"
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="Live messages" value={summary.messages.total} />
        <Statistic title="Unread messages" value={summary.messages.unread} />
        <Statistic title="Read messages" value={summary.messages.read} />
        <Statistic
          title="Archived messages"
          value={summary.messages.archived}
        />
      </Space>
      <ProTable<MessageSummary>
        columns={columns}
        dataSource={filteredRows}
        loading={loading}
        options={false}
        pagination={false}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          filterToolbar,
          <Button
            icon={<ReloadOutlined />}
            key="reload"
            onClick={() => void loadMessages()}
          >
            Reload live messages
          </Button>,
          <Button
            icon={<PlusOutlined />}
            key="create"
            onClick={openCreateForm}
            title={MESSAGE_CREATE_PERMISSION_MARKER}
            type="primary"
          >
            Create message
          </Button>,
          <CurrentPageExportButton<MessageSummary>
            columns={exportColumns}
            key="export"
            resource="collaboration-messages"
            rows={filteredRows}
          />,
        ]}
      />
      <ReadOnlyDetailDrawer
        fields={[
          { label: 'ID', value: selected?.id },
          { label: 'Title', value: selected?.title },
          { label: 'Sender', value: selected?.sender },
          { label: 'Recipient', value: selected?.recipient },
          { label: 'Status', value: selected?.status },
          { label: 'Business Type', value: selected?.businessType },
          { label: 'Business ID', value: selected?.businessId },
          { label: 'Read At', value: selected?.readAt },
          { label: 'Archived At', value: selected?.archivedAt },
          { label: 'Created At', value: selected?.createdAt },
          { label: 'Body', value: selected?.body },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={selected?.title ?? 'Message Detail'}
      />
      <Modal
        confirmLoading={submitting}
        destroyOnClose
        onCancel={() => setFormOpen(false)}
        onOk={() => void submitForm()}
        open={formOpen}
        title="Create message"
      >
        <Form<MessageFormValues> form={form} layout="vertical">
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={160} />
          </Form.Item>
          <Space align="start" style={{ width: '100%' }}>
            <Form.Item
              label="Sender"
              name="sender"
              rules={[{ required: true, whitespace: true }]}
            >
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item
              label="Recipient"
              name="recipient"
              rules={[{ required: true, whitespace: true }]}
            >
              <Input maxLength={80} />
            </Form.Item>
          </Space>
          <Form.Item
            label="Body"
            name="body"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input.TextArea maxLength={1000} rows={4} />
          </Form.Item>
          <Space align="start" style={{ width: '100%' }}>
            <Form.Item label="Business Type" name="businessType">
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item label="Business ID" name="businessId">
              <Input maxLength={120} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
