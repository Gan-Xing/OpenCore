import {
  PageContainer,
  ProTable,
  type ProColumns,
} from '@ant-design/pro-components';
import type {
  IntegrationOutboxProcessResult,
  IntegrationOutboxSummary,
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

const templateExportColumns: CurrentPageExportColumn<IntegrationTemplateSummary>[] =
  [
    { title: 'Code', dataIndex: 'code' },
    { title: 'Channel', dataIndex: 'channel' },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Subject', dataIndex: 'subject' },
    { title: 'Enabled', dataIndex: 'enabled' },
    { title: 'Body', dataIndex: 'body', sensitive: true },
  ];

const outboxExportColumns: CurrentPageExportColumn<IntegrationOutboxSummary>[] =
  [
    { title: 'ID', dataIndex: 'id' },
    { title: 'Provider', dataIndex: 'providerCode' },
    { title: 'Template', dataIndex: 'templateCode' },
    { title: 'Recipient', dataIndex: 'recipient' },
    { title: 'Subject', dataIndex: 'subject' },
    { title: 'Status', dataIndex: 'status' },
    { title: 'Retry Count', dataIndex: 'retryCount' },
    { title: 'Created At', dataIndex: 'createdAt' },
    { title: 'Sent At', dataIndex: 'sentAt' },
    { title: 'Payload', dataIndex: 'payload', sensitive: true },
    { title: 'Preview', dataIndex: 'preview', sensitive: true },
  ];

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

export default function MailIntegrationPage() {
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
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [previewingCode, setPreviewingCode] = useState<string>();
  const [loadError, setLoadError] = useState<string>();

  const templateFilterOptions: CurrentPageFilterOption<IntegrationTemplateSummary>[] =
    useMemo(
      () => [
        {
          key: 'enabled',
          options: [
            { label: 'enabled', value: 'true' },
            { label: 'disabled', value: 'false' },
          ],
          placeholder: 'Enabled',
          predicate: (record, value) => record.enabled === (value === 'true'),
        },
      ],
      [],
    );
  const outboxFilterOptions: CurrentPageFilterOption<IntegrationOutboxSummary>[] =
    useMemo(
      () => [
        {
          key: 'providerCode',
          options: createCurrentPageFilterOptions(outboxRows, 'providerCode'),
          placeholder: 'Provider',
          predicate: (record, value) => record.providerCode === value,
        },
        {
          key: 'status',
          options: createCurrentPageFilterOptions(outboxRows, 'status'),
          placeholder: 'Status',
          predicate: (record, value) => record.status === value,
        },
      ],
      [outboxRows],
    );
  const { filteredRows: filteredTemplates, toolbar: templateFilterToolbar } =
    useCurrentPageFilters<IntegrationTemplateSummary>({
      rows: templates,
      searchFields: templateSearchFields,
      searchPlaceholder: 'Search live mail templates',
      selectFilters: templateFilterOptions,
    });
  const { filteredRows: filteredOutboxRows, toolbar: outboxFilterToolbar } =
    useCurrentPageFilters<IntegrationOutboxSummary>({
      rows: outboxRows,
      searchFields: outboxSearchFields,
      searchPlaceholder: 'Search live mail outbox',
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
          : 'Unable to load live mail integration operations.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

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
        error instanceof Error ? error.message : 'Unable to load mail detail.',
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
          : 'Unable to load outbox detail.',
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
      message.success('Mail template preview rendered');
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : 'Unable to preview mail template.',
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
        `Mail outbox processed: attempted ${result.attemptedCount}`,
      );
      await loadMailOperations();
    } catch (error: unknown) {
      message.error(
        error instanceof Error
          ? error.message
          : 'Unable to process mail outbox.',
      );
    } finally {
      setProcessing(false);
    }
  };

  const templateColumns: ProColumns<IntegrationTemplateSummary>[] = [
    {
      title: 'Code',
      dataIndex: 'code',
      render: (_, record) => (
        <Typography.Link onClick={() => void openTemplateDetail(record.code)}>
          {record.code}
        </Typography.Link>
      ),
    },
    { title: 'Name', dataIndex: 'name' },
    { title: 'Subject', dataIndex: 'subject' },
    {
      title: 'Enabled',
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? 'enabled' : 'disabled'}
        </Tag>
      ),
    },
    {
      title: 'Preview Policy',
      render: (_, record) => (
        <Tag color={record.enabled ? 'green' : 'default'}>
          {record.enabled ? 'preview allowed' : 'preview blocked'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      valueType: 'option',
      render: (_, record) => [
        <a key="detail" onClick={() => void openTemplateDetail(record.code)}>
          Detail
        </a>,
        <Button
          key="preview"
          loading={previewingCode === record.code}
          onClick={() => void previewTemplate(record)}
          size="small"
          type="link"
        >
          Preview template
        </Button>,
      ],
    },
  ];

  const outboxColumns: ProColumns<IntegrationOutboxSummary>[] = [
    {
      title: 'Message',
      dataIndex: 'id',
      render: (_, record) => (
        <Typography.Link onClick={() => void openOutboxDetail(record.id)}>
          {record.id}
        </Typography.Link>
      ),
    },
    { title: 'Provider', dataIndex: 'providerCode' },
    { title: 'Template', dataIndex: 'templateCode' },
    { title: 'Recipient', dataIndex: 'recipient' },
    { title: 'Subject', dataIndex: 'subject' },
    {
      title: 'Status',
      render: (_, record) => (
        <Tag color={statusColor(record.status)}>{record.status}</Tag>
      ),
    },
    { title: 'Retry', dataIndex: 'retryCount' },
    { title: 'Created At', dataIndex: 'createdAt' },
    {
      title: 'Action',
      valueType: 'option',
      render: (_, record) => (
        <a onClick={() => void openOutboxDetail(record.id)}>Detail</a>
      ),
    },
  ];

  return (
    <PageContainer title="Mail" subTitle="S12 Integrations">
      {loadError ? (
        <Alert
          action={
            <Button onClick={() => void loadMailOperations()}>
              Reload live mail operations
            </Button>
          }
          description={loadError}
          message="Live mail integration operations unavailable"
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
        />
      ) : null}
      <Space size="large" style={{ marginBottom: 16 }} wrap>
        <Statistic title="Live mail templates" value={templates.length} />
        <Statistic title="Mail outbox operations" value={outboxRows.length} />
        <Statistic title="Queued mail outbox" value={queuedCount} />
        <Statistic title="Failed mail outbox" value={failedCount} />
        <Statistic
          title="Last mail process"
          value={lastProcess?.attemptedCount ?? 0}
          suffix={`sent ${lastProcess?.sentCount ?? 0}`}
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
            Reload live mail operations
          </Button>,
          <Button
            key="process"
            loading={processing}
            onClick={() => void processQueuedOutbox()}
            title={MAIL_MANAGE_PERMISSION_MARKER}
          >
            Process queued mail outbox
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
          { label: 'Code', value: selected?.code },
          { label: 'Channel', value: selected?.channel },
          { label: 'Name', value: selected?.name },
          { label: 'Subject', value: selected?.subject },
          {
            label: 'Enabled',
            value: selected?.enabled ? 'enabled' : 'disabled',
          },
          { label: 'Outbox Message', value: selectedOutbox?.id },
          { label: 'Outbox Provider', value: selectedOutbox?.providerCode },
          { label: 'Outbox Recipient', value: selectedOutbox?.recipient },
          { label: 'Outbox Subject', value: selectedOutbox?.subject },
          { label: 'Outbox Status', value: selectedOutbox?.status },
          { label: 'Outbox Retry Count', value: selectedOutbox?.retryCount },
          { label: 'Outbox Sent At', value: selectedOutbox?.sentAt },
          {
            label: 'SMTP Attachments',
            value: selectedOutbox?.attachments?.length ?? 0,
          },
          {
            label: 'Attachment Names',
            value: selectedOutbox?.attachments
              ?.map((attachment) => attachment.filename)
              .join(', '),
          },
          { label: 'Preview Subject', value: preview?.subject },
          { label: 'Body', value: selected?.body },
          { label: 'Rendered Preview', value: preview?.body },
        ]}
        jsonSections={[
          {
            title: 'Sample Outbox Payload',
            value: selectedOutbox?.payload ?? {},
          },
          {
            title: 'Template Preview Payload',
            value: selected
              ? buildPreviewPayload(selected, selectedOutbox)
              : undefined,
          },
          {
            title: 'Attachment Metadata',
            value:
              selectedOutbox?.attachments?.map((attachment) => ({
                filename: attachment.filename,
                contentType: attachment.contentType,
                sizeBytes: attachment.sizeBytes,
              })) ?? [],
          },
          {
            title: 'Last Process Result',
            value: lastProcess,
          },
        ]}
        onClose={() => {
          setSelected(undefined);
          setSelectedOutbox(undefined);
          setPreview(undefined);
        }}
        open={Boolean(selected || selectedOutbox)}
        title={selected?.name ?? selectedOutbox?.id ?? 'Mail Operation Detail'}
      />
    </PageContainer>
  );
}
