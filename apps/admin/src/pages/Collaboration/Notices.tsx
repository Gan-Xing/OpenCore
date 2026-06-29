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
import { useIntl } from '@umijs/max';
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
import { useCallback, useEffect, useMemo, useState } from 'react';
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

type FormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, number | string>,
) => string;

const NOTICE_CREATE_PERMISSION_MARKER = 'collaboration:notice:create';
const NOTICE_UPDATE_PERMISSION_MARKER = 'collaboration:notice:update';

const searchFields: CurrentPageSearchField<NoticeSummary>[] = [
  'tenantId',
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

function createExportColumns(
  formatMessage: FormatMessage,
): CurrentPageExportColumn<NoticeSummary>[] {
  return [
    {
      title: formatMessage('pages.collaboration.common.fields.id', 'ID'),
      dataIndex: 'id',
    },
    {
      title: formatMessage(
        'pages.collaboration.notices.fields.tenantId',
        'Tenant ID',
      ),
      dataIndex: 'tenantId',
    },
    {
      title: formatMessage('pages.collaboration.notices.fields.title', 'Title'),
      dataIndex: 'title',
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
        'pages.collaboration.notices.fields.audience',
        'Audience',
      ),
      renderText: (record) => record.targetAudience.join(', '),
    },
    {
      title: formatMessage(
        'pages.collaboration.notices.fields.createdBy',
        'Created By',
      ),
      dataIndex: 'createdBy',
    },
    {
      title: formatMessage(
        'pages.collaboration.notices.fields.validFrom',
        'Valid From',
      ),
      dataIndex: 'validFrom',
    },
    {
      title: formatMessage(
        'pages.collaboration.notices.fields.validTo',
        'Valid To',
      ),
      dataIndex: 'validTo',
    },
    {
      title: formatMessage(
        'pages.collaboration.notices.fields.publishedAt',
        'Published At',
      ),
      dataIndex: 'publishedAt',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.archivedAt',
        'Archived At',
      ),
      dataIndex: 'archivedAt',
    },
    {
      title: formatMessage(
        'pages.collaboration.common.fields.createdAt',
        'Created At',
      ),
      dataIndex: 'createdAt',
    },
    {
      title: formatMessage('pages.collaboration.notices.fields.body', 'Body'),
      dataIndex: 'body',
      sensitive: true,
    },
  ];
}

