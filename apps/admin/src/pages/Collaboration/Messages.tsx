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
import { useIntl } from '@umijs/max';
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
import { useCallback, useEffect, useMemo, useState } from 'react';
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

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const MESSAGE_CREATE_PERMISSION_MARKER = 'collaboration:message:create';
const MESSAGE_UPDATE_PERMISSION_MARKER = 'collaboration:message:update';
const MESSAGE_DELETE_PERMISSION_MARKER = 'collaboration:message:delete';

const emptySummary: CollaborationSummary = {
  approvals: { approved: 0, pending: 0, rejected: 0, total: 0 },
  messages: { archived: 0, read: 0, total: 0, unread: 0 },
  notices: { archived: 0, draft: 0, published: 0, total: 0 },
  todos: { assigned: 0, canceled: 0, completed: 0, pending: 0, total: 0 },
};

const searchFields: CurrentPageSearchField<MessageSummary>[] = [
  'tenantId',
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

function createExportColumns(
  formatMessage: FormatMessage,
): CurrentPageExportColumn<MessageSummary>[] {
  return [
    {
      title: formatMessage('pages.collaboration.common.fields.id', 'ID'),
      dataIndex: 'id',
    },
    {
      title: formatMessage(
        'pages.collaboration.messages.fields.tenantId',
        'Tenant ID',
      ),
      dataIndex: 'tenantId',
    },
    {
      title: formatMessage(
        'pages.collaboration.messages.fields.title',
        'Title',
      ),
      dataIndex: 'title',
    },
    {
      title: formatMessage(
        'pages.collaboration.messages.fields.sender',
        'Sender',
      ),
      dataIndex: 'sender',
    },
    {
      title: formatMessage(
        'pages.collaboration.messages.fields.recipient',
        'Recipient',
      ),
      dataIndex: 'recipient',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.status',
        'Status',
      ),
      dataIndex: 'status',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.businessType',
        'Business Type',
      ),
      dataIndex: 'businessType',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.businessId',
        'Business ID',
      ),
      dataIndex: 'businessId',
    },
    {
      title: formatMessage(
        'pages.collaboration.messages.fields.readAt',
        'Read At',
      ),
      dataIndex: 'readAt',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.archivedAt',
        'Archived At',
      ),
      dataIndex: 'archivedAt',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.createdAt',
        'Created At',
      ),
      dataIndex: 'createdAt',
    },
    {
      title: formatMessage('pages.collaboration.messages.fields.body', 'Body'),
      dataIndex: 'body',
      sensitive: true,
    },
  ];
}

