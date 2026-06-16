import {
  ArrowDownOutlined,
  ArrowUpOutlined,
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
import type { SystemDeptSummary, SystemDeptTreeSummary } from '@opencore/sdk';
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
  TreeSelect,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  createOpenCoreSystemDept,
  deleteOpenCoreSystemDept,
  getOpenCoreSystemDept,
  listOpenCoreSystemDepts,
  updateOpenCoreSystemDept,
  updateOpenCoreSystemDeptOrder,
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
} from '../shared/ReadOnlyDetailDrawer';

type DeptFormValues = {
  code: string;
  email?: string;
  enabled?: boolean;
  leader?: string;
  name: string;
  order?: number;
  parentId?: string;
  phone?: string;
};

type TreeSelectNode = {
  children?: TreeSelectNode[];
  title: string;
  value: string;
};

type MutableDeptTreeSummary = SystemDeptSummary & {
  children: MutableDeptTreeSummary[];
};

const searchFields: CurrentPageSearchField<SystemDeptSummary>[] = [
  'code',
  'name',
  'leader',
  'phone',
  'email',
];

function flattenDeptTree(
  rows: readonly SystemDeptTreeSummary[],
): SystemDeptSummary[] {
  return rows.flatMap((row) => [
    withoutChildren(row),
    ...flattenDeptTree(row.children),
  ]);
}

function buildDeptTree(
  rows: readonly SystemDeptSummary[],
): SystemDeptTreeSummary[] {
  const nodes = new Map<string, MutableDeptTreeSummary>();
  const roots: MutableDeptTreeSummary[] = [];

  for (const row of [...rows].sort(compareDeptRows)) {
    nodes.set(row.id, { ...row, children: [] });
  }

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children.push(node);
      continue;
    }
    roots.push(node);
  }

  return roots;
}

function compareDeptRows(
  left: SystemDeptSummary,
  right: SystemDeptSummary,
): number {
  return left.order - right.order || left.name.localeCompare(right.name);
}

function withoutChildren(row: SystemDeptTreeSummary): SystemDeptSummary {
  const { children: _children, ...summary } = row;
  return summary;
}

function createParentNameMap(rows: readonly SystemDeptSummary[]) {
  return new Map(rows.map((row) => [row.id, row.name]));
}

function collectDescendantIds(row: SystemDeptTreeSummary): Set<string> {
  const ids = new Set<string>([row.id]);
  for (const child of row.children) {
    for (const id of collectDescendantIds(child)) {
      ids.add(id);
    }
  }
  return ids;
}

function findTreeRow(
  rows: readonly SystemDeptTreeSummary[],
  id: string,
): SystemDeptTreeSummary | undefined {
  for (const row of rows) {
    if (row.id === id) {
      return row;
    }

    const child = findTreeRow(row.children, id);
    if (child) {
      return child;
    }
  }

  return undefined;
}

function findSiblingRows(
  rows: readonly SystemDeptTreeSummary[],
  record: SystemDeptSummary,
): SystemDeptTreeSummary[] {
  if (!record.parentId) {
    return [...rows].sort(compareDeptRows);
  }

  return [...(findTreeRow(rows, record.parentId)?.children ?? [])].sort(
    compareDeptRows,
  );
}

function createReorderedSiblingItems(
  siblings: readonly SystemDeptTreeSummary[],
  recordId: string,
  direction: 'down' | 'up',
) {
  const reordered = [...siblings];
  const currentIndex = reordered.findIndex((row) => row.id === recordId);
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= reordered.length) {
    return undefined;
  }

  [reordered[currentIndex], reordered[targetIndex]] = [
    reordered[targetIndex],
    reordered[currentIndex],
  ];

  return reordered.map((row, index) => ({
    id: row.id,
    order: (index + 1) * 10,
  }));
}

function toTreeSelectData(
  rows: readonly SystemDeptTreeSummary[],
  excludedIds = new Set<string>(),
): TreeSelectNode[] {
  return rows
    .filter((row) => !excludedIds.has(row.id))
    .map((row) => ({
      title: row.name,
      value: row.id,
      children: toTreeSelectData(row.children, excludedIds),
    }));
}

