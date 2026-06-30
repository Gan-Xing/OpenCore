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
  CrmOpportunitySummary,
  CrmSummary,
  CrmTagSummary,
  CrmTargetType,
  CrmTaskSummary,
} from '@opencore/sdk';
import { useAccess } from '@umijs/max';
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
import { useEffect, useMemo, useRef, useState } from 'react';
import {
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
  pageOpenCoreCrmAttachments,
  pageOpenCoreCrmAuditEvents,
  pageOpenCoreCrmContacts,
  pageOpenCoreCrmCustomers,
  pageOpenCoreCrmFollowUps,
  pageOpenCoreCrmLeads,
  pageOpenCoreCrmOpportunities,
  pageOpenCoreCrmOwnerTransfers,
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

const DEFAULT_ACTOR = 'admin';
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'];
const CUSTOMER_STATUSES = ['active', 'inactive', 'churned'];
const OPPORTUNITY_STAGES = [
  'qualification',
  'proposal',
  'negotiation',
  'won',
  'lost',
];
const TASK_STATUSES = ['open', 'done', 'canceled'];

function valueEnum(values: readonly string[]) {
  return Object.fromEntries(values.map((value) => [value, { text: value }]));
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

function createExportColumns(tab: CrmTab): CurrentPageExportColumn<CrmRow>[] {
  const common: CurrentPageExportColumn<CrmRow>[] = [
    { title: 'Tenant', dataIndex: 'tenantId' },
    { title: 'ID', dataIndex: 'id' },
  ];
  if (tab === 'leads') {
    return [
      ...common,
      { title: 'Number', dataIndex: 'number' },
      { title: 'Name', dataIndex: 'name' },
      { title: 'Company', dataIndex: 'company' },
      { title: 'Status', dataIndex: 'status' },
      { title: 'Owner', dataIndex: 'owner' },
      { title: 'Source', dataIndex: 'source' },
    ];
  }
  if (tab === 'customers') {
    return [
      ...common,
      { title: 'Number', dataIndex: 'number' },
      { title: 'Name', dataIndex: 'name' },
      { title: 'Status', dataIndex: 'status' },
      { title: 'Level', dataIndex: 'level' },
      { title: 'Owner', dataIndex: 'owner' },
      { title: 'Source', dataIndex: 'source' },
    ];
  }
  if (tab === 'opportunities') {
    return [
      ...common,
      { title: 'Number', dataIndex: 'number' },
      { title: 'Name', dataIndex: 'name' },
      { title: 'Customer', dataIndex: 'customerName' },
      { title: 'Stage', dataIndex: 'stage' },
      { title: 'Amount', dataIndex: 'amount' },
      { title: 'Owner', dataIndex: 'owner' },
    ];
  }
  if (tab === 'tasks') {
    return [
      ...common,
      { title: 'Title', dataIndex: 'title' },
      { title: 'Assignee', dataIndex: 'assignee' },
      { title: 'Status', dataIndex: 'status' },
      { title: 'Priority', dataIndex: 'priority' },
      { title: 'Due At', dataIndex: 'dueAt' },
    ];
  }
  return [
    ...common,
    { title: 'Name', dataIndex: 'name' },
    { title: 'Title', dataIndex: 'title' },
    { title: 'Target', dataIndex: 'targetId' },
    { title: 'Owner', dataIndex: 'owner' },
    { title: 'Status', dataIndex: 'status' },
  ];
}

export default function CrmPage() {
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
        error instanceof Error ? error.message : 'Unable to load CRM.',
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
      status: 'active',
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
          status: optionalText(values, 'status') as CrmLeadSummary['status'],
          tags: splitTags(optionalText(values, 'tags')),
        };
        if (editing) await updateOpenCoreCrmLead(editing.id, body);
        else await createOpenCoreCrmLead(body);
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
          ) as CrmCustomerSummary['status'],
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
          stage: optionalText(
            values,
            'stage',
          ) as CrmOpportunitySummary['stage'],
          tags: splitTags(optionalText(values, 'tags')),
        };
        if (editing) await updateOpenCoreCrmOpportunity(editing.id, body);
        else await createOpenCoreCrmOpportunity(body);
      }
      message.success(editing ? 'CRM record updated.' : 'CRM record created.');
      closeEntityModal();
      await reloadCrm();
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'CRM save failed.',
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
      message.success('CRM action completed.');
      closeActionModal();
      await reloadCrm();
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'CRM action failed.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const archiveRow = async (row: CrmRow) => {
    if (row.resource === 'leads') await archiveOpenCoreCrmLead(row.id);
    if (row.resource === 'customers') await archiveOpenCoreCrmCustomer(row.id);
    if (row.resource === 'opportunities')
      await archiveOpenCoreCrmOpportunity(row.id);
    message.success('CRM record archived.');
    await reloadCrm();
  };

  const completeTask = async (row: CrmRow) => {
    await completeOpenCoreCrmTask(row.id, { actor: DEFAULT_ACTOR });
    message.success('CRM task completed.');
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

    const activityPageSize = Math.min(page * pageSize, 100);
    const [followUps, attachments, transfers, audits] = await Promise.all([
      pageOpenCoreCrmFollowUps({ page: 1, pageSize: activityPageSize }),
      pageOpenCoreCrmAttachments({ page: 1, pageSize: activityPageSize }),
      pageOpenCoreCrmOwnerTransfers({ page: 1, pageSize: activityPageSize }),
      pageOpenCoreCrmAuditEvents({ page: 1, pageSize: activityPageSize }),
    ]);
    const allRows = [
      ...rowify('activity', followUps.items).map((row) => ({
        ...row,
        activityType: 'follow-up',
      })),
      ...rowify('activity', attachments.items).map((row) => ({
        ...row,
        activityType: 'attachment',
      })),
      ...rowify('activity', transfers.items).map((row) => ({
        ...row,
        activityType: 'transfer',
      })),
      ...rowify('activity', audits.items).map((row) => ({
        ...row,
        activityType: 'audit',
      })),
    ].sort(
      (left, right) =>
        Date.parse(getString(right, 'createdAt') ?? '') -
        Date.parse(getString(left, 'createdAt') ?? ''),
    );
    const data = allRows.slice((page - 1) * pageSize, page * pageSize);
    setTableRows(data);

    return {
      data,
      success: true,
      total:
        followUps.total + attachments.total + transfers.total + audits.total,
    };
  };

  const columns: ProColumns<CrmRow>[] = [
    {
      title: 'Keyword',
      dataIndex: 'keyword',
      hideInTable: true,
      search: !['contacts', 'customers', 'leads', 'opportunities'].includes(
        activeTab,
      )
        ? false
        : undefined,
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      hideInTable: true,
      search: !['contacts', 'customers', 'leads', 'opportunities'].includes(
        activeTab,
      )
        ? false
        : undefined,
    },
    {
      title: 'Assignee',
      dataIndex: 'assignee',
      hideInTable: true,
      search: activeTab !== 'tasks' ? false : undefined,
    },
    {
      title: 'Status',
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
      ),
    },
    {
      title: 'Stage',
      dataIndex: 'stage',
      hideInTable: true,
      search: activeTab !== 'opportunities' ? false : undefined,
      valueType: 'select',
      valueEnum: valueEnum(OPPORTUNITY_STAGES),
    },
    {
      title: 'Tenant',
      dataIndex: 'tenantId',
      search: false,
      width: 150,
    },
    {
      title: activeTab === 'tasks' ? 'Title' : 'Name',
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
      title: 'Number',
      dataIndex: 'number',
      search: false,
      width: 170,
      hideInTable: !['customers', 'leads', 'opportunities'].includes(activeTab),
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      search: false,
      width: 180,
      hideInTable: !['contacts', 'opportunities'].includes(activeTab),
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      search: false,
      width: 130,
      hideInTable: ['activity', 'tags', 'tasks'].includes(activeTab),
    },
    {
      title: 'Assignee',
      dataIndex: 'assignee',
      search: false,
      width: 130,
      hideInTable: activeTab !== 'tasks',
    },
    {
      title: 'Status',
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
      title: 'Stage',
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
      title: 'Amount',
      dataIndex: 'amount',
      search: false,
      width: 120,
      hideInTable: activeTab !== 'opportunities',
    },
    {
      title: 'Target',
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
      title: 'Due',
      dataIndex: 'dueAt',
      search: false,
      width: 180,
      hideInTable: activeTab !== 'tasks',
    },
    {
      title: 'Action',
      valueType: 'option',
      width: 260,
      render: (_, record) => {
        const target = targetForRow(record);
        return [
          <Tooltip key="detail" title="Detail">
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
            <Tooltip key="edit" title="Edit">
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
            <Tooltip key="transfer" title="Transfer owner">
              <Button
                icon={<SwapOutlined />}
                onClick={() => openAction('transfer', target)}
                size="small"
                type="link"
              />
            </Tooltip>
          ) : null,
          access.canCommentCrm && target ? (
            <Tooltip key="follow" title="Follow up">
              <Button
                icon={<CommentOutlined />}
                onClick={() => openAction('follow', target)}
                size="small"
                type="link"
              />
            </Tooltip>
          ) : null,
          access.canUpdateCrm && target ? (
            <Tooltip key="task" title="Reminder">
              <Button
                onClick={() => openAction('task', target)}
                size="small"
                type="link"
              >
                Task
              </Button>
            </Tooltip>
          ) : null,
          access.canUpdateCrm && target ? (
            <Tooltip key="attach" title="Attachment">
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
              Convert
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
              Stage
            </Button>
          ) : null,
          access.canUpdateCrm &&
          record.resource === 'tasks' &&
          getString(record, 'status') === 'open' ? (
            <Tooltip key="complete" title="Complete task">
              <Button
                icon={<CheckCircleOutlined />}
                onClick={() => void completeTask(record)}
                size="small"
                type="link"
              />
            </Tooltip>
          ) : null,
          access.canDeleteCrm &&
          ['leads', 'customers', 'opportunities'].includes(record.resource) ? (
            <Popconfirm
              key="archive"
              onConfirm={() => void archiveRow(record)}
              title="Archive this CRM record?"
            >
              <Button danger size="small" type="link">
                Archive
              </Button>
            </Popconfirm>
          ) : null,
        ].filter(Boolean);
      },
    },
  ];

  const exportColumns = useMemo(
    () => createExportColumns(activeTab),
    [activeTab],
  );

  return (
    <PageContainer title="CRM" subTitle="Industry">
      {loadError ? (
        <Alert
          action={
            <Button onClick={() => void reloadCrm()} size="small">
              Retry
            </Button>
          }
          message="Live CRM unavailable"
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
          description={loadError}
        />
      ) : null}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic loading={loading} title="Leads" value={summary?.leads} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              loading={loading}
              title="Customers"
              value={summary?.customers}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              loading={loading}
              title="Open Tasks"
              value={summary?.openTasks}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              loading={loading}
              prefix="$"
              title="Open Pipeline"
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
              { key: 'leads', label: 'Leads' },
              { key: 'customers', label: 'Customers' },
              { key: 'contacts', label: 'Contacts' },
              { key: 'opportunities', label: 'Opportunities' },
              { key: 'tasks', label: 'Tasks' },
              { key: 'tags', label: 'Tags' },
              { key: 'activity', label: 'Activity' },
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
              Reload
            </Button>,
            access.canCreateCrm && activeTab !== 'activity' ? (
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
                Create
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
          { label: 'Tenant', value: selected?.tenantId },
          { label: 'ID', value: selected?.id },
          { label: 'Resource', value: selected?.resource },
          { label: 'Number', value: selected && getString(selected, 'number') },
          { label: 'Name', value: selected && getString(selected, 'name') },
          { label: 'Title', value: selected && getString(selected, 'title') },
          { label: 'Status', value: selected && getString(selected, 'status') },
          { label: 'Stage', value: selected && getString(selected, 'stage') },
          { label: 'Owner', value: selected && getString(selected, 'owner') },
          {
            label: 'Target',
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
            label: 'Created At',
            value: selected && getString(selected, 'createdAt'),
          },
          {
            label: 'Updated At',
            value: selected && getString(selected, 'updatedAt'),
          },
        ]}
        jsonSections={selected ? [{ title: 'Record', value: selected }] : []}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={
          selected
            ? (getString(selected, 'name') ??
              getString(selected, 'title') ??
              selected.id)
            : 'CRM Detail'
        }
      />

      <Modal
        destroyOnClose
        okButtonProps={{ loading: submitting }}
        onCancel={closeEntityModal}
        onOk={() => void submitEntity()}
        open={Boolean(entityKind)}
        title={`${editing ? 'Edit' : 'Create'} CRM ${entityKind ?? ''}`}
        width={720}
      >
        <Form form={entityForm} layout="vertical">
          <EntityFields
            customers={customers}
            entityKind={entityKind}
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
        title={`${actionKind ?? 'Action'} ${actionTarget?.title ?? ''}`}
        width={640}
      >
        <Form form={actionForm} layout="vertical">
          <ActionFields actionKind={actionKind} />
        </Form>
      </Modal>
    </PageContainer>
  );
}

