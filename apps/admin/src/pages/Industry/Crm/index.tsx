import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  CommentOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import type {
  CrmCustomerSummary,
  CrmLeadSummary,
  CrmOpenOpportunityStage,
  CrmOpportunitySummary,
  CrmSummary,
  CrmTagSummary,
  CrmTargetType,
  CrmTaskSummary,
  CrmWritableCustomerStatus,
  CrmWritableLeadStatus,
} from '@opencore/sdk';
import { useAccess, useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  archiveOpenCoreCrmContact,
  archiveOpenCoreCrmCustomer,
  archiveOpenCoreCrmLead,
  archiveOpenCoreCrmOpportunity,
  changeOpenCoreCrmOpportunityStage,
  completeOpenCoreCrmTask,
  convertOpenCoreCrmLead,
  createOpenCoreCrmAttachment,
  createOpenCoreCrmContact,
  createOpenCoreCrmCustomer,
  createOpenCoreCrmFollowUp,
  createOpenCoreCrmLead,
  createOpenCoreCrmOpportunity,
  createOpenCoreCrmTag,
  createOpenCoreCrmTask,
  getOpenCoreCrmSummary,
  pageOpenCoreCrmActivities,
  pageOpenCoreCrmContacts,
  pageOpenCoreCrmCustomers,
  pageOpenCoreCrmLeads,
  pageOpenCoreCrmOpportunities,
  pageOpenCoreCrmTags,
  pageOpenCoreCrmTasks,
  transferOpenCoreCrmCustomerOwner,
  transferOpenCoreCrmLeadOwner,
  transferOpenCoreCrmOpportunityOwner,
  updateOpenCoreCrmContact,
  updateOpenCoreCrmCustomer,
  updateOpenCoreCrmLead,
  updateOpenCoreCrmOpportunity,
  updateOpenCoreCrmTag,
} from '@/services/opencore/platform';
import {
  CurrentPageExportButton,
  type CurrentPageExportColumn,
} from '../../shared/CurrentPageExportButton';
import { ReadOnlyDetailDrawer } from '../../shared/ReadOnlyDetailDrawer';

type CrmTab =
  | 'activity'
  | 'contacts'
  | 'customers'
  | 'leads'
  | 'opportunities'
  | 'tags'
  | 'tasks';
type EntityKind = 'contact' | 'customer' | 'lead' | 'opportunity' | 'tag';
type ActionKind =
  | 'attach'
  | 'convert'
  | 'follow'
  | 'stage'
  | 'task'
  | 'transfer';
type CrmRow = Record<string, unknown> & {
  id: string;
  tenantId: string;
  resource: CrmTab;
};
type TargetContext = {
  id: string;
  title: string;
  type: CrmTargetType;
};
type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const DEFAULT_ACTOR = 'admin';
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];
const WRITABLE_LEAD_STATUSES = ['new', 'contacted', 'qualified', 'lost'];
const CUSTOMER_STATUSES = ['active', 'inactive', 'churned'];
const OPPORTUNITY_STAGES = [
  'qualification',
  'proposal',
  'negotiation',
  'won',
  'lost',
];
const OPEN_OPPORTUNITY_STAGES = ['qualification', 'proposal', 'negotiation'];
const TASK_STATUSES = ['open', 'done', 'canceled'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const FOLLOW_UP_METHODS = ['call', 'email', 'meeting', 'wechat', 'note'];

function crmMessageId(suffix: string): string {
  return `pages.industry.crm.${suffix}`;
}

function valueEnum(
  values: readonly string[],
  formatMessage: FormatMessage,
  scope: string,
) {
  return Object.fromEntries(
    values.map((value) => [
      value,
      { text: formatMessage(crmMessageId(`${scope}.${value}`), value) },
    ]),
  );
}

function enumOptions(
  values: readonly string[],
  formatMessage: FormatMessage,
  scope: string,
) {
  return values.map((value) => ({
    label: formatMessage(crmMessageId(`${scope}.${value}`), value),
    value,
  }));
}

function entityLabel(
  kind: EntityKind | undefined,
  formatMessage: FormatMessage,
): string {
  return kind ? formatMessage(crmMessageId(`entityKind.${kind}`), kind) : '';
}

function actionLabel(
  kind: ActionKind | undefined,
  formatMessage: FormatMessage,
): string {
  return kind
    ? formatMessage(crmMessageId(`actionKind.${kind}`), kind)
    : formatMessage(crmMessageId('actionKind.action'), 'Action');
}

function rowify<T extends { id: string; tenantId: string }>(
  resource: CrmTab,
  rows: readonly T[],
): CrmRow[] {
  return rows.map((row) => ({
    ...(row as Record<string, unknown>),
    id: row.id,
    resource,
    tenantId: row.tenantId,
  }));
}

function textValue(values: Record<string, unknown>, key: string): string {
  const value = values[key];
  return typeof value === 'string' ? value.trim() : '';
}

function optionalText(
  values: Record<string, unknown>,
  key: string,
): string | undefined {
  return textValue(values, key) || undefined;
}

function nullableText(
  values: Record<string, unknown>,
  key: string,
): string | null | undefined {
  return key in values ? (optionalText(values, key) ?? null) : undefined;
}

function dateText(
  values: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = values[key];
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toISOString' in value &&
    typeof value.toISOString === 'function'
  ) {
    return value.toISOString();
  }
  return undefined;
}

function pageNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function splitTags(value: string | undefined): string[] | undefined {
  const tags = (value ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : undefined;
}

function getString(row: CrmRow, key: string): string | undefined {
  const value = row[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getNumber(row: CrmRow, key: string): number | undefined {
  const value = row[key];
  return typeof value === 'number' ? value : undefined;
}

function statusColor(value?: string): string {
  if (!value) return 'default';
  if (['active', 'converted', 'done', 'won'].includes(value)) return 'green';
  if (['lost', 'canceled', 'churned'].includes(value)) return 'red';
  if (['proposal', 'qualified', 'open'].includes(value)) return 'blue';
  if (['negotiation', 'contacted'].includes(value)) return 'gold';
  return 'default';
}

function targetForRow(row: CrmRow): TargetContext | undefined {
  if (row.resource === 'leads') {
    return {
      id: row.id,
      title: getString(row, 'name') ?? row.id,
      type: 'lead',
    };
  }
  if (row.resource === 'customers') {
    return {
      id: row.id,
      title: getString(row, 'name') ?? row.id,
      type: 'customer',
    };
  }
  if (row.resource === 'contacts') {
    return {
      id: row.id,
      title: getString(row, 'name') ?? row.id,
      type: 'contact',
    };
  }
  if (row.resource === 'opportunities') {
    return {
      id: row.id,
      title: getString(row, 'name') ?? row.id,
      type: 'opportunity',
    };
  }
  return undefined;
}

function createExportColumns(
  tab: CrmTab,
  formatMessage: FormatMessage,
): CurrentPageExportColumn<CrmRow>[] {
  const common: CurrentPageExportColumn<CrmRow>[] = [
    {
      title: formatMessage(crmMessageId('fields.tenant'), 'Tenant'),
      dataIndex: 'tenantId',
    },
    { title: formatMessage(crmMessageId('fields.id'), 'ID'), dataIndex: 'id' },
  ];
  if (tab === 'leads') {
    return [
      ...common,
      {
        title: formatMessage(crmMessageId('fields.number'), 'Number'),
        dataIndex: 'number',
      },
      {
        title: formatMessage(crmMessageId('fields.name'), 'Name'),
        dataIndex: 'name',
      },
      {
        title: formatMessage(crmMessageId('fields.company'), 'Company'),
        dataIndex: 'company',
      },
      {
        title: formatMessage(crmMessageId('fields.status'), 'Status'),
        dataIndex: 'status',
      },
      {
        title: formatMessage(crmMessageId('fields.owner'), 'Owner'),
        dataIndex: 'owner',
      },
      {
        title: formatMessage(crmMessageId('fields.source'), 'Source'),
        dataIndex: 'source',
      },
    ];
  }
  if (tab === 'customers') {
    return [
      ...common,
      {
        title: formatMessage(crmMessageId('fields.number'), 'Number'),
        dataIndex: 'number',
      },
      {
        title: formatMessage(crmMessageId('fields.name'), 'Name'),
        dataIndex: 'name',
      },
      {
        title: formatMessage(crmMessageId('fields.status'), 'Status'),
        dataIndex: 'status',
      },
      {
        title: formatMessage(crmMessageId('fields.level'), 'Level'),
        dataIndex: 'level',
      },
      {
        title: formatMessage(crmMessageId('fields.owner'), 'Owner'),
        dataIndex: 'owner',
      },
      {
        title: formatMessage(crmMessageId('fields.source'), 'Source'),
        dataIndex: 'source',
      },
    ];
  }
  if (tab === 'opportunities') {
    return [
      ...common,
      {
        title: formatMessage(crmMessageId('fields.number'), 'Number'),
        dataIndex: 'number',
      },
      {
        title: formatMessage(crmMessageId('fields.name'), 'Name'),
        dataIndex: 'name',
      },
      {
        title: formatMessage(crmMessageId('fields.customer'), 'Customer'),
        dataIndex: 'customerName',
      },
      {
        title: formatMessage(crmMessageId('fields.stage'), 'Stage'),
        dataIndex: 'stage',
      },
      {
        title: formatMessage(crmMessageId('fields.amount'), 'Amount'),
        dataIndex: 'amount',
      },
      {
        title: formatMessage(crmMessageId('fields.owner'), 'Owner'),
        dataIndex: 'owner',
      },
    ];
  }
  if (tab === 'tasks') {
    return [
      ...common,
      {
        title: formatMessage(crmMessageId('fields.title'), 'Title'),
        dataIndex: 'title',
      },
      {
        title: formatMessage(crmMessageId('fields.assignee'), 'Assignee'),
        dataIndex: 'assignee',
      },
      {
        title: formatMessage(crmMessageId('fields.status'), 'Status'),
        dataIndex: 'status',
      },
      {
        title: formatMessage(crmMessageId('fields.priority'), 'Priority'),
        dataIndex: 'priority',
      },
      {
        title: formatMessage(crmMessageId('fields.dueAt'), 'Due At'),
        dataIndex: 'dueAt',
      },
    ];
  }
  return [
    ...common,
    {
      title: formatMessage(crmMessageId('fields.name'), 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage(crmMessageId('fields.title'), 'Title'),
      dataIndex: 'title',
    },
    {
      title: formatMessage(crmMessageId('fields.target'), 'Target'),
      dataIndex: 'targetId',
    },
    {
      title: formatMessage(crmMessageId('fields.owner'), 'Owner'),
      dataIndex: 'owner',
    },
    {
      title: formatMessage(crmMessageId('fields.status'), 'Status'),
      dataIndex: 'status',
    },
  ];
}

export default function CrmPage() {
  const intl = useIntl();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const access = useAccess() as {
    canAssignCrm?: boolean;
    canCommentCrm?: boolean;
    canCreateCrm?: boolean;
    canDeleteCrm?: boolean;
    canExportCrm?: boolean;
    canUpdateCrm?: boolean;
  };
  const [entityForm] = Form.useForm<Record<string, unknown>>();
  const [actionForm] = Form.useForm<Record<string, unknown>>();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<CrmTab>('leads');
  const [summary, setSummary] = useState<CrmSummary>();
  const [tags, setTags] = useState<readonly CrmTagSummary[]>([]);
  const [customers, setCustomers] = useState<readonly CrmCustomerSummary[]>([]);
  const [tableRows, setTableRows] = useState<CrmRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selected, setSelected] = useState<CrmRow>();
  const [entityKind, setEntityKind] = useState<EntityKind>();
  const [editing, setEditing] = useState<CrmRow>();
  const [actionKind, setActionKind] = useState<ActionKind>();
  const [actionTarget, setActionTarget] = useState<TargetContext>();
  const [submitting, setSubmitting] = useState(false);

  const loadCrm = async () => {
    setLoading(true);
    try {
      const [summaryResult, tagPage, customerPage] = await Promise.all([
        getOpenCoreCrmSummary(),
        pageOpenCoreCrmTags({ enabled: true, page: 1, pageSize: 100 }),
        pageOpenCoreCrmCustomers({ page: 1, pageSize: 100 }),
      ]);
      setSummary(summaryResult);
      setTags([...tagPage.items]);
      setCustomers([...customerPage.items]);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(crmMessageId('load.failure'), 'Unable to load CRM.'),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCrm();
  }, []);

  const reloadCrm = async () => {
    await loadCrm();
    actionRef.current?.reload();
  };

  const closeEntityModal = () => {
    setEntityKind(undefined);
    setEditing(undefined);
    entityForm.resetFields();
  };

  const openCreate = (kind: EntityKind) => {
    entityForm.resetFields();
    entityForm.setFieldsValue({
      amount: '0',
      assignee: DEFAULT_ACTOR,
      createdBy: DEFAULT_ACTOR,
      enabled: true,
      owner: DEFAULT_ACTOR,
      priority: 'medium',
      probability: 10,
      source: 'website',
      status:
        kind === 'lead' ? 'new' : kind === 'customer' ? 'active' : undefined,
      stage: 'qualification',
    });
    setEditing(undefined);
    setEntityKind(kind);
  };

  const openEdit = (kind: EntityKind, row: CrmRow) => {
    entityForm.resetFields();
    entityForm.setFieldsValue({
      ...row,
      tags: Array.isArray(row.tags) ? row.tags.join(', ') : undefined,
    });
    setEditing(row);
    setEntityKind(kind);
  };

  const openAction = (kind: ActionKind, target: TargetContext) => {
    actionForm.resetFields();
    actionForm.setFieldsValue({
      actor: DEFAULT_ACTOR,
      amount: '0',
      assignee: DEFAULT_ACTOR,
      createdBy: DEFAULT_ACTOR,
      method: 'call',
      mimeType: 'text/plain',
      priority: 'medium',
      sizeBytes: 128,
      stage: 'proposal',
      uploadedBy: DEFAULT_ACTOR,
    });
    setActionKind(kind);
    setActionTarget(target);
  };

  const closeActionModal = () => {
    setActionKind(undefined);
    setActionTarget(undefined);
    actionForm.resetFields();
  };

  const submitEntity = async () => {
    if (!entityKind) return;
    const values = await entityForm.validateFields();
    setSubmitting(true);
    try {
      if (entityKind === 'tag') {
        const body = {
          code: textValue(values, 'code'),
          color: optionalText(values, 'color'),
          description: nullableText(values, 'description') ?? undefined,
          enabled: Boolean(values.enabled ?? true),
          name: textValue(values, 'name'),
        };
        if (editing) await updateOpenCoreCrmTag(editing.id, body);
        else await createOpenCoreCrmTag(body);
      } else if (entityKind === 'lead') {
        const body = {
          company: nullableText(values, 'company') ?? undefined,
          email: nullableText(values, 'email') ?? undefined,
          mobile: nullableText(values, 'mobile') ?? undefined,
          name: textValue(values, 'name'),
          nextContactAt: dateText(values, 'nextContactAt'),
          owner: textValue(values, 'owner'),
          rating: optionalText(values, 'rating'),
          remark: nullableText(values, 'remark') ?? undefined,
          source: textValue(values, 'source'),
          tags: splitTags(optionalText(values, 'tags')),
        };
        if (editing) {
          const status = optionalText(values, 'status');
          await updateOpenCoreCrmLead(editing.id, {
            ...body,
            ...(status === undefined || status === 'converted'
              ? {}
              : { status: status as CrmWritableLeadStatus }),
          });
        } else await createOpenCoreCrmLead(body);
      } else if (entityKind === 'customer') {
        const body = {
          address: nullableText(values, 'address') ?? undefined,
          email: nullableText(values, 'email') ?? undefined,
          industry: nullableText(values, 'industry') ?? undefined,
          level: optionalText(values, 'level'),
          name: textValue(values, 'name'),
          nextContactAt: dateText(values, 'nextContactAt'),
          owner: textValue(values, 'owner'),
          phone: nullableText(values, 'phone') ?? undefined,
          region: nullableText(values, 'region') ?? undefined,
          remark: nullableText(values, 'remark') ?? undefined,
          source: textValue(values, 'source'),
          status: optionalText(values, 'status') as CrmWritableCustomerStatus,
          tags: splitTags(optionalText(values, 'tags')),
          website: nullableText(values, 'website') ?? undefined,
        };
        if (editing) await updateOpenCoreCrmCustomer(editing.id, body);
        else await createOpenCoreCrmCustomer(body);
      } else if (entityKind === 'contact') {
        const body = {
          customerId: textValue(values, 'customerId'),
          decisionRole: nullableText(values, 'decisionRole') ?? undefined,
          email: nullableText(values, 'email') ?? undefined,
          mobile: nullableText(values, 'mobile') ?? undefined,
          name: textValue(values, 'name'),
          nextContactAt: dateText(values, 'nextContactAt'),
          owner: optionalText(values, 'owner'),
          phone: nullableText(values, 'phone') ?? undefined,
          primary: Boolean(values.primary),
          remark: nullableText(values, 'remark') ?? undefined,
          title: nullableText(values, 'title') ?? undefined,
        };
        if (editing) await updateOpenCoreCrmContact(editing.id, body);
        else await createOpenCoreCrmContact(body);
      } else if (entityKind === 'opportunity') {
        const body = {
          amount: optionalText(values, 'amount'),
          customerId: textValue(values, 'customerId'),
          expectedCloseAt: dateText(values, 'expectedCloseAt'),
          name: textValue(values, 'name'),
          owner: textValue(values, 'owner'),
          probability: getNumber(values as CrmRow, 'probability'),
          remark: nullableText(values, 'remark') ?? undefined,
          tags: splitTags(optionalText(values, 'tags')),
        };
        if (editing) await updateOpenCoreCrmOpportunity(editing.id, body);
        else
          await createOpenCoreCrmOpportunity({
            ...body,
            stage: optionalText(values, 'stage') as CrmOpenOpportunityStage,
          });
      }
      message.success(
        editing
          ? formatMessage(
              crmMessageId('messages.updated'),
              'CRM record updated.',
            )
          : formatMessage(
              crmMessageId('messages.created'),
              'CRM record created.',
            ),
      );
      closeEntityModal();
      await reloadCrm();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              crmMessageId('messages.saveFailed'),
              'CRM save failed.',
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitAction = async () => {
    if (!actionKind || !actionTarget) return;
    const values = await actionForm.validateFields();
    setSubmitting(true);
    try {
      if (actionKind === 'transfer') {
        const body = {
          actor: textValue(values, 'actor'),
          reason: optionalText(values, 'reason'),
          toOwner: textValue(values, 'toOwner'),
        };
        if (actionTarget.type === 'lead')
          await transferOpenCoreCrmLeadOwner(actionTarget.id, body);
        if (actionTarget.type === 'customer')
          await transferOpenCoreCrmCustomerOwner(actionTarget.id, body);
        if (actionTarget.type === 'opportunity')
          await transferOpenCoreCrmOpportunityOwner(actionTarget.id, body);
      } else if (actionKind === 'follow') {
        await createOpenCoreCrmFollowUp({
          content: textValue(values, 'content'),
          createdBy: textValue(values, 'createdBy'),
          method: textValue(values, 'method') as 'call',
          nextContactAt: dateText(values, 'nextContactAt'),
          outcome: optionalText(values, 'outcome'),
          targetId: actionTarget.id,
          targetType: actionTarget.type,
        });
      } else if (actionKind === 'task') {
        await createOpenCoreCrmTask({
          assignee: textValue(values, 'assignee'),
          createdBy: textValue(values, 'createdBy'),
          dueAt: dateText(values, 'dueAt'),
          priority: textValue(values, 'priority') as 'medium',
          remark: optionalText(values, 'remark'),
          targetId: actionTarget.id,
          targetType: actionTarget.type,
          title: textValue(values, 'title'),
        });
      } else if (actionKind === 'attach') {
        await createOpenCoreCrmAttachment({
          mimeType: textValue(values, 'mimeType'),
          originalName: textValue(values, 'originalName'),
          sizeBytes: Number(values.sizeBytes ?? 0),
          storageKey: textValue(values, 'storageKey'),
          targetId: actionTarget.id,
          targetType: actionTarget.type,
          uploadedBy: textValue(values, 'uploadedBy'),
        });
      } else if (actionKind === 'convert') {
        await convertOpenCoreCrmLead(actionTarget.id, {
          actor: textValue(values, 'actor'),
          amount: optionalText(values, 'amount'),
          customerName: optionalText(values, 'customerName'),
          opportunityName: optionalText(values, 'opportunityName'),
        });
      } else if (actionKind === 'stage') {
        await changeOpenCoreCrmOpportunityStage(actionTarget.id, {
          actor: textValue(values, 'actor'),
          closeReason: optionalText(values, 'closeReason'),
          stage: textValue(values, 'stage') as CrmOpportunitySummary['stage'],
        });
      }
      message.success(
        formatMessage(
          crmMessageId('messages.actionCompleted'),
          'CRM action completed.',
        ),
      );
      closeActionModal();
      await reloadCrm();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              crmMessageId('messages.actionFailed'),
              'CRM action failed.',
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const archiveRow = async (row: CrmRow) => {
    if (row.resource === 'leads') await archiveOpenCoreCrmLead(row.id);
    if (row.resource === 'customers') await archiveOpenCoreCrmCustomer(row.id);
    if (row.resource === 'contacts') await archiveOpenCoreCrmContact(row.id);
    if (row.resource === 'opportunities')
      await archiveOpenCoreCrmOpportunity(row.id);
    message.success(
      formatMessage(crmMessageId('messages.archived'), 'CRM record archived.'),
    );
    await reloadCrm();
  };

  const completeTask = async (row: CrmRow) => {
    await completeOpenCoreCrmTask(row.id, { actor: DEFAULT_ACTOR });
    message.success(
      formatMessage(
        crmMessageId('messages.taskCompleted'),
        'CRM task completed.',
      ),
    );
    await reloadCrm();
  };

  const requestTable = async (params: Record<string, unknown>) => {
    const page = pageNumber(params.current, 1);
    const pageSize = pageNumber(params.pageSize, 10);
    const keyword = optionalText(params, 'keyword');
    const owner = optionalText(params, 'owner');
    const status = optionalText(params, 'status');
    const stage = optionalText(params, 'stage');
    const assignee = optionalText(params, 'assignee');

    if (activeTab === 'leads') {
      const result = await pageOpenCoreCrmLeads({
        keyword,
        owner,
        page,
        pageSize,
        status: status as CrmLeadSummary['status'] | undefined,
      });
      const data = rowify('leads', result.items);
      setTableRows(data);
      return { data, success: true, total: result.total };
    }
    if (activeTab === 'customers') {
      const result = await pageOpenCoreCrmCustomers({
        keyword,
        owner,
        page,
        pageSize,
        status: status as CrmCustomerSummary['status'] | undefined,
      });
      const data = rowify('customers', result.items);
      setTableRows(data);
      return { data, success: true, total: result.total };
    }
    if (activeTab === 'contacts') {
      const result = await pageOpenCoreCrmContacts({
        keyword,
        owner,
        page,
        pageSize,
      });
      const data = rowify('contacts', result.items);
      setTableRows(data);
      return { data, success: true, total: result.total };
    }
    if (activeTab === 'opportunities') {
      const result = await pageOpenCoreCrmOpportunities({
        keyword,
        owner,
        page,
        pageSize,
        stage: stage as CrmOpportunitySummary['stage'] | undefined,
      });
      const data = rowify('opportunities', result.items);
      setTableRows(data);
      return { data, success: true, total: result.total };
    }
    if (activeTab === 'tasks') {
      const result = await pageOpenCoreCrmTasks({
        assignee,
        page,
        pageSize,
        status: status as CrmTaskSummary['status'] | undefined,
      });
      const data = rowify('tasks', result.items);
      setTableRows(data);
      return { data, success: true, total: result.total };
    }
    if (activeTab === 'tags') {
      const result = await pageOpenCoreCrmTags({ page, pageSize });
      const data = rowify('tags', result.items);
      setTableRows(data);
      return { data, success: true, total: result.total };
    }

    const result = await pageOpenCoreCrmActivities({ page, pageSize });
    const data = rowify('activity', result.items);
    setTableRows(data);

    return {
      data,
      success: true,
      total: result.total,
    };
  };

  const columns: ProColumns<CrmRow>[] = [
    {
      title: formatMessage(crmMessageId('fields.keyword'), 'Keyword'),
      dataIndex: 'keyword',
      hideInTable: true,
      search: !['contacts', 'customers', 'leads', 'opportunities'].includes(
        activeTab,
      )
        ? false
        : undefined,
    },
    {
      title: formatMessage(crmMessageId('fields.owner'), 'Owner'),
      dataIndex: 'owner',
      hideInTable: true,
      search: !['contacts', 'customers', 'leads', 'opportunities'].includes(
        activeTab,
      )
        ? false
        : undefined,
    },
    {
      title: formatMessage(crmMessageId('fields.assignee'), 'Assignee'),
      dataIndex: 'assignee',
      hideInTable: true,
      search: activeTab !== 'tasks' ? false : undefined,
    },
    {
      title: formatMessage(crmMessageId('fields.status'), 'Status'),
      dataIndex: 'status',
      hideInTable: true,
      search: !['customers', 'leads', 'tasks'].includes(activeTab)
        ? false
        : undefined,
      valueType: 'select',
      valueEnum: valueEnum(
        activeTab === 'customers'
          ? CUSTOMER_STATUSES
          : activeTab === 'tasks'
            ? TASK_STATUSES
            : LEAD_STATUSES,
        formatMessage,
        activeTab === 'customers'
          ? 'customerStatus'
          : activeTab === 'tasks'
            ? 'taskStatus'
            : 'leadStatus',
      ),
    },
    {
      title: formatMessage(crmMessageId('fields.stage'), 'Stage'),
      dataIndex: 'stage',
      hideInTable: true,
      search: activeTab !== 'opportunities' ? false : undefined,
      valueType: 'select',
      valueEnum: valueEnum(
        OPPORTUNITY_STAGES,
        formatMessage,
        'opportunityStage',
      ),
    },
    {
      title: formatMessage(crmMessageId('fields.tenant'), 'Tenant'),
      dataIndex: 'tenantId',
      search: false,
      width: 150,
    },
    {
      title:
        activeTab === 'tasks'
          ? formatMessage(crmMessageId('fields.title'), 'Title')
          : formatMessage(crmMessageId('fields.name'), 'Name'),
      dataIndex: activeTab === 'tasks' ? 'title' : 'name',
      search: false,
      render: (_, record) => (
        <Typography.Link onClick={() => setSelected(record)}>
          {getString(record, activeTab === 'tasks' ? 'title' : 'name') ??
            getString(record, 'number') ??
            record.id}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage(crmMessageId('fields.number'), 'Number'),
      dataIndex: 'number',
      search: false,
      width: 170,
      hideInTable: !['customers', 'leads', 'opportunities'].includes(activeTab),
    },
    {
      title: formatMessage(crmMessageId('fields.customer'), 'Customer'),
      dataIndex: 'customerName',
      search: false,
      width: 180,
      hideInTable: !['contacts', 'opportunities'].includes(activeTab),
    },
    {
      title: formatMessage(crmMessageId('fields.owner'), 'Owner'),
      dataIndex: 'owner',
      search: false,
      width: 130,
      hideInTable: ['activity', 'tags', 'tasks'].includes(activeTab),
    },
    {
      title: formatMessage(crmMessageId('fields.assignee'), 'Assignee'),
      dataIndex: 'assignee',
      search: false,
      width: 130,
      hideInTable: activeTab !== 'tasks',
    },
    {
      title: formatMessage(crmMessageId('fields.status'), 'Status'),
      dataIndex: 'status',
      search: false,
      width: 120,
      hideInTable: ['activity', 'opportunities', 'tags'].includes(activeTab),
      render: (_, record) => (
        <Tag color={statusColor(getString(record, 'status'))}>
          {getString(record, 'status') ?? '-'}
        </Tag>
      ),
    },
    {
      title: formatMessage(crmMessageId('fields.stage'), 'Stage'),
      dataIndex: 'stage',
      search: false,
      width: 140,
      hideInTable: activeTab !== 'opportunities',
      render: (_, record) => (
        <Tag color={statusColor(getString(record, 'stage'))}>
          {getString(record, 'stage')}
        </Tag>
      ),
    },
    {
      title: formatMessage(crmMessageId('fields.amount'), 'Amount'),
      dataIndex: 'amount',
      search: false,
      width: 120,
      hideInTable: activeTab !== 'opportunities',
    },
    {
      title: formatMessage(crmMessageId('fields.target'), 'Target'),
      dataIndex: 'targetId',
      search: false,
      width: 180,
      hideInTable: activeTab !== 'activity',
      render: (_, record) => (
        <Space size={4}>
          <Tag>{getString(record, 'activityType')}</Tag>
          <Typography.Text copyable>
            {getString(record, 'targetId')}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: formatMessage(crmMessageId('fields.dueAt'), 'Due'),
      dataIndex: 'dueAt',
      search: false,
      width: 180,
      hideInTable: activeTab !== 'tasks',
    },
    {
      title: formatMessage(crmMessageId('actions.column'), 'Action'),
      valueType: 'option',
      width: 260,
      render: (_, record) => {
        const target = targetForRow(record);
        return [
          <Tooltip
            key="detail"
            title={formatMessage(crmMessageId('actions.detail'), 'Detail')}
          >
            <Button
              icon={<EyeOutlined />}
              onClick={() => setSelected(record)}
              size="small"
              type="link"
            />
          </Tooltip>,
          access.canUpdateCrm &&
          ['leads', 'customers', 'contacts', 'opportunities', 'tags'].includes(
            record.resource,
          ) ? (
            <Tooltip
              key="edit"
              title={formatMessage(crmMessageId('actions.edit'), 'Edit')}
            >
              <Button
                icon={<EditOutlined />}
                onClick={() =>
                  openEdit(
                    record.resource === 'leads'
                      ? 'lead'
                      : record.resource === 'customers'
                        ? 'customer'
                        : record.resource === 'contacts'
                          ? 'contact'
                          : record.resource === 'opportunities'
                            ? 'opportunity'
                            : 'tag',
                    record,
                  )
                }
                size="small"
                type="link"
              />
            </Tooltip>
          ) : null,
          access.canAssignCrm &&
          target &&
          ['lead', 'customer', 'opportunity'].includes(target.type) ? (
            <Tooltip
              key="transfer"
              title={formatMessage(
                crmMessageId('actions.transferOwner'),
                'Transfer owner',
              )}
            >
              <Button
                icon={<SwapOutlined />}
                onClick={() => openAction('transfer', target)}
                size="small"
                type="link"
              />
            </Tooltip>
          ) : null,
          access.canCommentCrm && target ? (
            <Tooltip
              key="follow"
              title={formatMessage(
                crmMessageId('actions.followUp'),
                'Follow up',
              )}
            >
              <Button
                icon={<CommentOutlined />}
                onClick={() => openAction('follow', target)}
                size="small"
                type="link"
              />
            </Tooltip>
          ) : null,
          access.canUpdateCrm && target ? (
            <Tooltip
              key="task"
              title={formatMessage(
                crmMessageId('actions.reminder'),
                'Reminder',
              )}
            >
              <Button
                onClick={() => openAction('task', target)}
                size="small"
                type="link"
              >
                {formatMessage(crmMessageId('actions.task'), 'Task')}
              </Button>
            </Tooltip>
          ) : null,
          access.canUpdateCrm && target ? (
            <Tooltip
              key="attach"
              title={formatMessage(
                crmMessageId('actions.attachment'),
                'Attachment',
              )}
            >
              <Button
                icon={<CloudUploadOutlined />}
                onClick={() => openAction('attach', target)}
                size="small"
                type="link"
              />
            </Tooltip>
          ) : null,
          access.canUpdateCrm && record.resource === 'leads' ? (
            <Button
              key="convert"
              onClick={() =>
                openAction('convert', {
                  id: record.id,
                  title: getString(record, 'name') ?? record.id,
                  type: 'lead',
                })
              }
              size="small"
              type="link"
            >
              {formatMessage(crmMessageId('actions.convert'), 'Convert')}
            </Button>
          ) : null,
          access.canUpdateCrm && record.resource === 'opportunities' ? (
            <Button
              key="stage"
              onClick={() =>
                openAction('stage', {
                  id: record.id,
                  title: getString(record, 'name') ?? record.id,
                  type: 'opportunity',
                })
              }
              size="small"
              type="link"
            >
              {formatMessage(crmMessageId('actions.stage'), 'Stage')}
            </Button>
          ) : null,
          access.canUpdateCrm &&
          record.resource === 'tasks' &&
          getString(record, 'status') === 'open' ? (
            <Tooltip
              key="complete"
              title={formatMessage(
                crmMessageId('actions.completeTask'),
                'Complete task',
              )}
            >
              <Button
                icon={<CheckCircleOutlined />}
                onClick={() => void completeTask(record)}
                size="small"
                type="link"
              />
            </Tooltip>
          ) : null,
          access.canDeleteCrm &&
          ['leads', 'customers', 'contacts', 'opportunities'].includes(
            record.resource,
          ) ? (
            <Popconfirm
              key="archive"
              onConfirm={() => void archiveRow(record)}
              title={formatMessage(
                crmMessageId('actions.archiveConfirm'),
                'Archive this CRM record?',
              )}
            >
              <Button danger size="small" type="link">
                {formatMessage(crmMessageId('actions.archive'), 'Archive')}
              </Button>
            </Popconfirm>
          ) : null,
        ].filter(Boolean);
      },
    },
  ];

  const exportColumns = useMemo(
    () => createExportColumns(activeTab, formatMessage),
    [activeTab, formatMessage],
  );

  return (
    <PageContainer
      title={formatMessage(crmMessageId('title'), 'CRM')}
      subTitle={formatMessage(crmMessageId('section'), 'Industry')}
    >
      {loadError ? (
        <Alert
          action={
            <Button onClick={() => void reloadCrm()} size="small">
              {formatMessage(crmMessageId('actions.retry'), 'Retry')}
            </Button>
          }
          message={formatMessage(
            crmMessageId('load.liveFailure'),
            'Live CRM unavailable',
          )}
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
          description={loadError}
        />
      ) : null}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              loading={loading}
              title={formatMessage(crmMessageId('stats.leads'), 'Leads')}
              value={summary?.leads}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              loading={loading}
              title={formatMessage(
                crmMessageId('stats.customers'),
                'Customers',
              )}
              value={summary?.customers}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              loading={loading}
              title={formatMessage(
                crmMessageId('stats.openTasks'),
                'Open Tasks',
              )}
              value={summary?.openTasks}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              loading={loading}
              prefix="$"
              title={formatMessage(
                crmMessageId('stats.openPipeline'),
                'Open Pipeline',
              )}
              value={summary?.openPipelineAmount}
            />
          </Card>
        </Col>
      </Row>

      <ProTable<CrmRow>
        actionRef={actionRef}
        columns={columns}
        params={{ activeTab }}
        request={requestTable}
        rowKey="id"
        search={
          ['activity', 'tags'].includes(activeTab)
            ? false
            : { labelWidth: 'auto' }
        }
        scroll={{ x: 1180 }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        toolbar={{
          menu: {
            activeKey: activeTab,
            items: [
              {
                key: 'leads',
                label: formatMessage(crmMessageId('tabs.leads'), 'Leads'),
              },
              {
                key: 'customers',
                label: formatMessage(
                  crmMessageId('tabs.customers'),
                  'Customers',
                ),
              },
              {
                key: 'contacts',
                label: formatMessage(crmMessageId('tabs.contacts'), 'Contacts'),
              },
              {
                key: 'opportunities',
                label: formatMessage(
                  crmMessageId('tabs.opportunities'),
                  'Opportunities',
                ),
              },
              {
                key: 'tasks',
                label: formatMessage(crmMessageId('tabs.tasks'), 'Tasks'),
              },
              {
                key: 'tags',
                label: formatMessage(crmMessageId('tabs.tags'), 'Tags'),
              },
              {
                key: 'activity',
                label: formatMessage(crmMessageId('tabs.activity'), 'Activity'),
              },
            ],
            onChange: (key) => {
              setActiveTab(key as CrmTab);
              setSelected(undefined);
              setTableRows([]);
            },
            type: 'tab',
          },
          actions: [
            <Button
              icon={<ReloadOutlined />}
              key="reload"
              onClick={() => void reloadCrm()}
            >
              {formatMessage(crmMessageId('actions.reload'), 'Reload')}
            </Button>,
            access.canCreateCrm &&
            !['activity', 'tasks'].includes(activeTab) ? (
              <Button
                icon={<PlusOutlined />}
                key="create"
                onClick={() =>
                  openCreate(
                    activeTab === 'leads'
                      ? 'lead'
                      : activeTab === 'customers'
                        ? 'customer'
                        : activeTab === 'contacts'
                          ? 'contact'
                          : activeTab === 'opportunities'
                            ? 'opportunity'
                            : activeTab === 'tags'
                              ? 'tag'
                              : 'lead',
                  )
                }
                type="primary"
              >
                {formatMessage(crmMessageId('actions.create'), 'Create')}
              </Button>
            ) : null,
            access.canExportCrm ? (
              <CurrentPageExportButton<CrmRow>
                columns={exportColumns}
                filename={`opencore-crm-${activeTab}.csv`}
                key="export"
                resource={`crm-${activeTab}`}
                rows={tableRows}
              />
            ) : null,
          ].filter(Boolean),
        }}
      />

      <ReadOnlyDetailDrawer
        fields={[
          {
            label: formatMessage(crmMessageId('fields.tenant'), 'Tenant'),
            value: selected?.tenantId,
          },
          {
            label: formatMessage(crmMessageId('fields.id'), 'ID'),
            value: selected?.id,
          },
          {
            label: formatMessage(crmMessageId('fields.resource'), 'Resource'),
            value: selected?.resource,
          },
          {
            label: formatMessage(crmMessageId('fields.number'), 'Number'),
            value: selected && getString(selected, 'number'),
          },
          {
            label: formatMessage(crmMessageId('fields.name'), 'Name'),
            value: selected && getString(selected, 'name'),
          },
          {
            label: formatMessage(crmMessageId('fields.title'), 'Title'),
            value: selected && getString(selected, 'title'),
          },
          {
            label: formatMessage(crmMessageId('fields.status'), 'Status'),
            value: selected && getString(selected, 'status'),
          },
          {
            label: formatMessage(crmMessageId('fields.stage'), 'Stage'),
            value: selected && getString(selected, 'stage'),
          },
          {
            label: formatMessage(crmMessageId('fields.owner'), 'Owner'),
            value: selected && getString(selected, 'owner'),
          },
          {
            label: formatMessage(crmMessageId('fields.target'), 'Target'),
            value:
              selected &&
              [
                getString(selected, 'targetType'),
                getString(selected, 'targetId'),
              ]
                .filter(Boolean)
                .join(' / '),
          },
          {
            label: formatMessage(
              crmMessageId('fields.createdAt'),
              'Created At',
            ),
            value: selected && getString(selected, 'createdAt'),
          },
          {
            label: formatMessage(
              crmMessageId('fields.updatedAt'),
              'Updated At',
            ),
            value: selected && getString(selected, 'updatedAt'),
          },
        ]}
        jsonSections={
          selected
            ? [
                {
                  title: formatMessage(crmMessageId('fields.record'), 'Record'),
                  value: selected,
                },
              ]
            : []
        }
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={
          selected
            ? (getString(selected, 'name') ??
              getString(selected, 'title') ??
              selected.id)
            : formatMessage(crmMessageId('detail.title'), 'CRM Detail')
        }
      />

      <Modal
        destroyOnClose
        okButtonProps={{ loading: submitting }}
        onCancel={closeEntityModal}
        onOk={() => void submitEntity()}
        open={Boolean(entityKind)}
        title={formatMessage(
          editing
            ? crmMessageId('modal.editTitle')
            : crmMessageId('modal.createTitle'),
          editing ? 'Edit CRM {kind}' : 'Create CRM {kind}',
          { kind: entityLabel(entityKind, formatMessage) },
        )}
        width={720}
      >
        <Form form={entityForm} layout="vertical">
          <EntityFields
            customers={customers}
            editing={editing}
            entityKind={entityKind}
            formatMessage={formatMessage}
            tags={tags}
          />
        </Form>
      </Modal>

      <Modal
        destroyOnClose
        okButtonProps={{ loading: submitting }}
        onCancel={closeActionModal}
        onOk={() => void submitAction()}
        open={Boolean(actionKind)}
        title={formatMessage(
          crmMessageId('modal.actionTitle'),
          '{kind} {title}',
          {
            kind: actionLabel(actionKind, formatMessage),
            title: actionTarget?.title ?? '',
          },
        )}
        width={640}
      >
        <Form form={actionForm} layout="vertical">
          <ActionFields actionKind={actionKind} formatMessage={formatMessage} />
        </Form>
      </Modal>
    </PageContainer>
  );
}

function EntityFields({
  customers,
  editing,
  entityKind,
  formatMessage,
  tags,
}: {
  customers: readonly CrmCustomerSummary[];
  editing?: CrmRow;
  entityKind?: EntityKind;
  formatMessage: FormatMessage;
  tags: readonly CrmTagSummary[];
}) {
  if (!entityKind) return null;
  const leadStatusValues =
    editing && getString(editing, 'status') === 'converted'
      ? ['converted']
      : WRITABLE_LEAD_STATUSES;
  const opportunityStageValues =
    entityKind === 'opportunity' && editing
      ? [getString(editing, 'stage') ?? 'qualification']
      : OPEN_OPPORTUNITY_STAGES;

  if (entityKind === 'tag') {
    return (
      <>
        <Form.Item
          label={formatMessage(crmMessageId('fields.code'), 'Code')}
          name="code"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(crmMessageId('fields.name'), 'Name')}
          name="name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(crmMessageId('fields.color'), 'Color')}
          name="color"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            crmMessageId('fields.description'),
            'Description',
          )}
          name="description"
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item
          label={formatMessage(crmMessageId('fields.enabled'), 'Enabled')}
          name="enabled"
        >
          <Select
            options={[
              {
                label: formatMessage(crmMessageId('values.enabled'), 'enabled'),
                value: true,
              },
              {
                label: formatMessage(
                  crmMessageId('values.disabled'),
                  'disabled',
                ),
                value: false,
              },
            ]}
          />
        </Form.Item>
      </>
    );
  }

  return (
    <>
      {entityKind === 'contact' || entityKind === 'opportunity' ? (
        <Form.Item
          label={formatMessage(crmMessageId('fields.customer'), 'Customer')}
          name="customerId"
          rules={[{ required: true }]}
        >
          <Select
            showSearch
            options={customers.map((customer) => ({
              label: customer.name,
              value: customer.id,
            }))}
          />
        </Form.Item>
      ) : null}
      <Form.Item
        label={formatMessage(crmMessageId('fields.name'), 'Name')}
        name="name"
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      {entityKind !== 'contact' ? (
        <Form.Item
          label={formatMessage(crmMessageId('fields.owner'), 'Owner')}
          name="owner"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
      ) : (
        <Form.Item
          label={formatMessage(crmMessageId('fields.owner'), 'Owner')}
          name="owner"
        >
          <Input />
        </Form.Item>
      )}
      {entityKind === 'lead' ? (
        <>
          <Form.Item
            label={formatMessage(crmMessageId('fields.company'), 'Company')}
            name="company"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(crmMessageId('fields.source'), 'Source')}
            name="source"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(crmMessageId('fields.status'), 'Status')}
            name="status"
          >
            <Select
              options={enumOptions(
                leadStatusValues,
                formatMessage,
                'leadStatus',
              )}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage(crmMessageId('fields.rating'), 'Rating')}
            name="rating"
          >
            <Input />
          </Form.Item>
        </>
      ) : null}
      {entityKind === 'customer' ? (
        <>
          <Form.Item
            label={formatMessage(crmMessageId('fields.status'), 'Status')}
            name="status"
          >
            <Select
              options={enumOptions(
                CUSTOMER_STATUSES,
                formatMessage,
                'customerStatus',
              )}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage(crmMessageId('fields.level'), 'Level')}
            name="level"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(crmMessageId('fields.source'), 'Source')}
            name="source"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(crmMessageId('fields.industry'), 'Industry')}
            name="industry"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(crmMessageId('fields.region'), 'Region')}
            name="region"
          >
            <Input />
          </Form.Item>
        </>
      ) : null}
      {entityKind === 'contact' ? (
        <>
          <Form.Item
            label={formatMessage(crmMessageId('fields.title'), 'Title')}
            name="title"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              crmMessageId('fields.decisionRole'),
              'Decision Role',
            )}
            name="decisionRole"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(crmMessageId('fields.primary'), 'Primary')}
            name="primary"
          >
            <Select
              options={[
                {
                  label: formatMessage(
                    crmMessageId('values.primary'),
                    'primary',
                  ),
                  value: true,
                },
                {
                  label: formatMessage(
                    crmMessageId('values.secondary'),
                    'secondary',
                  ),
                  value: false,
                },
              ]}
            />
          </Form.Item>
        </>
      ) : null}
      {entityKind === 'opportunity' ? (
        <>
          <Form.Item
            label={formatMessage(crmMessageId('fields.stage'), 'Stage')}
            name="stage"
          >
            <Select
              options={enumOptions(
                opportunityStageValues,
                formatMessage,
                'opportunityStage',
              )}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage(crmMessageId('fields.amount'), 'Amount')}
            name="amount"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              crmMessageId('fields.probability'),
              'Probability',
            )}
            name="probability"
          >
            <InputNumber max={100} min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              crmMessageId('fields.expectedCloseAt'),
              'Expected Close',
            )}
            name="expectedCloseAt"
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </>
      ) : null}
      {entityKind === 'lead' ||
      entityKind === 'customer' ||
      entityKind === 'contact' ? (
        <>
          <Form.Item
            label={formatMessage(crmMessageId('fields.mobile'), 'Mobile')}
            name="mobile"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(crmMessageId('fields.email'), 'Email')}
            name="email"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(crmMessageId('fields.phone'), 'Phone')}
            name="phone"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              crmMessageId('fields.nextContactAt'),
              'Next Contact',
            )}
            name="nextContactAt"
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </>
      ) : null}
      {entityKind === 'customer' ? (
        <>
          <Form.Item
            label={formatMessage(crmMessageId('fields.website'), 'Website')}
            name="website"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(crmMessageId('fields.address'), 'Address')}
            name="address"
          >
            <Input />
          </Form.Item>
        </>
      ) : null}
      {entityKind !== 'contact' ? (
        <Form.Item
          extra={tags.map((tag) => tag.code).join(', ')}
          label={formatMessage(crmMessageId('fields.tags'), 'Tags')}
          name="tags"
        >
          <Input
            placeholder={formatMessage(
              crmMessageId('placeholders.tags'),
              'comma separated tag codes',
            )}
          />
        </Form.Item>
      ) : null}
      <Form.Item
        label={formatMessage(crmMessageId('fields.remark'), 'Remark')}
        name="remark"
      >
        <Input.TextArea rows={3} />
      </Form.Item>
    </>
  );
}