export default function DepartmentsPage() {
  const intl = useIntl();
  const [form] = Form.useForm<DeptFormValues>();
  const [rows, setRows] =
    useState<readonly SystemDeptTreeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<SystemDeptSummary>();
  const [editingDept, setEditingDept] = useState<SystemDeptSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [orderingDeptId, setOrderingDeptId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const flatRows = useMemo(() => flattenDeptTree(rows), [rows]);
  const parentNames = useMemo(() => createParentNameMap(flatRows), [flatRows]);
  const formatMessage = (
    id: string,
    defaultMessage: string,
    values?: Record<string, number | string>,
  ) =>
    values
      ? intl.formatMessage({ id, defaultMessage }, values)
      : intl.formatMessage({ id, defaultMessage });
  const statusLabels = {
    disabled: formatMessage(
      'pages.system.departments.status.disabled',
      'Disabled',
    ),
    enabled: formatMessage(
      'pages.system.departments.status.enabled',
      'Enabled',
    ),
  };
  const rootLabel = formatMessage(
    'pages.system.departments.parent.root',
    'Root',
  );
  const filterOptions: CurrentPageFilterOption<SystemDeptSummary>[] = [
    {
      key: 'enabled',
      options: [
        { label: statusLabels.enabled, value: 'true' },
        { label: statusLabels.disabled, value: 'false' },
      ],
      placeholder: formatMessage(
        'pages.system.departments.filters.status',
        'Status',
      ),
      predicate: (record, value) => record.enabled === (value === 'true'),
    },
  ];
  const exportColumns: CurrentPageExportColumn<SystemDeptSummary>[] = [
    {
      title: formatMessage('pages.system.departments.fields.id', 'ID'),
      dataIndex: 'id',
    },
    {
      title: formatMessage('pages.system.departments.fields.code', 'Code'),
      dataIndex: 'code',
    },
    {
      title: formatMessage('pages.system.departments.fields.name', 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage(
        'pages.system.departments.fields.parentId',
        'Parent ID',
      ),
      dataIndex: 'parentId',
    },
    {
      title: formatMessage('pages.system.departments.fields.order', 'Order'),
      dataIndex: 'order',
    },
    {
      title: formatMessage('pages.system.departments.fields.leader', 'Leader'),
      dataIndex: 'leader',
    },
    {
      title: formatMessage('pages.system.departments.fields.phone', 'Phone'),
      dataIndex: 'phone',
    },
    {
      title: formatMessage('pages.system.departments.fields.email', 'Email'),
      dataIndex: 'email',
    },
    {
      title: formatMessage('pages.system.departments.fields.enabled', 'Enabled'),
      renderText: (record) =>
        record.enabled ? statusLabels.enabled : statusLabels.disabled,
    },
    {
      title: formatMessage(
        'pages.system.departments.fields.createdAt',
        'Created At',
      ),
      dataIndex: 'createdAt',
    },
    {
      title: formatMessage(
        'pages.system.departments.fields.updatedAt',
        'Updated At',
      ),
      dataIndex: 'updatedAt',
    },
  ];
  const createDetailFields = (record: SystemDeptSummary): DetailField[] => [
    { label: formatMessage('pages.system.departments.fields.id', 'ID'), value: record.id },
    {
      label: formatMessage('pages.system.departments.fields.code', 'Code'),
      value: record.code,
    },
    {
      label: formatMessage('pages.system.departments.fields.name', 'Name'),
      value: record.name,
    },
    {
      label: formatMessage('pages.system.departments.fields.parent', 'Parent'),
      value: record.parentId
        ? (parentNames.get(record.parentId) ?? record.parentId)
        : rootLabel,
    },
    {
      label: formatMessage('pages.system.departments.fields.order', 'Order'),
      value: record.order,
    },
    {
      label: formatMessage('pages.system.departments.fields.leader', 'Leader'),
      value: record.leader,
    },
    {
      label: formatMessage('pages.system.departments.fields.phone', 'Phone'),
      value: record.phone,
    },
    {
      label: formatMessage('pages.system.departments.fields.email', 'Email'),
      value: record.email,
    },
    {
      label: formatMessage('pages.system.departments.fields.enabled', 'Enabled'),
      value: record.enabled ? statusLabels.enabled : statusLabels.disabled,
    },
    {
      label: formatMessage(
        'pages.system.departments.fields.createdAt',
        'Created At',
      ),
      value: record.createdAt,
    },
    {
      label: formatMessage(
        'pages.system.departments.fields.updatedAt',
        'Updated At',
      ),
      value: record.updatedAt,
    },
  ];
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<SystemDeptSummary>({
      rows: flatRows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.system.departments.search.placeholder',
        'Search departments',
      ),
      selectFilters: filterOptions,
    });
  const filteredTreeRows = useMemo(
    () => buildDeptTree(filteredRows),
    [filteredRows],
  );

  const loadDepts = async () => {
    setLoading(true);
    try {
      setRows(await listOpenCoreSystemDepts());
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setSelectedDetail(undefined);
      setEditingDept(undefined);
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.departments.load.failure',
              'Unable to load departments.',
            ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDepts();
  }, []);

  const openCreateForm = (parentId?: string) => {
    setEditingDept(undefined);
    form.setFieldsValue({
      code: '',
      email: '',
      enabled: true,
      leader: '',
      name: '',
      order: 0,
      parentId,
      phone: '',
    });
    setFormOpen(true);
  };

  const openEditForm = async (record: SystemDeptSummary) => {
    try {
      const fresh = await getOpenCoreSystemDept(record.id);
      setEditingDept(fresh);
      form.setFieldsValue({
        code: fresh.code,
        email: fresh.email,
        enabled: fresh.enabled,
        leader: fresh.leader,
        name: fresh.name,
        order: fresh.order,
        parentId: fresh.parentId,
        phone: fresh.phone,
      });
      setFormOpen(true);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.departments.open.failure',
              'Unable to open department.',
            ),
      );
    }
  };

  const openDetail = async (record: SystemDeptSummary) => {
    try {
      setSelectedDetail(await getOpenCoreSystemDept(record.id));
    } catch (error: unknown) {
      setSelectedDetail(undefined);
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.departments.detail.loadFailure',
              'Unable to load live department detail.',
            ),
      );
    }
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editingDept) {
        await updateOpenCoreSystemDept(editingDept.id, {
          email: values.email,
          enabled: values.enabled,
          leader: values.leader,
          name: values.name,
          order: values.order,
          parentId: values.parentId ?? null,
          phone: values.phone,
        });
        message.success(
          formatMessage(
            'pages.system.departments.messages.updated',
            'Department updated.',
          ),
        );
      } else {
        await createOpenCoreSystemDept({
          code: values.code,
          email: values.email,
          enabled: values.enabled,
          leader: values.leader,
          name: values.name,
          order: values.order,
          parentId: values.parentId,
          phone: values.phone,
        });
        message.success(
          formatMessage(
            'pages.system.departments.messages.created',
            'Department created.',
          ),
        );
      }
      setFormOpen(false);
      setEditingDept(undefined);
      await loadDepts();
    } finally {
      setSubmitting(false);
    }
  };

  const deleteDept = async (record: SystemDeptTreeSummary) => {
    try {
      await deleteOpenCoreSystemDept(record.id);
      message.success(
        formatMessage(
          'pages.system.departments.messages.deleted',
          'Department deleted.',
        ),
      );
      await loadDepts();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.departments.messages.deleteFailure',
              'Unable to delete department. Departments with assigned users cannot be deleted.',
            ),
      );
    }
  };

  const moveDept = async (
    record: SystemDeptTreeSummary,
    direction: 'down' | 'up',
  ) => {
    const siblings = findSiblingRows(rows, record);
    const items = createReorderedSiblingItems(siblings, record.id, direction);

    if (!items) {
      return;
    }

    setOrderingDeptId(record.id);
    try {
      await updateOpenCoreSystemDeptOrder({ items });
      message.success(
        formatMessage(
          'pages.system.departments.messages.orderSaved',
          'Department order saved.',
        ),
      );
      await loadDepts();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.system.departments.messages.orderSaveFailure',
              'Unable to save department order.',
            ),
      );
    } finally {
      setOrderingDeptId(undefined);
    }
  };

  const excludedParentIds = useMemo(() => {
    if (!editingDept) {
      return new Set<string>();
    }
    const editingTreeRow = rows
      .flatMap((row) => [row, ...findTreeDescendants(row)])
      .find((row) => row.id === editingDept.id);
    return editingTreeRow
      ? collectDescendantIds(editingTreeRow)
      : new Set<string>();
  }, [editingDept, rows]);
  const parentTreeData = useMemo(
    () => toTreeSelectData(rows, excludedParentIds),
    [excludedParentIds, rows],
  );
  const columns: ProColumns<SystemDeptTreeSummary>[] = [
    {
      title: formatMessage('pages.system.departments.fields.name', 'Name'),
      dataIndex: 'name',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.name}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.system.departments.fields.code', 'Code'),
      dataIndex: 'code',
    },
    {
      title: formatMessage('pages.system.departments.fields.parent', 'Parent'),
      dataIndex: 'parentId',
      render: (_, record) =>
        record.parentId ? (parentNames.get(record.parentId) ?? '-') : rootLabel,
    },
    {
      title: formatMessage('pages.system.departments.fields.order', 'Order'),
      dataIndex: 'order',
      width: 88,
    },
    {
      title: formatMessage('pages.system.departments.fields.leader', 'Leader'),
      dataIndex: 'leader',
    },
    {
      title: formatMessage('pages.system.departments.filters.status', 'Status'),
      dataIndex: 'enabled',
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? statusLabels.enabled : statusLabels.disabled}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.system.departments.actions.column',
        'Actions',
      ),
      valueType: 'option',
      width: 300,
      render: (_, record) => {
        const hasChildren = record.children.length > 0;
        const siblings = findSiblingRows(rows, record);
        const siblingIndex = siblings.findIndex((row) => row.id === record.id);
        const canMoveUp = siblingIndex > 0;
        const canMoveDown =
          siblingIndex >= 0 && siblingIndex < siblings.length - 1;

        return (
          <Space size="small">
            <Tooltip
              title={formatMessage(
                'pages.system.departments.actions.detail',
                'Detail',
              )}
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.departments.actions.viewAria',
                  'View {name}',
                  { name: record.name },
                )}
                icon={<EyeOutlined />}
                onClick={() => void openDetail(record)}
                size="small"
              />
            </Tooltip>
            <Tooltip
              title={formatMessage(
                'pages.system.departments.actions.edit',
                'Edit',
              )}
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.departments.actions.editAria',
                  'Edit {name}',
                  { name: record.name },
                )}
                icon={<EditOutlined />}
                onClick={() => void openEditForm(record)}
                size="small"
              />
            </Tooltip>
            <Tooltip
              title={formatMessage(
                'pages.system.departments.actions.createChild',
                'Create child',
              )}
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.departments.actions.createChildAria',
                  'Create child department under {name}',
                  { name: record.name },
                )}
                icon={<PlusOutlined />}
                onClick={() => openCreateForm(record.id)}
                size="small"
              />
            </Tooltip>
            <Tooltip
              title={formatMessage(
                'pages.system.departments.actions.moveUp',
                'Move up',
              )}
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.departments.actions.moveUpAria',
                  'Move {name} up',
                  { name: record.name },
                )}
                disabled={!canMoveUp}
                icon={<ArrowUpOutlined />}
                loading={orderingDeptId === record.id}
                onClick={() => void moveDept(record, 'up')}
                size="small"
              />
            </Tooltip>
            <Tooltip
              title={formatMessage(
                'pages.system.departments.actions.moveDown',
                'Move down',
              )}
            >
              <Button
                aria-label={formatMessage(
                  'pages.system.departments.actions.moveDownAria',
                  'Move {name} down',
                  { name: record.name },
                )}
                disabled={!canMoveDown}
                icon={<ArrowDownOutlined />}
                loading={orderingDeptId === record.id}
                onClick={() => void moveDept(record, 'down')}
                size="small"
              />
            </Tooltip>
            <Popconfirm
              title={formatMessage(
                'pages.system.departments.confirm.deleteOne',
                'Delete this department?',
              )}
              okText={formatMessage(
                'pages.system.departments.actions.delete',
                'Delete',
              )}
              okButtonProps={{ danger: true }}
              onConfirm={() => void deleteDept(record)}
              disabled={hasChildren}
            >
              <Tooltip
                title={
                  hasChildren
                    ? formatMessage(
                        'pages.system.departments.actions.deleteChildrenLocked',
                        'Departments with children cannot be deleted',
                      )
                    : formatMessage(
                        'pages.system.departments.actions.delete',
                        'Delete',
                      )
                }
              >
                <Button
                  aria-label={formatMessage(
                    'pages.system.departments.actions.deleteAria',
                    'Delete {name}',
                    { name: record.name },
                  )}
                  danger
                  disabled={hasChildren}
                  icon={<DeleteOutlined />}
                  size="small"
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer
      title={formatMessage('menu.system.departments', 'Departments')}
      subTitle={formatMessage('pages.system.section', 'S7 System')}
    >
      {loadError ? (
        <Alert
          showIcon
          type="error"
          message={formatMessage(
            'pages.system.departments.load.liveFailure',
            'Unable to load live departments',
          )}
          description={loadError}
          style={{ marginBlockEnd: 16 }}
        />
      ) : null}
      <ProTable<SystemDeptTreeSummary>
        rowKey="id"
        loading={loading}
        search={false}
        options={false}
        toolBarRender={() => [
          filterToolbar,
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openCreateForm()}
          >
            {formatMessage('pages.system.departments.actions.new', 'New')}
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => void loadDepts()}
          >
            {formatMessage(
              'pages.system.departments.actions.refresh',
              'Refresh',
            )}
          </Button>,
          <CurrentPageExportButton<SystemDeptSummary>
            key="export"
            columns={exportColumns}
            resource="core-depts"
            rows={filteredRows}
          />,
        ]}
        pagination={false}
        dataSource={filteredTreeRows}
        columns={columns}
      />
      <ReadOnlyDetailDrawer
        fields={selectedDetail ? createDetailFields(selectedDetail) : []}
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={
          selectedDetail?.name ??
          formatMessage(
            'pages.system.departments.detail.title',
            'Department Detail',
          )
        }
      />
      <Modal
        title={
          editingDept
            ? formatMessage(
                'pages.system.departments.form.editTitle',
                'Edit Department',
              )
            : formatMessage(
                'pages.system.departments.form.createTitle',
                'New Department',
              )
        }
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingDept(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={
          editingDept
            ? formatMessage('pages.system.departments.actions.save', 'Save')
            : formatMessage(
                'pages.system.departments.actions.create',
                'Create',
              )
        }
      >
        <Form<DeptFormValues> form={form} layout="vertical">
          <Form.Item
            label={formatMessage('pages.system.departments.fields.code', 'Code')}
            name="code"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.departments.validation.codeRequired',
                  'Code is required.',
                ),
              },
            ]}
          >
            <Input disabled={Boolean(editingDept)} maxLength={64} />
          </Form.Item>
          <Form.Item
            label={formatMessage('pages.system.departments.fields.name', 'Name')}
            name="name"
            rules={[
              {
                required: true,
                message: formatMessage(
                  'pages.system.departments.validation.nameRequired',
                  'Name is required.',
                ),
              },
            ]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.departments.fields.parent',
              'Parent',
            )}
            name="parentId"
          >
            <TreeSelect
              allowClear
              showSearch
              treeDefaultExpandAll
              placeholder={formatMessage(
                'pages.system.departments.parent.placeholder',
                'Root department',
              )}
              treeData={parentTreeData}
            />
          </Form.Item>
          <Space align="start" size="middle" wrap>
            <Form.Item
              label={formatMessage(
                'pages.system.departments.fields.order',
                'Order',
              )}
              name="order"
            >
              <InputNumber min={0} precision={0} />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.system.departments.fields.enabled',
                'Enabled',
              )}
              name="enabled"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item
            label={formatMessage(
              'pages.system.departments.fields.leader',
              'Leader',
            )}
            name="leader"
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.departments.fields.phone',
              'Phone',
            )}
            name="phone"
          >
            <Input maxLength={40} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.system.departments.fields.email',
              'Email',
            )}
            name="email"
          >
            <Input maxLength={120} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}

function findTreeDescendants(
  row: SystemDeptTreeSummary,
): SystemDeptTreeSummary[] {
  return row.children.flatMap((child) => [
    child,
    ...findTreeDescendants(child),
  ]);
}
