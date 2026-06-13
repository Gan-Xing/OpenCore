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
import {
  createSystemDeptFixtures,
  type SystemDeptSummary,
  type SystemDeptTreeSummary,
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

const fallbackRows = createSystemDeptFixtures();
const searchFields: CurrentPageSearchField<SystemDeptSummary>[] = [
  'code',
  'name',
  'leader',
  'phone',
  'email',
];
const filterOptions: CurrentPageFilterOption<SystemDeptSummary>[] = [
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
const exportColumns: CurrentPageExportColumn<SystemDeptSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Code', dataIndex: 'code' },
  { title: 'Name', dataIndex: 'name' },
  { title: 'Parent ID', dataIndex: 'parentId' },
  { title: 'Order', dataIndex: 'order' },
  { title: 'Leader', dataIndex: 'leader' },
  { title: 'Phone', dataIndex: 'phone' },
  { title: 'Email', dataIndex: 'email' },
  { title: 'Enabled', dataIndex: 'enabled' },
  { title: 'Created At', dataIndex: 'createdAt' },
  { title: 'Updated At', dataIndex: 'updatedAt' },
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

function createDetailFields(
  record: SystemDeptSummary,
  parentNames: ReadonlyMap<string, string>,
): DetailField[] {
  return [
    { label: 'ID', value: record.id },
    { label: 'Code', value: record.code },
    { label: 'Name', value: record.name },
    {
      label: 'Parent',
      value: record.parentId
        ? (parentNames.get(record.parentId) ?? record.parentId)
        : 'Root',
    },
    { label: 'Order', value: record.order },
    { label: 'Leader', value: record.leader },
    { label: 'Phone', value: record.phone },
    { label: 'Email', value: record.email },
    { label: 'Enabled', value: record.enabled ? 'enabled' : 'disabled' },
    { label: 'Created At', value: record.createdAt },
    { label: 'Updated At', value: record.updatedAt },
  ];
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
  const [form] = Form.useForm<DeptFormValues>();
  const [rows, setRows] =
    useState<readonly SystemDeptTreeSummary[]>(fallbackRows);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selectedDetail, setSelectedDetail] = useState<SystemDeptSummary>();
  const [editingDept, setEditingDept] = useState<SystemDeptSummary>();
  const [formOpen, setFormOpen] = useState(false);
  const [orderingDeptId, setOrderingDeptId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const flatRows = useMemo(() => flattenDeptTree(rows), [rows]);
  const parentNames = useMemo(() => createParentNameMap(flatRows), [flatRows]);
  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<SystemDeptSummary>({
      rows: flatRows,
      searchFields,
      searchPlaceholder: 'Search departments',
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
      setRows(fallbackRows);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load departments.',
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
        error instanceof Error ? error.message : 'Unable to open department.',
      );
    }
  };

  const openDetail = async (record: SystemDeptSummary) => {
    try {
      setSelectedDetail(await getOpenCoreSystemDept(record.id));
    } catch (_error) {
      setSelectedDetail(record);
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
        message.success('Department updated.');
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
        message.success('Department created.');
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
      message.success('Department deleted.');
      await loadDepts();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : 'Unable to delete department. Departments with assigned users cannot be deleted.',
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
      message.success('Department order saved.');
      await loadDepts();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : 'Unable to save department order.',
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
      title: 'Name',
      dataIndex: 'name',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record)}>
          {record.name}
        </Typography.Link>
      ),
    },
    { title: 'Code', dataIndex: 'code' },
    {
      title: 'Parent',
      dataIndex: 'parentId',
      render: (_, record) =>
        record.parentId ? (parentNames.get(record.parentId) ?? '-') : 'Root',
    },
    { title: 'Order', dataIndex: 'order', width: 88 },
    { title: 'Leader', dataIndex: 'leader' },
    {
      title: 'Status',
      dataIndex: 'enabled',
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? 'enabled' : 'disabled'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
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
            <Tooltip title="Detail">
              <Button
                aria-label={`View ${record.name}`}
                icon={<EyeOutlined />}
                onClick={() => void openDetail(record)}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Edit">
              <Button
                aria-label={`Edit ${record.name}`}
                icon={<EditOutlined />}
                onClick={() => void openEditForm(record)}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Create child">
              <Button
                aria-label={`Create child department under ${record.name}`}
                icon={<PlusOutlined />}
                onClick={() => openCreateForm(record.id)}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Move up">
              <Button
                aria-label={`Move ${record.name} up`}
                disabled={!canMoveUp}
                icon={<ArrowUpOutlined />}
                loading={orderingDeptId === record.id}
                onClick={() => void moveDept(record, 'up')}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Move down">
              <Button
                aria-label={`Move ${record.name} down`}
                disabled={!canMoveDown}
                icon={<ArrowDownOutlined />}
                loading={orderingDeptId === record.id}
                onClick={() => void moveDept(record, 'down')}
                size="small"
              />
            </Tooltip>
            <Popconfirm
              title="Delete this department?"
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => void deleteDept(record)}
              disabled={hasChildren}
            >
              <Tooltip
                title={
                  hasChildren
                    ? 'Departments with children cannot be deleted'
                    : 'Delete'
                }
              >
                <Button
                  aria-label={`Delete ${record.name}`}
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
    <PageContainer title="Departments" subTitle="S7 System">
      {loadError ? (
        <Alert
          showIcon
          type="warning"
          message="Using fallback department snapshot"
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
            New
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            onClick={() => void loadDepts()}
          >
            Refresh
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
        fields={
          selectedDetail ? createDetailFields(selectedDetail, parentNames) : []
        }
        onClose={() => setSelectedDetail(undefined)}
        open={Boolean(selectedDetail)}
        title={selectedDetail?.name ?? 'Department Detail'}
      />
      <Modal
        title={editingDept ? 'Edit Department' : 'New Department'}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditingDept(undefined);
        }}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        okText={editingDept ? 'Save' : 'Create'}
      >
        <Form<DeptFormValues> form={form} layout="vertical">
          <Form.Item
            label="Code"
            name="code"
            rules={[{ required: true, message: 'Code is required.' }]}
          >
            <Input disabled={Boolean(editingDept)} maxLength={64} />
          </Form.Item>
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: 'Name is required.' }]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item label="Parent" name="parentId">
            <TreeSelect
              allowClear
              showSearch
              treeDefaultExpandAll
              placeholder="Root department"
              treeData={parentTreeData}
            />
          </Form.Item>
          <Space align="start" size="middle" wrap>
            <Form.Item label="Order" name="order">
              <InputNumber min={0} precision={0} />
            </Form.Item>
            <Form.Item label="Enabled" name="enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item label="Leader" name="leader">
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item label="Phone" name="phone">
            <Input maxLength={40} />
          </Form.Item>
          <Form.Item label="Email" name="email">
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
