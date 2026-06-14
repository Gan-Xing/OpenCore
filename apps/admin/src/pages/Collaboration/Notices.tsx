import {
  EyeOutlined,
  FileDoneOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import type { NoticeSummary } from '@opencore/sdk';
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  archiveOpenCoreNotice,
  createOpenCoreNotice,
  getOpenCoreNotice,
  listOpenCoreNotices,
  publishOpenCoreNotice,
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

type NoticeFormValues = {
  body: string;
  createdBy: string;
  targetAudience: string;
  title: string;
  validFrom?: string;
  validTo?: string;
};

const NOTICE_CREATE_PERMISSION_MARKER = 'collaboration:notice:create';
const NOTICE_UPDATE_PERMISSION_MARKER = 'collaboration:notice:update';

const exportColumns: CurrentPageExportColumn<NoticeSummary>[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'Title', dataIndex: 'title' },
  { title: 'Status', dataIndex: 'status' },
  {
    title: 'Audience',
    renderText: (record) => record.targetAudience.join(', '),
  },
  { title: 'Created By', dataIndex: 'createdBy' },
  { title: 'Valid From', dataIndex: 'validFrom' },
  { title: 'Valid To', dataIndex: 'validTo' },
  { title: 'Published At', dataIndex: 'publishedAt' },
  { title: 'Archived At', dataIndex: 'archivedAt' },
  { title: 'Created At', dataIndex: 'createdAt' },
  { title: 'Body', dataIndex: 'body', sensitive: true },
];
const searchFields: CurrentPageSearchField<NoticeSummary>[] = [
  'title',
  'createdBy',
  'status',
  (record) => record.targetAudience,
];

function statusColor(status: NoticeSummary['status']): string {
  if (status === 'draft') return 'gold';
  if (status === 'published') return 'green';
  return 'default';
}

