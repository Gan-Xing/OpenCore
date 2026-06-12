import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  createSystemConfigFixtures,
  type SystemConfigSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  createOpenCoreSystemConfig,
  deleteOpenCoreSystemConfig,
  getOpenCoreSystemConfig,
  getOpenCoreSystemConfigValue,
  listOpenCoreSystemConfig,
  refreshOpenCoreSystemConfigCache,
  updateOpenCoreSystemConfig,
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
import {
  ReadOnlyDetailDrawer,
  type DetailField,
} from '../shared/ReadOnlyDetailDrawer';

type ConfigValueType = SystemConfigSummary['valueType'];
type ConfigVisibility = SystemConfigSummary['visibility'];

type ConfigFormValues = {
  description?: string;
  key: string;
  value?: string;
  valueType: ConfigValueType;
  visibility: ConfigVisibility;
};

const fallbackRows = createSystemConfigFixtures().items;
const searchFields: CurrentPageSearchField<SystemConfigSummary>[] = [
  'key',
  'valueType',
  'description',
  'visibility',
];
const exportColumns: CurrentPageExportColumn<SystemConfigSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Key', dataIndex: 'key' },
  {
    title: 'Value',
    renderText: formatConfigValue,
  },
  { title: 'Type', dataIndex: 'valueType' },
  { title: 'Visibility', dataIndex: 'visibility' },
  { title: 'Public', dataIndex: 'public' },
  { title: 'Description', dataIndex: 'description' },
];
const valueTypeOptions: { label: string; value: ConfigValueType }[] = [
  { label: 'string', value: 'string' },
  { label: 'number', value: 'number' },
  { label: 'boolean', value: 'boolean' },
];
const visibilityOptions: { label: string; value: ConfigVisibility }[] = [
  { label: 'private', value: 'private' },
  { label: 'public', value: 'public' },
  { label: 'secret', value: 'secret' },
];

function formatConfigValue(record: SystemConfigSummary): string {
  return record.visibility === 'secret' ? '[redacted]' : record.value;
}

function createFilterOptions(
  rows: readonly SystemConfigSummary[],
): CurrentPageFilterOption<SystemConfigSummary>[] {
  return [
    {
      key: 'valueType',
      options: createCurrentPageFilterOptions(rows, 'valueType'),
      placeholder: 'Type',
      predicate: (record, value) => record.valueType === value,
    },
    {
      key: 'visibility',
      options: createCurrentPageFilterOptions(rows, 'visibility'),
      placeholder: 'Visibility',
      predicate: (record, value) => record.visibility === value,
    },
    {
      key: 'public',
      options: [
        { label: 'public', value: 'true' },
        { label: 'private', value: 'false' },
      ],
      placeholder: 'Public',
      predicate: (record, value) => record.public === (value === 'true'),
    },
  ];
}

function createDetailFields(record: SystemConfigSummary): DetailField[] {
  return [
    { label: 'ID', value: record.id },
    { label: 'Key', value: record.key },
    {
      label: 'Value',
      sensitive: record.visibility === 'secret',
      value: formatConfigValue(record),
    },
    { label: 'Type', value: record.valueType },
    { label: 'Visibility', value: record.visibility },
    { label: 'Public', value: record.public ? 'public' : 'private' },
    { label: 'Description', value: record.description },
  ];
}

function renderVisibility(record: SystemConfigSummary) {
  const color = record.visibility === 'secret' ? 'red' : 'default';
  return <Tag color={color}>{record.visibility}</Tag>;
}

function renderValue(record: SystemConfigSummary) {
  const value = formatConfigValue(record);
  return (
    <Typography.Text
      type={record.visibility === 'secret' ? 'secondary' : undefined}
    >
      {value}
    </Typography.Text>
  );
}

