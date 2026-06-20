import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  OrderedListOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components';
import type {
  DictItemQueryRequest,
  DictItemSummary,
  DictTypeQueryRequest,
  DictTypeSummary,
  ExportPreview,
} from '@opencore/sdk';
import { useAccess } from '@umijs/max';
import {
  Alert,
  Button,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
  type TablePaginationConfig,
} from 'antd';
import { createStyles } from 'antd-style';
import { useMemo, useRef, useState, type Key } from 'react';
import {
  createOpenCoreDict,
  createOpenCoreDictItem,
  deleteOpenCoreDict,
  deleteOpenCoreDictItem,
  deleteOpenCoreDictItems,
  deleteOpenCoreDicts,
  exportOpenCoreDictItems,
  exportOpenCoreDicts,
  getOpenCoreDict,
  listOpenCoreDictItemsPage,
  listOpenCoreDictPage,
  refreshOpenCoreDictCache,
  updateOpenCoreDict,
  updateOpenCoreDictItem,
  updateOpenCoreDictItemStatus,
  updateOpenCoreDictStatus,
} from '@/services/opencore/platform';
import { clearDictOptionsCache } from '@/components';
import {
  ReadOnlyDetailDrawer,
  type DetailField,
  type DetailJsonSection,
} from '../shared/ReadOnlyDetailDrawer';

type DictTypeFormValues = {
  code: string;
  description?: string;
  enabled?: boolean;
  name: string;
  remark?: string;
};

type DictItemFormValues = {
  colorType?: string;
  cssClass?: string;
  enabled?: boolean;
  id?: string;
  label: string;
  remark?: string;
  sort?: number;
  value: string;
};

type DictTableParams = {
  code?: string;
  createdAtRange?: string[];
  current?: number;
  enabled?: boolean | string;
  name?: string;
  pageSize?: number;
};

type DictItemTableParams = {
  current?: number;
  dictCode?: string;
  enabled?: boolean | string;
  label?: string;
  pageSize?: number;
  value?: string;
};

const text = {
  actionColumn: '操作',
  batchDelete: '批量删除',
  batchDisable: '批量停用',
  batchEnable: '批量启用',
  cacheRefreshFailure: '字典缓存刷新失败。',
  cacheRefreshed: '字典缓存已刷新。',
  colorDefault: '默认',
  confirmDeleteDict: '确认删除该字典？有字典项时请先清空字典项。',
  confirmDeleteDictItem: '确认删除该字典项？',
  create: '创建',
  createDict: '新建字典',
  createDictItem: '新建字典项',
  delete: '删除',
  deleteSelectedDictItems: '删除选中字典项',
  deleteSelectedDicts: '删除选中字典',
  detail: '详情',
  dictCreated: '字典已创建。',
  dictDeleted: '字典已删除。',
  dictItemCreated: '字典项已创建。',
  dictItemDeleted: '字典项已删除。',
  dictItemUpdated: '字典项已更新。',
  dictStatusUpdated: '字典状态已更新。',
  dictUpdated: '字典已更新。',
  disabled: '停用',
  edit: '编辑',
  editDict: '编辑字典',
  editDictItem: '编辑字典项',
  enabled: '启用',
  export: '导出',
  exportPreviewTitle: '导出预览',
  fieldId: '标识',
  itemStatusUpdated: '字典项状态已更新。',
  loadDictDetailFailure: '无法加载实时字典详情。',
  loadDictFailure: '无法加载实时字典列表。',
  loadItemFailure: '无法加载实时字典项。',
  manageItems: '管理字典项',
  pageSubtitle: '系统管理',
  pageTitle: '字典管理',
  refresh: '刷新',
  refreshCache: '刷新缓存',
  save: '保存',
  selectedDictItems: '已选择 {count} 个字典项',
  selectedDicts: '已选择 {count} 个字典',
  systemDictDeleteDisabled: '内置字典不可删除',
  systemDictDisableDisabled: '内置字典不可停用',
  systemDictItemDeleteDisabled: '内置字典项不可删除',
  validationCodeRequired: '请输入字典编码。',
  validationLabelRequired: '请输入显示标签。',
  validationNameRequired: '请输入字典名称。',
  validationValueDuplicate: '同一字典下字典值必须唯一。',
  validationValueRequired: '请输入字典值。',
};

