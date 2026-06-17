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
import { useIntl } from '@umijs/max';
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
import { useCallback, useEffect, useMemo, useState } from 'react';
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

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const APPROVAL_CREATE_PERMISSION_MARKER = 'collaboration:approval-lite:create';
const APPROVAL_UPDATE_PERMISSION_MARKER = 'collaboration:approval-lite:update';
const DEFAULT_DECISION_ACTOR = 'admin';

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

function createExportColumns(
  formatMessage: FormatMessage,
): CurrentPageExportColumn<ApprovalLiteSummary>[] {
  return [
    {
      title: formatMessage('pages.collaboration.common.fields.id', 'ID'),
      dataIndex: 'id',
    },
    {
      title: formatMessage(
        'pages.collaboration.approvals.fields.title',
        'Title',
      ),
      dataIndex: 'title',
    },
    {
      title: formatMessage(
        'pages.collaboration.approvals.fields.requester',
        'Requester',
      ),
      dataIndex: 'requester',
    },
    {
      title: formatMessage(
        'pages.collaboration.approvals.fields.approver',
        'Approver',
      ),
      dataIndex: 'approver',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.businessType',
        'Business Type',
      ),
      dataIndex: 'businessType',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.businessId',
        'Business ID',
      ),
      dataIndex: 'businessId',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.status',
        'Status',
      ),
      dataIndex: 'status',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.timeline',
        'Timeline',
      ),
      renderText: (record) =>
        formatMessage(
          'pages.collaboration.common.timeline.events',
          '{count} events',
          {
            count: record.timeline.length,
          },
        ),
    },
    {
      title: formatMessage(
        'pages.collaboration.approvals.fields.decidedAt',
        'Decided At',
      ),
      dataIndex: 'decidedAt',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.createdAt',
        'Created At',
      ),
      dataIndex: 'createdAt',
    },
    {
      title: formatMessage(
        'pages.collaboration.approvals.fields.comment',
        'Comment',
      ),
      dataIndex: 'comment',
      sensitive: true,
    },
  ];
}