function EntityFields({
  customers,
  entityKind,
  tags,
}: {
  customers: readonly CrmCustomerSummary[];
  entityKind?: EntityKind;
  tags: readonly CrmTagSummary[];
}) {
  if (!entityKind) return null;

  if (entityKind === 'tag') {
    return (
      <>
        <Form.Item label="Code" name="code" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Color" name="color">
          <Input />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item label="Enabled" name="enabled">
          <Select
            options={[
              { label: 'enabled', value: true },
              { label: 'disabled', value: false },
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
          label="Customer"
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
      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      {entityKind !== 'contact' ? (
        <Form.Item label="Owner" name="owner" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
      ) : (
        <Form.Item label="Owner" name="owner">
          <Input />
        </Form.Item>
      )}
      {entityKind === 'lead' ? (
        <>
          <Form.Item label="Company" name="company">
            <Input />
          </Form.Item>
          <Form.Item label="Source" name="source" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Status" name="status">
            <Select
              options={[
                'new',
                'contacted',
                'qualified',
                'converted',
                'lost',
              ].map((value) => ({ label: value, value }))}
            />
          </Form.Item>
          <Form.Item label="Rating" name="rating">
            <Input />
          </Form.Item>
        </>
      ) : null}
      {entityKind === 'customer' ? (
        <>
          <Form.Item label="Status" name="status">
            <Select
              options={['active', 'inactive', 'churned'].map((value) => ({
                label: value,
                value,
              }))}
            />
          </Form.Item>
          <Form.Item label="Level" name="level">
            <Input />
          </Form.Item>
          <Form.Item label="Source" name="source" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Industry" name="industry">
            <Input />
          </Form.Item>
          <Form.Item label="Region" name="region">
            <Input />
          </Form.Item>
        </>
      ) : null}
      {entityKind === 'contact' ? (
        <>
          <Form.Item label="Title" name="title">
            <Input />
          </Form.Item>
          <Form.Item label="Decision Role" name="decisionRole">
            <Input />
          </Form.Item>
          <Form.Item label="Primary" name="primary">
            <Select
              options={[
                { label: 'primary', value: true },
                { label: 'secondary', value: false },
              ]}
            />
          </Form.Item>
        </>
      ) : null}
      {entityKind === 'opportunity' ? (
        <>
          <Form.Item label="Stage" name="stage">
            <Select
              options={[
                'qualification',
                'proposal',
                'negotiation',
                'won',
                'lost',
              ].map((value) => ({ label: value, value }))}
            />
          </Form.Item>
          <Form.Item label="Amount" name="amount">
            <Input />
          </Form.Item>
          <Form.Item label="Probability" name="probability">
            <InputNumber max={100} min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Expected Close" name="expectedCloseAt">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </>
      ) : null}
      {entityKind === 'lead' ||
      entityKind === 'customer' ||
      entityKind === 'contact' ? (
        <>
          <Form.Item label="Mobile" name="mobile">
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email">
            <Input />
          </Form.Item>
          <Form.Item label="Phone" name="phone">
            <Input />
          </Form.Item>
          <Form.Item label="Next Contact" name="nextContactAt">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </>
      ) : null}
      {entityKind === 'customer' ? (
        <>
          <Form.Item label="Website" name="website">
            <Input />
          </Form.Item>
          <Form.Item label="Address" name="address">
            <Input />
          </Form.Item>
        </>
      ) : null}
      {entityKind !== 'contact' ? (
        <Form.Item
          extra={tags.map((tag) => tag.code).join(', ')}
          label="Tags"
          name="tags"
        >
          <Input placeholder="comma separated tag codes" />
        </Form.Item>
      ) : null}
      <Form.Item label="Remark" name="remark">
        <Input.TextArea rows={3} />
      </Form.Item>
    </>
  );
}

function ActionFields({ actionKind }: { actionKind?: ActionKind }) {
  if (!actionKind) return null;

  if (actionKind === 'transfer') {
    return (
      <>
        <Form.Item
          label="New Owner"
          name="toOwner"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Actor" name="actor" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Reason" name="reason">
          <Input.TextArea rows={3} />
        </Form.Item>
      </>
    );
  }

  if (actionKind === 'follow') {
    return (
      <>
        <Form.Item label="Method" name="method" rules={[{ required: true }]}>
          <Select
            options={['call', 'email', 'meeting', 'wechat', 'note'].map(
              (value) => ({ label: value, value }),
            )}
          />
        </Form.Item>
        <Form.Item label="Content" name="content" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item label="Outcome" name="outcome">
          <Input />
        </Form.Item>
        <Form.Item label="Next Contact" name="nextContactAt">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label="Created By"
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
        <Form.Item label="Title" name="title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          label="Assignee"
          name="assignee"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Priority" name="priority">
          <Select
            options={['low', 'medium', 'high', 'urgent'].map((value) => ({
              label: value,
              value,
            }))}
          />
        </Form.Item>
        <Form.Item label="Due At" name="dueAt">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label="Created By"
          name="createdBy"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Remark" name="remark">
          <Input.TextArea rows={3} />
        </Form.Item>
      </>
    );
  }

  if (actionKind === 'attach') {
    return (
      <>
        <Form.Item
          label="Original Name"
          name="originalName"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="MIME Type"
          name="mimeType"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Size Bytes"
          name="sizeBytes"
          rules={[{ required: true }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label="Storage Key"
          name="storageKey"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Uploaded By"
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
        <Form.Item label="Actor" name="actor" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Customer Name" name="customerName">
          <Input />
        </Form.Item>
        <Form.Item label="Opportunity Name" name="opportunityName">
          <Input />
        </Form.Item>
        <Form.Item label="Opportunity Amount" name="amount">
          <Input />
        </Form.Item>
      </>
    );
  }

  return (
    <>
      <Form.Item label="Stage" name="stage" rules={[{ required: true }]}>
        <Select
          options={[
            'qualification',
            'proposal',
            'negotiation',
            'won',
            'lost',
          ].map((value) => ({ label: value, value }))}
        />
      </Form.Item>
      <Form.Item label="Actor" name="actor" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="Close Reason" name="closeReason">
        <Input />
      </Form.Item>
    </>
  );
}
