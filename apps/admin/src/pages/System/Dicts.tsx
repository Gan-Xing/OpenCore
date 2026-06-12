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
import {
  createDictFixtures,
  type DictItemSummary,
  type DictTypeSummary,
} from '@opencore/sdk';
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

const fallbackRows = createDictFixtures().items;
const searchFields: CurrentPageSearchField<DictTypeSummary>[] = [
  'code',
  'name',
  'description',
  (record) => record.items.map((item) => `${item.label} ${item.value}`),
];
const filterOptions: CurrentPageFilterOption<DictTypeSummary>[] = [
  {
    key: 'enabled',
    options: [
      { label: 'enabled', value: 'true' },
      { label: 'disabled', value: 'false' },
    ],
    placeholder: 'Status',
    predicate: (record, value) => record.enabled === (value === 'true'),
  },
];
const exportColumns: CurrentPageExportColumn<DictTypeSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Code', dataIndex: 'code' },
  { title: 'Name', dataIndex: 'name' },
  { title: 'Description', dataIndex: 'description' },
  { title: 'Item Count', renderText: (record) => record.items.length },
  { title: 'Enabled', dataIndex: 'enabled' },
];

function createDetailFields(record: DictTypeSummary): DetailField[] {
  return [
    { label: 'ID', value: record.id },
    { label: 'Code', value: record.code },
    { label: 'Name', value: record.name },
    { label: 'Description', value: record.description },
    { label: 'Status', value: record.enabled ? 'enabled' : 'disabled' },
    { label: 'Item Count', value: record.items.length },
  ];
}

function createDetailJsonSections(
  record: DictTypeSummary,
): DetailJsonSection[] {
  return [{ title: 'Items', value: record.items }];
}

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

function renderStatus(enabled: boolean) {
  return (
    <Tag color={enabled ? 'green' : 'red'}>
      {enabled ? 'enabled' : 'disabled'}
    </Tag>
  );
}

