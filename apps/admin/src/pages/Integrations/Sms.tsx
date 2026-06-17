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
  getOpenCoreSmsOutboxMessage,
  getOpenCoreSmsTemplate,
  listOpenCoreSmsOutbox,
  listOpenCoreSmsTemplates,
  previewOpenCoreSmsTemplate,
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

const SMS_MANAGE_PERMISSION_MARKER = 'integration:sms:manage';

const templateSearchFields: CurrentPageSearchField<IntegrationTemplateSummary>[] =
  ['code', 'channel', 'name'];
const outboxSearchFields: CurrentPageSearchField<IntegrationOutboxSummary>[] = [
  'id',
  'providerCode',
  'templateCode',
  'recipient',
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

  const payload: Record<string, unknown> = {};
  for (const match of template.body.matchAll(
    /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g,
  )) {
    const key = match[1];
    if (key === 'code') {
      payload[key] = '123456';
    } else if (key === 'phone' || key === 'mobile') {
      payload[key] = '+15551234567';
    } else {
      payload[key] = `sample-${key}`;
    }
  }

  return Object.keys(payload).length > 0 ? payload : { code: '123456' };
}

function selectSmsProviderCode(
  outboxRows: readonly IntegrationOutboxSummary[],
  templateCode: string,
): string {
  return (
    outboxRows.find((message) => message.templateCode === templateCode)
      ?.providerCode ??
    outboxRows[0]?.providerCode ??
    'sms.sandbox'
  );
}

