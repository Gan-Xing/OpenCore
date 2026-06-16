import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MinusCircleOutlined,
  OrderedListOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import type { DictItemSummary, DictTypeSummary } from '@opencore/sdk';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';
import {
  createOpenCoreDictItem,
  createOpenCoreDict,
  deleteOpenCoreDictItem,
  deleteOpenCoreDict,
  getOpenCoreDict,
  listOpenCoreDictDataOptions,
  listOpenCoreDictItems,
  listOpenCoreDicts,
  updateOpenCoreDictItem,
  updateOpenCoreDict,
} from '@/services/opencore/platform';
import {
  CurrentPageExportButton,
  type CurrentPageExportColumn,
} from '../shared/CurrentPageExportButton';
import {
  useCurrentPageFilters,
  type CurrentPageFilterOption,
  type CurrentPageSearchField,
} from '../shared/CurrentPageFilters';
import {
  ReadOnlyDetailDrawer,
  type DetailField,
  type DetailJsonSection,
} from '../shared/ReadOnlyDetailDrawer';

type DictItemFormValue = {
  enabled?: boolean;
  id?: string;
  label?: string;
  sort?: number;
  value?: string;
};

type DictFormValues = {
  code: string;
  description?: string;
  enabled?: boolean;
  items?: DictItemFormValue[];
  name: string;
};

const searchFields: CurrentPageSearchField<DictTypeSummary>[] = [
  'code',
  'name',
  'description',
  (record) => record.items.map((item) => `${item.label} ${item.value}`),
];

function normalizeDictItems(
  code: string,
  items: readonly DictItemFormValue[] = [],
): DictItemSummary[] {
  return items.map((item, index) => {
    const value = item.value?.trim() ?? '';

    return {
      id: item.id?.trim() || createDictItemId(code, value, index),
      label: item.label?.trim() ?? '',
      value,
      sort: item.sort ?? (index + 1) * 10,
      enabled: item.enabled ?? true,
    };
  });
}

function normalizeDictItemFormValue(item: DictItemFormValue) {
  return {
    id: item.id?.trim() || undefined,
    label: item.label?.trim() ?? '',
    value: item.value?.trim() ?? '',
    sort: item.sort,
    enabled: item.enabled ?? true,
  };
}

function createDictItemId(code: string, value: string, index: number): string {
  const codePart = createIdPart(code);
  const valuePart = createIdPart(value) || `item_${index + 1}`;
  return `dict_item_${codePart}_${valuePart}`;
}

function createIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