export default function NoticesPage() {
  const intl = useIntl();
  const [form] = Form.useForm<NoticeFormValues>();
  const [rows, setRows] = useState<readonly NoticeSummary[]>([]);
  const [selected, setSelected] = useState<NoticeSummary>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actingNoticeId, setActingNoticeId] = useState<string>();
  const formatMessage: FormatMessage = useCallback(
    (id, defaultMessage, values) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const statusLabels = useMemo(
    () => ({
      archived: formatMessage(
        'pages.collaboration.notices.status.archived',
        'archived',
      ),
      draft: formatMessage('pages.collaboration.notices.status.draft', 'draft'),
      published: formatMessage(
        'pages.collaboration.notices.status.published',
        'published',
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
        placeholder: formatMessage(
          'pages.collaboration.common.fields.status',
          'Status',
        ),
        predicate: (record, value) => record.status === value,
      },
      {
        key: 'createdBy',
        options: createCurrentPageFilterOptions(rows, 'createdBy'),
        placeholder: formatMessage(
          'pages.collaboration.notices.fields.createdBy',
          'Created by',
        ),
        predicate: (record, value) => record.createdBy === value,
      },
    ],
    [formatMessage, rows],
  );

  const { filteredRows, toolbar: filterToolbar } =
    useCurrentPageFilters<NoticeSummary>({
      rows,
      searchFields,
      searchPlaceholder: formatMessage(
        'pages.collaboration.notices.search.placeholder',
        'Search live notices',
      ),
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
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.notices.load.failure',
              'Unable to load notices.',
            ),
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
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.notices.detail.loadFailure',
              'Unable to load notice.',
            ),
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
      message.error(
        formatMessage(
          'pages.collaboration.notices.validation.audienceRequired',
          'Audience is required.',
        ),
      );
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
      message.success(
        formatMessage(
          'pages.collaboration.notices.messages.created',
          'Notice created.',
        ),
      );
      setFormOpen(false);
      setSelected(created);
      await loadNotices();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.notices.messages.createFailure',
              'Unable to create notice.',
            ),
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
      message.success(
        formatMessage(
          'pages.collaboration.notices.messages.published',
          'Notice published.',
        ),
      );
      await loadNotices();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.notices.messages.publishFailure',
              'Unable to publish notice.',
            ),
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
      message.success(
        formatMessage(
          'pages.collaboration.notices.messages.archived',
          'Notice archived.',
        ),
      );
      await loadNotices();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.collaboration.notices.messages.archiveFailure',
              'Unable to archive notice.',
            ),
      );
    } finally {
      setActingNoticeId(undefined);
    }
  };

  const columns: ProColumns<NoticeSummary>[] = [
    {
      title: formatMessage(
        'pages.collaboration.notices.fields.tenantId',
        'Tenant ID',
      ),
      dataIndex: 'tenantId',
      width: 160,
    },
    {
      title: formatMessage('pages.collaboration.notices.fields.title', 'Title'),
      dataIndex: 'title',
      render: (_, record) => (
        <Typography.Link onClick={() => void openDetail(record.id)}>
          {record.title}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage(
        'pages.collaboration.notices.fields.createdBy',
        'Created By',
      ),
      dataIndex: 'createdBy',
    },
    {
      title: formatMessage(
        'pages.collaboration.notices.fields.audience',
        'Audience',
      ),
      dataIndex: 'targetAudience',
      renderText: (_, record) => record.targetAudience.join(', '),
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
        'pages.collaboration.notices.fields.validFrom',
        'Valid From',
      ),
      dataIndex: 'validFrom',
    },
    {
      title: formatMessage(
        'pages.collaboration.notices.fields.validTo',
        'Valid To',
      ),
      dataIndex: 'validTo',
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
            {formatMessage(
              'pages.collaboration.notices.actions.publish',
              'Publish notice',
            )}
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
            {formatMessage(
              'pages.collaboration.notices.actions.archive',
              'Archive notice',
            )}
          </Button>
        ) : null,
      ],
    },
  ];

  return (
    <PageContainer
      title={formatMessage('pages.collaboration.notices.title', 'Notices')}
      subTitle={formatMessage('pages.collaboration.section', 'Collaboration')}
    >
      {loadError ? (
        <Alert
          action={
            <Button onClick={() => void loadNotices()}>
              {formatMessage(
                'pages.collaboration.notices.actions.reload',
                'Reload live notices',
              )}
            </Button>
          }
          description={loadError}
          message={formatMessage(
            'pages.collaboration.notices.load.liveFailure',
            'Live collaboration notices unavailable',
          )}
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.collaboration.notices.stats.live',
            'Live notices',
          )}
          value={stats.total}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.notices.stats.draft',
            'Draft notices',
          )}
          value={stats.draft}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.notices.stats.published',
            'Published notices',
          )}
          value={stats.published}
        />
        <Statistic
          title={formatMessage(
            'pages.collaboration.notices.stats.archived',
            'Archived notices',
          )}
          value={stats.archived}
        />
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
            {formatMessage(
              'pages.collaboration.notices.actions.reload',
              'Reload live notices',
            )}
          </Button>,
          <Button
            icon={<PlusOutlined />}
            key="create"
            onClick={openCreateForm}
            title={NOTICE_CREATE_PERMISSION_MARKER}
            type="primary"
          >
            {formatMessage(
              'pages.collaboration.notices.actions.create',
              'Create notice',
            )}
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
          {
            label: formatMessage('pages.collaboration.common.fields.id', 'ID'),
            value: selected?.id,
          },
          {
            label: formatMessage(
              'pages.collaboration.notices.fields.tenantId',
              'Tenant ID',
            ),
            value: selected?.tenantId,
          },
          {
            label: formatMessage(
              'pages.collaboration.notices.fields.title',
              'Title',
            ),
            value: selected?.title,
          },
          {
            label: formatMessage(
              'pages.collaboration.notices.fields.createdBy',
              'Created By',
            ),
            value: selected?.createdBy,
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
              'pages.collaboration.notices.fields.audience',
              'Audience',
            ),
            value: selected?.targetAudience.join(', '),
          },
          {
            label: formatMessage(
              'pages.collaboration.notices.fields.validFrom',
              'Valid From',
            ),
            value: selected?.validFrom,
          },
          {
            label: formatMessage(
              'pages.collaboration.notices.fields.validTo',
              'Valid To',
            ),
            value: selected?.validTo,
          },
          {
            label: formatMessage(
              'pages.collaboration.notices.fields.publishedAt',
              'Published At',
            ),
            value: selected?.publishedAt,
          },
          {
            label: formatMessage(
              'pages.collaboration.common.fields.archivedAt',
              'Archived At',
            ),
            value: selected?.archivedAt,
          },
          {
            label: formatMessage(
              'pages.collaboration.common.fields.createdAt',
              'Created At',
            ),
            value: selected?.createdAt,
          },
          {
            label: formatMessage(
              'pages.collaboration.notices.fields.body',
              'Body',
            ),
            value: selected?.body,
          },
        ]}
        onClose={() => setSelected(undefined)}
        open={Boolean(selected)}
        title={
          selected?.title ??
          formatMessage(
            'pages.collaboration.notices.detail.title',
            'Notice Detail',
          )
        }
      />
      <Modal
        confirmLoading={submitting}
        destroyOnClose
        onCancel={() => setFormOpen(false)}
        onOk={() => void submitForm()}
        open={formOpen}
        title={formatMessage(
          'pages.collaboration.notices.actions.create',
          'Create notice',
        )}
      >
        <Form<NoticeFormValues> form={form} layout="vertical">
          <Form.Item
            label={formatMessage(
              'pages.collaboration.notices.fields.title',
              'Title',
            )}
            name="title"
            rules={[requiredRule]}
          >
            <Input maxLength={160} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.notices.fields.createdBy',
              'Created By',
            )}
            name="createdBy"
            rules={[requiredRule]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.notices.fields.audience',
              'Audience',
            )}
            name="targetAudience"
            rules={[requiredRule]}
          >
            <Input maxLength={240} />
          </Form.Item>
          <Form.Item
            label={formatMessage(
              'pages.collaboration.notices.fields.body',
              'Body',
            )}
            name="body"
            rules={[requiredRule]}
          >
            <Input.TextArea maxLength={2000} rows={4} />
          </Form.Item>
          <Space align="start" style={{ width: '100%' }}>
            <Form.Item
              label={formatMessage(
                'pages.collaboration.notices.fields.validFrom',
                'Valid From',
              )}
              name="validFrom"
            >
              <Input placeholder="2026-06-14T00:00:00.000Z" />
            </Form.Item>
            <Form.Item
              label={formatMessage(
                'pages.collaboration.notices.fields.validTo',
                'Valid To',
              )}
              name="validTo"
            >
              <Input placeholder="2026-06-15T00:00:00.000Z" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
