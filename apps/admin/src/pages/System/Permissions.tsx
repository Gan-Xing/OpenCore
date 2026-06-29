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
import { useIntl } from '@umijs/max';
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

export default function PermissionsPage() {
  const intl = useIntl();
  const [form] = Form.useForm<PermissionFormValues>();
  const [rows, setRows] = useState<readonly PermissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<PermissionSummary>();
  const [editingPermission, setEditingPermission] =
    useState<PermissionSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formatMessage = (
    id: string,
    defaultMessage: string,
    values?: Record<string, number | string>,
  ) =>
    values
      ? intl.formatMessage({ id, defaultMessage }, values)
      : intl.formatMessage({ id, defaultMessage });
  const riskLabels = {
    dangerous: formatMessage(
      'pages.system.permissions.risk.dangerous',
      'Dangerous',
    ),
    normal: formatMessage('pages.system.permissions.risk.normal', 'Normal'),
  };
  const systemLabels = {
    custom: formatMessage('pages.system.permissions.system.custom', 'Custom'),
    system: formatMessage('pages.system.permissions.system.system', 'System'),
  };
  const exportColumns: CurrentPageExportColumn<PermissionSummary>[] = [
    {
      title: formatMessage('pages.system.permissions.fields.code', 'Code'),
      dataIndex: 'code',
    },
    {
      title: formatMessage('pages.system.permissions.fields.title', 'Title'),
      dataIndex: 'title',
    },
    {
      title: formatMessage('pages.system.permissions.fields.stage', 'Stage'),
      dataIndex: 'stage',
    },
    {
      title: formatMessage('pages.system.permissions.fields.risk', 'Risk'),
      renderText: (record) =>
        record.dangerous ? riskLabels.dangerous : riskLabels.normal,
    },
    {
      title: formatMessage('pages.system.permissions.fields.system', 'System'),
      renderText: (record) =>
        record.system ? systemLabels.system : systemLabels.custom,
    },
  ];
  const createDetailFields = (record: PermissionSummary): DetailField[] => [
    {
      label: formatMessage('pages.system.permissions.fields.code', 'Code'),
      value: record.code,
    },
    {
      label: formatMessage('pages.system.permissions.fields.title', 'Title'),
      value: record.title,
    },
    {
      label: formatMessage('pages.system.permissions.fields.stage', 'Stage'),
      value: record.stage,
    },
    {
      label: formatMessage('pages.system.permissions.fields.risk', 'Risk'),
      value: record.dangerous ? riskLabels.dangerous : riskLabels.normal,
    },
    {
      label: formatMessage('pages.system.permissions.fields.system', 'System'),
      value: record.system ? systemLabels.system : systemLabels.custom,
    },
  ];
  const filterOptions = useMemo<CurrentPageFilterOption<PermissionSummary>[]>(
    () => [
      {
        key: 'stage',
        options: createCurrentPageFilterOptions(rows, 'stage'),
        placeholder: formatMessage(
          'pages.system.permissions.filters.stage',
          'Stage',
        ),
        predicate: (record, value) => record.stage === value,
      },
      {
        key: 'dangerous',
        options: [
          { label: riskLabels.dangerous, value: 'true' },
          { label: riskLabels.normal, value: 'false' },
        ],
        placeholder: formatMessage(
          'pages.system.permissions.filters.risk',
          'Risk',
        ),
        predicate: (record, value) => record.dangerous === (value === 'true'),
      },
      {
        key: 'system',
        options: [
          { label: systemLabels.system, value: 'true' },
          { label: systemLabels.custom, value: 'false' },
        ],
        placeholder: formatMessage(
          'pages.system.permissions.filters.system',
          'System',
        ),
        predicate: (record, value) => record.system === (value === 'true'),
      },
    ],
    [
      rows,
      riskLabels.dangerous,
      riskLabels.normal,
      systemLabels.custom,
      systemLabels.system,
    ],
  );
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<PermissionSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.system.permissions.search.placeholder',
        'Search permissions',
      ),
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
          : formatMessage(
              'pages.system.permissions.load.failure',
              'Unable to load live permissions.',
            ),
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
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.permissions.open.failure',
              'Unable to open permission.',
            ),
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
          : formatMessage(
              'pages.system.permissions.detail.loadFailure',
              'Unable to load live permission detail.',
            ),
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
        message.success(
          formatMessage(
            'pages.system.permissions.messages.updated',
            'Permission updated.',
          ),
        );
      } else {
        await createOpenCorePermission({
          code: values.code,
          title: values.title,
        });
        message.success(
          formatMessage(
            'pages.system.permissions.messages.created',
            'Permission created.',
          ),
        );
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
    message.success(
      formatMessage(
        'pages.system.permissions.messages.deleted',
        'Permission deleted.',
      ),
    );
    await loadPermissions();
  };

  const columns: ProColumns<PermissionSummary>[] = [
    {
      title: formatMessage('pages.system.permissions.fields.title', 'Title'),
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.title}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.system.permissions.fields.code', 'Code'),
      dataIndex: 'code',
      ellipsis: true,
    },
    {
      title: formatMessage('pages.system.permissions.fields.stage', 'Stage'),
      dataIndex: 'stage',
      width: 88,
      render: (_, record) => <Tag>{record.stage}</Tag>,
    },
    {
      title: formatMessage('pages.system.permissions.fields.risk', 'Risk'),
      dataIndex: 'dangerous',
      width: 112,
      render: (_, record) => (
        <Tag color={record.dangerous ? 'red' : 'green'}>
          {record.dangerous ? riskLabels.dangerous : riskLabels.normal}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.system.permissions.fields.system', 'System'),
      dataIndex: 'system',
      width: 96,
      render: (_, record) => (
        <Tag color={record.system ? 'blue' : 'default'}>
          {record.system ? systemLabels.system : systemLabels.custom}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.system.permissions.actions.column',
        'Actions',
      ),
      valueType: 'option',
      width: 184,
      render: (_, record) => (
        <Space size="small">
          <Tooltip
            title={formatMessage(
              'pages.system.permissions.actions.detail',
              'Detail',
            )}
          >
            <Button
              aria-label={formatMessage(
                'pages.system.permissions.actions.viewAria',
                'View {code}',
                { code: record.code },
              )}
              icon={<EyeOutlined />}
              onClick={() => void openDetail(record)}
              size="small"
            />
          </Tooltip>
          <Tooltip
            title={
              record.system
                ? formatMessage(
                    'pages.system.permissions.actions.systemEditLocked',
                    'System permissions cannot be edited',
                  )
                : formatMessage('pages.system.permissions.actions.edit', 'Edit')
            }
          >
            <Button
              aria-label={formatMessage(
                'pages.system.permissions.actions.editAria',
                'Edit {code}',
                { code: record.code },
              )}
              disabled={record.system}
              icon={<EditOutlined />}
              onClick={() => void openEditForm(record)}
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title={formatMessage(
              'pages.system.permissions.confirm.deleteOne',
              'Delete this permission?',
            )}
            okText={formatMessage(
              'pages.system.permissions.actions.delete',
              'Delete',
            )}
            okButtonProps={{ danger: true }}
            onConfirm={() => void deletePermission(record)}
          >
            <Tooltip
              title={
                record.system
                  ? formatMessage(
                      'pages.system.permissions.actions.systemDeleteLocked',
                      'System permissions cannot be deleted',
                    )
                  : formatMessage(
                      'pages.system.permissions.actions.delete',
                      'Delete',
                    )
              }
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.permissions.actions.deleteAria',
                  'Delete {code}',
                  { code: record.code },
                )}
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
    <PageContainer
      title={formatMessage('menu.system.permissions', 'Permissions')}
      subTitle={formatMessage('pages.system.rbac.section', 'Access Control')}
    >
      {loadError ? (
        <Alert
          showIcon
          type="error"
          message={formatMessage(
            'pages.system.permissions.load.liveFailure',
            'Unable to load live permissions',
          )}
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
            {formatMessage('pages.system.permissions.actions.new', 'New')}
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => void loadPermissions()}
          >
            {formatMessage(
              'pages.system.permissions.actions.refresh',
              'Refresh',
            )}
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
        title={
          selectedDetail?.code ??
          formatMessage(
            'pages.system.permissions.detail.title',
            'Permission Detail',
          )
        }
      />
      <Modal
        title={
          editingPermission
            ? formatMessage(
                'pages.system.permissions.form.editTitle',
                'Edit Permission',
              )
            : formatMessage(
                'pages.system.permissions.form.createTitle',
                'New Permission',
              )
        }
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingPermission(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={
          editingPermission
            ? formatMessage('pages.system.permissions.actions.save', 'Save')
            : formatMessage('pages.system.permissions.actions.create', 'Create')
        }
      >
        <Form<PermissionFormValues> form={form} layout="vertical">
          <Form.Item
            label={formatMessage(
              'pages.system.permissions.fields.code',
              'Code',
            )}
            name="code"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.permissions.validation.codeRequired',
                  'Code is required.',
                ),
              },
              {
                pattern: permissionCodePattern,
                message: formatMessage(
                  'pages.system.permissions.validation.codePattern',
                  'Use <layer>:<resource>:<action> with a supported action.',
                ),
              },
            ]}
          >
            <Input disabled={Boolean(editingPermission)} maxLength={120} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.permissions.fields.title',
              'Title',
            )}
            name="title"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.permissions.validation.titleRequired',
                  'Title is required.',
                ),
              },
            ]}
          >
            <Input maxLength={160} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
