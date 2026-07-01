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
  BusinessCustomerSummary,
  BusinessLeadSummary,
  BusinessOpenOpportunityStage,
  BusinessOpportunitySummary,
  BusinessSummary,
  BusinessTagSummary,
  BusinessTargetType,
  BusinessTaskSummary,
  BusinessWritableCustomerStatus,
  BusinessWritableLeadStatus,
} from '@opencore/sdk';
import { history, useAccess, useIntl } from '@umijs/max';
import zhMessages from '@/locales/zh-CN';
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
  archiveOpenCoreBusinessContact,
  archiveOpenCoreBusinessCustomer,
  archiveOpenCoreBusinessLead,
  archiveOpenCoreBusinessOpportunity,
  changeOpenCoreBusinessOpportunityStage,
  completeOpenCoreBusinessTask,
  convertOpenCoreBusinessLead,
  createOpenCoreBusinessAttachment,
  createOpenCoreBusinessContact,
  createOpenCoreBusinessCustomer,
  createOpenCoreBusinessFollowUp,
  createOpenCoreBusinessLead,
  createOpenCoreBusinessOpportunity,
  createOpenCoreBusinessTag,
  createOpenCoreBusinessTask,
  getOpenCoreBusinessSummary,
  pageOpenCoreBusinessActivities,
  pageOpenCoreBusinessContacts,
  pageOpenCoreBusinessCustomers,
  pageOpenCoreBusinessLeads,
  pageOpenCoreBusinessOpportunities,
  pageOpenCoreBusinessTags,
  pageOpenCoreBusinessTasks,
  transferOpenCoreBusinessCustomerOwner,
  transferOpenCoreBusinessLeadOwner,
  transferOpenCoreBusinessOpportunityOwner,
  updateOpenCoreBusinessContact,
  updateOpenCoreBusinessCustomer,
  updateOpenCoreBusinessLead,
  updateOpenCoreBusinessOpportunity,
  updateOpenCoreBusinessTag,
} from '@/services/opencore/platform';
import dayjs, { type Dayjs } from 'dayjs';
import {
  CurrentPageExportButton,
  type CurrentPageExportColumn,
} from '../../shared/CurrentPageExportButton';
import { ReadOnlyDetailDrawer } from '../../shared/ReadOnlyDetailDrawer';

type BusinessSectionKey =
  | 'activity'
  | 'contacts'
  | 'customers'
  | 'leads'
  | 'opportunities'
  | 'tags'
  | 'tasks';
export type BusinessRouteKey = 'overview' | BusinessSectionKey;
type EntityKind = 'contact' | 'customer' | 'lead' | 'opportunity' | 'tag';
type ActionKind =
  | 'attach'
  | 'convert'
  | 'follow'
  | 'stage'
  | 'task'
  | 'transfer';
type BusinessRow = Record<string, unknown> & {
  id: string;
  tenantId: string;
  resource: BusinessSectionKey;
};
type TargetContext = {
  id: string;
  title: string;
  type: BusinessTargetType;
};
type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const DEFAULT_ACTOR = 'admin';
const BUSINESS_MESSAGE_PREFIX = 'pages.business.core.';
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
const DEFAULT_TABLE_SCROLL_X = 1180;
const OPPORTUNITY_NAME_COLUMN_WIDTH = 260;
const OPPORTUNITY_TABLE_SCROLL_X = 1420;
export const BUSINESS_ROUTE_PATHS: Record<BusinessRouteKey, string> = {
  activity: '/business/activity',
  contacts: '/business/contacts',
  customers: '/business/accounts',
  leads: '/business/leads',
  opportunities: '/business/opportunities',
  overview: '/business/overview',
  tags: '/business/tags',
  tasks: '/business/tasks',
};
const BUSINESS_ROUTE_TITLE_FALLBACKS: Record<BusinessRouteKey, string> = {
  activity: 'Activity',
  contacts: 'Contacts',
  customers: 'Accounts',
  leads: 'Leads',
  opportunities: 'Opportunities',
  overview: 'Customer Operations',
  tags: 'Tags',
  tasks: 'Tasks',
};

function businessMessageId(suffix: string): string {
  return `pages.business.core.${suffix}`;
}