function ActionFields({
  actionKind,
  formatMessage,
}: {
  actionKind?: ActionKind;
  formatMessage: FormatMessage;
}) {
  if (!actionKind) return null;

  if (actionKind === 'transfer') {
    return (
      <>
        <Form.Item
          label={formatMessage(crmMessageId('fields.newOwner'), 'New Owner')}
          name="toOwner"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(crmMessageId('fields.actor'), 'Actor')}
          name="actor"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(crmMessageId('fields.reason'), 'Reason')}
          name="reason"
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </>
    );
  }

  if (actionKind === 'follow') {
    return (
      <>
        <Form.Item
          label={formatMessage(crmMessageId('fields.method'), 'Method')}
          name="method"
          rules={[{ required: true }]}
        >
          <Select
            options={enumOptions(FOLLOW_UP_METHODS, formatMessage, 'method')}
          />
        </Form.Item>
        <Form.Item
          label={formatMessage(crmMessageId('fields.content'), 'Content')}
          name="content"
          rules={[{ required: true }]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item
          label={formatMessage(crmMessageId('fields.outcome'), 'Outcome')}
          name="outcome"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            crmMessageId('fields.nextContactAt'),
            'Next Contact',
          )}
          name="nextContactAt"
        >
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label={formatMessage(crmMessageId('fields.createdBy'), 'Created By')}
          name="createdBy"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
      </>
    );
  }

  if (actionKind === 'task') {
    return (
      <>
        <Form.Item
          label={formatMessage(crmMessageId('fields.title'), 'Title')}
          name="title"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(crmMessageId('fields.assignee'), 'Assignee')}
          name="assignee"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(crmMessageId('fields.priority'), 'Priority')}
          name="priority"
        >
          <Select
            options={enumOptions(TASK_PRIORITIES, formatMessage, 'priority')}
          />
        </Form.Item>
        <Form.Item
          label={formatMessage(crmMessageId('fields.dueAt'), 'Due At')}
          name="dueAt"
        >
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label={formatMessage(crmMessageId('fields.createdBy'), 'Created By')}
          name="createdBy"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(crmMessageId('fields.remark'), 'Remark')}
          name="remark"
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </>
    );
  }

  if (actionKind === 'attach') {
    return (
      <>
        <Form.Item
          label={formatMessage(
            crmMessageId('fields.originalName'),
            'Original Name',
          )}
          name="originalName"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(crmMessageId('fields.mimeType'), 'MIME Type')}
          name="mimeType"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(crmMessageId('fields.sizeBytes'), 'Size Bytes')}
          name="sizeBytes"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            crmMessageId('fields.storageKey'),
            'Storage Key',
          )}
          name="storageKey"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            crmMessageId('fields.uploadedBy'),
            'Uploaded By',
          )}
          name="uploadedBy"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
      </>
    );
  }

  if (actionKind === 'convert') {
    return (
      <>
        <Form.Item
          label={formatMessage(crmMessageId('fields.actor'), 'Actor')}
          name="actor"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            crmMessageId('fields.customerName'),
            'Customer Name',
          )}
          name="customerName"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            crmMessageId('fields.opportunityName'),
            'Opportunity Name',
          )}
          name="opportunityName"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            crmMessageId('fields.opportunityAmount'),
            'Opportunity Amount',
          )}
          name="amount"
        >
          <Input />
        </Form.Item>
      </>
    );
  }

  return (
    <>
      <Form.Item
        label={formatMessage(crmMessageId('fields.stage'), 'Stage')}
        name="stage"
        rules={[{ required: true }]}
      >
        <Select
          options={enumOptions(
            OPPORTUNITY_STAGES,
            formatMessage,
            'opportunityStage',
          )}
        />
      </Form.Item>
      <Form.Item
        label={formatMessage(crmMessageId('fields.actor'), 'Actor')}
        name="actor"
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label={formatMessage(
          crmMessageId('fields.closeReason'),
          'Close Reason',
        )}
        name="closeReason"
      >
        <Input />
      </Form.Item>
    </>
  );
}
