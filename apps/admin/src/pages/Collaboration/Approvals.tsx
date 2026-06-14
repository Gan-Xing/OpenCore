import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import type { ApprovalLiteSummary } from '@opencore/sdk';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  approveOpenCoreApprovalLiteRequest,
  createOpenCoreApprovalLiteRequest,
  getOpenCoreApprovalLiteRequest,
  listOpenCoreApprovalLiteRequests,
  rejectOpenCoreApprovalLiteRequest,
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
import { ReadOnlyDetailDrawer } from '../shared/ReadOnlyDetailDrawer';

type ApprovalFormValues = {
  approver: string;
  businessId?: string;
  businessType?: string;
  requester: string;
  title: string;
};

type DecisionFormValues = {
  actor: string;
  comment?: string;
};

type ApprovalDecision = 'approve' | 'reject';

const APPROVAL_CREATE_PERMISSION_MARKER = 'collaboration:approval-lite:create';
const APPROVAL_UPDATE_PERMISSION_MARKER = 'collaboration:approval-lite:update';
const DEFAULT_DECISION_ACTOR = 'admin';

const exportColumns: CurrentPageExportColumn<ApprovalLiteSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Title', dataIndex: 'title' },
  { title: 'Requester', dataIndex: 'requester' },
  { title: 'Approver', dataIndex: 'approver' },
  { title: 'Business Type', dataIndex: 'businessType' },
  { title: 'Business ID', dataIndex: 'businessId' },
  { title: 'Status', dataIndex: 'status' },
  {
    title: 'Timeline',
    renderText: (record) => `${record.timeline.length} events`,
  },
  { title: 'Decided At', dataIndex: 'decidedAt' },
  { title: 'Created At', dataIndex: 'createdAt' },
  { title: 'Comment', dataIndex: 'comment', sensitive: true },
];
const searchFields: CurrentPageSearchField<ApprovalLiteSummary>[] = [
  'title',
  'requester',
  'approver',
  'businessType',
  'businessId',
  'status',
];

function statusColor(status: ApprovalLiteSummary['status']): string {
  if (status === 'pending') return 'gold';
  if (status === 'approved') return 'green';
  return 'red';
}

function countByStatus(
  rows: readonly ApprovalLiteSummary[],
  status: ApprovalLiteSummary['status'],
): number {
  return rows.filter((row) => row.status === status).length;
}