const colorOptions = [
  { label: '默认', value: 'default' },
  { label: '成功', value: 'success' },
  { label: '处理中', value: 'processing' },
  { label: '警告', value: 'warning' },
  { label: '错误', value: 'error' },
  { label: '蓝色', value: 'blue' },
  { label: '青色', value: 'cyan' },
  { label: '绿色', value: 'green' },
  { label: '金色', value: 'gold' },
  { label: '橙色', value: 'orange' },
  { label: '紫色', value: 'purple' },
  { label: '洋红', value: 'magenta' },
  { label: '火山', value: 'volcano' },
];

const statusValueEnum = {
  true: { text: text.enabled, status: 'Success' },
  false: { text: text.disabled, status: 'Default' },
};

const useStyles = createStyles(({ token, css }) => ({
  layout: css`
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(420px, 0.92fr);
    gap: ${token.marginLG}px;

    @media (max-width: 1100px) {
      grid-template-columns: 1fr;
    }
  `,
  panelHeader: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: ${token.marginMD}px;
    margin-block-end: ${token.marginSM}px;

    @media (max-width: 640px) {
      flex-direction: column;
    }
  `,
  panelTitle: css`
    margin: 0;
    color: ${token.colorTextHeading};
    font-size: ${token.fontSizeLG}px;
    font-weight: 600;
    line-height: 1.35;
  `,
  panelDescription: css`
    margin-block-start: 4px;
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
  `,
  selectedDict: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: ${token.marginXS}px;
  `,
  tableShell: css`
    min-width: 0;
  `,
  codeText: css`
    word-break: break-all;
  `,
}));

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeBooleanFilter(value: unknown): boolean | undefined {
  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return undefined;
}

