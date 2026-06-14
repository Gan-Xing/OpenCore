import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import type { PermissionSummary } from '@opencore/sdk';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  createOpenCorePermission,
  deleteOpenCorePermission,
  getOpenCorePermission,
  listOpenCorePermissions,
  updateOpenCorePermission,
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

type PermissionFormValues = {
  code: string;
  title: string;
};

const permissionCodePattern =
  /^(core|monitor|tool|collaboration|optional|integration|experimental):[a-z][a-z0-9-]*:(create|read|update|delete|export|manage)$/;
const searchFields: CurrentPageSearchField<PermissionSummary>[] = [
  'code',
  'title',
  'stage',
  (record) => (record.dangerous ? 'dangerous' : 'normal'),
  (record) => (record.system ? 'system' : 'custom'),
];
const exportColumns: CurrentPageExportColumn<PermissionSummary>[] = [
  { title: 'Code', dataIndex: 'code' },
  { title: 'Title', dataIndex: 'title' },
  { title: 'Stage', dataIndex: 'stage' },
  { title: 'Dangerous', dataIndex: 'dangerous' },
  { title: 'System', dataIndex: 'system' },
];

function createDetailFields(record: PermissionSummary): DetailField[] {
  return [
    { label: 'Code', value: record.code },
    { label: 'Title', value: record.title },
    { label: 'Stage', value: record.stage },
    { label: 'Risk', value: record.dangerous ? 'dangerous' : 'normal' },
    { label: 'System', value: record.system ? 'system' : 'custom' },
  ];
}

export default function PermissionsPage() {
  const [form] = Form.useForm<PermissionFormValues>();
  const [rows, setRows] = useState<readonly PermissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<PermissionSummary>();
  const [editingPermission, setEditingPermission] =
    useState<PermissionSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const filterOptions = useMemo<CurrentPageFilterOption<PermissionSummary>[]>(
    () => [
      {
        key: 'stage',
        options: createCurrentPageFilterOptions(rows, 'stage'),
        placeholder: 'Stage',
        predicate: (record, value) => record.stage === value,
      },
      {
        key: 'dangerous',
        options: [
          { label: 'dangerous', value: 'true' },
          { label: 'normal', value: 'false' },
        ],
        placeholder: 'Risk',
        predicate: (record, value) => record.dangerous === (value === 'true'),
      },
      {
        key: 'system',
        options: [
          { label: 'system', value: 'true' },
          { label: 'custom', value: 'false' },
        ],
        placeholder: 'System',
        predicate: (record, value) => record.system === (value === 'true'),
      },
    ],
    [rows],
  );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<PermissionSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search permissions',
      selectFilters: filterOptions,
    });

  const loadPermissions = async () => {
    setLoading(true);
    try {
      setRows(await listOpenCorePermissions());
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setSelectedDetail(undefined);
      setEditingPermission(undefined);
      setFormOpen(false);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load live permissions.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPermissions();
  }, []);

  const openCreateForm = () => {
    setEditingPermission(undefined);
    form.setFieldsValue({
      code: '',
      title: '',
    });
    setFormOpen(true);
  };

  const openEditForm = async (record: PermissionSummary) => {
    try {
      const fresh = await getOpenCorePermission(record.code);
      setEditingPermission(fresh);
      form.setFieldsValue({
        code: fresh.code,
        title: fresh.title,
      });
      setFormOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to open permission.',
      );
    }
  };

  const openDetail = async (record: PermissionSummary) => {
    try {
      setSelectedDetail(await getOpenCorePermission(record.code));
    } catch (error: unknown) {
      setSelectedDetail(undefined);
      message.error(
        error instanceof Error
          ? error.message
          : 'Unable to load live permission detail.',
      );
    }
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editingPermission) {
        await updateOpenCorePermission(editingPermission.code, {
          title: values.title,
        });
        message.success('Permission updated.');
      } else {
        await createOpenCorePermission({
          code: values.code,
          title: values.title,
        });
        message.success('Permission created.');
      }
      setFormOpen(false);
      setEditingPermission(undefined);
      await loadPermissions();
    } finally {
      setSubmitting(false);
    }
  };

  const deletePermission = async (record: PermissionSummary) => {
    await deleteOpenCorePermission(record.code);
    message.success('Permission deleted.');
    await loadPermissions();
  };

  const columns: ProColumns<PermissionSummary>[] = [
    {
      title: 'Title',
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.title}
        </Typography.Link>
      ),
    },
    { title: 'Code', dataIndex: 'code', ellipsis: true },
    {
      title: 'Stage',
      dataIndex: 'stage',
      width: 88,
      render: (_, record) => <Tag>{record.stage}</Tag>,
    },
    {
      title: 'Risk',
      dataIndex: 'dangerous',
      width: 112,
      render: (_, record) => (
        <Tag color={record.dangerous ? 'red' : 'green'}>
          {record.dangerous ? 'dangerous' : 'normal'}
        </Tag>
      ),
    },
    {
      title: 'System',
      dataIndex: 'system',
      width: 96,
      render: (_, record) => (
        <Tag color={record.system ? 'blue' : 'default'}>
          {record.system ? 'system' : 'custom'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      valueType: 'option',
      width: 184,
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
          <Tooltip
            title={
              record.system ? 'System permissions cannot be edited' : 'Edit'
            }
          >
            <Button
              aria-label={`Edit ${record.code}`}
              disabled={record.system}
              icon={<EditOutlined />}
              onClick={() => void openEditForm(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="Delete this permission?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => void deletePermission(record)}
          >
            <Tooltip
              title={
                record.system
                  ? 'System permissions cannot be deleted'
                  : 'Delete'
              }
            >
              <Button
                aria-label={`Delete ${record.code}`}
                danger
                disabled={record.system}
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
    <PageContainer title="Permissions" subTitle="S6 RBAC">
      {loadError ? (
        <Alert
          showIcon
          type="error"
          message="Unable to load live permissions"
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <ProTable<PermissionSummary>
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
            onClick={() => void loadPermissions()}
          >
            Refresh
          </Button>,
          <CurrentPageExportButton<PermissionSummary>
            key="export"
            columns={exportColumns}
            resource="core-permissions"
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
        title={selectedDetail?.code ?? 'Permission Detail'}
      />
      <Modal
        title={editingPermission ? 'Edit Permission' : 'New Permission'}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingPermission(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={editingPermission ? 'Save' : 'Create'}
      >
        <Form<PermissionFormValues> form={form} layout="vertical">
          <Form.Item
            label="Code"
            name="code"
            rules={[
              { required: true, message: 'Code is required.' },
              {
                pattern: permissionCodePattern,
                message:
                  'Use <layer>:<resource>:<action> with a supported action.',
              },
            ]}
          >
            <Input disabled={Boolean(editingPermission)} maxLength={120} />
          </Form.Item>
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: 'Title is required.' }]}
          >
            <Input maxLength={160} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