function interpolateMessage(
  template: string,
  values?: Record<string, number | string>,
): string {
  if (!values) return template;

  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

function amountText(
  value: string | undefined,
  locale: string,
): string | undefined {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;

  return new Intl.NumberFormat(locale || undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(number);
}

function valueEnum(
  values: readonly string[],
  formatMessage: FormatMessage,
  scope: string,
) {
  return Object.fromEntries(
    values.map((value) => [
      value,
      { text: formatMessage(businessMessageId(`${scope}.${value}`), value) },
    ]),
  );
}

function enumOptions(
  values: readonly string[],
  formatMessage: FormatMessage,
  scope: string,
) {
  return values.map((value) => ({
    label: formatMessage(businessMessageId(`${scope}.${value}`), value),
    value,
  }));
}

function businessRouteTitle(
  routeKey: BusinessRouteKey,
  formatMessage: FormatMessage,
): string {
  return formatMessage(
    businessMessageId(routeKey === 'overview' ? 'title' : `tabs.${routeKey}`),
    BUSINESS_ROUTE_TITLE_FALLBACKS[routeKey],
  );
}

function entityLabel(
  kind: EntityKind | undefined,
  formatMessage: FormatMessage,
): string {
  return kind
    ? formatMessage(businessMessageId(`entityKind.${kind}`), kind)
    : '';
}

function actionLabel(
  kind: ActionKind | undefined,
  formatMessage: FormatMessage,
): string {
  return kind
    ? formatMessage(businessMessageId(`actionKind.${kind}`), kind)
    : formatMessage(businessMessageId('actionKind.action'), 'Action');
}

function rowify<T extends { id: string; tenantId: string }>(
  resource: BusinessSectionKey,
  rows: readonly T[],
): BusinessRow[] {
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

function datePickerValue(value: unknown): Dayjs | undefined {
  if (!value) return undefined;
  if (typeof value === 'string' || value instanceof Date) {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : undefined;
  }
  if (dayjs.isDayjs(value)) {
    return value;
  }
  return undefined;
}

function editableEntityValues(row: BusinessRow): Record<string, unknown> {
  return {
    ...row,
    expectedCloseAt: datePickerValue(row.expectedCloseAt),
    nextContactAt: datePickerValue(row.nextContactAt),
    tags: Array.isArray(row.tags) ? row.tags.join(', ') : undefined,
  };
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

function getString(row: BusinessRow, key: string): string | undefined {
  const value = row[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getNumber(row: BusinessRow, key: string): number | undefined {
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

function enumText(
  value: string | undefined,
  scope: string,
  formatMessage: FormatMessage,
): string {
  return value
    ? formatMessage(businessMessageId(`${scope}.${value}`), value)
    : '-';
}

function statusScope(record: BusinessRow): string {
  if (record.resource === 'customers') return 'customerStatus';
  if (record.resource === 'tasks') return 'taskStatus';
  return 'leadStatus';
}

function statusText(record: BusinessRow, formatMessage: FormatMessage): string {
  return enumText(
    getString(record, 'status'),
    statusScope(record),
    formatMessage,
  );
}

function stageText(record: BusinessRow, formatMessage: FormatMessage): string {
  return enumText(
    getString(record, 'stage'),
    'opportunityStage',
    formatMessage,
  );
}

function activityTypeText(
  record: BusinessRow,
  formatMessage: FormatMessage,
): string {
  return enumText(
    getString(record, 'activityType'),
    'activityType',
    formatMessage,
  );
}

function targetTypeText(
  value: string | undefined,
  formatMessage: FormatMessage,
) {
  return enumText(value, 'targetType', formatMessage);
}

function resourceText(
  value: BusinessSectionKey | undefined,
  formatMessage: FormatMessage,
): string {
  return value ? formatMessage(businessMessageId(`tabs.${value}`), value) : '-';
}

function priorityText(
  record: BusinessRow,
  formatMessage: FormatMessage,
): string {
  return enumText(getString(record, 'priority'), 'priority', formatMessage);
}

function targetForRow(row: BusinessRow): TargetContext | undefined {
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

function isConvertedLead(row: BusinessRow): boolean {
  return row.resource === 'leads' && getString(row, 'status') === 'converted';
}

function canEditRow(row: BusinessRow): boolean {
  return (
    ['leads', 'customers', 'contacts', 'opportunities', 'tags'].includes(
      row.resource,
    ) && !isConvertedLead(row)
  );
}

function canWriteTarget(
  row: BusinessRow,
  target: TargetContext | undefined,
): target is TargetContext {
  return Boolean(target) && !isConvertedLead(row);
}

function createExportColumns(
  tab: BusinessSectionKey,
  formatMessage: FormatMessage,
): CurrentPageExportColumn<BusinessRow>[] {
  const common: CurrentPageExportColumn<BusinessRow>[] = [
    {
      title: formatMessage(businessMessageId('fields.tenant'), 'Tenant'),
      dataIndex: 'tenantId',
    },
    {
      title: formatMessage(businessMessageId('fields.id'), 'ID'),
      dataIndex: 'id',
    },
  ];
  if (tab === 'leads') {
    return [
      ...common,
      {
        title: formatMessage(businessMessageId('fields.number'), 'Number'),
        dataIndex: 'number',
      },
      {
        title: formatMessage(businessMessageId('fields.name'), 'Name'),
        dataIndex: 'name',
      },
      {
        title: formatMessage(businessMessageId('fields.company'), 'Company'),
        dataIndex: 'company',
      },
      {
        title: formatMessage(businessMessageId('fields.status'), 'Status'),
        dataIndex: 'status',
        renderText: (record) => statusText(record, formatMessage),
      },
      {
        title: formatMessage(businessMessageId('fields.owner'), 'Owner'),
        dataIndex: 'owner',
      },
      {
        title: formatMessage(businessMessageId('fields.source'), 'Source'),
        dataIndex: 'source',
      },
    ];
  }
  if (tab === 'customers') {
    return [
      ...common,
      {
        title: formatMessage(businessMessageId('fields.number'), 'Number'),
        dataIndex: 'number',
      },
      {
        title: formatMessage(businessMessageId('fields.name'), 'Name'),
        dataIndex: 'name',
      },
      {
        title: formatMessage(businessMessageId('fields.status'), 'Status'),
        dataIndex: 'status',
        renderText: (record) => statusText(record, formatMessage),
      },
      {
        title: formatMessage(businessMessageId('fields.level'), 'Level'),
        dataIndex: 'level',
      },
      {
        title: formatMessage(businessMessageId('fields.owner'), 'Owner'),
        dataIndex: 'owner',
      },
      {
        title: formatMessage(businessMessageId('fields.source'), 'Source'),
        dataIndex: 'source',
      },
    ];
  }
  if (tab === 'opportunities') {
    return [
      ...common,
      {
        title: formatMessage(businessMessageId('fields.number'), 'Number'),
        dataIndex: 'number',
      },
      {
        title: formatMessage(businessMessageId('fields.name'), 'Name'),
        dataIndex: 'name',
      },
      {
        title: formatMessage(businessMessageId('fields.customer'), 'Customer'),
        dataIndex: 'customerName',
      },
      {
        title: formatMessage(businessMessageId('fields.stage'), 'Stage'),
        dataIndex: 'stage',
        renderText: (record) => stageText(record, formatMessage),
      },
      {
        title: formatMessage(businessMessageId('fields.amount'), 'Amount'),
        dataIndex: 'amount',
      },
      {
        title: formatMessage(businessMessageId('fields.owner'), 'Owner'),
        dataIndex: 'owner',
      },
    ];
  }
  if (tab === 'tasks') {
    return [
      ...common,
      {
        title: formatMessage(businessMessageId('fields.title'), 'Title'),
        dataIndex: 'title',
      },
      {
        title: formatMessage(businessMessageId('fields.assignee'), 'Assignee'),
        dataIndex: 'assignee',
      },
      {
        title: formatMessage(businessMessageId('fields.status'), 'Status'),
        dataIndex: 'status',
        renderText: (record) => statusText(record, formatMessage),
      },
      {
        title: formatMessage(businessMessageId('fields.priority'), 'Priority'),
        dataIndex: 'priority',
        renderText: (record) => priorityText(record, formatMessage),
      },
      {
        title: formatMessage(businessMessageId('fields.dueAt'), 'Due At'),
        dataIndex: 'dueAt',
      },
    ];
  }
  return [
    ...common,
    {
      title: formatMessage(businessMessageId('fields.name'), 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage(businessMessageId('fields.title'), 'Title'),
      dataIndex: 'title',
    },
    {
      title: formatMessage(businessMessageId('fields.target'), 'Target'),
      dataIndex: 'targetId',
    },
    {
      title: formatMessage(businessMessageId('fields.owner'), 'Owner'),
      dataIndex: 'owner',
    },
    {
      title: formatMessage(businessMessageId('fields.status'), 'Status'),
      dataIndex: 'status',
      renderText: (record) => statusText(record, formatMessage),
    },
  ];
}

export default function BusinessWorkspace({
  activeTab,
}: {
  activeTab: BusinessRouteKey;
}) {
  const intl = useIntl();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) => {
      const zhMessage =
        intl.locale?.toLowerCase().startsWith('zh') &&
        id.startsWith(BUSINESS_MESSAGE_PREFIX)
          ? (zhMessages as Record<string, string>)[id]
          : undefined;
      if (zhMessage) {
        return interpolateMessage(zhMessage, values);
      }

      return values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage });
    },
    [intl],
  );
  const access = useAccess() as {
    canAssignBusiness?: boolean;
    canCommentBusiness?: boolean;
    canCreateBusiness?: boolean;
    canDeleteBusiness?: boolean;
    canExportBusiness?: boolean;
    canUpdateBusiness?: boolean;
  };
  const [entityForm] = Form.useForm<Record<string, unknown>>();
  const [actionForm] = Form.useForm<Record<string, unknown>>();
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [summary, setSummary] = useState<BusinessSummary>();
  const [tags, setTags] = useState<readonly BusinessTagSummary[]>([]);
  const [customers, setCustomers] = useState<
    readonly BusinessCustomerSummary[]
  >([]);
  const [tableRows, setTableRows] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selected, setSelected] = useState<BusinessRow>();
  const [entityKind, setEntityKind] = useState<EntityKind>();
  const [editing, setEditing] = useState<BusinessRow>();
  const [actionKind, setActionKind] = useState<ActionKind>();
  const [actionTarget, setActionTarget] = useState<TargetContext>();
  const [submitting, setSubmitting] = useState(false);

  const loadBusiness = async () => {
    setLoading(true);
    try {
      const [summaryResult, tagPage, customerPage] = await Promise.all([
        getOpenCoreBusinessSummary(),
        pageOpenCoreBusinessTags({ enabled: true, page: 1, pageSize: 100 }),
        pageOpenCoreBusinessCustomers({ page: 1, pageSize: 100 }),
      ]);
      setSummary(summaryResult);
      setTags([...tagPage.items]);
      setCustomers([...customerPage.items]);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              businessMessageId('load.failure'),
              'Unable to load business data.',
            ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBusiness();
  }, []);

  useEffect(() => {
    setSelected(undefined);
    setTableRows([]);
    actionRef.current?.reload();
  }, [activeTab]);

  const reloadBusiness = async () => {
    await loadBusiness();
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

  const openEdit = (kind: EntityKind, row: BusinessRow) => {
    entityForm.resetFields();
    entityForm.setFieldsValue(editableEntityValues(row));
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
        if (editing) await updateOpenCoreBusinessTag(editing.id, body);
        else await createOpenCoreBusinessTag(body);
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
          await updateOpenCoreBusinessLead(editing.id, {
            ...body,
            ...(status === undefined || status === 'converted'
              ? {}
              : { status: status as BusinessWritableLeadStatus }),
          });
        } else await createOpenCoreBusinessLead(body);
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
          status: optionalText(
            values,
            'status',
          ) as BusinessWritableCustomerStatus,
          tags: splitTags(optionalText(values, 'tags')),
          website: nullableText(values, 'website') ?? undefined,
        };
        if (editing) await updateOpenCoreBusinessCustomer(editing.id, body);
        else await createOpenCoreBusinessCustomer(body);
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
        if (editing) await updateOpenCoreBusinessContact(editing.id, body);
        else await createOpenCoreBusinessContact(body);
      } else if (entityKind === 'opportunity') {
        const body = {
          amount: optionalText(values, 'amount'),
          customerId: textValue(values, 'customerId'),
          expectedCloseAt: dateText(values, 'expectedCloseAt'),
          name: textValue(values, 'name'),
          owner: textValue(values, 'owner'),
          probability: getNumber(values as BusinessRow, 'probability'),
          remark: nullableText(values, 'remark') ?? undefined,
          tags: splitTags(optionalText(values, 'tags')),
        };
        if (editing) await updateOpenCoreBusinessOpportunity(editing.id, body);
        else
          await createOpenCoreBusinessOpportunity({
            ...body,
            stage: optionalText(
              values,
              'stage',
            ) as BusinessOpenOpportunityStage,
          });
      }
      message.success(
        editing
          ? formatMessage(
              businessMessageId('messages.updated'),
              'Business record updated.',
            )
          : formatMessage(
              businessMessageId('messages.created'),
              'Business record created.',
            ),
      );
      closeEntityModal();
      await reloadBusiness();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              businessMessageId('messages.saveFailed'),
              'Business save failed.',
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
          await transferOpenCoreBusinessLeadOwner(actionTarget.id, body);
        if (actionTarget.type === 'customer')
          await transferOpenCoreBusinessCustomerOwner(actionTarget.id, body);
        if (actionTarget.type === 'opportunity')
          await transferOpenCoreBusinessOpportunityOwner(actionTarget.id, body);
      } else if (actionKind === 'follow') {
        await createOpenCoreBusinessFollowUp({
          content: textValue(values, 'content'),
          createdBy: textValue(values, 'createdBy'),
          method: textValue(values, 'method') as 'call',
          nextContactAt: dateText(values, 'nextContactAt'),
          outcome: optionalText(values, 'outcome'),
          targetId: actionTarget.id,
          targetType: actionTarget.type,
        });
      } else if (actionKind === 'task') {
        await createOpenCoreBusinessTask({
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
        await createOpenCoreBusinessAttachment({
          mimeType: textValue(values, 'mimeType'),
          originalName: textValue(values, 'originalName'),
          sizeBytes: Number(values.sizeBytes ?? 0),
          storageKey: textValue(values, 'storageKey'),
          targetId: actionTarget.id,
          targetType: actionTarget.type,
          uploadedBy: textValue(values, 'uploadedBy'),
        });
      } else if (actionKind === 'convert') {
        await convertOpenCoreBusinessLead(actionTarget.id, {
          actor: textValue(values, 'actor'),
          amount: optionalText(values, 'amount'),
          customerName: optionalText(values, 'customerName'),
          opportunityName: optionalText(values, 'opportunityName'),
        });
      } else if (actionKind === 'stage') {
        await changeOpenCoreBusinessOpportunityStage(actionTarget.id, {
          actor: textValue(values, 'actor'),
          closeReason: optionalText(values, 'closeReason'),
          stage: textValue(
            values,
            'stage',
          ) as BusinessOpportunitySummary['stage'],
        });
      }
      message.success(
        formatMessage(
          businessMessageId('messages.actionCompleted'),
          'Business action completed.',
        ),
      );
      closeActionModal();
      await reloadBusiness();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              businessMessageId('messages.actionFailed'),
              'Business action failed.',
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const archiveRow = async (row: BusinessRow) => {
    if (row.resource === 'leads') await archiveOpenCoreBusinessLead(row.id);
    if (row.resource === 'customers')
      await archiveOpenCoreBusinessCustomer(row.id);
    if (row.resource === 'contacts')
      await archiveOpenCoreBusinessContact(row.id);
    if (row.resource === 'opportunities')
      await archiveOpenCoreBusinessOpportunity(row.id);
    message.success(
      formatMessage(
        businessMessageId('messages.archived'),
        'Business record archived.',
      ),
    );
    await reloadBusiness();
  };

  const completeTask = async (row: BusinessRow) => {
    await completeOpenCoreBusinessTask(row.id, { actor: DEFAULT_ACTOR });
    message.success(
      formatMessage(
        businessMessageId('messages.taskCompleted'),
        'Business task completed.',
      ),
    );
    await reloadBusiness();
  };

  const requestTable = async (params: Record<string, unknown>) => {
    if (activeTab === 'overview') {
      setTableRows([]);
      return { data: [], success: true, total: 0 };
    }

    const page = pageNumber(params.current, 1);
    const pageSize = pageNumber(params.pageSize, 10);
    const keyword = optionalText(params, 'keyword');
    const owner = optionalText(params, 'owner');
    const status = optionalText(params, 'status');
    const stage = optionalText(params, 'stage');
    const assignee = optionalText(params, 'assignee');

    if (activeTab === 'leads') {
      const result = await pageOpenCoreBusinessLeads({
        keyword,
        owner,
        page,
        pageSize,
        status: status as BusinessLeadSummary['status'] | undefined,
      });
      const data = rowify('leads', result.items);
      setTableRows(data);
      return { data, success: true, total: result.total };
    }
    if (activeTab === 'customers') {
      const result = await pageOpenCoreBusinessCustomers({
        keyword,
        owner,
        page,
        pageSize,
        status: status as BusinessCustomerSummary['status'] | undefined,
      });
      const data = rowify('customers', result.items);
      setTableRows(data);
      return { data, success: true, total: result.total };
    }
    if (activeTab === 'contacts') {
      const result = await pageOpenCoreBusinessContacts({
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
      const result = await pageOpenCoreBusinessOpportunities({
        keyword,
        owner,
        page,
        pageSize,
        stage: stage as BusinessOpportunitySummary['stage'] | undefined,
      });
      const data = rowify('opportunities', result.items);
      setTableRows(data);
      return { data, success: true, total: result.total };
    }
    if (activeTab === 'tasks') {
      const result = await pageOpenCoreBusinessTasks({
        assignee,
        page,
        pageSize,
        status: status as BusinessTaskSummary['status'] | undefined,
      });
      const data = rowify('tasks', result.items);
      setTableRows(data);
      return { data, success: true, total: result.total };
    }
    if (activeTab === 'tags') {
      const result = await pageOpenCoreBusinessTags({ page, pageSize });
      const data = rowify('tags', result.items);
      setTableRows(data);
      return { data, success: true, total: result.total };
    }

    const result = await pageOpenCoreBusinessActivities({ page, pageSize });
    const data = rowify('activity', result.items);
    setTableRows(data);

    return {
      data,
      success: true,
      total: result.total,
    };
  };

  const columns: ProColumns<BusinessRow>[] = [
    {
      title: formatMessage(businessMessageId('fields.keyword'), 'Keyword'),
      dataIndex: 'keyword',
      hideInTable: true,
      search: !['contacts', 'customers', 'leads', 'opportunities'].includes(
        activeTab,
      )
        ? false
        : undefined,
    },
    {
      title: formatMessage(businessMessageId('fields.owner'), 'Owner'),
      dataIndex: 'owner',
      hideInTable: true,
      search: !['contacts', 'customers', 'leads', 'opportunities'].includes(
        activeTab,
      )
        ? false
        : undefined,
    },
    {
      title: formatMessage(businessMessageId('fields.assignee'), 'Assignee'),
      dataIndex: 'assignee',
      hideInTable: true,
      search: activeTab !== 'tasks' ? false : undefined,
    },
    {
      title: formatMessage(businessMessageId('fields.status'), 'Status'),
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
      title: formatMessage(businessMessageId('fields.stage'), 'Stage'),
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
      title: formatMessage(businessMessageId('fields.tenant'), 'Tenant'),
      dataIndex: 'tenantId',
      search: false,
      width: 150,
    },
    {
      title:
        activeTab === 'tasks'
          ? formatMessage(businessMessageId('fields.title'), 'Title')
          : formatMessage(businessMessageId('fields.name'), 'Name'),
      dataIndex: activeTab === 'tasks' ? 'title' : 'name',
      search: false,
      width:
        activeTab === 'opportunities' ? OPPORTUNITY_NAME_COLUMN_WIDTH : 220,
      render: (_, record) => (
        <Typography.Link onClick={() => setSelected(record)}>
          {getString(record, activeTab === 'tasks' ? 'title' : 'name') ??
            getString(record, 'number') ??
            record.id}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage(businessMessageId('fields.number'), 'Number'),
      dataIndex: 'number',
      search: false,
      width: 170,
      hideInTable: !['customers', 'leads', 'opportunities'].includes(activeTab),
    },
    {
      title: formatMessage(businessMessageId('fields.customer'), 'Customer'),
      dataIndex: 'customerName',
      search: false,
      width: 180,
      hideInTable: !['contacts', 'opportunities'].includes(activeTab),
    },
    {
      title: formatMessage(businessMessageId('fields.owner'), 'Owner'),
      dataIndex: 'owner',
      search: false,
      width: 130,
      hideInTable: ['activity', 'tags', 'tasks'].includes(activeTab),
    },
    {
      title: formatMessage(businessMessageId('fields.assignee'), 'Assignee'),
      dataIndex: 'assignee',
      search: false,
      width: 130,
      hideInTable: activeTab !== 'tasks',
    },
    {
      title: formatMessage(businessMessageId('fields.status'), 'Status'),
      dataIndex: 'status',
      search: false,
      width: 120,
      hideInTable: ['activity', 'opportunities', 'tags'].includes(activeTab),
      render: (_, record) => (
        <Tag color={statusColor(getString(record, 'status'))}>
          {statusText(record, formatMessage)}
        </Tag>
      ),
    },
    {
      title: formatMessage(businessMessageId('fields.stage'), 'Stage'),
      dataIndex: 'stage',
      search: false,
      width: 140,
      hideInTable: activeTab !== 'opportunities',
      render: (_, record) => (
        <Tag color={statusColor(getString(record, 'stage'))}>
          {stageText(record, formatMessage)}
        </Tag>
      ),
    },
    {
      title: formatMessage(businessMessageId('fields.amount'), 'Amount'),
      dataIndex: 'amount',
      search: false,
      width: 120,
      hideInTable: activeTab !== 'opportunities',
    },
    {
      title: formatMessage(businessMessageId('fields.target'), 'Target'),
      dataIndex: 'targetId',
      search: false,
      width: 180,
      hideInTable: activeTab !== 'activity',
      render: (_, record) => (
        <Space size={4}>
          <Tag>{activityTypeText(record, formatMessage)}</Tag>
          <Tag>
            {targetTypeText(getString(record, 'targetType'), formatMessage)}
          </Tag>
          <Typography.Text copyable>
            {getString(record, 'targetId')}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: formatMessage(businessMessageId('fields.dueAt'), 'Due'),
      dataIndex: 'dueAt',
      search: false,
      width: 180,
      hideInTable: activeTab !== 'tasks',
    },
    {
      title: formatMessage(businessMessageId('actions.column'), 'Action'),
      valueType: 'option',
      width: 260,
      render: (_, record) => {
        const target = targetForRow(record);
        const writableTarget = canWriteTarget(record, target);
        return [
          <Tooltip
            key="detail"
            title={formatMessage(businessMessageId('actions.detail'), 'Detail')}
          >
            <Button
              icon={<EyeOutlined />}
              onClick={() => setSelected(record)}
              size="small"
              type="link"
            />
          </Tooltip>,
          access.canUpdateBusiness && canEditRow(record) ? (
            <Tooltip
              key="edit"
              title={formatMessage(businessMessageId('actions.edit'), 'Edit')}
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
          access.canAssignBusiness &&
          writableTarget &&
          ['lead', 'customer', 'opportunity'].includes(target.type) ? (
            <Tooltip
              key="transfer"
              title={formatMessage(
                businessMessageId('actions.transferOwner'),
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
          access.canCommentBusiness && writableTarget ? (
            <Tooltip
              key="follow"
              title={formatMessage(
                businessMessageId('actions.followUp'),
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
          access.canUpdateBusiness && writableTarget ? (
            <Tooltip
              key="task"
              title={formatMessage(
                businessMessageId('actions.reminder'),
                'Reminder',
              )}
            >
              <Button
                onClick={() => openAction('task', target)}
                size="small"
                type="link"
              >
                {formatMessage(businessMessageId('actions.task'), 'Task')}
              </Button>
            </Tooltip>
          ) : null,
          access.canUpdateBusiness && writableTarget ? (
            <Tooltip
              key="attach"
              title={formatMessage(
                businessMessageId('actions.attachment'),
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
          access.canUpdateBusiness &&
          record.resource === 'leads' &&
          !isConvertedLead(record) ? (
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
              {formatMessage(businessMessageId('actions.convert'), 'Convert')}
            </Button>
          ) : null,
          access.canUpdateBusiness && record.resource === 'opportunities' ? (
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
              {formatMessage(businessMessageId('actions.stage'), 'Stage')}
            </Button>
          ) : null,
          access.canUpdateBusiness &&
          record.resource === 'tasks' &&
          getString(record, 'status') === 'open' ? (
            <Tooltip
              key="complete"
              title={formatMessage(
                businessMessageId('actions.completeTask'),
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
          access.canDeleteBusiness &&
          ['leads', 'customers', 'contacts', 'opportunities'].includes(
            record.resource,
          ) ? (
            <Popconfirm
              key="archive"
              onConfirm={() => void archiveRow(record)}
              title={formatMessage(
                businessMessageId('actions.archiveConfirm'),
                'Archive this business record?',
              )}
            >
              <Button danger size="small" type="link">
                {formatMessage(businessMessageId('actions.archive'), 'Archive')}
              </Button>
            </Popconfirm>
          ) : null,
        ].filter(Boolean);
      },
    },
  ];

  const exportColumns = useMemo(
    () =>
      activeTab === 'overview'
        ? []
        : createExportColumns(activeTab, formatMessage),
    [activeTab, formatMessage],
  );

  return (
    <PageContainer
      title={businessRouteTitle(activeTab, formatMessage)}
      subTitle={formatMessage(businessMessageId('section'), 'Business')}
    >
      {loadError ? (
        <Alert
          action={
            <Button onClick={() => void reloadBusiness()} size="small">
              {formatMessage(businessMessageId('actions.retry'), 'Retry')}
            </Button>
          }
          message={formatMessage(
            businessMessageId('load.liveFailure'),
            'Live business data unavailable',
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
              title={formatMessage(businessMessageId('stats.leads'), 'Leads')}
              value={summary?.leads}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              loading={loading}
              title={formatMessage(
                businessMessageId('stats.customers'),
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
                businessMessageId('stats.openTasks'),
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
              title={formatMessage(
                businessMessageId('stats.openPipeline'),
                'Open Pipeline',
              )}
              value={amountText(summary?.openPipelineAmount, intl.locale)}
            />
          </Card>
        </Col>
      </Row>

      {activeTab === 'overview' ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} xl={6}>
            <Card
              hoverable
              onClick={() => history.push(BUSINESS_ROUTE_PATHS.leads)}
              size="small"
            >
              <Statistic
                loading={loading}
                title={formatMessage(businessMessageId('tabs.leads'), 'Leads')}
                value={summary?.leads}
              />
            </Card>
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Card
              hoverable
              onClick={() => history.push(BUSINESS_ROUTE_PATHS.customers)}
              size="small"
            >
              <Statistic
                loading={loading}
                title={formatMessage(
                  businessMessageId('tabs.customers'),
                  'Accounts',
                )}
                value={summary?.customers}
              />
            </Card>
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Card
              hoverable
              onClick={() => history.push(BUSINESS_ROUTE_PATHS.tasks)}
              size="small"
            >
              <Statistic
                loading={loading}
                title={formatMessage(businessMessageId('tabs.tasks'), 'Tasks')}
                value={summary?.openTasks}
              />
            </Card>
          </Col>
          <Col xs={24} md={12} xl={6}>
            <Card
              hoverable
              onClick={() => history.push(BUSINESS_ROUTE_PATHS.opportunities)}
              size="small"
            >
              <Statistic
                loading={loading}
                title={formatMessage(
                  businessMessageId('stats.openPipeline'),
                  'Open Pipeline',
                )}
                value={amountText(summary?.openPipelineAmount, intl.locale)}
              />
            </Card>
          </Col>
        </Row>
      ) : (
        <ProTable<BusinessRow>
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
          scroll={{
            x:
              activeTab === 'opportunities'
                ? OPPORTUNITY_TABLE_SCROLL_X
                : DEFAULT_TABLE_SCROLL_X,
          }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          toolbar={{
            actions: [
              <Button
                icon={<ReloadOutlined />}
                key="reload"
                onClick={() => void reloadBusiness()}
              >
                {formatMessage(businessMessageId('actions.reload'), 'Reload')}
              </Button>,
              access.canCreateBusiness &&
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
                  {formatMessage(businessMessageId('actions.create'), 'Create')}
                </Button>
              ) : null,
              access.canExportBusiness ? (
                <CurrentPageExportButton<BusinessRow>
                  columns={exportColumns}
                  filename={`opencore-business-${activeTab}.csv`}
                  key="export"
                  resource={`business-${activeTab}`}
                  rows={tableRows}
                />
              ) : null,
            ].filter(Boolean),
          }}
        />
      )}

      <ReadOnlyDetailDrawer
        fields={[
          {
            label: formatMessage(businessMessageId('fields.tenant'), 'Tenant'),
            value: selected?.tenantId,
          },
          {
            label: formatMessage(businessMessageId('fields.id'), 'ID'),
            value: selected?.id,
          },
          {
            label: formatMessage(
              businessMessageId('fields.resource'),
              'Resource',
            ),
            value: selected && resourceText(selected.resource, formatMessage),
          },
          {
            label: formatMessage(businessMessageId('fields.number'), 'Number'),
            value: selected && getString(selected, 'number'),
          },
          {
            label: formatMessage(businessMessageId('fields.name'), 'Name'),
            value: selected && getString(selected, 'name'),
          },
          {
            label: formatMessage(businessMessageId('fields.title'), 'Title'),
            value: selected && getString(selected, 'title'),
          },
          {
            label: formatMessage(businessMessageId('fields.status'), 'Status'),
            value: selected && statusText(selected, formatMessage),
          },
          {
            label: formatMessage(businessMessageId('fields.stage'), 'Stage'),
            value: selected && stageText(selected, formatMessage),
          },
          {
            label: formatMessage(businessMessageId('fields.owner'), 'Owner'),
            value: selected && getString(selected, 'owner'),
          },
          {
            label: formatMessage(businessMessageId('fields.target'), 'Target'),
            value:
              selected &&
              [
                targetTypeText(
                  getString(selected, 'targetType'),
                  formatMessage,
                ),
                getString(selected, 'targetId'),
              ]
                .filter(Boolean)
                .join(' / '),
          },
          {
            label: formatMessage(
              businessMessageId('fields.createdAt'),
              'Created At',
            ),
            value: selected && getString(selected, 'createdAt'),
          },
          {
            label: formatMessage(
              businessMessageId('fields.updatedAt'),
              'Updated At',
            ),
            value: selected && getString(selected, 'updatedAt'),
          },
        ]}
        jsonSections={
          selected
            ? [
                {
                  title: formatMessage(
                    businessMessageId('fields.record'),
                    'Record',
                  ),
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
            : formatMessage(
                businessMessageId('detail.title'),
                'Business Detail',
              )
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
            ? businessMessageId('modal.editTitle')
            : businessMessageId('modal.createTitle'),
          editing ? 'Edit {kind}' : 'Create {kind}',
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
          businessMessageId('modal.actionTitle'),
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
  customers: readonly BusinessCustomerSummary[];
  editing?: BusinessRow;
  entityKind?: EntityKind;
  formatMessage: FormatMessage;
  tags: readonly BusinessTagSummary[];
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
          label={formatMessage(businessMessageId('fields.code'), 'Code')}
          name="code"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(businessMessageId('fields.name'), 'Name')}
          name="name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(businessMessageId('fields.color'), 'Color')}
          name="color"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            businessMessageId('fields.description'),
            'Description',
          )}
          name="description"
        >
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item
          label={formatMessage(businessMessageId('fields.enabled'), 'Enabled')}
          name="enabled"
        >
          <Select
            options={[
              {
                label: formatMessage(
                  businessMessageId('values.enabled'),
                  'enabled',
                ),
                value: true,
              },
              {
                label: formatMessage(
                  businessMessageId('values.disabled'),
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
          label={formatMessage(
            businessMessageId('fields.customer'),
            'Customer',
          )}
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
        label={formatMessage(businessMessageId('fields.name'), 'Name')}
        name="name"
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      {entityKind !== 'contact' ? (
        <Form.Item
          label={formatMessage(businessMessageId('fields.owner'), 'Owner')}
          name="owner"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
      ) : (
        <Form.Item
          label={formatMessage(businessMessageId('fields.owner'), 'Owner')}
          name="owner"
        >
          <Input />
        </Form.Item>
      )}
      {entityKind === 'lead' ? (
        <>
          <Form.Item
            label={formatMessage(
              businessMessageId('fields.company'),
              'Company',
            )}
            name="company"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(businessMessageId('fields.source'), 'Source')}
            name="source"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(businessMessageId('fields.status'), 'Status')}
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
            label={formatMessage(businessMessageId('fields.rating'), 'Rating')}
            name="rating"
          >
            <Input />
          </Form.Item>
        </>
      ) : null}
      {entityKind === 'customer' ? (
        <>
          <Form.Item
            label={formatMessage(businessMessageId('fields.status'), 'Status')}
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
            label={formatMessage(businessMessageId('fields.level'), 'Level')}
            name="level"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(businessMessageId('fields.source'), 'Source')}
            name="source"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              businessMessageId('fields.industry'),
              'Industry',
            )}
            name="industry"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(businessMessageId('fields.region'), 'Region')}
            name="region"
          >
            <Input />
          </Form.Item>
        </>
      ) : null}
      {entityKind === 'contact' ? (
        <>
          <Form.Item
            label={formatMessage(businessMessageId('fields.title'), 'Title')}
            name="title"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              businessMessageId('fields.decisionRole'),
              'Decision Role',
            )}
            name="decisionRole"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              businessMessageId('fields.primary'),
              'Primary',
            )}
            name="primary"
          >
            <Select
              options={[
                {
                  label: formatMessage(
                    businessMessageId('values.primary'),
                    'primary',
                  ),
                  value: true,
                },
                {
                  label: formatMessage(
                    businessMessageId('values.secondary'),
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
            label={formatMessage(businessMessageId('fields.stage'), 'Stage')}
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
            label={formatMessage(businessMessageId('fields.amount'), 'Amount')}
            name="amount"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              businessMessageId('fields.probability'),
              'Probability',
            )}
            name="probability"
          >
            <InputNumber max={100} min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              businessMessageId('fields.expectedCloseAt'),
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
            label={formatMessage(businessMessageId('fields.mobile'), 'Mobile')}
            name="mobile"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(businessMessageId('fields.email'), 'Email')}
            name="email"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(businessMessageId('fields.phone'), 'Phone')}
            name="phone"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              businessMessageId('fields.nextContactAt'),
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
            label={formatMessage(
              businessMessageId('fields.website'),
              'Website',
            )}
            name="website"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              businessMessageId('fields.address'),
              'Address',
            )}
            name="address"
          >
            <Input />
          </Form.Item>
        </>
      ) : null}
      {entityKind !== 'contact' ? (
        <Form.Item
          extra={tags.map((tag) => tag.code).join(', ')}
          label={formatMessage(businessMessageId('fields.tags'), 'Tags')}
          name="tags"
        >
          <Input
            placeholder={formatMessage(
              businessMessageId('placeholders.tags'),
              'comma separated tag codes',
            )}
          />
        </Form.Item>
      ) : null}
      <Form.Item
        label={formatMessage(businessMessageId('fields.remark'), 'Remark')}
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
          label={formatMessage(
            businessMessageId('fields.newOwner'),
            'New Owner',
          )}
          name="toOwner"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(businessMessageId('fields.actor'), 'Actor')}
          name="actor"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(businessMessageId('fields.reason'), 'Reason')}
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
          label={formatMessage(businessMessageId('fields.method'), 'Method')}
          name="method"
          rules={[{ required: true }]}
        >
          <Select
            options={enumOptions(FOLLOW_UP_METHODS, formatMessage, 'method')}
          />
        </Form.Item>
        <Form.Item
          label={formatMessage(businessMessageId('fields.content'), 'Content')}
          name="content"
          rules={[{ required: true }]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item
          label={formatMessage(businessMessageId('fields.outcome'), 'Outcome')}
          name="outcome"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            businessMessageId('fields.nextContactAt'),
            'Next Contact',
          )}
          name="nextContactAt"
        >
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            businessMessageId('fields.createdBy'),
            'Created By',
          )}
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
          label={formatMessage(businessMessageId('fields.title'), 'Title')}
          name="title"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            businessMessageId('fields.assignee'),
            'Assignee',
          )}
          name="assignee"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            businessMessageId('fields.priority'),
            'Priority',
          )}
          name="priority"
        >
          <Select
            options={enumOptions(TASK_PRIORITIES, formatMessage, 'priority')}
          />
        </Form.Item>
        <Form.Item
          label={formatMessage(businessMessageId('fields.dueAt'), 'Due At')}
          name="dueAt"
        >
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            businessMessageId('fields.createdBy'),
            'Created By',
          )}
          name="createdBy"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(businessMessageId('fields.remark'), 'Remark')}
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
            businessMessageId('fields.originalName'),
            'Original Name',
          )}
          name="originalName"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            businessMessageId('fields.mimeType'),
            'MIME Type',
          )}
          name="mimeType"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            businessMessageId('fields.sizeBytes'),
            'Size Bytes',
          )}
          name="sizeBytes"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            businessMessageId('fields.storageKey'),
            'Storage Key',
          )}
          name="storageKey"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            businessMessageId('fields.uploadedBy'),
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
          label={formatMessage(businessMessageId('fields.actor'), 'Actor')}
          name="actor"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            businessMessageId('fields.customerName'),
            'Customer Name',
          )}
          name="customerName"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            businessMessageId('fields.opportunityName'),
            'Opportunity Name',
          )}
          name="opportunityName"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            businessMessageId('fields.opportunityAmount'),
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
        label={formatMessage(businessMessageId('fields.stage'), 'Stage')}
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
        label={formatMessage(businessMessageId('fields.actor'), 'Actor')}
        name="actor"
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label={formatMessage(
          businessMessageId('fields.closeReason'),
          'Close Reason',
        )}
        name="closeReason"
      >
        <Input />
      </Form.Item>
    </>
  );
}
