import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import type {
  IntegrationOutboxProcessResult,
  IntegrationOutboxSummary,
  IntegrationOutboxTestResult,
  IntegrationTemplateSummary,
  TemplatePreviewSummary,
} from '@opencore/sdk';
import {
  Alert,
  Button,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getOpenCoreMailOutboxMessage,
  getOpenCoreMailTemplate,
  listOpenCoreMailOutbox,
  listOpenCoreMailTemplates,
  previewOpenCoreMailTemplate,
  processOpenCoreIntegrationOutbox,
  sendOpenCoreIntegrationTestOutbox,
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

const MAIL_MANAGE_PERMISSION_MARKER = 'integration:mail:manage';

const templateSearchFields: CurrentPageSearchField<IntegrationTemplateSummary>[] =
  ['code', 'channel', 'name', 'subject'];
const outboxSearchFields: CurrentPageSearchField<IntegrationOutboxSummary>[] = [
  'id',
  'providerCode',
  'templateCode',
  'recipient',
  'subject',
  'status',
];

function statusColor(status: IntegrationOutboxSummary['status']): string {
  if (status === 'sent') return 'green';
  if (status === 'failed') return 'red';
  return 'gold';
}

function buildPreviewPayload(
  template: IntegrationTemplateSummary,
  outbox?: IntegrationOutboxSummary,
): Record<string, unknown> {
  if (outbox?.payload && Object.keys(outbox.payload).length > 0) {
    return outbox.payload;
  }

  const text = `${template.subject ?? ''}\n${template.body}`;
  const payload: Record<string, unknown> = {};
  for (const match of text.matchAll(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g)) {
    payload[match[1]] = match[1] === 'name' ? 'Admin' : `sample-${match[1]}`;
  }

  return Object.keys(payload).length > 0 ? payload : { name: 'Admin' };
}

function selectMailProviderCode(
  outboxRows: readonly IntegrationOutboxSummary[],
  templateCode: string,
): string {
  return (
    outboxRows.find((message) => message.templateCode === templateCode)
      ?.providerCode ??
    outboxRows[0]?.providerCode ??
    'mail.sandbox'
  );
}

export default function MailIntegrationPage() {
  const intl = useIntl();
  const [templates, setTemplates] = useState<
    readonly IntegrationTemplateSummary[]
  >([]);
  const [outboxRows, setOutboxRows] = useState<
    readonly IntegrationOutboxSummary[]
  >([]);
  const [selected, setSelected] = useState<IntegrationTemplateSummary>();
  const [selectedOutbox, setSelectedOutbox] =
    useState<IntegrationOutboxSummary>();
  const [preview, setPreview] = useState<TemplatePreviewSummary>();
  const [lastProcess, setLastProcess] =
    useState<IntegrationOutboxProcessResult>();
  const [lastTestSend, setLastTestSend] =
    useState<IntegrationOutboxTestResult>();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [previewingCode, setPreviewingCode] = useState<string>();
  const [testSendingCode, setTestSendingCode] = useState<string>();
  const [loadError, setLoadError] = useState<string>();
  const formatMessage = useCallback(
    (
      id: string,
      defaultMessage: string,
      values?: Record<string, number | string>,
    ) =>
      values
        ? intl.formatMessage({ id, defaultMessage }, values)
        : intl.formatMessage({ id, defaultMessage }),
    [intl],
  );
  const statusLabels = {
    disabled: formatMessage(
      'pages.integrations.mail.status.disabled',
      'disabled',
    ),
    enabled: formatMessage('pages.integrations.mail.status.enabled', 'enabled'),
  };
  const previewPolicyLabels = {
    allowed: formatMessage(
      'pages.integrations.mail.previewPolicy.allowed',
      'preview allowed',
    ),
    blocked: formatMessage(
      'pages.integrations.mail.previewPolicy.blocked',
      'preview blocked',
    ),
  };
  const staticLabels = {
    notRun: formatMessage('pages.integrations.mail.static.notRun', 'not run'),
  };
  const templateExportColumns: CurrentPageExportColumn<IntegrationTemplateSummary>[] =
    [
      {
        title: formatMessage('pages.integrations.mail.fields.code', 'Code'),
        dataIndex: 'code',
      },
      {
        title: formatMessage(
          'pages.integrations.mail.fields.channel',
          'Channel',
        ),
        dataIndex: 'channel',
      },
      {
        title: formatMessage('pages.integrations.mail.fields.name', 'Name'),
        dataIndex: 'name',
      },
      {
        title: formatMessage(
          'pages.integrations.mail.fields.subject',
          'Subject',
        ),
        dataIndex: 'subject',
      },
      {
        title: formatMessage(
          'pages.integrations.mail.fields.enabled',
          'Enabled',
        ),
        dataIndex: 'enabled',
      },
      {
        title: formatMessage('pages.integrations.mail.fields.body', 'Body'),
        dataIndex: 'body',
        sensitive: true,
      },
    ];
  const outboxExportColumns: CurrentPageExportColumn<IntegrationOutboxSummary>[] =
    [
      {
        title: formatMessage('pages.integrations.mail.fields.id', 'ID'),
        dataIndex: 'id',
      },
      {
        title: formatMessage(
          'pages.integrations.mail.fields.provider',
          'Provider',
        ),
        dataIndex: 'providerCode',
      },
      {
        title: formatMessage(
          'pages.integrations.mail.fields.template',
          'Template',
        ),
        dataIndex: 'templateCode',
      },
      {
        title: formatMessage(
          'pages.integrations.mail.fields.recipient',
          'Recipient',
        ),
        dataIndex: 'recipient',
      },
      {
        title: formatMessage(
          'pages.integrations.mail.fields.subject',
          'Subject',
        ),
        dataIndex: 'subject',
      },
      {
        title: formatMessage('pages.integrations.mail.fields.status', 'Status'),
        dataIndex: 'status',
      },
      {
        title: formatMessage(
          'pages.integrations.mail.fields.retryCount',
          'Retry Count',
        ),
        dataIndex: 'retryCount',
      },
      {
        title: formatMessage(
          'pages.integrations.mail.fields.createdAt',
          'Created At',
        ),
        dataIndex: 'createdAt',
      },
      {
        title: formatMessage(
          'pages.integrations.mail.fields.sentAt',
          'Sent At',
        ),
        dataIndex: 'sentAt',
      },
      {
        title: formatMessage(
          'pages.integrations.mail.fields.payload',
          'Payload',
        ),
        dataIndex: 'payload',
        sensitive: true,
      },
      {
        title: formatMessage(
          'pages.integrations.mail.fields.preview',
          'Preview',
        ),
        dataIndex: 'preview',
        sensitive: true,
      },
    ];

  const templateFilterOptions: CurrentPageFilterOption<IntegrationTemplateSummary>[] =
    useMemo(
      () => [
        {
          key: 'enabled',
          options: [
            { label: statusLabels.enabled, value: 'true' },
            { label: statusLabels.disabled, value: 'false' },
          ],
          placeholder: formatMessage(
            'pages.integrations.mail.fields.enabled',
            'Enabled',
          ),
          predicate: (record, value) => record.enabled === (value === 'true'),
        },
      ],
      [formatMessage, statusLabels.disabled, statusLabels.enabled],
    );
  const outboxFilterOptions: CurrentPageFilterOption<IntegrationOutboxSummary>[] =
    useMemo(
      () => [
        {
          key: 'providerCode',
          options: createCurrentPageFilterOptions(outboxRows, 'providerCode'),
          placeholder: formatMessage(
            'pages.integrations.mail.fields.provider',
            'Provider',
          ),
          predicate: (record, value) => record.providerCode === value,
        },
        {
          key: 'status',
          options: createCurrentPageFilterOptions(outboxRows, 'status'),
          placeholder: formatMessage(
            'pages.integrations.mail.fields.status',
            'Status',
          ),
          predicate: (record, value) => record.status === value,
        },
      ],
      [formatMessage, outboxRows],
    );
  const { filteredRows: filteredTemplates, toolbar: templateFilterToolbar } =
    useCurrentPageFilters<IntegrationTemplateSummary>({
      rows: templates,
      searchFields: templateSearchFields,
      searchPlaceholder: formatMessage(
        'pages.integrations.mail.search.templates',
        'Search live mail templates',
      ),
      selectFilters: templateFilterOptions,
    });
  const { filteredRows: filteredOutboxRows, toolbar: outboxFilterToolbar } =
    useCurrentPageFilters<IntegrationOutboxSummary>({
      rows: outboxRows,
      searchFields: outboxSearchFields,
      searchPlaceholder: formatMessage(
        'pages.integrations.mail.search.outbox',
        'Search live mail outbox',
      ),
      selectFilters: outboxFilterOptions,
    });
  const queuedCount = outboxRows.filter(
    (record) => record.status === 'queued',
  ).length;
  const failedCount = outboxRows.filter(
    (record) => record.status === 'failed',
  ).length;

  const loadMailOperations = useCallback(async () => {
    setLoading(true);
    try {
      const [nextTemplates, nextOutbox] = await Promise.all([
        listOpenCoreMailTemplates(),
        listOpenCoreMailOutbox(),
      ]);

      setTemplates(nextTemplates);
      setOutboxRows(nextOutbox);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.mail.load.failure',
              'Unable to load live mail integration operations.',
            ),
      );
    } finally {
      setLoading(false);
    }
  }, [formatMessage]);

  useEffect(() => {
    void loadMailOperations();
  }, [loadMailOperations]);

  const openTemplateDetail = async (code: string) => {
    setPreview(undefined);
    try {
      const detail = await getOpenCoreMailTemplate(code);
      const outbox = outboxRows.find(
        (message) => message.templateCode === code,
      );
      setSelected(detail);
      setSelectedOutbox(
        outbox ? await getOpenCoreMailOutboxMessage(outbox.id) : undefined,
      );
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.mail.load.detailFailure',
              'Unable to load mail detail.',
            ),
      );
    }
  };

  const openOutboxDetail = async (id: string) => {
    setPreview(undefined);
    try {
      const outbox = await getOpenCoreMailOutboxMessage(id);
      const template = outbox.templateCode
        ? await getOpenCoreMailTemplate(outbox.templateCode)
        : undefined;
      setSelected(template);
      setSelectedOutbox(outbox);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.mail.load.outboxDetailFailure',
              'Unable to load outbox detail.',
            ),
      );
    }
  };

  const previewTemplate = async (record: IntegrationTemplateSummary) => {
    setPreviewingCode(record.code);
    try {
      const outbox = outboxRows.find(
        (message) => message.templateCode === record.code,
      );
      const nextPreview = await previewOpenCoreMailTemplate({
        templateCode: record.code,
        payload: buildPreviewPayload(record, outbox),
      });

      setSelected(record);
      setSelectedOutbox(outbox);
      setPreview(nextPreview);
      message.success(
        formatMessage(
          'pages.integrations.mail.messages.previewRendered',
          'Mail template preview rendered',
        ),
      );
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.mail.messages.previewFailure',
              'Unable to preview mail template.',
            ),
      );
    } finally {
      setPreviewingCode(undefined);
    }
  };

  const processQueuedOutbox = async () => {
    setProcessing(true);
    try {
      const result = await processOpenCoreIntegrationOutbox('mail', {
        limit: 25,
      });
      setLastProcess(result);
      message.success(
        formatMessage(
          'pages.integrations.mail.messages.processed',
          'Mail outbox processed: attempted {count}',
          { count: result.attemptedCount },
        ),
      );
      await loadMailOperations();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.mail.messages.processFailure',
              'Unable to process mail outbox.',
            ),
      );
    } finally {
      setProcessing(false);
    }
  };

  const sendTestMessage = async (record: IntegrationTemplateSummary) => {
    const outbox = outboxRows.find(
      (message) => message.templateCode === record.code,
    );
    setTestSendingCode(record.code);
    try {
      const result = await sendOpenCoreIntegrationTestOutbox('mail', {
        providerCode: selectMailProviderCode(outboxRows, record.code),
        templateCode: record.code,
        recipient: 'admin@example.test',
        payload: buildPreviewPayload(record, outbox),
        reason: 'Admin mail test-send',
      });

      setSelected(record);
      setSelectedOutbox(result.message);
      setLastTestSend(result);
      message.success(
        formatMessage(
          'pages.integrations.mail.messages.testSent',
          'Mail test-send {status}.',
          { status: result.status },
        ),
      );
      await loadMailOperations();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.mail.messages.testFailure',
              'Unable to send mail test.',
            ),
      );
    } finally {
      setTestSendingCode(undefined);
    }
  };

  const templateColumns: ProColumns<IntegrationTemplateSummary>[] = [
    {
      title: formatMessage('pages.integrations.mail.fields.code', 'Code'),
      dataIndex: 'code',
      render: (_, record) => (
        <Typography.Link onClick={() => void openTemplateDetail(record.code)}>
          {record.code}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.integrations.mail.fields.name', 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage('pages.integrations.mail.fields.subject', 'Subject'),
      dataIndex: 'subject',
    },
    {
      title: formatMessage('pages.integrations.mail.fields.enabled', 'Enabled'),
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? statusLabels.enabled : statusLabels.disabled}
        </Tag>
      ),
    },
    {
      title: formatMessage(
        'pages.integrations.mail.fields.previewPolicy',
        'Preview Policy',
      ),
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled
            ? previewPolicyLabels.allowed
            : previewPolicyLabels.blocked}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.integrations.mail.actions.column', 'Action'),
      valueType: 'option',
      render: (_, record) => [
        <a key="detail" onClick={() => void openTemplateDetail(record.code)}>
          {formatMessage('pages.integrations.mail.actions.detail', 'Detail')}
        </a>,
        <Button
          key="preview"
          loading={previewingCode === record.code}
          onClick={() => void previewTemplate(record)}
          size="small"
          type="link"
        >
          {formatMessage(
            'pages.integrations.mail.actions.previewTemplate',
            'Preview template',
          )}
        </Button>,
        <Button
          key="test-send"
          loading={testSendingCode === record.code}
          onClick={() => void sendTestMessage(record)}
          size="small"
          title={MAIL_MANAGE_PERMISSION_MARKER}
          type="link"
        >
          {formatMessage(
            'pages.integrations.mail.actions.sendTest',
            'Send test',
          )}
        </Button>,
      ],
    },
  ];

  const outboxColumns: ProColumns<IntegrationOutboxSummary>[] = [
    {
      title: formatMessage('pages.integrations.mail.fields.message', 'Message'),
      dataIndex: 'id',
      render: (_, record) => (
        <Typography.Link onClick={() => void openOutboxDetail(record.id)}>
          {record.id}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage(
        'pages.integrations.mail.fields.provider',
        'Provider',
      ),
      dataIndex: 'providerCode',
    },
    {
      title: formatMessage(
        'pages.integrations.mail.fields.template',
        'Template',
      ),
      dataIndex: 'templateCode',
    },
    {
      title: formatMessage(
        'pages.integrations.mail.fields.recipient',
        'Recipient',
      ),
      dataIndex: 'recipient',
    },
    {
      title: formatMessage('pages.integrations.mail.fields.subject', 'Subject'),
      dataIndex: 'subject',
    },
    {
      title: formatMessage('pages.integrations.mail.fields.status', 'Status'),
      render: (_, record) => (
        <Tag color={statusColor(record.status)}>{record.status}</Tag>
      ),
    },
    {
      title: formatMessage('pages.integrations.mail.fields.retry', 'Retry'),
      dataIndex: 'retryCount',
    },
    {
      title: formatMessage(
        'pages.integrations.mail.fields.createdAt',
        'Created At',
      ),
      dataIndex: 'createdAt',
    },
    {
      title: formatMessage('pages.integrations.mail.actions.column', 'Action'),
      valueType: 'option',
      render: (_, record) => (
        <a onClick={() => void openOutboxDetail(record.id)}>
          {formatMessage('pages.integrations.mail.actions.detail', 'Detail')}
        </a>
      ),
    },
  ];

  return (
    <PageContainer
      title={formatMessage('menu.integrations.mail', 'Mail')}
      subTitle={formatMessage('pages.integrations.section', 'S12 Integrations')}
    >
      {loadError ? (
        <Alert
          action={
            <Button onClick={() => void loadMailOperations()}>
              {formatMessage(
                'pages.integrations.mail.actions.reloadOperations',
                'Reload live mail operations',
              )}
            </Button>
          }
          description={loadError}
          message={formatMessage(
            'pages.integrations.mail.load.liveUnavailable',
            'Live mail integration operations unavailable',
          )}
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.integrations.mail.summary.liveTemplates',
            'Live mail templates',
          )}
          value={templates.length}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.mail.summary.outboxOperations',
            'Mail outbox operations',
          )}
          value={outboxRows.length}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.mail.summary.queuedOutbox',
            'Queued mail outbox',
          )}
          value={queuedCount}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.mail.summary.failedOutbox',
            'Failed mail outbox',
          )}
          value={failedCount}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.mail.summary.lastProcess',
            'Last mail process',
          )}
          value={lastProcess?.attemptedCount ?? 0}
          suffix={formatMessage(
            'pages.integrations.mail.summary.sentSuffix',
            'sent {count}',
            {
              count: lastProcess?.sentCount ?? 0,
            },
          )}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.mail.summary.lastTestSend',
            'Last mail test-send',
          )}
          value={lastTestSend?.status ?? staticLabels.notRun}
        />
      </Space>
      <ProTable<IntegrationTemplateSummary>
        columns={templateColumns}
        dataSource={filteredTemplates}
        loading={loading}
        options={false}
        pagination={false}
        rowKey="code"
        search={false}
        toolBarRender={() => [
          templateFilterToolbar,
          <Button key="reload" onClick={() => void loadMailOperations()}>
            {formatMessage(
              'pages.integrations.mail.actions.reloadOperations',
              'Reload live mail operations',
            )}
          </Button>,
          <Button
            key="process"
            loading={processing}
            onClick={() => void processQueuedOutbox()}
            title={MAIL_MANAGE_PERMISSION_MARKER}
          >
            {formatMessage(
              'pages.integrations.mail.actions.processQueuedOutbox',
              'Process queued mail outbox',
            )}
          </Button>,
          <CurrentPageExportButton<IntegrationTemplateSummary>
            columns={templateExportColumns}
            key="export"
            resource="integration-mail-templates"
            rows={filteredTemplates}
          />,
        ]}
      />
      <ProTable<IntegrationOutboxSummary>
        columns={outboxColumns}
        dataSource={filteredOutboxRows}
        loading={loading}
        options={false}
        pagination={false}
        rowKey="id"
        search={false}
        style={{ marginTop: 24 }}
        toolBarRender={() => [
          outboxFilterToolbar,
          <CurrentPageExportButton<IntegrationOutboxSummary>
            columns={outboxExportColumns}
            key="export"
            resource="integration-mail-outbox"
            rows={filteredOutboxRows}
          />,
        ]}
      />
      <ReadOnlyDetailDrawer
        fields={[
          {
            label: formatMessage('pages.integrations.mail.fields.code', 'Code'),
            value: selected?.code,
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.channel',
              'Channel',
            ),
            value: selected?.channel,
          },
          {
            label: formatMessage('pages.integrations.mail.fields.name', 'Name'),
            value: selected?.name,
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.subject',
              'Subject',
            ),
            value: selected?.subject,
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.enabled',
              'Enabled',
            ),
            value: selected?.enabled
              ? statusLabels.enabled
              : statusLabels.disabled,
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.outboxMessage',
              'Outbox Message',
            ),
            value: selectedOutbox?.id,
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.outboxProvider',
              'Outbox Provider',
            ),
            value: selectedOutbox?.providerCode,
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.outboxRecipient',
              'Outbox Recipient',
            ),
            value: selectedOutbox?.recipient,
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.outboxSubject',
              'Outbox Subject',
            ),
            value: selectedOutbox?.subject,
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.outboxStatus',
              'Outbox Status',
            ),
            value: selectedOutbox?.status,
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.outboxRetryCount',
              'Outbox Retry Count',
            ),
            value: selectedOutbox?.retryCount,
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.outboxSentAt',
              'Outbox Sent At',
            ),
            value: selectedOutbox?.sentAt,
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.testSendStatus',
              'Test Send Status',
            ),
            value: lastTestSend?.status,
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.testSendError',
              'Test Send Error',
            ),
            value: lastTestSend?.error,
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.testSendAt',
              'Test Send At',
            ),
            value: lastTestSend?.testedAt,
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.smtpAttachments',
              'SMTP Attachments',
            ),
            value: selectedOutbox?.attachments?.length ?? 0,
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.attachmentNames',
              'Attachment Names',
            ),
            value: selectedOutbox?.attachments
              ?.map((attachment) => attachment.filename)
              .join(', '),
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.previewSubject',
              'Preview Subject',
            ),
            value: preview?.subject,
          },
          {
            label: formatMessage('pages.integrations.mail.fields.body', 'Body'),
            value: selected?.body,
          },
          {
            label: formatMessage(
              'pages.integrations.mail.fields.renderedPreview',
              'Rendered Preview',
            ),
            value: preview?.body,
          },
        ]}
        jsonSections={[
          {
            title: formatMessage(
              'pages.integrations.mail.json.sampleOutboxPayload',
              'Sample Outbox Payload',
            ),
            value: selectedOutbox?.payload ?? {},
          },
          {
            title: formatMessage(
              'pages.integrations.mail.json.templatePreviewPayload',
              'Template Preview Payload',
            ),
            value: selected
              ? buildPreviewPayload(selected, selectedOutbox)
              : undefined,
          },
          {
            title: formatMessage(
              'pages.integrations.mail.json.attachmentMetadata',
              'Attachment Metadata',
            ),
            value:
              selectedOutbox?.attachments?.map((attachment) => ({
                filename: attachment.filename,
                contentType: attachment.contentType,
                sizeBytes: attachment.sizeBytes,
              })) ?? [],
          },
          {
            title: formatMessage(
              'pages.integrations.mail.json.lastProcessResult',
              'Last Process Result',
            ),
            value: lastProcess,
          },
          {
            title: formatMessage(
              'pages.integrations.mail.json.lastTestSendResult',
              'Last Test Send Result',
            ),
            value: lastTestSend,
          },
        ]}
        onClose={() => {
          setSelected(undefined);
          setSelectedOutbox(undefined);
          setPreview(undefined);
        }}
        open={Boolean(selected || selectedOutbox)}
        title={
          selected?.name ??
          selectedOutbox?.id ??
          formatMessage(
            'pages.integrations.mail.detail.title',
            'Mail Operation Detail',
          )
        }
      />
    </PageContainer>
  );
}