export default function DictsPage() {
  const [form] = Form.useForm<DictFormValues>();
  const [itemForm] = Form.useForm<DictItemFormValue>();
  const [rows, setRows] = useState<readonly DictTypeSummary[]>(fallbackRows);
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
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<DictTypeSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search dictionaries',
      selectFilters: filterOptions,
    });

  const loadDicts = async () => {
    setLoading(true);
    try {
      setRows(await listOpenCoreDicts());
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows(fallbackRows);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load dictionaries.',
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
        error instanceof Error ? error.message : 'Unable to open dictionary.',
      );
    }
  };

  const openDetail = async (record: DictTypeSummary) => {
    try {
      setSelectedDetail(await getOpenCoreDict(record.code));
    } catch (_error) {
      setSelectedDetail(record);
    }
  };

  const loadDictItems = async (record: DictTypeSummary) => {
    setItemsLoading(true);
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
          : 'Unable to load dictionary items.',
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
        message.success('Dictionary updated.');
      } else {
        await createOpenCoreDict({
          ...body,
          code,
        });
        message.success('Dictionary created.');
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
    message.success('Dictionary deleted.');
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
        message.success('Dictionary item updated.');
      } else {
        await createOpenCoreDictItem(itemsDict.code, body);
        message.success('Dictionary item created.');
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
    message.success('Dictionary item deleted.');
    await loadDictItems(itemsDict);
    await loadDicts();
  };

  const itemColumns: ProColumns<DictItemSummary>[] = [
    { title: 'Label', dataIndex: 'label' },
    { title: 'Value', dataIndex: 'value' },
    { title: 'Sort', dataIndex: 'sort', width: 88 },
    {
      title: 'Status',
      dataIndex: 'enabled',
      width: 96,
      render: (_, record) => renderStatus(record.enabled),
    },
    {
      title: 'Actions',
      valueType: 'option',
      width: 112,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit item">
            <Button
              aria-label={`Edit item ${record.value}`}
              icon={<EditOutlined />}
              onClick={() => openEditItemForm(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Delete this dictionary item?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => void removeDictItem(record)}
          >
            <Tooltip title="Delete item">
              <Button
                aria-label={`Delete item ${record.value}`}
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
      title: 'Code',
      dataIndex: 'code',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.code}
        </Typography.Link>
      ),
    },
    { title: 'Name', dataIndex: 'name' },
    {
      title: 'Items',
      dataIndex: 'items',
      render: (_, record) => (
        <Typography.Text>{record.items.length} items</Typography.Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'enabled',
      width: 96,
      render: (_, record) => renderStatus(record.enabled),
    },
    {
      title: 'Actions',
      valueType: 'option',
      width: 196,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Detail">
            <Button
              aria-label={`View ${record.code}`}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Items">
            <Button
              aria-label={`Manage items for ${record.code}`}
              icon={<OrderedListOutlined />}
              onClick={() => void openItems(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              aria-label={`Edit ${record.code}`}
              icon={<EditOutlined />}
              onClick={() => void openEditForm(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Delete this dictionary?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => void removeDict(record)}
          >
            <Tooltip title="Delete">
              <Button
                aria-label={`Delete ${record.code}`}
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
    <PageContainer title="Dictionaries" subTitle="S7 System">
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message="Live data unavailable; showing SDK fixtures."
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
            New
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => void loadDicts()}
          >
            Refresh
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
        title={selectedDetail?.name ?? 'Dictionary Detail'}
      />
      <Modal
        title={`Dictionary Items${itemsDict ? `: ${itemsDict.code}` : ''}`}
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
          message={`${consumerOptionCount} enabled items are visible through the simple-list consumer endpoint.`}
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
              New Item
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
              Refresh Items
            </Button>,
          ]}
          pagination={false}
          dataSource={itemRows}
          columns={itemColumns}
        />
      </Modal>
      <Modal
        title={editingItem ? 'Edit Dictionary Item' : 'New Dictionary Item'}
        open={itemFormOpen}
        onCancel={() => {
          setItemFormOpen(false);
          setEditingItem(undefined);
        }}
        onOk={() => void submitItemForm()}
        confirmLoading={itemSubmitting}
        okText={editingItem ? 'Save' : 'Create'}
      >
        <Form<DictItemFormValue> form={itemForm} layout="vertical">
          <Form.Item
            label="Label"
            name="label"
            rules={[{ required: true, message: 'Label is required.' }]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item
            label="Value"
            name="value"
            rules={[{ required: true, message: 'Value is required.' }]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item label="ID" name="id">
            <Input disabled={Boolean(editingItem)} maxLength={120} />
          </Form.Item>
          <Form.Item label="Sort" name="sort">
            <InputNumber min={0} precision={0} />
          </Form.Item>
          <Form.Item label="Enabled" name="enabled" valuePropName="checked">
            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={editingDict ? 'Edit Dictionary' : 'New Dictionary'}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingDict(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={editingDict ? 'Save' : 'Create'}
        width={920}
      >
        <Form<DictFormValues> form={form} layout="vertical">
          <Form.Item
            label="Code"
            name="code"
            rules={[{ required: true, message: 'Code is required.' }]}
          >
            <Input disabled={Boolean(editingDict)} maxLength={96} />
          </Form.Item>
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Name is required.' }]}
          >
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={2} maxLength={240} />
          </Form.Item>
          <Form.Item label="Enabled" name="enabled" valuePropName="checked">
            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
          </Form.Item>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Typography.Text strong>Items</Typography.Text>
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
                    Add Item
                  </Button>
                </Space>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" wrap>
                    <Form.Item
                      {...field}
                      label="Label"
                      name={[field.name, 'label']}
                      rules={[
                        { required: true, message: 'Label is required.' },
                      ]}
                    >
                      <Input maxLength={80} placeholder="Enabled" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      label="Value"
                      name={[field.name, 'value']}
                      rules={[
                        { required: true, message: 'Value is required.' },
                      ]}
                    >
                      <Input maxLength={80} placeholder="enabled" />
                    </Form.Item>
                    <Form.Item {...field} label="ID" name={[field.name, 'id']}>
                      <Input maxLength={120} placeholder="auto" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      label="Sort"
                      name={[field.name, 'sort']}
                    >
                      <InputNumber min={0} precision={0} />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      label="Enabled"
                      name={[field.name, 'enabled']}
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                    <Tooltip title="Remove item">
                      <Button
                        aria-label="Remove dictionary item"
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