export default function ApprovalsPage() {
  const intl = useIntl();
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
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const statusLabels = useMemo(
    () => ({
      approved: formatMessage(
        'pages.collaboration.approvals.status.approved',
        'approved',
      ),
      pending: formatMessage(
        'pages.collaboration.approvals.status.pending',
        'pending',
      ),
      rejected: formatMessage(
        'pages.collaboration.approvals.status.rejected',
        'rejected',
      ),
    }),
    [formatMessage],
  );
  const actionPolicyLabels = useMemo(
    () => ({
      active: formatMessage(
        'pages.collaboration.approvals.policy.approveReject',
        'approve/reject',
      ),
      terminal: formatMessage(
        'pages.collaboration.common.policy.terminal',
        'terminal',
      ),
    }),
    [formatMessage],
  );
  const exportColumns = useMemo(
    () => createExportColumns(formatMessage),
    [formatMessage],
  );
  const requiredRule = useMemo(
    () => ({
      message: formatMessage(
        'pages.collaboration.common.validation.required',
        'This field is required.',
      ),
      required: true,
      whitespace: true,
    }),
    [formatMessage],
  );

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
        placeholder: formatMessage(
          'pages.collaboration.common.fields.status',
          'Status',
        ),
        predicate: (record, value) => record.status === value,
      },
      {
        key: 'requester',
        options: createCurrentPageFilterOptions(rows, 'requester'),
        placeholder: formatMessage(
          'pages.collaboration.approvals.fields.requester',
          'Requester',
        ),
        predicate: (record, value) => record.requester === value,
      },
      {
        key: 'approver',
        options: createCurrentPageFilterOptions(rows, 'approver'),
        placeholder: formatMessage(
          'pages.collaboration.approvals.fields.approver',
          'Approver',
        ),
        predicate: (record, value) => record.approver === value,
      },
    ],
    [formatMessage, rows],
  );

  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<ApprovalLiteSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.collaboration.approvals.search.placeholder',
        'Search live approvals',
      ),
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
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.approvals.load.failure',
              'Unable to load approvals.',
            ),
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
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.approvals.detail.loadFailure',
              'Unable to load approval.',
            ),
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
      message.success(
        formatMessage(
          'pages.collaboration.approvals.messages.created',
          'Approval created.',
        ),
      );
      setCreateOpen(false);
      setSelected(created);
      await loadApprovals();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.approvals.messages.createFailure',
              'Unable to create approval.',
            ),
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
        decision === 'approve'
          ? formatMessage(
              'pages.collaboration.approvals.messages.approved',
              'Approval approved.',
            )
          : formatMessage(
              'pages.collaboration.approvals.messages.rejected',
              'Approval rejected.',
            ),
      );
      closeDecisionForm();
      setSelected(next);
      await loadApprovals();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.approvals.messages.decideFailure',
              'Unable to decide approval.',
            ),
      );
    } finally {
      setSubmitting(false);
      setActingApprovalId(undefined);
    }
  };

  const columns: ProColumns<ApprovalLiteSummary>[] = [
    {
      title: formatMessage(
        'pages.collaboration.approvals.fields.title',
        'Title',
      ),
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record.id)}>
          {record.title}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage(
        'pages.collaboration.approvals.fields.requester',
        'Requester',
      ),
      dataIndex: 'requester',
    },
    {
      title: formatMessage(
        'pages.collaboration.approvals.fields.approver',
        'Approver',
      ),
      dataIndex: 'approver',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.business',
        'Business',
      ),
      dataIndex: 'businessType',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.status',
        'Status',
      ),
      dataIndex: 'status',
      render: (_, record) => (
        <Tag color={statusColor(record.status)}>
          {statusLabels[record.status]}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.actionPolicy',
        'Action Policy',
      ),
      render: (_, record) => (
        <Tag color={record.status === 'pending' ? 'green' : 'default'}>
          {record.status === 'pending'
            ? actionPolicyLabels.active
            : actionPolicyLabels.terminal}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.collaboration.common.actions.column',
        'Action',
      ),
      valueType: 'option',
      render: (_, record) => [
        <Tooltip
          key="detail"
          title={formatMessage(
            'pages.collaboration.common.actions.detail',
            'Detail',
          )}
        >
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
            {formatMessage(
              'pages.collaboration.approvals.actions.approve',
              'Approve request',
            )}
          </Button>
        ) : null,
        record.status === 'pending' ? (
          <Popconfirm
            key="reject"
            onConfirm={() => openDecisionForm(record, 'reject')}
            title={formatMessage(
              'pages.collaboration.approvals.confirm.reject',
              'Reject this approval?',
            )}
          >
            <Button
              danger
              icon={<CloseCircleOutlined />}
              loading={actingApprovalId === record.id}
              size="small"
              title={APPROVAL_UPDATE_PERMISSION_MARKER}
              type="link"
            >
              {formatMessage(
                'pages.collaboration.approvals.actions.reject',
                'Reject request',
              )}
            </Button>
          </Popconfirm>
        ) : null,
      ],
    },
  ];

  return (
    <PageContainer
      title={formatMessage(
        'pages.collaboration.approvals.title',
        'Approval Lite',
      )}
      subTitle={formatMessage(
        'pages.collaboration.section',
        'S10 Collaboration',
      )}
    >
      {loadError ? (
        <Alert
          action={
            <Button onClick={() => void loadApprovals()}>
              {formatMessage(
                'pages.collaboration.approvals.actions.reload',
                'Reload live approvals',
              )}
            </Button>
          }
          description={loadError}
          message={formatMessage(
            'pages.collaboration.approvals.load.liveFailure',
            'Live collaboration approvals unavailable',
          )}
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.collaboration.approvals.stats.live',
            'Live approvals',
          )}
          value={stats.total}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.approvals.stats.pending',
            'Pending approvals',
          )}
          value={stats.pending}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.approvals.stats.approved',
            'Approved approvals',
          )}
          value={stats.approved}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.approvals.stats.rejected',
            'Rejected approvals',
          )}
          value={stats.rejected}
        />
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
            {formatMessage(
              'pages.collaboration.approvals.actions.reload',
              'Reload live approvals',
            )}
          </Button>,
          <Button
            icon={<PlusOutlined />}
            key="create"
            onClick={openCreateForm}
            title={APPROVAL_CREATE_PERMISSION_MARKER}
            type="primary"
          >
            {formatMessage(
              'pages.collaboration.approvals.actions.create',
              'Create approval',
            )}
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
          {
            label: formatMessage('pages.collaboration.common.fields.id', 'ID'),
            value: selected?.id,
          },
          {
            label: formatMessage(
              'pages.collaboration.approvals.fields.title',
              'Title',
            ),
            value: selected?.title,
          },
          {
            label: formatMessage(
              'pages.collaboration.approvals.fields.requester',
              'Requester',
            ),
            value: selected?.requester,
          },
          {
            label: formatMessage(
              'pages.collaboration.approvals.fields.approver',
              'Approver',
            ),
            value: selected?.approver,
          },
          {
            label: formatMessage(
              'pages.collaboration.common.fields.businessType',
              'Business Type',
            ),
            value: selected?.businessType,
          },
          {
            label: formatMessage(
              'pages.collaboration.common.fields.businessId',
              'Business ID',
            ),
            value: selected?.businessId,
          },
          {
            label: formatMessage(
              'pages.collaboration.common.fields.status',
              'Status',
            ),
            value: selected ? statusLabels[selected.status] : undefined,
          },
          {
            label: formatMessage(
              'pages.collaboration.approvals.fields.comment',
              'Comment',
            ),
            value: selected?.comment,
          },
          {
            label: formatMessage(
              'pages.collaboration.approvals.fields.decidedAt',
              'Decided At',
            ),
            value: selected?.decidedAt,
          },
          {
            label: formatMessage(
              'pages.collaboration.common.fields.createdAt',
              'Created At',
            ),
            value: selected?.createdAt,
          },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        timeline={selected?.timeline}
        title={
          selected?.title ??
          formatMessage(
            'pages.collaboration.approvals.detail.title',
            'Approval Detail',
          )
        }
      />
      <Modal
        confirmLoading={submitting}
        destroyOnClose
        onCancel={() => setCreateOpen(false)}
        onOk={() => void submitCreate()}
        open={createOpen}
        title={formatMessage(
          'pages.collaboration.approvals.actions.create',
          'Create approval',
        )}
      >
        <Form<ApprovalFormValues> form={createForm} layout="vertical">
          <Form.Item
            label={formatMessage(
              'pages.collaboration.approvals.fields.title',
              'Title',
            )}
            name="title"
            rules={[requiredRule]}
          >
            <Input maxLength={160} />
          </Form.Item>
          <Space align="start" style={{ width: '100%' }}>
            <Form.Item
              label={formatMessage(
                'pages.collaboration.approvals.fields.requester',
                'Requester',
              )}
              name="requester"
              rules={[requiredRule]}
            >
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.collaboration.approvals.fields.approver',
                'Approver',
              )}
              name="approver"
              rules={[requiredRule]}
            >
              <Input maxLength={80} />
            </Form.Item>
          </Space>
          <Space align="start" style={{ width: '100%' }}>
            <Form.Item
              label={formatMessage(
                'pages.collaboration.common.fields.businessType',
                'Business Type',
              )}
              name="businessType"
            >
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.collaboration.common.fields.businessId',
                'Business ID',
              )}
              name="businessId"
            >
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
        title={
          decision === 'approve'
            ? formatMessage(
                'pages.collaboration.approvals.actions.approve',
                'Approve request',
              )
            : formatMessage(
                'pages.collaboration.approvals.actions.reject',
                'Reject request',
              )
        }
      >
        <Form<DecisionFormValues> form={decisionForm} layout="vertical">
          <Form.Item
            label={formatMessage(
              'pages.collaboration.common.fields.actor',
              'Actor',
            )}
            name="actor"
            rules={[requiredRule]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.approvals.fields.comment',
              'Comment',
            )}
            name="comment"
          >
            <Input.TextArea maxLength={1000} rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