export default function SmsIntegrationPage() {
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
      'pages.integrations.sms.status.disabled',
      'disabled',
    ),
    enabled: formatMessage('pages.integrations.sms.status.enabled', 'enabled'),
  };
  const staticLabels = {
    notRun: formatMessage('pages.integrations.sms.static.notRun', 'not run'),
    safety: formatMessage(
      'pages.integrations.sms.static.safety',
      'phone + OTP guarded',
    ),
  };
  const templateExportColumns: CurrentPageExportColumn<IntegrationTemplateSummary>[] =
    [
      {
        title: formatMessage('pages.integrations.sms.fields.code', 'Code'),
        dataIndex: 'code',
      },
      {
        title: formatMessage(
          'pages.integrations.sms.fields.channel',
          'Channel',
        ),
        dataIndex: 'channel',
      },
      {
        title: formatMessage('pages.integrations.sms.fields.name', 'Name'),
        dataIndex: 'name',
      },
      {
        title: formatMessage(
          'pages.integrations.sms.fields.enabled',
          'Enabled',
        ),
        dataIndex: 'enabled',
      },
      {
        title: formatMessage('pages.integrations.sms.fields.body', 'Body'),
        dataIndex: 'body',
        sensitive: true,
      },
    ];
  const outboxExportColumns: CurrentPageExportColumn<IntegrationOutboxSummary>[] =
    [
      {
        title: formatMessage('pages.integrations.sms.fields.id', 'ID'),
        dataIndex: 'id',
      },
      {
        title: formatMessage(
          'pages.integrations.sms.fields.provider',
          'Provider',
        ),
        dataIndex: 'providerCode',
      },
      {
        title: formatMessage(
          'pages.integrations.sms.fields.template',
          'Template',
        ),
        dataIndex: 'templateCode',
      },
      {
        title: formatMessage(
          'pages.integrations.sms.fields.recipient',
          'Recipient',
        ),
        dataIndex: 'recipient',
      },
      {
        title: formatMessage('pages.integrations.sms.fields.status', 'Status'),
        dataIndex: 'status',
      },
      {
        title: formatMessage(
          'pages.integrations.sms.fields.retryCount',
          'Retry Count',
        ),
        dataIndex: 'retryCount',
      },
      {
        title: formatMessage(
          'pages.integrations.sms.fields.createdAt',
          'Created At',
        ),
        dataIndex: 'createdAt',
      },
      {
        title: formatMessage('pages.integrations.sms.fields.sentAt', 'Sent At'),
        dataIndex: 'sentAt',
      },
      {
        title: formatMessage(
          'pages.integrations.sms.fields.payload',
          'Payload',
        ),
        dataIndex: 'payload',
        sensitive: true,
      },
      {
        title: formatMessage(
          'pages.integrations.sms.fields.preview',
          'Preview',
        ),
        dataIndex: 'preview',
        sensitive: true,
      },
      {
        title: formatMessage('pages.integrations.sms.fields.error', 'Error'),
        dataIndex: 'error',
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
            'pages.integrations.sms.fields.enabled',
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
            'pages.integrations.sms.fields.provider',
            'Provider',
          ),
          predicate: (record, value) => record.providerCode === value,
        },
        {
          key: 'status',
          options: createCurrentPageFilterOptions(outboxRows, 'status'),
          placeholder: formatMessage(
            'pages.integrations.sms.fields.status',
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
        'pages.integrations.sms.search.templates',
        'Search live SMS templates',
      ),
      selectFilters: templateFilterOptions,
    });
  const { filteredRows: filteredOutboxRows, toolbar: outboxFilterToolbar } =
    useCurrentPageFilters<IntegrationOutboxSummary>({
      rows: outboxRows,
      searchFields: outboxSearchFields,
      searchPlaceholder: formatMessage(
        'pages.integrations.sms.search.outbox',
        'Search live SMS outbox',
      ),
      selectFilters: outboxFilterOptions,
    });
  const queuedCount = outboxRows.filter(
    (record) => record.status === 'queued',
  ).length;
  const failedCount = outboxRows.filter(
    (record) => record.status === 'failed',
  ).length;

  const loadSmsOperations = useCallback(async () => {
    setLoading(true);
    try {
      const [nextTemplates, nextOutbox] = await Promise.all([
        listOpenCoreSmsTemplates(),
        listOpenCoreSmsOutbox(),
      ]);

      setTemplates(nextTemplates);
      setOutboxRows(nextOutbox);
      setLoadError(undefined);
    } catch (error: unknown) {
      setLoadError(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.sms.load.failure',
              'Unable to load live SMS integration operations.',
            ),
      );
    } finally {
      setLoading(false);
    }
  }, [formatMessage]);

  useEffect(() => {
    void loadSmsOperations();
  }, [loadSmsOperations]);

  const openTemplateDetail = async (code: string) => {
    setPreview(undefined);
    try {
      const detail = await getOpenCoreSmsTemplate(code);
      const outbox = outboxRows.find(
        (message) => message.templateCode === code,
      );
      setSelected(detail);
      setSelectedOutbox(
        outbox ? await getOpenCoreSmsOutboxMessage(outbox.id) : undefined,
      );
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.sms.load.detailFailure',
              'Unable to load SMS detail.',
            ),
      );
    }
  };

  const openOutboxDetail = async (id: string) => {
    setPreview(undefined);
    try {
      const outbox = await getOpenCoreSmsOutboxMessage(id);
      const template = outbox.templateCode
        ? await getOpenCoreSmsTemplate(outbox.templateCode)
        : undefined;
      setSelected(template);
      setSelectedOutbox(outbox);
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.sms.load.outboxDetailFailure',
              'Unable to load SMS outbox detail.',
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
      const nextPreview = await previewOpenCoreSmsTemplate({
        templateCode: record.code,
        payload: buildPreviewPayload(record, outbox),
      });

      setSelected(record);
      setSelectedOutbox(outbox);
      setPreview(nextPreview);
      message.success(
        formatMessage(
          'pages.integrations.sms.messages.previewRendered',
          'SMS template preview rendered',
        ),
      );
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.sms.messages.previewFailure',
              'Unable to preview SMS template.',
            ),
      );
    } finally {
      setPreviewingCode(undefined);
    }
  };

  const processQueuedOutbox = async () => {
    setProcessing(true);
    try {
      const result = await processOpenCoreIntegrationOutbox('sms', {
        limit: 25,
      });
      setLastProcess(result);
      message.success(
        formatMessage(
          'pages.integrations.sms.messages.processed',
          'SMS outbox processed: attempted {count}',
          { count: result.attemptedCount },
        ),
      );
      await loadSmsOperations();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.sms.messages.processFailure',
              'Unable to process SMS outbox.',
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
      const result = await sendOpenCoreIntegrationTestOutbox('sms', {
        providerCode: selectSmsProviderCode(outboxRows, record.code),
        templateCode: record.code,
        recipient: '+15551234567',
        payload: buildPreviewPayload(record, outbox),
        reason: 'Admin SMS test-send',
      });

      setSelected(record);
      setSelectedOutbox(result.message);
      setLastTestSend(result);
      message.success(
        formatMessage(
          'pages.integrations.sms.messages.testSent',
          'SMS test-send {status}.',
          { status: result.status },
        ),
      );
      await loadSmsOperations();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : formatMessage(
              'pages.integrations.sms.messages.testFailure',
              'Unable to send SMS test.',
            ),
      );
    } finally {
      setTestSendingCode(undefined);
    }
  };

  const templateColumns: ProColumns<IntegrationTemplateSummary>[] = [
    {
      title: formatMessage('pages.integrations.sms.fields.code', 'Code'),
      dataIndex: 'code',
      render: (_, record) => (
        <Typography.Link onClick={() => void openTemplateDetail(record.code)}>
          {record.code}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage('pages.integrations.sms.fields.name', 'Name'),
      dataIndex: 'name',
    },
    {
      title: formatMessage('pages.integrations.sms.fields.body', 'Body'),
      dataIndex: 'body',
    },
    {
      title: formatMessage('pages.integrations.sms.fields.enabled', 'Enabled'),
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? statusLabels.enabled : statusLabels.disabled}
        </Tag>
      ),
    },
    {
      title: formatMessage('pages.integrations.sms.fields.safety', 'Safety'),
      render: () => <Tag color="orange">{staticLabels.safety}</Tag>,
    },
    {
      title: formatMessage('pages.integrations.sms.actions.column', 'Action'),
      valueType: 'option',
      render: (_, record) => [
        <a key="detail" onClick={() => void openTemplateDetail(record.code)}>
          {formatMessage('pages.integrations.sms.actions.detail', 'Detail')}
        </a>,
        <Button
          key="preview"
          loading={previewingCode === record.code}
          onClick={() => void previewTemplate(record)}
          size="small"
          type="link"
        >
          {formatMessage(
            'pages.integrations.sms.actions.previewTemplate',
            'Preview template',
          )}
        </Button>,
        <Button
          key="test-send"
          loading={testSendingCode === record.code}
          onClick={() => void sendTestMessage(record)}
          size="small"
          title={SMS_MANAGE_PERMISSION_MARKER}
          type="link"
        >
          {formatMessage(
            'pages.integrations.sms.actions.sendTest',
            'Send test',
          )}
        </Button>,
      ],
    },
  ];

  const outboxColumns: ProColumns<IntegrationOutboxSummary>[] = [
    {
      title: formatMessage('pages.integrations.sms.fields.message', 'Message'),
      dataIndex: 'id',
      render: (_, record) => (
        <Typography.Link onClick={() => void openOutboxDetail(record.id)}>
          {record.id}
        </Typography.Link>
      ),
    },
    {
      title: formatMessage(
        'pages.integrations.sms.fields.provider',
        'Provider',
      ),
      dataIndex: 'providerCode',
    },
    {
      title: formatMessage(
        'pages.integrations.sms.fields.template',
        'Template',
      ),
      dataIndex: 'templateCode',
    },
    {
      title: formatMessage(
        'pages.integrations.sms.fields.recipient',
        'Recipient',
      ),
      dataIndex: 'recipient',
    },
    {
      title: formatMessage('pages.integrations.sms.fields.status', 'Status'),
      render: (_, record) => (
        <Tag color={statusColor(record.status)}>{record.status}</Tag>
      ),
    },
    {
      title: formatMessage('pages.integrations.sms.fields.retry', 'Retry'),
      dataIndex: 'retryCount',
    },
    {
      title: formatMessage(
        'pages.integrations.sms.fields.createdAt',
        'Created At',
      ),
      dataIndex: 'createdAt',
    },
    {
      title: formatMessage('pages.integrations.sms.actions.column', 'Action'),
      valueType: 'option',
      render: (_, record) => (
        <a onClick={() => void openOutboxDetail(record.id)}>
          {formatMessage('pages.integrations.sms.actions.detail', 'Detail')}
        </a>
      ),
    },
  ];

  return (
    <PageContainer
      title={formatMessage('menu.integrations.sms', 'SMS')}
      subTitle={formatMessage('pages.integrations.section', 'S12 Integrations')}
    >
      {loadError ? (
        <Alert
          action={
            <Button onClick={() => void loadSmsOperations()}>
              {formatMessage(
                'pages.integrations.sms.actions.reloadOperations',
                'Reload live SMS operations',
              )}
            </Button>
          }
          description={loadError}
          message={formatMessage(
            'pages.integrations.sms.load.liveUnavailable',
            'Live SMS integration operations unavailable',
          )}
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic
          title={formatMessage(
            'pages.integrations.sms.summary.liveTemplates',
            'Live SMS templates',
          )}
          value={templates.length}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.sms.summary.outboxOperations',
            'SMS outbox operations',
          )}
          value={outboxRows.length}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.sms.summary.queuedOutbox',
            'Queued SMS outbox',
          )}
          value={queuedCount}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.sms.summary.failedOutbox',
            'Failed SMS outbox',
          )}
          value={failedCount}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.sms.summary.lastProcess',
            'Last SMS process',
          )}
          value={lastProcess?.attemptedCount ?? 0}
          suffix={formatMessage(
            'pages.integrations.sms.summary.sentSuffix',
            'sent {count}',
            { count: lastProcess?.sentCount ?? 0 },
          )}
        />
        <Statistic
          title={formatMessage(
            'pages.integrations.sms.summary.lastTestSend',
            'Last SMS test-send',
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
          <Button key="reload" onClick={() => void loadSmsOperations()}>
            {formatMessage(
              'pages.integrations.sms.actions.reloadOperations',
              'Reload live SMS operations',
            )}
          </Button>,
          <Button
            key="process"
            loading={processing}
            onClick={() => void processQueuedOutbox()}
            title={SMS_MANAGE_PERMISSION_MARKER}
          >
            {formatMessage(
              'pages.integrations.sms.actions.processQueuedOutbox',
              'Process queued SMS outbox',
            )}
          </Button>,
          <CurrentPageExportButton<IntegrationTemplateSummary>
            columns={templateExportColumns}
            key="export"
            resource="integration-sms-templates"
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
            resource="integration-sms-outbox"
            rows={filteredOutboxRows}
          />,
        ]}
      />
      <ReadOnlyDetailDrawer
        fields={[
          {
            label: formatMessage('pages.integrations.sms.fields.code', 'Code'),
            value: selected?.code,
          },
          {
            label: formatMessage(
              'pages.integrations.sms.fields.channel',
              'Channel',
            ),
            value: selected?.channel,
          },
          {
            label: formatMessage('pages.integrations.sms.fields.name', 'Name'),
            value: selected?.name,
          },
          {
            label: formatMessage(
              'pages.integrations.sms.fields.enabled',
              'Enabled',
            ),
            value: selected?.enabled
              ? statusLabels.enabled
              : statusLabels.disabled,
          },
          {
            label: formatMessage(
              'pages.integrations.sms.fields.safety',
              'Safety',
            ),
            value: staticLabels.safety,
          },
          {
            label: formatMessage(
              'pages.integrations.sms.fields.outboxMessage',
              'Outbox Message',
            ),
            value: selectedOutbox?.id,
          },
          {
            label: formatMessage(
              'pages.integrations.sms.fields.outboxProvider',
              'Outbox Provider',
            ),
            value: selectedOutbox?.providerCode,
          },
          {
            label: formatMessage(
              'pages.integrations.sms.fields.outboxRecipient',
              'Outbox Recipient',
            ),
            value: selectedOutbox?.recipient,
          },
          {
            label: formatMessage(
              'pages.integrations.sms.fields.outboxStatus',
              'Outbox Status',
            ),
            value: selectedOutbox?.status,
          },
          {
            label: formatMessage(
              'pages.integrations.sms.fields.outboxRetryCount',
              'Outbox Retry Count',
            ),
            value: selectedOutbox?.retryCount,
          },
          {
            label: formatMessage(
              'pages.integrations.sms.fields.outboxSentAt',
              'Outbox Sent At',
            ),
            value: selectedOutbox?.sentAt,
          },
          {
            label: formatMessage(
              'pages.integrations.sms.fields.outboxError',
              'Outbox Error',
            ),
            value: selectedOutbox?.error,
          },
          {
            label: formatMessage(
              'pages.integrations.sms.fields.testSendStatus',
              'Test Send Status',
            ),
            value: lastTestSend?.status,
          },
          {
            label: formatMessage(
              'pages.integrations.sms.fields.testSendError',
              'Test Send Error',
            ),
            value: lastTestSend?.error,
          },
          {
            label: formatMessage(
              'pages.integrations.sms.fields.testSendAt',
              'Test Send At',
            ),
            value: lastTestSend?.testedAt,
          },
          {
            label: formatMessage(
              'pages.integrations.sms.fields.previewBody',
              'Preview Body',
            ),
            value: preview?.body,
          },
          {
            label: formatMessage('pages.integrations.sms.fields.body', 'Body'),
            value: selected?.body,
          },
          {
            label: formatMessage(
              'pages.integrations.sms.fields.renderedPreview',
              'Rendered Preview',
            ),
            value: preview?.body,
          },
        ]}
        jsonSections={[
          {
            title: formatMessage(
              'pages.integrations.sms.json.sampleOutboxPayload',
              'Sample Outbox Payload',
            ),
            value: selectedOutbox?.payload ?? {},
          },
          {
            title: formatMessage(
              'pages.integrations.sms.json.templatePreviewPayload',
              'Template Preview Payload',
            ),
            value: selected
              ? buildPreviewPayload(selected, selectedOutbox)
              : undefined,
          },
          {
            title: formatMessage(
              'pages.integrations.sms.json.lastProcessResult',
              'Last Process Result',
            ),
            value: lastProcess,
          },
          {
            title: formatMessage(
              'pages.integrations.sms.json.lastTestSendResult',
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
            'pages.integrations.sms.detail.title',
            'SMS Operation Detail',
          )
        }
      />
    </PageContainer>
  );
}
