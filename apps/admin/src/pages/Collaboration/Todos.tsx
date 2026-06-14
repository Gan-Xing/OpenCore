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

const TODO_CREATE_PERMISSION_MARKER = 'collaboration:todo:create';
const TODO_UPDATE_PERMISSION_MARKER = 'collaboration:todo:update';
const DEFAULT_TODO_ACTOR = 'admin';

const exportColumns: CurrentPageExportColumn<TodoSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Title', dataIndex: 'title' },
  { title: 'Source', dataIndex: 'sourceType' },
  { title: 'Business Type', dataIndex: 'businessType' },
  { title: 'Business ID', dataIndex: 'businessId' },
  { title: 'Assignee', dataIndex: 'assignee' },
  { title: 'Status', dataIndex: 'status' },
  {
    title: 'Timeline',
    renderText: (record) => `${record.timeline.length} events`,
  },
  { title: 'Completed At', dataIndex: 'completedAt' },
  { title: 'Canceled At', dataIndex: 'canceledAt' },
  { title: 'Created At', dataIndex: 'createdAt' },
  { title: 'Description', dataIndex: 'description', sensitive: true },
];
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

export default function TodosPage() {
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
        placeholder: 'Status',
        predicate: (record, value) => record.status === value,
      },
      {
        key: 'assignee',
        options: createCurrentPageFilterOptions(rows, 'assignee'),
        placeholder: 'Assignee',
        predicate: (record, value) => record.assignee === value,
      },
      {
        key: 'sourceType',
        options: createCurrentPageFilterOptions(rows, 'sourceType'),
        placeholder: 'Source',
        predicate: (record, value) => record.sourceType === value,
      },
    ],
    [rows],
  );

  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<TodoSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search live todos',
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
        error instanceof Error ? error.message : 'Unable to load todos.',
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
        error instanceof Error ? error.message : 'Unable to load todo.',
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
      message.success('Todo created.');
      setCreateOpen(false);
      setSelected(created);
      await loadTodos();
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to create todo.',
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
      message.success('Todo assigned.');
      setAssigningTodo(undefined);
      setSelected(next);
      await loadTodos();
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to assign todo.',
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
      message.success('Todo completed.');
      await loadTodos();
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to complete todo.',
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
      message.success('Todo canceled.');
      await loadTodos();
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to cancel todo.',
      );
    } finally {
      setActingTodoId(undefined);
    }
  };

  const columns: ProColumns<TodoSummary>[] = [
    {
      title: 'Title',
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record.id)}>
          {record.title}
        </Typography.Link>
      ),
    },
    { title: 'Source', dataIndex: 'sourceType' },
    { title: 'Assignee', dataIndex: 'assignee' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (_, record) => (
        <Tag color={statusColor(record.status)}>{record.status}</Tag>
      ),
    },
    {
      title: 'Timeline',
      dataIndex: 'timeline',
      renderText: (_, record) => `${record.timeline.length} events`,
    },
    {
      title: 'Action Policy',
      render: (_, record) => (
        <Tag color={isTerminalTodo(record.status) ? 'default' : 'green'}>
          {isTerminalTodo(record.status)
            ? 'terminal'
            : 'assign/complete/cancel'}
        </Tag>
      ),
    },
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
            Assign todo
          </Button>
        ),
        isTerminalTodo(record.status) ? null : (
          <Popconfirm
            key="complete"
            onConfirm={() => void complete(record)}
            title="Complete todo?"
          >
            <Button
              icon={<CheckCircleOutlined />}
              loading={actingTodoId === record.id}
              size="small"
              title={TODO_UPDATE_PERMISSION_MARKER}
              type="link"
            >
              Complete todo
            </Button>
          </Popconfirm>
        ),
        isTerminalTodo(record.status) ? null : (
          <Popconfirm
            key="cancel"
            onConfirm={() => void cancel(record)}
            title="Cancel todo?"
          >
            <Button
              danger
              icon={<CloseCircleOutlined />}
              loading={actingTodoId === record.id}
              size="small"
              title={TODO_UPDATE_PERMISSION_MARKER}
              type="link"
            >
              Cancel todo
            </Button>
          </Popconfirm>
        ),
      ],
    },
  ];

  return (
    <PageContainer title="Todos" subTitle="S10 Collaboration">
      {loadError ? (
        <Alert
          action={
            <Button onClick={() => void loadTodos()}>Reload live todos</Button>
          }
          description={loadError}
          message="Live collaboration todos unavailable"
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="Live todos" value={stats.total} />
        <Statistic title="Pending todos" value={stats.pending} />
        <Statistic title="Assigned todos" value={stats.assigned} />
        <Statistic title="Completed todos" value={stats.completed} />
        <Statistic title="Canceled todos" value={stats.canceled} />
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
            Reload live todos
          </Button>,
          <Button
            icon={<PlusOutlined />}
            key="create"
            onClick={openCreateForm}
            title={TODO_CREATE_PERMISSION_MARKER}
            type="primary"
          >
            Create todo
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
          { label: 'ID', value: selected?.id },
          { label: 'Title', value: selected?.title },
          { label: 'Source', value: selected?.sourceType },
          { label: 'Business Type', value: selected?.businessType },
          { label: 'Business ID', value: selected?.businessId },
          { label: 'Assignee', value: selected?.assignee },
          { label: 'Status', value: selected?.status },
          { label: 'Completed At', value: selected?.completedAt },
          { label: 'Canceled At', value: selected?.canceledAt },
          { label: 'Created At', value: selected?.createdAt },
          { label: 'Description', value: selected?.description },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        timeline={selected?.timeline}
        title={selected?.title ?? 'Todo Detail'}
      />
      <Modal
        confirmLoading={submitting}
        destroyOnClose
        onCancel={() => setCreateOpen(false)}
        onOk={() => void submitCreate()}
        open={createOpen}
        title="Create todo"
      >
        <Form<TodoFormValues> form={createForm} layout="vertical">
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={160} />
          </Form.Item>
          <Space align="start" style={{ width: '100%' }}>
            <Form.Item
              label="Source"
              name="sourceType"
              rules={[{ required: true, whitespace: true }]}
            >
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item
              label="Assignee"
              name="assignee"
              rules={[{ required: true, whitespace: true }]}
            >
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item
              label="Actor"
              name="actor"
              rules={[{ required: true, whitespace: true }]}
            >
              <Input maxLength={80} />
            </Form.Item>
          </Space>
          <Form.Item label="Description" name="description">
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
      <Modal
        confirmLoading={submitting}
        destroyOnClose
        onCancel={() => setAssigningTodo(undefined)}
        onOk={() => void submitAssign()}
        open={Boolean(assigningTodo)}
        title="Assign todo"
      >
        <Form<AssignFormValues> form={assignForm} layout="vertical">
          <Form.Item
            label="Assignee"
            name="assignee"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item
            label="Actor"
            name="actor"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={80} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
