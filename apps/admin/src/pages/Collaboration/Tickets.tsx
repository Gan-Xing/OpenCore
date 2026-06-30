import {
  CloseCircleOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  PaperClipOutlined,
  PlusOutlined,
  ReloadOutlined,
  RollbackOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import type {
  TicketCategorySummary,
  TicketDashboardSummary,
  TicketPriority,
  TicketStatus,
  TicketSummary,
} from '@opencore/sdk';
import { useAccess, useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addOpenCoreTicketAttachment,
  addOpenCoreTicketComment,
  archiveOpenCoreTicket,
  assignOpenCoreTicket,
  batchArchiveOpenCoreTickets,
  batchAssignOpenCoreTickets,
  batchCloseOpenCoreTickets,
  changeOpenCoreTicketStatus,
  closeOpenCoreTicket,
  createOpenCoreTicket,
  exportOpenCoreTicketTransitions,
  exportOpenCoreTickets,
  getOpenCoreTicketDashboardSummary,
  getOpenCoreTicket,
  listOpenCoreTicketCategories,
  listOpenCoreTickets,
  reopenOpenCoreTicket,
  sendOpenCoreTicketSlaReminders,
  updateOpenCoreTicket,
} from '@/services/opencore/platform';
import { downloadBase64File } from '../shared/downloadBase64File';
import {
  createCurrentPageFilterOptions,
  useCurrentPageFilters,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../shared/CurrentPageFilters';

type TicketFormValues = {
  assignee?: string;
  categoryId?: string;
  createdBy: string;
  description: string;
  dueAt?: string;
  priority?: TicketPriority;
  responseDueAt?: string;
  resolutionDueAt?: string;
  title: string;
};

type AssignFormValues = {
  actor: string;
  assignee: string;
  comment?: string;
};

type StatusFormValues = {
  actor: string;
  comment?: string;
  status: TicketStatus;
};

type CommentFormValues = {
  author: string;
  body: string;
};

type AttachmentFormValues = {
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  storageKey: string;
  uploadedBy: string;
};

type BatchAssignFormValues = AssignFormValues;

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const TICKET_CREATE_PERMISSION_MARKER = 'collaboration:ticket:create';
const TICKET_UPDATE_PERMISSION_MARKER = 'collaboration:ticket:update';
const TICKET_ASSIGN_PERMISSION_MARKER = 'collaboration:ticket:assign';
const TICKET_COMMENT_PERMISSION_MARKER = 'collaboration:ticket:comment';
const TICKET_CLOSE_PERMISSION_MARKER = 'collaboration:ticket:close';
const TICKET_DELETE_PERMISSION_MARKER = 'collaboration:ticket:delete';
const DEFAULT_TICKET_ACTOR = 'admin';

const ticketStatuses: TicketStatus[] = [
  'new',
  'processing',
  'pending_confirmation',
  'resolved',
  'closed',
  'canceled',
];

const ticketPriorities: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

const searchFields: CurrentPageSearchField<TicketSummary>[] = [
  'tenantId',
  'number',
  'title',
  'description',
  'status',
  'priority',
  'createdBy',
  'assignee',
];

function statusColor(status: TicketStatus): string {
  if (status === 'new') return 'gold';
  if (status === 'processing') return 'blue';
  if (status === 'pending_confirmation') return 'purple';
  if (status === 'resolved') return 'green';
  if (status === 'closed') return 'default';
  return 'red';
}

function priorityColor(priority: TicketPriority): string {
  if (priority === 'urgent') return 'red';
  if (priority === 'high') return 'orange';
  if (priority === 'medium') return 'blue';
  return 'default';
}

function countByStatus(
  rows: readonly TicketSummary[],
  status: TicketStatus,
): number {
  return rows.filter((row) => row.status === status).length;
}

function findCategoryName(
  categories: readonly TicketCategorySummary[],
  categoryId?: string,
): string {
  return (
    categories.find((category) => category.id === categoryId)?.name ??
    categoryId ??
    '-'
  );
}

export default function TicketsPage() {
  const access = useAccess() as {
    canAssignTickets?: boolean;
    canCloseTickets?: boolean;
    canCommentTickets?: boolean;
    canCreateTickets?: boolean;
    canDeleteTickets?: boolean;
    canUpdateTickets?: boolean;
  };
  const intl = useIntl();
  const [ticketForm] = Form.useForm<TicketFormValues>();
  const [assignForm] = Form.useForm<AssignFormValues>();
  const [statusForm] = Form.useForm<StatusFormValues>();
  const [commentForm] = Form.useForm<CommentFormValues>();
  const [attachmentForm] = Form.useForm<AttachmentFormValues>();
  const [batchAssignForm] = Form.useForm<BatchAssignFormValues>();
  const [rows, setRows] = useState<readonly TicketSummary[]>([]);
  const [categories, setCategories] = useState<
    readonly TicketCategorySummary[]
  >([]);
  const [dashboard, setDashboard] = useState<TicketDashboardSummary>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selected, setSelected] = useState<TicketSummary>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketSummary>();
  const [assigningTicket, setAssigningTicket] = useState<TicketSummary>();
  const [statusTicket, setStatusTicket] = useState<TicketSummary>();
  const [commentTicket, setCommentTicket] = useState<TicketSummary>();
  const [attachmentTicket, setAttachmentTicket] = useState<TicketSummary>();
  const [batchAssignOpen, setBatchAssignOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actingTicketId, setActingTicketId] = useState<string>();

  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );

  const statusLabels = useMemo(
    () => ({
      canceled: formatMessage(
        'pages.collaboration.tickets.status.canceled',
        'canceled',
      ),
      closed: formatMessage(
        'pages.collaboration.tickets.status.closed',
        'closed',
      ),
      new: formatMessage('pages.collaboration.tickets.status.new', 'new'),
      pending_confirmation: formatMessage(
        'pages.collaboration.tickets.status.pendingConfirmation',
        'pending confirmation',
      ),
      processing: formatMessage(
        'pages.collaboration.tickets.status.processing',
        'processing',
      ),
      resolved: formatMessage(
        'pages.collaboration.tickets.status.resolved',
        'resolved',
      ),
    }),
    [formatMessage],
  );

  const priorityLabels = useMemo(
    () => ({
      high: formatMessage('pages.collaboration.tickets.priority.high', 'high'),
      low: formatMessage('pages.collaboration.tickets.priority.low', 'low'),
      medium: formatMessage(
        'pages.collaboration.tickets.priority.medium',
        'medium',
      ),
      urgent: formatMessage(
        'pages.collaboration.tickets.priority.urgent',
        'urgent',
      ),
    }),
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
      closed: countByStatus(rows, 'closed'),
      new: countByStatus(rows, 'new'),
      overdue:
        dashboard?.overdue ??
        rows.filter(
          (row) =>
            row.slaBreached || row.responseOverdue || row.resolutionOverdue,
        ).length,
      pending:
        dashboard?.pending ??
        rows.filter((row) =>
          ['new', 'processing', 'pending_confirmation'].includes(row.status),
        ).length,
      processing: countByStatus(rows, 'processing'),
      resolved: countByStatus(rows, 'resolved'),
      total: dashboard?.total ?? rows.length,
    }),
    [dashboard, rows],
  );

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((category) => category.enabled)
        .map((category) => ({
          label: category.name,
          value: category.id,
        })),
    [categories],
  );

  const filterOptions: CurrentPageFilterOption<TicketSummary>[] = useMemo(
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
        key: 'priority',
        options: createCurrentPageFilterOptions(rows, 'priority'),
        placeholder: formatMessage(
          'pages.collaboration.tickets.fields.priority',
          'Priority',
        ),
        predicate: (record, value) => record.priority === value,
      },
      {
        key: 'assignee',
        options: createCurrentPageFilterOptions(rows, 'assignee'),
        placeholder: formatMessage(
          'pages.collaboration.tickets.fields.assignee',
          'Assignee',
        ),
        predicate: (record, value) => record.assignee === value,
      },
      {
        key: 'sla',
        options: [
          {
            label: formatMessage(
              'pages.collaboration.tickets.sla.overdue',
              'Overdue',
            ),
            value: 'overdue',
          },
          {
            label: formatMessage(
              'pages.collaboration.tickets.sla.onTrack',
              'On track',
            ),
            value: 'on_track',
          },
        ],
        placeholder: formatMessage(
          'pages.collaboration.tickets.fields.sla',
          'SLA',
        ),
        predicate: (record, value) =>
          value === 'overdue'
            ? record.slaBreached ||
              record.responseOverdue ||
              record.resolutionOverdue
            : !record.slaBreached &&
              !record.responseOverdue &&
              !record.resolutionOverdue,
      },
    ],
    [formatMessage, rows],
  );

  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<TicketSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.collaboration.tickets.search.placeholder',
        'Search live tickets',
      ),
      selectFilters: filterOptions,
    });

  const loadTickets = async () => {
    setLoading(true);
    try {
      const [ticketRows, categoryRows, dashboardSummary] = await Promise.all([
        listOpenCoreTickets(),
        listOpenCoreTicketCategories(),
        getOpenCoreTicketDashboardSummary(),
      ]);
      setRows(ticketRows);
      setCategories(categoryRows);
      setDashboard(dashboardSummary);
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setCategories([]);
      setDashboard(undefined);
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.tickets.load.failure',
              'Unable to load tickets.',
            ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  const refreshSelected = async (ticketId: string) => {
    const next = await getOpenCoreTicket(ticketId);
    setSelected(next);
    return next;
  };

  const openDetail = async (id: string) => {
    try {
      await refreshSelected(id);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.tickets.detail.loadFailure',
              'Unable to load ticket.',
            ),
      );
    }
  };

  const openCreateForm = () => {
    ticketForm.setFieldsValue({
      assignee: 'ops',
      categoryId: categories.find((category) => category.enabled)?.id,
      createdBy: DEFAULT_TICKET_ACTOR,
      description: '',
      dueAt: '',
      priority: 'medium',
      responseDueAt: '',
      resolutionDueAt: '',
      title: '',
    });
    setEditingTicket(undefined);
    setCreateOpen(true);
  };

  const openEditForm = (record: TicketSummary) => {
    ticketForm.setFieldsValue({
      assignee: record.assignee,
      categoryId: record.categoryId,
      createdBy: record.createdBy,
      description: record.description,
      dueAt: record.dueAt,
      priority: record.priority,
      responseDueAt: record.responseDueAt,
      resolutionDueAt: record.resolutionDueAt,
      title: record.title,
    });
    setEditingTicket(record);
    setCreateOpen(true);
  };

  const submitTicket = async () => {
    const values = await ticketForm.validateFields();
    setSubmitting(true);
    try {
      const payload = {
        assignee: values.assignee?.trim() || undefined,
        categoryId: values.categoryId || undefined,
        description: values.description.trim(),
        dueAt: values.dueAt?.trim() || undefined,
        priority: values.priority,
        responseDueAt: values.responseDueAt?.trim() || undefined,
        resolutionDueAt: values.resolutionDueAt?.trim() || undefined,
        title: values.title.trim(),
      };
      const next = editingTicket
        ? await updateOpenCoreTicket(editingTicket.id, payload)
        : await createOpenCoreTicket({
            ...payload,
            createdBy: values.createdBy.trim(),
          });
      message.success(
        formatMessage(
          editingTicket
            ? 'pages.collaboration.tickets.messages.updated'
            : 'pages.collaboration.tickets.messages.created',
          editingTicket ? 'Ticket updated.' : 'Ticket created.',
        ),
      );
      setCreateOpen(false);
      setEditingTicket(undefined);
      setSelected(next);
      await loadTickets();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.tickets.messages.saveFailure',
              'Unable to save ticket.',
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignForm = (record: TicketSummary) => {
    assignForm.setFieldsValue({
      actor: DEFAULT_TICKET_ACTOR,
      assignee: record.assignee ?? '',
      comment: '',
    });
    setAssigningTicket(record);
  };

  const submitAssign = async () => {
    if (!assigningTicket) return;
    const values = await assignForm.validateFields();
    setSubmitting(true);
    try {
      const next = await assignOpenCoreTicket(assigningTicket.id, {
        actor: values.actor.trim(),
        assignee: values.assignee.trim(),
        comment: values.comment?.trim() || undefined,
      });
      message.success(
        formatMessage(
          'pages.collaboration.tickets.messages.assigned',
          'Ticket assigned.',
        ),
      );
      setAssigningTicket(undefined);
      setSelected(next);
      await loadTickets();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.tickets.messages.assignFailure',
              'Unable to assign ticket.',
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openStatusForm = (record: TicketSummary) => {
    statusForm.setFieldsValue({
      actor: DEFAULT_TICKET_ACTOR,
      comment: '',
      status: record.status,
    });
    setStatusTicket(record);
  };

  const submitStatus = async () => {
    if (!statusTicket) return;
    const values = await statusForm.validateFields();
    setSubmitting(true);
    try {
      const next = await changeOpenCoreTicketStatus(statusTicket.id, {
        actor: values.actor.trim(),
        comment: values.comment?.trim() || undefined,
        status: values.status,
      });
      message.success(
        formatMessage(
          'pages.collaboration.tickets.messages.statusChanged',
          'Ticket status changed.',
        ),
      );
      setStatusTicket(undefined);
      setSelected(next);
      await loadTickets();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.tickets.messages.statusFailure',
              'Unable to change ticket status.',
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openCommentForm = (record: TicketSummary) => {
    commentForm.setFieldsValue({ author: DEFAULT_TICKET_ACTOR, body: '' });
    setCommentTicket(record);
  };

  const submitComment = async () => {
    if (!commentTicket) return;
    const values = await commentForm.validateFields();
    setSubmitting(true);
    try {
      const next = await addOpenCoreTicketComment(commentTicket.id, {
        author: values.author.trim(),
        body: values.body.trim(),
      });
      message.success(
        formatMessage(
          'pages.collaboration.tickets.messages.commented',
          'Ticket comment added.',
        ),
      );
      setCommentTicket(undefined);
      setSelected(next);
      await loadTickets();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.tickets.messages.commentFailure',
              'Unable to add ticket comment.',
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openAttachmentForm = (record: TicketSummary) => {
    attachmentForm.setFieldsValue({
      mimeType: 'text/plain',
      originalName: '',
      sizeBytes: 1,
      storageKey: '',
      uploadedBy: DEFAULT_TICKET_ACTOR,
    });
    setAttachmentTicket(record);
  };

  const submitAttachment = async () => {
    if (!attachmentTicket) return;
    const values = await attachmentForm.validateFields();
    setSubmitting(true);
    try {
      const next = await addOpenCoreTicketAttachment(attachmentTicket.id, {
        mimeType: values.mimeType.trim(),
        originalName: values.originalName.trim(),
        sizeBytes: Number(values.sizeBytes),
        storageKey: values.storageKey.trim(),
        uploadedBy: values.uploadedBy.trim(),
      });
      message.success(
        formatMessage(
          'pages.collaboration.tickets.messages.attached',
          'Ticket attachment added.',
        ),
      );
      setAttachmentTicket(undefined);
      setSelected(next);
      await loadTickets();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.tickets.messages.attachmentFailure',
              'Unable to add ticket attachment.',
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const runTicketAction = async (
    record: TicketSummary,
    action: () => Promise<TicketSummary | undefined>,
    successId: string,
    successDefault: string,
    failureId: string,
    failureDefault: string,
  ) => {
    setActingTicketId(record.id);
    try {
      const next = await action();
      if (next) {
        setSelected(next);
      }
      message.success(formatMessage(successId, successDefault));
      await loadTickets();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(failureId, failureDefault),
      );
    } finally {
      setActingTicketId(undefined);
    }
  };

  const closeTicket = (record: TicketSummary) =>
    runTicketAction(
      record,
      () => closeOpenCoreTicket(record.id, { actor: DEFAULT_TICKET_ACTOR }),
      'pages.collaboration.tickets.messages.closed',
      'Ticket closed.',
      'pages.collaboration.tickets.messages.closeFailure',
      'Unable to close ticket.',
    );

  const reopenTicket = (record: TicketSummary) =>
    runTicketAction(
      record,
      () => reopenOpenCoreTicket(record.id, { actor: DEFAULT_TICKET_ACTOR }),
      'pages.collaboration.tickets.messages.reopened',
      'Ticket reopened.',
      'pages.collaboration.tickets.messages.reopenFailure',
      'Unable to reopen ticket.',
    );

  const archiveTicket = (record: TicketSummary) =>
    runTicketAction(
      record,
      async () => {
        await archiveOpenCoreTicket(record.id);
        setSelected(undefined);
        return undefined;
      },
      'pages.collaboration.tickets.messages.archived',
      'Ticket archived.',
      'pages.collaboration.tickets.messages.archiveFailure',
      'Unable to archive ticket.',
    );

  const downloadTicketExport = async (kind: 'tickets' | 'transitions') => {
    setSubmitting(true);
    try {
      const preview =
        kind === 'tickets'
          ? await exportOpenCoreTickets({ page: 1, pageSize: 100 })
          : await exportOpenCoreTicketTransitions({ page: 1, pageSize: 100 });
      downloadBase64File(
        preview.filename,
        preview.contentBase64,
        preview.contentType,
      );
      message.success(
        formatMessage(
          'pages.collaboration.tickets.messages.exported',
          'Ticket export downloaded.',
        ),
      );
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.tickets.messages.exportFailure',
              'Unable to export tickets.',
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const sendSlaReminders = async () => {
    setSubmitting(true);
    try {
      const result = await sendOpenCoreTicketSlaReminders();
      message.success(
        formatMessage(
          'pages.collaboration.tickets.messages.slaReminded',
          'SLA reminders sent: {count}.',
          { count: result.notified },
        ),
      );
      await loadTickets();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.tickets.messages.slaReminderFailure',
              'Unable to send SLA reminders.',
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openBatchAssign = () => {
    batchAssignForm.setFieldsValue({
      actor: DEFAULT_TICKET_ACTOR,
      assignee: DEFAULT_TICKET_ACTOR,
      comment: '',
    });
    setBatchAssignOpen(true);
  };

  const submitBatchAssign = async () => {
    const values = await batchAssignForm.validateFields();
    setSubmitting(true);
    try {
      const result = await batchAssignOpenCoreTickets({
        actor: values.actor.trim(),
        assignee: values.assignee.trim(),
        comment: values.comment?.trim() || undefined,
        ids: selectedRowKeys,
      });
      message.success(
        formatMessage(
          'pages.collaboration.tickets.messages.batchUpdated',
          'Updated {count} tickets.',
          { count: result.updated },
        ),
      );
      setBatchAssignOpen(false);
      setSelectedRowKeys([]);
      await loadTickets();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.tickets.messages.batchFailure',
              'Unable to update selected tickets.',
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const runBatchAction = async (action: () => Promise<{ updated: number }>) => {
    setSubmitting(true);
    try {
      const result = await action();
      message.success(
        formatMessage(
          'pages.collaboration.tickets.messages.batchUpdated',
          'Updated {count} tickets.',
          { count: result.updated },
        ),
      );
      setSelectedRowKeys([]);
      await loadTickets();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.tickets.messages.batchFailure',
              'Unable to update selected tickets.',
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = selectedRowKeys.length;

  const columns: ProColumns<TicketSummary>[] = [
    {
      title: formatMessage(
        'pages.collaboration.tickets.fields.tenantId',
        'Tenant ID',
      ),
      dataIndex: 'tenantId',
      width: 150,
    },
    {
      title: formatMessage('pages.collaboration.tickets.fields.number', 'No.'),
      dataIndex: 'number',
      width: 170,
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record.id)}>
          {record.number}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.collaboration.tickets.fields.title', 'Title'),
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record.id)}>
          {record.title}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage(
        'pages.collaboration.tickets.fields.category',
        'Category',
      ),
      dataIndex: 'categoryId',
      renderText: (_, record) =>
        findCategoryName(categories, record.categoryId),
    },
    {
      title: formatMessage(
        'pages.collaboration.tickets.fields.priority',
        'Priority',
      ),
      dataIndex: 'priority',
      render: (_, record) => (
        <Tag color={priorityColor(record.priority)}>
          {priorityLabels[record.priority]}
        </Tag>
      ),
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
        'pages.collaboration.tickets.fields.assignee',
        'Assignee',
      ),
      dataIndex: 'assignee',
    },
    {
      title: formatMessage('pages.collaboration.tickets.fields.sla', 'SLA'),
      dataIndex: 'slaBreached',
      width: 110,
      render: (_, record) =>
        record.slaBreached ||
        record.responseOverdue ||
        record.resolutionOverdue ? (
          <Tag color="red">
            {formatMessage(
              'pages.collaboration.tickets.sla.overdue',
              'Overdue',
            )}
          </Tag>
        ) : (
          <Tag color="green">
            {formatMessage(
              'pages.collaboration.tickets.sla.onTrack',
              'On track',
            )}
          </Tag>
        ),
    },
    {
      title: formatMessage('pages.collaboration.tickets.fields.dueAt', 'Due'),
      dataIndex: 'dueAt',
      width: 180,
    },
    {
      title: formatMessage(
        'pages.collaboration.tickets.fields.resolutionDueAt',
        'Resolution due',
      ),
      dataIndex: 'resolutionDueAt',
      width: 180,
    },
    {
      title: formatMessage(
        'pages.collaboration.common.actions.column',
        'Action',
      ),
      valueType: 'option',
      width: 360,
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
        access.canUpdateTickets ? (
          <Button
            icon={<EditOutlined />}
            key="edit"
            onClick={() => openEditForm(record)}
            size="small"
            title={TICKET_UPDATE_PERMISSION_MARKER}
            type="link"
          >
            {formatMessage('pages.collaboration.tickets.actions.edit', 'Edit')}
          </Button>
        ) : null,
        access.canAssignTickets ? (
          <Button
            icon={<TeamOutlined />}
            key="assign"
            onClick={() => openAssignForm(record)}
            size="small"
            title={TICKET_ASSIGN_PERMISSION_MARKER}
            type="link"
          >
            {formatMessage(
              'pages.collaboration.tickets.actions.assign',
              'Assign',
            )}
          </Button>
        ) : null,
        access.canUpdateTickets ? (
          <Button
            key="status"
            onClick={() => openStatusForm(record)}
            size="small"
            title={TICKET_UPDATE_PERMISSION_MARKER}
            type="link"
          >
            {formatMessage(
              'pages.collaboration.tickets.actions.status',
              'Status',
            )}
          </Button>
        ) : null,
        access.canCommentTickets ? (
          <Button
            key="comment"
            onClick={() => openCommentForm(record)}
            size="small"
            title={TICKET_COMMENT_PERMISSION_MARKER}
            type="link"
          >
            {formatMessage(
              'pages.collaboration.tickets.actions.comment',
              'Comment',
            )}
          </Button>
        ) : null,
        access.canUpdateTickets ? (
          <Button
            icon={<PaperClipOutlined />}
            key="attachment"
            onClick={() => openAttachmentForm(record)}
            size="small"
            title={TICKET_UPDATE_PERMISSION_MARKER}
            type="link"
          >
            {formatMessage(
              'pages.collaboration.tickets.actions.attachment',
              'Attachment',
            )}
          </Button>
        ) : null,
        access.canCloseTickets && record.status === 'resolved' ? (
          <Button
            icon={<CloseCircleOutlined />}
            key="close"
            loading={actingTicketId === record.id}
            onClick={() => void closeTicket(record)}
            size="small"
            title={TICKET_CLOSE_PERMISSION_MARKER}
            type="link"
          >
            {formatMessage(
              'pages.collaboration.tickets.actions.close',
              'Close',
            )}
          </Button>
        ) : null,
        access.canUpdateTickets &&
        (record.status === 'closed' || record.status === 'canceled') ? (
          <Button
            icon={<RollbackOutlined />}
            key="reopen"
            loading={actingTicketId === record.id}
            onClick={() => void reopenTicket(record)}
            size="small"
            title={TICKET_UPDATE_PERMISSION_MARKER}
            type="link"
          >
            {formatMessage(
              'pages.collaboration.tickets.actions.reopen',
              'Reopen',
            )}
          </Button>
        ) : null,
        access.canDeleteTickets ? (
          <Popconfirm
            key="archive"
            onConfirm={() => void archiveTicket(record)}
            title={formatMessage(
              'pages.collaboration.tickets.confirm.archive',
              'Archive ticket?',
            )}
          >
            <Button
              loading={actingTicketId === record.id}
              size="small"
              title={TICKET_DELETE_PERMISSION_MARKER}
              type="link"
            >
              {formatMessage(
                'pages.collaboration.tickets.actions.archive',
                'Archive',
              )}
            </Button>
          </Popconfirm>
        ) : null,
      ],
    },
  ];

  return (
    <PageContainer
      extra={[
        <Button
          icon={<ReloadOutlined />}
          key="reload"
          onClick={() => void loadTickets()}
        >
          {formatMessage(
            'pages.collaboration.tickets.actions.reload',
            'Reload live tickets',
          )}
        </Button>,
        access.canUpdateTickets ? (
          <Button
            key="sla-reminders"
            loading={submitting}
            onClick={() => void sendSlaReminders()}
            title={TICKET_UPDATE_PERMISSION_MARKER}
          >
            {formatMessage(
              'pages.collaboration.tickets.actions.slaReminders',
              'SLA reminders',
            )}
          </Button>
        ) : null,
        <Button
          icon={<DownloadOutlined />}
          key="export-tickets"
          loading={submitting}
          onClick={() => void downloadTicketExport('tickets')}
        >
          {formatMessage(
            'pages.collaboration.tickets.actions.exportTickets',
            'Export tickets',
          )}
        </Button>,
        <Button
          icon={<DownloadOutlined />}
          key="export-transitions"
          loading={submitting}
          onClick={() => void downloadTicketExport('transitions')}
        >
          {formatMessage(
            'pages.collaboration.tickets.actions.exportTransitions',
            'Export transitions',
          )}
        </Button>,
        access.canCreateTickets ? (
          <Button
            icon={<PlusOutlined />}
            key="create"
            onClick={openCreateForm}
            title={TICKET_CREATE_PERMISSION_MARKER}
            type="primary"
          >
            {formatMessage(
              'pages.collaboration.tickets.actions.create',
              'Create ticket',
            )}
          </Button>
        ) : null,
      ]}
      title={formatMessage('pages.collaboration.tickets.title', 'Tickets')}
    >
      {loadError ? (
        <Alert
          message={formatMessage(
            'pages.collaboration.tickets.load.liveFailure',
            'Live collaboration tickets unavailable',
          )}
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
          description={loadError}
        />
      ) : null}
      <Space size={16} style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.collaboration.tickets.stats.live',
            'Live tickets',
          )}
          value={stats.total}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.tickets.stats.new',
            'New tickets',
          )}
          value={stats.new}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.tickets.stats.pending',
            'Pending tickets',
          )}
          value={stats.pending}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.tickets.stats.overdue',
            'Overdue tickets',
          )}
          value={stats.overdue}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.tickets.stats.processing',
            'Processing tickets',
          )}
          value={stats.processing}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.tickets.stats.resolved',
            'Resolved tickets',
          )}
          value={stats.resolved}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.tickets.stats.closed',
            'Closed tickets',
          )}
          value={stats.closed}
        />
      </Space>
      <ProTable<TicketSummary>
        columns={columns}
        dataSource={[...filteredRows]}
        loading={loading}
        locale={{
          emptyText: loadError ? (
            formatMessage(
              'pages.collaboration.tickets.load.liveFailure',
              'Live collaboration tickets unavailable',
            )
          ) : (
            <Empty
              description={formatMessage(
                'pages.collaboration.tickets.empty',
                'No tickets yet.',
              )}
            />
          ),
        }}
        options={false}
        pagination={{ pageSize: 10 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys.map(String)),
        }}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          filterToolbar,
          access.canAssignTickets ? (
            <Button
              disabled={selectedCount === 0}
              key="batch-assign"
              onClick={openBatchAssign}
              title={TICKET_ASSIGN_PERMISSION_MARKER}
            >
              {formatMessage(
                'pages.collaboration.tickets.actions.batchAssign',
                'Batch assign',
              )}
            </Button>
          ) : null,
          access.canCloseTickets ? (
            <Button
              disabled={selectedCount === 0}
              key="batch-close"
              onClick={() =>
                void runBatchAction(() =>
                  batchCloseOpenCoreTickets({
                    actor: DEFAULT_TICKET_ACTOR,
                    ids: selectedRowKeys,
                  }),
                )
              }
              title={TICKET_CLOSE_PERMISSION_MARKER}
            >
              {formatMessage(
                'pages.collaboration.tickets.actions.batchClose',
                'Batch close',
              )}
            </Button>
          ) : null,
          access.canDeleteTickets ? (
            <Popconfirm
              key="batch-archive"
              onConfirm={() =>
                void runBatchAction(() =>
                  batchArchiveOpenCoreTickets({
                    actor: DEFAULT_TICKET_ACTOR,
                    ids: selectedRowKeys,
                  }),
                )
              }
              title={formatMessage(
                'pages.collaboration.tickets.confirm.batchArchive',
                'Archive selected tickets?',
              )}
            >
              <Button
                disabled={selectedCount === 0}
                title={TICKET_DELETE_PERMISSION_MARKER}
              >
                {formatMessage(
                  'pages.collaboration.tickets.actions.batchArchive',
                  'Batch archive',
                )}
              </Button>
            </Popconfirm>
          ) : null,
        ]}
      />

      <Drawer
        destroyOnClose
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={formatMessage(
          'pages.collaboration.tickets.detail.title',
          'Ticket Detail',
        )}
        width={720}
      >
        {selected ? (
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="ID">{selected.id}</Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.collaboration.tickets.fields.tenantId',
                  'Tenant ID',
                )}
              >
                {selected.tenantId}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.collaboration.tickets.fields.number',
                  'No.',
                )}
              >
                {selected.number}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.collaboration.common.fields.status',
                  'Status',
                )}
              >
                <Tag color={statusColor(selected.status)}>
                  {statusLabels[selected.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.collaboration.tickets.fields.priority',
                  'Priority',
                )}
              >
                <Tag color={priorityColor(selected.priority)}>
                  {priorityLabels[selected.priority]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.collaboration.tickets.fields.category',
                  'Category',
                )}
              >
                {findCategoryName(categories, selected.categoryId)}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.collaboration.tickets.fields.createdBy',
                  'Creator',
                )}
              >
                {selected.createdBy}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.collaboration.tickets.fields.assignee',
                  'Assignee',
                )}
              >
                {selected.assignee ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.collaboration.tickets.fields.dueAt',
                  'Due',
                )}
              >
                {selected.dueAt ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.collaboration.tickets.fields.firstRespondedAt',
                  'First response',
                )}
              >
                {selected.firstRespondedAt ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.collaboration.tickets.fields.responseDueAt',
                  'Response due',
                )}
              >
                {selected.responseDueAt ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.collaboration.tickets.fields.resolutionDueAt',
                  'Resolution due',
                )}
              >
                {selected.resolutionDueAt ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.collaboration.tickets.fields.sla',
                  'SLA',
                )}
              >
                {selected.slaBreached ||
                selected.responseOverdue ||
                selected.resolutionOverdue ? (
                  <Tag color="red">
                    {formatMessage(
                      'pages.collaboration.tickets.sla.overdue',
                      'Overdue',
                    )}
                  </Tag>
                ) : (
                  <Tag color="green">
                    {formatMessage(
                      'pages.collaboration.tickets.sla.onTrack',
                      'On track',
                    )}
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.collaboration.common.fields.createdAt',
                  'Created At',
                )}
              >
                {selected.createdAt}
              </Descriptions.Item>
              <Descriptions.Item
                label={formatMessage(
                  'pages.collaboration.tickets.fields.description',
                  'Description',
                )}
                span={2}
              >
                {selected.description}
              </Descriptions.Item>
            </Descriptions>
            <Typography.Title level={5}>
              {formatMessage(
                'pages.collaboration.tickets.detail.comments',
                'Comments',
              )}
            </Typography.Title>
            <List
              dataSource={[...selected.comments]}
              locale={{
                emptyText: formatMessage(
                  'pages.collaboration.tickets.detail.noComments',
                  'No comments.',
                ),
              }}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    description={item.body}
                    title={`${item.author} · ${item.createdAt}`}
                  />
                </List.Item>
              )}
            />
            <Typography.Title level={5}>
              {formatMessage(
                'pages.collaboration.tickets.detail.attachments',
                'Attachments',
              )}
            </Typography.Title>
            <List
              dataSource={[...selected.attachments]}
              locale={{
                emptyText: formatMessage(
                  'pages.collaboration.tickets.detail.noAttachments',
                  'No attachments.',
                ),
              }}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    description={`${item.mimeType} · ${item.sizeBytes} bytes · ${item.storageKey}`}
                    title={`${item.originalName} · ${item.uploadedBy}`}
                  />
                </List.Item>
              )}
            />
            <Typography.Title level={5}>
              {formatMessage(
                'pages.collaboration.tickets.detail.transitions',
                'Transitions',
              )}
            </Typography.Title>
            <List
              dataSource={[...selected.transitions]}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    description={item.comment}
                    title={`${item.actor}: ${item.fromStatus ?? '-'} -> ${item.toStatus} · ${item.createdAt}`}
                  />
                </List.Item>
              )}
            />
          </Space>
        ) : null}
      </Drawer>

      <Modal
        destroyOnClose
        okButtonProps={{ loading: submitting }}
        onCancel={() => {
          setCreateOpen(false);
          setEditingTicket(undefined);
        }}
        onOk={() => void submitTicket()}
        open={createOpen}
        title={formatMessage(
          editingTicket
            ? 'pages.collaboration.tickets.actions.edit'
            : 'pages.collaboration.tickets.actions.create',
          editingTicket ? 'Edit ticket' : 'Create ticket',
        )}
      >
        <Form form={ticketForm} layout="vertical">
          <Form.Item
            label={formatMessage(
              'pages.collaboration.tickets.fields.title',
              'Title',
            )}
            name="title"
            rules={[requiredRule]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.tickets.fields.description',
              'Description',
            )}
            name="description"
            rules={[requiredRule]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.tickets.fields.createdBy',
              'Creator',
            )}
            name="createdBy"
            rules={editingTicket ? [] : [requiredRule]}
          >
            <Input disabled={Boolean(editingTicket)} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.tickets.fields.priority',
              'Priority',
            )}
            name="priority"
          >
            <Select
              options={ticketPriorities.map((priority) => ({
                label: priorityLabels[priority],
                value: priority,
              }))}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.tickets.fields.category',
              'Category',
            )}
            name="categoryId"
          >
            <Select allowClear options={categoryOptions} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.tickets.fields.assignee',
              'Assignee',
            )}
            name="assignee"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.tickets.fields.dueAt',
              'Due',
            )}
            name="dueAt"
          >
            <Input placeholder="2026-07-01T00:00:00.000Z" />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.tickets.fields.responseDueAt',
              'Response due',
            )}
            name="responseDueAt"
          >
            <Input placeholder="2026-07-01T08:00:00.000Z" />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.tickets.fields.resolutionDueAt',
              'Resolution due',
            )}
            name="resolutionDueAt"
          >
            <Input placeholder="2026-07-03T00:00:00.000Z" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        destroyOnClose
        okButtonProps={{ loading: submitting }}
        onCancel={() => setAssigningTicket(undefined)}
        onOk={() => void submitAssign()}
        open={Boolean(assigningTicket)}
        title={formatMessage(
          'pages.collaboration.tickets.actions.assign',
          'Assign',
        )}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item label="Actor" name="actor" rules={[requiredRule]}>
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.tickets.fields.assignee',
              'Assignee',
            )}
            name="assignee"
            rules={[requiredRule]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Comment" name="comment">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        destroyOnClose
        okButtonProps={{ loading: submitting }}
        onCancel={() => setStatusTicket(undefined)}
        onOk={() => void submitStatus()}
        open={Boolean(statusTicket)}
        title={formatMessage(
          'pages.collaboration.tickets.actions.status',
          'Status',
        )}
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item label="Actor" name="actor" rules={[requiredRule]}>
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.common.fields.status',
              'Status',
            )}
            name="status"
            rules={[requiredRule]}
          >
            <Select
              options={ticketStatuses.map((status) => ({
                label: statusLabels[status],
                value: status,
              }))}
            />
          </Form.Item>
          <Form.Item label="Comment" name="comment">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        destroyOnClose
        okButtonProps={{ loading: submitting }}
        onCancel={() => setCommentTicket(undefined)}
        onOk={() => void submitComment()}
        open={Boolean(commentTicket)}
        title={formatMessage(
          'pages.collaboration.tickets.actions.comment',
          'Comment',
        )}
      >
        <Form form={commentForm} layout="vertical">
          <Form.Item label="Author" name="author" rules={[requiredRule]}>
            <Input />
          </Form.Item>
          <Form.Item label="Comment" name="body" rules={[requiredRule]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        destroyOnClose
        okButtonProps={{ loading: submitting }}
        onCancel={() => setAttachmentTicket(undefined)}
        onOk={() => void submitAttachment()}
        open={Boolean(attachmentTicket)}
        title={formatMessage(
          'pages.collaboration.tickets.actions.attachment',
          'Attachment',
        )}
      >
        <Form form={attachmentForm} layout="vertical">
          <Form.Item
            label={formatMessage(
              'pages.collaboration.tickets.fields.originalName',
              'File name',
            )}
            name="originalName"
            rules={[requiredRule]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="MIME" name="mimeType" rules={[requiredRule]}>
            <Input />
          </Form.Item>
          <Form.Item label="Size" name="sizeBytes" rules={[requiredRule]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.tickets.fields.storageKey',
              'Storage key',
            )}
            name="storageKey"
            rules={[requiredRule]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Uploader" name="uploadedBy" rules={[requiredRule]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        destroyOnClose
        okButtonProps={{ loading: submitting }}
        onCancel={() => setBatchAssignOpen(false)}
        onOk={() => void submitBatchAssign()}
        open={batchAssignOpen}
        title={formatMessage(
          'pages.collaboration.tickets.actions.batchAssign',
          'Batch assign',
        )}
      >
        <Form form={batchAssignForm} layout="vertical">
          <Form.Item label="Actor" name="actor" rules={[requiredRule]}>
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.tickets.fields.assignee',
              'Assignee',
            )}
            name="assignee"
            rules={[requiredRule]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="Comment" name="comment">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