export default function ConfigPage() {
  const [form] = Form.useForm<ConfigFormValues>();
  const [rows, setRows] =
    useState<readonly SystemConfigSummary[]>(fallbackRows);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<SystemConfigSummary>();
  const [editingConfig, setEditingConfig] = useState<SystemConfigSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cacheRefreshing, setCacheRefreshing] = useState(false);
  const [valueReadingKey, setValueReadingKey] = useState<string>();
  const watchedVisibility = Form.useWatch('visibility', form);
  const filterOptions = useMemo(() => createFilterOptions(rows), [rows]);
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<SystemConfigSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search config',
      selectFilters: filterOptions,
    });
  const valueRequired =
    editingConfig?.visibility !== 'secret' || watchedVisibility !== 'secret';

  const loadConfig = async () => {
    setLoading(true);
    try {
      setRows(await listOpenCoreSystemConfig());
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows(fallbackRows);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load system config.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const openCreateForm = () => {
    setEditingConfig(undefined);
    form.setFieldsValue({
      description: '',
      key: '',
      value: '',
      valueType: 'string',
      visibility: 'private',
    });
    setFormOpen(true);
  };

  const openEditForm = async (record: SystemConfigSummary) => {
    try {
      const fresh = await getOpenCoreSystemConfig(record.key);
      setEditingConfig(fresh);
      form.setFieldsValue({
        description: fresh.description,
        key: fresh.key,
        value: fresh.visibility === 'secret' ? '' : fresh.value,
        valueType: fresh.valueType,
        visibility: fresh.visibility,
      });
      setFormOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : 'Unable to open system config.',
      );
    }
  };

  const openDetail = async (record: SystemConfigSummary) => {
    try {
      setSelectedDetail(await getOpenCoreSystemConfig(record.key));
    } catch (_error) {
      setSelectedDetail(record);
    }
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    const key = values.key.trim();
    const visibility = values.visibility ?? 'private';
    const valueType = values.valueType ?? 'string';
    const value = values.value?.trim() ?? '';
    const commonBody = {
      description: values.description?.trim() || undefined,
      public: visibility === 'public',
      valueType,
      visibility,
    };
    const preserveRedactedSecret =
      Boolean(editingConfig) &&
      editingConfig?.visibility === 'secret' &&
      visibility === 'secret' &&
      value === '';

    setSubmitting(true);
    try {
      if (editingConfig) {
        await updateOpenCoreSystemConfig(editingConfig.key, {
          ...commonBody,
          ...(preserveRedactedSecret ? {} : { value }),
        });
        message.success('System config updated.');
      } else {
        await createOpenCoreSystemConfig({
          ...commonBody,
          key,
          value,
        });
        message.success('System config created.');
      }
      setFormOpen(false);
      setEditingConfig(undefined);
      await loadConfig();
    } finally {
      setSubmitting(false);
    }
  };

  const deleteConfig = async (record: SystemConfigSummary) => {
    await deleteOpenCoreSystemConfig(record.key);
    message.success('System config deleted.');
    await loadConfig();
  };

  const refreshConfigCache = async () => {
    setCacheRefreshing(true);
    try {
      const result = await refreshOpenCoreSystemConfigCache();
      message.success(`Config cache refreshed: ${result.cachedKeys} keys.`);
    } finally {
      setCacheRefreshing(false);
    }
  };

  const readPublicValueByKey = async (record: SystemConfigSummary) => {
    setValueReadingKey(record.key);
    try {
      const result = await getOpenCoreSystemConfigValue(record.key);
      message.info(`${result.key} = ${result.value}`);
    } finally {
      setValueReadingKey(undefined);
    }
  };

  const columns: ProColumns<SystemConfigSummary>[] = [
    {
      title: 'Key',
      dataIndex: 'key',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.key}
        </Typography.Link>
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      ellipsis: true,
      render: (_, record) => renderValue(record),
    },
    {
      title: 'Type',
      dataIndex: 'valueType',
      width: 112,
      render: (_, record) => <Tag>{record.valueType}</Tag>,
    },
    {
      title: 'Visibility',
      dataIndex: 'visibility',
      width: 124,
      render: (_, record) => renderVisibility(record),
    },
    {
      title: 'Public',
      dataIndex: 'public',
      width: 96,
      render: (_, record) => (record.public ? 'public' : 'private'),
    },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    {
      title: 'Actions',
      valueType: 'option',
      width: 232,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Detail">
            <Button
              aria-label={`View ${record.key}`}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              record.visibility === 'public'
                ? 'Read public value by key'
                : 'Only public config values can be read by key'
            }
          >
            <Button
              aria-label={`Read public value ${record.key}`}
              disabled={record.visibility !== 'public'}
              icon={<KeyOutlined />}
              loading={valueReadingKey === record.key}
              onClick={() => void readPublicValueByKey(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              aria-label={`Edit ${record.key}`}
              icon={<EditOutlined />}
              onClick={() => void openEditForm(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Delete this system config?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => void deleteConfig(record)}
          >
            <Tooltip title="Delete">
              <Button
                aria-label={`Delete ${record.key}`}
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
    <PageContainer title="System Config" subTitle="S7 System">
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message="Using fallback config snapshot"
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <ProTable<SystemConfigSummary>
        rowKey="key"
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
            key="cache"
            icon={<SyncOutlined spin={cacheRefreshing} />}
            loading={cacheRefreshing}
            onClick={() => void refreshConfigCache()}
          >
            Refresh cache
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => void loadConfig()}
          >
            Reload data
          </Button>,
          <CurrentPageExportButton<SystemConfigSummary>
            key="export"
            columns={exportColumns}
            resource="core-config"
            rows={filteredRows}
          />,
        ]}
        pagination={{ pageSize: 10 }}
        dataSource={filteredRows}
        columns={columns}
      />
      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={selectedDetail?.key ?? 'System Config Detail'}
      />
      <Modal
        title={editingConfig ? 'Edit System Config' : 'New System Config'}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingConfig(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={editingConfig ? 'Save' : 'Create'}
      >
        <Form<ConfigFormValues> form={form} layout="vertical">
          <Form.Item
            label="Key"
            name="key"
            rules={[{ required: true, message: 'Key is required.' }]}
          >
            <Input disabled={Boolean(editingConfig)} maxLength={120} />
          </Form.Item>
          <Form.Item
            label="Value"
            name="value"
            rules={[{ required: valueRequired, message: 'Value is required.' }]}
          >
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
          <Space align="start" size="middle" wrap>
            <Form.Item
              label="Type"
              name="valueType"
              rules={[{ required: true, message: 'Type is required.' }]}
            >
              <Select options={valueTypeOptions} style={{ width: 150 }} />
            </Form.Item>
            <Form.Item
              label="Visibility"
              name="visibility"
              rules={[{ required: true, message: 'Visibility is required.' }]}
            >
              <Select options={visibilityOptions} style={{ width: 150 }} />
            </Form.Item>
          </Space>
          <Form.Item label="Description" name="description">
            <Input.TextArea maxLength={240} rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
