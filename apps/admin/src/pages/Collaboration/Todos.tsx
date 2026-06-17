import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import type { TodoSummary } from '@opencore/sdk';
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
  assignOpenCoreTodo,
  cancelOpenCoreTodo,
  completeOpenCoreTodo,
  createOpenCoreTodo,
  getOpenCoreTodo,
  listOpenCoreTodos,
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

type TodoFormValues = {
  actor: string;
  assignee: string;
  businessId?: string;
  businessType?: string;
  description?: string;
  sourceType: string;
  title: string;
};

type AssignFormValues = {
  actor: string;
  assignee: string;
};

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const TODO_CREATE_PERMISSION_MARKER = 'collaboration:todo:create';
const TODO_UPDATE_PERMISSION_MARKER = 'collaboration:todo:update';
const DEFAULT_TODO_ACTOR = 'admin';

const searchFields: CurrentPageSearchField<TodoSummary>[] = [
  'title',
  'sourceType',
  'businessType',
  'businessId',
  'assignee',
  'status',
];

function statusColor(status: TodoSummary['status']): string {
  if (status === 'pending') return 'gold';
  if (status === 'assigned') return 'blue';
  if (status === 'completed') return 'green';
  return 'default';
}

function isTerminalTodo(status: TodoSummary['status']): boolean {
  return status === 'completed' || status === 'canceled';
}

function countByStatus(
  rows: readonly TodoSummary[],
  status: TodoSummary['status'],
): number {
  return rows.filter((row) => row.status === status).length;
}

function createExportColumns(
  formatMessage: FormatMessage,
): CurrentPageExportColumn<TodoSummary>[] {
  return [
    {
      title: formatMessage('pages.collaboration.common.fields.id', 'ID'),
      dataIndex: 'id',
    },
    {
      title: formatMessage('pages.collaboration.todos.fields.title', 'Title'),
      dataIndex: 'title',
    },
    {
      title: formatMessage('pages.collaboration.todos.fields.source', 'Source'),
      dataIndex: 'sourceType',
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
        'pages.collaboration.todos.fields.assignee',
        'Assignee',
      ),
      dataIndex: 'assignee',
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
        'pages.collaboration.common.fields.timeline',
        'Timeline',
      ),
      renderText: (record) =>
        formatMessage(
          'pages.collaboration.common.timeline.events',
          '{count} events',
          {
            count: record.timeline.length,
          },
        ),
    },
    {
      title: formatMessage(
        'pages.collaboration.todos.fields.completedAt',
        'Completed At',
      ),
      dataIndex: 'completedAt',
    },
    {
      title: formatMessage(
        'pages.collaboration.todos.fields.canceledAt',
        'Canceled At',
      ),
      dataIndex: 'canceledAt',
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
        'pages.collaboration.todos.fields.description',
        'Description',
      ),
      dataIndex: 'description',
      sensitive: true,
    },
  ];
}