export default function MessagesPage() {
  const intl = useIntl();
  const [form] = Form.useForm<MessageFormValues>();
  const [rows, setRows] = useState<readonly MessageSummary[]>([]);
  const [summary, setSummary] = useState<CollaborationSummary>(emptySummary);
  const [selected, setSelected] = useState<MessageSummary>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actingMessageId, setActingMessageId] = useState<string>();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const statusLabels = useMemo(
    () => ({
      archived: formatMessage(
        'pages.collaboration.messages.status.archived',
        'archived',
      ),
      deleted: formatMessage(
        'pages.collaboration.messages.status.deleted',
        'deleted',
      ),
      read: formatMessage('pages.collaboration.messages.status.read', 'read'),
      unread: formatMessage(
        'pages.collaboration.messages.status.unread',
        'unread',
      ),
    }),
    [formatMessage],
  );
  const exportColumns = useMemo(
    () => createExportColumns(formatMessage),
    [formatMessage],
  );
  const requiredRule = useMemo(
    () => ({
      message: formatMessage(
        'pages.collaboration.common.validation.required',
        'This field is required.',
      ),
      required: true,
      whitespace: true,
    }),
    [formatMessage],
  );

  const filterOptions: CurrentPageFilterOption<MessageSummary>[] = useMemo(
    () => [
      {
        key: 'status',
        options: createCurrentPageFilterOptions(rows, 'status'),
        placeholder: formatMessage(
          'pages.collaboration.common.fields.status',
          'Status',
        ),
        predicate: (record, value) => record.status === value,
      },
      {
        key: 'recipient',
        options: createCurrentPageFilterOptions(rows, 'recipient'),
        placeholder: formatMessage(
          'pages.collaboration.messages.fields.recipient',
          'Recipient',
        ),
        predicate: (record, value) => record.recipient === value,
      },
      {
        key: 'sender',
        options: createCurrentPageFilterOptions(rows, 'sender'),
        placeholder: formatMessage(
          'pages.collaboration.messages.fields.sender',
          'Sender',
        ),
        predicate: (record, value) => record.sender === value,
      },
    ],
    [formatMessage, rows],
  );

  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<MessageSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.collaboration.messages.search.placeholder',
        'Search live messages',
      ),
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
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.messages.load.failure',
              'Unable to load messages.',
            ),
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
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.messages.detail.loadFailure',
              'Unable to load message.',
            ),
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
      message.success(
        formatMessage(
          'pages.collaboration.messages.messages.created',
          'Message created.',
        ),
      );
      setFormOpen(false);
      setSelected(created);
      await loadMessages();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.messages.messages.createFailure',
              'Unable to create message.',
            ),
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
      message.success(
        formatMessage(
          'pages.collaboration.messages.messages.markedRead',
          'Message marked read.',
        ),
      );
      await loadMessages();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.messages.messages.markReadFailure',
              'Unable to mark message read.',
            ),
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
      message.success(
        formatMessage(
          'pages.collaboration.messages.messages.archived',
          'Message archived.',
        ),
      );
      await loadMessages();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.messages.messages.archiveFailure',
              'Unable to archive message.',
            ),
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
      message.success(
        formatMessage(
          'pages.collaboration.messages.messages.deleted',
          'Message deleted.',
        ),
      );
      await loadMessages();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.messages.messages.deleteFailure',
              'Unable to delete message.',
            ),
      );
    } finally {
      setActingMessageId(undefined);
    }
  };

  const columns: ProColumns<MessageSummary>[] = [
    {
      title: formatMessage(
        'pages.collaboration.messages.fields.tenantId',
        'Tenant ID',
      ),
      dataIndex: 'tenantId',
      width: 160,
    },
    {
      title: formatMessage(
        'pages.collaboration.messages.fields.title',
        'Title',
      ),
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record.id)}>
          {record.title}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage(
        'pages.collaboration.messages.fields.sender',
        'Sender',
      ),
      dataIndex: 'sender',
    },
    {
      title: formatMessage(
        'pages.collaboration.messages.fields.recipient',
        'Recipient',
      ),
      dataIndex: 'recipient',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.status',
        'Status',
      ),
      dataIndex: 'status',
      render: (_, record) => (
        <Tag color={statusColor(record.status)}>
          {statusLabels[record.status]}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.business',
        'Business',
      ),
      dataIndex: 'businessType',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.createdAt',
        'Created At',
      ),
      dataIndex: 'createdAt',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.actions.column',
        'Action',
      ),
      valueType: 'option',
      render: (_, record) => [
        <Tooltip
          key="detail"
          title={formatMessage(
            'pages.collaboration.common.actions.detail',
            'Detail',
          )}
        >
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
            {formatMessage(
              'pages.collaboration.messages.actions.markRead',
              'Mark read',
            )}
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
            {formatMessage(
              'pages.collaboration.messages.actions.archive',
              'Archive message',
            )}
          </Button>
        ) : null,
        <Popconfirm
          key="delete"
          onConfirm={() => void deleteMessage(record)}
          title={formatMessage(
            'pages.collaboration.messages.confirm.delete',
            'Delete message?',
          )}
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
    <PageContainer
      title={formatMessage('pages.collaboration.messages.title', 'Messages')}
      subTitle={formatMessage('pages.collaboration.section', 'Collaboration')}
    >
      {loadError ? (
        <Alert
          action={
            <Button onClick={() => void loadMessages()}>
              {formatMessage(
                'pages.collaboration.messages.actions.reload',
                'Reload live messages',
              )}
            </Button>
          }
          description={loadError}
          message={formatMessage(
            'pages.collaboration.messages.load.liveFailure',
            'Live collaboration messages unavailable',
          )}
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.collaboration.messages.stats.live',
            'Live messages',
          )}
          value={summary.messages.total}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.messages.stats.unread',
            'Unread messages',
          )}
          value={summary.messages.unread}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.messages.stats.read',
            'Read messages',
          )}
          value={summary.messages.read}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.messages.stats.archived',
            'Archived messages',
          )}
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
            {formatMessage(
              'pages.collaboration.messages.actions.reload',
              'Reload live messages',
            )}
          </Button>,
          <Button
            icon={<PlusOutlined />}
            key="create"
            onClick={openCreateForm}
            title={MESSAGE_CREATE_PERMISSION_MARKER}
            type="primary"
          >
            {formatMessage(
              'pages.collaboration.messages.actions.create',
              'Create message',
            )}
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
          {
            label: formatMessage('pages.collaboration.common.fields.id', 'ID'),
            value: selected?.id,
          },
          {
            label: formatMessage(
              'pages.collaboration.messages.fields.tenantId',
              'Tenant ID',
            ),
            value: selected?.tenantId,
          },
          {
            label: formatMessage(
              'pages.collaboration.messages.fields.title',
              'Title',
            ),
            value: selected?.title,
          },
          {
            label: formatMessage(
              'pages.collaboration.messages.fields.sender',
              'Sender',
            ),
            value: selected?.sender,
          },
          {
            label: formatMessage(
              'pages.collaboration.messages.fields.recipient',
              'Recipient',
            ),
            value: selected?.recipient,
          },
          {
            label: formatMessage(
              'pages.collaboration.common.fields.status',
              'Status',
            ),
            value: selected ? statusLabels[selected.status] : undefined,
          },
          {
            label: formatMessage(
              'pages.collaboration.common.fields.businessType',
              'Business Type',
            ),
            value: selected?.businessType,
          },
          {
            label: formatMessage(
              'pages.collaboration.common.fields.businessId',
              'Business ID',
            ),
            value: selected?.businessId,
          },
          {
            label: formatMessage(
              'pages.collaboration.messages.fields.readAt',
              'Read At',
            ),
            value: selected?.readAt,
          },
          {
            label: formatMessage(
              'pages.collaboration.common.fields.archivedAt',
              'Archived At',
            ),
            value: selected?.archivedAt,
          },
          {
            label: formatMessage(
              'pages.collaboration.common.fields.createdAt',
              'Created At',
            ),
            value: selected?.createdAt,
          },
          {
            label: formatMessage(
              'pages.collaboration.messages.fields.body',
              'Body',
            ),
            value: selected?.body,
          },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={
          selected?.title ??
          formatMessage(
            'pages.collaboration.messages.detail.title',
            'Message Detail',
          )
        }
      />
      <Modal
        confirmLoading={submitting}
        destroyOnClose
        onCancel={() => setFormOpen(false)}
        onOk={() => void submitForm()}
        open={formOpen}
        title={formatMessage(
          'pages.collaboration.messages.actions.create',
          'Create message',
        )}
      >
        <Form<MessageFormValues> form={form} layout="vertical">
          <Form.Item
            label={formatMessage(
              'pages.collaboration.messages.fields.title',
              'Title',
            )}
            name="title"
            rules={[requiredRule]}
          >
            <Input maxLength={160} />
          </Form.Item>
          <Space align="start" style={{ width: '100%' }}>
            <Form.Item
              label={formatMessage(
                'pages.collaboration.messages.fields.sender',
                'Sender',
              )}
              name="sender"
              rules={[requiredRule]}
            >
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.collaboration.messages.fields.recipient',
                'Recipient',
              )}
              name="recipient"
              rules={[requiredRule]}
            >
              <Input maxLength={80} />
            </Form.Item>
          </Space>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.messages.fields.body',
              'Body',
            )}
            name="body"
            rules={[requiredRule]}
          >
            <Input.TextArea maxLength={1000} rows={4} />
          </Form.Item>
          <Space align="start" style={{ width: '100%' }}>
            <Form.Item
              label={formatMessage(
                'pages.collaboration.common.fields.businessType',
                'Business Type',
              )}
              name="businessType"
            >
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.collaboration.common.fields.businessId',
                'Business ID',
              )}
              name="businessId"
            >
              <Input maxLength={120} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