function normalizePage(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function toDictTypeQuery(params: DictTableParams): DictTypeQueryRequest {
  const [createdFromDate, createdToDate] = params.createdAtRange ?? [];

  return {
    page: normalizePage(params.current, 1),
    pageSize: normalizePage(params.pageSize, 10),
    code: normalizeText(params.code),
    name: normalizeText(params.name),
    enabled: normalizeBooleanFilter(params.enabled),
    createdFrom: createdFromDate ? `${createdFromDate}T00:00:00.000Z` : undefined,
    createdTo: createdToDate ? `${createdToDate}T23:59:59.999Z` : undefined,
  };
}

function toDictItemQuery(
  params: DictItemTableParams,
  dictCode?: string,
): DictItemQueryRequest {
  return {
    page: normalizePage(params.current, 1),
    pageSize: normalizePage(params.pageSize, 10),
    dictCode,
    label: normalizeText(params.label),
    value: normalizeText(params.value),
    enabled: normalizeBooleanFilter(params.enabled),
  };
}

function trimOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function formatDateTime(value?: string): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN', { hour12: false });
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatCount(template: string, count: number): string {
  return template.replace('{count}', String(count));
}

function renderStatus(enabled: boolean) {
  return <Tag color={enabled ? 'success' : 'default'}>{enabled ? text.enabled : text.disabled}</Tag>;
}

function renderSystemTag(system: boolean) {
  return system ? <Tag color="blue">内置</Tag> : <Tag>自定义</Tag>;
}

function renderDictItemTag(item: DictItemSummary) {
  return (
    <Tag color={item.colorType || (item.enabled ? 'success' : 'default')}>
      {item.label}
    </Tag>
  );
}

function showExportPreview(preview: ExportPreview) {
  Modal.info({
    title: text.exportPreviewTitle,
    content: (
      <Space direction="vertical" size={4}>
        <Typography.Text>文件：{preview.filename}</Typography.Text>
        <Typography.Text>范围：当前查询结果</Typography.Text>
        <Typography.Text>行数：{preview.rowCount}</Typography.Text>
        <Typography.Text>生成时间：{formatDateTime(preview.generatedAt)}</Typography.Text>
      </Space>
    ),
  });
}

export default function DictsPage() {
  const access = useAccess();
  const { styles } = useStyles();
  const screens = Grid.useBreakpoint();
  const isNarrow = screens.lg === false;
  const typeActionRef = useRef<ActionType | undefined>(undefined);
  const itemActionRef = useRef<ActionType | undefined>(undefined);
  const [dictForm] = Form.useForm<DictTypeFormValues>();
  const [itemForm] = Form.useForm<DictItemFormValues>();
  const [loadError, setLoadError] = useState<string>();
  const [dictRows, setDictRows] = useState<readonly DictTypeSummary[]>([]);
  const [itemRows, setItemRows] = useState<readonly DictItemSummary[]>([]);
  const [dictQuery, setDictQuery] = useState<DictTypeQueryRequest>({
    page: 1,
    pageSize: 10,
  });
  const [itemQuery, setItemQuery] = useState<DictItemQueryRequest>({
    page: 1,
    pageSize: 10,
  });
  const [selectedDict, setSelectedDict] = useState<DictTypeSummary>();
  const [selectedDetail, setSelectedDetail] = useState<DictTypeSummary>();
  const [editingDict, setEditingDict] = useState<DictTypeSummary>();
  const [dictModalOpen, setDictModalOpen] = useState(false);
  const [dictSubmitting, setDictSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<DictItemSummary>();
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [selectedDictKeys, setSelectedDictKeys] = useState<readonly Key[]>([]);
  const [selectedItemKeys, setSelectedItemKeys] = useState<readonly Key[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [cacheRefreshing, setCacheRefreshing] = useState(false);
  const selectedDictCodes = useMemo(
    () =>
      selectedDictKeys
        .map(String)
        .filter((code) => dictRows.some((record) => record.code === code)),
    [dictRows, selectedDictKeys],
  );
  const selectedItemIds = useMemo(
    () =>
      selectedItemKeys
        .map(String)
        .filter((id) => itemRows.some((record) => record.id === id)),
    [itemRows, selectedItemKeys],
  );
  const canCreate = Boolean(access.canCreateDicts);
  const canUpdate = Boolean(access.canUpdateDicts);
  const canDelete = Boolean(access.canDeleteDicts);
  const canExport = Boolean(access.canExportDicts);
  const canManage = Boolean(access.canManageDicts);

  const createDetailFields = (record: DictTypeSummary): DetailField[] => [
    { label: text.fieldId, value: record.id },
    { label: '字典编码', value: record.code },
    { label: '字典名称', value: record.name },
    { label: '描述', value: record.description },
    { label: '备注', value: record.remark },
    { label: '类型', value: record.system ? '内置字典' : '自定义字典' },
    { label: '状态', value: record.enabled ? text.enabled : text.disabled },
    { label: '字典项数量', value: record.items.length },
    { label: '创建时间', value: formatDateTime(record.createdAt) },
    { label: '更新时间', value: formatDateTime(record.updatedAt) },
  ];

  const createDetailJsonSections = (
    record: DictTypeSummary,
  ): DetailJsonSection[] => [
    {
      title: '字典项快照',
      value: record.items,
    },
  ];

  const reloadDicts = () => {
    typeActionRef.current?.reload();
  };

  const reloadItems = () => {
    itemActionRef.current?.reload();
  };

  const refreshCache = async (silent = false) => {
    setCacheRefreshing(true);
    try {
      await refreshOpenCoreDictCache();
      clearDictOptionsCache();
      if (!silent) {
        message.success(text.cacheRefreshed);
      }
    } catch (error: unknown) {
      if (!silent) {
        message.error(getErrorMessage(error, text.cacheRefreshFailure));
      }
    } finally {
      setCacheRefreshing(false);
    }
  };

  const requestDicts = async (params: DictTableParams) => {
    const query = toDictTypeQuery(params);
    setDictQuery(query);

    try {
      const page = await listOpenCoreDictPage(query);
      const nextRows = [...page.items];
      setDictRows(nextRows);
      setLoadError(undefined);

      setSelectedDict((current) => {
        if (current && nextRows.some((record) => record.code === current.code)) {
          return nextRows.find((record) => record.code === current.code) ?? current;
        }

        return nextRows[0];
      });

      return {
        data: nextRows,
        success: true,
        total: page.total,
      };
    } catch (error: unknown) {
      setDictRows([]);
      setSelectedDict(undefined);
      setLoadError(getErrorMessage(error, text.loadDictFailure));
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  const requestItems = async (params: DictItemTableParams) => {
    const query = toDictItemQuery(params, selectedDict?.code);
    setItemQuery(query);

    if (!selectedDict?.code) {
      setItemRows([]);
      return {
        data: [],
        success: true,
        total: 0,
      };
    }

    try {
      const page = await listOpenCoreDictItemsPage(query);
      const nextRows = [...page.items];
      setItemRows(nextRows);
      return {
        data: nextRows,
        success: true,
        total: page.total,
      };
    } catch (error: unknown) {
      setItemRows([]);
      message.error(getErrorMessage(error, text.loadItemFailure));
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  const selectDict = (record: DictTypeSummary) => {
    setSelectedDict(record);
    setSelectedItemKeys([]);
    setTimeout(() => itemActionRef.current?.reload(), 0);
  };

  const openDetail = async (record: DictTypeSummary) => {
    try {
      setSelectedDetail(await getOpenCoreDict(record.code));
    } catch (error: unknown) {
      setSelectedDetail(undefined);
      message.error(getErrorMessage(error, text.loadDictDetailFailure));
    }
  };

  const openCreateDict = () => {
    setEditingDict(undefined);
    dictForm.setFieldsValue({
      code: '',
      description: '',
      enabled: true,
      name: '',
      remark: '',
    });
    setDictModalOpen(true);
  };

  const openEditDict = async (record: DictTypeSummary) => {
    try {
      const fresh = await getOpenCoreDict(record.code);
      setEditingDict(fresh);
      dictForm.setFieldsValue({
        code: fresh.code,
        description: fresh.description,
        enabled: fresh.enabled,
        name: fresh.name,
        remark: fresh.remark,
      });
      setDictModalOpen(true);
    } catch (error: unknown) {
      message.error(getErrorMessage(error, text.loadDictDetailFailure));
    }
  };

  const submitDict = async () => {
    const values = await dictForm.validateFields();
    const body = {
      description: trimOptional(values.description),
      enabled: values.enabled ?? true,
      name: values.name.trim(),
      remark: trimOptional(values.remark),
    };

    setDictSubmitting(true);
    try {
      if (editingDict) {
        await updateOpenCoreDict(editingDict.code, {
          ...body,
          enabled: editingDict.system ? editingDict.enabled : body.enabled,
        });
        message.success(text.dictUpdated);
      } else {
        await createOpenCoreDict({
          ...body,
          code: values.code.trim(),
        });
        message.success(text.dictCreated);
      }

      await refreshCache(true);
      setDictModalOpen(false);
      setEditingDict(undefined);
      reloadDicts();
    } finally {
      setDictSubmitting(false);
    }
  };

  const deleteDict = async (record: DictTypeSummary) => {
    await deleteOpenCoreDict(record.code);
    message.success(text.dictDeleted);
    await refreshCache(true);
    setSelectedDict((current) => (current?.code === record.code ? undefined : current));
    reloadDicts();
    reloadItems();
  };

  const updateDictsStatus = async (
    codes: readonly string[],
    enabled: boolean,
  ) => {
    if (codes.length === 0) {
      return;
    }

    setBatchLoading(true);
    try {
      await updateOpenCoreDictStatus({ codes, enabled });
      message.success(text.dictStatusUpdated);
      await refreshCache(true);
      setSelectedDictKeys([]);
      reloadDicts();
    } finally {
      setBatchLoading(false);
    }
  };

  const deleteSelectedDicts = async () => {
    if (selectedDictCodes.length === 0) {
      return;
    }

    setBatchLoading(true);
    try {
      await deleteOpenCoreDicts({ codes: selectedDictCodes });
      message.success(text.dictDeleted);
      await refreshCache(true);
      setSelectedDictKeys([]);
      setSelectedDict(undefined);
      reloadDicts();
      reloadItems();
    } finally {
      setBatchLoading(false);
    }
  };

  const openCreateItem = () => {
    if (!selectedDict) {
      return;
    }

    setEditingItem(undefined);
    itemForm.setFieldsValue({
      colorType: 'default',
      cssClass: '',
      enabled: true,
      id: '',
      label: '',
      remark: '',
      sort: (itemRows.length + 1) * 10,
      value: '',
    });
    setItemModalOpen(true);
  };

  const openEditItem = (record: DictItemSummary) => {
    setEditingItem(record);
    itemForm.setFieldsValue({
      colorType: record.colorType ?? 'default',
      cssClass: record.cssClass,
      enabled: record.enabled,
      id: record.id,
      label: record.label,
      remark: record.remark,
      sort: record.sort,
      value: record.value,
    });
    setItemModalOpen(true);
  };

  const ensureUniqueItemValue = async (
    value: string,
    editingId?: string,
  ): Promise<boolean> => {
    if (!selectedDict?.code) {
      return true;
    }

    const page = await listOpenCoreDictItemsPage({
      dictCode: selectedDict.code,
      value,
      page: 1,
      pageSize: 20,
    });
    return !page.items.some((item) => item.value === value && item.id !== editingId);
  };

  const submitItem = async () => {
    if (!selectedDict) {
      return;
    }

    const values = await itemForm.validateFields();
    const value = values.value.trim();
    const unique = await ensureUniqueItemValue(value, editingItem?.id);

    if (!unique) {
      itemForm.setFields([
        {
          name: 'value',
          errors: [text.validationValueDuplicate],
        },
      ]);
      return;
    }

    const body = {
      colorType: trimOptional(values.colorType),
      cssClass: trimOptional(values.cssClass),
      enabled: selectedDict.system && editingItem ? editingItem.enabled : values.enabled ?? true,
      id: trimOptional(values.id),
      label: values.label.trim(),
      remark: trimOptional(values.remark),
      sort: values.sort,
      value,
    };

    setItemSubmitting(true);
    try {
      if (editingItem) {
        await updateOpenCoreDictItem(selectedDict.code, editingItem.id, {
          ...body,
          value: selectedDict.system ? editingItem.value : body.value,
        });
        message.success(text.dictItemUpdated);
      } else {
        await createOpenCoreDictItem(selectedDict.code, body);
        message.success(text.dictItemCreated);
      }

      await refreshCache(true);
      setItemModalOpen(false);
      setEditingItem(undefined);
      reloadItems();
      reloadDicts();
    } finally {
      setItemSubmitting(false);
    }
  };

  const deleteItem = async (record: DictItemSummary) => {
    if (!selectedDict) {
      return;
    }

    await deleteOpenCoreDictItem(selectedDict.code, record.id);
    message.success(text.dictItemDeleted);
    await refreshCache(true);
    reloadItems();
    reloadDicts();
  };

  const updateItemsStatus = async (
    ids: readonly string[],
    enabled: boolean,
  ) => {
    if (ids.length === 0) {
      return;
    }

    setBatchLoading(true);
    try {
      await updateOpenCoreDictItemStatus({ ids, enabled });
      message.success(text.itemStatusUpdated);
      await refreshCache(true);
      setSelectedItemKeys([]);
      reloadItems();
      reloadDicts();
    } finally {
      setBatchLoading(false);
    }
  };

  const deleteSelectedItems = async () => {
    if (selectedItemIds.length === 0) {
      return;
    }

    setBatchLoading(true);
    try {
      await deleteOpenCoreDictItems({ ids: selectedItemIds });
      message.success(text.dictItemDeleted);
      await refreshCache(true);
      setSelectedItemKeys([]);
      reloadItems();
      reloadDicts();
    } finally {
      setBatchLoading(false);
    }
  };

  const exportDicts = async () => {
    showExportPreview(await exportOpenCoreDicts(dictQuery));
  };

  const exportDictItems = async () => {
    showExportPreview(await exportOpenCoreDictItems(itemQuery));
  };

  const dictColumns: ProColumns<DictTypeSummary>[] = [
    {
      title: '字典编码',
      dataIndex: 'code',
      ellipsis: true,
      render: (_, record) => (
        <Typography.Link
          className={styles.codeText}
          onClick={() => selectDict(record)}
        >
          {record.code}
        </Typography.Link>
      ),
    },
    {
      title: '字典名称',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      valueType: 'select',
      valueEnum: statusValueEnum,
      width: 96,
      render: (_, record) => renderStatus(record.enabled),
    },
    {
      title: '类型',
      dataIndex: 'system',
      search: false,
      width: 88,
      render: (_, record) => renderSystemTag(record.system),
    },
    {
      title: '字典项',
      dataIndex: 'items',
      search: false,
      width: 92,
      render: (_, record) => record.items.length,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAtRange',
      valueType: 'dateRange',
      hideInTable: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      search: false,
      width: 168,
      render: (_, record) => formatDateTime(record.updatedAt),
    },
    {
      title: text.actionColumn,
      valueType: 'option',
      width: 188,
      fixed: isNarrow ? undefined : 'right',
      render: (_, record) => {
        const disableSystemStatus = record.system && record.enabled;
        return (
          <Space size="small" wrap>
            <Tooltip title={text.detail}>
              <Button
                aria-label={`查看字典 ${record.code}`}
                icon={<EyeOutlined />}
                onClick={() => void openDetail(record)}
                size="small"
              />
            </Tooltip>
            <Tooltip title={text.manageItems}>
              <Button
                aria-label={`管理 ${record.code} 的字典项`}
                icon={<OrderedListOutlined />}
                onClick={() => selectDict(record)}
                size="small"
                type={selectedDict?.code === record.code ? 'primary' : 'default'}
              />
            </Tooltip>
            {canUpdate ? (
              <Tooltip title={text.edit}>
                <Button
                  aria-label={`编辑字典 ${record.code}`}
                  icon={<EditOutlined />}
                  onClick={() => void openEditDict(record)}
                  size="small"
                />
              </Tooltip>
            ) : null}
            {canUpdate ? (
              <Tooltip
                title={
                  disableSystemStatus
                    ? text.systemDictDisableDisabled
                    : record.enabled
                      ? text.disabled
                      : text.enabled
                }
              >
                <Button
                  aria-label={`${record.enabled ? text.disabled : text.enabled}字典 ${record.code}`}
                  disabled={disableSystemStatus}
                  icon={record.enabled ? <StopOutlined /> : <CheckCircleOutlined />}
                  onClick={() => void updateDictsStatus([record.code], !record.enabled)}
                  size="small"
                />
              </Tooltip>
            ) : null}
            {canDelete ? (
              <Popconfirm
                title={text.confirmDeleteDict}
                okText={text.delete}
                okButtonProps={{ danger: true }}
                disabled={record.system}
                onConfirm={() => void deleteDict(record)}
              >
                <Tooltip
                  title={record.system ? text.systemDictDeleteDisabled : text.delete}
                >
                  <Button
                    aria-label={`删除字典 ${record.code}`}
                    danger
                    disabled={record.system}
                    icon={<DeleteOutlined />}
                    size="small"
                  />
                </Tooltip>
              </Popconfirm>
            ) : null}
          </Space>
        );
      },
    },
  ];

  const itemColumns: ProColumns<DictItemSummary>[] = [
    {
      title: '显示标签',
      dataIndex: 'label',
      ellipsis: true,
      render: (_, record) => renderDictItemTag(record),
    },
    {
      title: '字典值',
      dataIndex: 'value',
      ellipsis: true,
      render: (_, record) => (
        <Typography.Text className={styles.codeText} code>
          {record.value}
        </Typography.Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      valueType: 'select',
      valueEnum: statusValueEnum,
      width: 96,
      render: (_, record) => renderStatus(record.enabled),
    },
    {
      title: '排序',
      dataIndex: 'sort',
      search: false,
      width: 80,
      sorter: (a, b) => a.sort - b.sort,
    },
    {
      title: '样式',
      dataIndex: 'colorType',
      search: false,
      width: 96,
      render: (_, record) => record.colorType || text.colorDefault,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      search: false,
      ellipsis: true,
      hideInTable: isNarrow,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      search: false,
      width: 168,
      hideInTable: isNarrow,
      render: (_, record) => formatDateTime(record.updatedAt),
    },
    {
      title: text.actionColumn,
      valueType: 'option',
      width: 128,
      fixed: isNarrow ? undefined : 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          {canUpdate ? (
            <Tooltip title={text.edit}>
              <Button
                aria-label={`编辑字典项 ${record.value}`}
                icon={<EditOutlined />}
                onClick={() => openEditItem(record)}
                size="small"
              />
            </Tooltip>
          ) : null}
          {canDelete ? (
            <Popconfirm
              title={text.confirmDeleteDictItem}
              okText={text.delete}
              okButtonProps={{ danger: true }}
              disabled={Boolean(selectedDict?.system)}
              onConfirm={() => void deleteItem(record)}
            >
              <Tooltip
                title={
                  selectedDict?.system ? text.systemDictItemDeleteDisabled : text.delete
                }
              >
                <Button
                  aria-label={`删除字典项 ${record.value}`}
                  danger
                  disabled={Boolean(selectedDict?.system)}
                  icon={<DeleteOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  const dictPagination: TablePaginationConfig = {
    defaultPageSize: 10,
    showSizeChanger: true,
  };
  const itemPagination: TablePaginationConfig = {
    defaultPageSize: 10,
    showSizeChanger: true,
  };

  return (
    <PageContainer title={text.pageTitle} subTitle={text.pageSubtitle}>
      {loadError ? (
        <Alert
          showIcon
          type="error"
          message={text.loadDictFailure}
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <div className={styles.layout}>
        <section
          className={styles.tableShell}
          data-opencore-system-dicts-type-panel="true"
        >
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>字典类型</h2>
              <div className={styles.panelDescription}>
                管理字典编码、系统保护状态和全站可用性。
              </div>
            </div>
            <Space wrap>
              {canManage ? (
                <Button
                  data-opencore-system-dicts-cache-refresh="true"
                  icon={<SyncOutlined />}
                  loading={cacheRefreshing}
                  onClick={() => void refreshCache()}
                >
                  {text.refreshCache}
                </Button>
              ) : null}
              {canExport ? (
                <Button icon={<DownloadOutlined />} onClick={() => void exportDicts()}>
                  {text.export}
                </Button>
              ) : null}
              {canCreate ? (
                <Button icon={<PlusOutlined />} onClick={openCreateDict} type="primary">
                  {text.createDict}
                </Button>
              ) : null}
              <Button icon={<ReloadOutlined />} onClick={reloadDicts}>
                {text.refresh}
              </Button>
            </Space>
          </div>
          <ProTable<DictTypeSummary, DictTableParams>
            actionRef={typeActionRef}
            columns={dictColumns}
            options={false}
            pagination={dictPagination}
            request={requestDicts}
            rowClassName={(record) =>
              record.code === selectedDict?.code ? 'ant-table-row-selected' : ''
            }
            rowKey="code"
            rowSelection={
              canUpdate || canDelete
                ? {
                    selectedRowKeys: [...selectedDictKeys],
                    onChange: (keys) => setSelectedDictKeys(keys),
                    preserveSelectedRowKeys: true,
                    getCheckboxProps: (record) => ({
                      disabled: record.system,
                    }),
                  }
                : undefined
            }
            scroll={{ x: 980 }}
            search={{ labelWidth: 84 }}
            tableAlertRender={({ selectedRowKeys }) =>
              formatCount(text.selectedDicts, selectedRowKeys.length)
            }
            tableAlertOptionRender={() => (
              <Space size="small" wrap>
                {canUpdate ? (
                  <>
                    <Button
                      disabled={selectedDictCodes.length === 0}
                      loading={batchLoading}
                      onClick={() => void updateDictsStatus(selectedDictCodes, true)}
                      size="small"
                    >
                      {text.batchEnable}
                    </Button>
                    <Button
                      disabled={selectedDictCodes.length === 0}
                      loading={batchLoading}
                      onClick={() => void updateDictsStatus(selectedDictCodes, false)}
                      size="small"
                    >
                      {text.batchDisable}
                    </Button>
                  </>
                ) : null}
                {canDelete ? (
                  <Popconfirm
                    title={text.deleteSelectedDicts}
                    okText={text.delete}
                    okButtonProps={{ danger: true }}
                    disabled={selectedDictCodes.length === 0}
                    onConfirm={() => void deleteSelectedDicts()}
                  >
                    <Button
                      danger
                      disabled={selectedDictCodes.length === 0}
                      loading={batchLoading}
                      size="small"
                    >
                      {text.batchDelete}
                    </Button>
                  </Popconfirm>
                ) : null}
              </Space>
            )}
          />
        </section>

        <section
          className={styles.tableShell}
          data-opencore-system-dicts-items-panel="true"
        >
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.panelTitle}>字典数据</h2>
              <div className={styles.panelDescription}>
                当前字典：
                {selectedDict ? (
                  <span className={styles.selectedDict}>
                    <Typography.Text code>{selectedDict.code}</Typography.Text>
                    {renderSystemTag(selectedDict.system)}
                    {renderStatus(selectedDict.enabled)}
                  </span>
                ) : (
                  '未选择'
                )}
              </div>
            </div>
            <Space wrap>
              {canExport ? (
                <Button
                  disabled={!selectedDict}
                  icon={<DownloadOutlined />}
                  onClick={() => void exportDictItems()}
                >
                  {text.export}
                </Button>
              ) : null}
              {canCreate ? (
                <Button
                  disabled={!selectedDict}
                  icon={<PlusOutlined />}
                  onClick={openCreateItem}
                  type="primary"
                >
                  {text.createDictItem}
                </Button>
              ) : null}
              <Button disabled={!selectedDict} icon={<ReloadOutlined />} onClick={reloadItems}>
                {text.refresh}
              </Button>
            </Space>
          </div>
          {selectedDict ? (
            <ProTable<DictItemSummary, DictItemTableParams>
              actionRef={itemActionRef}
              columns={itemColumns}
              options={false}
              pagination={itemPagination}
              params={{ dictCode: selectedDict.code }}
              request={requestItems}
              rowKey="id"
              rowSelection={
                (canUpdate || canDelete) && !selectedDict.system
                  ? {
                      selectedRowKeys: [...selectedItemKeys],
                      onChange: (keys) => setSelectedItemKeys(keys),
                      preserveSelectedRowKeys: true,
                    }
                  : undefined
              }
              scroll={{ x: 900 }}
              search={{ labelWidth: 84 }}
              tableAlertRender={({ selectedRowKeys }) =>
                formatCount(text.selectedDictItems, selectedRowKeys.length)
              }
              tableAlertOptionRender={() => (
                <Space size="small" wrap>
                  {canUpdate ? (
                    <>
                      <Button
                        disabled={selectedItemIds.length === 0}
                        loading={batchLoading}
                        onClick={() => void updateItemsStatus(selectedItemIds, true)}
                        size="small"
                      >
                        {text.batchEnable}
                      </Button>
                      <Button
                        disabled={selectedItemIds.length === 0}
                        loading={batchLoading}
                        onClick={() => void updateItemsStatus(selectedItemIds, false)}
                        size="small"
                      >
                        {text.batchDisable}
                      </Button>
                    </>
                  ) : null}
                  {canDelete ? (
                    <Popconfirm
                      title={text.deleteSelectedDictItems}
                      okText={text.delete}
                      okButtonProps={{ danger: true }}
                      disabled={selectedItemIds.length === 0}
                      onConfirm={() => void deleteSelectedItems()}
                    >
                      <Button
                        danger
                        disabled={selectedItemIds.length === 0}
                        loading={batchLoading}
                        size="small"
                      >
                        {text.batchDelete}
                      </Button>
                    </Popconfirm>
                  ) : null}
                </Space>
              )}
            />
          ) : (
            <Empty description="请选择左侧字典类型" />
          )}
        </section>
      </div>

      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
        jsonSections={
          selectedDetail ? createDetailJsonSections(selectedDetail) : []
        }
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={selectedDetail?.name ?? '字典详情'}
      />

      <Modal
        title={editingDict ? text.editDict : text.createDict}
        open={dictModalOpen}
        onCancel={() => {
          setDictModalOpen(false);
          setEditingDict(undefined);
        }}
        onOk={() => void submitDict()}
        confirmLoading={dictSubmitting}
        okText={editingDict ? text.save : text.create}
      >
        <Form<DictTypeFormValues> form={dictForm} layout="vertical">
          <Form.Item
            label="字典编码"
            name="code"
            rules={[{ required: true, message: text.validationCodeRequired }]}
          >
            <Input disabled={Boolean(editingDict)} maxLength={120} />
          </Form.Item>
          <Form.Item
            label="字典名称"
            name="name"
            rules={[{ required: true, message: text.validationNameRequired }]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} maxLength={240} />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} maxLength={240} />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch
              checkedChildren={text.enabled}
              disabled={Boolean(editingDict?.system)}
              unCheckedChildren={text.disabled}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingItem ? text.editDictItem : text.createDictItem}
        open={itemModalOpen}
        onCancel={() => {
          setItemModalOpen(false);
          setEditingItem(undefined);
        }}
        onOk={() => void submitItem()}
        confirmLoading={itemSubmitting}
        okText={editingItem ? text.save : text.create}
      >
        <Form<DictItemFormValues> form={itemForm} layout="vertical">
          <Form.Item label="字典项 ID" name="id">
            <Input disabled={Boolean(editingItem)} maxLength={120} placeholder="不填则自动生成" />
          </Form.Item>
          <Form.Item
            label="显示标签"
            name="label"
            rules={[{ required: true, message: text.validationLabelRequired }]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item
            label="字典值"
            name="value"
            rules={[{ required: true, message: text.validationValueRequired }]}
          >
            <Input disabled={Boolean(selectedDict?.system && editingItem)} maxLength={120} />
          </Form.Item>
          <Form.Item label="排序" name="sort">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="标签颜色" name="colorType">
            <Select allowClear options={colorOptions} />
          </Form.Item>
          <Form.Item label="样式类名" name="cssClass">
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} maxLength={240} />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch
              checkedChildren={text.enabled}
              disabled={Boolean(selectedDict?.system && editingItem)}
              unCheckedChildren={text.disabled}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