export default function DictsPage() {
  const intl = useIntl();
  const [form] = Form.useForm<DictFormValues>();
  const [itemForm] = Form.useForm<DictItemFormValue>();
  const [rows, setRows] = useState<readonly DictTypeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<DictTypeSummary>();
  const [editingDict, setEditingDict] = useState<DictTypeSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [itemsDict, setItemsDict] = useState<DictTypeSummary>();
  const [itemRows, setItemRows] = useState<readonly DictItemSummary[]>([]);
  const [consumerOptionCount, setConsumerOptionCount] = useState(0);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DictItemSummary>();
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const formatMessage = (
    id: string,
    defaultMessage: string,
    values?: Record<string, number | string>,
  ) =>
    values
      ? intl.formatMessage({ id, defaultMessage }, values)
      : intl.formatMessage({ id, defaultMessage });
  const statusLabels = {
    disabled: formatMessage('pages.system.dicts.status.disabled', 'Disabled'),
    enabled: formatMessage('pages.system.dicts.status.enabled', 'Enabled'),
  };
  const filterOptions: CurrentPageFilterOption<DictTypeSummary>[] = [
    {
      key: 'enabled',
      options: [
        { label: statusLabels.enabled, value: 'true' },
        { label: statusLabels.disabled, value: 'false' },
      ],
      placeholder: formatMessage('pages.system.dicts.filters.status', 'Status'),
      predicate: (record, value) => record.enabled === (value === 'true'),
    },
  ];
  const exportColumns: CurrentPageExportColumn<DictTypeSummary>[] = [
    {
      title: formatMessage('pages.system.dicts.fields.id', 'ID'),
      dataIndex: 'id',
    },
    {
      title: formatMessage('pages.system.dicts.fields.code', 'Code'),
      dataIndex: 'code',
    },
    {
      title: formatMessage('pages.system.dicts.fields.name', 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage(
        'pages.system.dicts.fields.description',
        'Description',
      ),
      dataIndex: 'description',
    },
    {
      title: formatMessage('pages.system.dicts.fields.itemCount', 'Item Count'),
      renderText: (record) => record.items.length,
    },
    {
      title: formatMessage('pages.system.dicts.fields.enabled', 'Enabled'),
      renderText: (record) =>
        record.enabled ? statusLabels.enabled : statusLabels.disabled,
    },
  ];
  const createDetailFields = (record: DictTypeSummary): DetailField[] => [
    { label: formatMessage('pages.system.dicts.fields.id', 'ID'), value: record.id },
    {
      label: formatMessage('pages.system.dicts.fields.code', 'Code'),
      value: record.code,
    },
    {
      label: formatMessage('pages.system.dicts.fields.name', 'Name'),
      value: record.name,
    },
    {
      label: formatMessage(
        'pages.system.dicts.fields.description',
        'Description',
      ),
      value: record.description,
    },
    {
      label: formatMessage('pages.system.dicts.fields.status', 'Status'),
      value: record.enabled ? statusLabels.enabled : statusLabels.disabled,
    },
    {
      label: formatMessage('pages.system.dicts.fields.itemCount', 'Item Count'),
      value: record.items.length,
    },
  ];
  const createDetailJsonSections = (
    record: DictTypeSummary,
  ): DetailJsonSection[] => [
    {
      title: formatMessage('pages.system.dicts.fields.items', 'Items'),
      value: record.items,
    },
  ];
  const renderStatus = (enabled: boolean) => (
    <Tag color={enabled ? 'green' : 'red'}>
      {enabled ? statusLabels.enabled : statusLabels.disabled}
    </Tag>
  );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<DictTypeSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.system.dicts.search.placeholder',
        'Search dictionaries',
      ),
      selectFilters: filterOptions,
    });

  const loadDicts = async () => {
    setLoading(true);
    try {
      setRows(await listOpenCoreDicts());
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setSelectedDetail(undefined);
      setEditingDict(undefined);
      setItemsDict(undefined);
      setItemRows([]);
      setConsumerOptionCount(0);
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.dicts.load.failure',
              'Unable to load dictionaries.',
            ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDicts();
  }, []);

  const openCreateForm = () => {
    setEditingDict(undefined);
    form.setFieldsValue({
      code: '',
      description: '',
      enabled: true,
      items: [],
      name: '',
    });
    setFormOpen(true);
  };

  const openEditForm = async (record: DictTypeSummary) => {
    try {
      const fresh = await getOpenCoreDict(record.code);
      setEditingDict(fresh);
      form.setFieldsValue({
        code: fresh.code,
        description: fresh.description,
        enabled: fresh.enabled,
        items: fresh.items.map((item) => ({ ...item })),
        name: fresh.name,
      });
      setFormOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.dicts.open.failure',
              'Unable to open dictionary.',
            ),
      );
    }
  };

  const openDetail = async (record: DictTypeSummary) => {
    try {
      setSelectedDetail(await getOpenCoreDict(record.code));
    } catch (error: unknown) {
      setSelectedDetail(undefined);
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.dicts.detail.loadFailure',
              'Unable to load live dictionary detail.',
            ),
      );
    }
  };

  const loadDictItems = async (record: DictTypeSummary) => {
    setItemsLoading(true);
    setItemRows([]);
    setConsumerOptionCount(0);
    try {
      const [items, options] = await Promise.all([
        listOpenCoreDictItems(record.code),
        listOpenCoreDictDataOptions({ dictCode: record.code }),
      ]);
      setItemRows([...items]);
      setConsumerOptionCount(options.length);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.dicts.items.loadFailure',
              'Unable to load dictionary items.',
            ),
      );
    } finally {
      setItemsLoading(false);
    }
  };

  const openItems = async (record: DictTypeSummary) => {
    setItemsDict(record);
    setItemsOpen(true);
    await loadDictItems(record);
  };

  const openCreateItemForm = () => {
    setEditingItem(undefined);
    itemForm.setFieldsValue({
      enabled: true,
      id: '',
      label: '',
      sort: (itemRows.length + 1) * 10,
      value: '',
    });
    setItemFormOpen(true);
  };

  const openEditItemForm = (record: DictItemSummary) => {
    setEditingItem(record);
    itemForm.setFieldsValue({ ...record });
    setItemFormOpen(true);
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    const code = values.code.trim();
    const body = {
      description: values.description?.trim() || undefined,
      enabled: values.enabled ?? true,
      items: normalizeDictItems(code, values.items),
      name: values.name.trim(),
    };

    setSubmitting(true);
    try {
      if (editingDict) {
        await updateOpenCoreDict(editingDict.code, body);
        message.success(
          formatMessage(
            'pages.system.dicts.messages.updated',
            'Dictionary updated.',
          ),
        );
      } else {
        await createOpenCoreDict({
          ...body,
          code,
        });
        message.success(
          formatMessage(
            'pages.system.dicts.messages.created',
            'Dictionary created.',
          ),
        );
      }
      setFormOpen(false);
      setEditingDict(undefined);
      await loadDicts();
    } finally {
      setSubmitting(false);
    }
  };

  const removeDict = async (record: DictTypeSummary) => {
    await deleteOpenCoreDict(record.code);
    message.success(
      formatMessage(
        'pages.system.dicts.messages.deleted',
        'Dictionary deleted.',
      ),
    );
    await loadDicts();
  };

  const submitItemForm = async () => {
    if (!itemsDict) {
      return;
    }

    const values = await itemForm.validateFields();
    const body = normalizeDictItemFormValue(values);

    setItemSubmitting(true);
    try {
      if (editingItem) {
        await updateOpenCoreDictItem(itemsDict.code, editingItem.id, body);
        message.success(
          formatMessage(
            'pages.system.dicts.items.messages.updated',
            'Dictionary item updated.',
          ),
        );
      } else {
        await createOpenCoreDictItem(itemsDict.code, body);
        message.success(
          formatMessage(
            'pages.system.dicts.items.messages.created',
            'Dictionary item created.',
          ),
        );
      }
      setItemFormOpen(false);
      setEditingItem(undefined);
      await loadDictItems(itemsDict);
      await loadDicts();
    } finally {
      setItemSubmitting(false);
    }
  };

  const removeDictItem = async (record: DictItemSummary) => {
    if (!itemsDict) {
      return;
    }

    await deleteOpenCoreDictItem(itemsDict.code, record.id);
    message.success(
      formatMessage(
        'pages.system.dicts.items.messages.deleted',
        'Dictionary item deleted.',
      ),
    );
    await loadDictItems(itemsDict);
    await loadDicts();
  };

  const itemColumns: ProColumns<DictItemSummary>[] = [
    {
      title: formatMessage('pages.system.dicts.items.fields.label', 'Label'),
      dataIndex: 'label',
    },
    {
      title: formatMessage('pages.system.dicts.items.fields.value', 'Value'),
      dataIndex: 'value',
    },
    {
      title: formatMessage('pages.system.dicts.items.fields.sort', 'Sort'),
      dataIndex: 'sort',
      width: 88,
    },
    {
      title: formatMessage('pages.system.dicts.fields.status', 'Status'),
      dataIndex: 'enabled',
      width: 96,
      render: (_, record) => renderStatus(record.enabled),
    },
    {
      title: formatMessage('pages.system.dicts.actions.column', 'Actions'),
      valueType: 'option',
      width: 112,
      render: (_, record) => (
        <Space size="small">
          <Tooltip
            title={formatMessage(
              'pages.system.dicts.items.actions.edit',
              'Edit item',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.dicts.items.actions.editAria',
                'Edit item {value}',
                { value: record.value },
              )}
              icon={<EditOutlined />}
              onClick={() => openEditItemForm(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title={formatMessage(
              'pages.system.dicts.items.confirm.deleteOne',
              'Delete this dictionary item?',
            )}
            okText={formatMessage('pages.system.dicts.actions.delete', 'Delete')}
            okButtonProps={{ danger: true }}
            onConfirm={() => void removeDictItem(record)}
          >
            <Tooltip
              title={formatMessage(
                'pages.system.dicts.items.actions.delete',
                'Delete item',
              )}
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.dicts.items.actions.deleteAria',
                  'Delete item {value}',
                  { value: record.value },
                )}
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const columns: ProColumns<DictTypeSummary>[] = [
    {
      title: formatMessage('pages.system.dicts.fields.code', 'Code'),
      dataIndex: 'code',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.code}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.system.dicts.fields.name', 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage('pages.system.dicts.fields.items', 'Items'),
      dataIndex: 'items',
      render: (_, record) => (
        <Typography.Text>
          {formatMessage(
            'pages.system.dicts.items.count',
            '{count} items',
            { count: record.items.length },
          )}
        </Typography.Text>
      ),
    },
    {
      title: formatMessage('pages.system.dicts.fields.status', 'Status'),
      dataIndex: 'enabled',
      width: 96,
      render: (_, record) => renderStatus(record.enabled),
    },
    {
      title: formatMessage('pages.system.dicts.actions.column', 'Actions'),
      valueType: 'option',
      width: 196,
      render: (_, record) => (
        <Space size="small">
          <Tooltip
            title={formatMessage('pages.system.dicts.actions.detail', 'Detail')}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.dicts.actions.viewAria',
                'View {code}',
                { code: record.code },
              )}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={formatMessage('pages.system.dicts.actions.items', 'Items')}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.dicts.actions.itemsAria',
                'Manage items for {code}',
                { code: record.code },
              )}
              icon={<OrderedListOutlined />}
              onClick={() => void openItems(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={formatMessage('pages.system.dicts.actions.edit', 'Edit')}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.dicts.actions.editAria',
                'Edit {code}',
                { code: record.code },
              )}
              icon={<EditOutlined />}
              onClick={() => void openEditForm(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title={formatMessage(
              'pages.system.dicts.confirm.deleteOne',
              'Delete this dictionary?',
            )}
            okText={formatMessage('pages.system.dicts.actions.delete', 'Delete')}
            okButtonProps={{ danger: true }}
            onConfirm={() => void removeDict(record)}
          >
            <Tooltip
              title={formatMessage('pages.system.dicts.actions.delete', 'Delete')}
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.dicts.actions.deleteAria',
                  'Delete {code}',
                  { code: record.code },
                )}
                danger
                icon={<DeleteOutlined />}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title={formatMessage('menu.system.dicts', 'Dictionaries')}
      subTitle={formatMessage('pages.system.section', 'S7 System')}
    >
      {loadError ? (
        <Alert
          showIcon
          type="error"
          message={formatMessage(
            'pages.system.dicts.load.liveFailure',
            'Unable to load live dictionaries',
          )}
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <ProTable<DictTypeSummary>
        rowKey="code"
        loading={loading}
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateForm}
          >
            {formatMessage('pages.system.dicts.actions.new', 'New')}
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => void loadDicts()}
          >
            {formatMessage('pages.system.dicts.actions.refresh', 'Refresh')}
          </Button>,
          <CurrentPageExportButton<DictTypeSummary>
            key="export"
            columns={exportColumns}
            resource="core-dicts"
            rows={filteredRows}
          />,
        ]}
        pagination={{ pageSize: 10 }}
        dataSource={filteredRows}
        columns={columns}
      />
      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
        jsonSections={
          selectedDetail ? createDetailJsonSections(selectedDetail) : []
        }
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={
          selectedDetail?.name ??
          formatMessage('pages.system.dicts.detail.title', 'Dictionary Detail')
        }
      />
      <Modal
        title={
          itemsDict
            ? formatMessage(
                'pages.system.dicts.items.titleForCode',
                'Dictionary Items: {code}',
                { code: itemsDict.code },
              )
            : formatMessage(
                'pages.system.dicts.items.title',
                'Dictionary Items',
              )
        }
        open={itemsOpen}
        onCancel={() => {
          setItemsOpen(false);
          setItemsDict(undefined);
          setItemRows([]);
          setConsumerOptionCount(0);
        }}
        footer={null}
        width={920}
      >
        <Alert
          showIcon
          type="info"
          message={formatMessage(
            'pages.system.dicts.items.consumerVisible',
            '{count} enabled items are visible through the simple-list consumer endpoint.',
            { count: consumerOptionCount },
          )}
          style={{ marginBlockEnd: 16 }}
        />
        <ProTable<DictItemSummary>
          rowKey="id"
          loading={itemsLoading}
          search={false}
          options={false}
          toolBarRender={() => [
            <Button
              key="create-item"
              icon={<PlusOutlined />}
              type="primary"
              onClick={openCreateItemForm}
            >
              {formatMessage(
                'pages.system.dicts.items.actions.new',
                'New Item',
              )}
            </Button>,
            <Button
              key="refresh-items"
              icon={<ReloadOutlined />}
              onClick={() => {
                if (itemsDict) {
                  void loadDictItems(itemsDict);
                }
              }}
            >
              {formatMessage(
                'pages.system.dicts.items.actions.refresh',
                'Refresh Items',
              )}
            </Button>,
          ]}
          pagination={false}
          dataSource={itemRows}
          columns={itemColumns}
        />
      </Modal>
      <Modal
        title={
          editingItem
            ? formatMessage(
                'pages.system.dicts.items.form.editTitle',
                'Edit Dictionary Item',
              )
            : formatMessage(
                'pages.system.dicts.items.form.createTitle',
                'New Dictionary Item',
              )
        }
        open={itemFormOpen}
        onCancel={() => {
          setItemFormOpen(false);
          setEditingItem(undefined);
        }}
        onOk={() => void submitItemForm()}
        confirmLoading={itemSubmitting}
        okText={
          editingItem
            ? formatMessage('pages.system.dicts.actions.save', 'Save')
            : formatMessage('pages.system.dicts.actions.create', 'Create')
        }
      >
        <Form<DictItemFormValue> form={itemForm} layout="vertical">
          <Form.Item
            label={formatMessage(
              'pages.system.dicts.items.fields.label',
              'Label',
            )}
            name="label"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.dicts.items.validation.labelRequired',
                  'Label is required.',
                ),
              },
            ]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.dicts.items.fields.value',
              'Value',
            )}
            name="value"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.dicts.items.validation.valueRequired',
                  'Value is required.',
                ),
              },
            ]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.dicts.fields.id', 'ID')}
            name="id"
          >
            <Input disabled={Boolean(editingItem)} maxLength={120} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.dicts.items.fields.sort', 'Sort')}
            name="sort"
          >
            <InputNumber min={0} precision={0} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.dicts.fields.enabled', 'Enabled')}
            name="enabled"
            valuePropName="checked"
          >
            <Switch
              checkedChildren={statusLabels.enabled}
              unCheckedChildren={statusLabels.disabled}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={
          editingDict
            ? formatMessage(
                'pages.system.dicts.form.editTitle',
                'Edit Dictionary',
              )
            : formatMessage(
                'pages.system.dicts.form.createTitle',
                'New Dictionary',
              )
        }
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingDict(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={
          editingDict
            ? formatMessage('pages.system.dicts.actions.save', 'Save')
            : formatMessage('pages.system.dicts.actions.create', 'Create')
        }
        width={920}
      >
        <Form<DictFormValues> form={form} layout="vertical">
          <Form.Item
            label={formatMessage('pages.system.dicts.fields.code', 'Code')}
            name="code"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.dicts.validation.codeRequired',
                  'Code is required.',
                ),
              },
            ]}
          >
            <Input disabled={Boolean(editingDict)} maxLength={96} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.dicts.fields.name', 'Name')}
            name="name"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.dicts.validation.nameRequired',
                  'Name is required.',
                ),
              },
            ]}
          >
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.dicts.fields.description',
              'Description',
            )}
            name="description"
          >
            <Input.TextArea rows={2} maxLength={240} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.dicts.fields.enabled', 'Enabled')}
            name="enabled"
            valuePropName="checked"
          >
            <Switch
              checkedChildren={statusLabels.enabled}
              unCheckedChildren={statusLabels.disabled}
            />
          </Form.Item>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Typography.Text strong>
                    {formatMessage('pages.system.dicts.fields.items', 'Items')}
                  </Typography.Text>
                  <Button
                    icon={<PlusOutlined />}
                    onClick={() =>
                      add({
                        enabled: true,
                        sort: (fields.length + 1) * 10,
                      })
                    }
                    size="small"
                  >
                    {formatMessage(
                      'pages.system.dicts.items.actions.add',
                      'Add Item',
                    )}
                  </Button>
                </Space>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" wrap>
                    <Form.Item
                      {...field}
                      label={formatMessage(
                        'pages.system.dicts.items.fields.label',
                        'Label',
                      )}
                      name={[field.name, 'label']}
                      rules={[
                        {
                          required: true,
                          message: formatMessage(
                            'pages.system.dicts.items.validation.labelRequired',
                            'Label is required.',
                          ),
                        },
                      ]}
                    >
                      <Input
                        maxLength={80}
                        placeholder={formatMessage(
                          'pages.system.dicts.items.placeholders.label',
                          'Enabled',
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      label={formatMessage(
                        'pages.system.dicts.items.fields.value',
                        'Value',
                      )}
                      name={[field.name, 'value']}
                      rules={[
                        {
                          required: true,
                          message: formatMessage(
                            'pages.system.dicts.items.validation.valueRequired',
                            'Value is required.',
                          ),
                        },
                      ]}
                    >
                      <Input
                        maxLength={80}
                        placeholder={formatMessage(
                          'pages.system.dicts.items.placeholders.value',
                          'enabled',
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      label={formatMessage('pages.system.dicts.fields.id', 'ID')}
                      name={[field.name, 'id']}
                    >
                      <Input
                        maxLength={120}
                        placeholder={formatMessage(
                          'pages.system.dicts.items.placeholders.id',
                          'auto',
                        )}
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      label={formatMessage(
                        'pages.system.dicts.items.fields.sort',
                        'Sort',
                      )}
                      name={[field.name, 'sort']}
                    >
                      <InputNumber min={0} precision={0} />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      label={formatMessage(
                        'pages.system.dicts.fields.enabled',
                        'Enabled',
                      )}
                      name={[field.name, 'enabled']}
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                    <Tooltip
                      title={formatMessage(
                        'pages.system.dicts.items.actions.remove',
                        'Remove item',
                      )}
                    >
                      <Button
                        aria-label={formatMessage(
                          'pages.system.dicts.items.actions.removeAria',
                          'Remove dictionary item',
                        )}
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(field.name)}
                        size="small"
                      />
                    </Tooltip>
                  </Space>
                ))}
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>
    </PageContainer>
  );
}