export default function ApprovalsPage() {
  const [createForm] = Form.useForm<ApprovalFormValues>();
  const [decisionForm] = Form.useForm<DecisionFormValues>();
  const [rows, setRows] = useState<readonly ApprovalLiteSummary[]>([]);
  const [selected, setSelected] = useState<ApprovalLiteSummary>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [createOpen, setCreateOpen] = useState(false);
  const [decisionRecord, setDecisionRecord] = useState<ApprovalLiteSummary>();
  const [decision, setDecision] = useState<ApprovalDecision>();
  const [submitting, setSubmitting] = useState(false);
  const [actingApprovalId, setActingApprovalId] = useState<string>();

  const stats = useMemo(
    () => ({
      approved: countByStatus(rows, 'approved'),
      pending: countByStatus(rows, 'pending'),
      rejected: countByStatus(rows, 'rejected'),
      total: rows.length,
    }),
    [rows],
  );

  const filterOptions: CurrentPageFilterOption<ApprovalLiteSummary>[] = useMemo(
    () => [
      {
        key: 'status',
        options: createCurrentPageFilterOptions(rows, 'status'),
        placeholder: 'Status',
        predicate: (record, value) => record.status === value,
      },
      {
        key: 'requester',
        options: createCurrentPageFilterOptions(rows, 'requester'),
        placeholder: 'Requester',
        predicate: (record, value) => record.requester === value,
      },
      {
        key: 'approver',
        options: createCurrentPageFilterOptions(rows, 'approver'),
        placeholder: 'Approver',
        predicate: (record, value) => record.approver === value,
      },
    ],
    [rows],
  );

  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<ApprovalLiteSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search live approvals',
      selectFilters: filterOptions,
    });

  const loadApprovals = async () => {
    setLoading(true);
    try {
      setRows(await listOpenCoreApprovalLiteRequests());
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load approvals.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApprovals();
  }, []);

  const openDetail = async (id: string) => {
    try {
      setSelected(await getOpenCoreApprovalLiteRequest(id));
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to load approval.',
      );
    }
  };

  const openCreateForm = () => {
    createForm.setFieldsValue({
      approver: 'admin',
      businessId: '',
      businessType: '',
      requester: 'developer',
      title: '',
    });
    setCreateOpen(true);
  };

  const openDecisionForm = (
    record: ApprovalLiteSummary,
    nextDecision: ApprovalDecision,
  ) => {
    decisionForm.setFieldsValue({
      actor: DEFAULT_DECISION_ACTOR,
      comment: '',
    });
    setDecisionRecord(record);
    setDecision(nextDecision);
  };

  const closeDecisionForm = () => {
    setDecisionRecord(undefined);
    setDecision(undefined);
  };

  const submitCreate = async () => {
    const values = await createForm.validateFields();
    setSubmitting(true);
    try {
      const created = await createOpenCoreApprovalLiteRequest({
        approver: values.approver.trim(),
        businessId: values.businessId?.trim() || undefined,
        businessType: values.businessType?.trim() || undefined,
        requester: values.requester.trim(),
        title: values.title.trim(),
      });
      message.success('Approval created.');
      setCreateOpen(false);
      setSelected(created);
      await loadApprovals();
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to create approval.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitDecision = async () => {
    if (!decisionRecord || !decision) return;

    const values = await decisionForm.validateFields();
    setSubmitting(true);
    setActingApprovalId(decisionRecord.id);
    try {
      const body = {
        actor: values.actor.trim(),
        comment: values.comment?.trim() || undefined,
      };
      const next =
        decision === 'approve'
          ? await approveOpenCoreApprovalLiteRequest(decisionRecord.id, body)
          : await rejectOpenCoreApprovalLiteRequest(decisionRecord.id, body);
      message.success(
        decision === 'approve' ? 'Approval approved.' : 'Approval rejected.',
      );
      closeDecisionForm();
      setSelected(next);
      await loadApprovals();
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to decide approval.',
      );
    } finally {
      setSubmitting(false);
      setActingApprovalId(undefined);
    }
  };

  const columns: ProColumns<ApprovalLiteSummary>[] = [
    {
      title: 'Title',
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record.id)}>
          {record.title}
        </Typography.Link>
      ),
    },
    { title: 'Requester', dataIndex: 'requester' },
    { title: 'Approver', dataIndex: 'approver' },
    { title: 'Business', dataIndex: 'businessType' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (_, record) => (
        <Tag color={statusColor(record.status)}>{record.status}</Tag>
      ),
    },
    {
      title: 'Action Policy',
      render: (_, record) => (
        <Tag color={record.status === 'pending' ? 'green' : 'default'}>
          {record.status === 'pending' ? 'approve/reject' : 'terminal'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      valueType: 'option',
      render: (_, record) => [
        <Tooltip key="detail" title="Detail">
          <Button
            icon={<EyeOutlined />}
            onClick={() => void openDetail(record.id)}
            size="small"
            type="link"
          />
        </Tooltip>,
        record.status === 'pending' ? (
          <Button
            icon={<CheckCircleOutlined />}
            key="approve"
            loading={actingApprovalId === record.id}
            onClick={() => openDecisionForm(record, 'approve')}
            size="small"
            title={APPROVAL_UPDATE_PERMISSION_MARKER}
            type="link"
          >
            Approve request
          </Button>
        ) : null,
        record.status === 'pending' ? (
          <Popconfirm
            key="reject"
            onConfirm={() => openDecisionForm(record, 'reject')}
            title="Reject this approval?"
          >
            <Button
              danger
              icon={<CloseCircleOutlined />}
              loading={actingApprovalId === record.id}
              size="small"
              title={APPROVAL_UPDATE_PERMISSION_MARKER}
              type="link"
            >
              Reject request
            </Button>
          </Popconfirm>
        ) : null,
      ],
    },
  ];

  return (
    <PageContainer title="Approval Lite" subTitle="S10 Collaboration">
      {loadError ? (
        <Alert
          action={
            <Button onClick={() => void loadApprovals()}>
              Reload live approvals
            </Button>
          }
          description={loadError}
          message="Live collaboration approvals unavailable"
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="Live approvals" value={stats.total} />
        <Statistic title="Pending approvals" value={stats.pending} />
        <Statistic title="Approved approvals" value={stats.approved} />
        <Statistic title="Rejected approvals" value={stats.rejected} />
      </Space>
      <ProTable<ApprovalLiteSummary>
        columns={columns}
        dataSource={filteredRows}
        loading={loading}
        options={false}
        pagination={false}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          filterToolbar,
          <Button
            icon={<ReloadOutlined />}
            key="reload"
            onClick={() => void loadApprovals()}
          >
            Reload live approvals
          </Button>,
          <Button
            icon={<PlusOutlined />}
            key="create"
            onClick={openCreateForm}
            title={APPROVAL_CREATE_PERMISSION_MARKER}
            type="primary"
          >
            Create approval
          </Button>,
          <CurrentPageExportButton<ApprovalLiteSummary>
            columns={exportColumns}
            key="export"
            resource="collaboration-approvals"
            rows={filteredRows}
          />,
        ]}
      />
      <ReadOnlyDetailDrawer
        fields={[
          { label: 'ID', value: selected?.id },
          { label: 'Title', value: selected?.title },
          { label: 'Requester', value: selected?.requester },
          { label: 'Approver', value: selected?.approver },
          { label: 'Business Type', value: selected?.businessType },
          { label: 'Business ID', value: selected?.businessId },
          { label: 'Status', value: selected?.status },
          { label: 'Comment', value: selected?.comment },
          { label: 'Decided At', value: selected?.decidedAt },
          { label: 'Created At', value: selected?.createdAt },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        timeline={selected?.timeline}
        title={selected?.title ?? 'Approval Detail'}
      />
      <Modal
        confirmLoading={submitting}
        destroyOnClose
        onCancel={() => setCreateOpen(false)}
        onOk={() => void submitCreate()}
        open={createOpen}
        title="Create approval"
      >
        <Form<ApprovalFormValues> form={createForm} layout="vertical">
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={160} />
          </Form.Item>
          <Space align="start" style={{ width: '100%' }}>
            <Form.Item
              label="Requester"
              name="requester"
              rules={[{ required: true, whitespace: true }]}
            >
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item
              label="Approver"
              name="approver"
              rules={[{ required: true, whitespace: true }]}
            >
              <Input maxLength={80} />
            </Form.Item>
          </Space>
          <Space align="start" style={{ width: '100%' }}>
            <Form.Item label="Business Type" name="businessType">
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item label="Business ID" name="businessId">
              <Input maxLength={120} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
      <Modal
        confirmLoading={submitting}
        destroyOnClose
        onCancel={closeDecisionForm}
        onOk={() => void submitDecision()}
        open={Boolean(decisionRecord)}
        title={decision === 'approve' ? 'Approve request' : 'Reject request'}
      >
        <Form<DecisionFormValues> form={decisionForm} layout="vertical">
          <Form.Item
            label="Actor"
            name="actor"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item label="Comment" name="comment">
            <Input.TextArea maxLength={1000} rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