function splitAudience(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function countByStatus(
  rows: readonly NoticeSummary[],
  status: NoticeSummary['status'],
): number {
  return rows.filter((row) => row.status === status).length;
}

export default function NoticesPage() {
  const [form] = Form.useForm<NoticeFormValues>();
  const [rows, setRows] = useState<readonly NoticeSummary[]>([]);
  const [selected, setSelected] = useState<NoticeSummary>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actingNoticeId, setActingNoticeId] = useState<string>();

  const stats = useMemo(
    () => ({
      archived: countByStatus(rows, 'archived'),
      draft: countByStatus(rows, 'draft'),
      published: countByStatus(rows, 'published'),
      total: rows.length,
    }),
    [rows],
  );

  const filterOptions: CurrentPageFilterOption<NoticeSummary>[] = useMemo(
    () => [
      {
        key: 'status',
        options: createCurrentPageFilterOptions(rows, 'status'),
        placeholder: 'Status',
        predicate: (record, value) => record.status === value,
      },
      {
        key: 'createdBy',
        options: createCurrentPageFilterOptions(rows, 'createdBy'),
        placeholder: 'Created by',
        predicate: (record, value) => record.createdBy === value,
      },
    ],
    [rows],
  );

  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<NoticeSummary>({
      rows,
      searchFields,
      searchPlaceholder: 'Search live notices',
      selectFilters: filterOptions,
    });

  const loadNotices = async () => {
    setLoading(true);
    try {
      setRows(await listOpenCoreNotices());
      setLoadError(undefined);
    } catch (error: unknown) {
      setRows([]);
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load notices.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotices();
  }, []);

  const openDetail = async (id: string) => {
    try {
      setSelected(await getOpenCoreNotice(id));
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to load notice.',
      );
    }
  };

  const openCreateForm = () => {
    form.setFieldsValue({
      body: '',
      createdBy: 'admin',
      targetAudience: 'admin',
      title: '',
      validFrom: '',
      validTo: '',
    });
    setFormOpen(true);
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    const targetAudience = splitAudience(values.targetAudience);
    if (targetAudience.length === 0) {
      message.error('Audience is required.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createOpenCoreNotice({
        body: values.body.trim(),
        createdBy: values.createdBy.trim(),
        targetAudience,
        title: values.title.trim(),
        validFrom: values.validFrom?.trim() || undefined,
        validTo: values.validTo?.trim() || undefined,
      });
      message.success('Notice created.');
      setFormOpen(false);
      setSelected(created);
      await loadNotices();
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to create notice.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const publish = async (record: NoticeSummary) => {
    setActingNoticeId(record.id);
    try {
      const next = await publishOpenCoreNotice(record.id);
      setSelected(next);
      message.success('Notice published.');
      await loadNotices();
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to publish notice.',
      );
    } finally {
      setActingNoticeId(undefined);
    }
  };

  const archive = async (record: NoticeSummary) => {
    setActingNoticeId(record.id);
    try {
      const next = await archiveOpenCoreNotice(record.id);
      setSelected(next);
      message.success('Notice archived.');
      await loadNotices();
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : 'Unable to archive notice.',
      );
    } finally {
      setActingNoticeId(undefined);
    }
  };

  const columns: ProColumns<NoticeSummary>[] = [
    {
      title: 'Title',
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record.id)}>
          {record.title}
        </Typography.Link>
      ),
    },
    { title: 'Created By', dataIndex: 'createdBy' },
    {
      title: 'Audience',
      dataIndex: 'targetAudience',
      renderText: (_, record) => record.targetAudience.join(', '),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (_, record) => (
        <Tag color={statusColor(record.status)}>{record.status}</Tag>
      ),
    },
    { title: 'Valid From', dataIndex: 'validFrom' },
    { title: 'Valid To', dataIndex: 'validTo' },
    { title: 'Created At', dataIndex: 'createdAt' },
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
        record.status === 'draft' ? (
          <Button
            icon={<FileDoneOutlined />}
            key="publish"
            loading={actingNoticeId === record.id}
            onClick={() => void publish(record)}
            size="small"
            title={NOTICE_UPDATE_PERMISSION_MARKER}
            type="link"
          >
            Publish notice
          </Button>
        ) : null,
        record.status !== 'archived' ? (
          <Button
            icon={<InboxOutlined />}
            key="archive"
            loading={actingNoticeId === record.id}
            onClick={() => void archive(record)}
            size="small"
            title={NOTICE_UPDATE_PERMISSION_MARKER}
            type="link"
          >
            Archive notice
          </Button>
        ) : null,
      ],
    },
  ];

  return (
    <PageContainer title="Notices" subTitle="S10 Collaboration">
      {loadError ? (
        <Alert
          action={
            <Button onClick={() => void loadNotices()}>
              Reload live notices
            </Button>
          }
          description={loadError}
          message="Live collaboration notices unavailable"
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="Live notices" value={stats.total} />
        <Statistic title="Draft notices" value={stats.draft} />
        <Statistic title="Published notices" value={stats.published} />
        <Statistic title="Archived notices" value={stats.archived} />
      </Space>
      <ProTable<NoticeSummary>
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
            onClick={() => void loadNotices()}
          >
            Reload live notices
          </Button>,
          <Button
            icon={<PlusOutlined />}
            key="create"
            onClick={openCreateForm}
            title={NOTICE_CREATE_PERMISSION_MARKER}
            type="primary"
          >
            Create notice
          </Button>,
          <CurrentPageExportButton<NoticeSummary>
            columns={exportColumns}
            key="export"
            resource="collaboration-notices"
            rows={filteredRows}
          />,
        ]}
      />
      <ReadOnlyDetailDrawer
        fields={[
          { label: 'ID', value: selected?.id },
          { label: 'Title', value: selected?.title },
          { label: 'Created By', value: selected?.createdBy },
          { label: 'Status', value: selected?.status },
          {
            label: 'Audience',
            value: selected?.targetAudience.join(', '),
          },
          { label: 'Valid From', value: selected?.validFrom },
          { label: 'Valid To', value: selected?.validTo },
          { label: 'Published At', value: selected?.publishedAt },
          { label: 'Archived At', value: selected?.archivedAt },
          { label: 'Created At', value: selected?.createdAt },
          { label: 'Body', value: selected?.body },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={selected?.title ?? 'Notice Detail'}
      />
      <Modal
        confirmLoading={submitting}
        destroyOnClose
        onCancel={() => setFormOpen(false)}
        onOk={() => void submitForm()}
        open={formOpen}
        title="Create notice"
      >
        <Form<NoticeFormValues> form={form} layout="vertical">
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={160} />
          </Form.Item>
          <Form.Item
            label="Created By"
            name="createdBy"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item
            label="Audience"
            name="targetAudience"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={240} />
          </Form.Item>
          <Form.Item
            label="Body"
            name="body"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input.TextArea maxLength={2000} rows={4} />
          </Form.Item>
          <Space align="start" style={{ width: '100%' }}>
            <Form.Item label="Valid From" name="validFrom">
              <Input placeholder="2026-06-14T00:00:00.000Z" />
            </Form.Item>
            <Form.Item label="Valid To" name="validTo">
              <Input placeholder="2026-06-15T00:00:00.000Z" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
