import {
  CheckCircleOutlined,
  EditOutlined,
  EyeOutlined,
  MinusOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import type {
  BusinessCommerceSummary,
  BusinessContractSummary,
  BusinessCustomerSummary,
  BusinessProductSummary,
  BusinessQuoteSummary,
  BusinessReceivableSummary,
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
  Modal,
  Popconfirm,
  Row,
  Select,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import zhMessages from '@/locales/zh-CN';
import {
  acceptOpenCoreBusinessQuote,
  activateOpenCoreBusinessContract,
  archiveOpenCoreBusinessContract,
  archiveOpenCoreBusinessProduct,
  archiveOpenCoreBusinessQuote,
  cancelOpenCoreBusinessReceivable,
  completeOpenCoreBusinessContract,
  createOpenCoreBusinessContract,
  createOpenCoreBusinessProduct,
  createOpenCoreBusinessQuote,
  createOpenCoreBusinessReceivable,
  getOpenCoreBusinessCommerceSummary,
  pageOpenCoreBusinessContracts,
  pageOpenCoreBusinessCustomers,
  pageOpenCoreBusinessProducts,
  pageOpenCoreBusinessQuotes,
  pageOpenCoreBusinessReceivables,
  recordOpenCoreBusinessReceivablePayment,
  submitOpenCoreBusinessQuote,
  updateOpenCoreBusinessContract,
  updateOpenCoreBusinessProduct,
  updateOpenCoreBusinessQuote,
  updateOpenCoreBusinessReceivable,
} from '@/services/opencore/platform';
import {
  CurrentPageExportButton,
  type CurrentPageExportColumn,
} from '../../shared/CurrentPageExportButton';
import { ReadOnlyDetailDrawer } from '../../shared/ReadOnlyDetailDrawer';

type CommerceResourceKey = 'contracts' | 'products' | 'quotes' | 'receivables';
type CommerceRow = Record<string, unknown> & {
  id: string;
  resource: CommerceResourceKey;
  tenantId: string;
};
type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const DEFAULT_ACTOR = 'admin';
const COMMERCE_MESSAGE_PREFIX = 'pages.business.commerce.';
const PRODUCT_STATUSES = ['active', 'inactive', 'archived'] as const;
const QUOTE_STATUSES = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
  'archived',
] as const;
const CONTRACT_STATUSES = [
  'draft',
  'active',
  'completed',
  'terminated',
  'archived',
] as const;
const RECEIVABLE_STATUSES = [
  'pending',
  'partial',
  'paid',
  'overdue',
  'canceled',
] as const;

const COMMERCE_ROUTE_TITLE_FALLBACKS: Record<CommerceResourceKey, string> = {
  contracts: 'Contracts',
  products: 'Products',
  quotes: 'Quotes',
  receivables: 'Receivables',
};

function commerceMessageId(suffix: string): string {
  return `${COMMERCE_MESSAGE_PREFIX}${suffix}`;
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

function amountText(value: string | undefined, locale: string): string {
  const number = Number(value ?? '0');
  if (!Number.isFinite(number)) return value ?? '0.00';

  return new Intl.NumberFormat(locale || undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(number);
}

function datePickerValue(value: unknown): Dayjs | undefined {
  if (!value) return undefined;
  if (typeof value === 'string' || value instanceof Date) {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : undefined;
  }
  return dayjs.isDayjs(value) ? value : undefined;
}

function dateText(
  values: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = values[key];
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (dayjs.isDayjs(value)) return value.toISOString();
  if (value instanceof Date) return value.toISOString();
  return undefined;
}

function textValue(values: Record<string, unknown>, key: string): string {
  const value = values[key];
  if (typeof value === 'number') return String(value);
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

function pageNumber(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function getString(
  row: CommerceRow | undefined,
  key: string,
): string | undefined {
  const value = row?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function statusColor(value?: string): string {
  if (!value) return 'default';
  if (['accepted', 'active', 'paid'].includes(value)) return 'green';
  if (
    ['archived', 'canceled', 'overdue', 'rejected', 'terminated'].includes(
      value,
    )
  ) {
    return 'red';
  }
  if (['draft', 'pending'].includes(value)) return 'blue';
  if (['partial', 'sent'].includes(value)) return 'gold';
  return 'default';
}

function valueEnum(
  values: readonly string[],
  formatMessage: FormatMessage,
  scope: string,
) {
  return Object.fromEntries(
    values.map((value) => [
      value,
      {
        text: formatMessage(commerceMessageId(`${scope}.${value}`), value),
      },
    ]),
  );
}

function enumOptions(
  values: readonly string[],
  formatMessage: FormatMessage,
  scope: string,
) {
  return values.map((value) => ({
    label: formatMessage(commerceMessageId(`${scope}.${value}`), value),
    value,
  }));
}

function rowify<T extends { id: string; tenantId: string }>(
  resource: CommerceResourceKey,
  rows: readonly T[],
): CommerceRow[] {
  return rows.map((row) => ({
    ...(row as Record<string, unknown>),
    id: row.id,
    resource,
    tenantId: row.tenantId,
  }));
}

function resourceLabel(
  resource: CommerceResourceKey,
  formatMessage: FormatMessage,
): string {
  return formatMessage(
    commerceMessageId(`tabs.${resource}`),
    COMMERCE_ROUTE_TITLE_FALLBACKS[resource],
  );
}

function resourceStatusScope(resource: CommerceResourceKey): string {
  if (resource === 'products') return 'productStatus';
  if (resource === 'quotes') return 'quoteStatus';
  if (resource === 'contracts') return 'contractStatus';
  return 'receivableStatus';
}

function statusText(row: CommerceRow, formatMessage: FormatMessage): string {
  const status = getString(row, 'status');
  return status
    ? formatMessage(
        commerceMessageId(`${resourceStatusScope(row.resource)}.${status}`),
        status,
      )
    : '-';
}

function canEdit(row: CommerceRow): boolean {
  if (row.resource === 'products')
    return getString(row, 'status') !== 'archived';
  if (row.resource === 'quotes') return getString(row, 'status') === 'draft';
  if (row.resource === 'contracts') {
    return !['archived', 'completed', 'terminated'].includes(
      getString(row, 'status') ?? '',
    );
  }
  return !['canceled', 'paid'].includes(getString(row, 'status') ?? '');
}

function editableValues(row: CommerceRow): Record<string, unknown> {
  return {
    ...row,
    dueAt: datePickerValue(row.dueAt),
    effectiveFrom: datePickerValue(row.effectiveFrom),
    effectiveTo: datePickerValue(row.effectiveTo),
    signedAt: datePickerValue(row.signedAt),
    validUntil: datePickerValue(row.validUntil),
  };
}

function createExportColumns(
  resource: CommerceResourceKey,
  formatMessage: FormatMessage,
): CurrentPageExportColumn<CommerceRow>[] {
  const common: CurrentPageExportColumn<CommerceRow>[] = [
    {
      title: formatMessage(commerceMessageId('fields.tenant'), 'Tenant'),
      dataIndex: 'tenantId',
    },
    {
      title: formatMessage(commerceMessageId('fields.number'), 'Number'),
      dataIndex: 'number',
    },
    {
      title: formatMessage(commerceMessageId('fields.name'), 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage(commerceMessageId('fields.status'), 'Status'),
      dataIndex: 'status',
      renderText: (record) => statusText(record, formatMessage),
    },
  ];

  if (resource === 'products') {
    return [
      {
        title: formatMessage(commerceMessageId('fields.sku'), 'SKU'),
        dataIndex: 'sku',
      },
      ...common.filter((column) => column.dataIndex !== 'number'),
      {
        title: formatMessage(
          commerceMessageId('fields.listPrice'),
          'List Price',
        ),
        dataIndex: 'listPrice',
      },
    ];
  }

  return [
    ...common,
    {
      title: formatMessage(commerceMessageId('fields.customer'), 'Customer'),
      dataIndex: 'customerName',
    },
    {
      title: formatMessage(commerceMessageId('fields.owner'), 'Owner'),
      dataIndex: 'owner',
    },
    {
      title: formatMessage(commerceMessageId('fields.amount'), 'Amount'),
      dataIndex: resource === 'quotes' ? 'totalAmount' : 'amount',
    },
  ];
}

export default function CommerceWorkspace({
  activeResource,
}: {
  activeResource: CommerceResourceKey;
}) {
  const intl = useIntl();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) => {
      const zhMessage =
        intl.locale?.toLowerCase().startsWith('zh') &&
        id.startsWith(COMMERCE_MESSAGE_PREFIX)
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
    canCreateBusiness?: boolean;
    canDeleteBusiness?: boolean;
    canExportBusiness?: boolean;
    canUpdateBusiness?: boolean;
  };
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [entityForm] = Form.useForm<Record<string, unknown>>();
  const [paymentForm] = Form.useForm<Record<string, unknown>>();
  const [summary, setSummary] = useState<BusinessCommerceSummary>();
  const [customers, setCustomers] = useState<
    readonly BusinessCustomerSummary[]
  >([]);
  const [products, setProducts] = useState<readonly BusinessProductSummary[]>(
    [],
  );
  const [quotes, setQuotes] = useState<readonly BusinessQuoteSummary[]>([]);
  const [contracts, setContracts] = useState<
    readonly BusinessContractSummary[]
  >([]);
  const [tableRows, setTableRows] = useState<CommerceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selected, setSelected] = useState<CommerceRow>();
  const [editing, setEditing] = useState<CommerceRow>();
  const [entityResource, setEntityResource] = useState<CommerceResourceKey>();
  const [paymentTarget, setPaymentTarget] = useState<CommerceRow>();
  const [submitting, setSubmitting] = useState(false);

  const loadCommerce = async () => {
    setLoading(true);
    try {
      const [
        summaryResult,
        productPage,
        customerPage,
        quotePage,
        contractPage,
      ] = await Promise.all([
        getOpenCoreBusinessCommerceSummary(),
        pageOpenCoreBusinessProducts({ page: 1, pageSize: 100 }),
        pageOpenCoreBusinessCustomers({ page: 1, pageSize: 100 }),
        pageOpenCoreBusinessQuotes({ page: 1, pageSize: 100 }),
        pageOpenCoreBusinessContracts({ page: 1, pageSize: 100 }),
      ]);
      setSummary(summaryResult);
      setProducts([...productPage.items]);
      setCustomers([...customerPage.items]);
      setQuotes([...quotePage.items]);
      setContracts([...contractPage.items]);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              commerceMessageId('load.failure'),
              'Unable to load commerce data.',
            ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCommerce();
  }, []);

  useEffect(() => {
    setSelected(undefined);
    setTableRows([]);
    actionRef.current?.reload();
  }, [activeResource]);

  const reloadCommerce = async () => {
    await loadCommerce();
    actionRef.current?.reload();
  };

  const closeEntityModal = () => {
    setEntityResource(undefined);
    setEditing(undefined);
    entityForm.resetFields();
  };

  const openCreate = (resource: CommerceResourceKey) => {
    entityForm.resetFields();
    entityForm.setFieldsValue({
      amount: '0',
      currency: 'USD',
      customerId: customers[0]?.id,
      discountRate: '0',
      dueAt: dayjs().add(14, 'day'),
      lines: [
        {
          discountRate: '0',
          productName: products[0]?.name,
          quantity: '1',
          taxRate: products[0]?.taxRate ?? '0',
          unit: products[0]?.unit ?? 'unit',
          unitPrice: products[0]?.listPrice ?? '0',
        },
      ],
      listPrice: '0',
      owner: DEFAULT_ACTOR,
      status: 'active',
      taxRate: '0',
      unit: 'unit',
    });
    setEditing(undefined);
    setEntityResource(resource);
  };

  const openEdit = (row: CommerceRow) => {
    entityForm.resetFields();
    entityForm.setFieldsValue(editableValues(row));
    setEditing(row);
    setEntityResource(row.resource);
  };

  const openPayment = (row: CommerceRow) => {
    paymentForm.resetFields();
    paymentForm.setFieldsValue({ actor: DEFAULT_ACTOR, amount: '0' });
    setPaymentTarget(row);
  };

  const closePayment = () => {
    setPaymentTarget(undefined);
    paymentForm.resetFields();
  };

  const submitEntity = async () => {
    if (!entityResource) return;
    const values = await entityForm.validateFields();
    setSubmitting(true);
    try {
      if (entityResource === 'products') {
        const body = {
          category: nullableText(values, 'category') ?? undefined,
          currency: optionalText(values, 'currency'),
          description: nullableText(values, 'description') ?? undefined,
          listPrice: optionalText(values, 'listPrice'),
          name: textValue(values, 'name'),
          sku: textValue(values, 'sku'),
          status: optionalText(values, 'status') as 'active' | 'inactive',
          taxRate: optionalText(values, 'taxRate'),
          unit: optionalText(values, 'unit'),
        };
        if (editing) await updateOpenCoreBusinessProduct(editing.id, body);
        else await createOpenCoreBusinessProduct(body);
      } else if (entityResource === 'quotes') {
        const body = {
          currency: optionalText(values, 'currency'),
          customerId: textValue(values, 'customerId'),
          lines: normalizeQuoteLines(values.lines),
          name: textValue(values, 'name'),
          opportunityId: optionalText(values, 'opportunityId'),
          owner: textValue(values, 'owner'),
          remark: nullableText(values, 'remark') ?? undefined,
          validUntil: dateText(values, 'validUntil'),
        };
        if (editing) await updateOpenCoreBusinessQuote(editing.id, body);
        else await createOpenCoreBusinessQuote(body);
      } else if (entityResource === 'contracts') {
        const body = {
          amount: optionalText(values, 'amount'),
          currency: optionalText(values, 'currency'),
          customerId: textValue(values, 'customerId'),
          effectiveFrom: dateText(values, 'effectiveFrom'),
          effectiveTo: dateText(values, 'effectiveTo'),
          name: textValue(values, 'name'),
          opportunityId: optionalText(values, 'opportunityId'),
          owner: textValue(values, 'owner'),
          quoteId: optionalText(values, 'quoteId'),
          remark: nullableText(values, 'remark') ?? undefined,
          signedAt: dateText(values, 'signedAt'),
        };
        if (editing) await updateOpenCoreBusinessContract(editing.id, body);
        else await createOpenCoreBusinessContract(body);
      } else {
        const body = {
          amount: optionalText(values, 'amount'),
          contractId: textValue(values, 'contractId'),
          dueAt: dateText(values, 'dueAt') ?? '',
          name: textValue(values, 'name'),
          remark: nullableText(values, 'remark') ?? undefined,
        };
        if (editing) await updateOpenCoreBusinessReceivable(editing.id, body);
        else await createOpenCoreBusinessReceivable(body);
      }
      message.success(
        formatMessage(
          commerceMessageId('messages.saved'),
          'Commerce record saved.',
        ),
      );
      closeEntityModal();
      await reloadCommerce();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              commerceMessageId('messages.saveFailed'),
              'Commerce save failed.',
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitPayment = async () => {
    if (!paymentTarget) return;
    const values = await paymentForm.validateFields();
    setSubmitting(true);
    try {
      await recordOpenCoreBusinessReceivablePayment(paymentTarget.id, {
        actor: optionalText(values, 'actor'),
        amount: textValue(values, 'amount'),
      });
      message.success(
        formatMessage(
          commerceMessageId('messages.paymentRecorded'),
          'Payment recorded.',
        ),
      );
      closePayment();
      await reloadCommerce();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              commerceMessageId('messages.actionFailed'),
              'Commerce action failed.',
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const archiveRow = async (row: CommerceRow) => {
    if (row.resource === 'products')
      await archiveOpenCoreBusinessProduct(row.id);
    if (row.resource === 'quotes') await archiveOpenCoreBusinessQuote(row.id);
    if (row.resource === 'contracts')
      await archiveOpenCoreBusinessContract(row.id);
    if (row.resource === 'receivables')
      await cancelOpenCoreBusinessReceivable(row.id);
    message.success(
      formatMessage(commerceMessageId('messages.archived'), 'Record archived.'),
    );
    await reloadCommerce();
  };

  const runStateAction = async (row: CommerceRow, action: string) => {
    if (row.resource === 'quotes' && action === 'submit') {
      await submitOpenCoreBusinessQuote(row.id);
    }
    if (row.resource === 'quotes' && action === 'accept') {
      await acceptOpenCoreBusinessQuote(row.id);
    }
    if (row.resource === 'contracts' && action === 'activate') {
      await activateOpenCoreBusinessContract(row.id);
    }
    if (row.resource === 'contracts' && action === 'complete') {
      await completeOpenCoreBusinessContract(row.id);
    }
    message.success(
      formatMessage(
        commerceMessageId('messages.actionCompleted'),
        'Commerce action completed.',
      ),
    );
    await reloadCommerce();
  };

  const requestTable = async (params: Record<string, unknown>) => {
    const page = pageNumber(params.current, 1);
    const pageSize = pageNumber(params.pageSize, 10);
    const keyword = optionalText(params, 'keyword');
    const owner = optionalText(params, 'owner');
    const status = optionalText(params, 'status');
    const customerId = optionalText(params, 'customerId');

    if (activeResource === 'products') {
      const result = await pageOpenCoreBusinessProducts({
        keyword,
        page,
        pageSize,
        status: status as BusinessProductSummary['status'] | undefined,
      });
      const data = rowify('products', result.items);
      setTableRows(data);
      return { data, success: true, total: result.total };
    }

    if (activeResource === 'quotes') {
      const result = await pageOpenCoreBusinessQuotes({
        customerId,
        keyword,
        owner,
        page,
        pageSize,
        status: status as BusinessQuoteSummary['status'] | undefined,
      });
      const data = rowify('quotes', result.items);
      setTableRows(data);
      return { data, success: true, total: result.total };
    }

    if (activeResource === 'contracts') {
      const result = await pageOpenCoreBusinessContracts({
        customerId,
        keyword,
        owner,
        page,
        pageSize,
        status: status as BusinessContractSummary['status'] | undefined,
      });
      const data = rowify('contracts', result.items);
      setTableRows(data);
      return { data, success: true, total: result.total };
    }

    const result = await pageOpenCoreBusinessReceivables({
      customerId,
      keyword,
      page,
      pageSize,
      status: status as BusinessReceivableSummary['status'] | undefined,
    });
    const data = rowify('receivables', result.items);
    setTableRows(data);
    return { data, success: true, total: result.total };
  };

  const customerValueEnum = useMemo(
    () =>
      Object.fromEntries(
        customers.map((customer) => [customer.id, { text: customer.name }]),
      ),
    [customers],
  );
  const columns: ProColumns<CommerceRow>[] = [
    {
      title: formatMessage(commerceMessageId('fields.keyword'), 'Keyword'),
      dataIndex: 'keyword',
      hideInTable: true,
    },
    {
      title: formatMessage(commerceMessageId('fields.owner'), 'Owner'),
      dataIndex: 'owner',
      hideInTable: true,
      search: ['products', 'receivables'].includes(activeResource)
        ? false
        : undefined,
    },
    {
      title: formatMessage(commerceMessageId('fields.customer'), 'Customer'),
      dataIndex: 'customerId',
      hideInTable: true,
      search: activeResource === 'products' ? false : undefined,
      valueEnum: customerValueEnum,
      valueType: 'select',
    },
    {
      title: formatMessage(commerceMessageId('fields.status'), 'Status'),
      dataIndex: 'status',
      hideInTable: true,
      valueEnum: valueEnum(
        activeResource === 'products'
          ? PRODUCT_STATUSES
          : activeResource === 'quotes'
            ? QUOTE_STATUSES
            : activeResource === 'contracts'
              ? CONTRACT_STATUSES
              : RECEIVABLE_STATUSES,
        formatMessage,
        resourceStatusScope(activeResource),
      ),
      valueType: 'select',
    },
    {
      title: formatMessage(commerceMessageId('fields.tenant'), 'Tenant'),
      dataIndex: 'tenantId',
      search: false,
      width: 150,
    },
    {
      title:
        activeResource === 'products'
          ? formatMessage(commerceMessageId('fields.sku'), 'SKU')
          : formatMessage(commerceMessageId('fields.number'), 'Number'),
      dataIndex: activeResource === 'products' ? 'sku' : 'number',
      search: false,
      width: 180,
    },
    {
      title: formatMessage(commerceMessageId('fields.name'), 'Name'),
      dataIndex: 'name',
      search: false,
      width: activeResource === 'quotes' ? 280 : 240,
      render: (_, record) => (
        <Typography.Link onClick={() => setSelected(record)}>
          {getString(record, 'name') ?? record.id}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage(commerceMessageId('fields.customer'), 'Customer'),
      dataIndex: 'customerName',
      search: false,
      width: 220,
      hideInTable: activeResource === 'products',
    },
    {
      title: formatMessage(commerceMessageId('fields.contract'), 'Contract'),
      dataIndex: 'contractName',
      search: false,
      width: 220,
      hideInTable: activeResource !== 'receivables',
    },
    {
      title: formatMessage(commerceMessageId('fields.owner'), 'Owner'),
      dataIndex: 'owner',
      search: false,
      width: 120,
      hideInTable: ['products', 'receivables'].includes(activeResource),
    },
    {
      title: formatMessage(commerceMessageId('fields.status'), 'Status'),
      dataIndex: 'status',
      search: false,
      width: 130,
      render: (_, record) => (
        <Tag color={statusColor(getString(record, 'status'))}>
          {statusText(record, formatMessage)}
        </Tag>
      ),
    },
    {
      title:
        activeResource === 'products'
          ? formatMessage(commerceMessageId('fields.listPrice'), 'List Price')
          : activeResource === 'quotes'
            ? formatMessage(commerceMessageId('fields.totalAmount'), 'Total')
            : formatMessage(commerceMessageId('fields.amount'), 'Amount'),
      dataIndex:
        activeResource === 'quotes'
          ? 'totalAmount'
          : activeResource === 'products'
            ? 'listPrice'
            : 'amount',
      search: false,
      width: 140,
    },
    {
      title: formatMessage(commerceMessageId('fields.paidAmount'), 'Paid'),
      dataIndex: 'paidAmount',
      search: false,
      width: 120,
      hideInTable: activeResource !== 'receivables',
    },
    {
      title: formatMessage(commerceMessageId('fields.dueAt'), 'Due At'),
      dataIndex: 'dueAt',
      search: false,
      width: 180,
      hideInTable: activeResource !== 'receivables',
    },
    {
      title: formatMessage(commerceMessageId('actions.column'), 'Action'),
      valueType: 'option',
      width: 300,
      render: (_, record) =>
        [
          <Tooltip
            key="detail"
            title={formatMessage(commerceMessageId('actions.detail'), 'Detail')}
          >
            <Button
              icon={<EyeOutlined />}
              onClick={() => setSelected(record)}
              size="small"
              type="link"
            />
          </Tooltip>,
          access.canUpdateBusiness && canEdit(record) ? (
            <Tooltip
              key="edit"
              title={formatMessage(commerceMessageId('actions.edit'), 'Edit')}
            >
              <Button
                icon={<EditOutlined />}
                onClick={() => openEdit(record)}
                size="small"
                type="link"
              />
            </Tooltip>
          ) : null,
          access.canUpdateBusiness &&
          record.resource === 'quotes' &&
          getString(record, 'status') === 'draft' ? (
            <Button
              icon={<SendOutlined />}
              key="submit"
              onClick={() => void runStateAction(record, 'submit')}
              size="small"
              type="link"
            >
              {formatMessage(commerceMessageId('actions.submit'), 'Submit')}
            </Button>
          ) : null,
          access.canUpdateBusiness &&
          record.resource === 'quotes' &&
          ['draft', 'sent'].includes(getString(record, 'status') ?? '') ? (
            <Button
              icon={<CheckCircleOutlined />}
              key="accept"
              onClick={() => void runStateAction(record, 'accept')}
              size="small"
              type="link"
            >
              {formatMessage(commerceMessageId('actions.accept'), 'Accept')}
            </Button>
          ) : null,
          access.canUpdateBusiness &&
          record.resource === 'contracts' &&
          getString(record, 'status') === 'draft' ? (
            <Button
              key="activate"
              onClick={() => void runStateAction(record, 'activate')}
              size="small"
              type="link"
            >
              {formatMessage(commerceMessageId('actions.activate'), 'Activate')}
            </Button>
          ) : null,
          access.canUpdateBusiness &&
          record.resource === 'contracts' &&
          getString(record, 'status') === 'active' ? (
            <Button
              key="complete"
              onClick={() => void runStateAction(record, 'complete')}
              size="small"
              type="link"
            >
              {formatMessage(commerceMessageId('actions.complete'), 'Complete')}
            </Button>
          ) : null,
          access.canUpdateBusiness &&
          record.resource === 'receivables' &&
          !['canceled', 'paid'].includes(getString(record, 'status') ?? '') ? (
            <Button
              key="payment"
              onClick={() => openPayment(record)}
              size="small"
              type="link"
            >
              {formatMessage(commerceMessageId('actions.payment'), 'Payment')}
            </Button>
          ) : null,
          access.canDeleteBusiness &&
          !['archived', 'canceled', 'paid'].includes(
            getString(record, 'status') ?? '',
          ) ? (
            <Popconfirm
              key="archive"
              onConfirm={() => void archiveRow(record)}
              title={formatMessage(
                commerceMessageId('actions.archiveConfirm'),
                'Archive or cancel this record?',
              )}
            >
              <Button danger size="small" type="link">
                {record.resource === 'receivables'
                  ? formatMessage(commerceMessageId('actions.cancel'), 'Cancel')
                  : formatMessage(
                      commerceMessageId('actions.archive'),
                      'Archive',
                    )}
              </Button>
            </Popconfirm>
          ) : null,
        ].filter(Boolean),
    },
  ];

  const exportColumns = useMemo(
    () => createExportColumns(activeResource, formatMessage),
    [activeResource, formatMessage],
  );

  return (
    <PageContainer
      subTitle={formatMessage(
        commerceMessageId('section'),
        'Business Commerce',
      )}
      title={resourceLabel(activeResource, formatMessage)}
    >
      {loadError ? (
        <Alert
          action={
            <Button onClick={() => void reloadCommerce()} size="small">
              {formatMessage(commerceMessageId('actions.retry'), 'Retry')}
            </Button>
          }
          description={loadError}
          message={formatMessage(
            commerceMessageId('load.liveFailure'),
            'Live commerce data unavailable',
          )}
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
        />
      ) : null}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              loading={loading}
              title={formatMessage(
                commerceMessageId('stats.products'),
                'Products',
              )}
              value={summary?.products}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              loading={loading}
              title={formatMessage(
                commerceMessageId('stats.openQuotes'),
                'Open Quotes',
              )}
              value={summary?.openQuotes}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              loading={loading}
              title={formatMessage(
                commerceMessageId('stats.activeContracts'),
                'Active Contracts',
              )}
              value={summary?.activeContracts}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              loading={loading}
              title={formatMessage(
                commerceMessageId('stats.receivableBalance'),
                'Receivable Balance',
              )}
              value={amountText(summary?.receivableBalance, intl.locale)}
            />
          </Card>
        </Col>
      </Row>

      <ProTable<CommerceRow>
        actionRef={actionRef}
        columns={columns}
        params={{ activeResource }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        request={requestTable}
        rowKey="id"
        scroll={{ x: 1420 }}
        search={{ labelWidth: 'auto' }}
        toolbar={{
          actions: [
            <Button
              icon={<ReloadOutlined />}
              key="reload"
              onClick={() => void reloadCommerce()}
            >
              {formatMessage(commerceMessageId('actions.reload'), 'Reload')}
            </Button>,
            access.canCreateBusiness ? (
              <Button
                icon={<PlusOutlined />}
                key="create"
                onClick={() => openCreate(activeResource)}
                type="primary"
              >
                {formatMessage(commerceMessageId('actions.create'), 'Create')}
              </Button>
            ) : null,
            access.canExportBusiness ? (
              <CurrentPageExportButton<CommerceRow>
                columns={exportColumns}
                filename={`opencore-business-${activeResource}.csv`}
                key="export"
                resource={`business-${activeResource}`}
                rows={tableRows}
              />
            ) : null,
          ].filter(Boolean),
        }}
      />

      <ReadOnlyDetailDrawer
        fields={[
          {
            label: formatMessage(commerceMessageId('fields.tenant'), 'Tenant'),
            value: selected?.tenantId,
          },
          {
            label: formatMessage(commerceMessageId('fields.id'), 'ID'),
            value: selected?.id,
          },
          {
            label: formatMessage(
              commerceMessageId('fields.resource'),
              'Resource',
            ),
            value: selected && resourceLabel(selected.resource, formatMessage),
          },
          {
            label: formatMessage(commerceMessageId('fields.number'), 'Number'),
            value: getString(selected, 'number'),
          },
          {
            label: formatMessage(commerceMessageId('fields.name'), 'Name'),
            value: getString(selected, 'name'),
          },
          {
            label: formatMessage(
              commerceMessageId('fields.customer'),
              'Customer',
            ),
            value: getString(selected, 'customerName'),
          },
          {
            label: formatMessage(commerceMessageId('fields.status'), 'Status'),
            value: selected && statusText(selected, formatMessage),
          },
          {
            label: formatMessage(commerceMessageId('fields.amount'), 'Amount'),
            value:
              getString(selected, 'totalAmount') ??
              getString(selected, 'amount'),
          },
          {
            label: formatMessage(
              commerceMessageId('fields.createdAt'),
              'Created At',
            ),
            value: getString(selected, 'createdAt'),
          },
          {
            label: formatMessage(
              commerceMessageId('fields.updatedAt'),
              'Updated At',
            ),
            value: getString(selected, 'updatedAt'),
          },
        ]}
        jsonSections={
          selected
            ? [
                {
                  title: formatMessage(
                    commerceMessageId('fields.record'),
                    'Record',
                  ),
                  value: selected,
                },
              ]
            : []
        }
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={getString(selected, 'name') ?? selected?.id ?? ''}
      />

      <Modal
        destroyOnClose
        okButtonProps={{ loading: submitting }}
        onCancel={closeEntityModal}
        onOk={() => void submitEntity()}
        open={Boolean(entityResource)}
        title={formatMessage(
          editing
            ? commerceMessageId('modal.editTitle')
            : commerceMessageId('modal.createTitle'),
          editing ? 'Edit {resource}' : 'Create {resource}',
          {
            resource: entityResource
              ? resourceLabel(entityResource, formatMessage)
              : '',
          },
        )}
        width={760}
      >
        <Form form={entityForm} layout="vertical">
          <CommerceFields
            contracts={contracts}
            customers={customers}
            editing={editing}
            formatMessage={formatMessage}
            products={products}
            quotes={quotes}
            resource={entityResource}
          />
        </Form>
      </Modal>

      <Modal
        destroyOnClose
        okButtonProps={{ loading: submitting }}
        onCancel={closePayment}
        onOk={() => void submitPayment()}
        open={Boolean(paymentTarget)}
        title={formatMessage(
          commerceMessageId('modal.paymentTitle'),
          'Payment',
        )}
        width={520}
      >
        <Form form={paymentForm} layout="vertical">
          <Form.Item
            label={formatMessage(commerceMessageId('fields.amount'), 'Amount')}
            name="amount"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={formatMessage(commerceMessageId('fields.actor'), 'Actor')}
            name="actor"
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}

function CommerceFields({
  contracts,
  customers,
  editing,
  formatMessage,
  products,
  quotes,
  resource,
}: {
  contracts: readonly BusinessContractSummary[];
  customers: readonly BusinessCustomerSummary[];
  editing?: CommerceRow;
  formatMessage: FormatMessage;
  products: readonly BusinessProductSummary[];
  quotes: readonly BusinessQuoteSummary[];
  resource?: CommerceResourceKey;
}) {
  if (!resource) return null;

  if (resource === 'products') {
    return (
      <>
        <Form.Item
          label={formatMessage(commerceMessageId('fields.sku'), 'SKU')}
          name="sku"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(commerceMessageId('fields.name'), 'Name')}
          name="name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(commerceMessageId('fields.status'), 'Status')}
          name="status"
        >
          <Select
            disabled={Boolean(
              editing && getString(editing, 'status') === 'archived',
            )}
            options={enumOptions(
              ['active', 'inactive'],
              formatMessage,
              'productStatus',
            )}
          />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            commerceMessageId('fields.category'),
            'Category',
          )}
          name="category"
        >
          <Input />
        </Form.Item>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item
              label={formatMessage(commerceMessageId('fields.unit'), 'Unit')}
              name="unit"
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={formatMessage(
                commerceMessageId('fields.listPrice'),
                'List Price',
              )}
              name="listPrice"
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={formatMessage(
                commerceMessageId('fields.taxRate'),
                'Tax Rate',
              )}
              name="taxRate"
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          label={formatMessage(
            commerceMessageId('fields.currency'),
            'Currency',
          )}
          name="currency"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(
            commerceMessageId('fields.description'),
            'Description',
          )}
          name="description"
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </>
    );
  }

  if (resource === 'quotes') {
    return (
      <>
        <CustomerSelect customers={customers} formatMessage={formatMessage} />
        <Form.Item
          label={formatMessage(commerceMessageId('fields.name'), 'Name')}
          name="name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label={formatMessage(commerceMessageId('fields.owner'), 'Owner')}
              name="owner"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label={formatMessage(
                commerceMessageId('fields.currency'),
                'Currency',
              )}
              name="currency"
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label={formatMessage(
                commerceMessageId('fields.opportunityId'),
                'Opportunity ID',
              )}
              name="opportunityId"
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label={formatMessage(
                commerceMessageId('fields.validUntil'),
                'Valid Until',
              )}
              name="validUntil"
            >
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.List name="lines">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Row gutter={8} key={field.key}>
                  <Col span={6}>
                    <Form.Item
                      {...field}
                      label={formatMessage(
                        commerceMessageId('fields.productName'),
                        'Product',
                      )}
                      name={[field.name, 'productName']}
                      rules={[{ required: true }]}
                    >
                      <Select
                        showSearch
                        options={products.map((product) => ({
                          label: product.name,
                          value: product.name,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item
                      {...field}
                      label={formatMessage(
                        commerceMessageId('fields.quantity'),
                        'Quantity',
                      )}
                      name={[field.name, 'quantity']}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item
                      {...field}
                      label={formatMessage(
                        commerceMessageId('fields.unitPrice'),
                        'Unit Price',
                      )}
                      name={[field.name, 'unitPrice']}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item
                      {...field}
                      label={formatMessage(
                        commerceMessageId('fields.discountRate'),
                        'Discount',
                      )}
                      name={[field.name, 'discountRate']}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item
                      {...field}
                      label={formatMessage(
                        commerceMessageId('fields.taxRate'),
                        'Tax',
                      )}
                      name={[field.name, 'taxRate']}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={2}>
                    <Button
                      disabled={fields.length <= 1}
                      icon={<MinusOutlined />}
                      onClick={() => remove(field.name)}
                      style={{ marginTop: 30 }}
                    />
                  </Col>
                </Row>
              ))}
              <Button onClick={() => add()} type="dashed">
                {formatMessage(
                  commerceMessageId('actions.addLine'),
                  'Add line',
                )}
              </Button>
            </>
          )}
        </Form.List>
        <Form.Item
          label={formatMessage(commerceMessageId('fields.remark'), 'Remark')}
          name="remark"
          style={{ marginTop: 16 }}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </>
    );
  }

  if (resource === 'contracts') {
    return (
      <>
        <CustomerSelect customers={customers} formatMessage={formatMessage} />
        <Form.Item
          label={formatMessage(commerceMessageId('fields.quote'), 'Quote')}
          name="quoteId"
        >
          <Select
            allowClear
            showSearch
            options={quotes.map((quote) => ({
              label: `${quote.number} ${quote.name}`,
              value: quote.id,
            }))}
          />
        </Form.Item>
        <Form.Item
          label={formatMessage(commerceMessageId('fields.name'), 'Name')}
          name="name"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item
              label={formatMessage(commerceMessageId('fields.owner'), 'Owner')}
              name="owner"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={formatMessage(
                commerceMessageId('fields.amount'),
                'Amount',
              )}
              name="amount"
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={formatMessage(
                commerceMessageId('fields.currency'),
                'Currency',
              )}
              name="currency"
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item
              label={formatMessage(
                commerceMessageId('fields.signedAt'),
                'Signed At',
              )}
              name="signedAt"
            >
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={formatMessage(
                commerceMessageId('fields.effectiveFrom'),
                'Effective From',
              )}
              name="effectiveFrom"
            >
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={formatMessage(
                commerceMessageId('fields.effectiveTo'),
                'Effective To',
              )}
              name="effectiveTo"
            >
              <DatePicker showTime style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          label={formatMessage(
            commerceMessageId('fields.opportunityId'),
            'Opportunity ID',
          )}
          name="opportunityId"
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={formatMessage(commerceMessageId('fields.remark'), 'Remark')}
          name="remark"
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </>
    );
  }

  return (
    <>
      <Form.Item
        label={formatMessage(commerceMessageId('fields.contract'), 'Contract')}
        name="contractId"
        rules={[{ required: true }]}
      >
        <Select
          showSearch
          options={contracts.map((contract) => ({
            label: `${contract.number} ${contract.name}`,
            value: contract.id,
          }))}
        />
      </Form.Item>
      <Form.Item
        label={formatMessage(commerceMessageId('fields.name'), 'Name')}
        name="name"
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item
            label={formatMessage(commerceMessageId('fields.amount'), 'Amount')}
            name="amount"
          >
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={formatMessage(commerceMessageId('fields.dueAt'), 'Due At')}
            name="dueAt"
            rules={[{ required: true }]}
          >
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        label={formatMessage(commerceMessageId('fields.remark'), 'Remark')}
        name="remark"
      >
        <Input.TextArea rows={3} />
      </Form.Item>
    </>
  );
}

function CustomerSelect({
  customers,
  formatMessage,
}: {
  customers: readonly BusinessCustomerSummary[];
  formatMessage: FormatMessage;
}) {
  return (
    <Form.Item
      label={formatMessage(commerceMessageId('fields.customer'), 'Customer')}
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
  );
}

function normalizeQuoteLines(value: unknown) {
  const rows = Array.isArray(value) ? value : [];
  return rows
    .map((row) => (typeof row === 'object' && row !== null ? row : {}))
    .map((row) => {
      const values = row as Record<string, unknown>;
      return {
        discountRate: optionalText(values, 'discountRate'),
        productName: textValue(values, 'productName'),
        quantity: optionalText(values, 'quantity'),
        taxRate: optionalText(values, 'taxRate'),
        unit: optionalText(values, 'unit'),
        unitPrice: optionalText(values, 'unitPrice'),
      };
    })
    .filter((row) => row.productName);
}