export default function TodosPage() {
  const intl = useIntl();
  const [createForm] = Form.useForm<TodoFormValues>();
  const [assignForm] = Form.useForm<AssignFormValues>();
  const [rows, setRows] = useState<readonly TodoSummary[]>([]);
  const [selected, setSelected] = useState<TodoSummary>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [assigningTodo, setAssigningTodo] = useState<TodoSummary>();
  const [submitting, setSubmitting] = useState(false);
  const [actingTodoId, setActingTodoId] = useState<string>();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const statusLabels = useMemo(
    () => ({
      assigned: formatMessage(
        'pages.collaboration.todos.status.assigned',
        'assigned',
      ),
      canceled: formatMessage(
        'pages.collaboration.todos.status.canceled',
        'canceled',
      ),
      completed: formatMessage(
        'pages.collaboration.todos.status.completed',
        'completed',
      ),
      pending: formatMessage(
        'pages.collaboration.todos.status.pending',
        'pending',
      ),
    }),
    [formatMessage],
  );
  const actionPolicyLabels = useMemo(
    () => ({
      active: formatMessage(
        'pages.collaboration.todos.policy.assignCompleteCancel',
        'assign/complete/cancel',
      ),
      terminal: formatMessage(
        'pages.collaboration.common.policy.terminal',
        'terminal',
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

  const stats = useMemo(
    () => ({
      assigned: countByStatus(rows, 'assigned'),
      canceled: countByStatus(rows, 'canceled'),
      completed: countByStatus(rows, 'completed'),
      pending: countByStatus(rows, 'pending'),
      total: rows.length,
    }),
    [rows],
  );

  const filterOptions: CurrentPageFilterOption<TodoSummary>[] = useMemo(
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
        key: 'assignee',
        options: createCurrentPageFilterOptions(rows, 'assignee'),
        placeholder: formatMessage(
          'pages.collaboration.todos.fields.assignee',
          'Assignee',
        ),
        predicate: (record, value) => record.assignee === value,
      },
      {
        key: 'sourceType',
        options: createCurrentPageFilterOptions(rows, 'sourceType'),
        placeholder: formatMessage(
          'pages.collaboration.todos.fields.source',
          'Source',
        ),
        predicate: (record, value) => record.sourceType === value,
      },
    ],
    [formatMessage, rows],
  );

  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<TodoSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.collaboration.todos.search.placeholder',
        'Search live todos',
      ),
      selectFilters: filterOptions,
    });

  const loadTodos = async () => {
    setLoading(true);
    try {
      setRows(await listOpenCoreTodos());
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.todos.load.failure',
              'Unable to load todos.',
            ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTodos();
  }, []);

  const openDetail = async (id: string) => {
    try {
      setSelected(await getOpenCoreTodo(id));
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.todos.detail.loadFailure',
              'Unable to load todo.',
            ),
      );
    }
  };

  const openCreateForm = () => {
    createForm.setFieldsValue({
      actor: DEFAULT_TODO_ACTOR,
      assignee: 'admin',
      businessId: '',
      businessType: '',
      description: '',
      sourceType: 'manual',
      title: '',
    });
    setCreateOpen(true);
  };

  const openAssignForm = (record: TodoSummary) => {
    assignForm.setFieldsValue({
      actor: DEFAULT_TODO_ACTOR,
      assignee: record.assignee,
    });
    setAssigningTodo(record);
  };

  const submitCreate = async () => {
    const values = await createForm.validateFields();
    setSubmitting(true);
    try {
      const created = await createOpenCoreTodo({
        actor: values.actor.trim(),
        assignee: values.assignee.trim(),
        businessId: values.businessId?.trim() || undefined,
        businessType: values.businessType?.trim() || undefined,
        description: values.description?.trim() || undefined,
        sourceType: values.sourceType.trim(),
        title: values.title.trim(),
      });
      message.success(
        formatMessage(
          'pages.collaboration.todos.messages.created',
          'Todo created.',
        ),
      );
      setCreateOpen(false);
      setSelected(created);
      await loadTodos();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.todos.messages.createFailure',
              'Unable to create todo.',
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitAssign = async () => {
    if (!assigningTodo) return;

    const values = await assignForm.validateFields();
    setSubmitting(true);
    try {
      const next = await assignOpenCoreTodo(assigningTodo.id, {
        actor: values.actor.trim(),
        assignee: values.assignee.trim(),
      });
      message.success(
        formatMessage(
          'pages.collaboration.todos.messages.assigned',
          'Todo assigned.',
        ),
      );
      setAssigningTodo(undefined);
      setSelected(next);
      await loadTodos();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.todos.messages.assignFailure',
              'Unable to assign todo.',
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const complete = async (record: TodoSummary) => {
    setActingTodoId(record.id);
    try {
      const next = await completeOpenCoreTodo(record.id, {
        actor: DEFAULT_TODO_ACTOR,
      });
      setSelected(next);
      message.success(
        formatMessage(
          'pages.collaboration.todos.messages.completed',
          'Todo completed.',
        ),
      );
      await loadTodos();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.todos.messages.completeFailure',
              'Unable to complete todo.',
            ),
      );
    } finally {
      setActingTodoId(undefined);
    }
  };

  const cancel = async (record: TodoSummary) => {
    setActingTodoId(record.id);
    try {
      const next = await cancelOpenCoreTodo(record.id, {
        actor: DEFAULT_TODO_ACTOR,
      });
      setSelected(next);
      message.success(
        formatMessage(
          'pages.collaboration.todos.messages.canceled',
          'Todo canceled.',
        ),
      );
      await loadTodos();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.todos.messages.cancelFailure',
              'Unable to cancel todo.',
            ),
      );
    } finally {
      setActingTodoId(undefined);
    }
  };

  const columns: ProColumns<TodoSummary>[] = [
    {
      title: formatMessage('pages.collaboration.todos.fields.title', 'Title'),
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record.id)}>
          {record.title}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.collaboration.todos.fields.source', 'Source'),
      dataIndex: 'sourceType',
    },
    {
      title: formatMessage(
        'pages.collaboration.todos.fields.assignee',
        'Assignee',
      ),
      dataIndex: 'assignee',
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
        'pages.collaboration.common.fields.timeline',
        'Timeline',
      ),
      dataIndex: 'timeline',
      renderText: (_, record) =>
        formatMessage(
          'pages.collaboration.common.timeline.events',
          '{count} events',
          {
            count: record.timeline.length,
          },
        ),
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.actionPolicy',
        'Action Policy',
      ),
      render: (_, record) => (
        <Tag color={isTerminalTodo(record.status) ? 'default' : 'green'}>
          {isTerminalTodo(record.status)
            ? actionPolicyLabels.terminal
            : actionPolicyLabels.active}
        </Tag>
      ),
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
        isTerminalTodo(record.status) ? null : (
          <Button
            icon={<TeamOutlined />}
            key="assign"
            loading={actingTodoId === record.id}
            onClick={() => openAssignForm(record)}
            size="small"
            title={TODO_UPDATE_PERMISSION_MARKER}
            type="link"
          >
            {formatMessage(
              'pages.collaboration.todos.actions.assign',
              'Assign todo',
            )}
          </Button>
        ),
        isTerminalTodo(record.status) ? null : (
          <Popconfirm
            key="complete"
            onConfirm={() => void complete(record)}
            title={formatMessage(
              'pages.collaboration.todos.confirm.complete',
              'Complete todo?',
            )}
          >
            <Button
              icon={<CheckCircleOutlined />}
              loading={actingTodoId === record.id}
              size="small"
              title={TODO_UPDATE_PERMISSION_MARKER}
              type="link"
            >
              {formatMessage(
                'pages.collaboration.todos.actions.complete',
                'Complete todo',
              )}
            </Button>
          </Popconfirm>
        ),
        isTerminalTodo(record.status) ? null : (
          <Popconfirm
            key="cancel"
            onConfirm={() => void cancel(record)}
            title={formatMessage(
              'pages.collaboration.todos.confirm.cancel',
              'Cancel todo?',
            )}
          >
            <Button
              danger
              icon={<CloseCircleOutlined />}
              loading={actingTodoId === record.id}
              size="small"
              title={TODO_UPDATE_PERMISSION_MARKER}
              type="link"
            >
              {formatMessage(
                'pages.collaboration.todos.actions.cancel',
                'Cancel todo',
              )}
            </Button>
          </Popconfirm>
        ),
      ],
    },
  ];

  return (
    <PageContainer
      title={formatMessage('pages.collaboration.todos.title', 'Todos')}
      subTitle={formatMessage(
        'pages.collaboration.section',
        'S10 Collaboration',
      )}
    >
      {loadError ? (
        <Alert
          action={
            <Button onClick={() => void loadTodos()}>
              {formatMessage(
                'pages.collaboration.todos.actions.reload',
                'Reload live todos',
              )}
            </Button>
          }
          description={loadError}
          message={formatMessage(
            'pages.collaboration.todos.load.liveFailure',
            'Live collaboration todos unavailable',
          )}
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.collaboration.todos.stats.live',
            'Live todos',
          )}
          value={stats.total}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.todos.stats.pending',
            'Pending todos',
          )}
          value={stats.pending}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.todos.stats.assigned',
            'Assigned todos',
          )}
          value={stats.assigned}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.todos.stats.completed',
            'Completed todos',
          )}
          value={stats.completed}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.todos.stats.canceled',
            'Canceled todos',
          )}
          value={stats.canceled}
        />
      </Space>
      <ProTable<TodoSummary>
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
            onClick={() => void loadTodos()}
          >
            {formatMessage(
              'pages.collaboration.todos.actions.reload',
              'Reload live todos',
            )}
          </Button>,
          <Button
            icon={<PlusOutlined />}
            key="create"
            onClick={openCreateForm}
            title={TODO_CREATE_PERMISSION_MARKER}
            type="primary"
          >
            {formatMessage(
              'pages.collaboration.todos.actions.create',
              'Create todo',
            )}
          </Button>,
          <CurrentPageExportButton<TodoSummary>
            columns={exportColumns}
            key="export"
            resource="collaboration-todos"
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
              'pages.collaboration.todos.fields.title',
              'Title',
            ),
            value: selected?.title,
          },
          {
            label: formatMessage(
              'pages.collaboration.todos.fields.source',
              'Source',
            ),
            value: selected?.sourceType,
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
              'pages.collaboration.todos.fields.assignee',
              'Assignee',
            ),
            value: selected?.assignee,
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
              'pages.collaboration.todos.fields.completedAt',
              'Completed At',
            ),
            value: selected?.completedAt,
          },
          {
            label: formatMessage(
              'pages.collaboration.todos.fields.canceledAt',
              'Canceled At',
            ),
            value: selected?.canceledAt,
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
              'pages.collaboration.todos.fields.description',
              'Description',
            ),
            value: selected?.description,
          },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        timeline={selected?.timeline}
        title={
          selected?.title ??
          formatMessage('pages.collaboration.todos.detail.title', 'Todo Detail')
        }
      />
      <Modal
        confirmLoading={submitting}
        destroyOnClose
        onCancel={() => setCreateOpen(false)}
        onOk={() => void submitCreate()}
        open={createOpen}
        title={formatMessage(
          'pages.collaboration.todos.actions.create',
          'Create todo',
        )}
      >
        <Form<TodoFormValues> form={createForm} layout="vertical">
          <Form.Item
            label={formatMessage(
              'pages.collaboration.todos.fields.title',
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
                'pages.collaboration.todos.fields.source',
                'Source',
              )}
              name="sourceType"
              rules={[requiredRule]}
            >
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.collaboration.todos.fields.assignee',
                'Assignee',
              )}
              name="assignee"
              rules={[requiredRule]}
            >
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.collaboration.common.fields.actor',
                'Actor',
              )}
              name="actor"
              rules={[requiredRule]}
            >
              <Input maxLength={80} />
            </Form.Item>
          </Space>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.todos.fields.description',
              'Description',
            )}
            name="description"
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
      <Modal
        confirmLoading={submitting}
        destroyOnClose
        onCancel={() => setAssigningTodo(undefined)}
        onOk={() => void submitAssign()}
        open={Boolean(assigningTodo)}
        title={formatMessage(
          'pages.collaboration.todos.actions.assign',
          'Assign todo',
        )}
      >
        <Form<AssignFormValues> form={assignForm} layout="vertical">
          <Form.Item
            label={formatMessage(
              'pages.collaboration.todos.fields.assignee',
              'Assignee',
            )}
            name="assignee"
            rules={[requiredRule]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.common.fields.actor',
              'Actor',
            )}
            name="actor"
            rules={[requiredRule]}
          >
            <Input maxLength={80} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
